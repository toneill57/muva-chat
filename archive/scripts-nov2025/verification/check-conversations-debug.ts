import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

(async () => {
  // Primero, obtener el tenant_id UUID de tucasaenelmar
  const { data: tenant } = await supabase
    .from('tenant_registry')
    .select('tenant_id, subdomain, nombre_comercial')
    .eq('subdomain', 'tucasaenelmar')
    .single();

  console.log('✅ Tenant:', JSON.stringify(tenant, null, 2));

  if (tenant) {
    // Buscar conversaciones con ese tenant_id UUID
    const { data: conversations, count } = await supabase
      .from('guest_conversations')
      .select('id, tenant_id, created_at', { count: 'exact' })
      .eq('tenant_id', tenant.tenant_id)
      .limit(5);

    console.log(`\n📊 Conversations with UUID match: ${count}`);
    if (conversations && conversations.length > 0) {
      console.log(JSON.stringify(conversations, null, 2));
    }

    // También verificar si hay conversaciones guardadas con subdomain (string)
    const { data: convBySubdomain, count: countBySubdomain } = await supabase
      .from('guest_conversations')
      .select('id, tenant_id, created_at', { count: 'exact' })
      .eq('tenant_id', 'tucasaenelmar')
      .limit(5);

    console.log(`\n📊 Conversations with subdomain string: ${countBySubdomain}`);
    if (convBySubdomain && convBySubdomain.length > 0) {
      console.log(JSON.stringify(convBySubdomain, null, 2));
    }

    // Verificar todas las conversaciones para ver qué formato tienen
    const { data: allConvs } = await supabase
      .from('guest_conversations')
      .select('id, tenant_id')
      .limit(10);

    console.log(`\n📋 Sample of all conversations (first 10):`);
    console.log(JSON.stringify(allConvs, null, 2));
  }
})();
