import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('accommodation_units')
    .select('*')
    .eq('name', 'Habitación Privada Kaya')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('=== AVAILABLE COLUMNS IN accommodation_units ===');
    console.log(Object.keys(data).join(', '));
    console.log('\n=== KAYA FULL DATA ===');
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
