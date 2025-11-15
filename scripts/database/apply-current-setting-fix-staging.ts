#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { join } from 'path';

const sqlPath = join(process.cwd(), 'migrations/fixes/2025-11-01-fix-current-setting-initplan.sql');
const sql = readFileSync(sqlPath, 'utf-8');

const chunks = sql
  .split(/-- ={70,}/)
  .filter(chunk => chunk.trim().length > 0)
  .filter(chunk => chunk.includes('DROP POLICY'));

console.log(`📦 ${chunks.length} chunks to apply (STAGING - Phase 2: current_setting)\n`);

const projectId = 'qlvkgniqcoisbnwwjfte';
const token = process.env.SUPABASE_ACCESS_TOKEN;

async function applyChunk(index: number, chunk: string) {
  const tableName = chunk.match(/-- \d+\. ([\w]+)/)?.[1] || `chunk_${index}`;
  console.log(`[${index + 1}/${chunks.length}] ${tableName}...`);

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

  console.log(`✅ ${tableName}`);
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
  console.log(`✅ Success: ${success}/${chunks.length} (STAGING Phase 2)`);
  console.log('='.repeat(60));
})();
