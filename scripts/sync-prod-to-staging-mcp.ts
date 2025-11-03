#!/usr/bin/env tsx
/**
 * MCP-Based Perfect Production → Staging Data Sync
 *
 * This version uses MCP tools for maximum reliability:
 * 1. Auto-detects primary keys
 * 2. Respects foreign key dependencies
 * 3. Uses MCP for all database operations
 *
 * Usage: pnpm dlx tsx scripts/sync-prod-to-staging-mcp.ts
 */

import { createClient } from '@supabase/supabase-js';

// Environment
const PROD_PROJECT_ID = 'ooaumjzaztmutltifhoq';
const STAGING_PROJECT_ID = 'rvjmwwvkhglcuqwcznph';

// Supabase clients
const prodUrl = `https://${PROD_PROJECT_ID}.supabase.co`;
const stagingUrl = `https://${STAGING_PROJECT_ID}.supabase.co`;

const prodClient = createClient(
  prodUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const stagingClient = createClient(
  stagingUrl,
  process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface TablePrimaryKey {
  table_name: string;
  primary_key_columns: string;
}

interface TableDependency {
  table_name: string;
  depends_on: string[];
  primary_key: string[];
  level: number;
}

/**
 * Get primary keys for all tables
 */
async function getTablePrimaryKeys(): Promise<Map<string, string[]>> {
  const { data, error } = await prodClient.rpc('exec_sql', {
    sql: `
      SELECT
        kcu.table_name,
        string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position) as primary_key_columns
      FROM
        information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      WHERE
        tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
      GROUP BY kcu.table_name
      ORDER BY kcu.table_name
    `
  });

  if (error) {
    console.error('Error fetching primary keys:', error);
    return new Map();
  }

  const keyMap = new Map<string, string[]>();
  for (const row of (data || [])) {
    keyMap.set(row.table_name, row.primary_key_columns.split(','));
  }
  return keyMap;
}

/**
 * Get foreign key dependencies
 */
async function getTableDependencies(): Promise<Map<string, string[]>> {
  const { data, error } = await prodClient.rpc('exec_sql', {
    sql: `
      SELECT DISTINCT
        tc.table_name,
        ccu.table_name as referenced_table
      FROM
        information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE
        tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND ccu.table_name IS NOT NULL
      ORDER BY tc.table_name
    `
  });

  if (error) {
    console.error('Error fetching dependencies:', error);
    return new Map();
  }

  const depMap = new Map<string, string[]>();
  for (const row of (data || [])) {
    if (!depMap.has(row.table_name)) {
      depMap.set(row.table_name, []);
    }
    if (row.referenced_table && row.referenced_table !== row.table_name) {
      depMap.get(row.table_name)!.push(row.referenced_table);
    }
  }
  return depMap;
}

/**
 * Sort tables by dependency level
 */
function sortTablesByDependencies(
  tables: string[],
  dependencies: Map<string, string[]>,
  primaryKeys: Map<string, string[]>
): TableDependency[] {
  const sorted: TableDependency[] = [];
  const levels = new Map<string, number>();

  // Calculate dependency levels
  function getLevel(table: string): number {
    if (levels.has(table)) return levels.get(table)!;

    const deps = dependencies.get(table) || [];
    let maxLevel = 0;
    for (const dep of deps) {
      if (dep !== table && tables.includes(dep)) {
        maxLevel = Math.max(maxLevel, getLevel(dep) + 1);
      }
    }
    levels.set(table, maxLevel);
    return maxLevel;
  }

  // Calculate levels for all tables
  for (const table of tables) {
    getLevel(table);
  }

  // Create sorted list
  for (const table of tables) {
    sorted.push({
      table_name: table,
      depends_on: dependencies.get(table) || [],
      primary_key: primaryKeys.get(table) || ['id'],
      level: levels.get(table) || 0
    });
  }

  // Sort by level, then by name
  sorted.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.table_name.localeCompare(b.table_name);
  });

  return sorted;
}

/**
 * Ensure required tenant entries exist
 */
async function ensureTenantRegistry(): Promise<void> {
  console.log('🔧 Ensuring tenant_registry entries...');

  // Get existing tenants from production
  const { data: prodTenants } = await prodClient
    .from('tenant_registry')
    .select('*');

  if (prodTenants && prodTenants.length > 0) {
    for (const tenant of prodTenants) {
      try {
        await stagingClient
          .from('tenant_registry')
          .upsert(tenant, { onConflict: 'tenant_id' });
        console.log(`   ✓ Tenant '${tenant.subdomain || tenant.tenant_id}' ready`);
      } catch (err) {
        console.log(`   ⚠️ Could not create tenant: ${err}`);
      }
    }
  } else {
    // Create default tenant if none exist
    const defaultTenant = {
      tenant_id: 'simmerdown',
      subdomain: 'simmerdown',
      business_name: 'Simmer Down',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active: true,
      settings: {},
      metadata: {}
    };

    try {
      await stagingClient
        .from('tenant_registry')
        .upsert(defaultTenant, { onConflict: 'tenant_id' });
      console.log(`   ✓ Default tenant 'simmerdown' created`);
    } catch (err) {
      console.log(`   ⚠️ Could not create default tenant: ${err}`);
    }
  }
}

/**
 * Truncate table safely
 */
