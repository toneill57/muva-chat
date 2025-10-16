import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('accommodation_units')
    .select('name, metadata, base_price_low_season, base_price_high_season')
    .eq('name', 'Habitación Privada Kaya')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('=== KAYA DATA FROM DATABASE ===');
    console.log('Name:', data.name);
    console.log('Low Season:', data.base_price_low_season);
    console.log('High Season:', data.base_price_high_season);
    console.log('\nMetadata fields:');
    console.log(JSON.stringify(data.metadata, null, 2));
  }
}

main();
