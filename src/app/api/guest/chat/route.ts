import { NextRequest, NextResponse } from 'next/server'
import { verifyGuestToken, extractTokenFromHeader, GuestAuthErrors } from '@/lib/guest-auth'
import {
  generateConversationalResponse,
  type ConversationalContext,
  type ChatMessage
} from '@/lib/conversational-chat-engine'
import { createServerClient } from '@/lib/supabase'
import { compactConversationIfNeeded } from '@/lib/guest-conversation-memory'
import { SIRE_SYSTEM_PROMPT, getQuestionForField } from '@/lib/sire/conversational-prompts'
import { getNextFieldToAsk } from '@/lib/sire/progressive-disclosure'
import { extractSIREEntity } from '@/lib/compliance-chat-engine'

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS: 20, // Maximum requests
  WINDOW_MS: 60 * 1000, // Per minute
}

// In-memory rate limiter (simple implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

/**
 * Simple rate limiter
 */
function checkRateLimit(conversationId: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(conversationId)

  if (!record || now > record.resetTime) {
    // First request or window expired
    rateLimitMap.set(conversationId, {
      count: 1,
      resetTime: now + RATE_LIMIT.WINDOW_MS,
    })
    return true
  }

  if (record.count >= RATE_LIMIT.MAX_REQUESTS) {
    return false
  }

  record.count++
  return true
}

