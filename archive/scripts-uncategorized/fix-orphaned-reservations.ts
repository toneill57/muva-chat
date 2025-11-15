/**
 * Fix Orphaned Reservations - Phase 5 Critical Issue
 * 
 * Copies missing accommodation_units from production hotels.accommodation_units
 * to staging hotels.accommodation_units to resolve FK integrity violations.
 * 
 * Issue: 91/104 guest_reservations have orphaned accommodation_unit_id references
 * Root Cause: Missing 15 accommodation units in staging hotels schema
 * 
 * Date: 2025-10-31
 */

import { createClient } from '@supabase/supabase-js';

const PROD_URL = 'https://ooaumjzaztmutltifhoq.supabase.co';
const STAGING_URL = 'https://qlvkgniqcoisbnwwjfte.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const production = createClient(PROD_URL, SUPABASE_KEY);
const staging = createClient(STAGING_URL, SUPABASE_KEY);

// 15 missing IDs identified from production
const MISSING_IDS = [
  '662d4724-4126-5a80-8607-172fecddbf5e', // Haines Cay DOBLE
  '4b28c7fa-9a5f-5210-8821-91153467f353', // Serrana Cay DOBLE
  '1480ec8d-f2a4-5c33-9ae8-187dd4355024', // North Cay DOBLE
  'f739a9c4-e5f5-593e-bd85-b4cb94a74010', // Rose Cay APARTAMENTO
  '70824b56-e072-5d10-a712-577c1f71da52', // Johnny Cay TRIPLE
  '68c1980d-cd6f-5918-a862-b57dc97fb95e', // Haines Cay DÚPLEX
  '9f4b022a-882a-54ad-a521-691e5c5c3c59', // East Cay Cuádruple
  '9492af59-84a6-5626-857e-683c94717390', // Bailey Cay TRIPLE
  '27045009-b981-5d91-bffb-0ac65989edad', // Serrana Cay DÚPLEX
  '71bf7eb9-cb1f-5a2a-a665-5a9a1b85fb9e', // Rocky Cay TRIPLE
  '0683b66c-d7ad-51d0-8fd9-7099af81f75f', // South Cay DOBLE
  '506a9029-d188-5cad-a4fa-bd0f0df19b98', // Crab Cay DOBLE
  'ea5b3337-5a7b-56cc-96ab-18da0ba04e81', // West Cay TRIPLE
  'd5fb62d9-429f-53ab-b01c-abd534271ebf', // Queena Reef DÚPLEX
  '007fabb8-4373-4d8a-bbd0-d60eb42e862b', // Groovin'
];

async function main() {
  console.log('🔧 Fix Orphaned Reservations - Phase 5 Critical Issue\n');

  // Step 1: Verify orphan count before fix
  console.log('📊 Step 1: Checking orphaned reservations count (BEFORE)...');
  const { data: orphansBefore } = await staging.rpc('execute_sql', {
    query: `
      SELECT COUNT(*) as count
      FROM guest_reservations r
      LEFT JOIN hotels.accommodation_units u ON r.accommodation_unit_id = u.id
      WHERE r.accommodation_unit_id IS NOT NULL AND u.id IS NULL
    `,
  });
  console.log(`   Orphaned reservations: ${orphansBefore?.[0]?.count || 'ERROR'}\n`);

  // Step 2: Fetch missing accommodation units from production
  console.log('📥 Step 2: Fetching 15 missing accommodation units from production...');
  const { data: missingUnits, error: fetchError } = await production
    .from('accommodation_units')
    .select('*')
    .in('id', MISSING_IDS);

  if (fetchError || !missingUnits) {
    console.error('   ❌ Error fetching units:', fetchError);
    process.exit(1);
  }
  console.log(`   ✅ Fetched ${missingUnits.length} units\n`);

  // Step 3: Insert missing units into staging (with conflict handling)
  console.log('💾 Step 3: Inserting missing units into staging...');
  
  for (const unit of missingUnits) {
    const { error: insertError } = await staging
      .schema('hotels')
      .from('accommodation_units')
      .upsert(unit, { onConflict: 'id' });

    if (insertError) {
      console.error(`   ❌ Error inserting ${unit.name}:`, insertError.message);
    } else {
      console.log(`   ✅ Inserted: ${unit.name} (${unit.id})`);
    }
  }
  console.log('');

  // Step 4: Verify row count
  console.log('📊 Step 4: Verifying accommodation_units row count...');
  const { count: stagingCount } = await staging
    .schema('hotels')
    .from('accommodation_units')
    .select('*', { count: 'exact', head: true });
  console.log(`   Staging count: ${stagingCount} (expected: 26)\n`);

  // Step 5: Verify orphan count after fix
  console.log('📊 Step 5: Checking orphaned reservations count (AFTER)...');
  const { data: orphansAfter } = await staging.rpc('execute_sql', {
    query: `
      SELECT COUNT(*) as count
      FROM guest_reservations r
      LEFT JOIN hotels.accommodation_units u ON r.accommodation_unit_id = u.id
      WHERE r.accommodation_unit_id IS NOT NULL AND u.id IS NULL
    `,
  });
  console.log(`   Orphaned reservations: ${orphansAfter?.[0]?.count || 'ERROR'}\n`);

  // Step 6: Verify reservation_accommodations FK integrity
  console.log('📊 Step 6: Verifying reservation_accommodations FK integrity...');
  const { data: junctionOrphans } = await staging.rpc('execute_sql', {
    query: `
      SELECT COUNT(*) as count
      FROM reservation_accommodations ra
      LEFT JOIN hotels.accommodation_units u ON ra.accommodation_unit_id = u.id
      WHERE u.id IS NULL
    `,
  });
  console.log(`   Orphaned junction records: ${junctionOrphans?.[0]?.count || 'ERROR'}\n`);

  // Summary
  console.log('✅ Fix completed!');
  console.log('\n📋 Summary:');
  console.log(`   - Units inserted: ${missingUnits.length}`);
  console.log(`   - Staging total: ${stagingCount}/26`);
  console.log(`   - Orphaned reservations: ${orphansBefore?.[0]?.count} → ${orphansAfter?.[0]?.count}`);
  console.log(`   - Orphaned junction records: ${junctionOrphans?.[0]?.count}`);
  
  if (orphansAfter?.[0]?.count === 0 && junctionOrphans?.[0]?.count === 0) {
    console.log('\n✅ SUCCESS: All FK integrity issues resolved!');
  } else {
    console.log('\n⚠️  WARNING: Some orphaned references remain. Further investigation required.');
  }
}

main().catch(console.error);
