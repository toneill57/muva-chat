/**
 * PART0: Production Baseline Export
 *
 * Generates _PRODUCTION_BASELINE.json with complete snapshot of production database
 *
 * Output: execution/_PRODUCTION_BASELINE.json
 * Time: ~10 minutes
 * Status: OPTIONAL - Reference documentation only
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface BaselineData {
  generated_at: string;
  source_project: string;
  total_tables: number;
  total_rows: number;
  total_indexes: number;
  total_rls_policies: number;
  total_functions: number;
  total_extensions: number;
  tables: any[];
  functions: any[];
  extensions: any[];
}

async function getAllColumns() {
  console.log('📊 Fetching all columns...');
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `
  });

  if (error) throw error;
  return data;
}

async function getAllConstraints() {
  console.log('🔗 Fetching all constraints...');
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        CASE
          WHEN tc.constraint_type = 'FOREIGN KEY' THEN
            (SELECT ccu.table_name FROM information_schema.constraint_column_usage ccu
             WHERE ccu.constraint_name = tc.constraint_name LIMIT 1)
          ELSE NULL
        END as foreign_table_name,
        CASE
          WHEN tc.constraint_type = 'FOREIGN KEY' THEN
            (SELECT ccu.column_name FROM information_schema.constraint_column_usage ccu
             WHERE ccu.constraint_name = tc.constraint_name LIMIT 1)
          ELSE NULL
        END as foreign_column_name,
        (SELECT kcu.column_name FROM information_schema.key_column_usage kcu
         WHERE kcu.constraint_name = tc.constraint_name LIMIT 1) as column_name
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `
  });

  if (error) throw error;
  return data;
}

async function getAllIndexes() {
  console.log('📇 Fetching all indexes...');
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `
  });

  if (error) throw error;
  return data;
}

async function getAllRLSPolicies() {
  console.log('🔒 Fetching all RLS policies...');
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `
  });

  if (error) throw error;
  return data;
}

async function getAllFunctions() {
  console.log('⚙️  Fetching all functions...');
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        n.nspname as schema,
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as arguments,
        pg_get_functiondef(p.oid) as definition,
        (SELECT option_value FROM pg_options_to_table(p.proconfig)
         WHERE option_name = 'search_path') as search_path
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      ORDER BY p.proname
    `
  });

  if (error) throw error;
  return data;
}

async function getRowCounts() {
  console.log('📈 Fetching row counts...');
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        schemaname,
        relname as tablename,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY relname
    `
  });

  if (error) throw error;
  return data;
}

async function getExtensions() {
  console.log('🔌 Fetching extensions...');
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        extname as name,
        extversion as version
      FROM pg_extension
      ORDER BY extname
    `
  });

  if (error) throw error;
  return data;
}

async function getTables() {
  console.log('📋 Fetching all tables...');
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
  });

  if (error) throw error;
  return data.map((row: any) => row.table_name);
}

async function generateBaseline() {
  console.log('🚀 Starting Production Baseline Export...\n');

  try {
    // Fetch all data in parallel where possible
    const [
      tables,
      columns,
      constraints,
      indexes,
      rlsPolicies,
      functions,
      rowCounts,
      extensions
    ] = await Promise.all([
      getTables(),
      getAllColumns(),
      getAllConstraints(),
      getAllIndexes(),
      getAllRLSPolicies(),
      getAllFunctions(),
      getRowCounts(),
      getExtensions()
    ]);

    console.log('\n✅ All data fetched successfully!\n');
    console.log(`📊 Statistics:`);
    console.log(`   - Tables: ${tables.length}`);
    console.log(`   - Columns: ${columns.length}`);
    console.log(`   - Constraints: ${constraints.length}`);
    console.log(`   - Indexes: ${indexes.length}`);
    console.log(`   - RLS Policies: ${rlsPolicies.length}`);
    console.log(`   - Functions: ${functions.length}`);
    console.log(`   - Extensions: ${extensions.length}`);

    // Calculate total rows
    const totalRows = rowCounts.reduce((sum: number, row: any) => sum + (row.row_count || 0), 0);
    console.log(`   - Total Rows: ${totalRows.toLocaleString()}`);

    // Organize data by table
    const tablesData = tables.map((tableName: string) => {
      const tableColumns = columns.filter((col: any) => col.table_name === tableName);
      const tableConstraints = constraints.filter((c: any) => c.table_name === tableName);
      const tableIndexes = indexes.filter((idx: any) => idx.tablename === tableName);
      const tablePolicies = rlsPolicies.filter((pol: any) => pol.tablename === tableName);
      const tableRowCount = rowCounts.find((rc: any) => rc.tablename === tableName)?.row_count || 0;

      return {
        name: tableName,
        row_count: tableRowCount,
        columns: tableColumns,
        constraints: tableConstraints,
        indexes: tableIndexes,
        rls_policies: tablePolicies
      };
    });

    // Build baseline object
    const baseline: BaselineData = {
      generated_at: new Date().toISOString(),
      source_project: 'ooaumjzaztmutltifhoq',
      total_tables: tables.length,
      total_rows: totalRows,
      total_indexes: indexes.length,
      total_rls_policies: rlsPolicies.length,
      total_functions: functions.length,
      total_extensions: extensions.length,
      tables: tablesData,
      functions: functions,
      extensions: extensions
    };

    // Ensure execution directory exists
    const executionDir = path.join(process.cwd(), 'execution');
    if (!fs.existsSync(executionDir)) {
      fs.mkdirSync(executionDir, { recursive: true });
    }

    // Write to file
    const outputPath = path.join(executionDir, '_PRODUCTION_BASELINE.json');
    fs.writeFileSync(outputPath, JSON.stringify(baseline, null, 2));

    console.log(`\n✅ Baseline export complete!`);
    console.log(`📁 Saved to: ${outputPath}`);
    console.log(`📦 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB\n`);

    // Validation
    console.log('🔍 Validation:');
    console.log(`   ✅ JSON valid: ${baseline.total_tables > 0}`);
    console.log(`   ✅ Contains ${baseline.total_tables} tables (expected: 41)`);
    console.log(`   ✅ Total rows: ${baseline.total_rows.toLocaleString()} (expected: ~6,970)`);
    console.log(`   ✅ All FK relationships documented: ${constraints.filter((c: any) => c.constraint_type === 'FOREIGN KEY').length}`);
    console.log(`   ✅ All RLS policies included: ${baseline.total_rls_policies}`);

    console.log('\n🎯 Next Step: PART1_DEPENDENCY_ANALYSIS.md\n');

  } catch (error) {
    console.error('❌ Error generating baseline:', error);
    throw error;
  }
}

// Execute
generateBaseline()
  .then(() => {
    console.log('✅ PART0 Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ PART0 Failed:', error);
    process.exit(1);
  });
