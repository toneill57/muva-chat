import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const KAYA_PUBLIC_ID = 'b00f82aa-c471-41b2-814a-5dfc2078de74';

  console.log('🔄 Updating Kaya metadata in accommodation_units_public...\n');

  const { error } = await supabase
    .from('accommodation_units_public')
    .update({
      metadata: {
        status: 'active',
        capacity: 2,
        view_type: 'Ventana anti-ruido con vista al exterior',
        floor_number: null  // Will be updated when floor info is available
      }
    })
    .eq('unit_id', KAYA_PUBLIC_ID);

  if (error) {
    console.error('❌ Error updating:', error);
    process.exit(1);
  } else {
    console.log('✅ Updated Kaya metadata with view_type!');
    console.log('   - view_type: "Ventana anti-ruido con vista al exterior"');
    console.log('   - capacity: 2');
    console.log('   - status: "active"');
  }
}

main();
