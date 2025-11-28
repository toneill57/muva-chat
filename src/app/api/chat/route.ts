import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/openai'
import { createClient } from '@supabase/supabase-js'
import { generateChatResponse } from '@/lib/claude'
import { determineOptimalSearch } from '@/lib/search-router'
import { detectQueryIntent, getSearchConfig, calculateSearchCounts } from '@/lib/query-intent'
import { getTenantBySubdomain, getSubdomainFromRequest } from '@/lib/tenant-utils'
// Note: Vercel KV not implemented - using memory cache only

// Use service role key for internal queries (bypasses RLS for system operations)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration')
}

// Temporarily using nodejs runtime for debugging tenant embeddings
// export const runtime = 'edge'

// Legacy in-memory cache (fallback for Edge Runtime)
const memoryCache = new Map<string, { data: unknown, expires: number }>()

// Semantic question groups for intelligent caching
const SEMANTIC_GROUPS = {
  "campos_obligatorios": [
    "cuáles son los 13 campos",
    "qué campos obligatorios tiene sire",
    "cuáles son las especificaciones de campos",
    "campos requeridos",
    "información obligatoria",
    "datos que debo registrar"
  ],
  "tipos_documento": [
    "qué documentos son válidos",
    "cuáles son los códigos de documento",
    "qué tipos de identificación acepta sire",
    "documentos permitidos",
    "tipos de documento",
    "códigos válidos"
  ],
  "formato_archivo": [
    "formato del archivo",
    "cómo debe ser el archivo",
    "extensión del archivo",
    "tipo de archivo",
    "estructura del archivo"
  ],
  "errores_validacion": [
    "errores de validación",
    "por qué falla la validación",
    "archivo no válido",
    "problemas con el archivo"
  ]
}

// Simple hash function for cache keys (Edge Runtime compatible)
function hashQuestion(question: string): string {
  const str = question.toLowerCase().trim()
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

// Enhanced semantic cache key generation
function getSemanticCacheKey(question: string): string {
  const normalizedQuestion = question.toLowerCase().trim()

  // Check if question matches any semantic group
  for (const [groupKey, patterns] of Object.entries(SEMANTIC_GROUPS)) {
    for (const pattern of patterns) {
      if (normalizedQuestion.includes(pattern)) {
        return `semantic:${groupKey}`
      }
    }
  }

  // Fallback to exact match hash
  return `exact:${hashQuestion(question)}`
}

// Memory cache helpers (Edge Runtime compatible)
function getCached(key: string) {
  const cached = memoryCache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }
  if (cached) {
    memoryCache.delete(key) // Clean expired
  }
  return null
}

