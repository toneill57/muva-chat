import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

(async () => {
  console.log('📊 Checking latest public conversations...\n');

  const { data: convs, error } = await supabase
    .from('guest_conversations')
    .select('id, tenant_id, conversation_type, title, created_at')
    .eq('conversation_type', 'public')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('Found', convs?.length || 0, 'public conversations:\n');
    convs?.forEach((c: any) => {
      console.log('ID:', c.id);
      console.log('Tenant:', c.tenant_id);
      console.log('Title:', c.title);
      console.log('Created:', c.created_at);
      console.log('---');
    });
  }

  // Check messages for latest conversation
  if (convs && convs.length > 0) {
    console.log('\n💬 Checking messages for latest conversation...\n');
    const { data: msgs, count } = await supabase
      .from('chat_messages')
      .select('role, content', { count: 'exact' })
      .eq('conversation_id', convs[0].id);

    console.log('Messages found:', count || 0);
    if (msgs && msgs.length > 0) {
      msgs.forEach((m: any) => {
        console.log('-', m.role + ':', m.content.substring(0, 50) + '...');
      });
    } else {
      console.log('⚠️  No messages found for this conversation!');
    }
  }
})();
