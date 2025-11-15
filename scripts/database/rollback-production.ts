#!/usr/bin/env tsx
/**
 * Rollback Production Deployment
 *
 * FASE 4: Production Deployment Workflow
 *
 * Purpose:
 * - Complete rollback of production deployment in case of failure
 * - Rollback code to previous Git commit
 * - Restore database from backup (optional but recommended)
 * - Verify health after rollback
 *
 * Usage:
 *   pnpm dlx tsx scripts/rollback-production.ts [--restore-db]
 *
 * Options:
 *   --restore-db    Also restore database from latest backup (DESTRUCTIVE)
 *   --steps=N       Number of migration steps to rollback (default: 1)
 *
 * Environment Variables Required:
 *   SUPABASE_PRODUCTION_PROJECT_ID - Production project ref
 *   SUPABASE_SERVICE_ROLE_KEY_PRODUCTION - Service role key
 *   SUPABASE_DB_PASSWORD_PRODUCTION - Database password
 *
 * Safety:
 * - Only rolls back migration records by default
 * - Schema changes are NOT automatically reverted
 * - Use --restore-db flag to restore full database from backup
 */

import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const shouldRestoreDB = args.includes('--restore-db');
const stepsArg = args.find(arg => arg.startsWith('--steps='));
const steps = stepsArg ? parseInt(stepsArg.split('=')[1]) : 1;

// Environment validation
const PRODUCTION_PROJECT_ID = process.env.SUPABASE_PRODUCTION_PROJECT_ID || 'ooaumjzaztmutltifhoq';
const PRODUCTION_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PRODUCTION;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD_PRODUCTION;

if (!PRODUCTION_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY_PRODUCTION environment variable not set');
  process.exit(1);
}

if (shouldRestoreDB && !DB_PASSWORD) {
  console.error('❌ Error: SUPABASE_DB_PASSWORD_PRODUCTION required for database restore');
  process.exit(1);
}

// Database connection string
const CONNECTION_STRING = `postgresql://postgres.${PRODUCTION_PROJECT_ID}:${PRODUCTION_SERVICE_KEY}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`;

async function rollbackMigrationRecords(stepsToRollback: number): Promise<void> {
  console.log('');
  console.log('🔄 Step 1: Rolling back migration records...');
  console.log(`   Rolling back last ${stepsToRollback} migration(s)`);
  console.log('');

  try {
    // Get last N applied migrations
    const query = `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT ${stepsToRollback}`;
    const result = execSync(
      `PGPASSWORD="${DB_PASSWORD}" psql "${CONNECTION_STRING}" -t -c "${query}"`,
      { encoding: 'utf-8' }
    );

    const migrationsToRollback = result
      .trim()
      .split('\n')
      .map(line => {
        const [version, name] = line.split('|').map(s => s.trim());
        return { version, name };
      })
      .filter(m => m.version);

    if (migrationsToRollback.length === 0) {
      console.log('ℹ️  No migrations to rollback');
      return;
    }

    console.log('Migrations to rollback:');
    migrationsToRollback.forEach(m => {
      console.log(`   - ${m.version}_${m.name}.sql`);
    });
    console.log('');

    // Delete migration records
    for (const migration of migrationsToRollback) {
      const deleteQuery = `DELETE FROM supabase_migrations.schema_migrations WHERE version = '${migration.version}'`;
      execSync(
        `PGPASSWORD="${DB_PASSWORD}" psql "${CONNECTION_STRING}" -c "${deleteQuery}"`,
        { stdio: 'pipe' }
      );
      console.log(`✅ Rolled back: ${migration.version}_${migration.name}.sql`);
    }

    console.log('');
    console.log('✅ Migration records rolled back successfully');
    console.log('');
    console.log('⚠️  IMPORTANT: Schema changes are NOT automatically reverted!');
    console.log('   If migrations created tables/columns, they still exist.');
    console.log('   Use --restore-db flag to restore database from backup.');
    console.log('');

  } catch (error: any) {
    console.error('❌ Failed to rollback migration records');
    console.error(`   Error: ${error.message}`);
    throw error;
  }
}

