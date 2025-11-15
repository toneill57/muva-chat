import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL_STAGING = 'https://ztfslsrkemlfqjpzksir.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_STAGING!;

if (!SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY_STAGING not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL_STAGING, SERVICE_KEY);

async function applySQLFile(filePath: string): Promise<void> {
  const fileName = path.basename(filePath);
  console.log(`\n========================================`);
  console.log(`Applying: ${fileName}`);
  console.log(`========================================`);
  
  const sql = fs.readFileSync(filePath, 'utf-8');
  const lines = sql.split('\n').length;
  const size = (sql.length / 1024).toFixed(1);
  
  console.log(`File stats: ${lines} lines, ${size}KB`);
  console.log(`Executing...`);
  
  const startTime = Date.now();
  
  const { data, error } = await supabase.rpc('execute_sql', {
    query: sql
  });
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  if (error) {
    console.error(`\nFAILED after ${duration}s`);
    console.error(`Error: ${error.message}`);
    throw error;
  }
  
  console.log(`SUCCESS in ${duration}s`);
  console.log(`Result:`, JSON.stringify(data).substring(0, 200));
}

async function main() {
  const file = process.argv[2];
  
  if (!file) {
    console.error('Usage: pnpm dlx tsx scripts/apply-large-migration.ts <filepath>');
    process.exit(1);
  }
  
  await applySQLFile(file);
}

main().catch((err) => {
  console.error('\nMIGRATION FAILED:', err.message);
  process.exit(1);
});
