#!/usr/bin/env tsx
/**
 * Execute Phase 2 VACUUM operations with before/after tracking
 */

import { readFileSync } from 'fs';

const PROJECT_ID = 'ooaumjzaztmutltifhoq';

interface DeadTuplesResult {
  table_name: string;
  n_dead_tup: number;
  n_live_tup: number;
  dead_pct: number | null;
}

async function queryDatabase(sql: string): Promise<any> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('SUPABASE_ACCESS_TOKEN not found');
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    }
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
  }
  return result;
}

async function getDeadTuples(tables: string[]): Promise<DeadTuplesResult[]> {
  const tableList = tables.map(t => `'${t}'`).join(', ');
  const sql = `
    SELECT schemaname || '.' || relname as table_name,
           n_dead_tup, n_live_tup,
           ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 1) as dead_pct
    FROM pg_stat_user_tables
    WHERE schemaname = 'public' 
      AND relname IN (${tableList})
    ORDER BY dead_pct DESC NULLS LAST;
  `;
  
  return await queryDatabase(sql);
}

async function executeVacuum(sqlFile: string): Promise<void> {
  const sql = readFileSync(sqlFile, 'utf-8');
  console.log(`  Executing: ${sql.trim()}`);
  await queryDatabase(sql);
}

async function main() {
  console.log('========================================');
  console.log('PHASE 2 - VACUUM OPERATIONS (HIGH PRIORITY)');
  console.log('========================================\n');

  const operations = [
    { table: 'prospective_sessions', file: '/tmp/phase2-vacuum-prospective_sessions.sql', expectedBefore: 24 },
    { table: 'guest_reservations', file: '/tmp/phase2-vacuum-guest_reservations.sql', expectedBefore: 39.4 },
    { table: 'reservation_accommodations', file: '/tmp/phase2-vacuum-reservation_accommodations.sql', expectedBefore: 28 },
    { table: 'guest_conversations', file: '/tmp/phase2-vacuum-guest_conversations.sql', expectedBefore: 22.3 },
    { table: 'muva_content', file: '/tmp/phase2-vacuum-muva_content.sql', expectedBefore: 93.7 },
    { table: 'sire_cities', file: '/tmp/phase2-analyze-sire_cities.sql', expectedBefore: 0 }
  ];

  const allTables = operations.map(op => op.table);

  // BEFORE state
  console.log('BEFORE VACUUM - Dead Tuples Status:');
  const before = await getDeadTuples(allTables);
  console.table(before);
  console.log('');

  // Execute each VACUUM
  let totalDeadTuplesRemoved = 0;

  for (const op of operations) {
    console.log(`\n[${op.table}] Expected bloat: ${op.expectedBefore}%`);
    
    const beforeRow = before.find(r => r.table_name === `public.${op.table}`);
    if (beforeRow) {
      console.log(`  Before: ${beforeRow.n_dead_tup.toLocaleString()} dead tuples (${beforeRow.dead_pct}%)`);
    }

    await executeVacuum(op.file);
    console.log('  ✅ VACUUM completed');

    // Check after
    const after = await getDeadTuples([op.table]);
    const afterRow = after[0];
    
    if (beforeRow && afterRow) {
      const removed = beforeRow.n_dead_tup - afterRow.n_dead_tup;
      totalDeadTuplesRemoved += removed;
      console.log(`  After: ${afterRow.n_dead_tup.toLocaleString()} dead tuples (${afterRow.dead_pct ?? 0}%)`);
      console.log(`  Removed: ${removed.toLocaleString()} dead tuples`);
    }
  }

  // AFTER state
  console.log('\n========================================');
  console.log('AFTER VACUUM - Final Status:');
  const finalState = await getDeadTuples(allTables);
  console.table(finalState);

  console.log('\n========================================');
  console.log('SUMMARY:');
  console.log(`Total dead tuples removed: ${totalDeadTuplesRemoved.toLocaleString()}`);
  console.log('All Phase 2 VACUUM operations completed successfully!');
  console.log('========================================\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
