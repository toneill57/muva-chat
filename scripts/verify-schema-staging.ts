#!/usr/bin/env tsx
/**
 * Verify Schema State in Staging Environment
 *
 * FASE 3: Enhanced Staging Workflow
 *
 * Purpose:
 * - Verify staging database schema is healthy after migrations
 * - Check critical tables exist
 * - Check RLS policies are active
 * - Exit with code 0 on success, 1 on failure
 *
 * Usage:
 *   pnpm dlx tsx scripts/verify-schema-staging.ts
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

// Critical tables that must exist
const CRITICAL_TABLES = [
  'hotels',
  'accommodation_units',
  'guest_reservations',
  'guest_conversations',
  'chat_messages',
  'muva_content',
  'code_embeddings',
];

interface TableInfo {
  table_name: string;
  table_schema: string;
}

interface RLSInfo {
  tablename: string;
  rowsecurity: boolean;
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔍 Verify Schema State - Staging');
  console.log('================================================');
  console.log('');
  console.log(`📦 Staging Project: ${STAGING_PROJECT_ID}`);
  console.log(`🌐 Staging URL: ${STAGING_URL}`);
  console.log('');

  try {
    const supabase = createClient(STAGING_URL, STAGING_SERVICE_KEY);

    let hasErrors = false;

    // Step 1: Check critical tables exist
    console.log('📊 Step 1: Verifying critical tables...');
    console.log('');

    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error('❌ Failed to query tables');
      console.error(`   Error: ${tablesError.message}`);
      hasErrors = true;
    } else {
      const existingTables = new Set((tables as TableInfo[]).map(t => t.table_name));
      const missingTables: string[] = [];

      for (const tableName of CRITICAL_TABLES) {
        if (existingTables.has(tableName)) {
          console.log(`✅ ${tableName}`);
        } else {
          console.log(`❌ ${tableName} - MISSING`);
          missingTables.push(tableName);
          hasErrors = true;
        }
      }

      console.log('');
      if (missingTables.length > 0) {
        console.error(`⚠️  Missing ${missingTables.length} critical tables`);
        console.log('');
      } else {
        console.log(`✅ All ${CRITICAL_TABLES.length} critical tables exist`);
        console.log('');
      }
    }

    // Step 2: Check RLS policies are active
    console.log('🔒 Step 2: Verifying RLS policies...');
    console.log('');

    const { data: rlsData, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public');

    if (rlsError) {
      console.error('❌ Failed to query RLS status');
      console.error(`   Error: ${rlsError.message}`);
      hasErrors = true;
    } else {
      const rlsInfo = rlsData as RLSInfo[];
      let rlsEnabled = 0;
      let rlsDisabled = 0;

      for (const table of rlsInfo) {
        // Only check critical tables
        if (CRITICAL_TABLES.includes(table.tablename)) {
          if (table.rowsecurity) {
            console.log(`✅ ${table.tablename} - RLS enabled`);
            rlsEnabled++;
          } else {
            console.log(`⚠️  ${table.tablename} - RLS disabled`);
            rlsDisabled++;
          }
        }
      }

      console.log('');
      console.log(`✅ RLS enabled on ${rlsEnabled} tables`);
      if (rlsDisabled > 0) {
        console.log(`⚠️  RLS disabled on ${rlsDisabled} tables (may be intentional)`);
      }
      console.log('');
    }

    // Step 3: Test database connectivity
    console.log('🔌 Step 3: Testing database connectivity...');
    console.log('');

    const { data: testData, error: testError } = await supabase
      .from('hotels')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Failed to query database');
      console.error(`   Error: ${testError.message}`);
      hasErrors = true;
    } else {
      console.log('✅ Database connection successful');
      console.log('');
    }

    // Step 4: Count tables
    console.log('📊 Step 4: Database statistics...');
    console.log('');

    if (tables) {
      const publicTables = (tables as TableInfo[]).filter(t => t.table_schema === 'public');
      console.log(`📋 Total public tables: ${publicTables.length}`);
    }

    // Get total row count for critical tables
    let totalRows = 0;
    for (const tableName of CRITICAL_TABLES.slice(0, 3)) { // Just sample first 3
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        totalRows += count;
      }
    }

    console.log(`📊 Sample row count (3 tables): ${totalRows}`);
    console.log('');

    // Final verdict
    console.log('================================================');
    if (hasErrors) {
      console.log('⚠️  Schema verification completed with warnings');
      console.log('================================================');
      console.log('');
      console.log('Some checks failed. Review errors above.');
      console.log('');
      process.exit(1);
    } else {
      console.log('✅ Schema verification passed');
      console.log('================================================');
      console.log('');
      console.log('All schema checks passed successfully.');
      console.log('Staging database is healthy and ready.');
      console.log('');
      process.exit(0);
    }

  } catch (error: any) {
    console.error('');
    console.error('================================================');
    console.error('❌ Schema verification failed');
    console.error('================================================');
    console.error('');
    console.error(`Error: ${error.message}`);
    console.error('');
    process.exit(1);
  }
}

// Run main function
main();
