import { createClient } from '@supabase/supabase-js';

async function checkTenantSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // Get first tenant to see structure
  const result = await supabase.from('tenant_registry').select('*').limit(1);
  console.log('Tenant schema:');
  console.log(JSON.stringify(result.data, null, 2));
}

checkTenantSchema();
