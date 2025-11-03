#!/usr/bin/env tsx
/**
 * Copy Production Data to Staging Database
 *
 * Source: ooaumjzaztmutltifhoq (production)
 * Target: qlvkgniqcoisbnwwjfte (staging)
 *
 * Strategy: Read from prod → Generate INSERT → Execute on staging
 */

import { createClient } from '@supabase/supabase-js';

const PROD_PROJECT_ID = 'ooaumjzaztmutltifhoq';
const STAGING_PROJECT_ID = 'qlvkgniqcoisbnwwjfte';

const SUPABASE_URL_PROD = `https://${PROD_PROJECT_ID}.supabase.co`;
const SUPABASE_URL_STAGING = `https://${STAGING_PROJECT_ID}.supabase.co`;

// Service role keys from env (separate keys for prod and staging)
const PROD_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STAGING_SERVICE_ROLE_KEY = process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY;

if (!PROD_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

if (!STAGING_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_STAGING_SERVICE_ROLE_KEY not found in environment');
  console.error('   Export it: export SUPABASE_STAGING_SERVICE_ROLE_KEY="..."');
  process.exit(1);
}

const prodClient = createClient(SUPABASE_URL_PROD, PROD_SERVICE_ROLE_KEY);
const stagingClient = createClient(SUPABASE_URL_STAGING, STAGING_SERVICE_ROLE_KEY);

// Tables in FK dependency order (from _DEPENDENCY_TREE.txt)
const COPY_ORDER = [
  // Depth 0 - Root tables (no FK dependencies)
  { name: 'sire_countries', rows: 45, batch: false },
  { name: 'sire_document_types', rows: 4, batch: false },
  { name: 'sire_cities', rows: 42, batch: false },
  { name: 'sire_export_logs', rows: 0, batch: false },
  { name: 'property_relationships', rows: 1, batch: false },
  { name: 'muva_content', rows: 742, batch: true }, // Large - batch
  { name: 'ics_feed_configurations', rows: 9, batch: false },
  { name: 'guest_reservations', rows: 104, batch: false },
  { name: 'calendar_events', rows: 74, batch: false, selfRef: true }, // Self-ref FK
  { name: 'airbnb_mphb_imported_reservations', rows: 0, batch: false },

  // Depth 1 - Depends on tenant_registry or other root tables
  { name: 'user_tenant_permissions', rows: 1, batch: false },
  { name: 'policies', rows: 0, batch: false },
  { name: 'hotels', rows: 3, batch: false },
  { name: 'staff_users', rows: 6, batch: false, selfRef: true }, // Self-ref FK: created_by
  { name: 'hotel_operations', rows: 10, batch: false },
  { name: 'integration_configs', rows: 3, batch: false },
  { name: 'sync_history', rows: 85, batch: false },
  { name: 'job_logs', rows: 39, batch: false },
  { name: 'tenant_compliance_credentials', rows: 0, batch: false },
  { name: 'tenant_knowledge_embeddings', rows: 0, batch: false },
  { name: 'tenant_muva_content', rows: 0, batch: false },
  { name: 'accommodation_units_public', rows: 153, batch: false },
  { name: 'accommodation_units_manual_chunks', rows: 219, batch: false },
  { name: 'prospective_sessions', rows: 412, batch: true }, // Large
  { name: 'guest_conversations', rows: 112, batch: false },
  { name: 'chat_conversations', rows: 2, batch: false },
  { name: 'compliance_submissions', rows: 0, batch: false },
  { name: 'reservation_accommodations', rows: 93, batch: false },
  { name: 'airbnb_motopress_comparison', rows: 0, batch: false },
  { name: 'calendar_event_conflicts', rows: 0, batch: false },
  { name: 'calendar_sync_logs', rows: 0, batch: false },
  { name: 'staff_conversations', rows: 43, batch: false },

  // Depth 2
  { name: 'accommodation_units', rows: 2, batch: false },
  { name: 'accommodation_units_manual', rows: 8, batch: false },
  { name: 'conversation_memory', rows: 10, batch: false },
  { name: 'chat_messages', rows: 319, batch: false },
  { name: 'conversation_attachments', rows: 0, batch: false },

  // Depth 3
  { name: 'staff_messages', rows: 58, batch: false },

  // Large embeddings table - process separately with batching
  { name: 'code_embeddings', rows: 4333, batch: true, batchSize: 500 },
];

interface CopyResult {
  table: string;
  copied: number;
  skipped: boolean;
  error?: string;
}

async function copyTable(
  tableName: string,
  expectedRows: number,
  useBatch: boolean = false,
  batchSize: number = 500,
  isSelfRef: boolean = false
): Promise<CopyResult> {
  console.log(`\n📋 ${tableName} (expected: ${expectedRows} rows, batch: ${useBatch})`);

  try {
    // Check if table has data already
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

    // Disable triggers for self-referencing tables
    if (isSelfRef) {
      console.log(`  🔓 Disabling triggers (self-referencing FK)`);
      await stagingClient.rpc('exec_sql', {
        query: `ALTER TABLE ${tableName} DISABLE TRIGGER ALL;`
      }).catch(() => {
        // Fallback: direct SQL might not work via RPC
        console.log(`  ⚠️  Could not disable triggers (will handle FK order instead)`);
      });
    }

    let totalCopied = 0;

    if (!useBatch) {
      // Small table - copy all at once
      const { data: prodData, error: readError } = await prodClient
        .from(tableName)
        .select('*');

      if (readError) throw readError;
      if (!prodData || prodData.length === 0) {
        console.log(`  ✅ 0 rows (empty in production)`);
        return { table: tableName, copied: 0, skipped: false };
      }

      const { error: writeError } = await stagingClient
        .from(tableName)
        .insert(prodData);

      if (writeError) throw writeError;

      totalCopied = prodData.length;
      console.log(`  ✅ ${totalCopied} rows copied`);
    } else {
      // Large table - copy in batches
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: batchData, error: readError } = await prodClient
          .from(tableName)
          .select('*')
          .range(offset, offset + batchSize - 1);

        if (readError) throw readError;
        if (!batchData || batchData.length === 0) {
          hasMore = false;
          break;
        }

        const { error: writeError } = await stagingClient
          .from(tableName)
          .insert(batchData);

        if (writeError) throw writeError;

        totalCopied += batchData.length;
        console.log(`  📦 Batch ${offset}-${offset + batchData.length}: ${batchData.length} rows`);

        offset += batchSize;
        hasMore = batchData.length === batchSize;
      }

      console.log(`  ✅ ${totalCopied} total rows copied`);
    }

    // Re-enable triggers for self-referencing tables
    if (isSelfRef) {
      console.log(`  🔒 Re-enabling triggers`);
      await stagingClient.rpc('exec_sql', {
        query: `ALTER TABLE ${tableName} ENABLE TRIGGER ALL;`
      }).catch(() => {
        console.log(`  ⚠️  Could not re-enable triggers`);
      });
    }

    return { table: tableName, copied: totalCopied, skipped: false };
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return { table: tableName, copied: 0, skipped: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting Production → Staging Data Copy');
  console.log(`📊 Total tables: ${COPY_ORDER.length}`);
  console.log(`📈 Expected rows: ~6,970`);
  console.log('');

  const results: CopyResult[] = [];
  let totalCopied = 0;
  let errors = 0;

  // tenant_registry is already copied (3 rows)
  console.log('✅ tenant_registry: 3 rows (already copied)');
  totalCopied += 3;

  for (const table of COPY_ORDER) {
    const result = await copyTable(
      table.name,
      table.rows,
      table.batch || false,
      table.batchSize || 500,
      table.selfRef || false
    );

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
  }

  console.log('\n✅ Data copy complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Verify row counts: pnpm dlx tsx scripts/verify-staging-counts.ts');
  console.log('2. Run FK integrity checks');
  console.log('3. Test RLS policies');
}

main().catch(console.error);
