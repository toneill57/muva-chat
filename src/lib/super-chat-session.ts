/**
 * Super Chat Session Management
 *
 * Handles session and conversation history for the Super Chat
 * (muva.chat global assistant that aggregates all tourism content).
 */

import { createServerClient } from '@/lib/supabase'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SuperChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface SuperChatSession {
  session_id: string
  conversation_history: SuperChatMessage[]
  created_at: string
  last_activity_at: string
}

// ============================================================================
// Session Management Functions
// ============================================================================

/**
 * Get existing session or create new one
 *
 * @param sessionId - Optional existing session ID (UUID format)
 * @returns SuperChatSession object
 */
export async function getOrCreateSuperChatSession(
  sessionId: string | undefined
): Promise<SuperChatSession> {
  const supabase = createServerClient()

  console.log('[super-chat-session] Getting or creating session:', sessionId)

  // Try to load existing session if ID provided
  if (sessionId) {
    const { data, error } = await supabase
      .from('super_chat_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single()

    if (!error && data) {
      console.log('[super-chat-session] Loaded existing session:', data.session_id,
        'with', (data.conversation_history as SuperChatMessage[])?.length || 0, 'messages')

      return {
        session_id: data.session_id,
        conversation_history: (data.conversation_history as SuperChatMessage[]) || [],
        created_at: data.created_at,
        last_activity_at: data.last_activity_at,
      }
    } else if (error) {
      console.log('[super-chat-session] Session not found or error:', error.message)
    }
  }

  // Create new session
  console.log('[super-chat-session] Creating new session')

  const { data, error } = await supabase
    .from('super_chat_sessions')
    .insert({
      conversation_history: [],
      status: 'active',
    })
    .select('session_id, created_at, last_activity_at')
    .single()

  if (error) {
    console.error('[super-chat-session] Error creating session:', error)
    throw new Error('Failed to create Super Chat session')
  }

  console.log('[super-chat-session] Created new session:', data.session_id)

  return {
    session_id: data.session_id,
    conversation_history: [],
    created_at: data.created_at,
    last_activity_at: data.last_activity_at,
  }
}

/**
 * Update session with new messages
 *
 * @param sessionId - Session ID to update
 * @param userMessage - User's message
 * @param assistantResponse - Assistant's response
 */
export async function updateSuperChatSession(
  sessionId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  const supabase = createServerClient()

  console.log('[super-chat-session] Updating session:', sessionId)

  // Get current session
  const { data: session, error: fetchError } = await supabase
    .from('super_chat_sessions')
    .select('conversation_history')
    .eq('session_id', sessionId)
    .single()

  if (fetchError || !session) {
    console.error('[super-chat-session] Error fetching session:', fetchError)
    return
  }

  // Build new history
  const history = (session.conversation_history as SuperChatMessage[]) || []
  const now = new Date().toISOString()

  history.push(
    { role: 'user', content: userMessage, timestamp: now },
    { role: 'assistant', content: assistantResponse, timestamp: now }
  )

  // Keep only last 30 messages to prevent bloat (15 exchanges)
  const trimmedHistory = history.slice(-30)

  // Update session
  const { error: updateError } = await supabase
    .from('super_chat_sessions')
    .update({
      conversation_history: trimmedHistory,
      last_activity_at: now,
    })
    .eq('session_id', sessionId)

  if (updateError) {
    console.error('[super-chat-session] Error updating session:', updateError)
  } else {
    console.log('[super-chat-session] Session updated with', trimmedHistory.length, 'messages')
  }
}

/**
 * Build Claude-compatible message array from session history
 *
 * @param session - SuperChatSession object
 * @returns Array of messages for Claude API
 */
export function buildConversationMessages(
  session: SuperChatSession
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return session.conversation_history.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))
}
