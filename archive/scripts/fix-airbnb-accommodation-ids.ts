#!/usr/bin/env tsx
/**
 * Fix Airbnb Reservation Accommodation IDs
 *
 * This script updates existing Airbnb reservations to use the correct
 * accommodation_unit_id from accommodation_units_public instead of hotels.accommodation_units
 *
 * This ensures that guest chat can access embeddings and manuals properly.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'; // Simmerdown

async function fixAirbnbAccommodationIds() {
  console.log('=== Fixing Airbnb Reservation Accommodation IDs ===\n');

  try {
    // Step 1: Get all Airbnb reservations with their current accommodation IDs
    const { data: reservations, error: fetchError } = await supabase
      .from('guest_reservations')
      .select(`
        id,
        guest_name,
        accommodation_unit_id,
        check_in_date,
        check_out_date
      `)
      .eq('tenant_id', TENANT_ID)
      .eq('booking_source', 'airbnb');

    if (fetchError) {
      console.error('Error fetching reservations:', fetchError);
      return;
    }

    console.log(`Found ${reservations?.length || 0} Airbnb reservations\n`);

    if (!reservations || reservations.length === 0) {
      console.log('No Airbnb reservations to fix');
      return;
    }

    // Step 2: Get unique accommodation unit IDs
    const uniqueUnitIds = [...new Set(reservations.map(r => r.accommodation_unit_id))];
    console.log(`Unique unit IDs to map: ${uniqueUnitIds.length}\n`);

    // Step 3: Create mapping from hotels.accommodation_units to accommodation_units_public
    const idMapping = new Map<string, string>();

    for (const hotelUnitId of uniqueUnitIds) {
      // Get the name from hotels.accommodation_units
      const { data: hotelUnit, error: hotelError } = await supabase
        .from('hotels.accommodation_units')
        .select('name')
        .eq('id', hotelUnitId)
        .eq('tenant_id', TENANT_ID)
        .single();

      if (hotelError || !hotelUnit) {
        console.error(`Failed to get hotel unit name for ID ${hotelUnitId}:`, hotelError);
        continue;
      }

      // Find the corresponding unit in accommodation_units_public
      const { data: publicUnit, error: publicError } = await supabase
        .from('accommodation_units_public')
        .select('unit_id')
        .eq('tenant_id', TENANT_ID)
        .eq('metadata->original_accommodation', hotelUnit.name)
        .like('name', `${hotelUnit.name} - Overview`)
        .single();

      if (publicError || !publicUnit) {
        console.error(`Failed to find public unit for ${hotelUnit.name}:`, publicError);
        continue;
      }

      idMapping.set(hotelUnitId, publicUnit.unit_id);
      console.log(`Mapped: ${hotelUnit.name}`);
      console.log(`  Hotel ID: ${hotelUnitId}`);
      console.log(`  Public ID: ${publicUnit.unit_id}\n`);
    }

    console.log(`\nSuccessfully mapped ${idMapping.size} units\n`);

    // Step 4: Update reservations with the correct IDs
    let updateCount = 0;
    let errorCount = 0;

    for (const reservation of reservations) {
      const newId = idMapping.get(reservation.accommodation_unit_id);

      if (!newId) {
        console.warn(`No mapping found for reservation ${reservation.id} (${reservation.guest_name})`);
        errorCount++;
        continue;
      }

      // Update the reservation
      const { error: updateError } = await supabase
        .from('guest_reservations')
        .update({ accommodation_unit_id: newId })
        .eq('id', reservation.id);

      if (updateError) {
        console.error(`Failed to update reservation ${reservation.id}:`, updateError);
        errorCount++;
      } else {
        updateCount++;
        console.log(`✓ Updated: ${reservation.guest_name} (${reservation.check_in_date})`);
      }
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Total reservations: ${reservations.length}`);
    console.log(`Successfully updated: ${updateCount}`);
    console.log(`Errors: ${errorCount}`);

    // Step 5: Verify the fix by checking a sample
    if (updateCount > 0) {
      console.log('\n=== Verification ===');
      const { data: sample } = await supabase
        .from('guest_reservations')
        .select(`
          guest_name,
          accommodation_unit_id,
          check_in_date
        `)
        .eq('tenant_id', TENANT_ID)
        .eq('booking_source', 'airbnb')
        .limit(3);

      if (sample) {
        console.log('\nSample of updated reservations:');
        sample.forEach(r => {
          const isPublicId = !uniqueUnitIds.includes(r.accommodation_unit_id);
          console.log(`- ${r.guest_name}: ${r.accommodation_unit_id} (${isPublicId ? 'Public ID ✓' : 'Hotel ID ✗'})`);
        });
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the fix
fixAirbnbAccommodationIds()
  .then(() => {
    console.log('\n=== Fix Complete ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });