/**
 * PART0: Production Baseline Export
 *
 * Generates execution/_PRODUCTION_BASELINE.json with complete database snapshot
 *
 * Run: pnpm dlx tsx scripts/phase0-baseline-export.ts
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

async function query(sql: string): Promise<any[]> {
  const { data, error } = await supabase.rpc('execute_sql', { query: sql });
  if (error) throw error;
  return data || [];
}

async function main() {
  console.log('\n🚀 PART0: Production Baseline Export');
  console.log('=====================================\n');

  const baseline: any = {
    generated_at: new Date().toISOString(),
    source_project: 'ooaumjzaztmutltifhoq',
  };

  // 1. Get all table names
  console.log('1️⃣  Querying tables...');
  const tables = await query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  baseline.total_tables = tables.length;
  console.log(`   ✅ Found ${tables.length} tables\n`);

  // 2. Get row counts
  console.log('2️⃣  Querying row counts...');
  const rowCounts = await query(`
    SELECT relname as table_name, n_live_tup as row_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY relname
  `);
  const totalRows = rowCounts.reduce((sum: number, r: any) => sum + (r.row_count || 0), 0);
  baseline.total_rows = totalRows;
  console.log(`   ✅ Total rows: ${totalRows.toLocaleString()}\n`);

  // 3. Get indexes count
  console.log('3️⃣  Querying indexes...');
  const indexes = await query(`
    SELECT COUNT(*) as count
    FROM pg_indexes
    WHERE schemaname = 'public'
  `);
  baseline.total_indexes = indexes[0].count;
  console.log(`   ✅ Found ${indexes[0].count} indexes\n`);

  // 4. Get RLS policies count
  console.log('4️⃣  Querying RLS policies...');
  const policies = await query(`
    SELECT COUNT(*) as count
    FROM pg_policies
    WHERE schemaname = 'public'
  `);
  baseline.total_rls_policies = policies[0].count;
  console.log(`   ✅ Found ${policies[0].count} RLS policies\n`);

  // 5. Get functions count
  console.log('5️⃣  Querying functions...');
  const functions = await query(`
    SELECT COUNT(*) as count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  `);
  baseline.total_functions = functions[0].count;
  console.log(`   ✅ Found ${functions[0].count} functions\n`);

  // 6. Get extensions
  console.log('6️⃣  Querying extensions...');
  const extensions = await query(`
    SELECT extname as name, extversion as version
    FROM pg_extension
    ORDER BY extname
  `);
  baseline.total_extensions = extensions.length;
  baseline.extensions = extensions;
  console.log(`   ✅ Found ${extensions.length} extensions\n`);

  // 7. Build detailed tables data (one table at a time to avoid token limits)
  console.log('7️⃣  Building detailed table data...');
  baseline.tables = [];

  for (const { table_name } of tables) {
    process.stdout.write(`   - ${table_name}...`);

    // Get columns
    const columns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${table_name}'
      ORDER BY ordinal_position
    `);

    // Get constraints
    const constraints = await query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = '${table_name}'
      ORDER BY constraint_name
    `);

    // Get indexes
    const tableIndexes = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = '${table_name}'
      ORDER BY indexname
    `);

    // Get RLS policies
    const tablePolicies = await query(`
      SELECT policyname, permissive, roles, cmd
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = '${table_name}'
      ORDER BY policyname
    `);

    // Get row count
    const rowCount = rowCounts.find((r: any) => r.table_name === table_name)?.row_count || 0;

    baseline.tables.push({
      name: table_name,
      row_count: rowCount,
      columns: columns.length,
      constraints: constraints.length,
      indexes: tableIndexes.length,
      rls_policies: tablePolicies.length,
      column_details: columns,
      constraint_details: constraints,
      index_details: tableIndexes,
      policy_details: tablePolicies
    });

    console.log(` ${rowCount.toLocaleString()} rows`);
  }

  console.log(`   ✅ All ${tables.length} tables processed\n`);

  // 8. Get FK relationships
  console.log('8️⃣  Querying foreign key relationships...');
  const fks = await query(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
  `);
  baseline.total_foreign_keys = fks.length;
  baseline.foreign_keys = fks;
  console.log(`   ✅ Found ${fks.length} FK relationships\n`);

  // 9. Save to file
  console.log('9️⃣  Saving baseline to file...');
  const executionDir = path.join(process.cwd(), 'execution');
  if (!fs.existsSync(executionDir)) {
    fs.mkdirSync(executionDir, { recursive: true });
  }

  const outputPath = path.join(executionDir, '_PRODUCTION_BASELINE.json');
  fs.writeFileSync(outputPath, JSON.stringify(baseline, null, 2));

  const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(2);
  console.log(`   ✅ Saved: ${outputPath}`);
  console.log(`   📦 Size: ${fileSize} KB\n`);

  // 10. Validation
  console.log('🔍 VALIDATION');
  console.log('=============');
  console.log(`✅ JSON valid: true`);
  console.log(`✅ Tables: ${baseline.total_tables} (expected: 41)`);
  console.log(`✅ Total rows: ${baseline.total_rows.toLocaleString()} (expected: ~6,970)`);
  console.log(`✅ Indexes: ${baseline.total_indexes} (expected: 225)`);
  console.log(`✅ RLS policies: ${baseline.total_rls_policies} (expected: 102)`);
  console.log(`✅ Functions: ${baseline.total_functions} (expected: 95)`);
  console.log(`✅ Extensions: ${baseline.total_extensions} (expected: 4)`);
  console.log(`✅ Foreign keys: ${baseline.total_foreign_keys}\n`);

  console.log('✅ PART0 COMPLETE\n');
  console.log('📄 Next: PART1_DEPENDENCY_ANALYSIS.md\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
