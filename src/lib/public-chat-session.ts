/**
 * Public Chat Session Management
 *
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

export interface PublicSession {
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
 * @returns PublicSession object
 */
export async function getOrCreatePublicSession(
  sessionId: string | undefined,
  tenantId: string,
  cookieId?: string
): Promise<PublicSession> {
  const supabase = createServerClient()

  console.log('[public-session] Getting or creating session:', { sessionId, tenantId })

  // Resolve tenant_id (accepts UUID or slug)
  const resolvedTenantId = await resolveTenantSchemaName(tenantId)
  console.log('[public-session] Resolved tenant:', { input: tenantId, resolved: resolvedTenantId })

  // Try to load existing session
  if (sessionId) {
    const { data, error } = await supabase
      .from('prospective_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single()

    if (!error && data) {
      console.log('[public-session] Loaded existing session:', data.session_id)

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
  console.log('[public-session] Creating new session')

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
    console.error('[public-session] Error creating session:', error)
    throw new Error('Failed to create session')
  }

  console.log('[public-session] Created new session:', data.session_id)

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
 * Update session with new message and extracted intent
 *
 * @param sessionId - Session ID to update
 * @param userMessage - User's message
 * @param assistantResponse - Assistant's response
 * @param extractedIntent - Extracted travel intent from message
 */
export async function updatePublicSession(
  sessionId: string,
  userMessage: string,
  assistantResponse: string,
  extractedIntent: Partial<TravelIntent>
): Promise<void> {
  const supabase = createServerClient()

  console.log('[public-session] Updating session:', sessionId)

  // Get current session
  const { data: session, error: fetchError } = await supabase
    .from('prospective_sessions')
    .select('conversation_history, travel_intent, tenant_id')
    .eq('session_id', sessionId)
    .single()

  if (fetchError || !session) {
    console.error('[public-session] Error fetching session:', fetchError)
    return
  }

  // Build new history
  const history = session.conversation_history || []
  history.push(
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    { role: 'assistant', content: assistantResponse, timestamp: new Date().toISOString() }
  )

  // CHECK: Did we reach compression threshold?
  if (history.length >= 100) {
    console.log('[compression] Triggering auto-compression...', {
      total_messages: history.length,
      session_id: sessionId,
    })

    try {
      // Split: first 50 to compress, rest to keep
      const toCompress = history.slice(0, 50)
      const toKeep = history.slice(50)

      console.log('[compression] Compressing messages 1-50...', {
        to_compress: toCompress.length,
        to_keep: toKeep.length,
      })

      // Generate summary + embedding
      const compressed = await compressConversationSegment(toCompress, sessionId)
      const embedding = await generateEmbeddingForSummary(compressed.summary)

      // Save to conversation_memory
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
        // Fallback: keep last 20 messages
        const updatedHistory = history.slice(-20)

        // Merge travel intent
        const currentIntent = session.travel_intent || {}
        const updatedIntent = {
          check_in: extractedIntent.check_in ?? currentIntent.check_in,
          check_out: extractedIntent.check_out ?? currentIntent.check_out,
          guests: extractedIntent.guests ?? currentIntent.guests,
          accommodation_type: extractedIntent.accommodation_type ?? currentIntent.accommodation_type,
          budget_range: currentIntent.budget_range || null,
          preferences: currentIntent.preferences || [],
        }

        await supabase
          .from('prospective_sessions')
          .update({
            conversation_history: updatedHistory,
            travel_intent: updatedIntent,
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

      // Update session with compressed history
      const updatedHistory = toKeep

      // Merge travel intent
      const currentIntent = session.travel_intent || {}
      const updatedIntent = {
        check_in: extractedIntent.check_in ?? currentIntent.check_in,
        check_out: extractedIntent.check_out ?? currentIntent.check_out,
        guests: extractedIntent.guests ?? currentIntent.guests,
        accommodation_type: extractedIntent.accommodation_type ?? currentIntent.accommodation_type,
        budget_range: currentIntent.budget_range || null,
        preferences: currentIntent.preferences || [],
      }

      console.log('[public-session] Updated intent:', updatedIntent)

      const { error: updateError } = await supabase
        .from('prospective_sessions')
        .update({
          conversation_history: updatedHistory,
          travel_intent: updatedIntent,
          last_activity_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)

      if (updateError) {
        console.error('[public-session] Error updating session:', updateError)
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
      const updatedHistory = history.slice(-20)

      const currentIntent = session.travel_intent || {}
      const updatedIntent = {
        check_in: extractedIntent.check_in ?? currentIntent.check_in,
        check_out: extractedIntent.check_out ?? currentIntent.check_out,
        guests: extractedIntent.guests ?? currentIntent.guests,
        accommodation_type: extractedIntent.accommodation_type ?? currentIntent.accommodation_type,
        budget_range: currentIntent.budget_range || null,
        preferences: currentIntent.preferences || [],
      }

      await supabase
        .from('prospective_sessions')
        .update({
          conversation_history: updatedHistory,
          travel_intent: updatedIntent,
          last_activity_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
    }
  } else {
    // Normal update (no compression needed)
    console.log('[public-session] Normal update (no compression)', {
      current_messages: history.length,
      threshold: 20,
    })

    // Merge extracted intent with existing (new values override)
    const currentIntent = session.travel_intent || {}
    const updatedIntent = {
      check_in: extractedIntent.check_in ?? currentIntent.check_in,
      check_out: extractedIntent.check_out ?? currentIntent.check_out,
      guests: extractedIntent.guests ?? currentIntent.guests,
      accommodation_type: extractedIntent.accommodation_type ?? currentIntent.accommodation_type,
      budget_range: currentIntent.budget_range || null,
      preferences: currentIntent.preferences || [],
    }

    console.log('[public-session] Updated intent:', updatedIntent)

    const { error: updateError } = await supabase
      .from('prospective_sessions')
      .update({
        conversation_history: history.slice(-20), // Keep last 20
        travel_intent: updatedIntent,
        last_activity_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)

    if (updateError) {
      console.error('[public-session] Error updating session:', updateError)
    }
  }
}

/**
 * Extract travel intent from user message using Claude Haiku
 *
 * @param message - User's message
 * @returns TravelIntent with extracted information
 */
export async function extractTravelIntent(message: string): Promise<TravelIntent> {
  const client = getAnthropicClient()

  console.log('[intent-extraction] Extracting intent from:', message.substring(0, 50))

  const prompt = `Extrae información de viaje del siguiente mensaje del usuario. Responde SOLO en JSON válido.

Mensaje: "${message}"

Extrae:
- check_in: fecha de check-in en formato YYYY-MM-DD (null si no se menciona)
- check_out: fecha de check-out en formato YYYY-MM-DD (null si no se menciona)
- guests: número de huéspedes como número entero (null si no se menciona)
- accommodation_type: 'apartment' | 'suite' | 'room' | null (null si no se menciona)

Importante:
- Si mencionan "diciembre", "diciembre 2025", usa el año 2025
- Si mencionan mes sin año, asume 2025
- Si dicen "del 15 al 20", infiere check_in=15 y check_out=20 del mes mencionado
- Si no hay información explícita, devuelve null para ese campo

Ejemplo:
Entrada: "Busco apartamento para 4 personas del 15 al 20 de diciembre"
Salida: {"check_in": "2025-12-15", "check_out": "2025-12-20", "guests": 4, "accommodation_type": "apartment"}

JSON:`

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })

    const jsonText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    console.log('[intent-extraction] Claude response:', jsonText)

    // Extract JSON from potential markdown code blocks
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    const cleanedJson = jsonMatch ? jsonMatch[0] : jsonText

    const intent = JSON.parse(cleanedJson) as TravelIntent

    console.log('[intent-extraction] Extracted intent:', intent)

    return {
      check_in: intent.check_in || null,
      check_out: intent.check_out || null,
      guests: intent.guests || null,
      accommodation_type: intent.accommodation_type || null,
    }
  } catch (error) {
    console.error('[intent-extraction] Parse error:', error)
    return {
      check_in: null,
      check_out: null,
      guests: null,
      accommodation_type: null,
    }
  }
}

// NOTE: generateAvailabilityURL() and formatDateForMotoPress() removed
// Availability checks will be handled via direct API calls using travel_intent data
