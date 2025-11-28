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
import {
  getPromptForSearchMode,
  type SearchMode,
} from './chat-prompts'

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
      base_price_low_season?: number
      base_price_high_season?: number
      currency?: string
    }
    photos?: Array<{ url: string; alt?: string }>
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
    const systemPrompt = await buildMarketingSystemPrompt(
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
 * IMPORTANT: Hotel/location info is dynamic based on tenant
 */
async function buildMarketingSystemPrompt(
  session: DevSession,
  searchResults: VectorSearchResult[],
  conversationMemories: ConversationMemoryResult[]
): Promise<string> {
  // Get tenant info for dynamic prompt
  const { createServerClient } = await import('@/lib/supabase')
  const supabase = createServerClient()

  const { data: tenantData, error: tenantError } = await supabase
    .from('tenant_registry')
    .select('slug, features')
    .eq('tenant_id', session.tenant_id)
    .single()

  if (tenantError) {
    console.error('[dev-chat-engine] Error fetching tenant:', tenantError)
  }

  // Get hotel name from slug (capitalize and format)
  const hotelName = tenantData?.slug
    ? tenantData.slug.charAt(0).toUpperCase() + tenantData.slug.slice(1)
    : 'nuestro hotel'
  const location = 'San Andrés, Colombia' // Default, could be made dynamic too

  // Extract search mode from tenant features (hotel, agency, hybrid)
  const searchMode: SearchMode = (tenantData?.features?.search_mode as SearchMode) || 'hotel'
  console.log('[dev-chat-engine] Tenant:', tenantData?.slug, '| Search mode:', searchMode, '| Features:', JSON.stringify(tenantData?.features))

  // Deduplicate: keep only the highest-similarity chunk per accommodation
  // This ensures all unique accommodations reach the model, not just 3-4 with multiple chunks
  const deduplicatedResults = (() => {
    const seen = new Map<string, VectorSearchResult>()
    for (const result of searchResults) {
      // Get unique identifier: original_accommodation name or result id
      const key = result.table === 'accommodation_units_public'
        ? (result.metadata?.original_accommodation || result.name || result.id)
        : result.id // For non-accommodations (policies, MUVA), use id

      const existing = seen.get(key)
      if (!existing || result.similarity > existing.similarity) {
        seen.set(key, result)
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.similarity - a.similarity)
  })()

  console.log('[dev-chat-engine] Deduplicated:', searchResults.length, '→', deduplicatedResults.length, 'unique results')

  // Build search context
  const searchContext = deduplicatedResults
    .slice(0, 15)
    .map((result, index) => {
      const name = result.name || result.title || 'Unknown'
      let details = ''

      // Build comprehensive details for accommodations
      if (result.table === 'accommodation_units_public' && result.metadata) {
        const meta = result.metadata

        // Pricing (always show if available)
        if (result.pricing) {
          const lowPrice = result.pricing.base_price_low_season
          const highPrice = result.pricing.base_price_high_season

          if (lowPrice && highPrice) {
            details += `\n💰 PRECIOS:\n- Temporada Baja: $${lowPrice.toLocaleString()} COP/noche\n- Temporada Alta: $${highPrice.toLocaleString()} COP/noche`
          } else if (lowPrice) {
            details += `\n💰 PRECIO: $${lowPrice.toLocaleString()} COP/noche`
          } else if (highPrice) {
            details += `\n💰 PRECIO: $${highPrice.toLocaleString()} COP/noche`
          }
        }

        // Capacity and configuration
        // capacity can be: number, or object {total, adults, children}
        // bed_configuration can be: string, or array [{type: "..."}]
        const capacityValue = typeof meta.capacity === 'object' && meta.capacity?.total
          ? meta.capacity.total
          : meta.capacity
        const bedConfig = Array.isArray(meta.bed_configuration)
          ? meta.bed_configuration.map((b: any) => b.type || b).join(', ')
          : meta.bed_configuration

        if (capacityValue || bedConfig) {
          details += `\n\n👥 CAPACIDAD:`
          if (capacityValue) details += `\n- Capacidad máxima: ${capacityValue} personas`
          if (bedConfig) details += `\n- Configuración: ${bedConfig}`
        }

        // Physical characteristics
        const physicalDetails = []
        if (meta.size_m2) physicalDetails.push(`Tamaño: ${meta.size_m2}m²`)
        if (meta.floor_number) physicalDetails.push(`Piso: ${meta.floor_number}`)
        if (meta.view_type) physicalDetails.push(`Vista: ${meta.view_type}`)
        if (physicalDetails.length > 0) {
          details += `\n\n🏠 CARACTERÍSTICAS:\n- ${physicalDetails.join('\n- ')}`
        }

        // Amenities (most important for marketing)
        // Check multiple locations: result level, metadata.amenities, and metadata.unit_amenities
        const amenitiesData = (result as any).amenities || meta.amenities || meta.unit_amenities
        if (amenitiesData) {
          // Handle multiple formats: array of strings, array of objects, or comma-separated string
          let amenitiesList: string[] = []
          if (Array.isArray(amenitiesData)) {
            amenitiesList = amenitiesData.map((a: any) => {
              if (typeof a === 'string') return a.trim()
              if (a && typeof a === 'object' && a.name) return a.name.trim()
              return String(a).trim()
            }).slice(0, 8)
          } else if (typeof amenitiesData === 'string') {
            amenitiesList = amenitiesData.split(',').map((a: string) => a.trim()).slice(0, 8)
          }
          if (amenitiesList.length > 0) {
            details += `\n\n✨ AMENITIES:\n- ${amenitiesList.join('\n- ')}`
          }
        }

        // Unique features / highlights (key selling points)
        // Check both 'highlights' (from RPC) and 'unique_features' (legacy)
        const highlightsData = meta.highlights || meta.unique_features
        if (highlightsData && (Array.isArray(highlightsData) ? highlightsData.length > 0 : true)) {
          const features = Array.isArray(highlightsData)
            ? highlightsData
            : [highlightsData]
          if (features.length > 0 && features[0]) {
            details += `\n\n⭐ DESTACADOS:\n- ${features.join('\n- ')}`
          }
        }

        // Photos (important for visual context)
        if (result.photos && result.photos.length > 0) {
          details += `\n\n📸 FOTOS: ${result.photos.length} imágenes disponibles`
          details += `\n- Foto principal: ${result.photos[0].url}`
        }

        // Accessibility (important for some guests)
        if (meta.accessibility_features) {
          const accessible = Array.isArray(meta.accessibility_features)
            ? meta.accessibility_features.join(', ')
            : meta.accessibility_features
          details += `\n\n♿ ACCESIBILIDAD: ${accessible}`
        }
      } else {
        // For non-accommodation results (policies, MUVA), show basic pricing if available
        if (result.pricing) {
          const lowPrice = result.pricing.base_price_low_season
          const highPrice = result.pricing.base_price_high_season

          if (lowPrice && highPrice) {
            details += `\n💰 Temporada Baja: $${lowPrice.toLocaleString()} | Temporada Alta: $${highPrice.toLocaleString()} COP/noche`
          } else if (lowPrice || highPrice) {
            details += `\n💰 Precio: $${(lowPrice || highPrice)?.toLocaleString()} COP/noche`
          }
        }
      }

      const preview = result.content.substring(0, 400)

      return `[${index + 1}] ${name} (similaridad: ${result.similarity.toFixed(2)})${details}\n\n${preview}...`
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

  // Use the appropriate prompt based on search mode (hotel, agency, hybrid)
  return getPromptForSearchMode(searchMode, {
    hotelName,
    location,
    searchContext,
    historicalContext,
    intentSummary,
  })
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
      model: 'claude-haiku-4-5', // Sonnet 4.5 for marketing quality
      max_tokens: 800,
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
    const systemPrompt = await buildMarketingSystemPrompt(
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
      model: 'claude-haiku-4-5',
      max_tokens: 800,
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
