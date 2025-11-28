#!/usr/bin/env tsx
/**
 * FASE 2 - Data Migration Script
 * Migrates data from staging (hoaiwcueleiemeplrurv) to dev and tst environments
 */

import { createClient } from '@supabase/supabase-js';

const PROJECTS = {
  source: 'hoaiwcueleiemeplrurv',
  dev: 'azytxnyiizldljxrapoe',
  tst: 'bddcvjoeoiekzfetvxoe'
};

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;

// Tables to migrate (in order to respect foreign key dependencies)
const TABLES_TO_MIGRATE = [
  { schema: 'public', name: 'tenant_registry' },
  { schema: 'public', name: 'hotels' },
  { schema: 'hotels', name: 'accommodation_units' },
  { schema: 'public', name: 'guest_reservations' },
  { schema: 'public', name: 'reservation_accommodations' },
  { schema: 'public', name: 'accommodation_units_public' },
  { schema: 'public', name: 'accommodation_units_manual_chunks' },
  { schema: 'public', name: 'accommodation_manuals' },
  { schema: 'public', name: 'accommodation_manual_analytics' },
  { schema: 'public', name: 'integration_configs' },
  { schema: 'public', name: 'migration_metadata' },
  { schema: 'public', name: 'sync_history' },
  { schema: 'public', name: 'staff_users' },
  { schema: 'public', name: 'staff_conversations' },
  { schema: 'public', name: 'staff_messages' },
  { schema: 'public', name: 'guest_conversations' },
  { schema: 'public', name: 'chat_messages' },
  { schema: 'public', name: 'prospective_sessions' }
];

async function executeSQL(projectId: string, query: string) {
  const url = `https://api.supabase.com/v1/projects/${projectId}/database/query`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }

  return response.json();
}

async function getTableData(projectId: string, schema: string, table: string) {
  const query = `SELECT * FROM ${schema}.${table}`;
  return executeSQL(projectId, query);
}

async function getRowCount(projectId: string, schema: string, table: string) {
  const query = `SELECT COUNT(*) as count FROM ${schema}.${table}`;
  const result = await executeSQL(projectId, query);
  return parseInt(result[0]?.result?.[0]?.count || '0');
}

async function truncateTable(projectId: string, schema: string, table: string) {
  const query = `TRUNCATE TABLE ${schema}.${table} CASCADE`;
  return executeSQL(projectId, query);
}

async function insertData(projectId: string, schema: string, table: string, data: any[]) {
  if (data.length === 0) {
    console.log(`  ⏭️  No data to insert into ${schema}.${table}`);
    return;
  }

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
  });

  const query = `
    INSERT INTO ${schema}.${table} (${columns.join(', ')})
    VALUES ${values.join(',\n')}
    ON CONFLICT DO NOTHING
  `;

  return executeSQL(projectId, query);
}

async function migrateTable(
  sourceProjectId: string,
  targetProjectId: string,
  schema: string,
  table: string
) {
  console.log(`\n📦 Migrating ${schema}.${table}...`);

  // Get source data
  const sourceData = await getTableData(sourceProjectId, schema, table);
  const records = sourceData[0]?.result || [];
  
  console.log(`  📊 Source: ${records.length} records`);

  if (records.length === 0) {
    console.log(`  ✅ Skipped (no data)`);
    return { table: `${schema}.${table}`, source: 0, target: 0 };
  }

  // Insert into target
  await insertData(targetProjectId, schema, table, records);

  // Verify
  const targetCount = await getRowCount(targetProjectId, schema, table);
  console.log(`  📊 Target: ${targetCount} records`);

  if (targetCount >= records.length) {
    console.log(`  ✅ Success`);
  } else {
    console.log(`  ⚠️  Warning: Target has fewer records than source`);
  }

  return { table: `${schema}.${table}`, source: records.length, target: targetCount };
}

async function main() {
  console.log('🚀 FASE 2 - Data Migration\n');
  console.log('Source:', PROJECTS.source);
  console.log('Targets:', PROJECTS.dev, PROJECTS.tst);
  console.log('');

  // Migrate to DEV
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 MIGRATING TO DEV ENVIRONMENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const devResults = [];
  for (const { schema, name } of TABLES_TO_MIGRATE) {
    const result = await migrateTable(PROJECTS.source, PROJECTS.dev, schema, name);
    devResults.push(result);
  }

  // Migrate to TST
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 MIGRATING TO TST ENVIRONMENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const tstResults = [];
  for (const { schema, name } of TABLES_TO_MIGRATE) {
    const result = await migrateTable(PROJECTS.source, PROJECTS.tst, schema, name);
    tstResults.push(result);
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 MIGRATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const devTotal = devResults.reduce((acc, r) => acc + r.source, 0);
  const devTargetTotal = devResults.reduce((acc, r) => acc + r.target, 0);
  const tstTotal = tstResults.reduce((acc, r) => acc + r.source, 0);
  const tstTargetTotal = tstResults.reduce((acc, r) => acc + r.target, 0);

  console.log(`\nDEV: ${devTargetTotal}/${devTotal} records (${((devTargetTotal/devTotal)*100).toFixed(1)}%)`);
  console.log(`TST: ${tstTargetTotal}/${tstTotal} records (${((tstTargetTotal/tstTotal)*100).toFixed(1)}%)`);

  console.log('\n✅ FASE 2 COMPLETE\n');
}

main().catch(console.error);
