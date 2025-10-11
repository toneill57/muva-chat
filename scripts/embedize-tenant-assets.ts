#!/usr/bin/env tsx
/**
 * Generate embeddings for tenant markdown assets
 * Processes _assets/{slug} markdown files and stores in tenant_knowledge_embeddings
 *
 * Usage:
 *   npx tsx scripts/embedize-tenant-assets.ts <slug> [--clear]
 *
 * Examples:
 *   npx tsx scripts/embedize-tenant-assets.ts tucasamar
 *   npx tsx scripts/embedize-tenant-assets.ts simmerdown --clear
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, relative } from 'path';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

// Initialize clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Constants
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const ESTIMATED_COST_PER_CHUNK = 0.00001; // $0.01 per 1K chunks
const RATE_LIMIT_DELAY_MS = 100; // 100ms between requests

interface ChunkResult {
  content: string;
  chunkIndex: number;
}

interface TenantRecord {
  tenant_id: string;
  slug: string;
  business_name: string;
}

interface FileToProcess {
  absolutePath: string;
  relativePath: string;
}

/**
 * Split text into chunks (max 500 tokens ≈ 2000 chars)
 */
function chunkText(text: string, maxChars: number = 2000): ChunkResult[] {
  const chunks: ChunkResult[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChars) {
      if (currentChunk.length > 0) {
        chunks.push({ content: currentChunk.trim(), chunkIndex });
        chunkIndex++;
      }
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push({ content: currentChunk.trim(), chunkIndex });
  }

  return chunks;
}

/**
 * Generate embedding for text via OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS
  });

  return response.data[0].embedding;
}

/**
 * Get tenant record from database by slug
 */
async function getTenantBySlug(slug: string): Promise<TenantRecord | null> {
  const { data, error } = await supabase
    .from('tenant_registry')
    .select('tenant_id, slug, business_name')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data as TenantRecord;
}

/**
 * Recursively scan directory for markdown files
 */
async function scanMarkdownFiles(dir: string, baseDir: string): Promise<FileToProcess[]> {
  const files: FileToProcess[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subdirectories
        const subFiles = await scanMarkdownFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Add markdown file with relative path from baseDir
        files.push({
          absolutePath: fullPath,
          relativePath: relative(baseDir, fullPath)
        });
      }
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return files;
}

/**
 * Clear existing embeddings for a tenant
 */
