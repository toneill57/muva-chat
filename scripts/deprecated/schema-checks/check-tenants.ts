import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTenants() {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error fetching tenants:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} tenants:`);
  data?.forEach(tenant => {
    console.log(`  - ${tenant.name} (${tenant.id})`);
  });

  if (!data || data.length === 0) {
    console.log('\nCreating test tenant...');
    
    const { data: newTenant, error: createError } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Hotel',
        slug: 'test-hotel-' + Date.now(),
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating tenant:', createError);
      return;
    }

    console.log('✅ Created test tenant:', newTenant.id);
  }
}

checkTenants();
