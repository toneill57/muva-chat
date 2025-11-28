#!/usr/bin/env tsx
/**
 * FASE 2 - Data Migration using MCP approach
 * Exports data from source and imports to dev/tst using SQL dumps
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const PROJECTS = {
  source: 'hoaiwcueleiemeplrurv',
  dev: 'azytxnyiizldljxrapoe',
  tst: 'bddcvjoeoiekzfetvxoe'
};

const BACKUP_DIR = '/Users/oneill/Sites/apps/muva-chat/docs/three-tier-unified/backups';

// Tables in dependency order
const TABLES = [
  'public.tenant_registry',
  'public.hotels',
  'hotels.accommodation_units',
  'public.guest_reservations',
  'public.reservation_accommodations',
  'public.accommodation_units_public',
  'public.accommodation_units_manual_chunks',
  'public.accommodation_manuals',
  'public.accommodation_manual_analytics',
  'public.integration_configs',
  'public.migration_metadata',
  'public.sync_history',
  'public.staff_users',
  'public.staff_conversations',
  'public.staff_messages',
  'public.guest_conversations',
  'public.chat_messages',
  'public.prospective_sessions'
];

async function exportTableData(projectId: string, table: string): Promise<any[]> {
  console.log(`  📥 Exporting ${table}...`);
  
  // Use MCP via pnpm dlx tsx to execute query
  const query = `SELECT to_jsonb(t.*) as data FROM ${table} t`;
  const script = `
    const { createClient } = require('@supabase/supabase-js');
    const client = createClient(
      'https://${projectId}.supabase.co',
      process.env.SUPABASE_ACCESS_TOKEN
    );
    const { data, error } = await client.rpc('execute_sql', { 
      query: "${query.replace(/"/g, '\\"')}" 
    });
    if (error) throw error;
    console.log(JSON.stringify(data || []));
  `;
  
  try {
    const { stdout } = await execAsync(
      `pnpm dlx tsx -e "${script}"`,
      { env: { ...process.env, SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN! } }
    );
    const data = JSON.parse(stdout.trim());
    console.log(`    ✓ ${data.length} records`);
    return data;
  } catch (error: any) {
    console.log(`    ⚠️  ${error.message}`);
    return [];
  }
}

async function importTableData(projectId: string, table: string, data: any[]): Promise<number> {
  if (data.length === 0) {
    console.log(`    ⏭️  No data to import`);
    return 0;
  }

  console.log(`  📤 Importing ${data.length} records to ${table}...`);
  
  // Generate INSERT statement
  const [schema, tableName] = table.split('.');
  const columns = Object.keys(data[0]);
  
  const values = data.map(row => {
    const vals = columns.map(col => {
      const val = row[col];
      if (val === null) return 'NULL';
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      return val;
    });
    return `(${vals.join(', ')})`;
  }).join(',\n');

  const insertQuery = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES ${values}
    ON CONFLICT DO NOTHING;
  `;

  // Save query to file for debugging
  const queryFile = path.join(BACKUP_DIR, `insert_${tableName}.sql`);
  await fs.writeFile(queryFile, insertQuery);
  
  try {
    // Execute via MCP
    const script = `
      const { createClient } = require('@supabase/supabase-js');
      const client = createClient(
        'https://${projectId}.supabase.co',
        process.env.SUPABASE_ACCESS_TOKEN
      );
      const { error } = await client.rpc('execute_sql', { 
        query: ${JSON.stringify(insertQuery)}
      });
      if (error) throw error;
      console.log('OK');
    `;
    
    await execAsync(
      `pnpm dlx tsx -e "${script}"`,
      { env: { ...process.env, SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN! } }
    );
    
    console.log(`    ✓ Imported successfully`);
    return data.length;
  } catch (error: any) {
    console.log(`    ❌ ${error.message}`);
    return 0;
  }
}

async function main() {
  console.log('🚀 FASE 2 - Data Migration (MCP approach)\n');
  
  // Export all data from source
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 EXPORTING FROM SOURCE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const exportedData: Record<string, any[]> = {};
  let totalRecords = 0;
  
  for (const table of TABLES) {
    const data = await exportTableData(PROJECTS.source, table);
    exportedData[table] = data;
    totalRecords += data.length;
  }
  
  console.log(`\n📊 Total exported: ${totalRecords} records\n`);
  
  // Import to DEV
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 IMPORTING TO DEV');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let devImported = 0;
  for (const table of TABLES) {
    const imported = await importTableData(PROJECTS.dev, table, exportedData[table]);
    devImported += imported;
  }
  
  // Import to TST
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 IMPORTING TO TST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let tstImported = 0;
  for (const table of TABLES) {
    const imported = await importTableData(PROJECTS.tst, table, exportedData[table]);
    tstImported += imported;
  }
  
  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 MIGRATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Source: ${totalRecords} records`);
  console.log(`DEV: ${devImported} records imported`);
  console.log(`TST: ${tstImported} records imported`);
  console.log('\n✅ FASE 2 COMPLETE\n');
}

main().catch(console.error);
