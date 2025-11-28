import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const NEW_QUESTION = '¿Cuánto cuesta la estadía por noche?';

(async () => {
  console.log('🧪 Testing NEW question (cache miss)');
  console.log(`Question: "${NEW_QUESTION}"\n`);

  // Get initial count
  const { count: initialCount } = await supabase
    .from('guest_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_type', 'public');

  console.log(`Initial public conversations: ${initialCount || 0}\n`);

  // Make API call
  console.log('Making API call...');
  const response = await fetch('http://tucasaenelmar.localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question: NEW_QUESTION,
      use_context: true,
      max_context_chunks: 3
    })
  });

  if (!response.ok) {
    console.log('❌ API Error:', response.status);
    const error = await response.json();
    console.log(error);
    return;
  }

  const data = await response.json();
  console.log('✅ API Response received');
  console.log(`Response: ${data.response?.substring(0, 100)}...`);
  console.log(`Performance: ${data.performance?.total_time_ms}ms\n`);

  // Wait for DB write
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check final count
  const { data: convs, count: finalCount } = await supabase
    .from('guest_conversations')
    .select('id, title, created_at')
    .eq('conversation_type', 'public')
    .order('created_at', { ascending: false })
    .limit(1);

  console.log(`Final public conversations: ${finalCount || 0}`);

  if (convs && convs.length > 0) {
    const latest = convs[0];
    console.log(`\n📝 Latest conversation:`);
    console.log(`  ID: ${latest.id}`);
    console.log(`  Title: ${latest.title}`);

    // Check messages
    const { count: msgCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', latest.id);

    console.log(`  Messages: ${msgCount || 0}`);

    if (msgCount && msgCount > 0) {
      console.log('\n✅ SUCCESS! Messages saved correctly');
    } else {
      console.log('\n❌ FAIL! No messages found for conversation');
    }
  }
})();
