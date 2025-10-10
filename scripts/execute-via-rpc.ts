import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL(sqlFile: string) {
  console.log(`🔧 Ejecutando ${sqlFile} via RPC...\n`);

  const sql = readFileSync(sqlFile, 'utf-8');

  // Intentar ejecutar via execute_ddl RPC
  const { data, error } = await supabase.rpc('execute_ddl', {
    sql_query: sql
  });

  if (error) {
    if (error.message.includes('does not exist')) {
      console.error('❌ La función execute_ddl NO existe todavía.\n');
      console.error('SOLUCIÓN:');
      console.error('1. Ejecuta scripts/CREATE_DDL_EXECUTOR.sql en Supabase Dashboard');
      console.error('2. Vuelve a ejecutar este script\n');
      process.exit(1);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  if (data && data.startsWith('ERROR:')) {
    console.error('❌', data);
    process.exit(1);
  }

  console.log('✅', data);
  console.log('');
  return true;
}

// Main
const sqlFile = process.argv[2] || 'scripts/FIX_FINAL_get_sire_guest_data.sql';

executeSQL(sqlFile)
  .then(() => {
    console.log('🎉 SQL ejecutado correctamente!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
  });
