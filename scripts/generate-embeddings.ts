#!/usr/bin/env tsx
/**
 * Generate embeddings for code chunks using OpenAI API
 * Processes chunks in batches with rate limiting and error handling
 */

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import readline from 'readline';

interface CodeChunk {
  file_path: string;
  chunk_index: number;
  content: string;
  start_line: number;
  end_line: number;
  metadata: {
    extension: string;
    language: string;
    file_size: number;
  };
}

interface EmbeddedChunk extends CodeChunk {
  embedding: number[];
}

const BATCH_SIZE = 100; // OpenAI allows up to 2048 embeddings per request
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// Cost tracking: text-embedding-3-small is $0.00002 per 1K tokens
// Estimate ~500 tokens per chunk average
const ESTIMATED_COST_PER_CHUNK = 0.00001; // $0.01 per 1K chunks

async function generateEmbeddings(chunks: CodeChunk[], openai: OpenAI): Promise<EmbeddedChunk[]> {
  const results: EmbeddedChunk[] = [];
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

  console.log(`\n🔄 Generating embeddings for ${chunks.length} chunks...`);
  console.log(`   Batches: ${totalBatches}`);
  console.log(`   Model: ${EMBEDDING_MODEL}`);
  console.log(`   Estimated cost: $${(chunks.length * ESTIMATED_COST_PER_CHUNK).toFixed(2)}\n`);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length));
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch.map(chunk => chunk.content),
        dimensions: EMBEDDING_DIMENSIONS,
      });

      // Map embeddings back to chunks
      for (let j = 0; j < batch.length; j++) {
        results.push({
          ...batch[j],
          embedding: response.data[j].embedding,
        });
      }

      const progress = ((results.length / chunks.length) * 100).toFixed(1);
      console.log(`   Batch ${batchNum}/${totalBatches} ✓ (${results.length}/${chunks.length} - ${progress}%)`);

      // Rate limiting: OpenAI has 3,000 RPM limit on tier 1
      // Wait 100ms between batches to stay well under limit
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      console.error(`\n❌ Error processing batch ${batchNum}:`, error.message);

      // Retry with exponential backoff
      if (error.status === 429) {
        console.log('   Rate limited. Waiting 60s before retry...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        i -= BATCH_SIZE; // Retry this batch
        continue;
      }

      throw error;
    }
  }

  return results;
}

async function main() {
  const rootDir = process.cwd();
  const chunksPath = path.join(rootDir, 'data', 'code-chunks.jsonl');

  if (!fs.existsSync(chunksPath)) {
    console.error('❌ Error: code-chunks.jsonl not found');
    console.error('   Run: npx tsx scripts/chunk-code.ts first');
    process.exit(1);
  }

  // Check for OpenAI API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: OPENAI_API_KEY environment variable not set');
    console.error('   Set it in .env.local or export it:');
    console.error('   export OPENAI_API_KEY="your-api-key"');
    process.exit(1);
  }

  console.log('📄 Loading chunks...');
  const chunks: CodeChunk[] = [];
  let skipped = 0;

  const fileStream = fs.createReadStream(chunksPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim()) {
      const chunk = JSON.parse(line);
      // Skip empty or too-short chunks
      if (chunk.content && chunk.content.trim().length >= 10) {
        chunks.push(chunk);
      } else {
        skipped++;
      }
    }
  }

  console.log(`✅ Loaded ${chunks.length} valid chunks (skipped ${skipped} empty/short chunks)`);

  const estimatedCost = chunks.length * ESTIMATED_COST_PER_CHUNK;
  console.log(`\n💰 Estimated cost: $${estimatedCost.toFixed(2)}`);
  console.log(`   (Based on ~500 tokens/chunk average at $0.00002/1K tokens)\n`);

  // Confirm before proceeding
  console.log('⚠️  This will make API calls to OpenAI.');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  const openai = new OpenAI({ apiKey });

  const startTime = Date.now();
  const embeddedChunks = await generateEmbeddings(chunks, openai);

  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  console.log(`\n✅ Generated ${embeddedChunks.length} embeddings`);
  console.log(`   Time: ${elapsedMinutes}m ${elapsedSeconds % 60}s`);
  console.log(`   Rate: ${(embeddedChunks.length / elapsedSeconds).toFixed(1)} embeddings/sec`);

  // Write output
  console.log('\n💾 Writing embeddings to file...');
  const outputPath = path.join(rootDir, 'data', 'code-embeddings.jsonl');
  const writer = fs.createWriteStream(outputPath);

  for (const chunk of embeddedChunks) {
    writer.write(JSON.stringify(chunk) + '\n');
  }

  await new Promise<void>((resolve) => {
    writer.end(() => resolve());
  });

  const outputSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
  console.log(`✅ Output: ${outputPath} (${outputSizeMB} MB)`);

  // Sample validation
  const sample = embeddedChunks[0];
  console.log(`\n📝 Sample embedding:`);
  console.log(`   File: ${sample.file_path}`);
  console.log(`   Chunk: ${sample.chunk_index}`);
  console.log(`   Vector dimensions: ${sample.embedding.length}`);
  console.log(`   Content length: ${sample.content.length} chars`);
}

main().catch(console.error);
