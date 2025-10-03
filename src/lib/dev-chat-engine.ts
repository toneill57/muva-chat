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

    // STEP 2: Perform dev search
    const searchResults = await performDevSearch(message, session)
    console.log('[dev-chat-engine] Search found:', searchResults.length, 'results')

    // STEP 3: Build system prompt (marketing-focused)
    const promptStartTime = Date.now()
    const systemPrompt = buildMarketingSystemPrompt(
      session,
      searchResults
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
    // Return top 10 sources to client (more than the 8 sent to Claude for variety)
    const sources = searchResults.slice(0, 10).map((result) => ({
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
  searchResults: VectorSearchResult[]
): string {
  // Build search context
  // Optimized to 8 results with 250 chars preview for faster Claude responses
  const searchContext = searchResults
    .slice(0, 8)
    .map((result, index) => {
      const name = result.name || result.title || 'Unknown'
      const pricing = result.pricing
        ? `\nPrecio: ${result.pricing.base_price_night} ${result.pricing.currency}/noche`
        : ''
      const preview = result.content.substring(0, 250)

      return `[${index + 1}] ${name} (similaridad: ${result.similarity.toFixed(2)})${pricing}\n${preview}...`
    })
    .join('\n\n---\n\n')

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
- Incluye CTAs cuando sea apropiado

INFORMACIÓN DISPONIBLE:
- Solo tienes acceso a los RESULTADOS DE BÚSQUEDA abajo
- NO inventes alojamientos, precios o información que no aparezca en los resultados

RESTRICCIONES:
- NO tengas acceso a información operacional interna
- NO puedes ver disponibilidad en tiempo real (dirígelos al sistema de reservas)
- NO des información de otros hoteles/competidores
- SOLO menciona precios y alojamientos que aparecen EXPLÍCITAMENTE en los resultados

RESULTADOS DE BÚSQUEDA:
${searchContext || 'No se encontraron resultados relevantes.'}

INSTRUCCIONES:
1. Destaca características únicas (vista al mar, cocina completa, ubicación, etc.)
2. Incluye precios cuando estén disponibles
3. Si preguntan sobre turismo, da información básica y luego vuelve a alojamientos
4. Siempre termina con pregunta o CTA para continuar conversación

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
  // Optimized to last 3 messages for faster responses
  const conversationHistory = session.conversation_history
    .slice(-3) // Last 3 messages (instead of 5)
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

    // STEP 3: Build system prompt
    const promptStartTime = Date.now()
    const systemPrompt = buildMarketingSystemPrompt(session, searchResults)
    const promptTime = Date.now() - promptStartTime
    console.log(`[dev-chat-engine-stream] System prompt built in ${promptTime}ms`)

    // STEP 4: Stream response from Claude
    const claudeStartTime = Date.now()
    console.log('[dev-chat-engine-stream] 🤖 Starting Claude stream...')

    const client = getAnthropicClient()
    const conversationHistory = session.conversation_history
      .slice(-3)
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
