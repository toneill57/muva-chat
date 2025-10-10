import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPermissions() {
  console.log('🔍 Probando permisos reales de Supabase...\n');

  // Test 1: READ - ¿Puedo leer de una tabla existente?
  console.log('1️⃣ Test: READ de tabla existente (sire_countries)');
  try {
    const { data, error } = await supabase
      .from('sire_countries')
      .select('*')
      .limit(1);

    if (error) {
      console.log('   ❌ READ falló:', error.message);
    } else {
      console.log('   ✅ READ funciona:', data?.length || 0, 'filas\n');
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message, '\n');
  }

  // Test 2: CREATE TABLE - ¿Puedo crear una tabla?
  console.log('2️⃣ Test: CREATE TABLE (tabla_test_domi)');
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query: 'CREATE TABLE tabla_test_domi (id SERIAL PRIMARY KEY, nombre TEXT);'
    });

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ❌ execute_sql RPC no existe');
      } else {
        console.log('   ❌ CREATE TABLE falló:', error.message);
      }
    } else {
      console.log('   ✅ CREATE TABLE funcionó!\n');
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message, '\n');
  }

  // Test 3: INSERT - ¿Puedo insertar datos?
  console.log('3️⃣ Test: INSERT a tabla existente (guest_reservations)');
  try {
    const testData = {
      tenant_id: 'test-permissions-check',
      guest_name: 'Test Permission Check',
      check_in_date: '2025-01-01',
      check_out_date: '2025-01-02',
      status: 'test'
    };

    const { data, error } = await supabase
      .from('guest_reservations')
      .insert(testData)
      .select();

    if (error) {
      console.log('   ❌ INSERT falló:', error.message);
    } else {
      console.log('   ✅ INSERT funciona! ID:', data?.[0]?.id);

      // Test 4: DELETE - Borrar el registro de prueba
      console.log('\n4️⃣ Test: DELETE el registro de prueba');
      const { error: deleteError } = await supabase
        .from('guest_reservations')
        .delete()
        .eq('id', data?.[0]?.id);

      if (deleteError) {
        console.log('   ❌ DELETE falló:', deleteError.message, '\n');
      } else {
        console.log('   ✅ DELETE funciona!\n');
      }
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message, '\n');
  }

  // Test 5: RPC - ¿Puedo llamar RPCs existentes?
  console.log('5️⃣ Test: RPC call (get_sire_statistics)');
  try {
    const { data, error } = await supabase.rpc('get_sire_statistics', {
      p_tenant_id: 'test',
      p_start_date: '2025-01-01',
      p_end_date: '2025-12-31'
    });

    if (error) {
      console.log('   ❌ RPC falló:', error.message);
    } else {
      console.log('   ✅ RPC funciona!\n');
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message, '\n');
  }

  // Test 6: MCP Supabase - ¿Los MCPs funcionan?
  console.log('6️⃣ Test: MCP Supabase list_tables');
  console.log('   (Este test se hace con mcp__supabase__list_tables)\n');

  console.log('📊 RESUMEN DE PERMISOS:');
  console.log('─'.repeat(60));
  console.log('Si READ/INSERT/DELETE funcionan pero CREATE TABLE no,');
  console.log('entonces tengo permisos de DATOS pero NO de SCHEMA.');
  console.log('');
  console.log('Para ejecutar DDL necesito:');
  console.log('1. Una función RPC helper (execute_ddl)');
  console.log('2. O usar Supabase CLI con db push');
  console.log('3. O dashboard manual\n');
}

testPermissions();
