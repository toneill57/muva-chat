#!/usr/bin/env tsx
/**
 * Import embeddings to Supabase pgvector
 * Uses batch insert for performance
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';

interface EmbeddedChunk {
  file_path: string;
  chunk_index: number;
  content: string;
  start_line: number;
  end_line: number;
  embedding: number[];
  metadata: {
    extension: string;
    language: string;
    file_size: number;
  };
}

const BATCH_SIZE = 500; // Insert 500 records per transaction

// Sanitize text to remove invalid Unicode surrogates
function sanitizeText(text: string): string {
  // Replace invalid surrogate pairs with replacement character
  return text.replace(/[\uD800-\uDFFF]/g, '');
}

async function importEmbeddings(chunks: EmbeddedChunk[], supabase: any) {
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

  console.log(`\n📥 Importing ${chunks.length} embeddings to pgvector...`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Total batches: ${totalBatches}\n`);

  let imported = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length));
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    // Prepare records for insertion
    const records = batch.map(chunk => ({
      file_path: sanitizeText(chunk.file_path),
      chunk_index: chunk.chunk_index,
      content: sanitizeText(chunk.content),
      embedding: `[${chunk.embedding.join(',')}]`, // pgvector format
      metadata: {
        extension: chunk.metadata.extension,
        language: chunk.metadata.language,
        start_line: chunk.start_line,
        end_line: chunk.end_line,
        file_size: chunk.metadata.file_size,
      },
    }));

    try {
      const { error } = await supabase
        .from('code_embeddings')
        .insert(records);

      if (error) {
        console.error(`\n❌ Error inserting batch ${batchNum}:`, error);
        throw error;
      }

      imported += batch.length;
      const progress = ((imported / chunks.length) * 100).toFixed(1);
      console.log(`   Batch ${batchNum}/${totalBatches} ✓ (${imported}/${chunks.length} - ${progress}%)`);
    } catch (error: any) {
      console.error(`\n❌ Failed to insert batch ${batchNum}:`, error.message);
      throw error;
    }
  }

  return imported;
}

async function verifyImport(supabase: any, expectedCount: number) {
  console.log('\n🔍 Verifying import...');

  // Count records
  const { count, error: countError } = await supabase
    .from('code_embeddings')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('   ❌ Error counting records:', countError);
    return false;
  }

  console.log(`   Records in database: ${count}`);
  console.log(`   Expected: ${expectedCount}`);

  if (count !== expectedCount) {
    console.log(`   ⚠️  Count mismatch! (${count} vs ${expectedCount})`);
    return false;
  }

  // Verify a sample embedding
  const { data: sample, error: sampleError } = await supabase
    .from('code_embeddings')
    .select('*')
    .limit(1)
    .single();

  if (sampleError) {
    console.error('   ❌ Error fetching sample:', sampleError);
    return false;
  }

  console.log(`\n   Sample record:`);
  console.log(`   - File: ${sample.file_path}`);
  console.log(`   - Chunk: ${sample.chunk_index}`);
  console.log(`   - Vector dimensions: ${sample.embedding ? sample.embedding.length : 'N/A'}`);
  console.log(`   - Content length: ${sample.content.length} chars`);

  return true;
}

async function performanceTest(supabase: any) {
  console.log('\n⚡ Running performance test...');

  // Create a random embedding vector for testing
  const testEmbedding = Array.from({ length: 1536 }, () => Math.random());

  const startTime = Date.now();

  const { data, error } = await supabase.rpc('search_code_embeddings', {
    query_embedding: `[${testEmbedding.join(',')}]`,
    match_threshold: 0.5,
    match_count: 10,
  });

  const elapsedMs = Date.now() - startTime;

  if (error) {
    console.error('   ❌ Search error:', error);
    return false;
  }

  console.log(`   Query time: ${elapsedMs}ms`);
  console.log(`   Results: ${data.length} matches`);

  if (elapsedMs > 2000) {
    console.log(`   ⚠️  Warning: Query took longer than 2s target`);
    return false;
  }

  console.log(`   ✅ Performance: ${elapsedMs < 1000 ? 'Excellent' : 'Good'} (<2s target)`);
  return true;
}

async function main() {
  const rootDir = process.cwd();
  const embeddingsPath = path.join(rootDir, 'data', 'code-embeddings.jsonl');

  if (!fs.existsSync(embeddingsPath)) {
    console.error('❌ Error: code-embeddings.jsonl not found');
    console.error('   Run: npx tsx scripts/generate-embeddings.ts first');
    process.exit(1);
  }

  // Check for Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Supabase credentials not found');
    console.error('   Required env vars:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('📄 Loading embeddings...');
  const chunks: EmbeddedChunk[] = [];

  const fileStream = fs.createReadStream(embeddingsPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim()) {
      chunks.push(JSON.parse(line));
    }
  }

  console.log(`✅ Loaded ${chunks.length} embeddings`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Import embeddings
  const startTime = Date.now();
  const imported = await importEmbeddings(chunks, supabase);
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  console.log(`\n✅ Import complete!`);
  console.log(`   Imported: ${imported} embeddings`);
  console.log(`   Time: ${elapsedMinutes}m ${elapsedSeconds % 60}s`);
  console.log(`   Rate: ${(imported / elapsedSeconds).toFixed(1)} records/sec`);

  // Verify import
  const verified = await verifyImport(supabase, chunks.length);
  if (!verified) {
    console.error('\n❌ Verification failed!');
    process.exit(1);
  }

  // Performance test
  const perfOk = await performanceTest(supabase);
  if (!perfOk) {
    console.log('\n⚠️  Performance test did not meet targets');
  }

  console.log('\n🎉 Migration complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Total embeddings: ${imported}`);
  console.log(`   - Vector dimensions: 1536`);
  console.log(`   - Files indexed: ${new Set(chunks.map(c => c.file_path)).size}`);
  console.log(`   - Table: code_embeddings`);
  console.log(`   - Index: HNSW (m=16, ef_construction=64)`);
}

main().catch(console.error);
