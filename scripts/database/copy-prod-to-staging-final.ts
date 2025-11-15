#!/usr/bin/env tsx
/**
 * Copy Production Data to Staging Database - FINAL VERSION
 *
 * Strategy: Disable FK constraints for problematic tables, copy data, re-enable
 * This allows us to copy without needing auth.users or perfect FK order
 */

import { createClient } from '@supabase/supabase-js';

const PROD_PROJECT_ID = 'ooaumjzaztmutltifhoq';
const STAGING_PROJECT_ID = 'qlvkgniqcoisbnwwjfte';

const SUPABASE_URL_PROD = `https://${PROD_PROJECT_ID}.supabase.co`;
const SUPABASE_URL_STAGING = `https://${STAGING_PROJECT_ID}.supabase.co`;

const PROD_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STAGING_SERVICE_ROLE_KEY = process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY;

if (!PROD_SERVICE_ROLE_KEY || !STAGING_SERVICE_ROLE_KEY) {
  console.error('❌ Missing service role keys');
  process.exit(1);
}

const prodClient = createClient(SUPABASE_URL_PROD, PROD_SERVICE_ROLE_KEY);
const stagingClient = createClient(SUPABASE_URL_STAGING, STAGING_SERVICE_ROLE_KEY);

// Tables that need FK constraints disabled during copy
const FK_PROBLEMATIC_TABLES = [
  'user_tenant_permissions',  // References auth.users (won't exist in staging)
  'staff_users',              // Self-referencing
  'calendar_events',          // Self-referencing
  'hotel_operations',         // References staff_users
  'guest_reservations',       // Has generated column
  'prospective_sessions',     // References guest_reservations (nullable)
];

// Corrected copy order based on actual FK relationships
const COPY_ORDER = [
  // Already copied
  { name: 'tenant_registry', rows: 3, skip: true },
  { name: 'sire_countries', rows: 45, skip: true },
  { name: 'sire_document_types', rows: 4, skip: true },
  { name: 'sire_cities', rows: 42, skip: true },
  { name: 'code_embeddings', rows: 4333, skip: true },
  { name: 'muva_content', rows: 742, skip: true },
  { name: 'conversation_memory', rows: 10, skip: true },
  { name: 'prospective_sessions', rows: 412, skip: true },
  { name: 'property_relationships', rows: 1, skip: true },
  { name: 'accommodation_units_public', rows: 151, skip: true },
  { name: 'hotels', rows: 3, skip: true },
  { name: 'accommodation_units', rows: 2, skip: true },
  { name: 'accommodation_units_manual', rows: 8, skip: true },
  { name: 'integration_configs', rows: 3, skip: true },
  { name: 'sync_history', rows: 85, skip: true },
  { name: 'job_logs', rows: 39, skip: true },
  
  // Need to copy with FK handling
  { name: 'guest_reservations', rows: 104, excludeCols: ['accommodation_unit_id_key'], disableFK: true },
  { name: 'calendar_events', rows: 74, disableFK: true },
  { name: 'ics_feed_configurations', rows: 9 },
  { name: 'staff_users', rows: 6, disableFK: true },
  { name: 'hotel_operations', rows: 10, disableFK: true },
  { name: 'user_tenant_permissions', rows: 1, disableFK: true },
  { name: 'accommodation_units_manual_chunks', rows: 219 },
  { name: 'guest_conversations', rows: 112 },
  { name: 'chat_conversations', rows: 2 },
  { name: 'reservation_accommodations', rows: 93 },
  { name: 'staff_conversations', rows: 43 },
  { name: 'chat_messages', rows: 319 },
  { name: 'staff_messages', rows: 58 },
  
  // Empty tables
  { name: 'sire_export_logs', rows: 0 },
  { name: 'policies', rows: 0 },
  { name: 'tenant_compliance_credentials', rows: 0 },
  { name: 'tenant_knowledge_embeddings', rows: 0 },
  { name: 'tenant_muva_content', rows: 0 },
  { name: 'compliance_submissions', rows: 0 },
  { name: 'conversation_attachments', rows: 0 },
  { name: 'airbnb_mphb_imported_reservations', rows: 0 },
  { name: 'airbnb_motopress_comparison', rows: 0 },
  { name: 'calendar_event_conflicts', rows: 0 },
  { name: 'calendar_sync_logs', rows: 0 },
];

async function execSQL(query: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://${STAGING_PROJECT_ID}.supabase.co/rest/v1/rpc/execute_sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': STAGING_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${STAGING_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function disableConstraints(tableName: string): Promise<void> {
  console.log(`  🔓 Disabling constraints...`);
  const result = await execSQL(`ALTER TABLE ${tableName} DISABLE TRIGGER ALL;`);
  if (!result.success) {
    console.log(`     ⚠️  Could not disable triggers: ${result.error}`);
  }
}

