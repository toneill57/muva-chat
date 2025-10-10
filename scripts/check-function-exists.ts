import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFunctionExists() {
  console.log('🔍 Verificando get_sire_guest_data de múltiples formas...\n');

  // Method 1: Try calling it with actual UUID
  console.log('1️⃣ Método 1: Intentando llamar la función directamente...');
  try {
    const testUuid = '00000000-0000-0000-0000-000000000000';
    const { data, error } = await (supabase as any).rpc('get_sire_guest_data', {
      p_reservation_id: testUuid
    });

    if (error) {
      console.log('   Error:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);

      if (error.message && error.message.includes('does not exist')) {
        console.log('   ❌ La función NO existe según este método\n');
      } else {
        console.log('   ✅ La función existe (error diferente a "no existe")\n');
      }
    } else {
      console.log('   ✅ La función existe y retornó:', data);
      console.log('');
    }
  } catch (err: any) {
    console.log('   ❌ Error inesperado:', err.message, '\n');
  }

  // Method 2: Query pg_proc directly via REST
  console.log('2️⃣ Método 2: Consultando pg_proc con REST API...');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query_functions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        function_name: 'get_sire_guest_data'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   Resultado:', data);
    } else {
      console.log('   ⚠️  query_functions no existe (esperado)\n');
    }
  } catch (err: any) {
    console.log('   ⚠️  Método no disponible\n');
  }

  // Method 3: Try with different parameter format
  console.log('3️⃣ Método 3: Intentando con formato de parámetro alternativo...');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_sire_guest_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        p_reservation_id: '00000000-0000-0000-0000-000000000000'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ La función existe! Retornó:', data);
      console.log('');
      return true;
    } else {
      const errorText = await response.text();
      console.log('   Error HTTP:', response.status);
      console.log('   Mensaje:', errorText);

      if (errorText.includes('does not exist') || errorText.includes('not found')) {
        console.log('   ❌ La función NO existe según este método\n');
        return false;
      } else {
        console.log('   ✅ La función probablemente existe (error diferente)\n');
        return true;
      }
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message, '\n');
    return false;
  }
}

checkFunctionExists()
  .then((exists) => {
    if (exists) {
      console.log('✅ CONCLUSIÓN: La función get_sire_guest_data EXISTE\n');
      process.exit(0);
    } else {
      console.log('❌ CONCLUSIÓN: La función get_sire_guest_data NO EXISTE\n');
      console.log('⚠️  Por favor verifica en Supabase Dashboard si el SQL se ejecutó correctamente.');
      console.log('   SQL Editor → Ejecuta: SELECT proname FROM pg_proc WHERE proname = \'get_sire_guest_data\';');
      console.log('');
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
  });
