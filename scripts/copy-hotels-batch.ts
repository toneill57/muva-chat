#!/usr/bin/env tsx
/**
 * Copy hotels.accommodation_units in batches (excluding embeddings initially)
 */

import { createClient } from '@supabase/supabase-js';

const PROD = 'ooaumjzaztmutltifhoq';
const STAGING = 'qlvkgniqcoisbnwwjfte';

const prodClient = createClient(`https://${PROD}.supabase.co`, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stagingClient = createClient(`https://${STAGING}.supabase.co`, process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY!);

// All columns except embeddings
const COLUMNS = `
  id, tenant_id, hotel_id, accommodation_type_id, name, unit_number,
  description, short_description, capacity, bed_configuration,
  size_m2, floor_number, view_type, images, motopress_type_id, motopress_unit_id,
  full_description, tourism_features, booking_policies,
  unique_features, accessibility_features, location_details,
  status, is_featured, display_order, created_at, updated_at,
  base_price_low_season, base_price_high_season, price_per_person_low, price_per_person_high,
  amenities_list, unit_amenities, unit_type, accommodation_mphb_type, tags, subcategory
`.trim().replace(/\s+/g, ' ');

async function main() {
  console.log('🚀 Copying hotels.accommodation_units (without embeddings)');

  // Fetch from production in batches
  let offset = 0;
  const limit = 10;
  let totalCopied = 0;

  while (true) {
    console.log(`\n📦 Fetching batch ${offset}-${offset + limit}...`);

    const query = `
      SELECT ${COLUMNS}
      FROM hotels.accommodation_units
      ORDER BY created_at
      LIMIT ${limit} OFFSET ${offset}
    `;

    const { data: prodData, error: readError } = await prodClient
      .from('accommodation_units')
      .select(COLUMNS)
      .order('created_at')
      .range(offset, offset + limit - 1);

    if (readError) {
      console.error('❌ Read error:', readError);
      break;
    }

    if (!prodData || prodData.length === 0) {
      console.log('✅ No more data');
      break;
    }

    console.log(`  📊 Found ${prodData.length} rows`);

    // Insert into staging
    const { error: writeError } = await stagingClient
      .from('accommodation_units')
      .insert(prodData);

    if (writeError) {
      console.error('❌ Write error:', writeError);
      // Try one by one
      for (const row of prodData) {
        const { error: singleError } = await stagingClient
          .from('accommodation_units')
          .insert([row]);
        
        if (singleError) {
          console.error(`  ❌ Failed to insert ${row.id}:`, singleError.message);
        } else {
          totalCopied++;
          console.log(`  ✅ Inserted ${row.name}`);
        }
      }
    } else {
      totalCopied += prodData.length;
      console.log(`  ✅ Batch inserted`);
    }

    offset += limit;
    
    if (prodData.length < limit) {
      break;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Total copied: ${totalCopied} units`);
  console.log('\n📝 Note: Embeddings not copied (too large). Copy separately if needed.');
}

main().catch(console.error);
