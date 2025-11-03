#!/usr/bin/env tsx
/**
 * Copy the 4 remaining tables with special handling
 */

import { createClient } from '@supabase/supabase-js';

const DEV_URL = 'https://ooaumjzaztmutltifhoq.supabase.co';
const DEV_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc';

const STAGING_URL = 'https://rvjmwwvkhglcuqwcznph.supabase.co';
const STAGING_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2am13d3ZraGdsY3Vxd2N6bnBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA0MDE3NywiZXhwIjoyMDc3NjE2MTc3fQ.yOfeLkNPD-dM_IB954XtelUv-d237vfa39UdUB1WTlA';

const devClient = createClient(DEV_URL, DEV_SERVICE_KEY);
const stagingClient = createClient(STAGING_URL, STAGING_SERVICE_KEY);

async function copyTableDirect(tableName: string, pkField: string = 'id') {
  console.log(`\n📋 Copying ${tableName} (PK: ${pkField})`);

  // Truncate using SQL for tables without 'id' field
  if (pkField !== 'id') {
    console.log(`   🗑️  Truncating via RPC...`);
    const { error: truncError } = await stagingClient.rpc('execute_sql' as any, {
      query: `TRUNCATE TABLE ${tableName} CASCADE;`
    } as any);

    if (truncError) console.log(`   ⚠️  Truncate warning:`, truncError.message);
  }

  const { count } = await devClient
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  console.log(`   Total: ${count} rows`);

  if (!count) {
    console.log(`   ⏭️  Empty table, skipping`);
    return;
  }

  let copied = 0;
  const BATCH = 50;

  for (let offset = 0; offset < count; offset += BATCH) {
    const { data, error: readErr } = await devClient
      .from(tableName)
      .select('*')
      .range(offset, offset + BATCH - 1);

    if (readErr || !data) {
      console.error(`   ❌ Read error:`, readErr?.message);
      break;
    }

    // Clean data: remove generated columns for guest_reservations
    let cleanData = data;
    if (tableName === 'guest_reservations') {
      cleanData = data.map((row: any) => {
        const { accommodation_unit_id_key, ...rest } = row;
        return rest;
      });
    }

    const { error: insertErr } = await stagingClient
      .from(tableName)
      .upsert(cleanData, { onConflict: pkField });

    if (insertErr) {
      console.error(`   ❌ Insert error at ${offset}:`, insertErr.message);
    } else {
      copied += data.length;
    }

    process.stdout.write(`\r   Copied: ${copied}/${count}`);
  }

  // Verify
  const { count: verifyCount } = await stagingClient
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  console.log(`\n   ✅ Verified: ${verifyCount} rows in staging`);
}

async function main() {
  console.log('🚀 Copying 4 remaining tables\n');

  try {
    await copyTableDirect('prospective_sessions', 'session_id');
    await copyTableDirect('accommodation_units_public', 'unit_id');
    await copyTableDirect('guest_reservations', 'id');
    await copyTableDirect('chat_messages', 'id');

    console.log('\n\n🎉 All tables copied!');

    // Final summary
    console.log('\n📊 Final counts in STAGING:');
    for (const [table, pk] of [
      ['prospective_sessions', 'session_id'],
      ['accommodation_units_public', 'unit_id'],
      ['guest_reservations', 'id'],
      ['chat_messages', 'id']
    ]) {
      const { count } = await stagingClient
        .from(table)
        .select('*', { count: 'exact', head: true });
      console.log(`   ${table}: ${count} rows`);
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
