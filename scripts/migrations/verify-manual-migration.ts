import { createClient } from '@supabase/supabase-js';

const staging = createClient(
  'https://hoaiwcueleiemeplrurv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvYWl3Y3VlbGVpZW1lcGxydXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ3ODMxNiwiZXhwIjoyMDc4MDU0MzE2fQ.ddsf2Jl8--jbN05avrNjxLr4335VGTX-Xg3RQvH6IE4'
);

async function verify() {
  console.log('=== VERIFICACIÓN DE MIGRACIÓN MANUAL ===\n');

  // 1. Verificar hotels.accommodation_units
  console.log('1. Verificando hotels.accommodation_units...');
  const { data: hotelsCount } = await staging.rpc('execute_sql', {
    query: 'SELECT COUNT(*) as count FROM hotels.accommodation_units'
  });

  const { data: hotelsByTenant } = await staging.rpc('execute_sql', {
    query: `SELECT
      tenant_id,
      COUNT(*) as count
    FROM hotels.accommodation_units
    GROUP BY tenant_id
    ORDER BY tenant_id`
  });

  console.log(`   Total: ${hotelsCount?.[0]?.count || 0} filas (esperado: 26)`);
  console.log('   Por tenant:');
  console.table(hotelsByTenant);

  // 2. Verificar accommodation_units_manual_chunks
  console.log('\n2. Verificando accommodation_units_manual_chunks...');
  const { count: chunksCount } = await staging
    .from('accommodation_units_manual_chunks')
    .select('*', { count: 'exact', head: true });

  const { data: chunksByTenant } = await staging
    .from('accommodation_units_manual_chunks')
    .select('tenant_id')
    .then(({ data }) => {
      const grouped = data?.reduce((acc: any, row: any) => {
        acc[row.tenant_id] = (acc[row.tenant_id] || 0) + 1;
        return acc;
      }, {});
      return { data: Object.entries(grouped || {}).map(([tenant_id, count]) => ({ tenant_id, count })) };
    });

  console.log(`   Total: ${chunksCount || 0} filas (esperado: 219)`);
  console.log('   Por tenant:');
  console.table(chunksByTenant);

  // 3. Verificar embeddings NULL
  console.log('\n3. Verificando embeddings NULL...');
  const { data: embeddingsStatus } = await staging
    .from('accommodation_units_manual_chunks')
    .select('id, embedding, embedding_balanced, embedding_fast')
    .limit(5);

  const nullCount = embeddingsStatus?.filter(row =>
    row.embedding === null &&
    row.embedding_balanced === null &&
    row.embedding_fast === null
  ).length || 0;

  console.log(`   Primeras 5 filas con embeddings NULL: ${nullCount}/5`);
  console.log(`   ⚠️  Todos los embeddings deben estar NULL (pendiente regeneración)`);

  // 4. Verificar FK relationships
  console.log('\n4. Verificando relaciones FK...');
  const { data: fkCheck } = await staging
    .from('accommodation_units_manual_chunks')
    .select(`
      id,
      accommodation_unit_id,
      tenant_id
    `)
    .limit(3);

  console.log('   Primeras 3 filas de manual_chunks:');
  console.table(fkCheck);

  // Verificar que esos accommodation_unit_id existen en hotels.accommodation_units
  if (fkCheck && fkCheck.length > 0) {
    const unitIds = fkCheck.map(row => row.accommodation_unit_id);
    const { data: unitsExist } = await staging.rpc('execute_sql', {
      query: `SELECT id, name FROM hotels.accommodation_units WHERE id IN ('${unitIds.join("','")}')`
    });

    console.log('\n   Units referenciados en hotels.accommodation_units:');
    console.table(unitsExist);
  }

  // 5. Resumen final
  console.log('\n=== RESUMEN FINAL ===');
  const hotelsOk = hotelsCount?.[0]?.count === 26;
  const chunksOk = chunksCount === 219;

  console.log(`✅ hotels.accommodation_units: ${hotelsOk ? 'OK' : 'ERROR'} (${hotelsCount?.[0]?.count}/26)`);
  console.log(`✅ accommodation_units_manual_chunks: ${chunksOk ? 'OK' : 'ERROR'} (${chunksCount}/219)`);
  console.log(`⚠️  Embeddings: Pendiente regeneración (todos NULL)`);

  if (hotelsOk && chunksOk) {
    console.log('\n🎉 MIGRACIÓN MANUAL COMPLETADA EXITOSAMENTE!');
    console.log('\nPróximos pasos:');
    console.log('1. Regenerar embeddings para accommodation_units_manual_chunks');
    console.log('2. Testear guest chat en staging');
  } else {
    console.log('\n⚠️  ADVERTENCIA: Algunos conteos no coinciden con lo esperado');
  }
}

verify().catch(console.error);
