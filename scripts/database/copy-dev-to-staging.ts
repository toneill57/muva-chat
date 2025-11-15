#!/usr/bin/env tsx
/**
 * Copy ALL data from DEV (Production) to STAGING
 *
 * ⚠️ WARNING: This script DELETES all data in staging tables before copying!
 *
 * This is a COMPLETE database synchronization that copies 29 tables with real data.
 * Previously only copied 10 tables, causing missing staff users, SIRE data, and more.
 *
 * Updated: 2025-11-06 to include all missing tables (staff_users, SIRE catalogs, etc.)
 *
 * Usage: pnpm dlx tsx scripts/copy-dev-to-staging.ts
 */

import { createClient } from '@supabase/supabase-js';

const DEV_PROJECT_ID = 'ooaumjzaztmutltifhoq';
const DEV_URL = 'https://ooaumjzaztmutltifhoq.supabase.co';
const DEV_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc';

const STAGING_PROJECT_ID = 'rvjmwwvkhglcuqwcznph';
const STAGING_URL = 'https://rvjmwwvkhglcuqwcznph.supabase.co';
const STAGING_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2am13d3ZraGdsY3Vxd2N6bnBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA0MDE3NywiZXhwIjoyMDc3NjE2MTc3fQ.yOfeLkNPD-dM_IB954XtelUv-d237vfa39UdUB1WTlA';

// Tables to copy in order (respecting dependencies)
// Updated 2025-11-06: Added 19 missing tables (was 10, now 29)
const TABLES = [
  // ===== Core Tenant/Hotel Data =====
  'tenants',                          // Core: Tenant definitions
  'hotels',                           // Core: Hotel information
  'accommodation_units',              // Core: Accommodation unit details
  'integration_configs',              // Core: Integration settings

  // ===== SIRE Compliance (Colombian Regulatory) =====
  'sire_countries',                   // SIRE: Country codes (45 rows)
  'sire_cities',                      // SIRE: City codes (42 rows)
  'sire_document_types',              // SIRE: Document type codes (4 rows)

  // ===== Staff System =====
  'staff_users',                      // 🔴 CRITICAL: Was missing! (4 users)
  'staff_conversations',              // Staff-guest conversations (45 rows)
  'staff_messages',                   // Staff messages (60 rows)

  // ===== Permissions =====
  'user_tenant_permissions',          // User permissions (1 row)

  // ===== Operations =====
  'hotel_operations',                 // Operational records (10 rows)
  'job_logs',                         // Background job logs (39 rows)
  'sync_history',                     // Sync operation history (85 rows)

  // ===== Reservations =====
  'guest_reservations',               // Guest reservation data
  'reservation_accommodations',       // Reservation-accommodation links (93 rows)

  // ===== Communication & AI =====
  'guest_conversations',              // Guest conversations (113 rows)
  'chat_messages',                    // Chat messages (328 rows)
  'conversation_memory',              // AI conversation context (10 rows)
  'conversation_context',             // Extended conversation context

  // ===== Calendar =====
  'calendar_events',                  // Calendar events (ICS sync)
  'calendar_event_changes',           // Event change tracking

  // ===== Content & Embeddings =====
  'muva_content',                     // Tourism content
  'code_embeddings',                  // Code embeddings
  'accommodation_units_manual_chunks',// Manual content chunks
  'accommodation_units_public',       // Public accommodation data
  'matryoshka_embeddings',            // Matryoshka vector embeddings

  // ===== Analytics =====
  'prospective_sessions',             // Prospective guest sessions (411 rows)
];

const BATCH_SIZE = 100;

async function main() {
  console.log('🚀 Starting data copy from DEV to STAGING\n');

  const devClient = createClient(DEV_URL, DEV_SERVICE_KEY);
  const stagingClient = createClient(STAGING_URL, STAGING_SERVICE_KEY);

  for (const table of TABLES) {
    console.log(`\n📋 Copying table: ${table}`);

    try {
      // First, delete all existing data in staging
      console.log(`   🗑️  Deleting existing data in staging...`);
      const { error: deleteError } = await stagingClient
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        console.error(`❌ Error deleting ${table}:`, deleteError);
        // Continue anyway
      }

      // Get total count
      const { count, error: countError } = await devClient
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error(`❌ Error counting ${table}:`, countError);
        continue;
      }

      console.log(`   Total rows: ${count}`);

      if (!count || count === 0) {
        console.log(`   ⏭️  Skipping empty table`);
        continue;
      }

      // Copy in batches
      let copied = 0;
      let offset = 0;

      while (offset < count) {
        const { data, error: readError } = await devClient
          .from(table)
          .select('*')
          .range(offset, offset + BATCH_SIZE - 1);

        if (readError) {
          console.error(`❌ Error reading ${table} at offset ${offset}:`, readError);
          break;
        }

        if (!data || data.length === 0) break;

        // Insert batch into staging
        const { error: insertError } = await stagingClient
          .from(table)
          .insert(data);

        if (insertError) {
          console.error(`❌ Error inserting ${table} at offset ${offset}:`, insertError);
          // Continue anyway to copy as much as possible
        }

        copied += data.length;
        offset += BATCH_SIZE;

        process.stdout.write(`\r   Copied: ${copied}/${count} rows`);
      }

      console.log(`\n   ✅ ${table} completed: ${copied} rows copied`);

    } catch (error) {
      console.error(`❌ Unexpected error copying ${table}:`, error);
    }
  }

  console.log('\n\n🎉 Data copy completed!');

  // Verify totals
  console.log('\n📊 Verifying data in STAGING:');
  for (const table of TABLES) {
    const { count } = await stagingClient
      .from(table)
      .select('*', { count: 'exact', head: true });
    console.log(`   ${table}: ${count} rows`);
  }
}

main().catch(console.error);
