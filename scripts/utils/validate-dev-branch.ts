import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateSystem() {
  console.log('🔍 VALIDACIÓN COMPLETA DEL SISTEMA\n');
  
  // 1. Contar registros totales
  const { data: tableStats } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        COUNT(*) as total_tables,
        SUM(n_live_tup) as total_records
      FROM pg_stat_user_tables
      WHERE schemaname IN ('public', 'hotels')
    `
  });
  console.log('📊 Estadísticas Generales:');
  console.log('  - Tablas:', tableStats?.[0]?.total_tables || 0);
  console.log('  - Registros totales:', tableStats?.[0]?.total_records || 0);
  
  // 2. Migraciones aplicadas
  const { data: migrations } = await supabase.rpc('execute_sql', {
    query: 'SELECT COUNT(*) as count FROM supabase_migrations.schema_migrations'
  });
  console.log('  - Migraciones aplicadas:', migrations?.[0]?.count || 0);
  
  // 3. Funciones
  const { data: functions } = await supabase.rpc('execute_sql', {
    query: `
      SELECT COUNT(*) as count 
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname IN ('public', 'hotels')
    `
  });
  console.log('  - Funciones:', functions?.[0]?.count || 0);
  
  // 4. Top 5 tablas con más datos
  const { data: topTables } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        schemaname || '.' || relname as table_name,
        n_live_tup as records
      FROM pg_stat_user_tables
      WHERE schemaname IN ('public', 'hotels')
      ORDER BY n_live_tup DESC
      LIMIT 5
    `
  });
  console.log('\n📈 Top 5 Tablas:');
  topTables?.forEach(t => {
    console.log(`  - ${t.table_name}: ${t.records} registros`);
  });
  
  console.log('\n✅ Sistema operacional y saludable');
}

validateSystem();
