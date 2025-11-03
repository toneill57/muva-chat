#!/usr/bin/env tsx
/**
 * Copy hotels.accommodation_units using direct SQL
 */

import { createClient } from '@supabase/supabase-js';

const PROD = 'ooaumjzaztmutltifhoq';
const STAGING = 'qlvkgniqcoisbnwwjfte';

const prodClient = createClient(`https://${PROD}.supabase.co`, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stagingClient = createClient(`https://${STAGING}.supabase.co`, process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY!);

async function main() {
  console.log('🚀 Copying hotels.accommodation_units');

  // Read from production using RPC (bypass schema limitation)
  const { data: prodData, error: readError } = await prodClient.rpc('exec_sql', {
    query: 'SELECT * FROM hotels.accommodation_units ORDER BY created_at'
  });

  if (readError) {
    console.error('❌ Read error:', readError);
    process.exit(1);
  }

  console.log(`📊 Found ${prodData.length} rows in production`);

  // Check staging
  const { data: stagingData, error: countError } = await stagingClient.rpc('exec_sql', {
    query: 'SELECT COUNT(*) as count FROM hotels.accommodation_units'
  });

  if (!countError && stagingData?.[0]?.count > 0) {
    console.log(`⏭️  Staging already has ${stagingData[0].count} rows`);
    return;
  }

  // Insert each row
  let copied = 0;
  for (const row of prodData) {
    // Build INSERT statement
    const columns = Object.keys(row).filter(k => row[k] !== undefined);
    const values = columns.map(k => {
      const val = row[k];
      if (val === null) return 'NULL';
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
      if (Array.isArray(val)) return `ARRAY[${val.map(v => `'${v}'`).join(',')}]`;
      return val;
    });

    const sql = `INSERT INTO hotels.accommodation_units (${columns.join(', ')}) VALUES (${values.join(', ')})`;

    const { error: insertError } = await stagingClient.rpc('exec_sql', { query: sql });
    
    if (insertError) {
      console.error(`❌ Insert error for row ${row.id}:`, insertError.message);
      continue;
    }

    copied++;
    if (copied % 5 === 0) {
      console.log(`  📦 Copied ${copied}/${prodData.length} rows...`);
    }
  }

  console.log(`✅ Copied ${copied} rows!`);
}

main().catch(console.error);
