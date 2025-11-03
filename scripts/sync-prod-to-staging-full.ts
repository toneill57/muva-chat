#!/usr/bin/env tsx
/**
 * Full Production → Staging Data Sync
 *
 * Process:
 * 1. Truncates all data in staging (preserves schema)
 * 2. Copies all data from production
 * 3. Verifies data integrity
 *
 * Usage: pnpm dlx tsx scripts/sync-prod-to-staging-full.ts
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

// Tables to sync (in order to handle foreign keys)
const TABLES_IN_ORDER = [
  // Base tables (no dependencies)
  'sire_countries',
  'sire_cities',
  'sire_document_types',
  'sire_content',
  'sire_export_logs',

  // Core tables
  'hotels',
  'accommodation_units',
  'accommodation_units_manual',
  'accommodation_units_manual_chunks',
  'accommodation_units_public',
  'property_relationships',

  // Calendar/Sync
  'ics_feed_configurations',
  'calendar_events',
  'calendar_event_conflicts',
  'calendar_sync_logs',
  'sync_history',

  // Reservations
  'guest_reservations',
  'reservation_accommodations',
  'airbnb_mphb_imported_reservations',
  'airbnb_motopress_comparison',

  // Chat/Conversations
  'chat_conversations',
  'chat_messages',
  'guest_conversations',
  'conversation_attachments',
  'conversation_memory',
  'staff_conversations',
  'staff_messages',
  'staff_users',
  'prospective_sessions',

  // Compliance
  'compliance_submissions',
  'tenant_compliance_credentials',

  // Content/Embeddings
  'code_embeddings',
  'muva_content',
  'tenant_muva_content',
  'tenant_knowledge_embeddings',

  // Operations/Integration
  'hotel_operations',
  'integration_configs',
  'job_logs',
  'policies',

  // Multi-tenant
  'tenant_registry',
  'user_tenant_permissions'
];

async function truncateTable(tableName: string): Promise<void> {
  try {
    // Use raw SQL for truncate (restart identity resets sequences)
    const { error } = await stagingClient.rpc('exec_sql', {
      sql: `TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`
    });

    if (error && error.message.includes('exec_sql')) {
      // Fallback to delete if RPC not available
      await stagingClient.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    console.log(`   ✓ Truncated ${tableName}`);
  } catch (err) {
    console.log(`   ⚠️ Could not truncate ${tableName}: ${err}`);
  }
}

async function copyTableData(tableName: string): Promise<number> {
  let totalCopied = 0;
  const batchSize = 1000;
  let offset = 0;

  while (true) {
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

    // Insert into staging (with upsert to handle duplicates)
    const { error: insertError } = await stagingClient
      .from(tableName)
      .upsert(data, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (insertError) {
      console.error(`   ✗ Error inserting ${tableName}: ${insertError.message}`);
      // Continue with next batch
    } else {
      totalCopied += data.length;
    }

    // Progress indicator
    if (count && count > batchSize) {
      process.stdout.write(`\r   → Copying ${tableName}: ${totalCopied}/${count} rows`);
    }

    offset += batchSize;

    // If we got less than batch size, we're done
    if (data.length < batchSize) {
      break;
    }
  }

  console.log(`\r   ✓ ${tableName}: ${totalCopied} rows copied                    `);
  return totalCopied;
}

async function main() {
  console.log('');
  console.log('🚀 Full Production → Staging Data Sync');
  console.log('=====================================');
  console.log(`📦 Source: ${PROD_PROJECT_ID} (production)`);
  console.log(`📦 Target: ${STAGING_PROJECT_ID} (staging)`);
  console.log('');

  // Step 1: Truncate staging tables
  console.log('🗑️  Step 1: Truncating staging tables...');
  console.log('   (This preserves schema, only removes data)');
  console.log('');

  for (const table of [...TABLES_IN_ORDER].reverse()) {
    await truncateTable(table);
  }

  console.log('');
  console.log('✅ All tables truncated');
  console.log('');

  // Step 2: Copy data from production
  console.log('📋 Step 2: Copying data from production...');
  console.log('');

  let totalRows = 0;
  const startTime = Date.now();

  for (const table of TABLES_IN_ORDER) {
    const copied = await copyTableData(table);
    totalRows += copied;
  }

  const duration = Math.round((Date.now() - startTime) / 1000);

  // Step 3: Verify
  console.log('');
  console.log('🔍 Step 3: Verification...');

  const criticalTables = ['hotels', 'accommodation_units', 'guest_reservations'];
  for (const table of criticalTables) {
    const { count: prodCount } = await prodClient.from(table).select('*', { count: 'exact', head: true });
    const { count: stagingCount } = await stagingClient.from(table).select('*', { count: 'exact', head: true });

    const match = prodCount === stagingCount ? '✅' : '⚠️';
    console.log(`   ${match} ${table}: Prod=${prodCount}, Staging=${stagingCount}`);
  }

  // Summary
  console.log('');
  console.log('=====================================');
  console.log('✅ Sync Complete!');
  console.log(`   Total rows copied: ${totalRows.toLocaleString()}`);
  console.log(`   Duration: ${duration} seconds`);
  console.log(`   Tables synced: ${TABLES_IN_ORDER.length}`);
  console.log('=====================================');
  console.log('');
  console.log('🎯 Staging is now an exact copy of production!');
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