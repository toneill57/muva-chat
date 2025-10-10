import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSireTables() {
  console.log('🔍 Verificando tablas SIRE en la base de datos...\n');

  const tables = [
    'sire_document_types',
    'sire_countries',
    'divipola_cities',
    'guest_reservations',
    'sire_export_logs'
  ];

  for (const tableName of tables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log(`❌ ${tableName} - NO EXISTE`);
        } else {
          console.log(`⚠️  ${tableName} - Error: ${error.message}`);
        }
      } else {
        const count = data?.length || 0;
        console.log(`✅ ${tableName} - Existe (${count} filas en muestra)`);
      }
    } catch (err: any) {
      console.log(`❌ ${tableName} - Error: ${err.message}`);
    }
  }

  console.log('\n📊 Resumen:');
  console.log('Si falta alguna tabla, necesitamos ejecutar las migraciones faltantes.\n');
}

checkSireTables();
