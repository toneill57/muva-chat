import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getTestCredentials() {
  console.log('Fetching valid test reservations...\n');

  const { data, error } = await supabase
    .from('reservations')
    .select('reservation_code, guest_name, check_in, phone, tenant_id')
    .eq('tenant_id', 'simmerdown')
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No confirmed reservations found for simmerdown tenant');
    return;
  }

  console.log('Valid reservations:');
  console.table(data);

  if (data[0]) {
    const phone = data[0].phone || '';
    const last4 = phone.slice(-4);
    console.log('\n🎯 TEST CREDENTIALS:');
    console.log('───────────────────────────────────────');
    console.log(`tenant_id: "${data[0].tenant_id}"`);
    console.log(`check_in_date: "${data[0].check_in}"`);
    console.log(`phone_last_4: "${last4}"`);
    console.log(`guest_name: "${data[0].guest_name}"`);
    console.log('───────────────────────────────────────');
  }
}

getTestCredentials();
