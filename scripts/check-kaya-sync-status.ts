import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const KAYA_HOTELS_ID = 'bb98c11f-4eea-4d99-ac2c-a16b5fac95aa';

  const { data, error } = await supabase
    .from('accommodation_units_public')
    .select('unit_id, name, metadata');

  if (error) {
    console.log('❌ Error querying accommodation_units_public:', error.message);
  } else if (!data || data.length === 0) {
    console.log('⚠️  NO records found in accommodation_units_public');
    console.log('⚠️  This means Simmerdown data has NOT been synced from hotels.accommodation_units to accommodation_units_public');
  } else {
    console.log(`✅ Found ${data.length} records in accommodation_units_public:`);
    data.forEach((unit: any) => {
      console.log(`\n${unit.name} (${unit.unit_id}):`);
      console.log('  metadata:', JSON.stringify(unit.metadata, null, 2));
    });

    // Check for Kaya specifically
    const kayaRecords = data.filter((u: any) => u.name.includes('Kaya'));
    if (kayaRecords.length > 0) {
      console.log(`\n🔍 Found ${kayaRecords.length} Kaya records`);
      kayaRecords.forEach((k: any) => console.log(`   - ${k.unit_id}`));
    }
  }
}

main();
