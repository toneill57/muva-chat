import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check actual data in accommodation_units_public
  const { data, error } = await supabase
    .from('accommodation_units_public')
    .select('name, metadata, pricing, photos')
    .ilike('name', '%Kaya%')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('=== KAYA DATA FROM accommodation_units_public ===');
    console.log('\nAvailable columns:', Object.keys(data).join(', '));
    console.log('\n=== METADATA FIELD ===');
    console.log(JSON.stringify(data.metadata, null, 2));
    console.log('\n=== PRICING FIELD ===');
    console.log(JSON.stringify(data.pricing, null, 2));
    console.log('\n=== PHOTOS FIELD ===');
    console.log(JSON.stringify(data.photos, null, 2));
  }
}

main();
