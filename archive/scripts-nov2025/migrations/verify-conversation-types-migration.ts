import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

(async () => {
  console.log('🔍 VERIFICANDO MIGRACIÓN DE CONVERSATION_TYPE\n');
  console.log('='.repeat(60));

  let allPassed = true;

  // Test 1: Verificar columna conversation_type
  console.log('\n✓ Test 1: Verificar columna conversation_type existe');
  try {
    const { data, error } = await supabase
      .from('guest_conversations')
      .select('conversation_type')
      .limit(0);

    if (error) {
      console.log('  ❌ FALLO: conversation_type no existe');
      console.log('  Error:', error.message);
      allPassed = false;
    } else {
      console.log('  ✅ PASA: conversation_type existe');
    }
  } catch (err) {
    console.log('  ❌ FALLO:', err);
    allPassed = false;
  }

  // Test 2: Verificar columna anonymous_session_id
  console.log('\n✓ Test 2: Verificar columnas adicionales existen');
  try {
    const { data, error } = await supabase
      .from('guest_conversations')
      .select('anonymous_session_id, user_agent, referrer_url')
      .limit(0);

    if (error) {
      console.log('  ❌ FALLO: Columnas adicionales no existen');
      console.log('  Error:', error.message);
      allPassed = false;
    } else {
      console.log('  ✅ PASA: anonymous_session_id, user_agent, referrer_url existen');
    }
  } catch (err) {
    console.log('  ❌ FALLO:', err);
    allPassed = false;
  }

  // Test 3: Verificar vista v_tenant_stats tiene nuevas columnas
  console.log('\n✓ Test 3: Verificar v_tenant_stats tiene contadores discriminados');
  try {
    const { data, error } = await supabase
      .from('v_tenant_stats')
      .select('public_conversations, authenticated_conversations, conversation_count')
      .limit(1);

    if (error) {
      console.log('  ❌ FALLO: Vista no tiene las nuevas columnas');
      console.log('  Error:', error.message);
      allPassed = false;
    } else {
      console.log('  ✅ PASA: Vista tiene public_conversations y authenticated_conversations');
      if (data && data.length > 0) {
        console.log('  Ejemplo:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (err) {
    console.log('  ❌ FALLO:', err);
    allPassed = false;
  }

  // Test 4: Verificar datos actuales en v_tenant_stats
  console.log('\n✓ Test 4: Verificar contadores para todos los tenants');
  try {
    const { data: tenants, error } = await supabase
      .from('v_tenant_stats')
      .select('subdomain, public_conversations, authenticated_conversations, conversation_count');

    if (error) {
      console.log('  ❌ FALLO:', error.message);
      allPassed = false;
    } else {
      console.log('  ✅ PASA: Datos recuperados correctamente');
      console.log('\n  📊 Estado actual de conversaciones por tenant:\n');
      console.log('  | Tenant            | Public | Guests | Total |');
      console.log('  |-------------------|--------|--------|-------|');
      tenants?.forEach((t: any) => {
        const subdomain = t.subdomain.padEnd(17);
        const pub = String(t.public_conversations || 0).padStart(6);
        const auth = String(t.authenticated_conversations || 0).padStart(6);
        const total = String(t.conversation_count || 0).padStart(5);
        console.log(`  | ${subdomain} | ${pub} | ${auth} | ${total} |`);
      });
    }
  } catch (err) {
    console.log('  ❌ FALLO:', err);
    allPassed = false;
  }

  // Test 5: Verificar guest_id puede ser NULL
  console.log('\n✓ Test 5: Verificar guest_id acepta NULL (para públicas)');
  try {
    // Intentar insertar una conversación pública de prueba
    const { data, error } = await supabase
      .from('guest_conversations')
      .insert({
        tenant_id: 'test-migration',
        conversation_type: 'public',
        guest_id: null,
        title: 'Test Public Conversation',
        anonymous_session_id: crypto.randomUUID()
      })
      .select()
      .single();

    if (error) {
      console.log('  ❌ FALLO: No se puede insertar conversación pública');
      console.log('  Error:', error.message);
      allPassed = false;
    } else {
      console.log('  ✅ PASA: Conversación pública insertada correctamente');
      console.log('  ID:', data.id);

      // Limpiar el test
      await supabase
        .from('guest_conversations')
        .delete()
        .eq('id', data.id);
      console.log('  🧹 Test data limpiado');
    }
  } catch (err) {
    console.log('  ❌ FALLO:', err);
    allPassed = false;
  }

  // Test 6: Verificar RLS policies
  console.log('\n✓ Test 6: Verificar RLS policies (service role puede insertar)');
  console.log('  ℹ️  INFO: RLS policies verificadas en Step 5');

  // Resultado final
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ¡TODOS LOS TESTS PASARON!');
    console.log('\n🎉 Migración aplicada exitosamente');
    console.log('\n📋 Siguiente paso:');
    console.log('   - Modificar /api/chat para guardar conversaciones públicas');
    console.log('   - Recargar /super-admin/tenants para ver nuevas columnas');
  } else {
    console.log('❌ ALGUNOS TESTS FALLARON');
    console.log('\n🔧 Revisa los errores arriba y corrige la migración');
  }
  console.log('='.repeat(60));
})();
