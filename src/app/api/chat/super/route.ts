import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/openai'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { trackAIUsage } from '@/lib/track-ai-usage'
import {
  getOrCreateSuperChatSession,
  updateSuperChatSession,
  buildConversationMessages,
  type SuperChatSession,
} from '@/lib/super-chat-session'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str)
}

// Using nodejs runtime (edge runtime incompatible with OpenAI SDK)
// export const runtime = 'edge'

// Lazy initialization to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!
  })
}

// Super Chat system prompt - MUVA platform aggregator
const SUPER_CHAT_PROMPT = `Eres el asistente de MUVA, la plataforma de turismo de San Andrés, Colombia.

CAPACIDADES:
- Información turística completa: playas, restaurantes, actividades, transporte, vida nocturna
- Información de alojamientos de múltiples hoteles y propiedades en San Andrés
- Capacidad de comparar opciones entre diferentes propiedades

INSTRUCCIONES DE RESPUESTA:
1. Cuando menciones alojamientos específicos:
   - Incluye el nombre del hotel/propiedad
   - Menciona precios si están disponibles en el contexto
   - Indica características destacadas (amenities, ubicación, tipo)

2. Cuando compares opciones:
   - Sé objetivo y presenta pros/contras de cada opción
   - Menciona rangos de precio cuando estén disponibles
   - Sugiere opciones según las necesidades expresadas por el usuario

3. Para información turística:
   - Proporciona detalles prácticos (ubicación, horarios, precios)
   - Menciona zonas específicas (San Luis, Centro, Cove, Rocky Cay)
   - Incluye recomendaciones por tipo de viajero

FORMATO:
- Usa Markdown para mejor legibilidad
- **Negritas** para nombres importantes
- Listas para opciones múltiples
- Responde en español

CONTEXTO DISPONIBLE:
{context}`

interface SearchResult {
  result_type: 'tourism' | 'accommodation'
  tenant_id: string | null
  tenant_name: string
  tenant_subdomain: string | null
  id: string
  title: string
  content: string
  similarity: number
  metadata: {
    category?: string
    subcategory?: string
    document_type?: string
    business_info?: Record<string, unknown>
    unit_type?: string
    pricing?: Record<string, unknown>
    amenities?: Record<string, unknown>
    photos?: string[]
    highlights?: string[]
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  try {
    console.log(`[${timestamp}] Super Chat API request started`)

    // Parse request body
    let requestBody
    try {
      requestBody = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { message, session_id } = requestBody

    // Validate required parameters
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      )
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Message too long', message: 'Maximum 500 characters allowed' },
        { status: 400 }
      )
    }

    if (message.trim().length < 3) {
      return NextResponse.json(
        { error: 'Message too short', message: 'Minimum 3 characters required' },
        { status: 400 }
      )
    }

    console.log(`[${timestamp}] Processing Super Chat message: "${message.substring(0, 100)}..."`)

    // STEP 1: Get or create session for conversation memory
    const sessionStart = Date.now()
    let session: SuperChatSession
    try {
      const inputSessionId = session_id && isValidUUID(session_id) ? session_id : undefined
      session = await getOrCreateSuperChatSession(inputSessionId)
      console.log(`[${timestamp}] Session loaded in ${Date.now() - sessionStart}ms:`, session.session_id,
        'with', session.conversation_history.length, 'messages')
    } catch (sessionError) {
      console.error(`[${timestamp}] Session error:`, sessionError)
      // Continue without session memory if it fails
      session = {
        session_id: crypto.randomUUID(),
        conversation_history: [],
        created_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      }
    }

    // Generate embedding (Tier 1: 1024 dimensions for speed)
    const embeddingStart = Date.now()
    const queryEmbedding = await generateEmbedding(message, 1024)
    const embeddingTime = Date.now() - embeddingStart
    console.log(`[${timestamp}] Embedding generated in ${embeddingTime}ms`)

