#!/usr/bin/env tsx
/**
 * REGENERATE MANUAL EMBEDDINGS
 *
 * Re-generates all embeddings for accommodation_units_manual_chunks using
 * the correct model: text-embedding-3-large (HARDCODED - NO CAMBIAR)
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/regenerate-manual-embeddings.ts [tenant_id] [--dry-run]
 *
 * Examples:
 *   npx tsx scripts/regenerate-manual-embeddings.ts --dry-run
 *   npx tsx scripts/regenerate-manual-embeddings.ts b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { config } from 'dotenv'

config({ path: '.env.local' })

// ============================================================================
// CONFIGURATION
// ============================================================================

const EMBEDDING_MODEL = 'text-embedding-3-large' // HARDCODED - NO CAMBIAR
const BATCH_SIZE = 10 // Process in batches for progress reporting
const RATE_LIMIT_DELAY = 100 // ms between API calls to avoid rate limits
const MAX_RETRIES = 3 // Retry failed chunks

// ============================================================================
// SETUP
// ============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateEmbedding(
  text: string,
  dimensions: number,
  retries: number = 0
): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions
    })
    return response.data[0].embedding
  } catch (error: any) {
    if (retries < MAX_RETRIES) {
      console.warn(`   ⚠️  API error, retrying (${retries + 1}/${MAX_RETRIES})...`)
      await sleep(1000 * (retries + 1)) // Exponential backoff
      return generateEmbedding(text, dimensions, retries + 1)
    }
    throw error
  }
}

// ============================================================================
// MAIN LOGIC
// ============================================================================

interface Chunk {
  id: string
  chunk_content: string
  accommodation_unit_id: string
  section_title: string
  chunk_index: number
}

async function regenerateEmbeddings(tenantId: string, dryRun: boolean = false) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 REGENERATE MANUAL EMBEDDINGS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('   Tenant ID:', tenantId)
  console.log('   Model:', EMBEDDING_MODEL)
  console.log('   Dry-run:', dryRun ? '✅ YES (no DB updates)' : '❌ NO (will update DB)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // 1. Fetch all chunks for tenant
  console.log('📥 Fetching chunks from database...')

  const { data: chunks, error } = await supabase
    .from('accommodation_units_manual_chunks')
    .select(`
      id,
      chunk_content,
      accommodation_unit_id,
      section_title,
      chunk_index
    `)
    .eq('tenant_id', tenantId)
    .order('accommodation_unit_id')
    .order('chunk_index')

  if (error) {
    throw new Error(`Failed to fetch chunks: ${error.message}`)
  }

  if (!chunks || chunks.length === 0) {
    console.log('⚠️  No chunks found for tenant:', tenantId)
    return
  }

  console.log(`   ✅ Found ${chunks.length} chunks to regenerate`)
  console.log('')

  // 2. Regenerate embeddings
  console.log('🤖 Generating embeddings...')
  console.log('')

  let processed = 0
  let failed = 0
  const startTime = Date.now()

  for (const chunk of chunks as any[]) {
    try {
      // Generate all 3 embedding dimensions in parallel
      const [emb3072, emb1536, emb1024] = await Promise.all([
        generateEmbedding(chunk.chunk_content, 3072),
        generateEmbedding(chunk.chunk_content, 1536),
        generateEmbedding(chunk.chunk_content, 1024)
      ])

      // Update database (unless dry-run)
      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('accommodation_units_manual_chunks')
          .update({
            embedding: emb3072,
            embedding_balanced: emb1536,
            embedding_fast: emb1024,
            updated_at: new Date().toISOString()
          })
          .eq('id', chunk.id)

        if (updateError) {
          throw new Error(`DB update failed: ${updateError.message}`)
        }
      }

      processed++

      // Progress reporting
      if (processed % BATCH_SIZE === 0 || processed === chunks.length) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        const rate = (processed / parseFloat(elapsed)).toFixed(1)
        const eta = ((chunks.length - processed) / parseFloat(rate)).toFixed(0)

        console.log(
          `   [${processed}/${chunks.length}] ` +
          `${((processed / chunks.length) * 100).toFixed(1)}% ` +
          `| ${elapsed}s elapsed | ${rate} chunks/s | ETA ${eta}s`
        )
      }

      // Rate limiting
      if (processed < chunks.length) {
        await sleep(RATE_LIMIT_DELAY)
      }

    } catch (error: any) {
      failed++
      console.error(
        `   ❌ Error on chunk ${chunk.id} ` +
        `(${chunk.section_title} #${chunk.chunk_index}): ` +
        error.message
      )
    }
  }

  // 3. Summary
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ REGENERATION COMPLETE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('   Total chunks:', chunks.length)
  console.log('   Processed:', processed)
  console.log('   Failed:', failed)
  console.log('   Success rate:', `${((processed / chunks.length) * 100).toFixed(1)}%`)
  console.log('   Total time:', `${((Date.now() - startTime) / 1000).toFixed(1)}s`)

  if (dryRun) {
    console.log('')
    console.log('   ℹ️  DRY-RUN mode - no database updates were made')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (failed > 0) {
    throw new Error(`${failed} chunks failed to regenerate`)
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  // Parse arguments
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const tenantId = args.find(arg => !arg.startsWith('--')) ||
                   'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf' // Default: Simmerdown

  // Validate environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY in .env.local')
  }

  // Run
  await regenerateEmbeddings(tenantId, dryRun)
}

main()
  .then(() => {
    console.log('')
    process.exit(0)
  })
  .catch(error => {
    console.error('')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ FATAL ERROR')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(error)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('')
    process.exit(1)
  })
