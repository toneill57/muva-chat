import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🔍 Verificando tabla sire_submissions...\n');

  try {
    // Test 1: Check if table exists and is accessible
    const { data, error, count } = await supabase
      .from('sire_submissions')
      .select('*', { count: 'exact' })
      .limit(5);

    if (error) {
      console.error('❌ Error al acceder a la tabla:', error);
      process.exit(1);
    }

    console.log('✅ Tabla sire_submissions existe y es accesible');
    console.log(`📊 Registros actuales: ${count || 0}`);

    if (data && data.length > 0) {
      console.log('\n📋 Primeros registros:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('\n📋 La tabla está vacía (esto es normal para una instalación nueva)');
    }

    // Test 2: Try to fetch with JOIN to tenant_registry
    console.log('\n🔗 Verificando JOIN con tenant_registry...');
    const { data: joinData, error: joinError } = await supabase
      .from('sire_submissions')
      .select(`
        submission_id,
        tenant_id,
        submission_date,
        status,
        reservations_count,
        tenant_registry (
          subdomain,
          nombre_comercial
        )
      `)
      .limit(5);

    if (joinError) {
      console.error('❌ Error en JOIN:', joinError);
    } else {
      console.log('✅ JOIN con tenant_registry funciona correctamente');
    }

    console.log('\n🎉 ¡Verificación completada exitosamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Recarga la página /super-admin/compliance en tu navegador');
    console.log('   2. Deberías ver "Simmer Down Guest House" con status "Never Submitted"');
    console.log('   3. Cuando haya submissions SIRE, aparecerán automáticamente');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
})();
