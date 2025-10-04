/**
 * Conversation Memory Search
 *
 * Semantic search service for finding relevant conversation summaries.
 * Uses pgvector similarity search to retrieve historical context.
 * Part of Conversation Memory System (Oct 2025).
 */

import { createServerClient } from '@/lib/supabase'
import { generateEmbeddingForSummary } from './conversation-compressor'
import { embeddingCache } from './embedding-cache'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ConversationMemoryResult {
  id: string
  summary_text: string
  key_entities: any
  message_range: string
  similarity: number
}

// ============================================================================
// Main Search Function
// ============================================================================

/**
 * Searches conversation memory for relevant summaries using semantic similarity.
 *
 * Process:
 * 1. Generates 1024d embedding for the query
 * 2. Calls match_conversation_memory RPC function
 * 3. Returns top 2 most relevant summaries (similarity > 0.3)
 *
 * @param query - Search query (user message or context)
 * @param sessionId - Session ID to scope the search
 * @returns Array of relevant conversation summaries, ordered by similarity
 *
 * @example
 * const memories = await searchConversationMemory(
 *   "¿Qué políticas de cancelación mencionamos?",
 *   "session-123"
 * )
 */
export async function searchConversationMemory(
  query: string,
  sessionId: string
): Promise<ConversationMemoryResult[]> {
  console.log('[memory-search] Searching for:', query.substring(0, 50))

  // Track total time
  const totalStartTime = Date.now()

  try {
    const supabase = createServerClient()

    // ========================================================================
    // Step 1: Generate embedding for query (with cache)
    // ========================================================================
    const embeddingStartTime = Date.now()
    let queryEmbedding = embeddingCache.get(query)

    if (!queryEmbedding) {
      // Cache miss - generate embedding via OpenAI
      queryEmbedding = await generateEmbeddingForSummary(query)
      embeddingCache.set(query, queryEmbedding)
    }

    const embeddingTime = Date.now() - embeddingStartTime

    // ========================================================================
    // Step 2: Execute semantic search via RPC
    // ========================================================================
    const rpcStartTime = Date.now()

    const { data, error } = await supabase.rpc('match_conversation_memory', {
      query_embedding: queryEmbedding,
      p_session_id: sessionId,
      match_threshold: 0.3, // Min similarity score (0-1)
      match_count: 2, // Top 2 most relevant summaries
    })

    const rpcTime = Date.now() - rpcStartTime
    const totalTime = Date.now() - totalStartTime

    // ========================================================================
    // Detailed Performance Logging
    // ========================================================================
    console.log('[memory-search] Performance breakdown:', {
      embeddingTime: `${embeddingTime}ms`,
      rpcTime: `${rpcTime}ms`,
      totalTime: `${totalTime}ms`,
      cached: embeddingTime < 5, // Cache hits are ~0-5ms
    })

    if (error) {
      console.warn('[memory-search] RPC error:', error.message)
      return []
    }

    if (!data || data.length === 0) {
      console.log('[memory-search] No memories found')
      return []
    }

    console.log(`[memory-search] Found ${data.length} relevant memories:`, {
      similarities: data.map((m: any) => m.similarity.toFixed(3)),
    })

    return data as ConversationMemoryResult[]
  } catch (error) {
    console.error('[memory-search] Error:', error)
    return []
  }
}