    // Search using our new RPC
    const supabase = getSupabaseClient()
    const searchStart = Date.now()

    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_super_chat', {
        query_embedding: queryEmbedding,
        match_threshold: 0.2,
        match_count: 8
      })

    const searchTime = Date.now() - searchStart

    if (searchError) {
      console.error(`[${timestamp}] Search error:`, searchError)
      throw new Error(`Search failed: ${searchError.message}`)
    }

    console.log(`[${timestamp}] Found ${searchResults?.length || 0} results in ${searchTime}ms`)

    // Build context from search results
    let context = ''
    const sources: Array<{
      result_type: string
      tenant_name: string
      tenant_subdomain: string | null
      title: string
      similarity: number
      metadata: Record<string, unknown>
    }> = []

    if (searchResults && searchResults.length > 0) {
      const results = searchResults as SearchResult[]

      context = results.map((r, i) => {
        // Add to sources for the response
        sources.push({
          result_type: r.result_type,
          tenant_name: r.tenant_name,
          tenant_subdomain: r.tenant_subdomain,
          title: r.title,
          similarity: r.similarity,
          metadata: r.metadata
        })

        // Format context for Claude
        if (r.result_type === 'accommodation') {
          const pricing = r.metadata.pricing ? JSON.stringify(r.metadata.pricing) : 'No disponible'
          return `[ALOJAMIENTO ${i + 1}] ${r.title} (${r.tenant_name})
Tipo: ${r.metadata.unit_type || 'N/A'}
Precio: ${pricing}
Descripción: ${r.content.substring(0, 500)}...`
        } else {
          return `[TURISMO ${i + 1}] ${r.title}
Categoría: ${r.metadata.category || 'General'}
${r.content.substring(0, 500)}...`
        }
      }).join('\n\n---\n\n')
    }

    // Generate response with Claude (streaming)
    const anthropic = getAnthropicClient()
    const systemPrompt = SUPER_CHAT_PROMPT.replace('{context}', context || 'No hay contexto específico disponible.')

    // Build conversation history for Claude (includes previous messages)
    const conversationHistory = buildConversationMessages(session)
    console.log(`[${timestamp}] Sending ${conversationHistory.length} history messages + new message to Claude`)

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const claudeStartTime = Date.now()
          let fullResponse = '' // Collect full response for saving

          const claudeStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              ...conversationHistory, // Include conversation history
              { role: 'user', content: message }
            ]
          })

          for await (const event of claudeStream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta as { type: string; text?: string }
              if (delta.type === 'text_delta' && delta.text) {
                fullResponse += delta.text // Collect response
                const data = JSON.stringify({ type: 'chunk', content: delta.text })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              }
            }
          }

          // Get final message to extract usage
          const finalMessage = await claudeStream.finalMessage()
          const claudeLatency = Date.now() - claudeStartTime

          // Save conversation to session (for memory)
          updateSuperChatSession(session.session_id, message, fullResponse).catch(error => {
            console.error('[super-chat] Failed to update session:', error)
          })

          // Track AI usage for Super Chat (tenant_id is null for aggregated queries)
          if (finalMessage.usage) {
            trackAIUsage({
              tenantId: null, // Super Chat has no tenant - uses null
              conversationId: session.session_id, // Use actual session UUID
              model: finalMessage.model,
              usage: {
                input_tokens: finalMessage.usage.input_tokens,
                output_tokens: finalMessage.usage.output_tokens
              },
              latency: claudeLatency
            }).catch(error => {
              console.error('[super-chat] Failed to track AI usage:', error)
            })
          }

          // Send final metadata
          const totalTime = Date.now() - startTime
          const doneData = JSON.stringify({
            type: 'done',
            session_id: session.session_id, // Return session ID for client to reuse
            sources,
            performance: {
              total_time_ms: totalTime,
              embedding_time_ms: embeddingTime,
              search_time_ms: searchTime,
              results_count: sources.length
            }
          })
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
          controller.close()

        } catch (error) {
          console.error(`[${timestamp}] Stream error:`, error)
          const errorData = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    const errorTime = Date.now() - startTime
    console.error(`[${timestamp}] Fatal error (${errorTime}ms):`, error)

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
        response_time: errorTime
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'MUVA Super Chat API - Use POST method',
    description: 'Aggregated chat for all MUVA tourism content and accommodations',
    features: [
      'Tourism information (beaches, restaurants, activities)',
      'Accommodations from all active tenants',
      'Cross-tenant comparison capabilities',
      'Links to individual tenant chats'
    ],
    parameters: {
      message: 'Required: The question to ask (string)',
      session_id: 'Optional: Session ID for conversation continuity'
    }
  })
}
