#!/usr/bin/env tsx
/**
 * Verify Staging Database Schema - V2
 *
 * FASE 3: Enhanced Staging Workflow
 *
 * Purpose:
 * - Verify critical tables exist in staging database
 * - Check basic row counts for key tables
 * - Confirm database connectivity
 * - Uses MCP-compatible approach (Management API) instead of system catalogs
 *
 * Usage:
 *   pnpm dlx tsx scripts/verify-schema-staging-v2.ts
 *
 * Exit codes:
 *   0 - Schema verification successful
 *   1 - Schema verification failed
 */

const STAGING_PROJECT_ID = process.env.SUPABASE_STAGING_PROJECT_ID || 'rvjmwwvkhglcuqwcznph';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ Error: SUPABASE_ACCESS_TOKEN environment variable not set');
  console.error('   This token is required for Management API access');
  process.exit(1);
}

// Critical tables that must exist
// Updated to match actual staging schema
const CRITICAL_TABLES = [
  // Core tables
  'hotels',
  'accommodation_units',
  'accommodation_units_public',

  // Guest/Chat system
  'guest_conversations',
  'guest_reservations',
  'chat_conversations',
  'chat_messages',

  // Calendar/Sync
  'calendar_events',
  'prospective_sessions',

  // Content/Embeddings
  'muva_content',
  'code_embeddings'
];

// Tables to check row counts (basic data integrity)
const TABLES_WITH_DATA = [
  'hotels',                   // Should have hotel records
  'accommodation_units',      // Should have units
  'guest_conversations',      // May have conversations
];

interface TableInfo {
  table_name: string;
  table_schema: string;
  row_count?: number;
}

/**
 * Execute SQL query via Management API
 */
async function executeQuery(query: string): Promise<any> {
  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${STAGING_PROJECT_ID}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Query failed: ${error}`);
    }

    const data = await response.json();
    // Management API can return data in different formats
    // Try multiple possible response structures
    return data.result || data.data || data || [];
  } catch (error) {
    console.error('❌ Query execution error:', error);
    throw error;
  }
}

/**
 * Get list of all tables using Management API
 * Simulates mcp__supabase__list_tables
 */
async function listTables(): Promise<TableInfo[]> {
  try {
    // Query to get all user tables (not system tables)
    const query = `
      SELECT
        schemaname as table_schema,
        tablename as table_name
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'extensions', 'graphql', 'graphql_public', 'net', 'pgsodium', 'pgsodium_masks', 'pgtle', 'realtime', 'supabase_functions', 'supabase_migrations', 'vault')
      ORDER BY schemaname, tablename
    `;

    const tables = await executeQuery(query);
    return tables;
  } catch (error) {
    console.error('❌ Failed to list tables:', error);
    return [];
  }
}

/**
 * Get row count for a specific table
 */
async function getRowCount(tableName: string): Promise<number> {
  try {
    const query = `SELECT COUNT(*) as count FROM ${tableName}`;
    const result = await executeQuery(query);
    return result[0]?.count || 0;
  } catch (error) {
    console.error(`⚠️  Could not get row count for ${tableName}:`, error);
    return -1;
  }
}

/**
 * Check database connectivity
 */
async function checkConnectivity(): Promise<boolean> {
  try {
    const result = await executeQuery('SELECT NOW() as timestamp, version() as version');
    if (result && result[0]) {
      console.log(`✅ Database connected: ${new Date(result[0].timestamp).toISOString()}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Database connectivity check failed:', error);
    return false;
  }
}

