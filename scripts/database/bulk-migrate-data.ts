#!/usr/bin/env tsx
/**
 * FASE 2 - Bulk Data Migration using Supabase Client
 * Migrates all data from source to dev and tst environments
 */

import { createClient } from '@supabase/supabase-js';

const PROJECTS = {
  source: {
    id: 'hoaiwcueleiemeplrurv',
    url: 'https://hoaiwcueleiemeplrurv.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvYWl3Y3VlbGVpZW1lcGxydXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ3ODMxNiwiZXhwIjoyMDc4MDU0MzE2fQ.ddsf2Jl8--jbN05avrNjxLr4335VGTX-Xg3RQvH6IE4'
  },
  dev: {
    id: 'azytxnyiizldljxrapoe',
    url: 'https://azytxnyiizldljxrapoe.supabase.co',
    key: process.env.DEV_SERVICE_KEY || ''
  },
  tst: {
    id: 'bddcvjoeoiekzfetvxoe',
    url: 'https://bddcvjoeoiekzfetvxoe.supabase.co',
    key: process.env.TST_SERVICE_KEY || ''
  }
};

// Tables to migrate (public schema only for now)
const TABLES = [
  'hotels',
  'integration_configs',
  'sync_history',
  'staff_users',
  'staff_conversations',
  'staff_messages',
  'guest_conversations',
  'chat_messages',
  'prospective_sessions',
  'accommodation_manuals',
  'accommodation_manual_analytics',
  'accommodation_units_public',
  'accommodation_units_manual_chunks',
  'reservation_accommodations',
  'guest_reservations'
];

async function migrateTable(
  sourceClient: any,
  targetClient: any,
  tableName: string,
  targetEnv: string
): Promise<{ table: string; source: number; target: number }> {
  console.log(`\n📦 Migrating ${tableName} to ${targetEnv}...`);
  
  // Fetch all data from source
  const { data: sourceData, error: fetchError } = await sourceClient
    .from(tableName)
    .select('*');
  
  if (fetchError) {
    console.log(`  ⚠️  Fetch error: ${fetchError.message}`);
    return { table: tableName, source: 0, target: 0 };
  }
  
  if (!sourceData || sourceData.length === 0) {
    console.log(`  ⏭️  No data to migrate`);
    return { table: tableName, source: 0, target: 0 };
  }
  
  console.log(`  📊 Source: ${sourceData.length} records`);
  
  // Insert into target (upsert to handle duplicates)
  const { data: insertedData, error: insertError } = await targetClient
    .from(tableName)
    .upsert(sourceData, { onConflict: 'id', ignoreDuplicates: false });
  
  if (insertError) {
    console.log(`  ❌ Insert error: ${insertError.message}`);
    return { table: tableName, source: sourceData.length, target: 0 };
  }
  
  // Verify count
  const { count: targetCount } = await targetClient
    .from(tableName)
    .select('*', { count: 'exact', head: true });
  
  console.log(`  📊 Target: ${targetCount} records`);
  console.log(`  ✅ Success`);
  
  return { table: tableName, source: sourceData.length, target: targetCount || 0 };
}

async function main() {
  console.log('🚀 FASE 2 - Bulk Data Migration\n');
  
  // Get service keys from env
  if (!PROJECTS.dev.key || !PROJECTS.tst.key) {
    console.error('❌ Missing DEV_SERVICE_KEY or TST_SERVICE_KEY environment variables');
    console.log('\nPlease set:');
    console.log('  export DEV_SERVICE_KEY=<dev-service-role-key>');
    console.log('  export TST_SERVICE_KEY=<tst-service-role-key>');
    process.exit(1);
  }
  
  // Create clients
  const sourceClient = createClient(PROJECTS.source.url, PROJECTS.source.key);
  const devClient = createClient(PROJECTS.dev.url, PROJECTS.dev.key);
  const tstClient = createClient(PROJECTS.tst.url, PROJECTS.tst.key);
  
  // Migrate to DEV
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 MIGRATING TO DEV');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const devResults = [];
  for (const table of TABLES) {
    const result = await migrateTable(sourceClient, devClient, table, 'DEV');
    devResults.push(result);
  }
  
  // Migrate to TST
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 MIGRATING TO TST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const tstResults = [];
  for (const table of TABLES) {
    const result = await migrateTable(sourceClient, tstClient, table, 'TST');
    tstResults.push(result);
  }
  
  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 MIGRATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const devTotal = devResults.reduce((acc, r) => acc + r.source, 0);
  const devTargetTotal = devResults.reduce((acc, r) => acc + r.target, 0);
  const tstTotal = tstResults.reduce((acc, r) => acc + r.source, 0);
  const tstTargetTotal = tstResults.reduce((acc, r) => acc + r.target, 0);
  
  console.log(`DEV: ${devTargetTotal}/${devTotal} records (${devTotal > 0 ? ((devTargetTotal/devTotal)*100).toFixed(1) : 0}%)`);
  console.log(`TST: ${tstTargetTotal}/${tstTotal} records (${tstTotal > 0 ? ((tstTargetTotal/tstTotal)*100).toFixed(1) : 0}%)`);
  
  console.log('\n✅ FASE 2 COMPLETE\n');
}

main().catch(console.error);
