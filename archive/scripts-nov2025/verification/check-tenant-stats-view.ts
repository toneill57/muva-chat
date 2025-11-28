import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  try {
    // Query the v_tenant_stats view
    const { data: stats, error } = await supabase
      .from('v_tenant_stats')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('\n=== v_tenant_stats VIEW ===');
    if (error) {
      console.error('❌ Error querying v_tenant_stats:', error);
    } else {
      console.log(`Total rows in v_tenant_stats: ${stats?.length || 0}\n`);
      if (stats && stats.length > 0) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log('⚠️  La vista v_tenant_stats está VACÍA');

        // Check if there's an issue with the view definition
        console.log('\n=== Verificando causa ===');
        console.log('Consultando tenant_registry directamente...');

        const { data: direct, error: directError } = await supabase
          .from('tenant_registry')
          .select('tenant_id, subdomain, nombre_comercial, subscription_tier, is_active, created_at');

        if (directError) {
          console.error('Error en consulta directa:', directError);
        } else {
          console.log(`Tenants en tenant_registry: ${direct?.length || 0}`);
          if (direct && direct.length > 0) {
            console.log(JSON.stringify(direct, null, 2));
          }
        }
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
})();
