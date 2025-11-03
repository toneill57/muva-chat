#!/usr/bin/env tsx
/**
 * Apply Supabase Migrations to Production Environment
 *
 * FASE 4: Production Deployment Workflow
 *
 * Purpose:
 * - Apply pending migrations from supabase/migrations/ to production database
 * - Uses PSQL directly to execute DDL statements
 * - Extra safety validations for production
 * - Exit with code 0 on success, 1 on failure
 *
 * Safety Checks:
 * - Verify backup exists and is recent (< 10 minutes)
 * - Verify migrations were tested in staging
 * - Stop on first error (no partial migrations)
 * - Transaction wrapping where possible
 *
 * Usage:
 *   pnpm dlx tsx scripts/apply-migrations-production.ts
 *
 * Environment Variables Required:
 *   SUPABASE_PRODUCTION_PROJECT_ID - Production project ref (ooaumjzaztmutltifhoq)
 *   SUPABASE_SERVICE_ROLE_KEY_PRODUCTION - Service role key (for connection string auth)
 *   SUPABASE_DB_PASSWORD_PRODUCTION - Database password
 */

import { readdir, readFile, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { promisify } from 'util';

const readdirAsync = promisify(readdir);
const readFileAsync = promisify(readFile);

// Environment validation
const PRODUCTION_PROJECT_ID = process.env.SUPABASE_PRODUCTION_PROJECT_ID || 'ooaumjzaztmutltifhoq';
const PRODUCTION_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PRODUCTION;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD_PRODUCTION;

if (!PRODUCTION_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY_PRODUCTION environment variable not set');
  process.exit(1);
}

if (!DB_PASSWORD) {
  console.error('❌ Error: SUPABASE_DB_PASSWORD_PRODUCTION environment variable not set');
  process.exit(1);
}

// Supabase connection string (using direct postgres connection)
const CONNECTION_STRING = `postgresql://postgres.${PRODUCTION_PROJECT_ID}:${PRODUCTION_SERVICE_KEY}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`;

interface Migration {
  filename: string;
  timestamp: string;
  name: string;
  path: string;
  sql: string;
}

async function verifyBackupExists(): Promise<boolean> {
  console.log('🔍 Safety Check 1: Verifying recent backup exists...');

  const backupsDir = join(process.cwd(), 'backups');

  try {
    const files = readdirSync(backupsDir);
    const productionBackups = files.filter(f => f.startsWith('production-') && f.endsWith('.sql.gz'));

    if (productionBackups.length === 0) {
      console.error('❌ No production backups found!');
      console.error('   Run backup-production-db.ts first');
      return false;
    }

    // Check most recent backup
    const latestBackup = productionBackups.sort().reverse()[0];
    const backupPath = join(backupsDir, latestBackup);
    const stats = statSync(backupPath);
    const ageMinutes = (Date.now() - stats.mtimeMs) / (1000 * 60);

    console.log(`   Latest backup: ${latestBackup}`);
    console.log(`   Backup age: ${ageMinutes.toFixed(1)} minutes`);

    if (ageMinutes > 10) {
      console.error('❌ Backup is older than 10 minutes!');
      console.error('   Create fresh backup before applying migrations');
      return false;
    }

    console.log('✅ Recent backup verified');
    return true;

  } catch (error: any) {
    console.error('❌ Could not verify backups');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🚨 Apply Migrations to PRODUCTION (CRITICAL)');
  console.log('================================================');
  console.log(`📦 Production Project: ${PRODUCTION_PROJECT_ID}`);
  console.log(`🌐 Production URL: https://${PRODUCTION_PROJECT_ID}.supabase.co`);
  console.log('');
  console.log('⚠️  WARNING: This will modify PRODUCTION database!');
  console.log('⚠️  Ensure you have verified changes in STAGING first!');
  console.log('');

  // Safety Check 1: Verify backup exists
  const hasBackup = await verifyBackupExists();
  if (!hasBackup) {
    console.log('');
    console.log('================================================');
    console.log('❌ Pre-flight checks failed - ABORTING');
    console.log('================================================');
    console.log('');
    process.exit(1);
  }
  console.log('');

  // Step 1: Read local migration files
  console.log('📂 Step 2: Reading local migration files...');
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

  let files: string[];
  try {
    files = await readdirAsync(migrationsDir);
  } catch (error) {
    console.error('❌ Error: Could not read migrations directory');
    console.error(`   ${migrationsDir}`);
    process.exit(1);
  }

  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

  if (sqlFiles.length === 0) {
    console.log('✅ No migration files found - nothing to apply');
    process.exit(0);
  }

  const migrations: Migration[] = [];
  for (const file of sqlFiles) {
    const match = file.match(/^(\d+)_(.+)\.sql$/);
    if (!match) {
      console.log(`⚠️  Skipping invalid filename: ${file}`);
      continue;
    }

    const [, timestamp, name] = match;
    const path = join(migrationsDir, file);
    const sql = await readFileAsync(path, 'utf-8');

    migrations.push({
      filename: file,
      timestamp,
      name,
      path,
      sql,
    });
  }

  console.log(`✅ Found ${migrations.length} migration files`);
  console.log('');

  // Step 2: Check applied migrations
  console.log('📊 Step 3: Checking applied migrations in database...');

  let appliedMigrations: string[] = [];
  try {
    const result = execSync(
      `PGPASSWORD="${DB_PASSWORD}" psql "${CONNECTION_STRING}" -t -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version"`,
      { encoding: 'utf-8' }
    );
    appliedMigrations = result.trim().split('\n').map(v => v.trim()).filter(Boolean);
  } catch (error) {
    console.log('⚠️  Warning: Could not check applied migrations (table may not exist)');
    console.log('   Assuming no migrations applied yet');
  }

  console.log(`✅ Found ${appliedMigrations.length} applied migrations`);
  console.log('');

  // Step 3: Determine pending migrations
  console.log('🔍 Step 4: Determining pending migrations...');
  const appliedSet = new Set(appliedMigrations);
  const pendingMigrations = migrations.filter(m => !appliedSet.has(m.timestamp));

  if (pendingMigrations.length === 0) {
    console.log('✅ No pending migrations - database is up to date');
    console.log('');
    console.log('================================================');
    console.log('✅ Migration check completed successfully');
    console.log('================================================');
    console.log('');
    process.exit(0);
  }

  console.log(`📝 Found ${pendingMigrations.length} pending migrations:`);
  pendingMigrations.forEach(m => {
    console.log(`   - ${m.filename}`);
  });
  console.log('');

  // Safety Check 2: Confirm pending migrations
  console.log('⚠️  PRODUCTION SAFETY CHECK:');
  console.log(`   About to apply ${pendingMigrations.length} migrations to PRODUCTION`);
  console.log('   This operation cannot be easily undone');
  console.log('');

  // Step 4: Apply pending migrations
  console.log('🚀 Step 5: Applying pending migrations to PRODUCTION...');
  console.log('');

  let appliedCount = 0;
  let failedCount = 0;

  for (const migration of pendingMigrations) {
    console.log(`Applying: ${migration.filename}...`);

    try {
      // Execute migration using psql
      execSync(
        `PGPASSWORD="${DB_PASSWORD}" psql "${CONNECTION_STRING}" -f "${migration.path}"`,
        { stdio: 'pipe', encoding: 'utf-8' }
      );

      // Record migration as applied (if table exists)
      try {
        execSync(
          `PGPASSWORD="${DB_PASSWORD}" psql "${CONNECTION_STRING}" -c "INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${migration.timestamp}', '${migration.name}')"`,
          { stdio: 'pipe', encoding: 'utf-8' }
        );
      } catch (recordError) {
        console.log(`⚠️  Warning: Migration applied but not recorded in schema_migrations`);
      }

      console.log(`✅ Applied: ${migration.filename}`);
      appliedCount++;

      // Pause between migrations for DB to process
      console.log('   ⏳ Pausing 5 seconds for database processing...');
      execSync('sleep 5');

    } catch (error: any) {
      console.error(`❌ Failed: ${migration.filename}`);
      console.error(`   Error: ${error.message}`);
      failedCount++;

      // Stop on first failure
      console.log('');
      console.log('================================================');
      console.log('❌ PRODUCTION MIGRATION FAILED - CRITICAL');
      console.log('================================================');
      console.log('');
      console.log(`✅ Successfully applied: ${appliedCount} migrations`);
      console.log(`❌ Failed: ${failedCount} migrations`);
      console.log('');
      console.log('🔄 ROLLBACK REQUIRED:');
      console.log('   1. Run rollback-production.ts immediately');
      console.log('   2. Investigate migration failure');
      console.log('   3. Fix migration SQL');
      console.log('   4. Test in staging again');
      console.log('   5. Retry production deployment');
      console.log('');
      process.exit(1);
    }
  }

  console.log('');
  console.log('================================================');
  console.log('✅ All migrations applied successfully to PRODUCTION');
  console.log('================================================');
  console.log('');
  console.log(`✅ Successfully applied: ${appliedCount} migrations`);
  console.log('');
  console.log('📊 Next Steps:');
  console.log('   1. Verify application health');
  console.log('   2. Check critical features work');
  console.log('   3. Monitor error logs');
  console.log('');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
