#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { join } from 'path';

const sqlPath = join(process.cwd(), 'migrations/fixes/2025-11-01-fix-function-search-path.sql');
const sql = readFileSync(sqlPath, 'utf-8');

// Split by function separators (70+ equals signs)
const chunks = sql
  .split(/-- ={70,}/)
  .filter(chunk => chunk.trim().length > 0)
  .filter(chunk => chunk.includes('CREATE OR REPLACE FUNCTION'));

console.log(`📦 ${chunks.length} functions to fix (STAGING)\n`);

const projectId = 'qlvkgniqcoisbnwwjfte'; // STAGING branch
const token = process.env.SUPABASE_ACCESS_TOKEN;

async function applyChunk(index: number, chunk: string) {
  const functionMatch = chunk.match(/-- \d+\. (\w+)/);
  const functionName = functionMatch?.[1] || `function_${index}`;
  console.log(`[${index + 1}/${chunks.length}] ${functionName}...`);

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

  console.log(`✅ ${functionName}`);
}

(async () => {
  let success = 0;
  for (let i = 0; i < chunks.length; i++) {
    try {
      await applyChunk(i, chunks[i]);
      success++;
    } catch (error: any) {
      console.error(`❌ Failed: ${error.message}`);
    }
  }
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Success: ${success}/${chunks.length} (STAGING)`);
  console.log(`🎯 Target: 14 function_search_path_mutable warnings → 0`);
  console.log('='.repeat(60));
})();
