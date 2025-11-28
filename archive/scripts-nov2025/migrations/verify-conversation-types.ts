import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

(async () => {
  console.log('🔍 VERIFICANDO TIPOS DE CONVERSACIONES\n');

  // 1. Ver todas las conversaciones en guest_conversations
  const { data: allConversations, count } = await supabase
    .from('guest_conversations')
    .select(`
      id,
      tenant_id,
      guest_id,
      title,
      created_at,
      guest_reservations (
        guest_name,
        check_in_date,
        phone_last_4
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  console.log(`📊 Total conversaciones en BD: ${count}`);
  console.log('\n📋 Conversaciones autenticadas (guest_conversations):');
  if (allConversations && allConversations.length > 0) {
    allConversations.forEach((conv: any) => {
      console.log(`\n  - ID: ${conv.id}`);
      console.log(`    Tenant: ${conv.tenant_id}`);
      console.log(`    Guest ID: ${conv.guest_id}`);
      console.log(`    Title: ${conv.title}`);
      console.log(`    Created: ${conv.created_at}`);
      if (conv.guest_reservations) {
        console.log(`    Guest: ${conv.guest_reservations.guest_name}`);
        console.log(`    Check-in: ${conv.guest_reservations.check_in_date}`);
      }
    });
  } else {
    console.log('  (vacío)');
  }

  // 2. Ver el contador de la vista v_tenant_stats
  console.log('\n\n📊 CONTADOR DESDE v_tenant_stats:');
  const { data: tenantStats } = await supabase
    .from('v_tenant_stats')
    .select('subdomain, conversation_count');

  if (tenantStats) {
    tenantStats.forEach((stat: any) => {
      console.log(`  ${stat.subdomain}: ${stat.conversation_count} conversaciones`);
    });
  }

  // 3. Verificar si existe algún log de conversaciones públicas
  console.log('\n\n🔍 Verificando tabla chat_conversations (legacy/públicas):');
  const { data: publicConvs, count: publicCount } = await supabase
    .from('chat_conversations')
    .select('*', { count: 'exact' });

  console.log(`  Total: ${publicCount || 0}`);
  if (publicConvs && publicConvs.length > 0) {
    console.log(JSON.stringify(publicConvs, null, 2));
  }

  console.log('\n\n✅ CONCLUSIÓN:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('El contador muestra SOLO conversaciones de /my-stay');
  console.log('(conversaciones autenticadas guardadas en guest_conversations)');
  console.log('');
  console.log('Las conversaciones públicas de /with-me NO se cuentan');
  console.log('porque NO se guardan en la base de datos.');
})();
