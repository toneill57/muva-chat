#!/usr/bin/env tsx
/**
 * Copy all data from DEV branch to STAGING branch
 * Using Supabase MCP tools with batch processing
 */

import { createClient } from '@supabase/supabase-js';

const DEV_PROJECT_ID = 'ooaumjzaztmutltifhoq';
const DEV_URL = 'https://ooaumjzaztmutltifhoq.supabase.co';
const DEV_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc';

const STAGING_PROJECT_ID = 'rvjmwwvkhglcuqwcznph';
const STAGING_URL = 'https://rvjmwwvkhglcuqwcznph.supabase.co';
const STAGING_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2am13d3ZraGdsY3Vxd2N6bnBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA0MDE3NywiZXhwIjoyMDc3NjE2MTc3fQ.yOfeLkNPD-dM_IB954XtelUv-d237vfa39UdUB1WTlA';

// Tables to copy in order (respecting dependencies)
const TABLES = [
  'code_embeddings',
  'muva_content',
  'prospective_sessions',
  'chat_messages',
  'accommodation_units_manual_chunks',
  'accommodation_units_public',
  'guest_conversations',
  'guest_reservations',
  'reservation_accommodations',
  'sync_history',
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
