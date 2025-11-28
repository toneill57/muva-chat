import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/openai'
import { generateChatResponse } from '@/lib/claude'
import { createClient } from '@supabase/supabase-js'
import { determineOptimalSearch } from '@/lib/search-router'

export const runtime = 'edge'

// Lazy initialization to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Enhanced semantic cache for MUVA tourism
const muvaCache = new Map<string, { data: unknown, expires: number }>()

// Semantic groups for MUVA tourism
const MUVA_SEMANTIC_GROUPS = {
  "restaurants": [
    "restaurantes",
    "comer",
    "comida",
    "gastronomía",
    "cenar",
    "almorzar",
    "dónde comer"
  ],
  "activities": [
    "actividades",
    "qué hacer",
    "tours",
    "excursiones",
    "deportes",
    "aventuras",
    "buceo",
    "snorkel",
    "surf"
  ],
  "spots": [
    "lugares",
    "sitios",
    "spots",
    "beach club",
    "playa",
    "relajarse",
    "descansar",
    "ambiente"
  ],
  "nightlife": [
    "vida nocturna",
    "fiesta",
    "noche",
    "música",
    "entretenimiento",
    "eventos",
    "cultura"
  ],
  "transport": [
    "transporte",
    "alquiler",
    "carro",
    "moto",
    "movilidad",
    "cómo llegar",
    "pontón"
  ],
  "beaches": [
    "playas",
    "costa",
    "mar",
    "arena",
    "sol",
    "natación",
    "mejores playas"
  ],
  "zones": [
    "zona",
    "ubicación",
    "dónde está",
    "san luis",
    "centro",
    "rocky cay",
    "cove"
  ]
}

function hashQuestion(question: string): string {
  const str = question.toLowerCase().trim()
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

function getMuvaSemanticCacheKey(question: string): string {
  const normalizedQuestion = question.toLowerCase().trim()

  // Check semantic groups
  for (const [groupKey, patterns] of Object.entries(MUVA_SEMANTIC_GROUPS)) {
    for (const pattern of patterns) {
      if (normalizedQuestion.includes(pattern)) {
        return `muva:semantic:${groupKey}`
      }
    }
  }

  // Fallback to exact match
  return `muva:exact:${hashQuestion(question)}`
}

function getCached(key: string) {
  const cached = muvaCache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }
  if (cached) {
    muvaCache.delete(key)
  }
  return null
}

function setCached(key: string, data: unknown, ttlSeconds: number = 3600) {
  muvaCache.set(key, {
    data,
    expires: Date.now() + (ttlSeconds * 1000)
  })
}

