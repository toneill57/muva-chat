#!/usr/bin/env tsx
/**
 * Apply remaining data files to staging branch
 * Files: 11 (catalog), 12 (operations), 13 (reservations), 14a/b/c (embeddings)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const PROJECT_ID = 'gkqfbrhtlipcvpqyyqmx';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

const FILES = [
  '11-data-catalog.sql',
  '12-data-operations.sql',
  '13-data-reservations.sql',
  '14a-data-embeddings-part1.sql',
  '14b-data-embeddings-part2.sql',
  '14c-data-embeddings-part3.sql'
];

async function applyFile(filename: string) {
  console.log(`\n📄 Applying ${filename}...`);
  const startTime = Date.now();

  try {
    const sql = readFileSync(`migrations/fresh-2025-11-01/${filename}`, 'utf-8');

    // Execute via raw SQL
    const { data, error } = await client.rpc('exec_sql', {
      sql_query: sql
    }).catch(async () => {
      // Fallback: direct query if RPC fails
      const { data, error } = await client.from('_sql_exec').select('*').limit(0);
      if (error) {
        // Final fallback: use REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({ sql_query: sql })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return { data: await response.json(), error: null };
      }
      return { data, error };
    });

    if (error) {
      console.error(`❌ Error in ${filename}:`, error.message);
      return false;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ ${filename} applied successfully (${duration}s)`);
    return true;

  } catch (err: any) {
    console.error(`❌ Exception in ${filename}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting data migration to staging branch');
  console.log(`📍 Target: ${SUPABASE_URL}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of FILES) {
    const success = await applyFile(file);
    if (success) {
      successCount++;
    } else {
      failCount++;
      console.log('⚠️  Continuing to next file...');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Success: ${successCount}/${FILES.length}`);
  console.log(`❌ Failed: ${failCount}/${FILES.length}`);
  console.log('='.repeat(60));

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
