import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ChunkResult {
  content: string;
  chunkIndex: number;
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
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536
  });

  return response.data[0].embedding;
}

/**
 * Process all files for a tenant
 */
async function processTenantDocs(tenantId: string) {
  const tempDir = join(process.cwd(), 'data', 'temp', tenantId);

  console.log(`📂 Processing documents for tenant: ${tenantId}\n`);

  // Read all files in temp directory
  const files = await readdir(tempDir);
  const docFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.txt'));

  console.log(`Found ${docFiles.length} document(s)\n`);

  for (const filename of docFiles) {
    console.log(`📄 Processing: ${filename}`);

    const filePath = join(tempDir, filename);
    const content = await readFile(filePath, 'utf-8');

    // Chunk content
    const chunks = chunkText(content);
    console.log(`  → Split into ${chunks.length} chunk(s)`);

    // Generate embeddings and insert
    for (const chunk of chunks) {
      console.log(`  → Generating embedding for chunk ${chunk.chunkIndex + 1}/${chunks.length}`);

      const embedding = await generateEmbedding(chunk.content);

      const { error } = await supabase.from('tenant_knowledge_embeddings').insert({
        tenant_id: tenantId,
        file_path: filename,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        embedding: embedding,
        metadata: {
          originalLength: content.length,
          chunkLength: chunk.content.length,
          processedAt: new Date().toISOString()
        }
      });

      if (error) {
        console.error(`  ❌ Error inserting chunk ${chunk.chunkIndex}:`, error);
      } else {
        console.log(`  ✅ Chunk ${chunk.chunkIndex + 1} stored`);
      }
    }

    console.log(`✅ Completed: ${filename}\n`);
  }

  console.log(`🎉 All documents processed for tenant ${tenantId}`);
}

// CLI usage
const tenantId = process.argv[2];

if (!tenantId) {
  console.error('Usage: npx tsx scripts/process-tenant-docs.ts <tenant_id>');
  process.exit(1);
}

processTenantDocs(tenantId).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
