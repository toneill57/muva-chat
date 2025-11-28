import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const BRANCH_URL = 'https://bddcvjoeoiekzfetvxoe.supabase.co'; // NEW TST environment
const BRANCH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0ZnNsc3JrZW1sZnFqcHprc2lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDM1Njg1MSwiZXhwIjoyMDQ1OTMyODUxfQ.hZBYzAr0DWd_ZWzHgY4D4b1D7iOQQc7nX4wIh7RsXrc';

const supabase = createClient(BRANCH_URL, BRANCH_KEY);

async function applySQL(sql: string, label: string) {
  const sep = '='.repeat(80);
  console.log(sep);
  console.log(label);
  console.log(sep);
  console.log('Size:', (sql.length / 1024).toFixed(1), 'KB');
  console.log('Executing...');
  
  const start = Date.now();
  const result = await supabase.rpc('execute_sql', { query: sql });
  
  if (result.error) {
    console.error('FAILED:', result.error.message);
    return false;
  }
  
  console.log('SUCCESS (', ((Date.now() - start) / 1000).toFixed(1), 's)');
  return true;
}

async function main() {
  const migrationsDir = join('/Users/oneill/Sites/apps/muva-chat', 'migrations', 'backup-2025-10-31');
  
  // File 11: Extract and apply muva_content only (sire_content already done)
  console.log('\n FILE 11: Applying muva_content section');
  const file11 = readFileSync(join(migrationsDir, '11-data-catalog.sql'), 'utf-8');
  const muvaStart = file11.indexOf('-- TABLE: muva_content');
  const commitIdx = file11.lastIndexOf('COMMIT;');
  const muvaSQL = 'BEGIN;\n' + file11.substring(muvaStart, commitIdx) + '\nCOMMIT;';
  
  if (!await applySQL(muvaSQL, 'File 11: muva_content (742 rows)')) {
    process.exit(1);
  }
  
  // File 12: accommodation_units + other operational data
  console.log('\n FILE 12: Applying operational data');
  const file12 = readFileSync(join(migrationsDir, '12-data-operations.sql'), 'utf-8');
  if (!await applySQL(file12, 'File 12: Operations (accommodation_units, etc)')) {
    process.exit(1);
  }
  
  // File 13: reservations data
  console.log('\n FILE 13: Applying reservations data');
  const file13 = readFileSync(join(migrationsDir, '13-data-reservations.sql'), 'utf-8');
  if (!await applySQL(file13, 'File 13: Reservations (CRITICAL - FK test)')) {
    process.exit(1);
  }
  
  // Validation
  console.log('\n VALIDATION');
  const tables = [
    'sire_content',
    'muva_content',
    'accommodation_units',
    'guest_reservations',
    'reservation_accommodations'
  ];
  
  for (const table of tables) {
    const result = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log('  ' + table.padEnd(30), (result.count || 0).toString().padStart(5), 'rows');
  }
  
  // FK Integrity Check
  console.log('\n FK INTEGRITY CHECK (CRITICAL)');
  const fkCheck = await supabase.rpc('execute_sql', {
    query: 'SELECT COUNT(*) as orphaned_count FROM reservation_accommodations ra LEFT JOIN accommodation_units au ON ra.accommodation_unit_id = au.id WHERE au.id IS NULL;'
  });
  
  if (fkCheck.data && fkCheck.data[0]) {
    const orphaned = fkCheck.data[0].orphaned_count;
    if (orphaned === 0) {
      console.log('  PASS: 0 orphaned records');
    } else {
      console.log('  FAIL:', orphaned, 'orphaned records');
      process.exit(1);
    }
  }
  
  console.log('\n ALL MIGRATIONS APPLIED SUCCESSFULLY');
}

main().catch(err => {
  console.error('EXCEPTION:', err.message);
  process.exit(1);
});
