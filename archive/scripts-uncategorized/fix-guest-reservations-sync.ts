#!/usr/bin/env tsx
/**
 * Fix guest_reservations sync issue
 *
 * Specifically handles the generated column issue:
 * - Excludes 'accommodation_unit_id_key' generated column from insert
 */

import { createClient } from '@supabase/supabase-js';

const PROD_PROJECT_ID = 'ooaumjzaztmutltifhoq';
const STAGING_PROJECT_ID = 'rvjmwwvkhglcuqwcznph';

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

async function syncGuestReservations(): Promise<number> {
  console.log('\n📋 Syncing guest_reservations (excluding generated columns)...');

  // First, clear the staging table
  const { error: deleteError } = await stagingClient
    .from('guest_reservations')
    .delete()
    .neq('created_at', '1900-01-01'); // Delete everything

  if (deleteError) {
    console.log(`   ⚠️ Could not clear guest_reservations: ${deleteError.message}`);
  } else {
    console.log(`   ✓ Cleared guest_reservations`);
  }

  // Define columns to copy (excluding generated column 'accommodation_unit_id_key')
  const columnsToSelect = [
    'id',
    'tenant_id',
    'guest_name',
    'phone_full',
    'phone_last_4',
    'check_in_date',
    'check_out_date',
    'reservation_code',
    'status',
    'created_at',
    'updated_at',
    'accommodation_unit_id',
    'guest_email',
    'guest_country',
    'adults',
    'children',
    'total_price',
    'currency',
    'check_in_time',
    'check_out_time',
    'booking_source',
    'booking_notes',
    'external_booking_id',
    // 'accommodation_unit_id_key', // EXCLUDED - this is generated
    'document_type',
    'document_number',
    'birth_date',
    'first_surname',
    'second_surname',
    'given_names',
    'nationality_code',
    'origin_city_code',
    'destination_city_code',
    'hotel_sire_code',
    'hotel_city_code',
    'movement_type',
    'movement_date'
  ].join(', ');

  let totalCopied = 0;
  const batchSize = 50; // Smaller batch for debugging
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch from production (only non-generated columns)
    const { data, error, count } = await prodClient
      .from('guest_reservations')
      .select(columnsToSelect, { count: 'exact' })
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error(`   ✗ Error reading guest_reservations: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    console.log(`   → Batch ${Math.floor(offset / batchSize) + 1}: Processing ${data.length} rows...`);

    // Insert into staging
    const { error: insertError } = await stagingClient
      .from('guest_reservations')
      .insert(data);

    if (insertError) {
      console.error(`   ✗ Batch insert failed: ${insertError.message}`);

      // Try one by one
      let individualSuccess = 0;
      let individualFails = 0;

      for (const row of data) {
        try {
          const { error: singleError } = await stagingClient
            .from('guest_reservations')
            .insert(row);

          if (!singleError) {
            individualSuccess++;
          } else {
            console.log(`      ⚠️ Row failed: ${singleError.message}`);
            if (row.reservation_code) {
              console.log(`         Reservation: ${row.reservation_code}`);
            }
            individualFails++;
          }
        } catch (e) {
          individualFails++;
        }
      }

      console.log(`   → Batch result: ${individualSuccess} success, ${individualFails} failed`);
      totalCopied += individualSuccess;
    } else {
      totalCopied += data.length;
      console.log(`   ✓ Batch inserted successfully`);
    }

    // Progress
    if (count && count > batchSize) {
      console.log(`   → Overall progress: ${totalCopied}/${count} rows`);
    }

    offset += batchSize;
    hasMore = data.length === batchSize;
  }

  console.log(`\n   ✓ guest_reservations: ${totalCopied} rows copied\n`);
  return totalCopied;
}

async function main() {
  console.log('');
  console.log('🔧 Fixing guest_reservations Sync Issue');
  console.log('========================================');
  console.log(`📦 Source: ${PROD_PROJECT_ID} (production)`);
  console.log(`📦 Target: ${STAGING_PROJECT_ID} (staging)`);
  console.log('');

  const startTime = Date.now();
  const copiedRows = await syncGuestReservations();
  const duration = Math.round((Date.now() - startTime) / 1000);

  // Verification
  console.log('🔍 Verification...');

  const { count: prodCount } = await prodClient
    .from('guest_reservations')
    .select('*', { count: 'exact', head: true });

  const { count: stagingCount } = await stagingClient
    .from('guest_reservations')
    .select('*', { count: 'exact', head: true });

  const match = prodCount === stagingCount;
  const icon = match ? '✅' : '⚠️';
  console.log(`   ${icon} guest_reservations: Prod=${prodCount}, Staging=${stagingCount}`);

  console.log('');
  console.log('========================================');
  if (match) {
    console.log('✅ Perfect Sync Achieved!');
  } else {
    console.log('⚠️ Partial Sync Complete');
    if (prodCount && stagingCount) {
      const diff = prodCount - stagingCount;
      console.log(`   Missing rows: ${diff}`);
      console.log(`   Success rate: ${Math.round((stagingCount / prodCount) * 100)}%`);
    }
  }
  console.log(`   Rows copied: ${copiedRows}`);
  console.log(`   Duration: ${duration} seconds`);
  console.log('========================================');
  console.log('');
}

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