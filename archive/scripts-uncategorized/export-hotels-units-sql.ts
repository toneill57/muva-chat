import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const prod = createClient(
  'https://ooaumjzaztmutltifhoq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc'
);

const escapeValue = (val: any, columnName?: string): string => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    // Check if it's an array - could be text[] or jsonb
    if (Array.isArray(val)) {
      // Only 'tags' is text[] in hotels.accommodation_units
      const textArrayColumns = ['tags'];
      if (columnName && textArrayColumns.includes(columnName)) {
        // PostgreSQL text array format: ARRAY['item1', 'item2']
        if (val.length === 0) return 'ARRAY[]::text[]';
        const items = val.map(item => `'${String(item).replace(/'/g, "''")}'`).join(',');
        return `ARRAY[${items}]::text[]`;
      }
    }
    // Default to jsonb for other objects
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
};

async function exportHotelsAccommodationUnits() {
  console.log('Fetching hotels.accommodation_units from production...');

  const { data: rows, error } = await prod.rpc('execute_sql', {
    query: 'SELECT * FROM hotels.accommodation_units ORDER BY tenant_id, id'
  });

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (!rows || rows.length === 0) {
    console.log('No data found');
    return;
  }

  console.log(`Found ${rows.length} rows`);

  const columns = Object.keys(rows[0]);
  let sql = `-- ========================================\n`;
  sql += `-- hotels.accommodation_units\n`;
  sql += `-- ${rows.length} rows from production\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- ========================================\n\n`;

  for (const row of rows) {
    const values = columns.map(col => escapeValue(row[col], col)).join(', ');
    sql += `INSERT INTO hotels.accommodation_units (${columns.join(', ')}) VALUES (${values});\n`;
  }

  fs.writeFileSync('/tmp/hotels-accommodation-units.sql', sql);
  console.log('✅ SQL written to /tmp/hotels-accommodation-units.sql');
}

exportHotelsAccommodationUnits().catch(console.error);