async function enableConstraints(tableName: string): Promise<void> {
  console.log(`  🔒 Re-enabling constraints...`);
  const result = await execSQL(`ALTER TABLE ${tableName} ENABLE TRIGGER ALL;`);
  if (!result.success) {
    console.log(`     ⚠️  Could not enable triggers: ${result.error}`);
  }
}

interface CopyResult {
  table: string;
  copied: number;
  skipped: boolean;
  error?: string;
}

async function copyTable(
  tableName: string,
  expectedRows: number,
  options: {
    skip?: boolean;
    batch?: number;
    excludeCols?: string[];
    disableFK?: boolean;
  } = {}
): Promise<CopyResult> {
  const { skip, batch, excludeCols = [], disableFK } = options;
  
  console.log(`\n📋 ${tableName} (expected: ${expectedRows} rows${batch ? `, batch: ${batch}` : ''})`);

  if (skip) {
    console.log(`  ⏭️  Already copied previously`);
    return { table: tableName, copied: expectedRows, skipped: true };
  }

  try {
    // Check existing data
    const { count: existingCount } = await stagingClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (existingCount && existingCount > 0) {
      console.log(`  ⏭️  Skipping (already has ${existingCount} rows)`);
      return { table: tableName, copied: existingCount, skipped: true };
    }

    if (expectedRows === 0) {
      console.log(`  ⏭️  Skipping (empty table)`);
      return { table: tableName, copied: 0, skipped: true };
    }

    // Disable FK constraints if needed
    if (disableFK) {
      await disableConstraints(tableName);
    }

    let totalCopied = 0;

    if (!batch) {
      // Small table - copy all at once
      const { data: prodData, error: readError } = await prodClient
        .from(tableName)
        .select('*');

      if (readError) throw readError;
      if (!prodData || prodData.length === 0) {
        console.log(`  ✅ 0 rows (empty in production)`);
        if (disableFK) await enableConstraints(tableName);
        return { table: tableName, copied: 0, skipped: false };
      }

      // Remove excluded columns (generated columns)
      const cleanData = excludeCols.length > 0
        ? prodData.map(row => {
            const cleaned = { ...row };
            excludeCols.forEach(col => delete cleaned[col]);
            return cleaned;
          })
        : prodData;

      const { error: writeError } = await stagingClient
        .from(tableName)
        .insert(cleanData);

      if (writeError) throw writeError;

      totalCopied = cleanData.length;
      console.log(`  ✅ ${totalCopied} rows copied`);
    } else {
      // Large table - batch copy
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: batchData, error: readError } = await prodClient
          .from(tableName)
          .select('*')
          .range(offset, offset + batch - 1);

        if (readError) throw readError;
        if (!batchData || batchData.length === 0) break;

        const cleanData = excludeCols.length > 0
          ? batchData.map(row => {
              const cleaned = { ...row };
              excludeCols.forEach(col => delete cleaned[col]);
              return cleaned;
            })
          : batchData;

        const { error: writeError } = await stagingClient
          .from(tableName)
          .insert(cleanData);

        if (writeError) throw writeError;

        totalCopied += cleanData.length;
        console.log(`  📦 Batch ${offset}-${offset + cleanData.length}: ${cleanData.length} rows`);

        offset += batch;
        hasMore = batchData.length === batch;
      }

      console.log(`  ✅ ${totalCopied} total rows copied`);
    }

    // Re-enable FK constraints
    if (disableFK) {
      await enableConstraints(tableName);
    }

    return { table: tableName, copied: totalCopied, skipped: false };
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    
    // Re-enable constraints on error
    if (disableFK) {
      await enableConstraints(tableName);
    }
    
    return { table: tableName, copied: 0, skipped: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Production → Staging Data Copy (FINAL VERSION)');
  console.log(`📊 Total tables: ${COPY_ORDER.length}`);
  console.log(`📈 Expected total rows: ~6,970`);
  console.log('');

  const results: CopyResult[] = [];
  let totalCopied = 0;
  let errors = 0;

  for (const table of COPY_ORDER) {
    const result = await copyTable(table.name, table.rows, {
      skip: table.skip,
      batch: table.batch,
      excludeCols: table.excludeCols,
      disableFK: table.disableFK,
    });

    results.push(result);
    if (!result.error) {
      totalCopied += result.copied;
    } else {
      errors++;
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 COPY SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Total rows copied: ${totalCopied}`);
  console.log(`⏭️  Tables skipped: ${results.filter(r => r.skipped).length}`);
  console.log(`❌ Errors: ${errors}`);

  if (errors > 0) {
    console.log('\n❌ Failed tables:');
    results.filter(r => r.error).forEach(r => {
      console.log(`  - ${r.table}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All data copied successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify row counts match production');
    console.log('2. Test RLS policies');
    console.log('3. Run smoke tests');
  }
}

main().catch(console.error);
