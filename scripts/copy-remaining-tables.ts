#!/usr/bin/env tsx
/**
 * Copy Remaining Production Data to Staging
 * 
 * Systematically copies all remaining tables from production to staging,
 * handling FK dependencies, batching, and large embedding columns.
 * 
 * Usage: pnpm dlx tsx scripts/copy-remaining-tables.ts
 */

import { createClient } from '@supabase/supabase-js';

// Production DB
const prodClient = createClient(
  'https://ooaumjzaztmutltifhoq.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Staging DB  
const stagingClient = createClient(
  'https://qlvkgniqcoisbnwwjfte.supabase.co',
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TableCopyPlan {
  name: string;
  depth: number;
  rowCount: number;
  batchSize: number;
  skipEmbeddings?: boolean;
}

// Organized by FK dependency depth
const copyPlan: TableCopyPlan[] = [
  // === DEPTH 0: ROOT TABLES ===
  { name: 'guest_reservations', depth: 0, rowCount: 104, batchSize: 50 },
  { name: 'calendar_events', depth: 0, rowCount: 74, batchSize: 50 }, // SELF-REF
  
  // Large embedding tables (copy without embeddings first, update separately)
  { name: 'code_embeddings', depth: 0, rowCount: 4333, batchSize: 500, skipEmbeddings: true },
  { name: 'muva_content', depth: 0, rowCount: 742, batchSize: 100, skipEmbeddings: true },
  { name: 'sire_content', depth: 0, rowCount: 8, batchSize: 10, skipEmbeddings: true },
  
  // === DEPTH 1: TENANT-DEPENDENT TABLES ===
  { name: 'user_tenant_permissions', depth: 1, rowCount: 1, batchSize: 10 },
  { name: 'hotels', depth: 1, rowCount: 3, batchSize: 10 },
  { name: 'staff_users', depth: 1, rowCount: 6, batchSize: 10 }, // SELF-REF
  { name: 'hotel_operations', depth: 1, rowCount: 10, batchSize: 20 },
  { name: 'integration_configs', depth: 1, rowCount: 3, batchSize: 10 },
  { name: 'sync_history', depth: 1, rowCount: 85, batchSize: 50 },
  { name: 'job_logs', depth: 1, rowCount: 39, batchSize: 50 },
  { name: 'accommodation_units_public', depth: 1, rowCount: 153, batchSize: 50 },
  { name: 'accommodation_units_manual_chunks', depth: 1, rowCount: 219, batchSize: 100 },
  { name: 'prospective_sessions', depth: 1, rowCount: 412, batchSize: 100 },
  { name: 'guest_conversations', depth: 1, rowCount: 112, batchSize: 50 },
  { name: 'chat_conversations', depth: 1, rowCount: 2, batchSize: 10 },
  { name: 'reservation_accommodations', depth: 1, rowCount: 93, batchSize: 50 },
  { name: 'ics_feed_configurations', depth: 1, rowCount: 9, batchSize: 10 },
  { name: 'staff_conversations', depth: 1, rowCount: 43, batchSize: 50 },
  
  // === DEPTH 2: CHILD TABLES ===
  { name: 'accommodation_units', depth: 2, rowCount: 2, batchSize: 10 },
  { name: 'accommodation_units_manual', depth: 2, rowCount: 8, batchSize: 10 },
  { name: 'conversation_memory', depth: 2, rowCount: 10, batchSize: 20 },
  { name: 'chat_messages', depth: 2, rowCount: 319, batchSize: 100 },
  { name: 'staff_messages', depth: 2, rowCount: 58, batchSize: 50 },
];

async function getTableColumns(tableName: string): Promise<string[]> {
  const { data, error } = await prodClient.rpc('execute_sql', {
    query: `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `
  });
  
  if (error) throw error;
  return data.map((row: any) => row.column_name);
}

async function copyTable(plan: TableCopyPlan): Promise<void> {
  console.log(`\n📋 Copying ${plan.name} (${plan.rowCount} rows, batch size: ${plan.batchSize})...`);
  
  const columns = await getTableColumns(plan.name);
  
  // Exclude embedding columns if requested
  const copyColumns = plan.skipEmbeddings 
    ? columns.filter(col => !col.includes('embedding'))
    : columns;
  
  const columnList = copyColumns.join(', ');
  let copiedRows = 0;
  
  for (let offset = 0; offset < plan.rowCount; offset += plan.batchSize) {
    console.log(`  Batch ${Math.floor(offset / plan.batchSize) + 1}: rows ${offset + 1}-${Math.min(offset + plan.batchSize, plan.rowCount)}`);
    
    // Read from production
    const { data: rows, error: readError } = await prodClient
      .from(plan.name)
      .select(columnList)
      .range(offset, offset + plan.batchSize - 1);
    
    if (readError) {
      console.error(`  ❌ Error reading: ${readError.message}`);
      throw readError;
    }
    
    if (!rows || rows.length === 0) {
      console.log(`  ⚠️  No rows returned`);
      break;
    }
    
    // Insert into staging
    const { error: writeError } = await stagingClient
      .from(plan.name)
      .insert(rows);
    
    if (writeError) {
      console.error(`  ❌ Error writing: ${writeError.message}`);
      throw writeError;
    }
    
    copiedRows += rows.length;
    console.log(`  ✅ ${rows.length} rows copied (total: ${copiedRows}/${plan.rowCount})`);
  }
  
  // Verify count
  const { count, error: countError } = await stagingClient
    .from(plan.name)
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error(`  ❌ Error verifying count: ${countError.message}`);
  } else {
    console.log(`  ✅ VERIFIED: ${count} rows in staging`);
  }
}

async function main() {
  console.log('🚀 Starting production → staging data copy\n');
  console.log(`Total tables to copy: ${copyPlan.length}`);
  console.log(`Total rows to copy: ${copyPlan.reduce((sum, p) => sum + p.rowCount, 0)}`);
  
  let completedTables = 0;
  let completedRows = 0;
  
  for (const plan of copyPlan) {
    try {
      await copyTable(plan);
      completedTables++;
      completedRows += plan.rowCount;
      
      console.log(`\n📊 Progress: ${completedTables}/${copyPlan.length} tables, ${completedRows} rows copied`);
    } catch (error) {
      console.error(`\n❌ FAILED to copy ${plan.name}:`, error);
      console.log('\n⏸️  Pausing at this table. Fix the issue and restart.');
      process.exit(1);
    }
  }
  
  console.log('\n✅ All tables copied successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Run embedding update script for large tables');
  console.log('2. Verify FK integrity');
  console.log('3. Test RLS policies');
}

main().catch(console.error);
