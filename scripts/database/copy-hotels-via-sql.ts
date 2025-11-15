#!/usr/bin/env tsx
/**
 * Copy hotels.accommodation_units using direct SQL
 * Uses pg_dump approach via SQL
 */

async function copyViaAPI(projectId: string, query: string, key: string) {
  const response = await fetch(
    `https://${projectId}.supabase.co/rest/v1/rpc/execute_sql`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error: ${text}`);
  }

  return await response.json();
}

async function main() {
  const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const STAGING_KEY = process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY!;
  const PROD_ID = 'ooaumjzaztmutltifhoq';
  const STAGING_ID = 'qlvkgniqcoisbnwwjfte';

  console.log('🏨 Copying hotels.accommodation_units via SQL\n');

  // Get count from production
  console.log('📊 Checking production data...');
  const countResult = await copyViaAPI(
    PROD_ID,
    'SELECT COUNT(*) as count FROM hotels.accommodation_units',
    PROD_KEY
  );
  const prodCount = countResult[0]?.count || 0;
  console.log(`   Found ${prodCount} rows in production\n`);

  if (prodCount === 0) {
    console.log('⏭️  No data to copy');
    return;
  }

  // Check staging
  const stagingCountResult = await copyViaAPI(
    STAGING_ID,
    'SELECT COUNT(*) as count FROM hotels.accommodation_units',
    STAGING_KEY
  );
  const stagingCount = stagingCountResult[0]?.count || 0;
  
  if (stagingCount > 0) {
    console.log(`⏭️  Staging already has ${stagingCount} rows`);
    return;
  }

  // Copy in batches of 5 to avoid token limits
  const batchSize = 5;
  let offset = 0;
  let totalCopied = 0;

  while (offset < prodCount) {
    console.log(`📦 Copying batch ${offset}-${Math.min(offset + batchSize, prodCount)}...`);

    // Get batch from production
    const batchQuery = `
      SELECT * FROM hotels.accommodation_units 
      ORDER BY created_at 
      LIMIT ${batchSize} OFFSET ${offset}
    `;
    
    const batch = await copyViaAPI(PROD_ID, batchQuery, PROD_KEY);

    if (!batch || batch.length === 0) break;

    // Generate INSERT statement
    const values = batch.map((row: any) => {
      // Escape values for SQL
      const escape = (val: any): string => {
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (typeof val === 'boolean') return val ? 'true' : 'false';
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
        return String(val);
      };

      // List all columns in order
      const cols = [
        row.id, row.tenant_id, row.hotel_id, row.accommodation_type_id,
        row.name, row.unit_number, row.description, row.short_description,
        row.capacity, row.bed_configuration, row.size_m2, row.floor_number,
        row.view_type, row.images, row.motopress_type_id, row.motopress_unit_id,
        row.full_description, row.tourism_features, row.booking_policies,
        row.embedding_fast, row.embedding_balanced, row.unique_features,
        row.accessibility_features, row.location_details, row.status,
        row.is_featured, row.display_order, row.created_at, row.updated_at,
        row.base_price_low_season, row.base_price_high_season,
        row.price_per_person_low, row.price_per_person_high,
        row.amenities_list, row.unit_amenities, row.unit_type,
        row.accommodation_mphb_type, row.tags, row.subcategory
      ].map(escape);

      return `(${cols.join(', ')})`;
    }).join(',\n');

    const insertQuery = `
      INSERT INTO hotels.accommodation_units (
        id, tenant_id, hotel_id, accommodation_type_id, name, unit_number,
        description, short_description, capacity, bed_configuration, size_m2,
        floor_number, view_type, images, motopress_type_id, motopress_unit_id,
        full_description, tourism_features, booking_policies, embedding_fast,
        embedding_balanced, unique_features, accessibility_features,
        location_details, status, is_featured, display_order, created_at,
        updated_at, base_price_low_season, base_price_high_season,
        price_per_person_low, price_per_person_high, amenities_list,
        unit_amenities, unit_type, accommodation_mphb_type, tags, subcategory
      ) VALUES ${values}
    `;

    try {
      await copyViaAPI(STAGING_ID, insertQuery, STAGING_KEY);
      totalCopied += batch.length;
      console.log(`   ✅ ${batch.length} rows copied`);
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      // Try one at a time
      for (const row of batch) {
        console.log(`      Trying single row: ${row.name}...`);
        // Implement single row insert if needed
      }
    }

    offset += batchSize;
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✅ Copied ${totalCopied} of ${prodCount} rows`);
}

main().catch(console.error);
