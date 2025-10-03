import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/openai'
import { createServerClient } from '@/lib/supabase'  // Use supabase client directly for proper multi-tenant search
import { generateChatResponse } from '@/lib/claude'
import { determineOptimalSearch } from '@/lib/search-router'
import { detectQueryIntent, getSearchConfig, calculateSearchCounts } from '@/lib/query-intent'
// Note: Vercel KV not implemented - using memory cache only

export const runtime = 'edge'

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
  const supabase = createServerClient()

  try {
    console.log(`[${timestamp}] Chat API request started`)

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
        // 🤖 Detect query intent to determine search strategy
        const intentStart = Date.now()
        console.log(`[${timestamp}] 🤖 Detecting query intent...`)

        const queryIntent = await detectQueryIntent(question)
        const intentTime = Date.now() - intentStart
        console.log(`[${timestamp}] ✅ Intent detected: ${queryIntent.type} (confidence: ${queryIntent.confidence}) - Time: ${intentTime}ms`)
        console.log(`[${timestamp}] 📝 Reasoning: ${queryIntent.reasoning}`)

        const searchConfig = getSearchConfig(queryIntent, false) // No MUVA access for now
        const searchCounts = calculateSearchCounts(searchConfig, max_context_chunks)

        const embeddingStart = Date.now()
        let allResults: any[] = []
        let detectedDomain = 'unified'

        // Check if this is an accommodation-related query
        const isAccommodationQuery = ['inventory_complete', 'specific_unit', 'feature_inquiry', 'pricing_inquiry'].includes(queryIntent.type)

        if (isAccommodationQuery) {
          // 🪆 MATRYOSHKA TIER 1 for accommodation units (ultra-fast)
          const accommodationStrategy = { tier: 1, dimensions: 1024, description: 'Accommodation units (fast)' }
          console.log(`[${timestamp}] 🪆 Using Tier 1 (1024 dims) for accommodation search`)
          console.log(`[${timestamp}] 🔍 Generating ${accommodationStrategy.dimensions}-dimensional embedding...`)

          // Generate embedding for accommodation search
          const queryEmbedding = await generateEmbedding(question, accommodationStrategy.dimensions)
          const embeddingTime = Date.now() - embeddingStart
          console.log(`[${timestamp}] ✅ Tier 1 embedding generated - Time: ${embeddingTime}ms, Dimensions: ${accommodationStrategy.dimensions}`)

          const searchStart = Date.now()
          console.log(`[${timestamp}] 🏨 Searching accommodation units...`)

          // Search accommodation units using fast embeddings
          const { data: accommodationData, error: accommodationError } = await supabase
            .rpc('match_accommodation_units_fast', {
              query_embedding: queryEmbedding,
              similarity_threshold: 0.0,
              match_count: searchCounts.tenantCount
            })

          if (accommodationError) {
            console.error(`[${timestamp}] ❌ Accommodation search failed:`, accommodationError)
          } else {
            allResults.push(...(accommodationData || []))
            console.log(`[${timestamp}] ✅ Found ${accommodationData?.length || 0} accommodation units`)
          }

          const searchTime = Date.now() - searchStart
          console.log(`[${timestamp}] ✅ Accommodation search completed - Time: ${searchTime}ms`)
          detectedDomain = 'accommodation'
        }

        // Always search SIRE documents as fallback/additional context
        if (allResults.length < max_context_chunks) {
          const sireStrategy = { tier: 2, dimensions: 1536, description: 'SIRE documentation (balanced)' }
          console.log(`[${timestamp}] 🪆 Also searching SIRE documents with Tier 2 (1536 dims)`)

          const sireEmbedding = await generateEmbedding(question, sireStrategy.dimensions)
          const remainingCount = max_context_chunks - allResults.length

          const { data: sireData, error: sireError } = await supabase
            .rpc('match_sire_documents', {
              query_embedding: sireEmbedding,
              match_threshold: 0.0,
              match_count: remainingCount
            })

          if (sireError) {
            console.error(`[${timestamp}] ❌ SIRE search failed:`, sireError)
          } else {
            allResults.push(...(sireData || []))
            console.log(`[${timestamp}] ✅ Found ${sireData?.length || 0} SIRE documents`)
          }

          if (!isAccommodationQuery) {
            detectedDomain = 'sire'
          }
        }

        const searchResult = {
          results: allResults,
          detectedDomain,
          queryIntent: queryIntent.type
        }

        console.log(`[${timestamp}] ✅ Total results found: ${searchResult.results.length}`)
        console.log(`[${timestamp}] 🎯 Detected domain: ${searchResult.detectedDomain}`)

        // Construir contexto
        context = searchResult.results
          .map(doc => doc.content)
          .join('\n\n')

        const claudeStart = Date.now()
        console.log(`[${timestamp}] 🤖 Generating Claude response...`)

        // Generar respuesta con Claude (usando el contexto encontrado y dominio detectado)
        response = await generateChatResponse(question, context, searchResult.detectedDomain)
        const claudeTime = Date.now() - claudeStart
        console.log(`[${timestamp}] ✅ Claude response generated - Time: ${claudeTime}ms`)

      } catch (error) {
        console.error(`[${timestamp}] ❌ Error in context processing:`, error)
        console.log(`[${timestamp}] 🔄 Falling back to response without context`)

        try {
          // Continuar sin contexto si hay error en la búsqueda
          response = await generateChatResponse(question, '', 'unified')
        } catch (fallbackError) {
          console.error(`[${timestamp}] ❌ Fatal error in fallback response:`, fallbackError)
          throw fallbackError
        }
      }
    } else {
      console.log(`[${timestamp}] 🤖 Generating response without context...`)
      const claudeStartNoContext = Date.now()

      // No context needed - generate response immediately
      response = await generateChatResponse(question, '', 'unified')
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