import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const LATEST_KAYA_ID = '23b75dc4-6d28-4fe2-a4d4-b756e601b90c';

  // Query hotels.accommodation_units for the latest Kaya
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        id, name, view_type, floor_number, capacity,
        bed_configuration, size_m2, unit_amenities,
        unique_features, accessibility_features,
        images, location_details, tourism_features,
        booking_policies, status, is_featured, display_order,
        base_price_low_season, base_price_high_season
      FROM hotels.accommodation_units
      WHERE id = '${LATEST_KAYA_ID}'
    `
  });

  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('=== LATEST KAYA IN hotels.accommodation_units ===\n');
    const kaya = data[0];

    // Check each field
    const fields = Object.keys(kaya);
    fields.forEach(field => {
      const value = kaya[field];
      const hasValue = value !== null && value !== undefined &&
                       (typeof value === 'string' ? value.length > 0 : true) &&
                       (Array.isArray(value) ? value.length > 0 : true);
      const status = hasValue ? '✅' : '❌';

      let preview = 'NULL';
      if (hasValue) {
        if (typeof value === 'object') {
          preview = JSON.stringify(value).substring(0, 80);
        } else {
          preview = String(value).substring(0, 80);
        }
      }

      console.log(`${status} ${field.padEnd(30)} ${preview}`);
    });
  }
}

main();
