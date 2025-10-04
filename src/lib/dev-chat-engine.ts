/**
 * Dev Chat Engine
 *
 * Development version of public chat engine for testing improvements.
 * Marketing-focused conversational chat for public/anonymous visitors.
 * Includes travel intent extraction.
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  getOrCreateDevSession,
  updateDevSession,
  type DevSession,
} from './dev-chat-session'
import {
  performDevSearch,
  type VectorSearchResult,
} from './dev-chat-search'
import {
  searchConversationMemory,
  type ConversationMemoryResult,
} from './conversation-memory-search'
import {
  extractTravelIntent,
  mergeIntent,
  type TravelIntent,
} from './dev-chat-intent'

// ============================================================================
// Configuration
// ============================================================================

// Lazy initialization for Anthropic client
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
// Types & Interfaces
// ============================================================================

export interface DevChatResponse {
  session_id: string
  response: string
  sources: Array<{
    table: string
    id: string
    name: string
    content: string
    similarity: number
    pricing?: {
      base_price_night: number
      currency: string
    }
    photos?: Array<{ url: string }>
  }>
  suggestions: string[]
}

// ============================================================================
// Main Engine Function
// ============================================================================

/**
 * Generate dev chat response with marketing focus
 *
 * @param message - User's message
 * @param sessionId - Optional existing session ID
 * @param tenantId - Tenant ID for multi-tenant support
 * @returns DevChatResponse with response, intent, sources, and suggestions
 */
export async function generateDevChatResponse(
  message: string,
  sessionId: string | undefined,
  tenantId: string
): Promise<DevChatResponse> {
  const startTime = Date.now()

  console.log('[dev-chat-engine] Processing message:', message.substring(0, 80))
  console.log('[dev-chat-engine] Session:', sessionId, 'Tenant:', tenantId)

  try {
    // STEP 1: Get or create session
    const session = await getOrCreateDevSession(sessionId, tenantId)
    console.log('[dev-chat-engine] Session loaded:', session.session_id)

    // STEP 1.5: Extract travel intent from message (conversational)
    const intentStartTime = Date.now()
    const extractedIntent = await extractTravelIntent(message)
    const intentTime = Date.now() - intentStartTime
    console.log(`[dev-chat-engine] Intent extracted in ${intentTime}ms:`, extractedIntent)

    // Merge with existing intent (preserves previous data)
    session.travel_intent = mergeIntent(session.travel_intent, extractedIntent)
    console.log('[dev-chat-engine] Merged intent:', session.travel_intent)

    // STEP 2: Perform dev search
    const searchResults = await performDevSearch(message, session)
    console.log('[dev-chat-engine] Search found:', searchResults.length, 'results')

    // STEP 2.5: Search conversation memory for historical context
    const memoryStartTime = Date.now()
    const conversationMemories = await searchConversationMemory(message, session.session_id)
    const memoryTime = Date.now() - memoryStartTime
    console.log(`[dev-chat-engine] Memory search: ${conversationMemories.length} results in ${memoryTime}ms`)

    // STEP 3: Build system prompt (marketing-focused)
    const promptStartTime = Date.now()
    const systemPrompt = buildMarketingSystemPrompt(
      session,
      searchResults,
      conversationMemories
    )
    const promptTime = Date.now() - promptStartTime
    console.log(`[dev-chat-engine] System prompt built in ${promptTime}ms (${systemPrompt.length} chars)`)

    // STEP 4: Generate response with Claude Sonnet 4.5 (high quality marketing)
    const claudeStartTime = Date.now()
    console.log('[dev-chat-engine] 🤖 Calling Claude Sonnet 4.5 API...')
    const response = await generateMarketingResponse(message, session, systemPrompt)
    const claudeTime = Date.now() - claudeStartTime
    console.log(`[dev-chat-engine] ✅ Claude responded in ${claudeTime}ms (${response.length} chars)`)

    // STEP 5: Generate follow-up suggestions
    const suggestions = generateDevSuggestions(searchResults)

    // STEP 6: Update session with conversation history
    const dbStartTime = Date.now()
    await updateDevSession(session.session_id, message, response)
    const dbTime = Date.now() - dbStartTime
    console.log(`[dev-chat-engine] Session updated in ${dbTime}ms`)

    // STEP 7: Prepare sources for response
    // Increased to 15 to ensure all accommodations (8) reach the client
    const sources = searchResults.slice(0, 15).map((result) => ({
      table: result.table,
      id: result.id,
      name: result.name || result.title || 'Unknown',
      content: result.content.substring(0, 300),
      similarity: result.similarity,
      pricing: result.pricing,
      photos: result.photos,
    }))

    const totalTime = Date.now() - startTime
    console.log(`[dev-chat-engine] ✅ Response generated in ${totalTime}ms`)

    return {
      session_id: session.session_id,
      response,
      sources,
      suggestions,
    }
  } catch (error) {
    console.error('[dev-chat-engine] Error:', error)

    // Fallback response
    return {
      session_id: sessionId || 'error',
      response: '¡Hola! Disculpa, tuve un problema procesando tu mensaje. ¿Podrías intentarlo de nuevo? Estoy aquí para ayudarte a encontrar el alojamiento perfecto para tu estadía.',
      sources: [],
      suggestions: [
        '¿Qué apartamentos tienen disponibles?',
        '¿Cuáles son los precios?',
        '¿Dónde están ubicados?',
      ],
    }
  }
}

