import { createClient } from '@supabase/supabase-js';

async function checkTenantsTable() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const result = await supabase.from('tenants').select('*').limit(1);
  console.log(JSON.stringify(result, null, 2));
}

checkTenantsTable();