async function main() {
  console.log('');
  console.log('🔍 MUVA Chat - Staging Schema Verification v2');
  console.log('=============================================');
  console.log(`📦 Project: ${STAGING_PROJECT_ID}`);
  console.log(`🔧 Using: MCP-compatible Management API approach`);
  console.log('');

  let hasErrors = false;

  // Step 1: Check connectivity
  console.log('📡 Checking database connectivity...');
  const isConnected = await checkConnectivity();
  if (!isConnected) {
    console.error('❌ Cannot connect to database');
    process.exit(1);
  }

  // Step 2: Get all tables
  console.log('\n📋 Retrieving table list...');
  const allTables = await listTables();
  const tableNames = new Set(allTables.map(t => t.table_name));
  console.log(`   Found ${allTables.length} tables in database`);

  // Step 3: Verify critical tables exist
  console.log('\n✅ Verifying critical tables...');
  const missingTables: string[] = [];

  for (const tableName of CRITICAL_TABLES) {
    if (tableNames.has(tableName)) {
      console.log(`   ✓ ${tableName}`);
    } else {
      console.error(`   ✗ ${tableName} - MISSING`);
      missingTables.push(tableName);
      hasErrors = true;
    }
  }

  if (missingTables.length > 0) {
    console.error(`\n❌ Missing ${missingTables.length} critical tables:`);
    missingTables.forEach(t => console.error(`   - ${t}`));
  }

  // Step 4: Check row counts for key tables
  console.log('\n📊 Checking data integrity (row counts)...');

  for (const tableName of TABLES_WITH_DATA) {
    if (!tableNames.has(tableName)) {
      console.log(`   ⚠️  ${tableName} - table doesn't exist`);
      continue;
    }

    const count = await getRowCount(tableName);
    if (count === -1) {
      console.log(`   ⚠️  ${tableName} - could not get count`);
    } else if (count === 0) {
      console.log(`   ⚠️  ${tableName} - empty (0 rows)`);
    } else {
      console.log(`   ✓ ${tableName} - ${count} rows`);
    }
  }

  // Step 5: Check for unexpected tables (optional)
  const publicTables = allTables.filter(t => t.table_schema === 'public');
  const unexpectedTables = publicTables.filter(t =>
    !CRITICAL_TABLES.includes(t.table_name) &&
    !t.table_name.startsWith('_') &&
    !t.table_name.includes('backup') &&
    !t.table_name.includes('old')
  );

  if (unexpectedTables.length > 0) {
    console.log(`\n📌 Additional tables found (${unexpectedTables.length}):`);
    unexpectedTables.slice(0, 10).forEach(t =>
      console.log(`   - ${t.table_name}`)
    );
    if (unexpectedTables.length > 10) {
      console.log(`   ... and ${unexpectedTables.length - 10} more`);
    }
  }

  // Step 6: Check RLS policies (important for security)
  console.log('\n🔒 Checking RLS policies...');
  try {
    const rlsQuery = `
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
      ORDER BY tablename
    `;
    const rlsPolicies = await executeQuery(rlsQuery);

    if (rlsPolicies.length > 0) {
      console.log(`   Found RLS policies on ${rlsPolicies.length} tables`);
      rlsPolicies.slice(0, 5).forEach((p: any) =>
        console.log(`   ✓ ${p.tablename} - ${p.policy_count} policies`)
      );
      if (rlsPolicies.length > 5) {
        console.log(`   ... and ${rlsPolicies.length - 5} more tables with policies`);
      }
    } else {
      console.log('   ⚠️  No RLS policies found');
    }
  } catch (error) {
    console.log('   ⚠️  Could not check RLS policies');
  }

  // Final summary
  console.log('\n========================================');
  console.log('📊 Schema Verification Summary:');
  console.log(`   Database: ${isConnected ? '✅ Connected' : '❌ Not connected'}`);
  console.log(`   Tables: ${allTables.length} total`);
  console.log(`   Critical Tables: ${CRITICAL_TABLES.length - missingTables.length}/${CRITICAL_TABLES.length}`);

  if (hasErrors) {
    console.log(`   Status: ❌ FAILED`);
    console.log('========================================\n');
    console.error('❌ Schema verification failed');
    process.exit(1);
  } else {
    console.log(`   Status: ✅ PASSED`);
    console.log('========================================\n');
    console.log('✅ Schema verification successful');
    process.exit(0);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run main function
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});