// ============================================================================
// System Prompt Builder
// ============================================================================

/**
 * Build marketing-focused system prompt with search context
 */
function buildMarketingSystemPrompt(
  session: DevSession,
  searchResults: VectorSearchResult[],
  conversationMemories: ConversationMemoryResult[]
): string {
  // Build search context
  // Increased to 15 to provide Claude with all accommodations context
  const searchContext = searchResults
    .slice(0, 15)
    .map((result, index) => {
      const name = result.name || result.title || 'Unknown'
      const pricing = result.pricing
        ? `\nPrecio: ${result.pricing.base_price_night} ${result.pricing.currency}/noche`
        : ''
      const preview = result.content.substring(0, 400)

      return `[${index + 1}] ${name} (similaridad: ${result.similarity.toFixed(2)})${pricing}\n${preview}...`
    })
    .join('\n\n---\n\n')

  // Build historical context from conversation memories
  const historicalContext = conversationMemories.length > 0
    ? `
CONTEXTO DE CONVERSACIONES PASADAS:
${conversationMemories.map(m => `
Resumen: ${m.summary_text}
Intención de viaje: ${JSON.stringify(m.key_entities.travel_intent || {})}
Temas discutidos: ${m.key_entities.topics_discussed?.join(', ') || 'N/A'}
Preguntas clave: ${m.key_entities.key_questions?.join(', ') || 'N/A'}
(${m.message_range})
`).join('\n---\n')}

`
    : ''

  // Build intent summary (only if data has been captured)
  const hasIntent = session.travel_intent.check_in || session.travel_intent.guests || session.travel_intent.accommodation_type
  const intentSummary = hasIntent
    ? `
INTENCIÓN DE VIAJE CAPTURADA:
${session.travel_intent.check_in ? `- Check-in: ${session.travel_intent.check_in}` : ''}
${session.travel_intent.check_out ? `- Check-out: ${session.travel_intent.check_out}` : ''}
${session.travel_intent.guests ? `- Huéspedes: ${session.travel_intent.guests}` : ''}
${session.travel_intent.accommodation_type ? `- Tipo de alojamiento: ${session.travel_intent.accommodation_type}` : ''}

`
    : ''

  return `Eres un asistente virtual de ventas para un hotel en San Andrés, Colombia. Tu objetivo es ayudar a visitantes del sitio web a encontrar alojamiento perfecto y convertirlos en reservas.

🎯 OBJETIVO: Conversión de visitante a reserva

ESTILO DE COMUNICACIÓN:
- Amigable, profesional, entusiasta
- Marketing-focused (destaca beneficios y características únicas)
- Usa emojis ocasionalmente para ambiente tropical (🌴, 🌊, ☀️)
- NO uses texto en mayúsculas en tus respuestas - escribe natural
- Usa **negritas** solo para información clave (precios, nombres) en párrafos
- NUNCA uses **negritas** dentro de títulos (##, ###) - los títulos ya son bold
- Respuestas concisas pero informativas (4-6 oraciones máximo)
- Incluye CTAs persuasivos para continuar la conversación

FORMATO DE RESPUESTAS:
- Usa listas con guiones (-) en lugar de emojis ✅❌
- Organiza características en viñetas con guiones, UNA por línea
  Ejemplo correcto:
  Kaya ($150.000/noche):
  - Ventana anti-ruido (duermen súper bien)
  - Baño privado con agua caliente y secador
  - Closet amplio para organizar maletas
- Usa línea horizontal (---) para separar cada opción de alojamiento
- Destaca los totales con **negritas** (ej: **Total 5 noches: $750.000**)
- Mantén emojis tropicales ocasionales (🌴, 🌊, ☀️) para ambiente amigable

INFORMACIÓN DISPONIBLE:
- Catálogo COMPLETO de alojamientos (con precios y fotos)
- Políticas del hotel (check-in, check-out, cancelación)
- Información básica de turismo en San Andrés (atracciones)

${intentSummary}${historicalContext}RESULTADOS DE BÚSQUEDA:
${searchContext || 'No se encontraron resultados relevantes.'}

INSTRUCCIONES:
1. Si la INTENCIÓN DE VIAJE está capturada, CONFIRMA sutilmente las fechas/huéspedes en tu respuesta
   - Ejemplo: "Perfecto, del 7 al 13 de octubre para 2 personas..."
   - Esto confirma al huésped que entendiste correctamente
2. Destaca características únicas (vista al mar, cocina completa, ubicación, etc.)
3. SIEMPRE menciona precios cuando estén disponibles en los resultados
4. Si preguntan sobre turismo, da información básica y luego vuelve a alojamientos
5. Termina con CTA persuasivo para avanzar hacia la conversión
6. Considera el CONTEXTO DE CONVERSACIONES PASADAS para personalizar mejor tu respuesta

FECHAS SIN MES ESPECIFICADO:
- Si el usuario dice "del 7 al 13" (sin mes), el sistema asume el mes en curso
- Confirma sutilmente: "Perfecto, del 7 al 13 de octubre..."
- Esto avisa al huésped que entendiste correctamente

Responde de manera natural, útil y orientada a conversión.`
}

