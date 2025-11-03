#!/usr/bin/env tsx
/**
 * Copy hotels.* schema tables from Production to Staging
 */

import { createClient } from '@supabase/supabase-js';

const PROD_PROJECT_ID = 'ooaumjzaztmutltifhoq';
const STAGING_PROJECT_ID = 'qlvkgniqcoisbnwwjfte';

const prodClient = createClient(
  `https://${PROD_PROJECT_ID}.supabase.co`,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const stagingClient = createClient(
  `https://${STAGING_PROJECT_ID}.supabase.co`,
  process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY!
);

async function copyHotelsTable(tableName: string) {
  console.log(`\n📋 hotels.${tableName}`);
  
  try {
    // Check existing count
    const { count: existingCount } = await stagingClient
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .schema('hotels');

    if (existingCount && existingCount > 0) {
      console.log(`  ⏭️  Skipping (already has ${existingCount} rows)`);
      return { table: tableName, copied: existingCount, skipped: true };
    }

    // Read from production
    const { data, error: readError } = await prodClient
      .from(tableName)
      .select('*')
      .schema('hotels');

    if (readError) throw readError;
    if (!data || data.length === 0) {
      console.log(`  ✅ 0 rows (empty in production)`);
      return { table: tableName, copied: 0, skipped: false };
    }

    // Write to staging
    const { error: writeError } = await stagingClient
      .from(tableName)
      .insert(data)
      .schema('hotels');

    if (writeError) throw writeError;

    console.log(`  ✅ ${data.length} rows copied`);
    return { table: tableName, copied: data.length, skipped: false };
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return { table: tableName, copied: 0, skipped: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Copying hotels.* schema tables');
  
  const tables = [
    'accommodation_types',
    'accommodation_units',
    'client_info',
    'content',
    'guest_information',
    'policies',
    'pricing_rules',
    'properties',
    'unit_amenities',
  ];

  let total = 0;
  let errors = 0;

  for (const table of tables) {
    const result = await copyHotelsTable(table);
    if (!result.error && !result.skipped) {
      total += result.copied;
    } else if (result.error) {
      errors++;
    }
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Total rows copied: ${total}`);
  console.log(`❌ Errors: ${errors}`);
}

main().catch(console.error);
