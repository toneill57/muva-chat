#!/usr/bin/env tsx
/**
 * Copy all 20 remaining tables (479 rows)
 */

import { createClient } from '@supabase/supabase-js';

const DEV_URL = 'https://ooaumjzaztmutltifhoq.supabase.co';
const DEV_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc';

const STAGING_URL = 'https://rvjmwwvkhglcuqwcznph.supabase.co';
const STAGING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2am13d3ZraGdsY3Vxd2N6bnBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA0MDE3NywiZXhwIjoyMDc3NjE2MTc3fQ.yOfeLkNPD-dM_IB954XtelUv-d237vfa39UdUB1WTlA';

const dev = createClient(DEV_URL, DEV_KEY);
const staging = createClient(STAGING_URL, STAGING_KEY);

// 20 remaining tables
const TABLES = [
  'calendar_events',
  'staff_messages',
  'sire_countries',
  'staff_conversations',
  'sire_cities',
  'job_logs',
  'hotel_operations',
  'conversation_memory',
  'ics_feed_configurations',
  'sire_content',
  'accommodation_units_manual',
  'staff_users',
  'sire_document_types',
  'integration_configs',
  'hotels',
  'tenant_registry',
  'accommodation_units',
  'chat_conversations',
  'property_relationships',
  'user_tenant_permissions',
];

async function copyTable(table: string) {
  console.log(`\n📋 ${table}`);

  const { count } = await dev.from(table).select('*', { count: 'exact', head: true });

  if (!count) {
    console.log(`   ⏭️  Empty, skipping`);
    return 0;
  }

  console.log(`   Total: ${count} rows`);

  // Truncate first using RPC
  const { error: truncErr } = await staging.rpc('execute_sql' as any, {
    query: `TRUNCATE TABLE ${table} CASCADE;`
  } as any);

  if (truncErr) console.log(`   ⚠️  Truncate: ${truncErr.message}`);

  let copied = 0;
  const BATCH = 100;

  for (let offset = 0; offset < count; offset += BATCH) {
    const { data, error: readErr } = await dev
      .from(table)
      .select('*')
      .range(offset, offset + BATCH - 1);

    if (readErr || !data?.length) break;

    const { error: insertErr } = await staging.from(table).insert(data);

    if (insertErr) {
      console.error(`   ❌ Error at ${offset}:`, insertErr.message);
    } else {
      copied += data.length;
    }
  }

  console.log(`   ✅ ${copied} rows copied`);
  return copied;
}

async function main() {
  console.log('🚀 Copying 20 remaining tables (479 rows)\n');

  let totalCopied = 0;

  for (const table of TABLES) {
    try {
      totalCopied += await copyTable(table);
    } catch (err: any) {
      console.error(`\n❌ Failed on ${table}:`, err.message);
    }
  }

  console.log(`\n\n🎉 Done! Total copied: ${totalCopied} rows`);

  // Final verification
  const { data: devTotal } = await dev.rpc('execute_sql' as any, {
    query: "SELECT SUM(n_live_tup) as total FROM pg_stat_user_tables WHERE schemaname = 'public'"
  } as any);

  const { data: stagingTotal } = await staging.rpc('execute_sql' as any, {
    query: "SELECT SUM(n_live_tup) as total FROM pg_stat_user_tables WHERE schemaname = 'public'"
  } as any);

  console.log('\n📊 Final totals:');
  console.log(`   DEV: ${devTotal?.[0]?.total || 'N/A'} rows`);
  console.log(`   STAGING: ${stagingTotal?.[0]?.total || 'N/A'} rows`);
}

main();