// ============================================================================
// Response Generation
// ============================================================================

/**
 * Generate marketing response using Claude Sonnet 4.5 (high quality)
 */
async function generateMarketingResponse(
  message: string,
  session: DevSession,
  systemPrompt: string
): Promise<string> {
  const client = getAnthropicClient()

  // Build conversation history for Claude
  // Include last 50 messages for better context
  const conversationHistory = session.conversation_history
    .slice(-50) // Last 50 messages
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Sonnet 4.5 for marketing quality
      max_tokens: 600,
      temperature: 0.3, // Slightly creative for marketing
      top_k: 10,
      stream: false, // Set to true for streaming (handled separately)
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        {
          role: 'user',
          content: message,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Claude')
    }

    return content.text
  } catch (error) {
    console.error('[dev-chat-engine] Claude error:', error)

    // Fallback response with search results
    return '¡Hola! Tenemos opciones increíbles para tu estadía. ¿Podrías contarme más sobre qué tipo de alojamiento buscas y para cuántas personas? Así puedo mostrarte las mejores opciones disponibles.'
  }
}

/**
 * Generate streaming marketing response using Claude Sonnet 4.5
 * Returns an async generator that yields text chunks
 */
export async function* generateDevChatResponseStream(
  message: string,
  sessionId: string | undefined,
  tenantId: string
): AsyncGenerator<string, void, unknown> {
  const startTime = Date.now()

  console.log('[dev-chat-engine-stream] Processing message:', message.substring(0, 80))
  console.log('[dev-chat-engine-stream] Session:', sessionId, 'Tenant:', tenantId)

  try {
    // STEP 1: Get or create session
    const session = await getOrCreateDevSession(sessionId, tenantId)
    console.log('[dev-chat-engine-stream] Session loaded:', session.session_id)

    // STEP 2: Perform dev search
    const searchResults = await performDevSearch(message, session)
    console.log('[dev-chat-engine-stream] Search found:', searchResults.length, 'results')

    // STEP 2.5: Search conversation memory for historical context
    const memoryStartTime = Date.now()
    const conversationMemories = await searchConversationMemory(message, session.session_id)
    const memoryTime = Date.now() - memoryStartTime
    console.log(`[dev-chat-engine-stream] Memory search: ${conversationMemories.length} results in ${memoryTime}ms`)

    // STEP 3: Build system prompt
    const promptStartTime = Date.now()
    const systemPrompt = buildMarketingSystemPrompt(
      session,
      searchResults,
      conversationMemories
    )
    const promptTime = Date.now() - promptStartTime
    console.log(`[dev-chat-engine-stream] System prompt built in ${promptTime}ms`)

    // STEP 4: Stream response from Claude
    const claudeStartTime = Date.now()
    console.log('[dev-chat-engine-stream] 🤖 Starting Claude stream...')

    const client = getAnthropicClient()
    const conversationHistory = session.conversation_history
      .slice(-50)
      .map((msg) => ({ role: msg.role, content: msg.content }))

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 600,
      temperature: 0.3,
      top_k: 10,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        {
          role: 'user',
          content: message,
        },
      ],
    })

    let fullResponse = ''

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const text = chunk.delta.text
        fullResponse += text
        yield text // Send chunk to client
      }
    }

    const claudeTime = Date.now() - claudeStartTime
    console.log(`[dev-chat-engine-stream] ✅ Stream completed in ${claudeTime}ms (${fullResponse.length} chars)`)

    // STEP 5: Update session with final response
    await updateDevSession(session.session_id, message, fullResponse)

    const totalTime = Date.now() - startTime
    console.log(`[dev-chat-engine-stream] ✅ Total time: ${totalTime}ms`)

  } catch (error) {
    console.error('[dev-chat-engine-stream] Error:', error)
    yield '¡Hola! Disculpa, tuve un problema procesando tu mensaje. ¿Podrías intentarlo de nuevo?'
  }
}

