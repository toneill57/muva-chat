#!/usr/bin/env tsx
/**
 * Copy data from production to staging using MCP execute_sql
 * This is the ONLY method that actually works with Supabase branches
 */

import { createClient } from '@supabase/supabase-js';

const PROD_ID = 'ooaumjzaztmutltifhoq';
const STAGING_ID = 'gkqfbrhtlipcvpqyyqmx';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9vcSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3Mjc1NjQxMjAsImV4cCI6MjA0MzE0MDEyMH0.RDXTHM59GUjWJ_pD4U0bTYoW2FjOe8m_gIvAb5VXFG0';
const STAGING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrcWZicmh0bGlwY3ZwcXl5cW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAyMzQyMCwiZXhwIjoyMDc3NTk5NDIwfQ.PNUXebVyEDcofBZqzZkGs06fy9NrJXujdewBwq2CqM0';

const prodClient = createClient(`https://${PROD_ID}.supabase.co`, PROD_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const stagingClient = createClient(`https://${STAGING_ID}.supabase.co`, STAGING_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const TABLES = [
  { name: 'muva_content', limit: 1000 },
  { name: 'sire_content', limit: 100 },
  { name: 'hotels', limit: 100 },
  { name: 'staff_users', limit: 100 },
  { name: 'accommodation_units', limit: 500 },
  { name: 'accommodation_units_public', limit: 500 },
  { name: 'guest_reservations', limit: 100 },
];

async function copyTable(tableName: string, limit: number) {
  console.log(`\n📋 Copying ${tableName}...`);

  // Get data from production
  const { data, error } = await prodClient
    .from(tableName)
    .select('*')
    .limit(limit);

  if (error) {
    console.error(`❌ Error reading ${tableName}:`, error.message);
    return false;
  }

  if (!data || data.length === 0) {
    console.log(`⚠️  No data in ${tableName}`);
    return true;
  }

  console.log(`  Found ${data.length} rows`);

  // Insert into staging (upsert to avoid conflicts)
  const { error: insertError } = await stagingClient
    .from(tableName)
    .upsert(data, { onConflict: 'id' });

  if (insertError) {
    console.error(`❌ Error inserting into ${tableName}:`, insertError.message);
    return false;
  }

  console.log(`✅ Copied ${data.length} rows to ${tableName}`);
  return true;
}

async function main() {
  console.log('🚀 Starting table copy via MCP');
  console.log(`📍 From: ${PROD_ID} → To: ${STAGING_ID}\n`);

  let success = 0;
  let failed = 0;

  for (const table of TABLES) {
    const result = await copyTable(table.name, table.limit);
    if (result) success++;
    else failed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Success: ${success}/${TABLES.length}`);
  console.log(`❌ Failed: ${failed}/${TABLES.length}`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
