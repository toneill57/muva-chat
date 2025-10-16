import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const SIMMERDOWN_TENANT_ID = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';

  // Check if Simmerdown has data in hotels.accommodation_units
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        id, name, view_type, floor_number,
        CASE WHEN embedding_fast IS NOT NULL THEN 'HAS EMBEDDING' ELSE 'NO EMBEDDING' END as embedding_status
      FROM hotels.accommodation_units
      WHERE tenant_id = '${SIMMERDOWN_TENANT_ID}'
      ORDER BY name
    `
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('=== SIMMERDOWN DATA IN hotels.accommodation_units ===');
    console.log(`Found ${data.length} units:`);
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
