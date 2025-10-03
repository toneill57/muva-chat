import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import {
  countTokens,
  calculateEmbeddingCost,
  getComplexityScore,
  calculateRoutingConfidence,
} from '@/lib/token-counter'
import { analyzeQuality } from '@/lib/quality-analyzer'
import {
  detectPremiumChatIntent,
  shouldSearchAccommodation,
  shouldSearchTourism,
  type PremiumChatIntent
} from '@/lib/premium-chat-intent'

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Please configure it in .env.local')
  }
  if (!apiKey.startsWith('sk-')) {
    throw new Error('OPENAI_API_KEY has invalid format. Expected format: sk-...')
  }
  return new OpenAI({ apiKey })
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase credentials not configured in .env.local')
  }
  return createClient(url, key)
}

async function generateEmbedding(text: string, dimensions: number = 1024): Promise<number[]> {
  const openai = getOpenAIClient()
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: dimensions,
    encoding_format: 'float',
  })
  return response.data[0].embedding
}

// Similarity threshold for showing results (dynamic - can be lowered if needed)
const SIMILARITY_THRESHOLD_HIGH = 0.2 // Optimized to capture short queries while filtering noise
const SIMILARITY_THRESHOLD_LOW = 0.15 // Fallback for rare queries with few results

function formatResponse(
  accommodationResults: any[],
  tourismResults: any[],
  query: string,
  intent: PremiumChatIntent
): string {
  // DYNAMIC THRESHOLD: Try high threshold first, fall back to low if needed

  // NEW: Metadata-aware filtering using avoidEntities
  const shouldAvoidResult = (result: any): boolean => {
    if (intent.avoidEntities.length === 0) return false

    const searchText = [
      result.name,
      result.title,
      result.source_file,
      result.description,
      result.content?.substring(0, 200)
    ].filter(Boolean).join(' ').toLowerCase()

    return intent.avoidEntities.some(entity =>
      searchText.includes(entity.toLowerCase())
    )
  }

  // Helper function to deduplicate and filter (with metadata-aware filtering)
  const deduplicateAccommodation = (results: any[], threshold: number) => {
    return results
      .filter(r => r.similarity > threshold)
      .filter(r => !shouldAvoidResult(r)) // NEW: Filter by avoidEntities
      .reduce((acc: any[], current) => {
        if (!acc.find(item => item.name === current.name)) {
          acc.push(current)
        }
        return acc
      }, [])
      .slice(0, 3) // Top 3 unique accommodation units
  }

  const deduplicateTourism = (results: any[], threshold: number) => {
    return results
      .filter(r => r.similarity > threshold)
      .filter(r => !shouldAvoidResult(r)) // NEW: Filter by avoidEntities
      .reduce((acc: any[], current) => {
        if (!acc.find(item => item.source_file === current.source_file)) {
          acc.push(current)
        }
        return acc
      }, [])
      .slice(0, 3) // Top 3 unique tourism sources
  }

  // Try high threshold first
  let uniqueAccommodation = deduplicateAccommodation(accommodationResults, SIMILARITY_THRESHOLD_HIGH)
  let uniqueTourism = deduplicateTourism(tourismResults, SIMILARITY_THRESHOLD_HIGH)
  let thresholdUsed = SIMILARITY_THRESHOLD_HIGH

  // If we have <3 total results and we're searching, try lower threshold
  const totalResults = uniqueAccommodation.length + uniqueTourism.length
  if (totalResults < 3 && (accommodationResults.length > 0 || tourismResults.length > 0)) {
    console.log(`[Premium Chat DEV] Only ${totalResults} results at threshold ${SIMILARITY_THRESHOLD_HIGH}, trying ${SIMILARITY_THRESHOLD_LOW}`)
    uniqueAccommodation = deduplicateAccommodation(accommodationResults, SIMILARITY_THRESHOLD_LOW)
    uniqueTourism = deduplicateTourism(tourismResults, SIMILARITY_THRESHOLD_LOW)
    thresholdUsed = SIMILARITY_THRESHOLD_LOW
  }

  const relevantAccommodation = uniqueAccommodation
  const relevantTourism = uniqueTourism

  console.log(`[Premium Chat DEV] Filtered results: ${relevantAccommodation.length} accommodation, ${relevantTourism.length} tourism (threshold: ${thresholdUsed})`)

  let response = "🧪 **[DESARROLLO]** Respuesta conversacional\n\n"

  // CASO 1: Solo Tourism
  if (intent.type === 'tourism' && relevantTourism.length > 0) {
    response += formatTourismOnly(relevantTourism)
    response += `\n\n📊 **Dev Info**: Intent=tourism (${(intent.confidence * 100).toFixed(0)}%), Showing ${relevantTourism.length} tourism results only`
    return response
  }

  // CASO 2: Solo Accommodation
  if (intent.type === 'accommodation' && relevantAccommodation.length > 0) {
    response += formatAccommodationOnly(relevantAccommodation)
    response += `\n\n📊 **Dev Info**: Intent=accommodation (${(intent.confidence * 100).toFixed(0)}%), Showing ${relevantAccommodation.length} accommodation results only`
    return response
  }

  // CASO 3: General (ambos)
  if (intent.shouldShowBoth) {
    if (relevantAccommodation.length > 0 || relevantTourism.length > 0) {
      response += formatBothConversational(relevantAccommodation, relevantTourism, intent.primaryFocus)
      response += `\n\n📊 **Dev Info**: Intent=general (${(intent.confidence * 100).toFixed(0)}%), Showing ${relevantAccommodation.length} accommodation + ${relevantTourism.length} tourism`
      return response
    }
  }

  // CASO 4: No hay resultados relevantes
  return formatNoResults(intent)
}

