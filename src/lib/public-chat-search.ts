/**
 * Public Chat Search Functions
 *
 * Handles vector search for public/anonymous visitors with marketing focus.
 * Searches: accommodations (public), policies, MUVA highlights only.
 */

import { createServerClient } from '@/lib/supabase'
import OpenAI from 'openai'
import type { PublicSession } from './public-chat-session'

// ============================================================================
// Configuration
// ============================================================================

// Lazy initialization for OpenAI client
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })
  }
  return openai
}

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface VectorSearchResult {
  id: string
  name?: string
  title?: string
  content: string
  similarity: number
  source_file?: string
  table: string
  metadata?: any
  pricing?: {
    base_price_night: number
    currency: string
  }
  photos?: Array<{ url: string; alt?: string }>
}

// ============================================================================
// Main Search Function
// ============================================================================

/**
 * Perform public search across accommodations, policies, and MUVA
 *
 * @param query - User's search query
 * @param sessionInfo - Public session info (for tenant filtering)
 * @returns Array of search results
 */
export async function performPublicSearch(
  query: string,
  sessionInfo: PublicSession
): Promise<VectorSearchResult[]> {
  console.log('[public-search] Starting search for:', query.substring(0, 50))

  try {
    // Generate BOTH embeddings in parallel for hybrid search
    // Tier 1 (1024d): Fast HNSW search
    // Tier 2 (1536d): Precision re-ranking
    const [queryEmbeddingFast, queryEmbeddingBalanced] = await Promise.all([
      generateEmbedding(query, 1024),  // Tier 1
      generateEmbedding(query, 1536),  // Tier 2
    ])

    console.log('[public-search] Generated embeddings: Tier 1 (1024d) + Tier 2 (1536d)')

    // Execute searches in parallel
    const [accommodationResults, policyResults, muvaResults] = await Promise.all([
      searchAccommodationsPublic(queryEmbeddingFast, queryEmbeddingBalanced, sessionInfo.tenant_id),
      searchPolicies(queryEmbeddingFast, sessionInfo.tenant_id),
      searchMUVABasic(queryEmbeddingFast),
    ])

    console.log('[public-search] Results:', {
      accommodations: accommodationResults.length,
      policies: policyResults.length,
      muva: muvaResults.length,
      total: accommodationResults.length + policyResults.length + muvaResults.length,
    })

    // Combine and sort by similarity
    const allResults = [...accommodationResults, ...policyResults, ...muvaResults]
    allResults.sort((a, b) => b.similarity - a.similarity)

    return allResults.slice(0, 20) // Top 20 results for better coverage
  } catch (error) {
    console.error('[public-search] Search error:', error)
    return []
  }
}

/**
 * Generate OpenAI embedding
 */
async function generateEmbedding(text: string, dimensions: number): Promise<number[]> {
  try {
    const client = getOpenAIClient()

    console.log(`[embedding] Generating ${dimensions}d embedding for:`, text.substring(0, 50))

    const response = await client.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      dimensions: dimensions,
      encoding_format: 'float',
    })

    console.log(`[embedding] ✓ Generated ${response.data[0].embedding.length}d embedding`)

    return response.data[0].embedding
  } catch (error) {
    console.error('[embedding] ERROR generating embedding:', error)
    // Return dummy embedding as fallback
    console.warn(`[embedding] Using dummy ${dimensions}d embedding as fallback`)
    return Array(dimensions).fill(0.1)
  }
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search public accommodation units with pricing and photos
 * Uses hybrid multi-tier search (Tier 1 + Tier 2) for better precision
 *
 * @param queryEmbeddingFast - Query embedding vector Tier 1 (1024d)
 * @param queryEmbeddingBalanced - Query embedding vector Tier 2 (1536d)
 * @param tenantId - Tenant ID for filtering
 * @returns Array of accommodation results with pricing/photos
 */
