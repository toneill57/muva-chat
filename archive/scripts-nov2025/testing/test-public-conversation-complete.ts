import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEST_QUESTION = '¿Cuáles son las actividades disponibles en Santa Marta?';
const TEST_SUBDOMAIN = 'tucasaenelmar';

(async () => {
  console.log('🧪 TESTING END-TO-END: Public Conversation Flow\n');
  console.log('='.repeat(70));
  console.log(`📍 Subdomain: ${TEST_SUBDOMAIN}`);
  console.log(`❓ Test Question: "${TEST_QUESTION}"\n`);

  let testPassed = true;

  // ============================================================
  // STEP 1: Get initial state
  // ============================================================
  console.log('📊 STEP 1: Getting initial conversation counts...\n');

  const { data: initialStats } = await supabase
    .from('v_tenant_stats')
    .select('subdomain, public_conversations, authenticated_conversations, conversation_count')
    .eq('subdomain', TEST_SUBDOMAIN)
    .single();

  if (!initialStats) {
    console.log('❌ FALLO: No se encontró el tenant');
    process.exit(1);
  }

  console.log('Initial state:');
  console.log(`  Public conversations: ${initialStats.public_conversations || 0}`);
  console.log(`  Authenticated conversations: ${initialStats.authenticated_conversations || 0}`);
  console.log(`  Total: ${initialStats.conversation_count || 0}\n`);

  const initialPublic = initialStats.public_conversations || 0;

  // ============================================================
  // STEP 2: Simulate public chat via API
  // ============================================================
  console.log('💬 STEP 2: Simulating public chat via /api/chat...\n');

  try {
    const response = await fetch(`http://${TEST_SUBDOMAIN}.localhost:3000/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: TEST_QUESTION,
        use_context: true,
        max_context_chunks: 3
      })
    });

    if (!response.ok) {
      console.log(`❌ FALLO: API returned ${response.status}`);
      const error = await response.json();
      console.log('Error:', JSON.stringify(error, null, 2));
      testPassed = false;
    } else {
      const data = await response.json();
      console.log('✅ API Response received');
      console.log(`  Response length: ${data.response?.length || 0} characters`);
      console.log(`  Context used: ${data.context_used ? 'Yes' : 'No'}`);
      console.log(`  Performance: ${data.performance?.total_time_ms || 'N/A'}ms\n`);
    }
  } catch (error) {
    console.log('❌ FALLO: Error calling API');
    console.log('Error:', error);
    testPassed = false;
  }

  // Wait a bit for DB writes to complete
  console.log('⏳ Waiting 2 seconds for database writes...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ============================================================
  // STEP 3: Verify conversation was saved
  // ============================================================
  console.log('🔍 STEP 3: Verifying conversation was saved in database...\n');

  // First get tenant UUID from subdomain
  const { data: tenant } = await supabase
    .from('tenant_registry')
    .select('tenant_id')
    .eq('subdomain', TEST_SUBDOMAIN)
    .single();

  if (!tenant) {
    console.log('❌ FALLO: No se encontró el tenant con subdomain:', TEST_SUBDOMAIN);
    process.exit(1);
  }

  const { data: publicConvs, count: publicCount, error: convError } = await supabase
    .from('guest_conversations')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenant.tenant_id)
    .eq('conversation_type', 'public')
    .order('created_at', { ascending: false })
    .limit(1);

  if (convError) {
    console.log('❌ FALLO: Error querying conversations:', convError.message);
    testPassed = false;
  }

  if (!publicConvs || publicCount === 0) {
    console.log('❌ FALLO: No se encontró ninguna conversación pública');
    console.log('   Posibles causas:');
    console.log('   - tenant_id no coincide (esperado: string del subdomain)');
    console.log('   - RLS policies bloqueando la inserción');
    console.log('   - Error en /api/chat al guardar\n');
    testPassed = false;
  } else {
    const latestConv = publicConvs![0];
    console.log('✅ Conversación pública encontrada:');
    console.log(`  ID: ${latestConv.id}`);
    console.log(`  Title: ${latestConv.title}`);
    console.log(`  Type: ${latestConv.conversation_type}`);
    console.log(`  Guest ID: ${latestConv.guest_id || 'NULL (correcto para públicas)'}`);
    console.log(`  Session ID: ${latestConv.anonymous_session_id || 'N/A'}`);
    console.log(`  Created: ${latestConv.created_at}\n`);

    // Verify messages were saved
    const { data: messages, count: msgCount } = await supabase
      .from('chat_messages')
      .select('role, content', { count: 'exact' })
      .eq('conversation_id', latestConv.id);

    console.log(`📝 Messages saved: ${msgCount || 0}`);
    if (messages && messages.length > 0) {
      messages.forEach((msg: any, i: number) => {
        console.log(`  ${i + 1}. ${msg.role}: ${msg.content.substring(0, 60)}...`);
      });
      console.log();
    }
  }

  // ============================================================
  // STEP 4: Verify counters updated
  // ============================================================
  console.log('📊 STEP 4: Verifying counters in v_tenant_stats...\n');

  const { data: finalStats } = await supabase
    .from('v_tenant_stats')
    .select('subdomain, public_conversations, authenticated_conversations, conversation_count')
    .eq('subdomain', TEST_SUBDOMAIN)
    .single();

  if (!finalStats) {
    console.log('❌ FALLO: No se pudo obtener estadísticas finales');
    testPassed = false;
  } else {
    const finalPublic = finalStats.public_conversations || 0;
    const increment = finalPublic - initialPublic;

    console.log('Final state:');
    console.log(`  Public conversations: ${finalPublic} (${increment >= 1 ? '+' + increment : increment})`);
    console.log(`  Authenticated conversations: ${finalStats.authenticated_conversations || 0}`);
    console.log(`  Total: ${finalStats.conversation_count || 0}\n`);

    if (increment < 1) {
      console.log('⚠️  WARNING: Contador público no se incrementó');
      console.log('   Posibles causas:');
      console.log('   - Vista no refrescada (esperado si es materializada)');
      console.log('   - tenant_id en guest_conversations no coincide con tenant_registry\n');
      testPassed = false;
    } else {
      console.log('✅ Contador público se incrementó correctamente\n');
    }
  }

  // ============================================================
  // STEP 5: Display comparison table
  // ============================================================
  console.log('📊 STEP 5: Comparison table (all tenants)...\n');

  const { data: allTenants } = await supabase
    .from('v_tenant_stats')
    .select('subdomain, public_conversations, authenticated_conversations, conversation_count')
    .order('subdomain');

  console.log('┌─────────────────────┬────────┬─────────┬───────┐');
  console.log('│ Tenant              │ Public │ Guests  │ Total │');
  console.log('├─────────────────────┼────────┼─────────┼───────┤');

  allTenants?.forEach((t: any) => {
    const name = t.subdomain.padEnd(19);
    const pub = String(t.public_conversations || 0).padStart(6);
    const auth = String(t.authenticated_conversations || 0).padStart(7);
    const total = String(t.conversation_count || 0).padStart(5);
    const highlight = t.subdomain === TEST_SUBDOMAIN ? '►' : ' ';
    console.log(`│${highlight}${name} │ ${pub} │ ${auth} │ ${total} │`);
  });

  console.log('└─────────────────────┴────────┴─────────┴───────┘\n');

  // ============================================================
  // FINAL RESULT
  // ============================================================
  console.log('='.repeat(70));
  if (testPassed) {
    console.log('✅ ¡TODOS LOS TESTS PASARON!');
    console.log('\n🎉 Sistema de conversaciones públicas funcionando correctamente');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Recarga /super-admin/tenants en el navegador');
    console.log('   2. Verifica que veas las columnas "Public" y "Guests"');
    console.log('   3. Los contadores deberían reflejar los valores de la tabla arriba');
  } else {
    console.log('❌ ALGUNOS TESTS FALLARON');
    console.log('\n🔧 Revisa los errores arriba y verifica:');
    console.log('   1. RLS policies en guest_conversations');
    console.log('   2. tenant_id format (string vs UUID)');
    console.log('   3. Logs del servidor en /api/chat');
  }
  console.log('='.repeat(70));
})();
