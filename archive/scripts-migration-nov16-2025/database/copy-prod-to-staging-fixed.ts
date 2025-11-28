#!/usr/bin/env tsx
/**
 * Copy Production Data to Staging Database - FIXED VERSION
 * 
 * Fixes:
 * 1. Exclude GENERATED columns from inserts
 * 2. Handle FK dependencies properly
 * 3. Fix syntax errors
 */

import { createClient } from '@supabase/supabase-js';

const PROD_PROJECT_ID = 'ooaumjzaztmutltifhoq';
const STAGING_PROJECT_ID = 'qlvkgniqcoisbnwwjfte';

const SUPABASE_URL_PROD = `https://${PROD_PROJECT_ID}.supabase.co`;
const SUPABASE_URL_STAGING = `https://${STAGING_PROJECT_ID}.supabase.co`;

const PROD_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STAGING_SERVICE_ROLE_KEY = process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY;

if (!PROD_SERVICE_ROLE_KEY || !STAGING_SERVICE_ROLE_KEY) {
  console.error('❌ Missing service role keys');
  process.exit(1);
}

const prodClient = createClient(SUPABASE_URL_PROD, PROD_SERVICE_ROLE_KEY);
const stagingClient = createClient(SUPABASE_URL_STAGING, STAGING_SERVICE_ROLE_KEY);

// Columns to exclude (GENERATED columns)
const EXCLUDE_COLUMNS: Record<string, string[]> = {
  'guest_reservations': ['accommodation_unit_id_key'],
};

interface CopyResult {
  table: string;
  copied: number;
  skipped: boolean;
  error?: string;
}

async function copyTableWithExclusions(
  tableName: string,
  expectedRows: number,
  useBatch: boolean = false,
  batchSize: number = 500
): Promise<CopyResult> {
  console.log(`\n📋 ${tableName} (expected: ${expectedRows} rows, batch: ${useBatch})`);

  try {
    // Check if table has data already
    const { count: existingCount } = await stagingClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (existingCount && existingCount > 0) {
      console.log(`  ⏭️  Skipping (already has ${existingCount} rows)`);
      return { table: tableName, copied: existingCount, skipped: true };
    }

    if (expectedRows === 0) {
      console.log(`  ⏭️  Skipping (empty table)`);
      return { table: tableName, copied: 0, skipped: true };
    }

    let totalCopied = 0;
    const excludeCols = EXCLUDE_COLUMNS[tableName] || [];

    if (!useBatch) {
      // Small table - copy all at once
      const { data: prodData, error: readError } = await prodClient
        .from(tableName)
        .select('*');

      if (readError) throw readError;
      if (!prodData || prodData.length === 0) {
        console.log(`  ✅ 0 rows (empty in production)`);
        return { table: tableName, copied: 0, skipped: false };
      }

      // Remove excluded columns
      const cleanData = prodData.map(row => {
        const clean = { ...row };
        excludeCols.forEach(col => delete clean[col]);
        return clean;
      });

      const { error: writeError } = await stagingClient
        .from(tableName)
        .insert(cleanData);

      if (writeError) throw writeError;

      totalCopied = cleanData.length;
      console.log(`  ✅ ${totalCopied} rows copied`);
    } else {
      // Large table - copy in batches
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: batchData, error: readError } = await prodClient
          .from(tableName)
          .select('*')
          .range(offset, offset + batchSize - 1);

        if (readError) throw readError;
        if (!batchData || batchData.length === 0) {
          hasMore = false;
          break;
        }

        // Remove excluded columns
        const cleanData = batchData.map(row => {
          const clean = { ...row };
          excludeCols.forEach(col => delete clean[col]);
          return clean;
        });

        const { error: writeError } = await stagingClient
          .from(tableName)
          .insert(cleanData);

        if (writeError) throw writeError;

        totalCopied += cleanData.length;
        console.log(`  📦 Batch ${offset}-${offset + cleanData.length}: ${cleanData.length} rows`);

        offset += batchSize;
        hasMore = batchData.length === batchSize;
      }

      console.log(`  ✅ ${totalCopied} total rows copied`);
    }

    return { table: tableName, copied: totalCopied, skipped: false };
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return { table: tableName, copied: 0, skipped: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting Production → Staging Data Copy (FIXED)');
  console.log('');

  // Tables that failed before - copy them now
  const FAILED_TABLES = [
    { name: 'ics_feed_configurations', rows: 9, batch: false },
    { name: 'guest_reservations', rows: 104, batch: false },
    { name: 'calendar_events', rows: 74, batch: false },
    { name: 'user_tenant_permissions', rows: 1, batch: false },
    { name: 'accommodation_units_manual_chunks', rows: 219, batch: false },
    { name: 'guest_conversations', rows: 112, batch: false },
    { name: 'chat_conversations', rows: 2, batch: false },
    { name: 'reservation_accommodations', rows: 93, batch: false },
    { name: 'chat_messages', rows: 319, batch: false },
  ];

  const results: CopyResult[] = [];
  let totalCopied = 0;
  let errors = 0;

  for (const table of FAILED_TABLES) {
    const result = await copyTableWithExclusions(
      table.name,
      table.rows,
      table.batch || false
    );

    results.push(result);
    if (!result.error) {
      totalCopied += result.copied;
    } else {
      errors++;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 COPY SUMMARY (FAILED TABLES RETRY)');
  console.log('='.repeat(60));
  console.log(`✅ Total rows copied: ${totalCopied}`);
  console.log(`❌ Errors: ${errors}`);

  if (errors > 0) {
    console.log('\n❌ Still failing:');
    results.filter(r => r.error).forEach(r => {
      console.log(`  - ${r.table}: ${r.error}`);
    });
  }

  console.log('\n✅ Retry complete!');
}

main().catch(console.error);
