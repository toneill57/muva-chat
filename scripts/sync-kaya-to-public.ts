#!/usr/bin/env npx tsx
/**
 * Sync Kaya data from hotels.accommodation_units to accommodation_units_public
 *
 * Updates the existing record in accommodation_units_public with all extracted
 * fields from the latest Kaya record in hotels.accommodation_units
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const LATEST_KAYA_HOTELS_ID = '23b75dc4-6d28-4fe2-a4d4-b756e601b90c';
const KAYA_PUBLIC_ID = 'b00f82aa-c471-41b2-814a-5dfc2078de74';

async function syncKayaToPublic() {
  console.log('🔄 Syncing Kaya from hotels.accommodation_units to accommodation_units_public\n');

  // STEP 1: Get data from hotels.accommodation_units
  console.log('📊 Fetching data from hotels.accommodation_units...');
  const { data: hotelsData, error: queryError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        view_type, floor_number, capacity, bed_configuration, size_m2,
        unit_amenities, unique_features, accessibility_features,
        images, location_details, tourism_features, booking_policies,
        status, is_featured, display_order
      FROM hotels.accommodation_units
      WHERE id = '${LATEST_KAYA_HOTELS_ID}'
    `
  });

  if (queryError || !hotelsData || hotelsData.length === 0) {
    console.error('❌ Error fetching from hotels:', queryError);
    process.exit(1);
  }

  const sourceData = hotelsData[0];
  console.log('✅ Fetched source data\n');

  // STEP 2: Build metadata object
  console.log('📦 Building metadata object...');
  const metadata = {
    status: sourceData.status || 'active',
    capacity: sourceData.capacity?.max_capacity || sourceData.capacity || 2,
    view_type: sourceData.view_type,
    floor_number: sourceData.floor_number,
    bed_configuration: sourceData.bed_configuration,
    size_m2: sourceData.size_m2,
    unit_amenities: sourceData.unit_amenities,
    unique_features: sourceData.unique_features,
    accessibility_features: sourceData.accessibility_features,
    location_details: sourceData.location_details,
    tourism_features: sourceData.tourism_features,
    booking_policies: sourceData.booking_policies,
    is_featured: sourceData.is_featured,
    display_order: sourceData.display_order,
  };

  // Remove null/undefined fields
  Object.keys(metadata).forEach(key => {
    if (metadata[key as keyof typeof metadata] === null || metadata[key as keyof typeof metadata] === undefined) {
      delete metadata[key as keyof typeof metadata];
    }
  });

  console.log('✅ Metadata object built with', Object.keys(metadata).length, 'fields\n');

  // STEP 3: Update accommodation_units_public
  console.log('💾 Updating accommodation_units_public...');
  const { error: updateError } = await supabase
    .from('accommodation_units_public')
    .update({
      metadata: metadata,
      // Also update photos if images available
      photos: sourceData.images || null
    })
    .eq('unit_id', KAYA_PUBLIC_ID);

  if (updateError) {
    console.error('❌ Error updating public table:', updateError);
    process.exit(1);
  }

  console.log('✅ Successfully updated accommodation_units_public!\n');

  // STEP 4: Verify
  console.log('🔍 Verifying update...');
  const { data: verifyData, error: verifyError } = await supabase
    .from('accommodation_units_public')
    .select('metadata')
    .eq('unit_id', KAYA_PUBLIC_ID)
    .single();

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError);
  } else {
    console.log('\n📊 Updated metadata fields:');
    Object.keys(verifyData.metadata).forEach(key => {
      console.log(`   ✅ ${key}`);
    });
    console.log(`\n✨ Total: ${Object.keys(verifyData.metadata).length} fields synced`);
  }
}

syncKayaToPublic().catch(console.error);