/**
 * POST /api/guest/chat
 *
 * Main endpoint for guest conversational chat
 * Requires JWT authentication
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // === AUTHENTICATION ===
    // Try cookie first, then fall back to Authorization header
    const cookieToken = request.cookies.get('guest_token')?.value
    const authHeader = request.headers.get('Authorization')
    const headerToken = extractTokenFromHeader(authHeader)
    const token = cookieToken || headerToken

    if (!token) {
      console.error('[Guest Chat] Missing authentication (no cookie or header)')
      return NextResponse.json(
        { error: GuestAuthErrors.MISSING_HEADER },
        { status: 401 }
      )
    }

    const session = await verifyGuestToken(token)

    if (!session) {
      console.error('[Guest Chat] Invalid or expired token')
      return NextResponse.json(
        { error: GuestAuthErrors.INVALID_TOKEN },
        { status: 401 }
      )
    }

    console.log(`[Guest Chat] Authenticated guest: ${session.guest_name} (reservation: ${session.reservation_id})`)

    // === RATE LIMITING ===
    if (!checkRateLimit(session.reservation_id)) {
      console.warn(`[Guest Chat] Rate limit exceeded for reservation ${session.reservation_id}`)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please wait a moment before trying again.',
        },
        { status: 429 }
      )
    }

    // === PARSE REQUEST ===
    const { message, conversation_id, mode, sireData } = await request.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Detect SIRE mode
    const isSIREMode = mode === 'sire'
    console.log(`[Guest Chat] Mode: ${mode || 'normal'}${isSIREMode ? ' (SIRE compliance)' : ''}`)

    // Validate message length
    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long (maximum 1000 characters)' },
        { status: 400 }
      )
    }

    console.log(`[Guest Chat] Query: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`)

    // === VALIDATE CONVERSATION OWNERSHIP ===
    const supabase = createServerClient()

    // conversation_id is now required in request (no fallback)
    if (!conversation_id) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      )
    }

    const targetConversationId = conversation_id

    // Verify conversation belongs to the guest
    const { data: convData, error: convError } = await supabase
      .from('guest_conversations')
      .select('id, guest_id')
      .eq('id', conversation_id)
      .eq('guest_id', session.reservation_id)
      .single()

    if (convError || !convData) {
      console.error('[Guest Chat] Conversation access denied:', {
        conversation_id,
        guest_id: session.reservation_id,
        error: convError?.message
      })
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      )
    }

    console.log(`[Guest Chat] Using conversation: ${conversation_id} (validated ownership)`)

    // === PERSIST USER MESSAGE ===
    const { error: saveError } = await supabase.from('chat_messages').insert({
      conversation_id: targetConversationId,
      role: 'user',
      content: message,
      tenant_id: session.tenant_id,
    })

    if (saveError) {
      console.error('[Guest Chat] Failed to save user message:', saveError)
      // Continue anyway - better to respond than fail completely
    }

    // === LOAD CONVERSATION HISTORY ===
    const { data: historyData, error: historyError } = await supabase
      .from('chat_messages')
      .select('id, role, content, entities, created_at')
      .eq('conversation_id', targetConversationId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (historyError) {
      console.error('[Guest Chat] Failed to load conversation history:', historyError)
    }

    const history: ChatMessage[] = historyData
      ? historyData.reverse().map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          entities: msg.entities || [],
          created_at: msg.created_at,
        }))
      : []

    console.log(`[Guest Chat] Loaded ${history.length} previous messages`)

    // === SIRE MODE: PROGRESSIVE DISCLOSURE + ENTITY EXTRACTION ===
    let extractedData: Record<string, any> = {}
    let nextField: string | null = null
    let sireContext = ''

    if (isSIREMode) {
      console.log('[Guest Chat] SIRE mode enabled - applying progressive disclosure')

      // === LOAD EXISTING SIRE DATA FROM DATABASE ===
      // This ensures we don't ask for fields already captured via document upload
      const { data: reservationData } = await supabase
        .from('guest_reservations')
        .select('given_names, first_surname, second_surname, document_type, document_number, nationality_code, birth_date, origin_city_code, destination_city_code')
        .eq('id', session.reservation_id)
        .single()

      // Convert DB columns (English) to progressive disclosure field names (English)
      const existingSireData: Record<string, any> = {}
      if (reservationData) {
        // Map DB columns to progressive disclosure field names
        if (reservationData.given_names) existingSireData.names = reservationData.given_names
        if (reservationData.first_surname) existingSireData.first_surname = reservationData.first_surname
        if (reservationData.second_surname !== null) existingSireData.second_surname = reservationData.second_surname || ''
        if (reservationData.document_type) existingSireData.document_type_code = reservationData.document_type
        if (reservationData.document_number) existingSireData.identification_number = reservationData.document_number
        if (reservationData.nationality_code) existingSireData.nationality_code = reservationData.nationality_code
        if (reservationData.birth_date) {
          // Convert YYYY-MM-DD to DD/MM/YYYY
          const parts = reservationData.birth_date.split('-')
          if (parts.length === 3) {
            existingSireData.birth_date = `${parts[2]}/${parts[1]}/${parts[0]}`
          }
        }
        if (reservationData.origin_city_code) existingSireData.origin_place = reservationData.origin_city_code
        if (reservationData.destination_city_code) existingSireData.destination_place = reservationData.destination_city_code

        console.log('[Guest Chat] Loaded existing SIRE data from DB:', Object.keys(existingSireData))
      }

      // Merge existing data with incoming data from frontend (frontend data takes precedence)
      const mergedSireData = { ...existingSireData, ...(sireData || {}) }

      // Determinar próximo campo a preguntar basado en datos combinados
      nextField = getNextFieldToAsk(mergedSireData)

      if (nextField) {
        console.log(`[Guest Chat] Next SIRE field to capture: ${nextField}`)

        // Generar pregunta sugerida para el próximo campo
        const question = getQuestionForField(nextField, {
          language: 'es', // TODO: detect user language from session
          previousData: mergedSireData
        })

        // Construir contexto adicional para Claude
        sireContext = `

⚠️ CONTEXTO DE CAPTURA SIRE:

PRÓXIMO CAMPO A CAPTURAR: ${nextField}
PREGUNTA SUGERIDA: "${question}"

Usa esta pregunta como guía para mantener la conversación natural y dirigida.
Si el usuario ya proporcionó el dato en su mensaje, extráelo y valídalo antes de preguntar.
`

        // Intentar extraer entidad del mensaje actual
        const extraction = extractSIREEntity(message, nextField, mergedSireData)

        if (extraction.confidence > 0.7) {
          console.log(`[Guest Chat] Entity extracted from message:`, {
            field: nextField,
            value: extraction.value,
            confidence: extraction.confidence
          })

          extractedData = {
            [nextField]: extraction.normalized || extraction.value
          }

          // Determinar siguiente campo después de este
          const updatedSIREData = { ...sireData, ...extractedData }
          nextField = getNextFieldToAsk(updatedSIREData)

          console.log(`[Guest Chat] Updated SIRE data, next field: ${nextField || 'COMPLETE'}`)

          // === SAVE TO DATABASE (INCREMENTAL + FINAL) ===
          // Save extracted data incrementally to avoid data loss
          console.log('[Guest Chat] Saving SIRE data to database (incremental)...')
          try {
            // Map field names to database column names (English)
            // Supports BOTH Spanish conversational names AND English progressive disclosure names
            const dbData: Record<string, any> = {}

            // Names (Spanish: nombres, English: names)
            if (updatedSIREData.nombres) dbData.given_names = updatedSIREData.nombres
            if (updatedSIREData.names) dbData.given_names = updatedSIREData.names

            // First surname (Spanish: primer_apellido, English: first_surname)
            if (updatedSIREData.primer_apellido) dbData.first_surname = updatedSIREData.primer_apellido
            if (updatedSIREData.first_surname) dbData.first_surname = updatedSIREData.first_surname

            // Second surname (Spanish: segundo_apellido, English: second_surname)
            if (updatedSIREData.segundo_apellido !== undefined) dbData.second_surname = updatedSIREData.segundo_apellido || null
            if (updatedSIREData.second_surname !== undefined) dbData.second_surname = updatedSIREData.second_surname || null

            // Document type (Spanish: tipo_documento, English: document_type_code)
            if (updatedSIREData.tipo_documento) dbData.document_type = updatedSIREData.tipo_documento
            if (updatedSIREData.document_type_code) dbData.document_type = updatedSIREData.document_type_code

            // Document number (Spanish: documento_numero, English: identification_number)
            if (updatedSIREData.documento_numero) dbData.document_number = updatedSIREData.documento_numero
            if (updatedSIREData.identification_number) dbData.document_number = updatedSIREData.identification_number

            // Nationality (Spanish: codigo_nacionalidad, English: nationality_code)
            if (updatedSIREData.codigo_nacionalidad) dbData.nationality_code = updatedSIREData.codigo_nacionalidad
            if (updatedSIREData.nationality_code) dbData.nationality_code = updatedSIREData.nationality_code

            // Origin (Spanish: pais_procedencia, English: origin_place)
            if (updatedSIREData.pais_procedencia) dbData.origin_city_code = updatedSIREData.pais_procedencia
            if (updatedSIREData.origin_place) dbData.origin_city_code = updatedSIREData.origin_place

            // Destination (Spanish: ciudad_destino, English: destination_place)
            if (updatedSIREData.ciudad_destino) dbData.destination_city_code = updatedSIREData.ciudad_destino
            if (updatedSIREData.destination_place) dbData.destination_city_code = updatedSIREData.destination_place

            // Birth date (Spanish: fecha_nacimiento, English: birth_date)
            // Convert from DD/MM/YYYY to YYYY-MM-DD
            const birthDateValue = updatedSIREData.fecha_nacimiento || updatedSIREData.birth_date
            if (birthDateValue) {
              const parts = birthDateValue.split('/')
              if (parts.length === 3) {
                dbData.birth_date = `${parts[2]}-${parts[1]}-${parts[0]}`
              }
            }

            // Movement type and date (solo guardar si están ambos)
            if (updatedSIREData.tipo_movimiento) {
              dbData.movement_type = updatedSIREData.tipo_movimiento === 'Entrada' ? 'E' : 'S'
            }
            if (updatedSIREData.movement_type) {
              dbData.movement_type = updatedSIREData.movement_type
            }
            if (updatedSIREData.fecha_movimiento) {
              const parts = updatedSIREData.fecha_movimiento.split('/')
              if (parts.length === 3) {
                dbData.movement_date = `${parts[2]}-${parts[1]}-${parts[0]}`
              }
            }
            if (updatedSIREData.movement_date) {
              const parts = updatedSIREData.movement_date.split('/')
              if (parts.length === 3) {
                dbData.movement_date = `${parts[2]}-${parts[1]}-${parts[0]}`
              }
            }

            const { error: updateError } = await supabase
              .from('guest_reservations')
              .update(dbData)
              .eq('id', session.reservation_id)

            if (updateError) {
              console.error('[Guest Chat] Failed to save SIRE data:', updateError)
            } else {
              console.log(`[Guest Chat] ✅ SIRE data saved (${nextField ? 'partial' : 'complete'}):`, Object.keys(dbData))
            }
          } catch (saveError) {
            console.error('[Guest Chat] Error saving SIRE data:', saveError)
          }
        }
      } else {
        console.log('[Guest Chat] All SIRE fields captured - ready for confirmation')
        sireContext = `

✅ CONTEXTO DE CAPTURA SIRE:

Todos los campos SIRE han sido capturados.
Proporciona un resumen de los datos y solicita confirmación final del huésped.
`
      }
    }

    // === GENERATE CONVERSATIONAL RESPONSE ===
    const context: ConversationalContext = {
      query: message,
      history,
      guestInfo: session,
      vectorResults: [], // Will be populated by the engine
    }

    const conversationalResponse = await generateConversationalResponse(
      context,
      isSIREMode ? SIRE_SYSTEM_PROMPT + sireContext : undefined
    )

    console.log(`[Guest Chat] Response generated (${conversationalResponse.response.length} chars, confidence: ${conversationalResponse.confidence.toFixed(2)})`)

    // === PERSIST ASSISTANT MESSAGE ===
    const { error: saveResponseError } = await supabase.from('chat_messages').insert({
      conversation_id: targetConversationId,
      role: 'assistant',
      content: conversationalResponse.response,
      entities: conversationalResponse.entities,
      sources: conversationalResponse.sources,
      metadata: {
        confidence: conversationalResponse.confidence,
        followUpSuggestions: conversationalResponse.followUpSuggestions,
      },
      tenant_id: session.tenant_id,
    })

    if (saveResponseError) {
      console.error('[Guest Chat] Failed to save assistant message:', saveResponseError)
      // Continue anyway
    }

    // === UPDATE CONVERSATION METADATA ===
    // Update message count and last activity timestamp
    // First get current message_count
    const { data: conversationData } = await supabase
      .from('guest_conversations')
      .select('message_count')
      .eq('id', targetConversationId)
      .single()

    const currentCount = conversationData?.message_count || 0

    const { error: updateError } = await supabase
      .from('guest_conversations')
      .update({
        message_count: currentCount + 2, // user + assistant
        last_activity_at: new Date().toISOString(),
        last_message: message.substring(0, 100), // Preview of last user message
      })
      .eq('id', targetConversationId)

    if (updateError) {
      console.error('[Guest Chat] Failed to update conversation metadata:', updateError)
      // Non-critical, continue
    }

    // === AUTO-COMPACTION ===
    // Check if conversation needs compaction (threshold: 20 messages)
    try {
      const { compacted, blocksCreated } = await compactConversationIfNeeded(targetConversationId)
      if (compacted) {
        console.log('[Guest Chat] Auto-compaction triggered:', {
          conversation_id: targetConversationId,
          blocks_created: blocksCreated,
        })
      }
    } catch (compactionError) {
      console.error('[Guest Chat] Compaction failed:', compactionError)
      // Non-critical error, continue
    }

    const totalTime = Date.now() - startTime

    console.log(`[Guest Chat] ✅ Request completed in ${totalTime}ms`)

    // === RETURN RESPONSE ===
    const responsePayload: any = {
      success: true,
      response: conversationalResponse.response,
      entities: conversationalResponse.entities,
      followUpSuggestions: conversationalResponse.followUpSuggestions,
      sources: conversationalResponse.sources,
      metadata: {
        confidence: conversationalResponse.confidence,
        responseTime: totalTime,
        guestName: session.guest_name,
        conversationId: targetConversationId,
      },
    }

    // Include SIRE-specific data if in SIRE mode
    if (isSIREMode) {
      responsePayload.sire = {
        extractedData,
        nextField,
        isComplete: nextField === null
      }

      console.log('[Guest Chat] SIRE response data:', {
        extractedFields: Object.keys(extractedData),
        nextField: nextField || 'COMPLETE',
        isComplete: nextField === null
      })
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('[Guest Chat] Unexpected error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/guest/chat
 *
 * API information endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/guest/chat',
    description: 'Conversational chat endpoint for authenticated guests',
    method: 'POST',
    authentication: 'JWT token via Authorization header',
    rateLimit: `${RATE_LIMIT.MAX_REQUESTS} requests per ${RATE_LIMIT.WINDOW_MS / 1000} seconds`,
    request: {
      headers: {
        Authorization: 'Bearer <jwt_token>',
        'Content-Type': 'application/json',
      },
      body: {
        message: 'string (required, max 1000 chars)',
        conversation_id: 'string (optional, UUID of target conversation - defaults to session conversation)',
        mode: 'string (optional, "sire" for SIRE compliance mode)',
        sireData: 'object (optional, partial SIRE data for progressive disclosure)',
      },
    },
    response: {
      success: 'boolean',
      response: 'string (conversational response)',
      entities: 'string[] (extracted entities)',
      followUpSuggestions: 'string[] (suggested next questions)',
      sources: 'SourceMetadata[] (information sources)',
      metadata: {
        confidence: 'number (0-1)',
        responseTime: 'number (milliseconds)',
        guestName: 'string',
        conversationId: 'string',
      },
      sire: {
        extractedData: 'object (SIRE fields extracted from message - only in SIRE mode)',
        nextField: 'string | null (next SIRE field to capture - only in SIRE mode)',
        isComplete: 'boolean (all SIRE fields captured - only in SIRE mode)',
      },
    },
    features: [
      'JWT authentication',
      'Rate limiting',
      'Context-aware responses',
      'Entity tracking',
      'Follow-up suggestions',
      'Full conversation history',
      'Persistent chat storage',
      'SIRE compliance mode with progressive disclosure',
      'Automatic entity extraction (confidence > 0.7)',
    ],
  })
}
