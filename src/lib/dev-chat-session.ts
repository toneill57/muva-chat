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

  // Get current session
  const { data: session, error: fetchError } = await supabase
    .from('prospective_sessions')
    .select('conversation_history')
    .eq('session_id', sessionId)
    .single()

  if (fetchError || !session) {
    console.error('[dev-session] Error fetching session:', fetchError)
    return
  }

  // Update conversation history (keep last 20 messages)
  const history = session.conversation_history || []
  history.push(
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    { role: 'assistant', content: assistantResponse, timestamp: new Date().toISOString() }
  )

  const updatedHistory = history.slice(-20) // Keep only last 20

  // Update session
  const { error: updateError } = await supabase
    .from('prospective_sessions')
    .update({
      conversation_history: updatedHistory,
      last_activity_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)

  if (updateError) {
    console.error('[dev-session] Error updating session:', updateError)
  }
}
