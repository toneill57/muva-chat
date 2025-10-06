import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

console.log('═══════════════════════════════════════════════════════');
console.log('TEST 2: Database Integrity Verification (Latest Run)');
console.log('═══════════════════════════════════════════════════════\n');

// Get the 3 most recent conversations
const { data: recentConvs } = await supabase
  .from('guest_conversations')
  .select('id, title, message_count, created_at')
  .in('title', ['Actividades en San Andrés', 'Restaurantes', 'Mi alojamiento'])
  .order('created_at', { ascending: false })
  .limit(3);

console.log('Most recent 3 conversations:');
console.table(recentConvs);

if (!recentConvs || recentConvs.length !== 3) {
  console.error('❌ Expected 3 conversations');
  process.exit(1);
}

// Verify message counts
console.log('\nVerifying message counts...');
for (const conv of recentConvs) {
  const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conv.id);

  const match = conv.message_count === count;
  console.log(`  ${conv.title}: counted=${conv.message_count}, actual=${count}, match=${match ? '✅' : '❌'}`);
}

// Check Actividades conversation
const actividadesConv = recentConvs.find(c => c.title === 'Actividades en San Andrés');
if (actividadesConv) {
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('content, role, entities')
    .eq('conversation_id', actividadesConv.id)
    .eq('role', 'user');

  console.log('\nActividades user messages:');
  messages?.forEach(m => console.log(`  - "${m.content}" | entities: ${JSON.stringify(m.entities)}`));

  const hasSnorkel = messages?.some(m => m.content.toLowerCase().includes('snorkel'));
  const hasJohnnyCay = messages?.some(m => m.content.toLowerCase().includes('johnny cay'));
  const hasPizza = messages?.some(m => m.content.toLowerCase().includes('pizza'));

  console.log(`\n  Snorkel: ${hasSnorkel ? '✅' : '❌'}`);
  console.log(`  Johnny Cay: ${hasJohnnyCay ? '✅' : '❌'}`);
  console.log(`  Pizza (should not exist): ${hasPizza ? '❌ LEAK DETECTED' : '✅ Not found'}`);
}

console.log('\n✅ DB VERIFICATION COMPLETE');
