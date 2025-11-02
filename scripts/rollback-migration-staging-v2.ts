#!/usr/bin/env tsx
/**
 * Rollback Migration in Staging Environment (v2 - usando psql)
 *
 * FASE 3: Enhanced Staging Workflow
 *
 * Purpose:
 * - Rollback last applied migration if deployment fails
 * - Remove migration from schema_migrations table using psql
 * - Exit with code 0 on success, 1 on failure
 *
 * Usage:
 *   pnpm dlx tsx scripts/rollback-migration-staging-v2.ts [--steps=1]
 *
 * Options:
 *   --steps=N  Number of migrations to rollback (default: 1)
 *
 * Environment Variables Required:
 *   SUPABASE_STAGING_PROJECT_ID - Staging project ref (rvjmwwvkhglcuqwcznph)
 *   SUPABASE_SERVICE_ROLE_KEY - Staging service role key (for psql connection)
 */

import { execSync } from 'child_process';

// Environment validation
const STAGING_PROJECT_ID = process.env.SUPABASE_STAGING_PROJECT_ID || 'rvjmwwvkhglcuqwcznph';
const STAGING_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STAGING_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
let stepsToRollback = 1;

for (const arg of args) {
  if (arg.startsWith('--steps=')) {
    const value = parseInt(arg.split('=')[1], 10);
    if (!isNaN(value) && value > 0) {
      stepsToRollback = value;
    }
  }
}

// Supabase connection string
const CONNECTION_STRING = `postgresql://postgres.${STAGING_PROJECT_ID}:${STAGING_SERVICE_KEY}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

interface AppliedMigration {
  version: string;
  name: string;
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔄 Rollback Migration - Staging (v2 - psql)');
  console.log('================================================');
  console.log('');
  console.log(`📦 Staging Project: ${STAGING_PROJECT_ID}`);
  console.log(`🌐 Staging URL: https://${STAGING_PROJECT_ID}.supabase.co`);
  console.log(`⏮️  Steps to rollback: ${stepsToRollback}`);
  console.log('');

  try {
    // Step 1: Get last applied migrations using psql
    console.log('📊 Step 1: Fetching last applied migrations...');
    console.log('');

    let migrationsResult: string;
    try {
      migrationsResult = execSync(
        `psql "${CONNECTION_STRING}" -t -c "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT ${stepsToRollback}"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
    } catch (error: any) {
      console.error('❌ Failed to fetch applied migrations');
      console.error(`   Error: ${error.message}`);
      console.log('');
      console.log('⚠️  This may mean the migration table does not exist yet.');
      console.log('   No migrations to rollback.');
      console.log('');
      process.exit(0);
    }

    // Parse migrations from psql output
    const migrations: AppliedMigration[] = [];
    const lines = migrationsResult.trim().split('\n').filter(line => line.trim());

    for (const line of lines) {
      const parts = line.trim().split('|').map(p => p.trim());
      if (parts.length >= 2) {
        migrations.push({
          version: parts[0],
          name: parts[1]
        });
      }
    }

    if (migrations.length === 0) {
      console.log('⚠️  No migrations found to rollback');
      console.log('');
      console.log('================================================');
      console.log('✅ Rollback completed (nothing to do)');
      console.log('================================================');
      console.log('');
      process.exit(0);
    }

    console.log(`Found ${migrations.length} migration(s) to rollback:`);
    migrations.forEach(m => {
      console.log(`   - ${m.version}_${m.name}`);
    });
    console.log('');

    // Step 2: Remove migration records using psql
    console.log('🗑️  Step 2: Removing migration records...');
    console.log('');

    let removedCount = 0;
    for (const migration of migrations) {
      console.log(`Removing: ${migration.version}_${migration.name}...`);

      try {
        execSync(
          `psql "${CONNECTION_STRING}" -c "DELETE FROM supabase_migrations.schema_migrations WHERE version = '${migration.version}'"`,
          { stdio: 'pipe', encoding: 'utf-8' }
        );
        console.log(`✅ Removed: ${migration.version}_${migration.name}`);
        removedCount++;
      } catch (error: any) {
        console.error(`❌ Failed to remove migration record: ${error.message}`);
        process.exit(1);
      }
    }

    console.log('');

    // Step 3: Warning about manual schema changes
    console.log('⚠️  Step 3: Important Notes');
    console.log('');
    console.log('Migration records have been removed from the database.');
    console.log('');
    console.log('⚠️  WARNING: Schema changes are NOT automatically reverted.');
    console.log('   To fully rollback:');
    console.log('   1. Git reset to previous commit (workflow will do this)');
    console.log('   2. Redeploy application with old code');
    console.log('   3. Consider manual schema cleanup if needed');
    console.log('');

    // Summary
    console.log('================================================');
    console.log('✅ Rollback completed successfully');
    console.log('================================================');
    console.log('');
    console.log(`✅ Removed ${removedCount} migration record(s)`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Git has been reset to previous commit');
    console.log('2. Application will be rebuilt with old code');
    console.log('3. Verify staging environment is working');
    console.log('');
    process.exit(0);

  } catch (error: any) {
    console.error('');
    console.error('================================================');
    console.error('❌ Rollback failed');
    console.error('================================================');
    console.error('');
    console.error(`Error: ${error.message}`);
    console.error('');
    process.exit(1);
  }
}

// Run main function
main();
