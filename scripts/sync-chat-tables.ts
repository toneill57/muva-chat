#!/usr/bin/env tsx
/**
 * Sync chat_conversations and chat_messages tables
 */

import { createClient } from '@supabase/supabase-js';

const PROD_PROJECT_ID = 'ooaumjzaztmutltifhoq';
const STAGING_PROJECT_ID = 'rvjmwwvkhglcuqwcznph';

const prodUrl = `https://${PROD_PROJECT_ID}.supabase.co`;
const stagingUrl = `https://${STAGING_PROJECT_ID}.supabase.co`;

const prodClient = createClient(
  prodUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const stagingClient = createClient(
  stagingUrl,
  process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function syncTable(tableName: string): Promise<number> {
  console.log(`\n📋 Syncing ${tableName}...`);

  // First, clear the staging table
  const { error: deleteError } = await stagingClient
    .from(tableName)
    .delete()
    .neq('created_at', '1900-01-01'); // Delete everything

  if (deleteError) {
    console.log(`   ⚠️ Could not clear ${tableName}: ${deleteError.message}`);
  } else {
    console.log(`   ✓ Cleared ${tableName}`);
  }

  let totalCopied = 0;
  const batchSize = 100;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch from production
    const { data, error, count } = await prodClient
      .from(tableName)
      .select('*', { count: 'exact' })
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error(`   ✗ Error reading ${tableName}: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    // Insert into staging
    const { error: insertError } = await stagingClient
      .from(tableName)
      .insert(data);

    if (insertError) {
      console.error(`   ✗ Error inserting ${tableName}: ${insertError.message}`);

      // Try one by one if batch fails
      let individualSuccess = 0;
      for (const row of data) {
        try {
          const { error: singleError } = await stagingClient
            .from(tableName)
            .insert(row);

          if (!singleError) {
            individualSuccess++;
          } else {
            console.log(`      ⚠️ Row failed: ${singleError.message}`);
          }
        } catch (e) {
          // Skip this row
        }
      }

      if (individualSuccess > 0) {
        console.log(`   ⚠️ Inserted ${individualSuccess}/${data.length} rows individually`);
        totalCopied += individualSuccess;
      }
    } else {
      totalCopied += data.length;
    }

    // Progress indicator
    if (count && count > batchSize) {
      process.stdout.write(`\r   → Progress: ${totalCopied}/${count} rows`);
    }

    offset += batchSize;
    hasMore = data.length === batchSize;
  }

  console.log(`\r   ✓ ${tableName}: ${totalCopied} rows copied                    `);
  return totalCopied;
}

async function main() {
  console.log('');
  console.log('🔧 Syncing Chat Tables from Production → Staging');
  console.log('================================================');
  console.log(`📦 Source: ${PROD_PROJECT_ID} (production)`);
  console.log(`📦 Target: ${STAGING_PROJECT_ID} (staging)`);
  console.log('');

  const startTime = Date.now();
  let totalRows = 0;

  // 1. Sync chat_conversations first (parent table)
  const conversations = await syncTable('chat_conversations');
  totalRows += conversations;

  // 2. Sync chat_messages (depends on chat_conversations)
  const messages = await syncTable('chat_messages');
  totalRows += messages;

  const duration = Math.round((Date.now() - startTime) / 1000);

  // Verification
  console.log('\n🔍 Verification...');

  const tables = ['chat_conversations', 'chat_messages'];

  for (const table of tables) {
    const { count: prodCount } = await prodClient
      .from(table)
      .select('*', { count: 'exact', head: true });

    const { count: stagingCount } = await stagingClient
      .from(table)
      .select('*', { count: 'exact', head: true });

    const match = prodCount === stagingCount;
    const icon = match ? '✅' : '⚠️';
    console.log(`   ${icon} ${table}: Prod=${prodCount}, Staging=${stagingCount}`);
  }

  // Summary
  console.log('');
  console.log('==========================================');
  console.log('✅ Chat Tables Sync Complete!');
  console.log(`   Total rows copied: ${totalRows.toLocaleString()}`);
  console.log(`   Duration: ${duration} seconds`);
  console.log('==========================================');
  console.log('');
}

// Validate environment
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not set');
  console.error('   Run: source .env.local');
  process.exit(1);
}

// Run
main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});