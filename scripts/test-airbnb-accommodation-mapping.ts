#!/usr/bin/env tsx
/**
 * Test script to debug why Airbnb reservations show "Unknown Property"
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testAccommodationMapping() {
  const tenantId = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'; // Simmerdown

  console.log('=== Testing Airbnb Accommodation Mapping ===\n');

  // Step 1: Get Airbnb reservations
  const { data: reservations, error: resError } = await supabase
    .from('guest_reservations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('booking_source', 'airbnb')
    .eq('phone_last_4', '7498')
    .single();

  if (resError) {
    console.error('Error fetching reservation:', resError);
    return;
  }

  console.log('1. Found reservation:', {
    id: reservations.id,
    guest_name: reservations.guest_name,
    phone_last_4: reservations.phone_last_4,
    accommodation_unit_id: reservations.accommodation_unit_id,
  });

  // Step 2: Get reservation_accommodations
  const { data: resAccommodations, error: raError } = await supabase
    .from('reservation_accommodations')
    .select('*')
    .eq('reservation_id', reservations.id);

  if (raError) {
    console.error('Error fetching reservation_accommodations:', raError);
    return;
  }

  console.log('\n2. Found reservation_accommodations:', resAccommodations);

  // Step 3: Extract unique accommodation_unit_ids
  const accommodationUnitIds = [...new Set(
    resAccommodations
      .map((acc: any) => acc.accommodation_unit_id)
      .filter(Boolean)
  )];

  console.log('\n3. Unique accommodation_unit_ids:', accommodationUnitIds);

  // Step 4: Call RPC function
  if (accommodationUnitIds.length > 0) {
    console.log('\n4. Calling RPC get_accommodation_units_by_ids...');

    const { data: unitsData, error: unitsError } = await supabase.rpc(
      'get_accommodation_units_by_ids',
      { p_unit_ids: accommodationUnitIds }
    );

    if (unitsError) {
      console.error('RPC Error:', unitsError);
      return;
    }

    console.log('   RPC returned:', unitsData);

    // Step 5: Create map
    const accommodationUnitsMap = new Map<string, any>();

    if (unitsData) {
      unitsData.forEach((unit: any) => {
        accommodationUnitsMap.set(unit.id, {
          id: unit.id,
          name: unit.name,
          unit_number: unit.unit_number,
          unit_type: unit.unit_type,
        });
      });
    }

    console.log('\n5. Map created with', accommodationUnitsMap.size, 'units');
    console.log('   Map contents:', Array.from(accommodationUnitsMap.entries()));

    // Step 6: Map reservation_accommodations
    const mappedAccommodations = resAccommodations.map((acc: any) => ({
      id: acc.id,
      motopress_accommodation_id: acc.motopress_accommodation_id,
      motopress_type_id: acc.motopress_type_id,
      room_rate: acc.room_rate,
      accommodation_unit: acc.accommodation_unit_id
        ? accommodationUnitsMap.get(acc.accommodation_unit_id) || null
        : null
    }));

    console.log('\n6. Final mapped accommodations:', mappedAccommodations);

    // Step 7: Check final result
    const hasAccommodationName = mappedAccommodations.some((acc: any) =>
      acc.accommodation_unit && acc.accommodation_unit.name
    );

    if (hasAccommodationName) {
      console.log('\n✅ SUCCESS: Accommodation name found!');
      console.log('   Name:', mappedAccommodations[0]?.accommodation_unit?.name);
    } else {
      console.log('\n❌ PROBLEM: No accommodation name found');
      console.log('   This is why "Unknown Property" is shown');
    }
  }
}

// Run the test
testAccommodationMapping()
  .then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });