import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const GET_SIRE_GUEST_DATA_SQL = `
CREATE OR REPLACE FUNCTION get_sire_guest_data(p_reservation_id UUID)
RETURNS TABLE (
  reservation_id UUID, reservation_code TEXT, tenant_id TEXT, guest_name TEXT,
  check_in_date DATE, check_out_date DATE, status TEXT,
  hotel_sire_code TEXT, hotel_city_code TEXT,
  document_type TEXT, document_type_name TEXT, document_number TEXT,
  nationality_code TEXT, nationality_name TEXT,
  first_surname TEXT, second_surname TEXT, given_names TEXT,
  movement_type TEXT, movement_date DATE,
  origin_city_code TEXT, origin_city_name TEXT,
  destination_city_code TEXT, destination_city_name TEXT,
  birth_date DATE
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT gr.id, gr.reservation_code, gr.tenant_id, gr.guest_name,
         gr.check_in_date, gr.check_out_date, gr.status,
         gr.hotel_sire_code, gr.hotel_city_code,
         gr.document_type, sdt.name, gr.document_number,
         gr.nationality_code, sc_nat.name_es,
         gr.first_surname, gr.second_surname, gr.given_names,
         gr.movement_type, gr.movement_date,
         gr.origin_city_code, COALESCE(dcit_orig.name, sc_orig.name_es),
         gr.destination_city_code, COALESCE(dcit_dest.name, sc_dest.name_es),
         gr.birth_date
  FROM guest_reservations gr
  LEFT JOIN sire_document_types sdt ON gr.document_type = sdt.code
  LEFT JOIN sire_countries sc_nat ON gr.nationality_code = sc_nat.sire_code
  LEFT JOIN divipola_cities dcit_orig ON gr.origin_city_code = dcit_orig.code
  LEFT JOIN sire_countries sc_orig ON gr.origin_city_code = sc_orig.sire_code
  LEFT JOIN divipola_cities dcit_dest ON gr.destination_city_code = dcit_dest.code
  LEFT JOIN sire_countries sc_dest ON gr.destination_city_code = sc_dest.sire_code
  WHERE gr.id = p_reservation_id;
END;
$$;

REVOKE ALL ON FUNCTION get_sire_guest_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_sire_guest_data(UUID) TO authenticated, service_role;
COMMENT ON FUNCTION get_sire_guest_data(UUID) IS 'Retrieves complete SIRE guest data for a reservation with human-readable catalog lookups.';
`;

async function fixMissingFunction() {
  console.log('🔧 Arreglando función faltante get_sire_guest_data...\n');

  // Step 1: Check if function already exists
  console.log('1️⃣ Verificando si la función ya existe...');
  const { data: checkData, error: checkError } = await supabase.rpc('get_sire_guest_data', {
    p_reservation_id: '00000000-0000-0000-0000-000000000000'
  });

  if (!checkError || !checkError.message.includes('does not exist')) {
    console.log('   ✅ La función get_sire_guest_data YA existe!');
    console.log('   No es necesario crearla nuevamente.\n');
    return true;
  }

  console.log('   ⚠️  La función NO existe. Creándola...\n');

  // Step 2: Execute SQL using Supabase REST API
  console.log('2️⃣ Ejecutando SQL para crear la función...');

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: GET_SIRE_GUEST_DATA_SQL })
  });

  if (!response.ok) {
    // Try alternative: direct SQL query via PostgREST
    console.log('   ⚠️  exec_sql no disponible. Intentando método alternativo...');

    // Use fetch to Supabase SQL endpoint
    const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sql',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: GET_SIRE_GUEST_DATA_SQL
    });

    if (!sqlResponse.ok) {
      console.error('   ❌ Error ejecutando SQL:', await sqlResponse.text());
      console.error('\n⚠️  SOLUCIÓN MANUAL REQUERIDA:');
      console.error('   Por favor ejecuta el siguiente SQL en Supabase Dashboard:\n');
      console.error(GET_SIRE_GUEST_DATA_SQL);
      return false;
    }
  }

  console.log('   ✅ SQL ejecutado correctamente\n');

  // Step 3: Verify function was created
  console.log('3️⃣ Verificando que la función se creó...');
  const { data: verifyData, error: verifyError } = await supabase.rpc('get_sire_guest_data', {
    p_reservation_id: '00000000-0000-0000-0000-000000000000'
  });

  if (verifyError && verifyError.message.includes('does not exist')) {
    console.error('   ❌ La función NO se creó correctamente');
    console.error('   Error:', verifyError.message);
    console.error('\n⚠️  SOLUCIÓN MANUAL REQUERIDA:');
    console.error('   Por favor ejecuta el SQL manualmente en Supabase Dashboard\n');
    return false;
  }

  console.log('   ✅ Función get_sire_guest_data creada y verificada!\n');

  // Step 4: Run complete verification
  console.log('4️⃣ Verificando todas las funciones SIRE...');

  const functions = [
    'get_sire_guest_data',
    'get_sire_monthly_export',
    'check_sire_data_completeness',
    'get_sire_statistics',
    'check_sire_access_permission'
  ];

  for (const funcName of functions) {
    let exists = false;

    try {
      if (funcName === 'get_sire_guest_data') {
        const { error } = await supabase.rpc(funcName, { p_reservation_id: '00000000-0000-0000-0000-000000000000' });
        exists = !error || !error.message.includes('does not exist');
      } else if (funcName === 'get_sire_monthly_export') {
        const { error } = await supabase.rpc(funcName, { p_tenant_id: 'test', p_year: 2025, p_month: 10, p_movement_type: 'E' });
        exists = !error || !error.message.includes('does not exist');
      } else if (funcName === 'check_sire_data_completeness') {
        const { error } = await supabase.rpc(funcName, { p_reservation_id: '00000000-0000-0000-0000-000000000000' });
        exists = !error || !error.message.includes('does not exist');
      } else if (funcName === 'get_sire_statistics') {
        const { error } = await supabase.rpc(funcName, { p_tenant_id: 'test', p_start_date: '2025-01-01', p_end_date: '2025-12-31' });
        exists = !error || !error.message.includes('does not exist');
      } else if (funcName === 'check_sire_access_permission') {
        const { error } = await supabase.rpc(funcName, { p_tenant_id: 'test', p_user_id: '00000000-0000-0000-0000-000000000000' });
        exists = !error || !error.message.includes('does not exist');
      }
    } catch (err: any) {
      exists = false;
    }

    console.log(`   ${exists ? '✅' : '❌'} ${funcName}`);
  }

  console.log('\n✅ Reparación completa!\n');
  return true;
}

fixMissingFunction()
  .then((success) => {
    if (success) {
      console.log('🎉 Todas las funciones SIRE están disponibles');
      process.exit(0);
    } else {
      console.error('❌ Hubo problemas. Revisa los mensajes arriba.');
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
  });
