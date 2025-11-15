#!/usr/bin/env tsx
/**
 * Test script to verify Airbnb API returns accommodation names correctly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testAirbnbAPI() {
  const tenantId = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'; // Simmerdown

  console.log('=== Testing Airbnb API ===\n');

  // Step 1: Create a valid token
  const token = jwt.sign(
    {
      user_id: '755b12b8-6d51-4038-9f00-e55c14c826ee',
      role: 'staff',
      tenant_id: tenantId,
      username: 'zazpi',
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET!
  );

  console.log('1. Created valid JWT token for tenant:', tenantId);

  // Step 2: Call the API
  const apiUrl = 'http://localhost:3000/api/reservations/airbnb?future_only=false';

  console.log('\n2. Calling API:', apiUrl);

  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error('API Error:', response.status, response.statusText);
    const error = await response.text();
    console.error('Error details:', error);
    return;
  }

  const data = await response.json();

  console.log('\n3. API Response:');
  console.log('   Success:', data.success);
  console.log('   Total reservations:', data.reservations?.length || 0);

  // Step 3: Find the test reservation (phone ***-7498)
  const testReservation = data.reservations?.find((r: any) => r.phone_last_4 === '7498');

  if (testReservation) {
    console.log('\n4. Found test reservation with phone ***-7498:');
    console.log('   Guest name:', testReservation.guest_name);
    console.log('   Check-in:', testReservation.check_in_date);
    console.log('   Check-out:', testReservation.check_out_date);

    // Check property_name (backwards compatibility)
    console.log('\n5. Property name (backwards compatibility):');
    console.log('   property_name:', testReservation.property_name);

    // Check reservation_accommodations array (new format)
    console.log('\n6. Reservation accommodations (array format):');
    if (testReservation.reservation_accommodations && testReservation.reservation_accommodations.length > 0) {
      const accommodation = testReservation.reservation_accommodations[0];
      console.log('   Accommodation unit:', accommodation.accommodation_unit);

      if (accommodation.accommodation_unit) {
        console.log('\n✅ SUCCESS: Accommodation name found!');
        console.log('   Name:', accommodation.accommodation_unit.name);
        console.log('   Unit number:', accommodation.accommodation_unit.unit_number);
        console.log('   Unit type:', accommodation.accommodation_unit.unit_type);
      } else {
        console.log('\n❌ PROBLEM: accommodation_unit is null');
      }
    } else {
      console.log('\n❌ PROBLEM: No reservation_accommodations found');
    }
  } else {
    console.log('\n❌ Test reservation with phone ***-7498 not found');
    console.log('Available reservations:');
    data.reservations?.forEach((r: any, i: number) => {
      console.log(`   ${i + 1}. Guest: ${r.guest_name}, Phone: ***-${r.phone_last_4}`);
    });
  }
}

// Run the test
testAirbnbAPI()
  .then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });