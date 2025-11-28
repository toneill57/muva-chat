#!/usr/bin/env tsx
/**
 * Apply Supabase Migrations to Staging Environment (v2 - usando psql)
 *
 * FASE 3: Enhanced Staging Workflow
 *
 * Purpose:
 * - Apply pending migrations from supabase/migrations/ to staging database
 * - Uses PSQL directly to execute DDL statements
 * - Exit with code 0 on success, 1 on failure
 *
 * Usage:
 *   pnpm dlx tsx scripts/apply-migrations-staging-v2.ts
 *
 * Environment Variables Required:
 *   SUPABASE_STAGING_PROJECT_ID - Staging project ref (rvjmwwvkhglcuqwcznph)
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (for connection string auth)
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

// Environment validation
const STAGING_PROJECT_ID = process.env.SUPABASE_STAGING_PROJECT_ID || 'rvjmwwvkhglcuqwcznph';
const STAGING_DB_PASSWORD = process.env.SUPABASE_STAGING_DB_PASSWORD;

if (!STAGING_DB_PASSWORD) {
  console.error('❌ Error: SUPABASE_STAGING_DB_PASSWORD environment variable not set');
  console.error('');
  console.error('How to get the DB password:');
  console.error('1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/rvjmwwvkhglcuqwcznph');
  console.error('2. Settings → Database → Connection string');
  console.error('3. Copy the password from the connection string');
  console.error('4. Add it to GitHub Secrets as SUPABASE_STAGING_DB_PASSWORD');
  console.error('');
  process.exit(1);
}

// Supabase connection string (using transaction pooler port 6543 for DDL operations)
const CONNECTION_STRING = `postgresql://postgres.${STAGING_PROJECT_ID}:${STAGING_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

interface Migration {
  filename: string;
  timestamp: string;
  name: string;
  path: string;
  sql: string;
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔄 Apply Migrations to Staging (v2 - psql)');
  console.log('================================================');
  console.log(`📦 Staging Project: ${STAGING_PROJECT_ID}`);
  console.log(`🌐 Staging URL: https://${STAGING_PROJECT_ID}.supabase.co`);
  console.log('');

  // Step 1: Read local migration files
  console.log('📂 Step 1: Reading local migration files...');
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

  let files: string[];
  try {
    files = await readdir(migrationsDir);
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
    const sql = await readFile(path, 'utf-8');

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
  console.log('📊 Step 2: Checking applied migrations in database...');

  let appliedMigrations: string[] = [];
  try {
    const result = execSync(
      `psql "${CONNECTION_STRING}" -t -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version"`,
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
  console.log('🔍 Step 3: Determining pending migrations...');
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

  // Step 4: Apply pending migrations
  console.log('🚀 Step 4: Applying pending migrations...');
  console.log('');

  let appliedCount = 0;
  let failedCount = 0;

  for (const migration of pendingMigrations) {
    console.log(`Applying: ${migration.filename}...`);

    try {
      // Execute migration using psql
      execSync(
        `psql "${CONNECTION_STRING}" -f "${migration.path}"`,
        { stdio: 'pipe', encoding: 'utf-8' }
      );

      // Record migration as applied (if table exists)
      try {
        execSync(
          `psql "${CONNECTION_STRING}" -c "INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${migration.timestamp}', '${migration.name}')"`,
          { stdio: 'pipe', encoding: 'utf-8' }
        );
      } catch (recordError) {
        console.log(`⚠️  Warning: Migration applied but not recorded in schema_migrations`);
      }

      console.log(`✅ Applied: ${migration.filename}`);
      appliedCount++;
    } catch (error: any) {
      console.error(`❌ Failed: ${migration.filename}`);
      console.error(`   Error: ${error.message}`);
      failedCount++;

      // Stop on first failure
      console.log('');
      console.log('================================================');
      console.log('❌ Migration failed - stopping execution');
      console.log('================================================');
      console.log('');
      console.log(`✅ Successfully applied: ${appliedCount} migrations`);
      console.log(`❌ Failed: ${failedCount} migrations`);
      console.log('');
      process.exit(1);
    }
  }

  console.log('');
  console.log('================================================');
  console.log('✅ All migrations applied successfully');
  console.log('================================================');
  console.log('');
  console.log(`✅ Successfully applied: ${appliedCount} migrations`);
  console.log('');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