async function clearTenantEmbeddings(tenantId: string): Promise<number> {
  const { data, error } = await supabase
    .from('tenant_knowledge_embeddings')
    .delete()
    .eq('tenant_id', tenantId)
    .select('id');

  if (error) {
    throw new Error(`Failed to clear embeddings: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Process a single markdown file
 */
async function processFile(
  file: FileToProcess,
  tenantId: string
): Promise<{ chunks: number; errors: number }> {
  let chunksProcessed = 0;
  let errorsCount = 0;

  try {
    // Read file content
    const content = await readFile(file.absolutePath, 'utf-8');

    // Chunk content
    const chunks = chunkText(content);
    console.log(`  → Split into ${chunks.length} chunk(s)`);

    // Generate embeddings and insert
    for (const chunk of chunks) {
      try {
        console.log(`  → Chunk ${chunk.chunkIndex + 1}/${chunks.length}`);

        const embedding = await generateEmbedding(chunk.content);

        const { error } = await supabase
          .from('tenant_knowledge_embeddings')
          .insert({
            tenant_id: tenantId,
            file_path: file.relativePath,
            chunk_index: chunk.chunkIndex,
            content: chunk.content,
            embedding: embedding,
            metadata: {
              originalLength: content.length,
              chunkLength: chunk.content.length,
              processedAt: new Date().toISOString(),
              model: EMBEDDING_MODEL,
              dimensions: EMBEDDING_DIMENSIONS
            }
          });

        if (error) {
          // Check if it's a duplicate key error
          if (error.code === '23505') {
            console.log(`    ⚠️  Chunk ${chunk.chunkIndex + 1} already exists (skipped)`);
          } else {
            console.error(`    ❌ Error inserting chunk ${chunk.chunkIndex + 1}:`, error.message);
            errorsCount++;
          }
        } else {
          console.log(`    ✓`);
          chunksProcessed++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));

      } catch (error: any) {
        console.error(`    ❌ Error processing chunk ${chunk.chunkIndex + 1}:`, error.message);
        errorsCount++;
      }
    }

  } catch (error: any) {
    console.error(`  ❌ Error reading file:`, error.message);
    errorsCount++;
  }

  return { chunks: chunksProcessed, errors: errorsCount };
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();

  // Parse CLI arguments
  const args = process.argv.slice(2);
  const slug = args[0];
  const shouldClear = args.includes('--clear');

  if (!slug) {
    console.error('❌ Error: Missing tenant slug');
    console.error('\nUsage: npx tsx scripts/embedize-tenant-assets.ts <slug> [--clear]');
    console.error('\nExamples:');
    console.error('  npx tsx scripts/embedize-tenant-assets.ts tucasamar');
    console.error('  npx tsx scripts/embedize-tenant-assets.ts simmerdown --clear');
    process.exit(1);
  }

  // Check for required API keys
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable not set');
    console.error('   Run: set -a && source .env.local && set +a');
    process.exit(1);
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Supabase credentials not set');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Get tenant from database
  console.log(`🔍 Looking up tenant: ${slug}...`);
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    console.error(`❌ Error: Tenant '${slug}' not found in database`);
    console.error('   Available tenants: simmerdown, tucasamar');
    process.exit(1);
  }

  console.log(`📂 Processing tenant: ${tenant.business_name} (${tenant.tenant_id})`);
  console.log(`   Slug: ${tenant.slug}\n`);

  // Scan for markdown files
  const assetsDir = join(process.cwd(), '_assets', slug);
  console.log(`📁 Scanning: _assets/${slug}/`);

  const files = await scanMarkdownFiles(assetsDir, assetsDir);

  if (files.length === 0) {
    console.error(`❌ No markdown files found in _assets/${slug}/`);
    process.exit(1);
  }

  console.log(`📄 Found ${files.length} markdown file(s)\n`);

  // Estimate cost
  const estimatedChunks = files.length * 3; // Rough estimate
  const estimatedCost = estimatedChunks * ESTIMATED_COST_PER_CHUNK;
  console.log(`💰 Estimated cost: $${estimatedCost.toFixed(2)}`);
  console.log(`   (Based on ~3 chunks/file average at $0.00001/chunk)\n`);

  // Clear existing embeddings if requested
  if (shouldClear) {
    console.log('🗑️  Clearing existing embeddings...');
    const deletedCount = await clearTenantEmbeddings(tenant.tenant_id);
    console.log(`   Deleted ${deletedCount} existing embedding(s)\n`);
  }

  // Confirmation prompt
  console.log('⚠️  This will generate embeddings using OpenAI API');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Process all files
  let totalChunks = 0;
  let totalErrors = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`📄 [${i + 1}/${files.length}] ${file.relativePath}`);

    const result = await processFile(file, tenant.tenant_id);
    totalChunks += result.chunks;
    totalErrors += result.errors;

    console.log(`✅ Completed: ${file.relativePath}\n`);
  }

  // Summary
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const actualCost = totalChunks * ESTIMATED_COST_PER_CHUNK;

  console.log('🎉 All embeddings generated!');
  console.log(`   Total chunks: ${totalChunks}`);
  console.log(`   Total errors: ${totalErrors}`);
  console.log(`   Time: ${elapsedMinutes}m ${elapsedSeconds % 60}s`);
  console.log(`   Cost: ~$${actualCost.toFixed(3)}`);

  if (totalErrors > 0) {
    console.log(`\n⚠️  Warning: ${totalErrors} chunk(s) failed to process`);
  }
}

// Execute
main().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
