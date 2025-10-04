/**
 * Common Query Embeddings
 *
 * Pre-generated embeddings for most frequent search queries.
 * Eliminates OpenAI API call for ~30% of searches.
 *
 * Update: Run `npm run generate:common-embeddings` after adding new queries
 */

import { embeddingCache } from './embedding-cache'
import { generateEmbeddingForSummary } from './conversation-compressor'

// ============================================================================
// Common Queries (Top 20 Most Frequent)
// ============================================================================

export const COMMON_QUERIES = [
  // Políticas
  'política de cancelación',
  'política cancelación mascotas',
  'políticas del hotel',
  'normas de la casa',

  // Precios y disponibilidad
  'precio',
  'cuánto cuesta',
  'disponibilidad',
  'fechas disponibles',

  // Amenidades
  'cocina equipada',
  'wifi',
  'aire acondicionado',
  'piscina',
  'playa cerca',
  'vista al mar',

  // Logística
  'cómo llegar',
  'transporte',
  'check-in check-out',
  'horario llegada',

  // Servicios
  'limpieza',
  'toallas',
]

// ============================================================================
// Pre-generated Embeddings Storage
// ============================================================================

interface PreGeneratedEmbedding {
  query: string
  embedding: number[]
  generated_at: string
}

// This will be populated on app startup or via script
let preGeneratedEmbeddings: PreGeneratedEmbedding[] = []

// ============================================================================
// Initialize Cache with Pre-generated Embeddings
// ============================================================================

/**
 * Loads pre-generated embeddings into cache on app startup
 */
export async function initializeCommonQueryCache(): Promise<void> {
  console.log('[common-queries] Initializing cache with pre-generated embeddings...')

  try {
    // Try to load from file (if exists)
    const fs = await import('fs/promises')
    const path = await import('path')
    const embeddingsFile = path.join(process.cwd(), 'data', 'common-query-embeddings.json')

    try {
      const data = await fs.readFile(embeddingsFile, 'utf-8')
      preGeneratedEmbeddings = JSON.parse(data)

      // Load into cache
      for (const { query, embedding } of preGeneratedEmbeddings) {
        embeddingCache.set(query, embedding)
      }

      console.log(`[common-queries] ✓ Loaded ${preGeneratedEmbeddings.length} pre-generated embeddings from file`)
    } catch (fileError) {
      console.log('[common-queries] No pre-generated file found, will generate on-demand')
    }
  } catch (error) {
    console.warn('[common-queries] Error loading pre-generated embeddings:', error)
  }
}

/**
 * Generate embeddings for all common queries (run as script)
 */
export async function generateCommonQueryEmbeddings(): Promise<void> {
  console.log('[common-queries] Generating embeddings for common queries...')

  const embeddings: PreGeneratedEmbedding[] = []

  for (const query of COMMON_QUERIES) {
    console.log(`  Generating: "${query}"...`)

    try {
      const embedding = await generateEmbeddingForSummary(query)

      embeddings.push({
        query,
        embedding,
        generated_at: new Date().toISOString(),
      })

      // Also cache immediately
      embeddingCache.set(query, embedding)
    } catch (error) {
      console.error(`  ✗ Failed for "${query}":`, error)
    }
  }

  // Save to file
  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const dataDir = path.join(process.cwd(), 'data')
    const embeddingsFile = path.join(dataDir, 'common-query-embeddings.json')

    // Create data directory if it doesn't exist
    await fs.mkdir(dataDir, { recursive: true })

    // Write embeddings
    await fs.writeFile(
      embeddingsFile,
      JSON.stringify(embeddings, null, 2),
      'utf-8'
    )

    console.log(`[common-queries] ✓ Saved ${embeddings.length} embeddings to ${embeddingsFile}`)
    console.log(`[common-queries] File size: ${(JSON.stringify(embeddings).length / 1024).toFixed(2)} KB`)
  } catch (error) {
    console.error('[common-queries] Error saving embeddings:', error)
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a query matches a common query (fuzzy match)
 */
export function isCommonQuery(query: string): boolean {
  const normalized = query.toLowerCase().trim()
  return COMMON_QUERIES.some(common =>
    normalized.includes(common.toLowerCase()) ||
    common.toLowerCase().includes(normalized)
  )
}

/**
 * Get stats about common query cache hits
 */
export function getCommonQueryStats() {
  return {
    totalCommonQueries: COMMON_QUERIES.length,
    preGenerated: preGeneratedEmbeddings.length,
    cacheStats: embeddingCache.getStats(),
  }
}
