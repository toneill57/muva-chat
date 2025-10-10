import { createClient } from '@supabase/supabase-js';

/**
 * List all registered tenants in the multi-tenant system
 *
 * NOTE: Uses select('*') instead of explicit columns because:
 * - tenant_registry schema may evolve over time
 * - Avoids hardcoding column names that could cause runtime errors
 * - If specific columns are needed, query the schema first via:
 *   mcp__supabase__list_tables({ project_id: "...", schemas: ["public"] })
 */
async function listTenants() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('tenant_registry')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('\n📊 Tenants registrados:\n');
  console.table(data);

  console.log('\n🔗 URLs para testing:\n');
  data?.forEach(tenant => {
    console.log(`  ✅ https://${tenant.subdomain}.innpilot.io/admin`);
  });
}

listTenants();
