#!/usr/bin/env tsx
/**
 * Copy ALL production data to staging
 * Handles foreign key dependencies by copying in proper order
 */

import { createClient } from '@supabase/supabase-js';

const PROD = createClient(
  'https://ooaumjzaztmutltifhoq.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAGING = createClient(
  'https://hoaiwcueleiemeplrurv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvYWl3Y3VlbGVpZW1lcGxydXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ3ODMxNiwiZXhwIjoyMDc4MDU0MzE2fQ.ddsf2Jl8--jbN05avrNjxLr4335VGTX-Xg3RQvH6IE4'
);

// Tables ordered by FK dependencies (fk_count ASC)
const TABLES = [
  // FK count = 0 (no dependencies)
  { schema: 'hotels', table: 'accommodation_units', rows: 26 },
  { schema: 'public', table: 'code_embeddings', rows: 4333 },
  { schema: 'public', table: 'muva_content', rows: 742 },
  { schema: 'public', table: 'property_relationships', rows: 1 },
  { schema: 'public', table: 'sire_cities', rows: 42 },
  { schema: 'public', table: 'sire_content', rows: 8 },
  { schema: 'public', table: 'sire_countries', rows: 45 },
  { schema: 'public', table: 'sire_document_types', rows: 4 },
  { schema: 'public', table: 'tenant_registry', rows: 3 },

  // FK count = 1
  { schema: 'hotels', table: 'policies', rows: 9 },
  { schema: 'public', table: 'accommodation_units_manual', rows: 8 },
  { schema: 'public', table: 'accommodation_units_public', rows: 151 },
  { schema: 'public', table: 'chat_conversations', rows: 2 },
  { schema: 'public', table: 'chat_messages', rows: 393 },
  { schema: 'public', table: 'guest_conversations', rows: 118 },
  { schema: 'public', table: 'guest_reservations', rows: 104 },
  { schema: 'public', table: 'hotels', rows: 3 },
  { schema: 'public', table: 'ics_feed_configurations', rows: 9 },
  { schema: 'public', table: 'integration_configs', rows: 3 },
  { schema: 'public', table: 'job_logs', rows: 39 },
  { schema: 'public', table: 'staff_conversations', rows: 45 },
  { schema: 'public', table: 'staff_messages', rows: 60 },
  { schema: 'public', table: 'sync_history', rows: 85 },

  // FK count = 2
  { schema: 'public', table: 'accommodation_units', rows: 2 },
  { schema: 'public', table: 'conversation_memory', rows: 10 },
  { schema: 'public', table: 'hotel_operations', rows: 10 },
  { schema: 'public', table: 'prospective_sessions', rows: 412 },
  { schema: 'public', table: 'reservation_accommodations', rows: 93 },
  { schema: 'public', table: 'staff_users', rows: 6 },

  // FK count = 3
  { schema: 'public', table: 'accommodation_units_manual_chunks', rows: 219 },
  { schema: 'public', table: 'calendar_events', rows: 74 },
  { schema: 'public', table: 'user_tenant_permissions', rows: 1 },
];

async function copyTable(schema: string, table: string, expectedRows: number) {
  const fullName = schema === 'public' ? table : `${schema}.${table}`;
  console.log(`\n📋 ${fullName} (${expectedRows} rows)`);

  try {
    // Step 1: Get all column names
    const columnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = '${schema}' AND table_name = '${table}'
      ORDER BY ordinal_position
    `;
    const { data: columns } = await PROD.rpc('execute_sql', { query: columnsQuery });
    const columnNames = columns?.map((c: any) => c.column_name) || [];

    if (columnNames.length === 0) {
      console.log('   ⚠️  No columns found, skipping');
      return;
    }

    // Step 2: Fetch all data from production (chunked for large tables)
    const CHUNK_SIZE = 1000;
    let allData: any[] = [];
    let offset = 0;

    while (offset < expectedRows) {
      const selectQuery = `
        SELECT * FROM ${fullName}
        ORDER BY (SELECT NULL)
        LIMIT ${CHUNK_SIZE} OFFSET ${offset}
      `;
      const { data: chunk, error } = await PROD.rpc('execute_sql', { query: selectQuery });

      if (error) {
        console.log(`   ❌ Error fetching: ${error.message}`);
        return;
      }

      if (!chunk || chunk.length === 0) break;
      allData = allData.concat(chunk);
      offset += CHUNK_SIZE;

      if (chunk.length < CHUNK_SIZE) break;
    }

    console.log(`   ✅ Fetched ${allData.length} rows from production`);

    if (allData.length === 0) {
      console.log('   ⏭️  No data to copy');
      return;
    }

    // Step 3: Clear staging table
    const deleteQuery = `DELETE FROM ${fullName}`;
    const { error: deleteError } = await STAGING.rpc('execute_sql', { query: deleteQuery });

    if (deleteError) {
      console.log(`   ❌ Error clearing staging: ${deleteError.message}`);
      return;
    }

    console.log(`   🗑️  Cleared staging table`);

    // Step 4: Insert data into staging (chunked)
    let insertedTotal = 0;

    for (let i = 0; i < allData.length; i += CHUNK_SIZE) {
      const chunk = allData.slice(i, i + CHUNK_SIZE);

      // Build INSERT statement
      const values = chunk.map(row => {
        const vals = columnNames.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          return val;
        });
        return `(${vals.join(', ')})`;
      }).join(', ');

      const insertQuery = `
        INSERT INTO ${fullName} (${columnNames.join(', ')})
        VALUES ${values}
      `;

      const { error: insertError } = await STAGING.rpc('execute_sql', { query: insertQuery });

      if (insertError) {
        console.log(`   ❌ Error inserting chunk ${i}-${i + chunk.length}: ${insertError.message}`);
        console.log(`   First row of failed chunk:`, chunk[0]);
        return;
      }

      insertedTotal += chunk.length;
    }

    console.log(`   ✅ Inserted ${insertedTotal} rows into staging`);

    // Step 5: Verify count
    const countQuery = `SELECT COUNT(*) as count FROM ${fullName}`;
    const { data: countData } = await STAGING.rpc('execute_sql', { query: countQuery });
    const actualCount = countData?.[0]?.count || 0;

    if (actualCount === allData.length) {
      console.log(`   ✅ Verified: ${actualCount} rows in staging`);
    } else {
      console.log(`   ⚠️  Count mismatch: expected ${allData.length}, got ${actualCount}`);
    }

  } catch (error: any) {
    console.log(`   ❌ Unexpected error: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Production → Staging Complete Data Copy\n');
  console.log(`📦 Source: https://ooaumjzaztmutltifhoq.supabase.co`);
  console.log(`📦 Target: https://hoaiwcueleiemeplrurv.supabase.co`);
  console.log(`📊 Total tables: ${TABLES.length}`);
  console.log(`📊 Total rows: ${TABLES.reduce((sum, t) => sum + t.rows, 0)}\n`);

  console.log('⚠️  This will DELETE all data in staging and replace with production data');
  console.log('⏳ Estimated time: 2-5 minutes\n');

  let successCount = 0;
  let errorCount = 0;

  for (const { schema, table, rows } of TABLES) {
    try {
      await copyTable(schema, table, rows);
      successCount++;
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Completed: ${successCount}/${TABLES.length} tables`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount} tables`);
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
