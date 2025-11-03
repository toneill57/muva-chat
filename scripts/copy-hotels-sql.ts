#!/usr/bin/env tsx
/**
 * Copy hotels.accommodation_units using raw SQL via REST API
 */

const PROD = 'ooaumjzaztmutltifhoq';
const STAGING = 'qlvkgniqcoisbnwwjfte';

const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STAGING_KEY = process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY!;

async function executeSql(projectId: string, key: string, sql: string) {
  const response = await fetch(`https://${projectId}.supabase.co/rest/v1/rpc/exec_sql_raw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }

  return await response.json();
}

async function main() {
  console.log('🚀 Copying hotels.accommodation_units via SQL dump');

  try {
    // Step 1: Get data from production (without embeddings to save bandwidth)
    console.log('\n📥 Fetching from production...');
    const prodData = await executeSql(PROD, PROD_KEY, `
      SELECT 
        id, tenant_id, hotel_id, accommodation_type_id, name, unit_number,
        description, short_description, capacity::text as capacity, 
        bed_configuration::text as bed_configuration,
        size_m2, floor_number, view_type, images::text as images, 
        motopress_type_id, motopress_unit_id,
        full_description, tourism_features, booking_policies,
        unique_features::text as unique_features, 
        accessibility_features::text as accessibility_features, 
        location_details::text as location_details,
        status, is_featured, display_order, created_at, updated_at,
        base_price_low_season, base_price_high_season, 
        price_per_person_low, price_per_person_high,
        amenities_list::text as amenities_list, unit_amenities, unit_type, 
        accommodation_mphb_type, tags, subcategory
      FROM hotels.accommodation_units
      ORDER BY created_at
    `);

    console.log(`  ✅ Got ${prodData.length} rows`);

    // Step 2: Insert into staging one by one
    console.log('\n📤 Inserting into staging...');
    let copied = 0;

    for (const row of prodData) {
      // Build INSERT statement
      const insertSql = `
        INSERT INTO hotels.accommodation_units (
          id, tenant_id, hotel_id, accommodation_type_id, name, unit_number,
          description, short_description, capacity, bed_configuration,
          size_m2, floor_number, view_type, images,
          motopress_type_id, motopress_unit_id,
          full_description, tourism_features, booking_policies,
          unique_features, accessibility_features, location_details,
          status, is_featured, display_order, created_at, updated_at,
          base_price_low_season, base_price_high_season,
          price_per_person_low, price_per_person_high,
          amenities_list, unit_amenities, unit_type,
          accommodation_mphb_type, tags, subcategory
        ) VALUES (
          '${row.id}'::uuid,
          '${row.tenant_id}',
          ${row.hotel_id ? `'${row.hotel_id}'::uuid` : 'NULL'},
          ${row.accommodation_type_id ? `'${row.accommodation_type_id}'::uuid` : 'NULL'},
          ${row.name ? `'${row.name.replace(/'/g, "''")}'` : 'NULL'},
          ${row.unit_number ? `'${row.unit_number}'` : 'NULL'},
          ${row.description ? `'${row.description.replace(/'/g, "''")}'` : 'NULL'},
          ${row.short_description ? `'${row.short_description.replace(/'/g, "''")}'` : 'NULL'},
          ${row.capacity ? `'${row.capacity}'::jsonb` : 'NULL'},
          ${row.bed_configuration ? `'${row.bed_configuration}'::jsonb` : 'NULL'},
          ${row.size_m2 || 'NULL'},
          ${row.floor_number || 'NULL'},
          ${row.view_type ? `'${row.view_type}'` : 'NULL'},
          ${row.images ? `'${row.images}'::jsonb` : 'NULL'},
          ${row.motopress_type_id || 'NULL'},
          ${row.motopress_unit_id || 'NULL'},
          ${row.full_description ? `'${row.full_description.replace(/'/g, "''")}'` : 'NULL'},
          ${row.tourism_features ? `'${row.tourism_features.replace(/'/g, "''")}'` : 'NULL'},
          ${row.booking_policies ? `'${row.booking_policies.replace(/'/g, "''")}'` : 'NULL'},
          ${row.unique_features ? `'${row.unique_features}'::jsonb` : 'NULL'},
          ${row.accessibility_features ? `'${row.accessibility_features}'::jsonb` : 'NULL'},
          ${row.location_details ? `'${row.location_details}'::jsonb` : 'NULL'},
          ${row.status ? `'${row.status}'` : 'NULL'},
          ${row.is_featured !== null ? row.is_featured : 'NULL'},
          ${row.display_order || 'NULL'},
          '${row.created_at}'::timestamptz,
          '${row.updated_at}'::timestamptz,
          ${row.base_price_low_season || 'NULL'},
          ${row.base_price_high_season || 'NULL'},
          ${row.price_per_person_low || 'NULL'},
          ${row.price_per_person_high || 'NULL'},
          ${row.amenities_list ? `'${row.amenities_list}'::jsonb` : 'NULL'},
          ${row.unit_amenities ? `'${row.unit_amenities.replace(/'/g, "''")}'` : 'NULL'},
          ${row.unit_type ? `'${row.unit_type}'` : 'NULL'},
          ${row.accommodation_mphb_type ? `'${row.accommodation_mphb_type}'` : 'NULL'},
          ${row.tags ? `ARRAY[${row.tags.map((t: string) => `'${t}'`).join(',')}]` : 'ARRAY[]::text[]'},
          ${row.subcategory ? `'${row.subcategory}'` : 'NULL'}
        )
      `;

      try {
        await executeSql(STAGING, STAGING_KEY, insertSql);
        copied++;
        console.log(`  ✅ ${copied}/${prodData.length}: ${row.name}`);
      } catch (error: any) {
        console.error(`  ❌ Failed ${row.name}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Copied ${copied}/${prodData.length} units`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
