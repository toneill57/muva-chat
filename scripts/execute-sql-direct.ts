import { Client } from 'pg';
import { readFileSync } from 'fs';

// Supabase connection string format:
// postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

const SUPABASE_PROJECT_REF = 'ooaumjzaztmutltifhoq';
const SUPABASE_PASSWORD = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_PASSWORD) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

// Connection using service_role key as password
const connectionString = `postgresql://postgres.${SUPABASE_PROJECT_REF}:${SUPABASE_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

async function executeSQLFile(filePath: string) {
  const client = new Client({ connectionString });

  try {
    console.log('🔌 Conectando a Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado\n');

    console.log(`📄 Leyendo SQL de: ${filePath}`);
    const sql = readFileSync(filePath, 'utf-8');

    console.log('⚙️  Ejecutando SQL...\n');
    const result = await client.query(sql);

    console.log('✅ SQL ejecutado correctamente');
    console.log('   Comando:', result.command);
    console.log('   Filas afectadas:', result.rowCount || 0);
    console.log('');

    return true;
  } catch (error: any) {
    console.error('❌ Error ejecutando SQL:');
    console.error('   Mensaje:', error.message);
    if (error.position) {
      console.error('   Posición:', error.position);
    }
    if (error.hint) {
      console.error('   Sugerencia:', error.hint);
    }
    console.error('');
    return false;
  } finally {
    await client.end();
  }
}

// Main execution
const sqlFile = process.argv[2] || 'scripts/FIX_FINAL_get_sire_guest_data.sql';

console.log('🚀 Ejecutor Directo de SQL para Supabase\n');
console.log(`Archivo: ${sqlFile}\n`);

executeSQLFile(sqlFile)
  .then((success) => {
    if (success) {
      console.log('🎉 ¡Ejecución exitosa!');
      process.exit(0);
    } else {
      console.log('❌ La ejecución falló');
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
  });
