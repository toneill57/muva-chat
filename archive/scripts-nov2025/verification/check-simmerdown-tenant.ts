import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  try {
    // Query all tenants
    const { data: allTenants, error: allError } = await supabase
      .from('tenant_registry')
      .select('tenant_id, subdomain, nombre_comercial, is_active, created_at')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('Error fetching all tenants:', allError);
      return;
    }

    console.log('\n=== ALL TENANTS ===');
    console.log(`Total tenants found: ${allTenants?.length || 0}\n`);

    allTenants?.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.subdomain} - ${tenant.nombre_comercial || '(sin nombre)'} - ${tenant.is_active ? 'ACTIVO' : 'INACTIVO'}`);
    });

    // Specifically check for simmerdown
    const { data: simmerdown, error: simmerError } = await supabase
      .from('tenant_registry')
      .select('*')
      .or('subdomain.eq.simmerdown,subdomain.eq.simmer-down,subdomain.ilike.%simmer%');

    console.log('\n=== SIMMERDOWN SEARCH ===');
    if (simmerError) {
      console.error('Error searching for simmerdown:', simmerError);
    } else if (!simmerdown || simmerdown.length === 0) {
      console.log('⚠️  NO SE ENCONTRÓ el tenant "simmerdown" o similar');
    } else {
      console.log('✅ ENCONTRADO:');
      console.log(JSON.stringify(simmerdown, null, 2));
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
})();
