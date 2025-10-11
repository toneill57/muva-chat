/**
 * Dev Chat Session Management
 *
 * Development version of public chat session management for testing improvements.
 * Handles session management for anonymous/public visitors
 * with travel intent extraction and session persistence.
 */

import { createServerClient } from '@/lib/supabase'
import { resolveTenantSchemaName } from '@/lib/tenant-resolver'
import Anthropic from '@anthropic-ai/sdk'
import {
  compressConversationSegment,
  generateEmbeddingForSummary,
} from './conversation-compressor'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface DevSession {
  session_id: string
  tenant_id: string
  conversation_history: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
  travel_intent: {
    check_in: string | null
    check_out: string | null
    guests: number | null
    accommodation_type: string | null
    budget_range: { min: number; max: number } | null
    preferences: string[]
  }
  utm_tracking: Record<string, string>
}

export interface TravelIntent {
  check_in: string | null
  check_out: string | null
  guests: number | null
  accommodation_type: string | null
}

// ============================================================================
// Configuration
// ============================================================================

// Lazy initialization to avoid issues in test environment
let anthropic: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })
  }
  return anthropic
}

// ============================================================================
// Session Management Functions
// ============================================================================

/**
 * Get existing session or create new one
 *
 * @param sessionId - Optional existing session ID
 * @param tenantId - Tenant ID for multi-tenant support
 * @param cookieId - Optional browser cookie identifier
 * @returns DevSession object
 */
export async function getOrCreateDevSession(
  sessionId: string | undefined,
  tenantId: string,
  cookieId?: string
): Promise<DevSession> {
  const supabase = createServerClient()

  console.log('[dev-session] Getting or creating session:', { sessionId, tenantId })

  // Resolve tenant_id (accepts UUID or slug)
  const resolvedTenantId = await resolveTenantSchemaName(tenantId)
  console.log('[dev-session] Resolved tenant:', { input: tenantId, resolved: resolvedTenantId })

  // Try to load existing session
  if (sessionId) {
    const { data, error } = await supabase
      .from('prospective_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('tenant_id', resolvedTenantId) // SECURITY: Prevent session hijacking across tenants
      .eq('status', 'active')
      .single()

    if (!error && data) {
      console.log('[dev-session] Loaded existing session:', data.session_id)

      return {
        session_id: data.session_id,
        tenant_id: data.tenant_id,
        conversation_history: data.conversation_history || [],
        travel_intent: data.travel_intent || {
          check_in: null,
          check_out: null,
          guests: null,
          accommodation_type: null,
          budget_range: null,
          preferences: [],
        },
        utm_tracking: data.utm_tracking || {},
      }
    }
  }

  // Create new session
  console.log('[dev-session] Creating new session')

  // Generate unique cookie_id if not provided
  const finalCookieId = cookieId || `cookie_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

  const newSession = {
    tenant_id: resolvedTenantId,
    cookie_id: finalCookieId,
    conversation_history: [],
    travel_intent: {
      check_in: null,
      check_out: null,
      guests: null,
      accommodation_type: null,
      budget_range: null,
      preferences: [],
    },
    utm_tracking: {},
    last_activity_at: new Date().toISOString(),
    status: 'active',
  }

  const { data, error } = await supabase
    .from('prospective_sessions')
    .insert(newSession)
    .select('session_id')
    .single()

  if (error) {
    console.error('[dev-session] Error creating session:', error)
    throw new Error('Failed to create session')
  }

  console.log('[dev-session] Created new session:', data.session_id)

  return {
    session_id: data.session_id,
    tenant_id: resolvedTenantId,
    conversation_history: [],
    travel_intent: {
      check_in: null,
      check_out: null,
      guests: null,
      accommodation_type: null,
      budget_range: null,
      preferences: [],
    },
    utm_tracking: {},
  }
}

/**
 * Update session with new message
 *
 * Auto-compression: When conversation reaches 100 messages, compresses the first 50
 * into a summary with embeddings, then keeps only the last 50 messages in active history.
 *
 * @param sessionId - Session ID to update
 * @param userMessage - User's message
 * @param assistantResponse - Assistant's response
 */
export async function updateDevSession(
  sessionId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  const supabase = createServerClient()

  console.log('[dev-session] Updating session:', sessionId)

  // 1. Get current session
  const { data: session, error: fetchError } = await supabase
    .from('prospective_sessions')
    .select('conversation_history, tenant_id')
    .eq('session_id', sessionId)
    .single()

  if (fetchError || !session) {
    console.error('[dev-session] Error fetching session:', fetchError)
    return
  }

  // 2. Build new history
  const history = session.conversation_history || []
  history.push(
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    { role: 'assistant', content: assistantResponse, timestamp: new Date().toISOString() }
  )

  // 3. CHECK: Did we reach compression threshold?
  if (history.length >= 100) {
    console.log('[compression] Triggering auto-compression...', {
      total_messages: history.length,
      session_id: sessionId,
    })

    try {
      // 4. Split: first 50 to compress, rest to keep
      const toCompress = history.slice(0, 50)
      const toKeep = history.slice(50)

      console.log('[compression] Compressing messages 1-50...', {
        to_compress: toCompress.length,
        to_keep: toKeep.length,
      })

      // 5. Generate summary + embedding
      const compressed = await compressConversationSegment(toCompress, sessionId)
      const embedding = await generateEmbeddingForSummary(compressed.summary)

      // 6. Save to conversation_memory
      const { error: insertError } = await supabase
        .from('conversation_memory')
        .insert({
          session_id: sessionId,
          tenant_id: session.tenant_id,
          summary_text: compressed.summary,
          message_range: 'messages 1-10',
          message_count: 10,
          embedding_fast: embedding,
          key_entities: compressed.entities,
        })

      if (insertError) {
        console.error('[compression] Error saving to conversation_memory:', insertError)
        // Fallback: don't compress, keep last 20 messages
        await supabase
          .from('prospective_sessions')
          .update({
            conversation_history: history.slice(-20),
            last_activity_at: new Date().toISOString(),
          })
          .eq('session_id', sessionId)
        return
      }

      console.log('[compression] ✓ Saved to conversation_memory:', {
        summary_length: compressed.summary.length,
        embedding_dims: embedding.length,
        entities: compressed.entities,
      })

      // 7. Update session with reduced history
      const { error: updateError } = await supabase
        .from('prospective_sessions')
        .update({
          conversation_history: toKeep, // Only last 10-12 messages
          last_activity_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)

      if (updateError) {
        console.error('[compression] Error updating session:', updateError)
        return
      }

      console.log('[compression] ✓ Auto-compression complete:', {
        compressed_count: 10,
        remaining_in_history: toKeep.length,
        session_id: sessionId,
      })
    } catch (error) {
      console.error('[compression] Fatal error during compression:', error)
      // Fallback: keep last 20 messages without compression
      await supabase
        .from('prospective_sessions')
        .update({
          conversation_history: history.slice(-20),
          last_activity_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
    }
  } else {
    // Normal update (no compression needed)
    console.log('[dev-session] Normal update (no compression)', {
      current_messages: history.length,
      threshold: 20,
    })

    const { error: updateError } = await supabase
      .from('prospective_sessions')
      .update({
        conversation_history: history.slice(-20), // Keep last 20
        last_activity_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)

    if (updateError) {
      console.error('[dev-session] Error updating session:', updateError)
    }
  }
}