export async function searchAccommodationsPublic(
  queryEmbeddingFast: number[],
  queryEmbeddingBalanced: number[],
  tenantId: string
): Promise<VectorSearchResult[]> {
  const supabase = createServerClient()

  console.log('[public-search] Searching accommodations for tenant:', tenantId)
  console.log('[public-search] Using hybrid search: Tier 1 (1024d) + Tier 2 (1536d)')

  try {
    // Use match_accommodations_hybrid for better precision
    // Fast HNSW search with Tier 1, re-ranked with Tier 2
    const { data, error } = await supabase.rpc('match_accommodations_hybrid', {
      query_embedding_fast: queryEmbeddingFast,
      query_embedding_balanced: queryEmbeddingBalanced,
      p_tenant_id: tenantId,
      match_threshold: 0.2, // Lower threshold for public marketing search
      match_count: 10,
    })

    if (error) {
      console.error('[public-search] Accommodations error:', error)
      return []
    }

    console.log('[public-search] Found accommodations:', data?.length || 0)

    if (data && data.length > 0) {
      console.log('[public-search] Top result similarities:', {
        combined: data[0].similarity_combined?.toFixed(3),
        tier1: data[0].similarity_fast?.toFixed(3),
        tier2: data[0].similarity_balanced?.toFixed(3),
      })
    }

    // match_accommodations_hybrid returns combined similarity score
    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.metadata?.name || 'Accommodation',
      content: item.content || '',
      similarity: item.similarity_combined || 0, // Use combined score (Tier 1 + Tier 2)
      source_file: item.source_file,
      table: 'accommodation_units_public',
      metadata: {
        ...item.metadata,
        // Include individual tier similarities for debugging
        tier1_similarity: item.similarity_fast,
        tier2_similarity: item.similarity_balanced,
      },
      pricing: item.pricing,
      photos: item.photos,
    }))
  } catch (error) {
    console.error('[public-search] Accommodations search error:', error)
    return []
  }
}

/**
 * Search hotel policies (check-in/check-out, cancellation, etc.)
 *
 * @param queryEmbedding - Query embedding vector (1024d)
 * @param tenantId - Tenant ID for filtering
 * @returns Array of policy results
 */
export async function searchPolicies(
  queryEmbedding: number[],
  tenantId: string
): Promise<VectorSearchResult[]> {
  const supabase = createServerClient()

  console.log('[public-search] Searching policies for tenant:', tenantId)

  try {
    // Search hotels.policies using public function (1024d embeddings)
    const { data, error } = await supabase.rpc('match_policies_public', {
      query_embedding: queryEmbedding,
      p_tenant_id: tenantId,
      match_threshold: 0.3,
      match_count: 5,
    })

    if (error) {
      console.error('[public-search] Policies error:', error)
      return []
    }

    console.log('[public-search] Found policies:', data?.length || 0)

    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.title || 'Policy',
      title: item.title,
      content: item.content || '',
      similarity: item.similarity || 0,
      source_file: item.source_file,
      table: 'policies',
      metadata: {
        policy_type: item.policy_type,
        category: 'policy',
      },
    }))
  } catch (error) {
    console.error('[public-search] Policies search error:', error)
    return []
  }
}

/**
 * Search MUVA tourism content (highlights only - NO manual content)
 *
 * @param queryEmbedding - Query embedding vector (1024d)
 * @returns Array of MUVA results (highlights only)
 */
export async function searchMUVABasic(queryEmbedding: number[]): Promise<VectorSearchResult[]> {
  const supabase = createServerClient()

  console.log('[public-search] Searching MUVA highlights')

  try {
    // Use public MUVA search function (1024d embeddings)
    // Limited to 4 results - focus is selling accommodations, not tourism guide
    const { data, error } = await supabase.rpc('match_muva_documents_public', {
      query_embedding: queryEmbedding,
      match_threshold: 0.2,
      match_count: 4, // Low count: public chat focuses on accommodation sales
    })

    if (error) {
      console.error('[public-search] MUVA error:', error)
      return []
    }

    // Filter for highlights only (NO manual content)
    const highlightResults = (data || []).filter((item: any) => {
      const sourceFile = item.source_file || ''
      // Exclude manual content (operational manuals, guest info, etc.)
      const isManual = sourceFile.includes('manual') ||
                       sourceFile.includes('operational') ||
                       sourceFile.includes('guest-info') ||
                       sourceFile.includes('faq')
      return !isManual
    })

    console.log('[public-search] Found MUVA highlights:', highlightResults.length)

    return highlightResults.map((item: any) => ({
      id: item.id,
      name: item.title || item.name || 'MUVA Content',
      title: item.title,
      content: item.content || item.description || '',
      similarity: item.similarity || 0,
      source_file: item.source_file,
      table: 'muva_content',
      metadata: {
        ...item.metadata,
        is_highlight: true,
        business_info: item.business_info,
      },
    }))
  } catch (error) {
    console.error('[public-search] MUVA search error:', error)
    return []
  }
}
