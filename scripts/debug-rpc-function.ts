/**
 * Debug RPC Function - Test get_sire_guest_data
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/debug-rpc-function.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testRPC() {
  console.log('🔍 Testing get_sire_guest_data RPC function\n');

  const reservationId = '186a52ff-e128-4cf0-8f5d-874c3a0fdf92';
  console.log(`Reservation ID: ${reservationId}\n`);

  try {
    const { data, error } = await supabase.rpc('get_sire_guest_data', {
      p_reservation_id: reservationId
    });

    if (error) {
      console.error('❌ RPC Error:', error);
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No data returned (reservation may not exist)');
      return;
    }

    console.log('✅ RPC Success!\n');
    console.log('Data:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testRPC();