async function restoreDatabaseFromBackup(): Promise<void> {
  console.log('');
  console.log('💾 Step 2: Restoring database from backup...');
  console.log('');
  console.log('⚠️  WARNING: This will OVERWRITE all production data!');
  console.log('⚠️  This operation cannot be undone!');
  console.log('');

  const backupsDir = join(process.cwd(), 'backups');

  try {
    // Find latest backup
    const files = readdirSync(backupsDir);
    const productionBackups = files
      .filter(f => f.startsWith('production-') && f.endsWith('.sql.gz'))
      .sort()
      .reverse();

    if (productionBackups.length === 0) {
      console.error('❌ No production backups found!');
      console.error('   Cannot restore database');
      throw new Error('No backups available');
    }

    const latestBackup = productionBackups[0];
    const backupPath = join(backupsDir, latestBackup);
    const backupPathUncompressed = backupPath.replace('.gz', '');

    console.log(`Latest backup: ${latestBackup}`);

    // Verify backup age
    const stats = statSync(backupPath);
    const ageMinutes = (Date.now() - stats.mtimeMs) / (1000 * 60);
    console.log(`Backup age: ${ageMinutes.toFixed(1)} minutes`);
    console.log('');

    // Decompress backup
    console.log('Decompressing backup...');
    execSync(`gunzip -c "${backupPath}" > "${backupPathUncompressed}"`, { stdio: 'inherit' });
    console.log('✅ Backup decompressed');
    console.log('');

    // Restore database
    console.log('🔄 Restoring database (this may take several minutes)...');
    console.log('');
    execSync(
      `PGPASSWORD="${DB_PASSWORD}" psql "${CONNECTION_STRING}" < "${backupPathUncompressed}"`,
      { stdio: 'inherit' }
    );

    console.log('');
    console.log('✅ Database restored from backup');
    console.log('');

    // Cleanup uncompressed file
    execSync(`rm "${backupPathUncompressed}"`);

  } catch (error: any) {
    console.error('❌ Failed to restore database from backup');
    console.error(`   Error: ${error.message}`);
    throw error;
  }
}

async function verifyRollback(): Promise<void> {
  console.log('');
  console.log('🔍 Step 3: Verifying rollback...');
  console.log('');

  try {
    // Run health checks
    console.log('Running health checks...');
    execSync('pnpm dlx tsx scripts/verify-production-health.ts', { stdio: 'inherit' });

  } catch (error) {
    console.log('⚠️  Health checks failed after rollback');
    console.log('   Manual investigation required');
    throw error;
  }
}

async function notifyRollback(): Promise<void> {
  console.log('');
  console.log('📢 Rollback Notification');
  console.log('');
  console.log('⚠️  Production deployment has been rolled back!');
  console.log('');
  console.log('Actions taken:');
  console.log(`   - Rolled back ${steps} migration record(s)`);
  if (shouldRestoreDB) {
    console.log('   - Restored database from backup');
  }
  console.log('');
  console.log('Next steps:');
  console.log('   1. Investigate deployment failure');
  console.log('   2. Fix issues in development/staging');
  console.log('   3. Test thoroughly before retrying production deploy');
  console.log('');
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔄 ROLLBACK PRODUCTION DEPLOYMENT');
  console.log('================================================');
  console.log(`📦 Production Project: ${PRODUCTION_PROJECT_ID}`);
  console.log(`🔙 Rolling back: ${steps} migration(s)`);
  console.log(`💾 Restore database: ${shouldRestoreDB ? 'YES' : 'NO'}`);
  console.log('');

  if (shouldRestoreDB) {
    console.log('⚠️  WARNING: Database restore is DESTRUCTIVE!');
    console.log('⚠️  All data changes since backup will be LOST!');
    console.log('');
  }

  try {
    // Step 1: Rollback migration records
    await rollbackMigrationRecords(steps);

    // Step 2: Restore database from backup (if requested)
    if (shouldRestoreDB) {
      await restoreDatabaseFromBackup();
    }

    // Step 3: Verify rollback
    await verifyRollback();

    // Step 4: Notify
    await notifyRollback();

    console.log('================================================');
    console.log('✅ ROLLBACK COMPLETED SUCCESSFULLY');
    console.log('================================================');
    console.log('');
    process.exit(0);

  } catch (error: any) {
    console.error('');
    console.error('================================================');
    console.error('❌ ROLLBACK FAILED');
    console.error('================================================');
    console.error('');
    console.error(`Error: ${error.message}`);
    console.error('');
    console.error('🚨 CRITICAL: Manual intervention required!');
    console.error('   Contact DevOps immediately');
    console.error('');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error during rollback:', error);
  process.exit(1);
});
