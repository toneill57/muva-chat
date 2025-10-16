import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get Kaya from public table
  const { data: publicData, error: publicError } = await supabase
    .from('accommodation_units_public')
    .select('*')
    .ilike('name', '%Kaya%')
    .single();

  if (publicError) {
    console.error('Error fetching from public:', publicError);
    return;
  }

  console.log('=== KAYA IN accommodation_units_public ===\n');

  // Fields that should be extracted according to EXTRAE comments
  const expectedFields = {
    // Basic info
    capacity: publicData.metadata?.capacity,
    bed_configuration: publicData.metadata?.bed_configuration,
    size_m2: publicData.metadata?.size_m2,
    floor_number: publicData.metadata?.floor_number,
    view_type: publicData.metadata?.view_type,
    unit_number: publicData.unit_number,

    // Pricing (in separate column)
    pricing: publicData.pricing,

    // Features
    unique_features: publicData.metadata?.unique_features,
    accessibility_features: publicData.metadata?.accessibility_features,
    unit_amenities: publicData.metadata?.unit_amenities,

    // Photos (in separate column)
    photos: publicData.photos,

    // Location & Tourism
    location_details: publicData.metadata?.location_details,
    tourism_features: publicData.metadata?.tourism_features,

    // Policies
    booking_policies: publicData.metadata?.booking_policies,

    // Status
    status: publicData.metadata?.status,
    is_featured: publicData.metadata?.is_featured,
    display_order: publicData.metadata?.display_order,
  };

  console.log('📊 CURRENT STATE OF EXTRACTED FIELDS:\n');

  Object.entries(expectedFields).forEach(([field, value]) => {
    const hasValue = value !== null && value !== undefined &&
                     (Array.isArray(value) ? value.length > 0 : true);
    const status = hasValue ? '✅' : '❌';
    const preview = hasValue
      ? (typeof value === 'object'
          ? `${Array.isArray(value) ? `Array(${value.length})` : 'Object'}`
          : String(value).substring(0, 50))
      : 'NULL/MISSING';

    console.log(`${status} ${field.padEnd(25)} ${preview}`);
  });

  console.log('\n=== FULL METADATA OBJECT ===');
  console.log(JSON.stringify(publicData.metadata, null, 2));
}

main();
