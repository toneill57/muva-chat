/**
 * Dev Chat Search Functions
 *
 * Development version of public chat search for testing improvements.
 * Handles vector search for public/anonymous visitors with marketing focus.
 * Searches: accommodations (public), policies, MUVA highlights only.
 */

import { createServerClient } from '@/lib/supabase'
import OpenAI from 'openai'
import type { DevSession } from './dev-chat-session'

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
    base_price_low_season?: number
    base_price_high_season?: number
    currency?: string
  }
  photos?: Array<{ url: string; alt?: string }>
}

// ============================================================================
// Main Search Function
// ============================================================================

/**
 * Perform dev search across accommodations, policies, and MUVA
 *
 * @param query - User's search query
 * @param sessionInfo - Dev session info (for tenant filtering)
 * @returns Array of search results
 */
export async function performDevSearch(
  query: string,
  sessionInfo: DevSession
): Promise<VectorSearchResult[]> {
  console.log('[dev-search] Starting search for:', query.substring(0, 50))

  try {
    // Generate embedding (Tier 1 - 1024d for fast marketing searches)
    const queryEmbedding = await generateEmbedding(query, 1024)

    // Execute searches in parallel
    const [accommodationResults, policyResults, muvaResults] = await Promise.all([
      searchAccommodationsPublic(queryEmbedding, sessionInfo.tenant_id),
      searchPolicies(queryEmbedding, sessionInfo.tenant_id),
      searchMUVABasic(queryEmbedding),
    ])

    console.log('[dev-search] Results:', {
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
    console.error('[dev-search] Search error:', error)
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
 *
 * @param queryEmbedding - Query embedding vector (1024d)
 * @param tenantId - Tenant ID for filtering
 * @returns Array of accommodation results with pricing/photos
 */
export async function searchAccommodationsPublic(
  queryEmbedding: number[],
  tenantId: string
): Promise<VectorSearchResult[]> {
  const supabase = createServerClient()

  console.log('[dev-search] Searching accommodations for tenant:', tenantId)
  console.log('[dev-search] Embedding dimensions:', queryEmbedding.length)

  try {
    // SECURITY: Use match_accommodations_public with tenant_id filtering
    const { data, error } = await supabase.rpc('match_accommodations_public', {
      query_embedding: queryEmbedding,
      p_tenant_id: tenantId,
      match_threshold: 0.2, // Lower threshold for dev marketing search
      match_count: 10,
    })

    if (error) {
      console.error('[dev-search] Accommodations error:', error)
      return []
    }

    console.log('[dev-search] Found accommodations (tenant-filtered):', data?.length || 0)

    // No additional filtering needed - RPC function handles tenant isolation
    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name || 'Accommodation',
      content: item.content || '',
      similarity: item.similarity || 0,
      source_file: item.source_file || `accommodation_${item.name}`,
      table: 'accommodation_units_public',
      pricing: item.pricing,
      photos: item.photos,
      metadata: item.metadata,
    }))
  } catch (error) {
    console.error('[dev-search] Accommodations search error:', error)
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

  console.log('[dev-search] Searching policies for tenant:', tenantId)

  try {
    // Search hotels.policies using public function (1024d embeddings)
    const { data, error } = await supabase.rpc('match_policies_public', {
      query_embedding: queryEmbedding,
      p_tenant_id: tenantId,
      match_threshold: 0.3,
      match_count: 5,
    })

    if (error) {
      console.error('[dev-search] Policies error:', error)
      return []
    }

    console.log('[dev-search] Found policies:', data?.length || 0)

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
    console.error('[dev-search] Policies search error:', error)
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

  console.log('[dev-search] Searching MUVA highlights')

  try {
    // Use public MUVA search function (1024d embeddings)
    // Limited to 4 results - focus is selling accommodations, not tourism guide
    const { data, error } = await supabase.rpc('match_muva_documents_public', {
      query_embedding: queryEmbedding,
      match_threshold: 0.2,
      match_count: 4, // Low count: dev chat focuses on accommodation sales
    })

    if (error) {
      console.error('[dev-search] MUVA error:', error)
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

    console.log('[dev-search] Found MUVA highlights:', highlightResults.length)

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
    console.error('[dev-search] MUVA search error:', error)
    return []
  }
}