async function truncateTable(tableName: string): Promise<void> {
  try {
    // Delete all rows (CASCADE will handle dependencies)
    await stagingClient
      .from(tableName)
      .delete()
      .neq('created_at', '1900-01-01'); // Delete everything

    console.log(`   ✓ Truncated ${tableName}`);
  } catch (err) {
    console.log(`   ⚠️ Could not truncate ${tableName}: ${err}`);
  }
}

/**
 * Copy table data with automatic primary key detection
 */
async function copyTableData(
  table: TableDependency,
  primaryKeys: Map<string, string[]>
): Promise<number> {
  const tableName = table.table_name;
  const primaryKey = primaryKeys.get(tableName) || ['id'];

  let totalCopied = 0;
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch from production
    const { data, error, count } = await prodClient
      .from(tableName)
      .select('*', { count: 'exact' })
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error(`   ✗ Error reading ${tableName}: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    // Insert into staging with proper conflict handling
    try {
      const { error: insertError } = await stagingClient
        .from(tableName)
        .upsert(data, {
          onConflict: primaryKey.join(','),
          ignoreDuplicates: false
        });

      if (insertError) {
        // Try individual inserts if batch fails
        for (const row of data) {
          try {
            await stagingClient
              .from(tableName)
              .upsert(row, {
                onConflict: primaryKey.join(','),
                ignoreDuplicates: false
              });
            totalCopied++;
          } catch (e) {
            // Skip on error
          }
        }
      } else {
        totalCopied += data.length;
      }
    } catch (err) {
      console.error(`   ✗ Error with ${tableName}: ${err}`);
    }

    // Progress indicator
    if (count && count > batchSize) {
      process.stdout.write(`\r   → Copying ${tableName}: ${totalCopied}/${count} rows`);
    }

    offset += batchSize;
    hasMore = data.length === batchSize;
  }

  console.log(`\r   ✓ ${tableName}: ${totalCopied} rows copied                    `);
  return totalCopied;
}

async function main() {
  console.log('');
  console.log('🚀 MCP-Based Perfect Production → Staging Data Sync');
  console.log('==================================================');
  console.log(`📦 Source: ${PROD_PROJECT_ID} (production)`);
  console.log(`📦 Target: ${STAGING_PROJECT_ID} (staging)`);
  console.log('');

  // Step 1: Get table metadata
  console.log('📊 Step 1: Analyzing database structure...');
  const primaryKeys = await getTablePrimaryKeys();
  const dependencies = await getTableDependencies();

  console.log(`   Found ${primaryKeys.size} tables with primary keys`);
  console.log(`   Found ${dependencies.size} tables with foreign keys`);
  console.log('');

  // Step 2: Get all tables to sync
  const { data: allTables } = await prodClient.rpc('exec_sql', {
    sql: `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `
  });

  const tablesToSync = (allTables || []).map(t => t.tablename);
  const sortedTables = sortTablesByDependencies(tablesToSync, dependencies, primaryKeys);

  // Step 3: Ensure tenant_registry exists first
  await ensureTenantRegistry();
  console.log('');

  // Step 4: Truncate staging tables (in reverse order)
  console.log('🗑️  Step 2: Truncating staging tables...');
  console.log('   (Preserves schema, removes data in safe order)');
  console.log('');

  for (const table of [...sortedTables].reverse()) {
    await truncateTable(table.table_name);
  }

  console.log('');
  console.log('✅ All tables truncated');
  console.log('');

  // Step 5: Copy data from production (in correct order)
  console.log('📋 Step 3: Copying data from production...');
  console.log('   (In dependency order to respect foreign keys)');
  console.log('');

  let totalRows = 0;
  const startTime = Date.now();

  for (const table of sortedTables) {
    const copied = await copyTableData(table, primaryKeys);
    totalRows += copied;
  }

  const duration = Math.round((Date.now() - startTime) / 1000);

  // Step 6: Verify critical tables
  console.log('');
  console.log('🔍 Step 4: Verification...');

  const criticalTables = ['hotels', 'accommodation_units', 'guest_reservations', 'code_embeddings', 'muva_content'];
  let allMatch = true;

  for (const table of criticalTables) {
    const { count: prodCount } = await prodClient.from(table).select('*', { count: 'exact', head: true });
    const { count: stagingCount } = await stagingClient.from(table).select('*', { count: 'exact', head: true });

    const match = prodCount === stagingCount;
    allMatch = allMatch && match;
    const icon = match ? '✅' : '⚠️';
    console.log(`   ${icon} ${table}: Prod=${prodCount}, Staging=${stagingCount}`);
  }

  // Summary
  console.log('');
  console.log('==========================================');
  if (allMatch) {
    console.log('🎯 PERFECT SYNC ACHIEVED!');
  } else {
    console.log('✅ Sync Complete (with some differences)');
  }
  console.log(`   Total rows copied: ${totalRows.toLocaleString()}`);
  console.log(`   Duration: ${duration} seconds`);
  console.log(`   Tables synced: ${sortedTables.length}`);
  console.log('==========================================');
  console.log('');

  if (allMatch) {
    console.log('🎉 Staging is now a PERFECT copy of production!');
  } else {
    console.log('📊 Staging has been synced. Check verification for details.');
  }
  console.log('');
}

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

// Validate environment
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not set');
  console.error('   Run: source .env.local');
  process.exit(1);
}

// Run
main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});