// Helper: Extract clean description from content
function extractCleanDescription(content: string, description: string | null, maxLength: number = 200): string {
  // Priority 1: Use description from frontmatter if available
  if (description && description.length > 20) {
    return description.length > maxLength
      ? description.substring(0, maxLength).trim() + '...'
      : description
  }

  // Priority 2: Extract from content
  let cleaned = content
    .replace(/^#.*\n/gm, '') // Remove all headers
    .replace(/#{1,6}\s/g, '') // Remove header markers
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/^-\s+/gm, '') // Remove bullet points
    .replace(/^\d+\.\s+/gm, '') // Remove numbered lists
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .trim()

  // Find first meaningful paragraph (skip very short lines)
  const paragraphs = cleaned.split('\n\n').filter(p => p.length > 50)
  const firstParagraph = paragraphs[0] || cleaned

  // Cut at sentence boundary near maxLength
  if (firstParagraph.length <= maxLength) {
    return firstParagraph
  }

  // Find last period, exclamation, or question mark before maxLength
  const truncated = firstParagraph.substring(0, maxLength)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  )

  if (lastSentenceEnd > 100) { // Only use sentence boundary if reasonable
    return truncated.substring(0, lastSentenceEnd + 1).trim()
  }

  // Fallback: cut at last space
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 100 ? truncated.substring(0, lastSpace) : truncated).trim() + '...'
}

