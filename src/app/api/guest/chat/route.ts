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
 * Upserts guest SIRE data to reservation_guests table
 * For guest_order=1, also updates guest_reservations for backwards compatibility
 */
async function upsertGuestSireData(
  supabase: any,
  reservationId: string,
  tenantId: string,
  guestOrder: number,
  sireData: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // DEBUG: Log exactly what we receive
    console.log('[SIRE-DEBUG] upsertGuestSireData called with:', {
      guestOrder,
      document_type_code_received: sireData.document_type_code,
      tipo_documento_received: sireData.tipo_documento,
      sireDataKeys: Object.keys(sireData),
    })

    const dbData: Record<string, any> = {
      reservation_id: reservationId,
      tenant_id: tenantId,
      guest_order: guestOrder,
      is_primary_guest: guestOrder === 1,
    }

    // Map SIRE fields from frontend naming to DB columns
    // Support both English and Spanish field names
    if (sireData.names || sireData.nombres) {
      dbData.given_names = sireData.names || sireData.nombres
    }
    if (sireData.first_surname || sireData.primer_apellido) {
      dbData.first_surname = sireData.first_surname || sireData.primer_apellido
    }
    if (sireData.second_surname !== undefined || sireData.segundo_apellido !== undefined) {
      dbData.second_surname = (sireData.second_surname ?? sireData.segundo_apellido ?? '')
    }
    if (sireData.document_type_code || sireData.tipo_documento) {
      dbData.document_type = sireData.document_type_code || sireData.tipo_documento
      console.log('[SIRE-DEBUG] Setting document_type to:', dbData.document_type)
    }
    if (sireData.identification_number || sireData.documento_numero) {
      dbData.document_number = sireData.identification_number || sireData.documento_numero
    }
    if (sireData.nationality_code || sireData.codigo_nacionalidad) {
      dbData.nationality_code = sireData.nationality_code || sireData.codigo_nacionalidad
    }

    // Convert birth_date from DD/MM/YYYY to YYYY-MM-DD
    // Support both English and Spanish field names
    const birthDateValue = sireData.birth_date || sireData.fecha_nacimiento
    if (birthDateValue) {
      if (birthDateValue.includes('/')) {
        const [d, m, y] = birthDateValue.split('/')
        dbData.birth_date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      } else {
        dbData.birth_date = birthDateValue
      }
    }

    // Origin and destination places
    if (sireData.origin_place || sireData.lugar_procedencia) {
      dbData.origin_city_code = sireData.origin_place || sireData.lugar_procedencia
    }
    if (sireData.destination_place || sireData.lugar_destino) {
      dbData.destination_city_code = sireData.destination_place || sireData.lugar_destino
    }

    // Calculate sire_status based on required fields
    const requiredFields = ['document_type', 'document_number', 'first_surname', 'given_names',
                            'nationality_code', 'birth_date', 'origin_city_code', 'destination_city_code']
    const hasAllRequired = requiredFields.every(f => dbData[f])
    dbData.sire_status = hasAllRequired ? 'complete' : 'pending'

    console.log(`[Guest Chat] Upserting guest ${guestOrder} to reservation_guests:`, Object.keys(dbData))

    // Upsert to reservation_guests
    const { error: upsertError } = await supabase
      .from('reservation_guests')
      .upsert(dbData, {
        onConflict: 'reservation_id,guest_order',
        ignoreDuplicates: false
      })

    if (upsertError) {
      console.error('[Guest Chat] Failed to upsert reservation_guests:', upsertError)
      return { success: false, error: upsertError.message }
    }

    console.log(`[Guest Chat] Successfully upserted guest ${guestOrder} (status: ${dbData.sire_status})`)

    // For guest_order=1 (titular), also update guest_reservations for backwards compatibility
    if (guestOrder === 1) {
      const guestResData: Record<string, any> = {}
      if (dbData.given_names) guestResData.given_names = dbData.given_names
      if (dbData.first_surname) guestResData.first_surname = dbData.first_surname
      if (dbData.second_surname !== undefined) guestResData.second_surname = dbData.second_surname
      if (dbData.document_type) guestResData.document_type = dbData.document_type
      if (dbData.document_number) guestResData.document_number = dbData.document_number
      if (dbData.nationality_code) guestResData.nationality_code = dbData.nationality_code
      if (dbData.birth_date) guestResData.birth_date = dbData.birth_date
      if (dbData.origin_city_code) guestResData.origin_city_code = dbData.origin_city_code
      if (dbData.destination_city_code) guestResData.destination_city_code = dbData.destination_city_code

      if (Object.keys(guestResData).length > 0) {
        const { error: updateError } = await supabase
          .from('guest_reservations')
          .update(guestResData)
          .eq('id', reservationId)

        if (updateError) {
          console.warn('[Guest Chat] Failed to update guest_reservations (backwards compat):', updateError)
          // Don't fail the whole operation, just log warning
        } else {
          console.log('[Guest Chat] Also updated guest_reservations for backwards compatibility')
        }
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[Guest Chat] Error in upsertGuestSireData:', err)
    return { success: false, error: String(err) }
  }
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
    const { message, conversation_id, mode, sireData, guest_order = 1 } = await request.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate guest_order
    if (typeof guest_order !== 'number' || guest_order < 1 || !Number.isInteger(guest_order)) {
      return NextResponse.json(
        { error: 'guest_order must be a positive integer' },
        { status: 400 }
      )
    }
    console.log(`[Guest Chat] Guest order: ${guest_order}`)

    // Detect SIRE mode
    const isSIREMode = mode === 'sire'
    console.log(`[Guest Chat] Mode: ${mode || 'normal'}${isSIREMode ? ' (SIRE compliance)' : ''}`)

    // DEBUG: Log sireData received from frontend
    if (isSIREMode && sireData) {
      console.log('[SIRE-DEBUG] Frontend sent sireData:', {
        document_type_code: sireData.document_type_code,
        identification_number: sireData.identification_number,
        allKeys: Object.keys(sireData),
      })
    }

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
      // CRITICAL: Load from correct table based on guest_order
      // - guest_order=1 (titular): Load from guest_reservations (backwards compatibility)
      // - guest_order>1 (companions): Load from reservation_guests
      const existingSireData: Record<string, any> = {}

      if (guest_order === 1) {
        // Titular: load from guest_reservations
        const { data: reservationData } = await supabase
          .from('guest_reservations')
          .select('given_names, first_surname, second_surname, document_type, document_number, nationality_code, birth_date, origin_city_code, destination_city_code')
          .eq('id', session.reservation_id)
          .single()

        if (reservationData) {
          if (reservationData.given_names) existingSireData.names = reservationData.given_names
          if (reservationData.first_surname) existingSireData.first_surname = reservationData.first_surname
          if (reservationData.second_surname !== null) existingSireData.second_surname = reservationData.second_surname || ''
          if (reservationData.document_type) existingSireData.document_type_code = reservationData.document_type
          if (reservationData.document_number) existingSireData.identification_number = reservationData.document_number
          if (reservationData.nationality_code) existingSireData.nationality_code = reservationData.nationality_code
          if (reservationData.birth_date) {
            const parts = reservationData.birth_date.split('-')
            if (parts.length === 3) {
              existingSireData.birth_date = `${parts[2]}/${parts[1]}/${parts[0]}`
            }
          }
          if (reservationData.origin_city_code) existingSireData.origin_place = reservationData.origin_city_code
          if (reservationData.destination_city_code) existingSireData.destination_place = reservationData.destination_city_code
        }
      } else {
        // Companions (guest_order > 1): load from reservation_guests
        const { data: guestData } = await supabase
          .from('reservation_guests')
          .select('given_names, first_surname, second_surname, document_type, document_number, nationality_code, birth_date, origin_city_code, destination_city_code')
          .eq('reservation_id', session.reservation_id)
          .eq('guest_order', guest_order)
          .single()

        if (guestData) {
          if (guestData.given_names) existingSireData.names = guestData.given_names
          if (guestData.first_surname) existingSireData.first_surname = guestData.first_surname
          if (guestData.second_surname !== null) existingSireData.second_surname = guestData.second_surname || ''
          if (guestData.document_type) existingSireData.document_type_code = guestData.document_type
          if (guestData.document_number) existingSireData.identification_number = guestData.document_number
          if (guestData.nationality_code) existingSireData.nationality_code = guestData.nationality_code
          if (guestData.birth_date) {
            const parts = guestData.birth_date.split('-')
            if (parts.length === 3) {
              existingSireData.birth_date = `${parts[2]}/${parts[1]}/${parts[0]}`
            }
          }
          if (guestData.origin_city_code) existingSireData.origin_place = guestData.origin_city_code
          if (guestData.destination_city_code) existingSireData.destination_place = guestData.destination_city_code
        }
      }

      if (Object.keys(existingSireData).length > 0) {
        console.log(`[Guest Chat] Loaded existing SIRE data from DB (guest_order=${guest_order}):`, Object.keys(existingSireData))
      } else {
        console.log(`[Guest Chat] No existing SIRE data in DB for guest_order=${guest_order}`)
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
        // Listar campos ya completados para que el LLM los skipee
        const completedFields = Object.entries(mergedSireData)
          .filter(([key, value]) => value !== undefined && value !== null && value !== '')
          .map(([key, value]) => `  - ${key}: "${value}"`)
          .join('\n')

        sireContext = `

⚠️ CONTEXTO DE CAPTURA SIRE:

CAMPOS YA COMPLETADOS (NO PREGUNTAR):
${completedFields || '  (ninguno)'}

PRÓXIMO CAMPO A CAPTURAR: ${nextField}
PREGUNTA SUGERIDA: "${question}"

**IMPORTANTE:**
- USA LA PREGUNTA SUGERIDA EXACTAMENTE como está escrita arriba
- Pregunta UN SOLO CAMPO a la vez (progressive disclosure estricto)
- NUNCA agrupes múltiples campos en una sola pregunta
- NO preguntes por campos que ya están en la lista de completados
- Si el usuario menciona un dato que ya está completado, reconócelo y continúa al siguiente campo
- Mantén la conversación natural y dirigida
`

        // Intentar extraer entidad del mensaje actual (for additional validation)
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
        }

        // === SAVE TO DATABASE (INCREMENTAL) ===
        // CRITICAL FIX: ALWAYS save frontend sireData, not just when extractSIREEntity succeeds
        // The frontend already validates all fields - trust that validation
        // This fixes the bug where document_type_code wasn't being saved because
        // extractSIREEntity doesn't handle that field type
        const dataToSave = { ...sireData, ...extractedData }

        // Only save if we have meaningful data from frontend
        if (sireData && Object.keys(sireData).length > 0) {
          console.log('[Guest Chat] Saving SIRE data to database (incremental)...')
          console.log('[SIRE-DEBUG] dataToSave:', {
            document_type_code: dataToSave.document_type_code,
            identification_number: dataToSave.identification_number,
            keys: Object.keys(dataToSave),
          })

          const saveResult = await upsertGuestSireData(
            supabase,
            session.reservation_id,
            session.tenant_id,
            guest_order,
            dataToSave
          )

          if (!saveResult.success) {
            console.error('[Guest Chat] Failed to save SIRE data:', saveResult.error)
          } else {
            console.log(`[Guest Chat] ✅ SIRE field saved via upsertGuestSireData`)
          }
        }

        // Determinar siguiente campo después de guardar
        const updatedSIREData = { ...mergedSireData, ...extractedData }
        nextField = getNextFieldToAsk(updatedSIREData)
        console.log(`[Guest Chat] Updated SIRE data, next field: ${nextField || 'COMPLETE'}`)
      } else {
        console.log('[Guest Chat] All SIRE fields captured - ready for confirmation')

        // === SAVE COMPLETE DATA TO DATABASE ===
        // When all fields are captured, save final data using upsertGuestSireData
        console.log('[Guest Chat] Saving complete SIRE data to database...')
        const saveResult = await upsertGuestSireData(
          supabase,
          session.reservation_id,
          session.tenant_id,
          guest_order,
          mergedSireData
        )

        if (!saveResult.success) {
          console.error('[Guest Chat] Failed to save complete SIRE data:', saveResult.error)
        } else {
          console.log(`[Guest Chat] ✅ Complete SIRE data saved via upsertGuestSireData`)
        }

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
        guest_order: 'number (optional, default 1, positive integer identifying guest: 1=titular, 2+=companion)',
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
