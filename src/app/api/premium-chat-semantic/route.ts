import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import {
  semanticUnderstanding,
  generateMultiQueries,
  curateResults,
  type SemanticUnderstanding,
  type MultiQuery,
  type CurationOutput
} from '@/lib/premium-chat-semantic'

// Lazy initialization to avoid build-time errors
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  })
}

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function generateEmbedding(text: string, dimensions: number = 3072): Promise<number[]> {
  const openai = getOpenAIClient()
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: dimensions,
    encoding_format: 'float',
  })
  return response.data[0].embedding
}

// Format response for user
function formatSemanticResponse(
  curatedResults: CurationOutput,
  understanding: SemanticUnderstanding
): string {
  let response = "🔬 **[SEMÁNTICO]** Respuesta basada en comprensión profunda\n\n"

  if (curatedResults.topResults.length === 0) {
    response += `Lo siento, no encontré resultados relevantes para tu búsqueda.\n\n`
    response += `🤔 **Intent detectado**: ${understanding.intent}\n`
    response += `💭 **Contexto**: ${understanding.userContext}\n`
    return response
  }

  // Separate results by type
  const accommodationResults = curatedResults.topResults.filter(cr => cr.result.type === 'accommodation')
  const tourismResults = curatedResults.topResults.filter(cr => cr.result.type === 'tourism')

  // Show results with LLM reasoning
  response += `Encontré estas opciones basándome en tu interés por **${understanding.intent}**:\n\n`

  // ACCOMMODATION SECTION
  if (accommodationResults.length > 0) {
    response += `🏨 **Alojamiento:**\n\n`

    accommodationResults.forEach((cr, index) => {
      const result = cr.result
      const name = result.name || result.title || 'Unidad'

      response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
      response += `**${index + 1}. ${name}**\n\n`

      // Accommodation specific fields
      if (result.view_type) {
        response += `🌅 **Vista**: ${result.view_type}\n`
      }
      if (result.guest_count) {
        response += `👥 **Capacidad**: ${result.guest_count} personas\n`
      }

      // Description
      const description = result.content || result.description || ''
      const cleanDesc = description
        .replace(/^Apartamento: [^.]+\.\s*/, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim()
        .substring(0, 300)

      response += `\n${cleanDesc}${cleanDesc.length >= 300 ? '...' : ''}\n\n`

      // LLM Reasoning
      response += `💡 **Por qué te lo recomiendo**: ${cr.whyRelevant}\n\n`
    })
  }

  // TOURISM SECTION
  if (tourismResults.length > 0) {
    if (accommodationResults.length > 0) {
      response += `\n` // Separator between sections
    }

    response += `🌴 **Actividades y Lugares:**\n\n`

    tourismResults.forEach((cr, index) => {
      const result = cr.result
      const businessInfo = result.business_info || {}

      // Extract name
      let name = 'Opción'
      if (result.title) {
        name = result.title
      } else if (result.source_file) {
        name = result.source_file
          .replace(/\.md$/, '')
          .split('-')
          .map((word: string) => word.toUpperCase())
          .join(' ')
      } else if (result.name) {
        name = result.name
      }

      response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
      response += `**${index + 1}. ${name}**\n\n`

      // Business metadata
      if (businessInfo.zona) {
        response += `📍 **Zona**: ${businessInfo.zona}${businessInfo.subzona ? ` - ${businessInfo.subzona}` : ''}\n`
      }
      if (businessInfo.precio) {
        response += `💰 **Precio**: ${businessInfo.precio}\n`
      }
      if (businessInfo.telefono) {
        response += `📞 **Contacto**: ${businessInfo.telefono}\n`
      } else if (businessInfo.contacto) {
        response += `📞 **Contacto**: ${businessInfo.contacto}\n`
      }
      if (businessInfo.website) {
        const cleanWebsite = businessInfo.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
        response += `🌐 **Web**: ${cleanWebsite}\n`
      }

      // Description
      const description = result.description || result.content || ''
      const cleanDesc = description
        .replace(/^#.*\n/gm, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .trim()
        .substring(0, 300)

      response += `\n${cleanDesc}${cleanDesc.length >= 300 ? '...' : ''}\n\n`

      // LLM Reasoning
      response += `💡 **Por qué te lo recomiendo**: ${cr.whyRelevant}\n\n`
    })
  }

  response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

  // Show semantic analysis
  response += `🧠 **Análisis semántico**:\n`
  response += `- Intent: ${understanding.intent}\n`
  response += `- Confidence: ${(understanding.confidence * 100).toFixed(0)}%\n`
  response += `- Keywords: ${understanding.semanticKeywords.slice(0, 5).join(', ')}\n`

  if (curatedResults.rejectedResults.length > 0) {
    response += `\n❌ **Descartados**: ${curatedResults.rejectedResults.length} resultados no relevantes\n`
  }

  return response
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient()

  try {
    const { query, client_id, business_name } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log(`[Semantic Chat] 🔬 SEMANTIC SEARCH PIPELINE`)
    console.log(`Query: "${query}" | Client: ${business_name}`)
    console.log(`${'='.repeat(60)}\n`)

    const startTime = Date.now()
    const metrics: any = {
      steps: {},
      llmCalls: 0,
      totalTokens: 0,
      totalCost: 0
    }

    // ============================================================
    // STEP 1: SEMANTIC UNDERSTANDING
    // ============================================================
    console.log(`\n[STEP 1] 🧠 SEMANTIC UNDERSTANDING`)
    const step1Start = Date.now()

    const understanding = await semanticUnderstanding(query)
    metrics.steps.semanticUnderstanding = Date.now() - step1Start
    metrics.llmCalls++

    console.log(`✓ Intent: ${understanding.intent}`)
    console.log(`✓ Context: ${understanding.userContext}`)
    console.log(`✓ Expected: ${understanding.expectedEntities.join(', ')}`)
    console.log(`✓ Avoid: ${understanding.avoidEntities.join(', ')}`)
    console.log(`✓ Filters: ${JSON.stringify(understanding.metadataFilters)}`)

    // ============================================================
    // STEP 2: MULTI-QUERY GENERATION
    // ============================================================
    console.log(`\n[STEP 2] 🔀 MULTI-QUERY GENERATION`)
    const step2Start = Date.now()

    const multiQuery = await generateMultiQueries(query, understanding)
    metrics.steps.multiQueryGeneration = Date.now() - step2Start
    metrics.llmCalls++

    console.log(`✓ Generated ${multiQuery.queries.length} queries:`)
    multiQuery.queries.forEach((q, i) => {
      console.log(`  ${i + 1}. "${q}"`)
    })

    // ============================================================
    // STEP 3: PARALLEL VECTOR SEARCH + METADATA FILTERING
    // ============================================================
    console.log(`\n[STEP 3] 🔍 PARALLEL VECTOR SEARCH`)
    const step3Start = Date.now()

    // Determine what to search based on semantic understanding
    const shouldSearchAccommodation = understanding.expectedEntities.some((entity: string) =>
      entity.toLowerCase().includes('alojamiento') ||
      entity.toLowerCase().includes('habitación') ||
      entity.toLowerCase().includes('hotel') ||
      entity.toLowerCase().includes('suite') ||
      entity.toLowerCase().includes('apartamento')
    )

    const shouldSearchTourism = understanding.expectedEntities.some((entity: string) =>
      entity.toLowerCase().includes('actividad') ||
      entity.toLowerCase().includes('restaurante') ||
      entity.toLowerCase().includes('spot') ||
      entity.toLowerCase().includes('turismo') ||
      entity.toLowerCase().includes('tour') ||
      entity.toLowerCase().includes('playa')
    ) || understanding.metadataFilters.categoria?.some((cat: string) =>
      ['Actividad', 'Restaurante', 'Spot', 'Alquiler'].includes(cat)
    )

    console.log(`✓ Search strategy: accommodation=${shouldSearchAccommodation}, tourism=${shouldSearchTourism}`)

    let accommodationCandidates: any[] = []
    let tourismCandidates: any[] = []

    // Generate embeddings (fast for accommodation, full for tourism)
    const embeddingPromises: Promise<number[]>[] = []

    if (shouldSearchAccommodation) {
      // 1024d embeddings for accommodation
      embeddingPromises.push(...multiQuery.queries.map(q => generateEmbedding(q, 1024)))
    }

    if (shouldSearchTourism) {
      // 3072d embeddings for tourism
      embeddingPromises.push(...multiQuery.queries.map(q => generateEmbedding(q, 3072)))
    }

    const embeddings = await Promise.all(embeddingPromises)
    console.log(`✓ Generated ${embeddings.length} embeddings`)

    // SEARCH ACCOMMODATION
    if (shouldSearchAccommodation) {
      console.log(`  🏨 Searching accommodation units...`)
      const accommodationEmbeddings = embeddings.slice(0, multiQuery.queries.length)

      const accommodationSearches = accommodationEmbeddings.map(async (embedding, idx) => {
        const { data, error } = await supabase
          .rpc('match_accommodation_units_fast', {
            query_embedding: embedding,
            similarity_threshold: 0.1,
            match_count: 5
          })

        if (error) {
          console.error(`  ❌ Accommodation search error (query ${idx + 1}):`, error)
          return []
        }

        return data || []
      })

      const accommodationResults = await Promise.all(accommodationSearches)
      const flatAccommodation = accommodationResults.flat()

      // Deduplicate accommodation by name
      accommodationCandidates = flatAccommodation.reduce((acc: any[], current) => {
        if (!acc.find(item => item.name === current.name)) {
          acc.push({ ...current, type: 'accommodation' })
        }
        return acc
      }, [])

      console.log(`  ✓ Found ${accommodationCandidates.length} unique accommodation candidates`)
    }

    // SEARCH TOURISM
    if (shouldSearchTourism) {
      console.log(`  🌴 Searching MUVA tourism content...`)
      const tourismEmbeddings = shouldSearchAccommodation
        ? embeddings.slice(multiQuery.queries.length)
        : embeddings

      const tourismSearches = tourismEmbeddings.map(async (embedding, idx) => {
        const { data, error } = await supabase
          .rpc('match_muva_documents', {
            query_embedding: embedding,
            match_threshold: 0.1,
            match_count: 5
          })

        if (error) {
          console.error(`  ❌ Tourism search error (query ${idx + 1}):`, error)
          return []
        }

        return data || []
      })

      const tourismResults = await Promise.all(tourismSearches)
      const flatTourism = tourismResults.flat()

      // Deduplicate tourism by source_file or title
      tourismCandidates = flatTourism.reduce((acc: any[], current) => {
        const exists = acc.find(item =>
          (item.source_file && item.source_file === current.source_file) ||
          (item.title && item.title === current.title)
        )
        if (!exists) {
          acc.push({ ...current, type: 'tourism' })
        }
        return acc
      }, [])

      // Apply metadata filtering if specified
      if (understanding.metadataFilters.categoria) {
        const beforeFilter = tourismCandidates.length
        tourismCandidates = tourismCandidates.filter((c: any) => {
          const businessInfo = c.business_info || {}
          const categoria = businessInfo.categoria
          return understanding.metadataFilters.categoria?.includes(categoria)
        })
        console.log(`  ✓ Filtered by categoria: ${beforeFilter} → ${tourismCandidates.length} candidates`)
      }

      console.log(`  ✓ Found ${tourismCandidates.length} unique tourism candidates`)
    }

    // Combine all candidates
    const allCandidates = [...accommodationCandidates, ...tourismCandidates]
    metrics.steps.vectorSearch = Date.now() - step3Start

    console.log(`✓ Total unique candidates: ${allCandidates.length} (${accommodationCandidates.length} accommodation + ${tourismCandidates.length} tourism)`)

    // ============================================================
    // STEP 4: LLM RESULT CURATION
    // ============================================================
    console.log(`\n[STEP 4] 🎯 LLM RESULT CURATION`)
    const step4Start = Date.now()

    const curation = await curateResults(query, understanding, allCandidates)
    metrics.steps.resultCuration = Date.now() - step4Start
    metrics.llmCalls++

    console.log(`✓ Selected ${curation.topResults.length} top results`)
    curation.topResults.forEach((cr, i) => {
      const name = cr.result.title || cr.result.name || cr.result.source_file || 'Unknown'
      const type = cr.result.type || 'unknown'
      console.log(`  ${i + 1}. [${type}] ${name} (score: ${cr.score.toFixed(2)})`)
      console.log(`     → ${cr.reasoning}`)
    })

    if (curation.rejectedResults.length > 0) {
      console.log(`✓ Rejected ${curation.rejectedResults.length} results:`)
      curation.rejectedResults.slice(0, 3).forEach(rr => {
        console.log(`  ✗ ${rr.name}: ${rr.reasoning}`)
      })
    }

    // ============================================================
    // STEP 5: CONVERSATIONAL FORMATTING
    // ============================================================
    console.log(`\n[STEP 5] 💬 RESPONSE FORMATTING`)
    const step5Start = Date.now()

    const response = formatSemanticResponse(curation, understanding)
    metrics.steps.responseFormatting = Date.now() - step5Start

    const totalTime = Date.now() - startTime

    // Calculate costs (estimated)
    const embeddingCost = embeddings.length * 0.00013 / 1000 // $0.13 per 1M tokens, ~1 token per char
    const llmCost = metrics.llmCalls * 0.00005 // Approximate $0.05 per call
    metrics.totalCost = embeddingCost + llmCost

    console.log(`\n${'='.repeat(60)}`)
    console.log(`[Semantic Chat] ✅ COMPLETE`)
    console.log(`Total time: ${totalTime}ms`)
    console.log(`LLM calls: ${metrics.llmCalls}`)
    console.log(`Estimated cost: $${metrics.totalCost.toFixed(6)}`)
    console.log(`${'='.repeat(60)}\n`)

    // ============================================================
    // PREPARE SOURCES
    // ============================================================
    const sources = curation.topResults.map(cr => ({
      type: (cr.result.type || 'tourism') as 'accommodation' | 'tourism',
      name: cr.result.title || cr.result.name || cr.result.source_file || 'Unknown',
      similarity: cr.result.similarity || 0,
      llmScore: cr.score,
      reasoning: cr.reasoning,
      whyRelevant: cr.whyRelevant
    }))

    // ============================================================
    // RETURN RESPONSE
    // ============================================================
    return NextResponse.json({
      success: true,
      response,
      sources,
      search_type: 'semantic',

      metrics: {
        performance: {
          totalMs: totalTime,
          semanticUnderstandingMs: metrics.steps.semanticUnderstanding,
          multiQueryGenerationMs: metrics.steps.multiQueryGeneration,
          vectorSearchMs: metrics.steps.vectorSearch,
          resultCurationMs: metrics.steps.resultCuration,
          responseFormattingMs: metrics.steps.responseFormatting
        },
        llm: {
          callsCount: metrics.llmCalls,
          estimatedCost: metrics.totalCost
        },
        search: {
          queriesGenerated: multiQuery.queries.length,
          totalCandidates: allCandidates.length,
          accommodationCandidates: accommodationCandidates.length,
          tourismCandidates: tourismCandidates.length,
          topResultsSelected: curation.topResults.length,
          resultsRejected: curation.rejectedResults.length
        }
      },

      semantic_analysis: {
        intent: understanding.intent,
        userContext: understanding.userContext,
        confidence: understanding.confidence,
        reasoning: understanding.reasoning,
        expectedEntities: understanding.expectedEntities,
        avoidEntities: understanding.avoidEntities,
        semanticKeywords: understanding.semanticKeywords,
        metadataFilters: understanding.metadataFilters,
        multiQueryStrategy: multiQuery.strategy,
        queries: multiQuery.queries,
        curationReasoning: curation.reasoning
      },

      dev_info: {
        endpoint_version: "semantic_v1_llm_driven",
        pipeline: "5-step semantic search",
        llm_model: "claude-3-haiku-20240307",
        features: [
          "Deep semantic understanding",
          "Multi-query generation",
          "Metadata-aware filtering",
          "LLM result curation",
          "Explainable reasoning"
        ]
      }
    })

  } catch (error) {
    console.error('[Semantic Chat] 🚨 ERROR:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      dev_info: {
        endpoint_version: "semantic_v1",
        error_context: "Semantic search pipeline error"
      }
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Premium Chat SEMANTIC API endpoint',
    description: '🔬 LLM-driven semantic search with deep understanding',
    features: [
      '5-step semantic pipeline',
      'Deep intent understanding (Claude Haiku)',
      'Multi-query generation for coverage',
      'Metadata-aware filtering',
      'LLM result curation with reasoning',
      'Explainable recommendations'
    ],
    pipeline: [
      'STEP 1: Semantic Understanding - Extract deep intent + context',
      'STEP 2: Multi-Query Generation - Create 3 semantic variations',
      'STEP 3: Parallel Vector Search - Search with metadata filters',
      'STEP 4: LLM Result Curation - Select top 3 with reasoning',
      'STEP 5: Conversational Formatting - Natural response'
    ],
    performance: {
      expectedLatency: '2-3s',
      llmCalls: 3,
      estimatedCost: '$0.00015 per query'
    }
  })
}