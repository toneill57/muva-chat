import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const TEST_SUBDOMAIN = 'tucasaenelmar';

(async () => {
  console.log('🧪 TESTING: Auto-refresh polling functionality\n');
  console.log('='.repeat(70));

  // Get tenant UUID
  const { data: tenant } = await supabase
    .from('tenant_registry')
    .select('tenant_id')
    .eq('subdomain', TEST_SUBDOMAIN)
    .single();

  if (!tenant) {
    console.log('❌ Tenant not found');
    process.exit(1);
  }

  // Step 1: Get current count
  console.log('\n📊 STEP 1: Getting current conversation count...\n');

  const { data: initialStats } = await supabase
    .from('v_tenant_stats')
    .select('public_conversations, authenticated_conversations')
    .eq('subdomain', TEST_SUBDOMAIN)
    .single();

  const initialCount = initialStats?.public_conversations || 0;
  console.log(`Current public conversations: ${initialCount}`);

  // Step 2: Create new conversation via API
  console.log('\n💬 STEP 2: Creating new public conversation...\n');

  const testQuestion = `Test polling - ${new Date().toISOString()}`;

  const response = await fetch(`http://${TEST_SUBDOMAIN}.localhost:3000/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question: testQuestion,
      use_context: true,
      max_context_chunks: 3
    })
  });

  if (!response.ok) {
    console.log('❌ API call failed:', response.status);
    const error = await response.json();
    console.log('Error:', error);
    process.exit(1);
  }

  const data = await response.json();
  console.log('✅ API Response received');
  console.log(`Response: ${data.response?.substring(0, 80)}...`);

  // Step 3: Wait 2 seconds for DB write
  console.log('\n⏳ STEP 3: Waiting 2 seconds for database write...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 4: Verify new count
  console.log('📊 STEP 4: Checking updated count...\n');

  const { data: finalStats } = await supabase
    .from('v_tenant_stats')
    .select('public_conversations, authenticated_conversations')
    .eq('subdomain', TEST_SUBDOMAIN)
    .single();

  const finalCount = finalStats?.public_conversations || 0;
  const increment = finalCount - initialCount;

  console.log(`Previous count: ${initialCount}`);
  console.log(`Current count:  ${finalCount}`);
  console.log(`Increment:      ${increment >= 1 ? '+' + increment : increment}`);

  if (increment >= 1) {
    console.log('\n✅ SUCCESS! Conversation saved and counter updated');
    console.log('\n📝 Now test the auto-refresh:');
    console.log('   1. Open http://localhost:3000/super-admin/tenants in browser');
    console.log('   2. Note the current count for tucasaenelmar');
    console.log('   3. Wait 30 seconds WITHOUT refreshing the page');
    console.log('   4. The count should update automatically to:', finalCount);
  } else {
    console.log('\n❌ FAIL! Counter did not increment');
  }

  console.log('\n' + '='.repeat(70));
})();
