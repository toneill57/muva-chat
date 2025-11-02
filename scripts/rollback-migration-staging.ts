#!/usr/bin/env tsx
/**
 * Rollback Migration in Staging Environment
 *
 * FASE 3: Enhanced Staging Workflow
 *
 * Purpose:
 * - Rollback last applied migration if deployment fails
 * - Remove migration from schema_migrations table
 * - Exit with code 0 on success, 1 on failure
 *
 * Usage:
 *   pnpm dlx tsx scripts/rollback-migration-staging.ts [--steps=1]
 *
 * Options:
 *   --steps=N  Number of migrations to rollback (default: 1)
 *
 * Environment Variables Required:
 *   SUPABASE_STAGING_PROJECT_ID - Staging project ref (vwrlqvcmzucquxkngqvx)
 *   SUPABASE_SERVICE_ROLE_KEY - Staging service role key
 */

import { createClient } from '@supabase/supabase-js';

// Environment validation
const STAGING_PROJECT_ID = process.env.SUPABASE_STAGING_PROJECT_ID || 'vwrlqvcmzucquxkngqvx';
const STAGING_URL = `https://${STAGING_PROJECT_ID}.supabase.co`;
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

interface AppliedMigration {
  version: string;
  name: string;
  statements: number;
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔄 Rollback Migration - Staging');
  console.log('================================================');
  console.log('');
  console.log(`📦 Staging Project: ${STAGING_PROJECT_ID}`);
  console.log(`🌐 Staging URL: ${STAGING_URL}`);
  console.log(`⏮️  Steps to rollback: ${stepsToRollback}`);
  console.log('');

  try {
    const supabase = createClient(STAGING_URL, STAGING_SERVICE_KEY);

    // Step 1: Get last applied migrations
    console.log('📊 Step 1: Fetching last applied migrations...');
    console.log('');

    const { data: migrations, error: migrationsError } = await supabase
      .from('supabase_migrations.schema_migrations')
      .select('version, name, statements')
      .order('version', { ascending: false })
      .limit(stepsToRollback);

    if (migrationsError) {
      console.error('❌ Failed to fetch applied migrations');
      console.error(`   Error: ${migrationsError.message}`);
      process.exit(1);
    }

    if (!migrations || migrations.length === 0) {
      console.log('⚠️  No migrations found to rollback');
      console.log('');
      console.log('================================================');
      console.log('✅ Rollback completed (nothing to do)');
      console.log('================================================');
      console.log('');
      process.exit(0);
    }

    const migrationsToRollback = migrations as AppliedMigration[];
    console.log(`Found ${migrationsToRollback.length} migration(s) to rollback:`);
    migrationsToRollback.forEach(m => {
      console.log(`   - ${m.version}_${m.name}`);
    });
    console.log('');

    // Step 2: Remove migration records
    console.log('🗑️  Step 2: Removing migration records...');
    console.log('');

    let removedCount = 0;
    for (const migration of migrationsToRollback) {
      console.log(`Removing: ${migration.version}_${migration.name}...`);

      const { error: deleteError } = await supabase
        .from('supabase_migrations.schema_migrations')
        .delete()
        .eq('version', migration.version);

      if (deleteError) {
        console.error(`❌ Failed to remove migration record: ${deleteError.message}`);
        process.exit(1);
      }

      console.log(`✅ Removed: ${migration.version}_${migration.name}`);
      removedCount++;
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
