import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
});

async function verifyMigration() {
  console.log('🔍 Verificando migración SIRE...\n');

  // Test 1: Try calling one of the functions directly
  console.log('1️⃣ Probando get_sire_statistics:');
  try {
    const { data, error } = await supabase.rpc('get_sire_statistics', {
      p_tenant_id: 'test',
      p_start_date: '2025-01-01',
      p_end_date: '2025-12-31'
    });

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ❌ Función get_sire_statistics NO existe');
      } else {
        console.log('   ✅ Función get_sire_statistics existe (error esperado por tenant inexistente)');
      }
    } else {
      console.log('   ✅ Función get_sire_statistics existe y ejecutó correctamente');
      console.log('   Resultados:', data);
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
  }

  // Test 2: Try check_sire_data_completeness
  console.log('\n2️⃣ Probando check_sire_data_completeness:');
  try {
    const { data, error } = await supabase.rpc('check_sire_data_completeness', {
      p_reservation_id: '00000000-0000-0000-0000-000000000000'
    });

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ❌ Función check_sire_data_completeness NO existe');
      } else {
        console.log('   ✅ Función check_sire_data_completeness existe');
      }
    } else {
      console.log('   ✅ Función check_sire_data_completeness existe');
      console.log('   Resultado:', data);
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
  }

  // Test 3: Try get_sire_guest_data
  console.log('\n3️⃣ Probando get_sire_guest_data:');
  try {
    const { data, error } = await supabase.rpc('get_sire_guest_data', {
      p_reservation_id: '00000000-0000-0000-0000-000000000000'
    });

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ❌ Función get_sire_guest_data NO existe');
      } else {
        console.log('   ✅ Función get_sire_guest_data existe');
      }
    } else {
      console.log('   ✅ Función get_sire_guest_data existe');
      console.log(`   Resultados: ${data?.length || 0} filas`);
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
  }

  // Test 4: Try get_sire_monthly_export
  console.log('\n4️⃣ Probando get_sire_monthly_export:');
  try {
    const { data, error } = await supabase.rpc('get_sire_monthly_export', {
      p_tenant_id: 'test',
      p_year: 2025,
      p_month: 10,
      p_movement_type: 'E'
    });

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ❌ Función get_sire_monthly_export NO existe');
      } else {
        console.log('   ✅ Función get_sire_monthly_export existe');
      }
    } else {
      console.log('   ✅ Función get_sire_monthly_export existe');
      console.log(`   Resultados: ${data?.length || 0} filas`);
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
  }

  // Test 5: Try check_sire_access_permission
  console.log('\n5️⃣ Probando check_sire_access_permission:');
  try {
    const { data, error } = await supabase.rpc('check_sire_access_permission', {
      p_tenant_id: 'test',
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ❌ Función check_sire_access_permission NO existe');
      } else {
        console.log('   ✅ Función check_sire_access_permission existe');
      }
    } else {
      console.log('   ✅ Función check_sire_access_permission existe');
      console.log('   Resultado:', data);
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
  }

  // Test 6: Check if sire_export_logs table exists
  console.log('\n6️⃣ Verificando tabla sire_export_logs:');
  try {
    const { data, error } = await supabase
      .from('sire_export_logs')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('   ❌ Tabla sire_export_logs NO existe');
      } else {
        console.log('   ✅ Tabla sire_export_logs existe');
      }
    } else {
      console.log('   ✅ Tabla sire_export_logs existe');
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
  }

  console.log('\n✅ Verificación completa\n');
}

verifyMigration().catch(console.error);
