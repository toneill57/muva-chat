#!/usr/bin/env tsx
/**
 * Apply auth_rls_initplan fixes in chunks via execute_sql
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const sqlPath = join(process.cwd(), 'migrations/fixes/2025-11-01-fix-auth-rls-initplan.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log('📄 Read migration file:', sqlPath);
console.log('📏 Total size:', sql.length, 'characters\n');

// Split by table comments to get chunks
const chunks = sql
  .split(/-- ={70,}/)
  .filter(chunk => chunk.trim().length > 0)
  .filter(chunk => !chunk.includes('VALIDATION'))
  .filter(chunk => chunk.includes('DROP POLICY'));

console.log(`📦 Split into ${chunks.length} chunks\n`);

// Apply each chunk via execute_sql
const projectId = 'ooaumjzaztmutltifhoq';
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error('❌ SUPABASE_ACCESS_TOKEN not found');
  process.exit(1);
}

async function applyChunk(index: number, chunk: string) {
  const tableName = chunk.match(/-- \d+\. (\w+)/)?.[1] || `chunk_${index}`;
  console.log(`\n[${index + 1}/${chunks.length}] Applying ${tableName}...`);

  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectId}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: chunk.trim() }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`HTTP ${res.status}: ${error}`);
    }

    const result = await res.json();
    console.log(`✅ ${tableName} applied successfully`);
    return result;
  } catch (error: any) {
    console.error(`❌ ${tableName} failed:`, error.message);
    throw error;
  }
}

// Apply chunks sequentially
(async () => {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    try {
      await applyChunk(i, chunks[i]);
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`\n⚠️  Continuing with next chunk...\n`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Success: ${successCount}/${chunks.length}`);
  console.log(`❌ Failed: ${failCount}/${chunks.length}`);
  console.log('='.repeat(60));

  if (failCount > 0) {
    process.exit(1);
  }
})();