// MUVA tourism-specific prompt
function getMuvaPrompt(): string {
  return `Eres un asistente especializado en turismo y actividades en San Andrés, Colombia. Ayudas a los visitantes a descubrir restaurantes, playas, actividades, transporte y experiencias culturales en la isla.

INSTRUCCIONES DE FORMATO:
- Responde de manera útil, precisa y concisa sobre turismo en San Andrés
- Usa formato Markdown para mejorar la legibilidad:
  * **Negritas** para nombres de lugares y términos importantes
  * Listas numeradas para recomendaciones ordenadas
  * Listas con viñetas para opciones o características
  * \`código\` para precios específicos y horarios
- Estructura la información de forma clara y organizada
- Si no tienes información suficiente en el contexto, indica que necesitas más detalles específicos

Enfócate específicamente en:
- Recomendaciones turísticas, restaurantes, actividades acuáticas, vida nocturna y experiencias locales
- Incluye detalles prácticos como horarios, ubicaciones, precios y segmentación de visitantes cuando estén disponibles
- Menciona zonas específicas (San Luis, Centro, Cove) y características de cada área
- Proporciona información sobre proximidad a aeropuerto y tipos de experiencias (low cost, aventurero, lujo, etc.)

Responde en español y con formato Markdown apropiado.`
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  const supabase = getSupabaseClient()

  try {
    console.log(`[${timestamp}] MUVA Tourism Chat API request started`)

    // Parse request body
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

    const {
      question,
      use_context = true,
      max_context_chunks = 4
    } = requestBody

    // Validate required parameters
    if (!question || typeof question !== 'string') {
      console.log(`[${timestamp}] Invalid request: missing or invalid question`)
      return NextResponse.json(
        { error: 'Question is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate question length
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

    console.log(`[${timestamp}] Processing MUVA tourism question: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`)

    // Check cache first
    const cacheKey = getMuvaSemanticCacheKey(question)
    const cached = getCached(cacheKey)
    if (cached) {
      const responseTime = Date.now() - startTime
      console.log(`[${timestamp}] ✅ MUVA cache hit - Response time: ${responseTime}ms`)

      const cachedWithMetrics = {
        ...cached,
        performance: {
          ...((cached as { performance?: Record<string, unknown> }).performance || {}),
          total_time_ms: responseTime,
          cache_hit: true,
          environment: process.env.NODE_ENV || 'unknown',
          timestamp: timestamp
        }
      }

      return NextResponse.json(cachedWithMetrics)
    }

    let context = ''
    let response = ''

    if (use_context) {
      try {
        // 🪆 MATRYOSHKA TIER 1 for MUVA tourism (fast performance)
        const muvaStrategy = { tier: 1, dimensions: 1024, description: 'MUVA tourism (fast)' }
        console.log(`[${timestamp}] 🪆 Using Tier 1 (1024 dims) for MUVA tourism search`)

        const embeddingStart = Date.now()
        console.log(`[${timestamp}] 🔍 Generating ${muvaStrategy.dimensions}-dimensional embedding...`)

        const queryEmbedding = await generateEmbedding(question, muvaStrategy.dimensions)
        const embeddingTime = Date.now() - embeddingStart
        console.log(`[${timestamp}] ✅ Tier 1 embedding generated - Time: ${embeddingTime}ms, Dimensions: ${muvaStrategy.dimensions}`)

        const searchStart = Date.now()
        console.log(`[${timestamp}] 🔎 Searching MUVA tourism documents...`)

        // Search specifically in muva_content table
        const { data, error } = await supabase
          .rpc('match_muva_documents', {
            query_embedding: queryEmbedding,
            match_threshold: 0.0,
            match_count: max_context_chunks
          })

        const searchTime = Date.now() - searchStart

        if (error) {
          console.error(`[${timestamp}] ❌ MUVA search failed:`, error)
          throw new Error(`MUVA search failed: ${error.message}`)
        }

        console.log(`[${timestamp}] ✅ Found ${data?.length || 0} relevant MUVA documents - Search time: ${searchTime}ms`)

        if (data && data.length > 0) {
          context = data
            .map((doc: any) => doc.content)
            .join('\n\n')
        }

        const claudeStart = Date.now()
        console.log(`[${timestamp}] 🤖 Generating Claude response for MUVA tourism...`)

        // Generate response with tourism-specific prompt
        // Use special tenant_id for MUVA tourism content
        response = await generateChatResponse(
          question,
          context,
          'tourism',
          '00000000-0000-0000-0000-000000000001'  // Special ID for MUVA Tourism
        )
        const claudeTime = Date.now() - claudeStart
        console.log(`[${timestamp}] ✅ Claude response generated - Time: ${claudeTime}ms`)

      } catch (error) {
        console.error(`[${timestamp}] ❌ Error in MUVA context processing:`, error)
        console.log(`[${timestamp}] 🔄 Falling back to response without context`)

        try {
          response = await generateChatResponse(
            question,
            '',
            'tourism',
            '00000000-0000-0000-0000-000000000001'  // Special ID for MUVA Tourism
          )
        } catch (fallbackError) {
          console.error(`[${timestamp}] ❌ Fatal error in MUVA fallback response:`, fallbackError)
          throw fallbackError
        }
      }
    } else {
      console.log(`[${timestamp}] 🤖 Generating MUVA response without context...`)
      const claudeStartNoContext = Date.now()

      response = await generateChatResponse(
        question,
        '',
        'tourism',
        '00000000-0000-0000-0000-000000000001'  // Special ID for MUVA Tourism
      )
      const claudeTime = Date.now() - claudeStartNoContext
      console.log(`[${timestamp}] ✅ MUVA response generated - Time: ${claudeTime}ms`)
    }

    const totalTime = Date.now() - startTime

    const result = {
      response,
      context_used: context.length > 0,
      question,
      performance: {
        total_time_ms: totalTime,
        cache_hit: false,
        environment: process.env.NODE_ENV || 'unknown',
        timestamp: timestamp,
        endpoint: 'muva'
      }
    }

    // Save to cache
    setCached(cacheKey, result, 3600)

    console.log(`[${timestamp}] ✅ MUVA request completed successfully - Total time: ${totalTime}ms`)
    console.log(`[${timestamp}] 💾 Saved to MUVA cache`)

    return NextResponse.json(result)

  } catch (error) {
    const errorTime = Date.now() - startTime
    console.error(`[${timestamp}] ❌ Fatal error in MUVA chat API (${errorTime}ms):`, error)

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
        response_time: errorTime,
        endpoint: 'muva'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'MUVA Tourism Chat API endpoint - Use POST method',
    description: 'Specialized chat for San Andrés tourism recommendations',
    focus: 'Restaurants, activities, spots, nightlife, transport, beaches, cultural experiences',
    zones: ['San Luis', 'Centro', 'Cove', 'Rocky Cay', 'El Paraíso'],
    segments: ['Low cost', 'Mochilero', 'Aventurero', 'Eco friendly', 'Soltero', 'Negocios', 'Lujo'],
    parameters: {
      'question': 'Required: The tourism question to ask (string)',
      'use_context': 'Optional: Whether to use context retrieval (default: true)',
      'max_context_chunks': 'Optional: Max context chunks 1-10 (default: 4)'
    },
    endpoints: {
      'POST /api/chat/muva': 'Send a tourism question to the MUVA assistant'
    }
  })
}