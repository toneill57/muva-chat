import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check in hotels schema
  const { data, error } = await supabase
    .schema('hotels')
    .from('accommodation_units')
    .select('*')
    .ilike('name', '%Kaya%')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    if (data && data.length > 0) {
      console.log('=== KAYA DATA FROM hotels.accommodation_units ===');
      console.log('Available columns:', Object.keys(data[0]).join(', '));
      console.log('\nFull data:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('No data found');
    }
  }
}

main();