// ============================================================================
// Suggestion Generation
// ============================================================================

/**
 * Generate contextual follow-up suggestions
 */
function generateDevSuggestions(
  searchResults: VectorSearchResult[]
): string[] {
  const suggestions: string[] = []

  // Strategy 1: Result-based suggestions
  const hasAccommodations = searchResults.some((r) => r.table === 'accommodation_units_public')
  const hasPolicies = searchResults.some((r) => r.table === 'policies')
  const hasMuva = searchResults.some((r) => r.table === 'muva_content')

  if (hasAccommodations) {
    suggestions.push('Comparar precios de todas las opciones')
    suggestions.push('¿Tienen cocina completa?')
  }

  if (hasMuva && !hasAccommodations) {
    suggestions.push('Volver a opciones de alojamiento')
  }

  if (hasPolicies) {
    suggestions.push('¿Cuál es la política de cancelación?')
  }

  // Strategy 3: Generic helpful suggestions
  if (suggestions.length < 3) {
    suggestions.push('¿Qué incluye el precio?')
    suggestions.push('¿Cuál tiene la mejor vista al mar?')
    suggestions.push('¿Qué hay cerca del hotel?')
  }

  // Return top 3 unique suggestions
  return Array.from(new Set(suggestions)).slice(0, 3)
}