function formatTourismOnly(results: any[]): string {
  if (results.length === 0) return ""

  let text = ""

  // Si solo hay 1 resultado, formato conciso con business info
  if (results.length === 1) {
    const top = results[0]
    const businessInfo = top.business_info || {}

    // Extract business name: prioritize title field, fallback to formatted filename
    let name = 'esta actividad'
    if (top.title) {
      name = top.title
    } else if (top.source_file) {
      // Format filename: banzai-surf-school → BANZAI SURF SCHOOL
      name = top.source_file
        .replace(/\.md$/, '')
        .split('-')
        .map((word: string) => word.toUpperCase())
        .join(' ')
    }

    text += `En San Andrés puedes ir a **${name}**:\n\n`

    // Add business metadata if available
    if (businessInfo.zona || businessInfo.precio || businessInfo.telefono) {
      if (businessInfo.zona) {
        text += `📍 **Zona**: ${businessInfo.zona}${businessInfo.subzona ? ` - ${businessInfo.subzona}` : ''}\n`
      }
      if (businessInfo.precio) {
        text += `💰 **Precio**: ${businessInfo.precio}\n`
      }
      if (businessInfo.telefono) {
        text += `📞 **Contacto**: ${businessInfo.telefono}\n`
      }
      if (businessInfo.website) {
        const cleanWebsite = businessInfo.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
        text += `🌐 **Web**: ${cleanWebsite}\n`
      }
      text += '\n'
    }

    const cleanDescription = extractCleanDescription(top.content, top.description, 300)
    text += `${cleanDescription}\n\n`
    return text
  }

  // Si hay múltiples resultados (2-3), formato detallado con separadores
  text += `En San Andrés encontré estas opciones:\n\n`

  results.forEach((result, index) => {
    const businessInfo = result.business_info || {}

    // Extract business name: prioritize title field, fallback to formatted filename
    let name = 'Opción'
    if (result.title) {
      name = result.title
    } else if (result.source_file) {
      // Format filename: banzai-surf-school → BANZAI SURF SCHOOL
      name = result.source_file
        .replace(/\.md$/, '')
        .split('-')
        .map((word: string) => word.toUpperCase())
        .join(' ')
    }

    // Separator line
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
    text += `**${index + 1}. ${name}**\n\n`

    // Business info - vertical layout
    if (businessInfo.zona) {
      text += `📍 **Zona**: ${businessInfo.zona}${businessInfo.subzona ? ` - ${businessInfo.subzona}` : ''}\n`
    }
    if (businessInfo.precio) {
      text += `💰 **Precio**: ${businessInfo.precio}\n`
    }
    // Show telefono, or fallback to contacto if telefono doesn't exist
    if (businessInfo.telefono) {
      text += `📞 **Contacto**: ${businessInfo.telefono}\n`
    } else if (businessInfo.contacto) {
      text += `📞 **Contacto**: ${businessInfo.contacto}\n`
    }
    if (businessInfo.website) {
      const cleanWebsite = businessInfo.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
      text += `🌐 **Web**: ${cleanWebsite}\n`
    }

    // Clean description - increased to 400 chars for more context
    const cleanDescription = extractCleanDescription(result.content, result.description, 400)
    text += `\n${cleanDescription}\n\n`
  })

  // Final separator
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`

  return text
}

function formatAccommodationOnly(results: any[]): string {
  if (results.length === 0) return ""

  let text = ""

  // Si solo hay 1 resultado, formato conciso
  if (results.length === 1) {
    const top = results[0]
    text += `Tenemos **${top.name}**:\n\n`

    if (top.content) {
      const cleanContent = top.content
        .replace(/^Apartamento: [^.]+\.\s*/, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim()
        .substring(0, 300)

      text += `${cleanContent}...\n\n`
    }

    if (top.view_type) {
      text += `📍 **Vista**: ${top.view_type}\n`
    }

    return text
  }

  // Si hay múltiples resultados, mostrar lista
  text += `Tenemos estas opciones de alojamiento:\n\n`

  results.forEach((result, index) => {
    text += `**${index + 1}. ${result.name}**\n`

    if (result.content) {
      const cleanContent = result.content
        .replace(/^Apartamento: [^.]+\.\s*/, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim()
        .substring(0, 200)

      text += `${cleanContent}...\n`
    }

    if (result.view_type) {
      text += `📍 Vista: ${result.view_type}\n`
    }

    text += `\n`
  })

  return text
}

function formatBothConversational(
  accommodation: any[],
  tourism: any[],
  primaryFocus: string
): string {
  let text = ""

  // Mostrar primero el tipo primario según el focus
  if (primaryFocus === 'accommodation' && accommodation.length > 0) {
    text += "🏨 **Alojamiento:**\n\n"
    text += formatAccommodationOnly(accommodation)
    text += "\n"

    if (tourism.length > 0) {
      text += "\n🌴 **Actividades:**\n\n"
      text += formatTourismOnly(tourism)
    }
  } else if (primaryFocus === 'tourism' && tourism.length > 0) {
    text += "🌴 **Actividades:**\n\n"
    text += formatTourismOnly(tourism)

    if (accommodation.length > 0) {
      text += "\n🏨 **Alojamiento:**\n\n"
      text += formatAccommodationOnly(accommodation)
    }
  } else {
    // 'general' or 'balanced' - show both starting with accommodation
    if (accommodation.length > 0) {
      text += "🏨 **Alojamiento:**\n\n"
      text += formatAccommodationOnly(accommodation)
    }

    if (tourism.length > 0) {
      if (text.length > 0) text += "\n"
      text += "\n🌴 **Actividades:**\n\n"
      text += formatTourismOnly(tourism)
    }
  }

  return text
}

function formatNoResults(intent: PremiumChatIntent): string {
  let text = "🧪 **[DEV]** Lo siento, no encontré información relevante "

  if (intent.type === 'tourism') {
    text += "sobre esa actividad. "
  } else if (intent.type === 'accommodation') {
    text += "sobre ese tipo de alojamiento. "
  } else {
    text += "sobre tu consulta. "
  }

  text += "¿Podrías ser más específico?\n\n"
  text += `📊 **Dev Info**: Intent=${intent.type}, No results above similarity threshold (${SIMILARITY_THRESHOLD_HIGH})`

  return text
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient()

  try {
    const { query, client_id, business_name } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    console.log(`[Premium Chat DEV] 🧪 Query: "${query}" for client: ${business_name}`)

    const startTime = Date.now()

    // === TOKEN COUNTING & COST CALCULATION ===
    const embeddingTokens = countTokens(query)
    const embeddingCost = calculateEmbeddingCost(embeddingTokens)
    console.log(`[Premium Chat DEV] 💰 Tokens: ${embeddingTokens}, Cost: $${embeddingCost.toFixed(6)}`)

    // === LLM INTENT DETECTION ===
    const intent = await detectPremiumChatIntent(query)
    console.log(`[Premium Chat DEV] 🤖 Intent:`, {
      type: intent.type,
      confidence: `${(intent.confidence * 100).toFixed(1)}%`,
      reasoning: intent.reasoning,
      shouldShowBoth: intent.shouldShowBoth
    })

    // Determine search strategy based on intent
    const searchAccommodation = shouldSearchAccommodation(intent)
    const searchTourism = shouldSearchTourism(intent)

    console.log(`[Premium Chat DEV] 🔍 Search strategy: accommodation=${searchAccommodation}, tourism=${searchTourism}`)

    // === EMBEDDING GENERATION (PARALLEL) ===
    console.log(`[Premium Chat DEV] Generating embeddings in parallel...`)
    const embeddingStartTime = Date.now()

    const [queryEmbeddingFast, queryEmbeddingFull] = await Promise.all([
      generateEmbedding(query, 1024), // For accommodation units (Tier 1)
      generateEmbedding(query, 3072)  // For MUVA tourism (Tier 3)
    ])

    const embeddingTime = Date.now() - embeddingStartTime
    console.log(`[Premium Chat DEV] Embeddings generated in parallel in ${embeddingTime}ms`)

    let accommodationResults: any[] = []
    let tourismResults: any[] = []
    let tierUsed = "Tier 1 (Ultra-fast) [DEV]"
    let vectorSearchTime = 0

    // === VECTOR SEARCH (ACCOMMODATION) ===
    if (searchAccommodation) {
      console.log(`[Premium Chat DEV] 🏨 Searching accommodation units...`)
      const accommodationStartTime = Date.now()

      const { data: unitResults, error: unitError } = await supabase
        .rpc('match_accommodation_units_fast', {
          query_embedding: queryEmbeddingFast,
          similarity_threshold: 0.1,
          match_count: 10 // Increased to allow deduplication
        })

      const accommodationSearchTime = Date.now() - accommodationStartTime
      vectorSearchTime += accommodationSearchTime

      if (unitError) {
        console.error(`[Premium Chat DEV] Accommodation search error:`, unitError)
      } else {
        accommodationResults = unitResults || []
        console.log(`[Premium Chat DEV] Found ${accommodationResults.length} accommodation results in ${accommodationSearchTime}ms`)
        console.log(`[Premium Chat DEV] Accommodation results preview:`, accommodationResults.map(r => ({ name: r.name, similarity: r.similarity })))
      }
    }

    // === VECTOR SEARCH (TOURISM) ===
    if (searchTourism) {
      console.log(`[Premium Chat DEV] 🌴 Searching MUVA tourism data...`)
      const tourismStartTime = Date.now()

      const { data: muvaResults, error: muvaError } = await supabase
        .rpc('match_muva_documents', {
          query_embedding: queryEmbeddingFull,
          match_threshold: 0.1,
          match_count: 10 // Increased to allow deduplication
        })

      const tourismSearchTime = Date.now() - tourismStartTime
      vectorSearchTime += tourismSearchTime

      if (muvaError) {
        console.error(`[Premium Chat DEV] Tourism search error:`, muvaError)
      } else {
        tourismResults = muvaResults || []
        console.log(`[Premium Chat DEV] Found ${tourismResults.length} tourism results in ${tourismSearchTime}ms`)
        console.log(`[Premium Chat DEV] Tourism results preview:`, tourismResults.map(r => ({ source: r.source_file, similarity: r.similarity })))
      }
    }

    // === RESPONSE FORMATTING ===
    const formattingStartTime = Date.now()
    const response = formatResponse(accommodationResults, tourismResults, query, intent)
    const formattingTime = Date.now() - formattingStartTime

    const totalTime = Date.now() - startTime
    const networkLatency = totalTime - (embeddingTime + vectorSearchTime + formattingTime)

    // === COMBINE ALL RESULTS ===
    const allResults = [...accommodationResults, ...tourismResults]

    // === QUALITY ANALYSIS ===
    const qualityMetrics = analyzeQuality(
      allResults,
      response,
      embeddingTokens,
      totalTime,
      embeddingCost,
      tierUsed
    )

    console.log(`[Premium Chat DEV] 📊 Quality Metrics:`, {
      avgSimilarity: qualityMetrics.avgSimilarity.toFixed(3),
      topSimilarity: qualityMetrics.topSimilarity.toFixed(3),
      tierEfficiency: qualityMetrics.tierEfficiency.toFixed(3),
      duplicates: qualityMetrics.duplicateCount
    })

    // === PREPARE SOURCES ===
    const sources = [
      ...accommodationResults.map(result => ({
        type: 'accommodation' as const,
        name: result.name || 'Accommodation Unit',
        similarity: result.similarity || 0
      })),
      ...tourismResults.map(result => ({
        type: 'tourism' as const,
        name: result.source_file || 'Tourism Info',
        similarity: result.similarity || 0
      }))
    ]

    console.log(`[Premium Chat DEV] 🎯 Response generated in ${totalTime}ms`)
    console.log(`[Premium Chat DEV] Performance breakdown:`, {
      embedding: embeddingTime,
      vectorSearch: vectorSearchTime,
      formatting: formattingTime,
      network: networkLatency
    })

    // === RETURN EXTENDED METRICS ===
    return NextResponse.json({
      success: true,
      response,
      sources,
      search_type: intent.type, // Use intent type instead of searchType

      // NEW: Extended metrics structure
      metrics: {
        tokens: {
          embeddingTokens,
          totalTokens: embeddingTokens,
          embeddingCost,
          totalCost: embeddingCost
        },
        performance: {
          responseTime: totalTime,
          tier: tierUsed,
          resultsCount: allResults.length,
          embeddingGenerationMs: embeddingTime,
          vectorSearchMs: vectorSearchTime,
          formattingMs: formattingTime,
          networkLatencyMs: networkLatency,
          avgSimilarityScore: qualityMetrics.avgSimilarity,
          topSimilarityScore: qualityMetrics.topSimilarity,
          tierEfficiency: qualityMetrics.tierEfficiency
        },
        analysis: {
          detectedType: intent.type,
          complexity: 'simple', // Can be enhanced later
          routingConfidence: intent.confidence,
          optimalTier: tierUsed,
          actualTier: tierUsed
        },
        intent: {
          type: intent.type,
          confidence: intent.confidence,
          reasoning: intent.reasoning,
          shouldShowBoth: intent.shouldShowBoth,
          primaryFocus: intent.primaryFocus
        },
        quality: {
          responseLength: response.length,
          sourceDiversity: qualityMetrics.sourceDiversity,
          duplicateResults: qualityMetrics.duplicateCount,
          tokensPerResult: qualityMetrics.tokensPerResult,
          timePerResult: qualityMetrics.timePerResult,
          costPerResult: qualityMetrics.costPerResult
        }
      },

      // Keep legacy fields for backwards compatibility
      tier_info: {
        name: tierUsed,
        dimensions: 1024,
        search_duration_ms: totalTime
      },
      results_count: allResults.length,
      performance: {
        embedding_generation_ms: embeddingTime,
        vector_search_ms: vectorSearchTime,
        total_ms: totalTime
      },
      dev_info: {
        endpoint_version: "development_v3_with_llm_intent",
        extra_logging: true,
        intent_detection: {
          method: "Claude Haiku LLM",
          detected_type: intent.type,
          confidence: intent.confidence,
          reasoning: intent.reasoning,
          shouldShowBoth: intent.shouldShowBoth,
          primaryFocus: intent.primaryFocus
        }
      }
    })

  } catch (error) {
    console.error('[Premium Chat DEV] 🚨 API Error:', error)
    return NextResponse.json({
      error: 'Internal server error (development)',
      details: error instanceof Error ? error.message : 'Unknown error',
      dev_info: {
        endpoint_version: "development_v2",
        error_context: "This is the development endpoint - errors here don't affect production"
      }
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Premium Chat DEV API endpoint - Use POST method',
    description: '🧪 Development version of unified search across accommodation and tourism data',
    features: [
      'Multi-content search (hotel + tourism)',
      'Ultra-fast Vector Search (Tier 1)',
      'Natural conversation formatting',
      'Smart query type detection',
      'Performance optimized responses',
      'Extended development logging',
      'Similarity score display',
      'Query analysis breakdown'
    ],
    dev_info: {
      version: "development",
      purpose: "Testing and experimentation without affecting production",
      differences_from_prod: [
        "Extended logging and debugging info",
        "Similarity scores in responses",
        "Query analysis metadata",
        "Development indicators in UI",
        "Error context for debugging"
      ]
    }
  })
}