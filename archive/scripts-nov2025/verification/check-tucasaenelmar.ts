import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get tucasaenelmar tenant_id
  const { data: tenant } = await supabase
    .from('tenant_registry')
    .select('tenant_id, razon_social, slug')
    .eq('slug', 'tucasaenelmar')
    .single();

  console.log('=== Tenant Info ===');
  console.table(tenant);

  if (tenant) {
    // Check hotels.accommodation_units for this tenant
    const { data: units, error } = await supabase
      .from('accommodation_units')
      .select('id, name, motopress_type_id, motopress_unit_id, tenant_id')
      .eq('tenant_id', tenant.tenant_id)
      .limit(10);

    console.log('\n=== hotels.accommodation_units (first 10) ===');
    console.log('Count:', units?.length || 0);
    console.table(units || []);
    if (error) console.error('Error:', error);

    // Also check accommodation_units_public
    const { data: unitsPublic, error: errorPublic } = await supabase
      .from('accommodation_units_public')
      .select('unit_id, name, tenant_id')
      .eq('tenant_id', tenant.tenant_id)
      .limit(10);

    console.log('\n=== accommodation_units_public (first 10) ===');
    console.log('Count:', unitsPublic?.length || 0);
    console.table(unitsPublic || []);
    if (errorPublic) console.error('Error:', errorPublic);
  }
}

main().catch(console.error);
