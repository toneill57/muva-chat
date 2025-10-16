import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check data in hotels.accommodation_units
  const { data, error } = await supabase
    .schema('hotels')
    .from('accommodation_units')
    .select('*')
    .ilike('name', '%Kaya%')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('=== KAYA DATA FROM hotels.accommodation_units ===');
    console.log('\nAvailable columns:', Object.keys(data).join(', '));
    console.log('\n=== ALL DATA ===');
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