function setCached(key: string, data: unknown, ttlSeconds: number = 3600) {
  memoryCache.set(key, {
    data,
    expires: Date.now() + (ttlSeconds * 1000)
  })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  // Use service role for tenant-specific embeddings search (public endpoint, no user auth)
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  try {
    console.log(`[${timestamp}] Chat API request started`)

    // 1. TENANT DETECTION - Get tenant from subdomain
    const subdomain = getSubdomainFromRequest(request)
    console.log(`[${timestamp}] Subdomain detected: ${subdomain || 'none'}`)

    const tenant = await getTenantBySubdomain(subdomain)

    if (!tenant) {
      console.log(`[${timestamp}] Tenant not found for subdomain: ${subdomain}`)
      return NextResponse.json(
        { error: 'Tenant not found', details: 'Invalid subdomain or tenant does not exist' },
        { status: 404 }
      )
    }

    console.log(`[${timestamp}] Tenant loaded: ${tenant.nombre_comercial} (ID: ${tenant.tenant_id})`)

    // Parse and validate request body
    let requestBody
    try {
      requestBody = await request.json()
    } catch {
      console.log(`[${timestamp}] Invalid request: malformed JSON`)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { question, use_context = true, max_context_chunks = 4 } = requestBody

    // Validate max_context_chunks
    if (typeof max_context_chunks !== 'number' || max_context_chunks < 1 || max_context_chunks > 10) {
      console.log(`[${timestamp}] Invalid request: invalid max_context_chunks (${max_context_chunks})`)
      return NextResponse.json(
        {
          error: 'Invalid max_context_chunks',
          message: 'Must be a number between 1 and 10'
        },
        { status: 400 }
      )
    }

    if (!question || typeof question !== 'string') {
      console.log(`[${timestamp}] Invalid request: missing or invalid question`)
      return NextResponse.json(
        { error: 'Question is required and must be a string' },
        { status: 400 }
      )
    }

    // Input validation
    if (question.length > 500) {
      console.log(`[${timestamp}] Invalid request: question too long (${question.length} characters)`)
      return NextResponse.json(
        {
          error: 'Question too long',
          message: 'Maximum 500 characters allowed',
          current_length: question.length
        },
        { status: 400 }
      )
    }

    if (question.trim().length < 3) {
      console.log(`[${timestamp}] Invalid request: question too short`)
      return NextResponse.json(
        {
          error: 'Question too short',
          message: 'Minimum 3 characters required'
        },
        { status: 400 }
      )
    }

    console.log(`[${timestamp}] Processing question: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`)

    // Check cache first (using semantic grouping)
    const cacheKey = `chat:${getSemanticCacheKey(question)}`
    const cached = getCached(cacheKey)

    // Declare conversation ID in outer scope (needed for both cache hit and miss)
    let dbConversationId: string | null = null

    // Save public conversation to database (both cache hit and miss)
    try {
      // Extract response from cached or will be generated later
      const responseText = cached ? (cached as any).response : null

      // Only create conversation, don't save messages yet for cache hit
      const conversationId = request.headers.get('x-conversation-id')
      dbConversationId = conversationId

      if (!dbConversationId) {
        // Create new public conversation
        const { data: newConv, error: convError } = await supabase
          .from('guest_conversations')
          .insert({
            tenant_id: tenant.tenant_id,
            conversation_type: 'public',
            guest_id: null,
            title: question.substring(0, 100),
            anonymous_session_id: crypto.randomUUID(),
            user_agent: request.headers.get('user-agent'),
            referrer_url: request.headers.get('referer')
          })
          .select('id')
          .single()

        if (!convError && newConv) {
          dbConversationId = newConv.id
          console.log(`[${timestamp}] 📝 Created public conversation: ${dbConversationId}`)
        } else {
          console.error(`[${timestamp}] ⚠️  Failed to create conversation:`, convError?.message)
        }
      }

      // Save messages if we have a response (cache hit) or conversation ID
      if (dbConversationId && responseText) {
        await supabase.from('chat_messages').insert([
          {
            conversation_id: dbConversationId,
            tenant_id: tenant.tenant_id,
            role: 'user',
            content: question
          },
          {
            conversation_id: dbConversationId,
            tenant_id: tenant.tenant_id,
            role: 'assistant',
            content: responseText
          }
        ])

        await supabase
          .from('guest_conversations')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', dbConversationId)

        console.log(`[${timestamp}] 💾 Saved public conversation messages (cache hit)`)
      }
    } catch (saveError) {
      console.error(`[${timestamp}] ⚠️  Error saving conversation:`, saveError)
    }

    if (cached) {
      const responseTime = Date.now() - startTime
      console.log(`[${timestamp}] ✅ Semantic cache hit - Response time: ${responseTime}ms`)

      // Add performance metrics to cached response
      const cachedWithMetrics = {
        ...cached,
        performance: {
          ...((cached as { performance?: Record<string, unknown> }).performance || {}),
          total_time_ms: responseTime,
          cache_hit: true,
          environment: process.env.NODE_ENV || 'unknown',
          timestamp: timestamp,
          cache_stats: process.env.NODE_ENV !== 'production' ? {
            memory_cache_size: memoryCache.size,
            cache_type: 'memory_only'
          } : undefined
        }
      }

      return NextResponse.json(cachedWithMetrics)
    }

    let context = ''
    let response = ''

    if (use_context) {
      try {
        // 2. TENANT-SPECIFIC SEARCH - Search only this tenant's embeddings
        const embeddingStart = Date.now()
        console.log(`[${timestamp}] 🔍 Generating embedding for tenant search...`)

        // Generate query embedding (1536 dims - same as tenant_knowledge_embeddings)
        const queryEmbedding = await generateEmbedding(question, 1536)
        const embeddingTime = Date.now() - embeddingStart
        console.log(`[${timestamp}] ✅ Embedding generated - Time: ${embeddingTime}ms`)

        const searchStart = Date.now()
        console.log(`[${timestamp}] 🔎 Searching tenant knowledge base (tenant_id: ${tenant.tenant_id})...`)

        // Search ONLY this tenant's embeddings (threshold 0.0 for debugging)
        console.log(`[${timestamp}] 🔍 Calling RPC with params:`, {
          p_tenant_id: tenant.tenant_id,
          p_match_threshold: 0.0,
          p_match_count: max_context_chunks,
          embedding_length: queryEmbedding.length
        })

        const { data: relevantDocs, error: searchError } = await supabase
          .rpc('search_tenant_embeddings', {
            p_tenant_id: tenant.tenant_id,
            p_query_embedding: queryEmbedding,
            p_match_threshold: 0.0,
            p_match_count: max_context_chunks
          })

        const searchTime = Date.now() - searchStart
        console.log(`[${timestamp}] ✅ Search completed - Time: ${searchTime}ms`)

        if (searchError) {
          console.error(`[${timestamp}] ❌ Tenant search failed:`, searchError)
          throw new Error(`Tenant search failed: ${searchError.message}`)
        }

        console.log(`[${timestamp}] ✅ Found ${relevantDocs?.length || 0} relevant documents`)
        console.log(`[${timestamp}] 📊 Raw results:`, JSON.stringify(relevantDocs))
        if (relevantDocs && relevantDocs.length > 0) {
          console.log(`[${timestamp}] 📄 First result: ${relevantDocs[0].file_path} (similarity: ${relevantDocs[0].similarity})`)
        }

        // Handle case: no documentation uploaded yet
        if (!relevantDocs || relevantDocs.length === 0) {
          console.log(`[${timestamp}] ℹ️ No documents found in tenant knowledge base`)

          const noDocsResponse = "I don't have any documentation loaded yet. Please ask the administrator to upload relevant documents."

          // Save messages before early return
          if (dbConversationId) {
            try {
              await supabase.from('chat_messages').insert([
                {
                  conversation_id: dbConversationId,
                  tenant_id: tenant.tenant_id,
                  role: 'user',
                  content: question
                },
                {
                  conversation_id: dbConversationId,
                  tenant_id: tenant.tenant_id,
                  role: 'assistant',
                  content: noDocsResponse
                }
              ])
              await supabase
                .from('guest_conversations')
                .update({ last_activity_at: new Date().toISOString() })
                .eq('id', dbConversationId)
              console.log(`[${timestamp}] 💾 Saved public conversation messages (no docs)`)
            } catch (saveError) {
              console.error(`[${timestamp}] ⚠️  Error saving messages:`, saveError)
            }
          }

          return NextResponse.json({
            response: noDocsResponse,
            context_used: false,
            question,
            performance: {
              total_time_ms: Date.now() - startTime,
              cache_hit: false,
              environment: process.env.NODE_ENV || 'unknown',
              timestamp: timestamp
            }
          })
        }

        // Build context from tenant docs
        context = relevantDocs
          .map((doc: { content: string }) => doc.content)
          .join('\n\n')

        const claudeStart = Date.now()
        console.log(`[${timestamp}] 🤖 Generating response for ${tenant.nombre_comercial}...`)

        // Generate response with tenant-specific system prompt
        const systemPrompt = `You are a helpful assistant for ${tenant.business_name || tenant.nombre_comercial}.

Use the following context to answer the user's question. If the context doesn't contain relevant information, politely say you don't have that information.

Context:
${context}`

        // Use Claude for response generation with custom system prompt
        response = await generateChatResponse(
          question,
          context,
          'tenant',
          tenant.tenant_id  // Pass tenant_id for AI usage tracking
        )
        const claudeTime = Date.now() - claudeStart
        console.log(`[${timestamp}] ✅ Response generated - Time: ${claudeTime}ms`)

      } catch (error) {
        console.error(`[${timestamp}] ❌ Error in context processing:`, error)
        console.log(`[${timestamp}] 🔄 Falling back to response without context`)

        try {
          // Continuar sin contexto si hay error en la búsqueda
          response = await generateChatResponse(
            question,
            '',
            'unified',
            tenant.tenant_id  // Pass tenant_id for AI usage tracking
          )
        } catch (fallbackError) {
          console.error(`[${timestamp}] ❌ Fatal error in fallback response:`, fallbackError)
          throw fallbackError
        }
      }
    } else {
      console.log(`[${timestamp}] 🤖 Generating response without context...`)
      const claudeStartNoContext = Date.now()

      // No context needed - generate response immediately
      response = await generateChatResponse(
        question,
        '',
        'unified',
        tenant.tenant_id  // Pass tenant_id for AI usage tracking
      )
      const claudeTime = Date.now() - claudeStartNoContext
      console.log(`[${timestamp}] ✅ Response generated - Time: ${claudeTime}ms`)
    }

    const totalTime = Date.now() - startTime

    const result = {
      response,
      context_used: context.length > 0,
      question,
      // Enhanced performance metrics
      performance: {
        total_time_ms: totalTime,
        cache_hit: false, // This is a new response, not cached
        environment: process.env.NODE_ENV || 'unknown',
        timestamp: timestamp,
        // Cache statistics
        cache_stats: process.env.NODE_ENV !== 'production' ? {
          memory_cache_size: memoryCache.size,
          cache_type: 'memory_only'
        } : undefined
      }
    }

    // Save to semantic cache (1 hour TTL)
    setCached(cacheKey, result, 3600)

    // Save messages to database for cache miss (new response)
    if (dbConversationId && response) {
      try {
        await supabase.from('chat_messages').insert([
          {
            conversation_id: dbConversationId,
            tenant_id: tenant.tenant_id,
            role: 'user',
            content: question
          },
          {
            conversation_id: dbConversationId,
            tenant_id: tenant.tenant_id,
            role: 'assistant',
            content: response
          }
        ])

        await supabase
          .from('guest_conversations')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', dbConversationId)

        console.log(`[${timestamp}] 💾 Saved public conversation messages (new response)`)
      } catch (saveError) {
        console.error(`[${timestamp}] ⚠️  Error saving messages for cache miss:`, saveError)
      }
    }

    console.log(`[${timestamp}] ✅ Request completed successfully - Total time: ${totalTime}ms`)
    console.log(`[${timestamp}] 💾 Saved to semantic cache`)

    return NextResponse.json(result)

  } catch (error) {
    const errorTime = Date.now() - startTime
    console.error(`[${timestamp}] ❌ Fatal error in chat API (${errorTime}ms):`, error)

    // Provide more specific error messages based on error type
    let errorMessage = 'Error interno del servidor'
    const errorDetails = error instanceof Error ? error.message : 'Unknown error'

    if (error instanceof Error) {
      if (error.message.includes('OPENAI')) {
        errorMessage = 'Error al generar embeddings'
      } else if (error.message.includes('Anthropic') || error.message.includes('Claude')) {
        errorMessage = 'Error al generar respuesta'
      } else if (error.message.includes('Supabase') || error.message.includes('database')) {
        errorMessage = 'Error en la base de datos'
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
        response_time: errorTime
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Chat API endpoint - Use POST method',
    endpoints: {
      'POST /api/chat': 'Send a question to the SIRE assistant'
    }
  })
}