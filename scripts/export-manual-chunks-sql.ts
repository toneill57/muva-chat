import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const prod = createClient(
  'https://ooaumjzaztmutltifhoq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc'
);

const escapeValue = (val: any): string => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    // Special handling for vectors
    if (val.constructor && val.constructor.name === 'Array') {
      return `'[${val.join(',')}]'::vector`;
    }
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
};

async function exportManualChunks() {
  console.log('Fetching accommodation_units_manual_chunks from production...');

  // Need to use paginated approach due to size
  const { data: rows, error } = await prod
    .from('accommodation_units_manual_chunks')
    .select('*')
    .order('tenant_id', { ascending: true });

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (!rows || rows.length === 0) {
    console.log('No data found');
    return;
  }

  console.log(`Found ${rows.length} rows`);

  // Exclude vector columns (too large for SQL file)
  const excludeColumns = ['embedding', 'embedding_balanced', 'embedding_fast'];
  const allColumns = Object.keys(rows[0]);
  const columns = allColumns.filter(col => !excludeColumns.includes(col));

  let sql = `-- ========================================\n`;
  sql += `-- accommodation_units_manual_chunks\n`;
  sql += `-- ${rows.length} rows from production\n`;
  sql += `-- NOTE: Vector columns (embedding, embedding_balanced, embedding_fast) excluded\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- ========================================\n\n`;

  for (const row of rows) {
    const values = columns.map(col => escapeValue(row[col])).join(', ');
    sql += `INSERT INTO accommodation_units_manual_chunks (${columns.join(', ')}) VALUES (${values});\n`;
  }

  fs.writeFileSync('/tmp/accommodation-units-manual-chunks.sql', sql);
  console.log('✅ SQL written to /tmp/accommodation-units-manual-chunks.sql');
  console.log('⚠️  Remember: Vector columns were excluded (will need regeneration)');
}

exportManualChunks().catch(console.error);
