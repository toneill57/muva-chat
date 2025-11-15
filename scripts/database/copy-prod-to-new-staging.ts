#!/usr/bin/env tsx
/**
 * Copy Production Data to New Staging Branch
 *
 * Copies all operational data from production to the new staging branch
 * created on 2025-11-01. This script handles tables in dependency order
 * and excludes embeddings (which can be regenerated).
 *
 * Usage: pnpm dlx tsx scripts/copy-prod-to-new-staging.ts
 */

import { createClient } from '@supabase/supabase-js';

// Production database
const PROD_PROJECT_ID = 'ooaumjzaztmutltifhoq';
const PROD_URL = `https://${PROD_PROJECT_ID}.supabase.co`;

// New staging branch (created 2025-11-01)
const STAGING_PROJECT_ID = 'wvbpywuhuuawlijpqoon';
const STAGING_URL = `https://${STAGING_PROJECT_ID}.supabase.co`;

// Service role keys from environment
const PROD_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STAGING_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Same key for branches

if (!PROD_SERVICE_KEY || !STAGING_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const prodClient = createClient(PROD_URL, PROD_SERVICE_KEY);
const stagingClient = createClient(STAGING_URL, STAGING_SERVICE_KEY);

interface CopyResult {
  table: string;
  rowsCopied: number;
  success: boolean;
  error?: string;
}

async function copyTable(
  tableName: string,
  columns: string[],
  batchSize: number = 100
): Promise<CopyResult> {
  console.log(`\n📋 Copying ${tableName}...`);

  try {
    // Fetch all data from production
    const { data: prodData, error: fetchError } = await prodClient
      .from(tableName)
      .select(columns.join(','));

    if (fetchError) {
      throw new Error(`Failed to fetch from production: ${fetchError.message}`);
    }

    if (!prodData || prodData.length === 0) {
      console.log(`   ⚠️  No data found in production for ${tableName}`);
      return { table: tableName, rowsCopied: 0, success: true };
    }

    console.log(`   📥 Fetched ${prodData.length} rows from production`);

    // Insert data in batches to staging
    let totalCopied = 0;
    for (let i = 0; i < prodData.length; i += batchSize) {
      const batch = prodData.slice(i, i + batchSize);

      const { error: insertError } = await stagingClient
        .from(tableName)
        .insert(batch);

      if (insertError) {
        throw new Error(`Failed to insert batch ${i / batchSize + 1}: ${insertError.message}`);
      }

      totalCopied += batch.length;
      console.log(`   ✅ Inserted batch ${Math.floor(i / batchSize) + 1} (${totalCopied}/${prodData.length} rows)`);
    }

    console.log(`   ✨ Successfully copied ${totalCopied} rows to staging`);
    return { table: tableName, rowsCopied: totalCopied, success: true };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Error copying ${tableName}: ${errorMsg}`);
    return { table: tableName, rowsCopied: 0, success: false, error: errorMsg };
  }
}

async function main() {
  console.log('🚀 Starting Production → Staging Data Copy');
  console.log(`📍 Production: ${PROD_PROJECT_ID}`);
  console.log(`📍 Staging:    ${STAGING_PROJECT_ID}\n`);

  const results: CopyResult[] = [];

  // Phase 1: Core operational tables (no embeddings)
  console.log('═══════════════════════════════════════════════');
  console.log('PHASE 1: Core Operational Data');
  console.log('═══════════════════════════════════════════════');

  // hotels (3 rows) - exclude embeddings
  results.push(await copyTable('hotels', [
    'id', 'tenant_id', 'name', 'description', 'short_description',
    'address', 'contact_info', 'check_in_time', 'check_out_time',
    'policies', 'hotel_amenities', 'motopress_property_id',
    'full_description', 'tourism_summary', 'policies_summary',
    'images', 'status', 'created_at', 'updated_at'
    // Excluding: embedding_fast, embedding_balanced
  ]));

  // staff_users (6 rows)
  results.push(await copyTable('staff_users', [
    'staff_id', 'tenant_id', 'role', 'username', 'password_hash',
    'full_name', 'email', 'phone', 'permissions', 'is_active',
    'last_login_at', 'created_at', 'updated_at', 'created_by'
  ]));

  // accommodation_units (2 rows legacy) - exclude embeddings
  results.push(await copyTable('accommodation_units', [
    'id', 'hotel_id', 'motopress_type_id', 'motopress_instance_id',
    'name', 'unit_number', 'description', 'short_description',
    'unit_type', 'capacity', 'bed_configuration', 'size_m2',
    'floor_number', 'view_type', 'tourism_features', 'booking_policies',
    'unique_features', 'accessibility_features', 'location_details',
    'is_featured', 'display_order', 'status', 'images',
    'tenant_id', 'accommodation_type_id', 'created_at', 'updated_at'
    // Excluding: embedding_fast, embedding_balanced
  ]));

  // accommodation_units_public (151 rows) - exclude embeddings
  results.push(await copyTable('accommodation_units_public', [
    'unit_id', 'tenant_id', 'name', 'unit_number', 'unit_type',
    'description', 'short_description', 'highlights', 'amenities',
    'pricing', 'photos', 'virtual_tour_url', 'metadata',
    'is_active', 'is_bookable', 'created_at', 'updated_at'
    // Excluding: embedding_fast, embedding
  ], 50)); // Larger batch size for this table

  // accommodation_units_manual (8 rows) - exclude embeddings
  results.push(await copyTable('accommodation_units_manual', [
    'unit_id', 'manual_content', 'detailed_instructions',
    'house_rules_specific', 'emergency_info', 'wifi_password',
    'safe_code', 'appliance_guides', 'local_tips', 'metadata',
    'created_at', 'updated_at'
    // Excluding: embedding, embedding_balanced
  ]));

  // Phase 2: Reservations & Guests
  console.log('\n═══════════════════════════════════════════════');
  console.log('PHASE 2: Reservations & Guest Data');
  console.log('═══════════════════════════════════════════════');

  // guest_reservations (104 rows)
  results.push(await copyTable('guest_reservations', [
    'id', 'tenant_id', 'guest_name', 'phone_full', 'phone_last_4',
    'check_in_date', 'check_out_date', 'reservation_code', 'status',
    'created_at', 'updated_at', 'accommodation_unit_id', 'guest_email',
    'guest_country', 'adults', 'children', 'total_price', 'currency',
    'check_in_time', 'check_out_time', 'booking_source', 'booking_notes',
    'external_booking_id', 'accommodation_unit_id_key', 'document_type',
    'document_number', 'birth_date', 'first_surname', 'second_surname',
    'given_names', 'nationality_code', 'origin_city_code',
    'destination_city_code', 'hotel_sire_code', 'hotel_city_code',
    'movement_type', 'movement_date'
  ]));

  // reservation_accommodations (93 rows)
  results.push(await copyTable('reservation_accommodations', [
    'id', 'reservation_id', 'accommodation_unit_id',
    'motopress_accommodation_id', 'motopress_type_id', 'room_rate',
    'created_at'
  ]));

  // guest_conversations (112 rows)
  results.push(await copyTable('guest_conversations', [
    'id', 'guest_id', 'tenant_id', 'title', 'last_message',
    'created_at', 'updated_at', 'message_count', 'compressed_history',
    'favorites', 'is_archived', 'archived_at', 'last_activity_at'
  ]));

  // chat_messages (319 rows)
  results.push(await copyTable('chat_messages', [
    'id', 'conversation_id', 'role', 'content', 'metadata',
    'created_at', 'entities', 'sources', 'tenant_id'
  ], 100));

  // Phase 3: Content & Integrations
  console.log('\n═══════════════════════════════════════════════');
  console.log('PHASE 3: Content & Integration Data');
  console.log('═══════════════════════════════════════════════');

  // muva_content (742 rows) - exclude embeddings, largest table
  console.log('\n⚠️  muva_content is large (742 rows), processing in batches...');
  results.push(await copyTable('muva_content', [
    'id', 'content', 'source_file', 'document_type', 'chunk_index',
    'total_chunks', 'page_number', 'section_title', 'language',
    'embedding_model', 'token_count', 'created_at', 'updated_at',
    'title', 'description', 'category', 'status', 'version',
    'tags', 'keywords', 'schema_type', 'schema_version',
    'business_info', 'subcategory'
    // Excluding: embedding, embedding_fast (can be regenerated)
  ], 50));

  // sire_content (8 rows) - exclude embeddings
  results.push(await copyTable('sire_content', [
    'id', 'content', 'source_file', 'document_type', 'chunk_index',
    'total_chunks', 'page_number', 'section_title', 'language',
    'embedding_model', 'token_count', 'created_at', 'updated_at',
    'title', 'description', 'category', 'status', 'version',
    'tags', 'keywords'
    // Excluding: embedding, embedding_balanced
  ]));

  // integration_configs (3 rows)
  results.push(await copyTable('integration_configs', [
    'id', 'tenant_id', 'integration_type', 'config_data',
    'is_active', 'last_sync_at', 'created_at', 'updated_at'
  ]));

  // calendar_events (74 rows)
  results.push(await copyTable('calendar_events', [
    'id', 'tenant_id', 'accommodation_unit_id', 'source', 'external_uid',
    'event_type', 'start_date', 'end_date', 'check_in_time', 'check_out_time',
    'summary', 'description', 'reservation_code', 'guest_name', 'guest_email',
    'guest_phone', 'guest_phone_last4', 'total_guests', 'adults', 'children',
    'total_price', 'currency', 'source_priority', 'last_modified',
    'sequence_number', 'sync_generation', 'ics_dtstamp', 'first_seen_at',
    'last_seen_at', 'status', 'is_deleted', 'deleted_at',
    'parent_event_id', 'merged_into_id', 'created_at', 'updated_at'
  ]));

  // ics_feed_configurations (9 rows)
  results.push(await copyTable('ics_feed_configurations', [
    'id', 'tenant_id', 'accommodation_unit_id', 'feed_name', 'feed_url',
    'source_platform', 'feed_type', 'auth_type', 'auth_credentials',
    'is_active', 'sync_interval_minutes', 'sync_priority', 'last_sync_at',
    'last_successful_sync_at', 'last_sync_status', 'last_sync_error',
    'last_sync_error_details', 'last_etag', 'last_modified', 'total_syncs',
    'successful_syncs', 'failed_syncs', 'consecutive_failures',
    'events_imported_total', 'events_imported_last', 'created_at', 'updated_at'
  ]));

  // hotel_operations (10 rows) - exclude embeddings
  results.push(await copyTable('hotel_operations', [
    'operation_id', 'tenant_id', 'category', 'title', 'content',
    'metadata', 'access_level', 'version', 'is_active',
    'created_at', 'updated_at', 'created_by'
    // Excluding: embedding, embedding_balanced
  ]));

  // Summary Report
  console.log('\n═══════════════════════════════════════════════');
  console.log('MIGRATION SUMMARY');
  console.log('═══════════════════════════════════════════════\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalRows = successful.reduce((sum, r) => sum + r.rowsCopied, 0);

  console.log('✅ Successful Tables:');
  successful.forEach(r => {
    console.log(`   ${r.table.padEnd(35)} ${r.rowsCopied.toString().padStart(4)} rows`);
  });

  if (failed.length > 0) {
    console.log('\n❌ Failed Tables:');
    failed.forEach(r => {
      console.log(`   ${r.table.padEnd(35)} ${r.error}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`Total: ${successful.length}/${results.length} tables copied successfully`);
  console.log(`Total rows: ${totalRows}`);
  console.log('═══════════════════════════════════════════════\n');

  console.log('📝 NEXT STEPS:');
  console.log('1. Run FK integrity validation');
  console.log('2. Regenerate embeddings if needed');
  console.log('3. Test tenant isolation');
  console.log('4. Verify RLS policies\n');

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
