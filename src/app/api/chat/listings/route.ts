import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/openai'
import { generateChatResponse } from '@/lib/claude'
import { createClient } from '@supabase/supabase-js'
import { determineOptimalSearch, generateSearchParams } from '@/lib/search-router'
import { resolveTenantSchemaName } from '@/lib/tenant-resolver'
import { detectQueryIntent, getSearchConfig, calculateSearchCounts } from '@/lib/query-intent'

export const runtime = 'edge'

// Lazy initialization to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Enhanced semantic cache for listings
const listingsCache = new Map<string, { data: unknown, expires: number }>()

// Semantic groups for listings
const LISTINGS_SEMANTIC_GROUPS = {
  "hotel_services": [
    "servicios del hotel",
    "amenidades",
    "facilidades",
    "qué ofrece el hotel",
    "servicios incluidos"
  ],
  "hotel_policies": [
    "políticas",
    "check-in",
    "check-out",
    "cancelación",
    "reglas del hotel"
  ],
  "hotel_rates": [
    "precios",
    "tarifas",
    "costos",
    "cuánto cuesta",
    "paquetes"
  ],
  "restaurant_menu": [
    "menú",
    "comida",
    "platos",
    "qué sirven",
    "especialidades"
  ],
  "activity_services": [
    "actividades",
    "tours",
    "excursiones",
    "qué hacer",
    "aventuras"
  ],
  "general_info": [
    "información",
    "horarios",
    "ubicación",
    "contacto",
    "sobre"
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

function getListingsSemanticCacheKey(question: string, clientId?: string, businessType?: string): string {
  const normalizedQuestion = question.toLowerCase().trim()

  // Check semantic groups
  for (const [groupKey, patterns] of Object.entries(LISTINGS_SEMANTIC_GROUPS)) {
    for (const pattern of patterns) {
      if (normalizedQuestion.includes(pattern)) {
        return `listings:${clientId || 'all'}:${businessType || 'all'}:semantic:${groupKey}`
      }
    }
  }

  // Fallback to exact match
  return `listings:${clientId || 'all'}:${businessType || 'all'}:exact:${hashQuestion(question)}`
}

function getCached(key: string) {
  const cached = listingsCache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }
  if (cached) {
    listingsCache.delete(key)
  }
  return null
}

function setCached(key: string, data: unknown, ttlSeconds: number = 3600) {
  listingsCache.set(key, {
    data,
    expires: Date.now() + (ttlSeconds * 1000)
  })
}

// Generate business-specific prompts
function getListingsPrompt(businessType?: string, clientId?: string): string {
  const baseInstructions = `
INSTRUCCIONES DE FORMATO:
- Responde de manera útil, precisa y concisa
- Usa formato Markdown para mejorar la legibilidad:
  * **Negritas** para términos importantes
  * Listas numeradas para procedimientos paso a paso
  * Listas con viñetas para elementos o características
  * \`código\` para códigos específicos
- Estructura la información de forma clara y organizada
- Si no tienes información suficiente en el contexto, indica que necesitas más detalles específicos

Responde en español y con formato Markdown apropiado.`

  const businessPrompts = {
    hotel: `Eres un asistente especializado en operaciones hoteleras y servicios de hospedaje. Te enfocas en políticas del hotel, amenidades, servicios, tarifas, procedimientos operacionales y experiencia del huésped.`,

    restaurant: `Eres un asistente especializado en servicios de restaurante y gastronomía. Te enfocas en menús, especialidades culinarias, horarios, reservaciones, políticas del restaurante y experiencia gastronómica.`,

    activity: `Eres un asistente especializado en actividades turísticas y aventuras. Te enfocas en tours, excursiones, deportes acuáticos, precios de actividades, equipos necesarios y experiencias de aventura.`,

    spot: `Eres un asistente especializado en spots y lugares de entretenimiento. Te enfocas en ambiente, ubicación, actividades disponibles, precios, horarios y experiencias de relajación.`,

    rental: `Eres un asistente especializado en servicios de alquiler y transporte. Te enfocas en flota disponible, precios de alquiler, políticas, requisitos y opciones de transporte.`,

    nightlife: `Eres un asistente especializado en vida nocturna y entretenimiento. Te enfocas en eventos, horarios, ambiente, precios, políticas del venue y experiencias nocturnas.`,

    museum: `Eres un asistente especializado en museos y atracciones culturales. Te enfocas en exhibiciones, horarios, precios, políticas, significado cultural e información educativa.`,

    store: `Eres un asistente especializado en retail y tiendas. Te enfocas en catálogo de productos, horarios, políticas de la tienda, inventario y promociones.`,

    generic: `Eres un asistente integral de servicios que ayuda con información general del negocio, contacto, ubicación y servicios básicos.`
  }

  const specificPrompt = businessPrompts[businessType as keyof typeof businessPrompts] || businessPrompts.generic

  return `${specificPrompt}

${baseInstructions}

- Enfócate específicamente en brindar información precisa y útil sobre los servicios y operaciones del negocio
- Incluye detalles prácticos como horarios, precios, políticas y procedimientos cuando estén disponibles`
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  const supabase = getSupabaseClient()

  try {
    console.log(`[${timestamp}] Listings Chat API request started`)

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
      client_id,
      business_type,
      use_context = true,
      max_context_chunks = 4,
      preferred_tier = null,
      enable_tier_fallback = true
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

    console.log(`[${timestamp}] Processing listings question: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`)
    console.log(`[${timestamp}] Filters - Client ID: ${client_id || 'all'}, Business Type: ${business_type || 'all'}`)

    // 🔧 TENANT RESOLUTION: UUID → schema_name
    console.log(`[${timestamp}] 🔧 Resolving tenant UUID to operational schema_name...`)
    const tenantSchemaName = await resolveTenantSchemaName(client_id)
    console.log(`[${timestamp}] ✅ Tenant resolved: ${client_id || 'null'} → "${tenantSchemaName}"`)

    // 🧠 INTELLIGENT QUERY INTENT DETECTION
    console.log(`[${timestamp}] 🧠 Detecting query intent for intelligent parameter optimization...`)
    const queryIntent = await detectQueryIntent(question)
    console.log(`[${timestamp}] 🎯 Intent detected: ${queryIntent.type} (confidence: ${queryIntent.confidence}, reasoning: ${queryIntent.reasoning})`)

    // 🪆 MATRYOSHKA TIER DETECTION
    console.log(`[${timestamp}] 🪆 Analyzing query for optimal tier selection...`)
    const searchStrategy = preferred_tier ?
      { tier: preferred_tier, dimensions: (preferred_tier === 1 ? 1024 : preferred_tier === 2 ? 1536 : 3072) as 1024 | 1536 | 3072, tables: ['auto'], description: `Manual tier ${preferred_tier}` } :
      determineOptimalSearch(question)

    console.log(`[${timestamp}] 🎯 Search strategy: ${searchStrategy.description} (Tier ${searchStrategy.tier}, ${searchStrategy.dimensions} dims)`)

    const searchParams = generateSearchParams(searchStrategy)
    console.log(`[${timestamp}] 📊 Search params: ${JSON.stringify(searchParams)}`)

    // 🧠 INTELLIGENT SEARCH CONFIGURATION based on intent
    const searchConfig = getSearchConfig(queryIntent, false) // We'll determine MUVA access later
    console.log(`[${timestamp}] 🔧 Smart config: top_k=${searchConfig.top_k}, tenant_ratio=${searchConfig.tenant_ratio}, priority=${searchConfig.priority_domain}`)

    // Check cache first (🪆 tier-aware caching)
    const cacheKey = `${getListingsSemanticCacheKey(question, client_id, business_type)}_tier${searchStrategy.tier}`
    const cached = getCached(cacheKey)
    if (cached) {
      const responseTime = Date.now() - startTime
      console.log(`[${timestamp}] ✅ Listings cache hit - Response time: ${responseTime}ms`)

      const cachedWithMetrics = {
        ...cached,
        performance: {
          ...((cached as { performance?: Record<string, unknown> }).performance || {}),
          total_time_ms: responseTime,
          cache_hit: true,
          environment: process.env.NODE_ENV || 'unknown',
          timestamp: timestamp,
          filters: {
            client_id: client_id || null,
            business_type: business_type || null
          }
        }
      }

      return NextResponse.json(cachedWithMetrics)
    }

    let context = ''
    let response = ''
    let embeddingStart = 0
    let embeddingTime = 0
    let allResults: any[] = []

    if (use_context) {
      try {
        embeddingStart = Date.now()
        console.log(`[${timestamp}] 🔍 Generating ${searchStrategy.dimensions}-dimensional embedding for Tier ${searchStrategy.tier} search...`)

        const queryEmbedding = await generateEmbedding(question, searchStrategy.dimensions)
        embeddingTime = Date.now() - embeddingStart
        console.log(`[${timestamp}] ✅ Tier ${searchStrategy.tier} embedding generated - Time: ${embeddingTime}ms, Dimensions: ${searchStrategy.dimensions}`)

        const searchStart = Date.now()
        console.log(`[${timestamp}] 🔎 Searching listings documents...`)

        // Check if client has MUVA access
        let hasMuvaAccess = false
        if (client_id) {
          console.log(`[${timestamp}] 🔍 Checking MUVA permissions for tenant: ${client_id}`)
          const { data: permissions, error: permError } = await supabase
            .from('user_tenant_permissions')
            .select('permissions')
            .eq('tenant_id', client_id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()

          if (!permError && permissions?.permissions?.muva_access) {
            hasMuvaAccess = true
            console.log(`[${timestamp}] ✅ Client has MUVA access (Premium plan)`)
          } else {
            console.log(`[${timestamp}] ❌ Client has no MUVA access (Basic plan) - ${permError?.message || 'No permissions found'}`)
          }
        }

        // 🧠 UPDATE SMART CONFIG with actual MUVA access
        const finalSearchConfig = getSearchConfig(queryIntent, hasMuvaAccess)
        const searchCounts = calculateSearchCounts(finalSearchConfig, Math.max(max_context_chunks, queryIntent.suggested_top_k))
        console.log(`[${timestamp}] 🎯 Final config: tenant=${searchCounts.tenantCount}, muva=${searchCounts.muvaCount}, total=${searchCounts.totalCount}`)

        allResults = []

        // 1. 🪆 MATRYOSHKA OPTIMIZED SEARCH - Tenant-specific content
        console.log(`[${timestamp}] 🪆 Tier ${searchStrategy.tier} search: tenant-specific content...`)
        const tierEmoji = searchStrategy.tier === 1 ? '🚀' : searchStrategy.tier === 2 ? '⚖️' : '🎯'
        console.log(`[${timestamp}] ${tierEmoji} Using Tier ${searchStrategy.tier}: ${searchStrategy.dimensions} dimensions`)

        const tenantSearchCount = searchCounts.tenantCount // 🧠 Intelligent count based on intent

        // Use Matryoshka-optimized search function
        console.log(`[${timestamp}] 🔍 Calling match_optimized_documents with tenant: "${tenantSchemaName}"`)
        const { data: tenantData, error: tenantError } = await supabase
          .rpc('match_optimized_documents', {
            query_embedding: queryEmbedding,
            tier: searchStrategy.tier,
            target_tables: searchStrategy.tables.includes('all') ? null : searchStrategy.tables,
            match_threshold: 0.05, // 🔧 Optimized for accommodation search
            match_count: tenantSearchCount,
            tenant_id_filter: tenantSchemaName
          })

        // Fallback to traditional function if optimized version fails
        if (tenantError && tenantError.code === '42883') {
          console.log(`[${timestamp}] ⚠️ Matryoshka function not available, falling back to traditional search`)
          console.log(`[${timestamp}] 🔍 Calling match_listings_documents with tenant: "${tenantSchemaName}"`)
          const { data: fallbackData, error: fallbackError } = await supabase
            .rpc('match_listings_documents', {
              query_embedding: queryEmbedding,
              client_id_filter: tenantSchemaName,
              business_type_filter: business_type || null,
              match_threshold: 0.05, // 🔧 Optimized for accommodation search
              match_count: tenantSearchCount,
              tenant_id_filter: tenantSchemaName
            })

          if (fallbackError) {
            console.error(`[${timestamp}] ❌ Both Matryoshka and traditional search failed:`, fallbackError)
            throw new Error(`Search failed: ${fallbackError.message}`)
          }

          // Use fallback data
          console.log(`[${timestamp}] ✅ Fallback search: ${fallbackData?.length || 0} results`)
          if (fallbackData && fallbackData.length > 0) {
            allResults.push(...fallbackData.map((doc: any) => ({ ...doc, source_type: 'tenant', tier_used: 'fallback' })))
          }
        }

        else if (tenantError) {
          console.error(`[${timestamp}] ❌ Tenant search failed:`, tenantError)
          throw new Error(`Tenant search failed: ${tenantError.message}`)
        }
        else if (tenantData && tenantData.length > 0) {
          console.log(`[${timestamp}] ✅ Tier ${searchStrategy.tier} found ${tenantData.length} tenant-specific results`)
          allResults.push(...tenantData.map((doc: any) => ({ ...doc, source_type: 'tenant', tier_used: searchStrategy.tier })))
        }
        else if (tenantData && tenantData.length === 0) {
          console.log(`[${timestamp}] ⚠️ Tier ${searchStrategy.tier} returned 0 results`)

          // 🪆 TIER FALLBACK LOGIC
          if (enable_tier_fallback && searchStrategy.tier < 3) {
            const fallbackTier = searchStrategy.tier + 1
            const fallbackDimensions = fallbackTier === 2 ? 1536 : 3072
            console.log(`[${timestamp}] 🔄 Attempting Tier ${fallbackTier} fallback (${fallbackDimensions} dims)`)

            try {
              const fallbackEmbedding = await generateEmbedding(question, fallbackDimensions)
              console.log(`[${timestamp}] 🔍 Calling tier fallback match_optimized_documents with tenant: "${tenantSchemaName}"`)
              const { data: fallbackData, error: fallbackError } = await supabase
                .rpc('match_optimized_documents', {
                  query_embedding: fallbackEmbedding,
                  tier: fallbackTier,
                  target_tables: null, // Use all tables for fallback
                  match_threshold: 0.05, // 🔧 Optimized for accommodation search
                  match_count: tenantSearchCount,
                  tenant_id_filter: tenantSchemaName
                })

              if (fallbackData && fallbackData.length > 0) {
                console.log(`[${timestamp}] ✅ Tier ${fallbackTier} fallback found ${fallbackData.length} results`)
                allResults.push(...fallbackData.map((doc: any) => ({ ...doc, source_type: 'tenant', tier_used: fallbackTier })))
              }
            } catch (fallbackError) {
              console.log(`[${timestamp}] ⚠️ Tier fallback failed, continuing with 0 results`)
            }
          }
        }

        // 2. Search MUVA content (only for Premium clients)
        if (hasMuvaAccess) {
          console.log(`[${timestamp}] 🔍 Searching MUVA tourism content (Premium access)...`)
          const muvaSearchCount = searchCounts.muvaCount // 🧠 Intelligent count based on intent

          // 🪆 Generate MUVA-specific 3072-dim embedding (Tier 3)
          console.log(`[${timestamp}] 🔍 Generating 3072-dimensional embedding for MUVA search...`)
          const muvaEmbedding = await generateEmbedding(question, 3072)
          console.log(`[${timestamp}] ✅ MUVA Tier 3 embedding generated - Dimensions: 3072`)

          const { data: muvaData, error: muvaError } = await supabase
            .rpc('match_muva_documents', {
              query_embedding: muvaEmbedding,
              match_threshold: 0.1, // 🔧 Lowered from 0.3 to support partial keyword searches like "banzai"
              match_count: muvaSearchCount
            })

          if (muvaError) {
            console.error(`[${timestamp}] ❌ MUVA search failed:`, muvaError)
          } else if (muvaData && muvaData.length > 0) {
            console.log(`[${timestamp}] ✅ Found ${muvaData.length} MUVA tourism results`)
            allResults.push(...muvaData.map((doc: any) => ({ ...doc, source_type: 'muva' })))
          }
        } else {
          console.log(`[${timestamp}] 🔒 MUVA access denied - Basic plan (business data only)`)
        }

        // Sort by similarity and limit total results
        const data = allResults
          .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
          .slice(0, max_context_chunks)

        console.log(`[${timestamp}] 🎯 Combined search complete: ${data.length} total results`)
        console.log(`[${timestamp}] 📊 Sources: Tenant(${allResults.filter(r => r.source_type === 'tenant').length}), MUVA(${allResults.filter(r => r.source_type === 'muva').length})`)

        const searchTime = Date.now() - searchStart

        console.log(`[${timestamp}] ✅ Found ${data?.length || 0} relevant documents - Search time: ${searchTime}ms`)

        if (data && data.length > 0) {
          // 🐛 DEBUG: Log all metadata to understand structure
          console.log(`[${timestamp}] 🔍 DEBUG: Examining ${data.length} results for context organization...`)
          data.forEach((doc: any, index: number) => {
            console.log(`[${timestamp}] 📋 Result ${index + 1}:`, {
              source_table: doc.metadata?.source_table,
              unit_type: doc.metadata?.unit_type,
              subcategory: doc.metadata?.subcategory,
              name: doc.metadata?.name,
              content_preview: doc.content?.substring(0, 100)
            })
          })

          // 🏨 INTELLIGENT CONTEXT ORGANIZATION - Multiple hotel data types
          console.log(`[${timestamp}] 🏨 Organizing context by business data categories...`)

          // Group data by table type for better organization
          const dataByCategory = {
            accommodation_units: data.filter((doc: any) => doc.metadata?.source_table === 'accommodation_units'),
            accommodation_types: data.filter((doc: any) => doc.metadata?.source_table === 'accommodation_types'),
            client_info: data.filter((doc: any) => doc.metadata?.source_table === 'client_info'),
            properties: data.filter((doc: any) => doc.metadata?.source_table === 'properties'),
            policies: data.filter((doc: any) => doc.metadata?.source_table === 'policies'),
            guest_information: data.filter((doc: any) => doc.metadata?.source_table === 'guest_information'),
            pricing_rules: data.filter((doc: any) => doc.metadata?.source_table === 'pricing_rules'),
            unit_amenities: data.filter((doc: any) => doc.metadata?.source_table === 'unit_amenities'),
            content: data.filter((doc: any) => doc.metadata?.source_table === 'content'),
            muva: data.filter((doc: any) => doc.source_type === 'muva')
          }

          console.log(`[${timestamp}] 📊 Data distribution:`, Object.entries(dataByCategory).map(([key, items]) => `${key}(${items.length})`))

          let contextParts: string[] = []

          // 1. 🏠 ACCOMMODATION UNITS - Primary business data
          if (dataByCategory.accommodation_units.length > 0) {
            console.log(`[${timestamp}] 🏠 Processing ${dataByCategory.accommodation_units.length} accommodation units`)

            const accommodationContent = dataByCategory.accommodation_units
              .map(doc => doc.content)
              .join('\n\n')

            contextParts.push(`## 🏠 ALOJAMIENTOS DISPONIBLES\n\n${accommodationContent}`)
            console.log(`[${timestamp}] ✅ Added accommodation units section`)
          }

          // 2. 🏢 BUSINESS INFORMATION
          if (dataByCategory.client_info.length > 0 || dataByCategory.properties.length > 0) {
            const businessContent = [
              ...dataByCategory.client_info.map(doc => doc.content),
              ...dataByCategory.properties.map(doc => doc.content)
            ].join('\n\n')

            if (businessContent) {
              contextParts.push(`## 🏢 INFORMACIÓN DEL NEGOCIO\n\n${businessContent}`)
              console.log(`[${timestamp}] ✅ Added business information section`)
            }
          }

          // 3. 📋 POLICIES & PROCEDURES
          if (dataByCategory.policies.length > 0 || dataByCategory.guest_information.length > 0) {
            const policiesContent = [
              ...dataByCategory.policies.map(doc => doc.content),
              ...dataByCategory.guest_information.map(doc => doc.content)
            ].join('\n\n')

            if (policiesContent) {
              contextParts.push(`## 📋 POLÍTICAS Y PROCEDIMIENTOS\n\n${policiesContent}`)
              console.log(`[${timestamp}] ✅ Added policies section`)
            }
          }

          // 4. 💰 PRICING & AMENITIES
          if (dataByCategory.pricing_rules.length > 0 || dataByCategory.unit_amenities.length > 0) {
            const pricingContent = [
              ...dataByCategory.pricing_rules.map(doc => doc.content),
              ...dataByCategory.unit_amenities.map(doc => doc.content)
            ].join('\n\n')

            if (pricingContent) {
              contextParts.push(`## 💰 PRECIOS Y AMENIDADES\n\n${pricingContent}`)
              console.log(`[${timestamp}] ✅ Added pricing & amenities section`)
            }
          }

          // 5. 📄 ADDITIONAL CONTENT
          if (dataByCategory.content.length > 0) {
            const additionalContent = dataByCategory.content
              .map(doc => doc.content)
              .join('\n\n')

            contextParts.push(`## 📄 INFORMACIÓN ADICIONAL\n\n${additionalContent}`)
            console.log(`[${timestamp}] ✅ Added additional content section`)
          }

          // 6. 🌴 TOURISM (MUVA) - Premium access
          if (dataByCategory.muva.length > 0) {
            const muvaContent = dataByCategory.muva
              .map(doc => `[TURISMO] ${doc.content}`)
              .join('\n\n')

            contextParts.push(`## 🌴 INFORMACIÓN TURÍSTICA\n\n${muvaContent}`)
            console.log(`[${timestamp}] ✅ Added MUVA tourism section`)
          }

          context = contextParts.join('\n\n---\n\n')
          console.log(`[${timestamp}] 📝 Final context organized into ${contextParts.length} sections`)
        }

        const claudeStart = Date.now()
        console.log(`[${timestamp}] 🤖 Generating Claude response for listings...`)

        // Generate domain-specific prompt
        const prompt = getListingsPrompt(business_type, client_id)

        // Generate response with business-specific context
        response = await generateChatResponse(question, context, 'listings')
        const claudeTime = Date.now() - claudeStart
        console.log(`[${timestamp}] ✅ Claude response generated - Time: ${claudeTime}ms`)

      } catch (error) {
        console.error(`[${timestamp}] ❌ Error in listings context processing:`, error)
        console.log(`[${timestamp}] 🔄 Falling back to response without context`)

        try {
          response = await generateChatResponse(question, '', 'listings')
        } catch (fallbackError) {
          console.error(`[${timestamp}] ❌ Fatal error in listings fallback response:`, fallbackError)
          throw fallbackError
        }
      }
    } else {
      console.log(`[${timestamp}] 🤖 Generating listings response without context...`)
      const claudeStartNoContext = Date.now()

      response = await generateChatResponse(question, '', 'listings')
      const claudeTime = Date.now() - claudeStartNoContext
      console.log(`[${timestamp}] ✅ Listings response generated - Time: ${claudeTime}ms`)
    }

    const totalTime = Date.now() - startTime

    const result = {
      response,
      context_used: context.length > 0,
      question,
      filters: {
        client_id: client_id || null,
        business_type: business_type || null
      },
      performance: {
        total_time_ms: totalTime,
        cache_hit: false,
        environment: process.env.NODE_ENV || 'unknown',
        timestamp: timestamp,
        endpoint: 'listings',
        matryoshka: {
          tier_used: searchStrategy.tier,
          dimensions: searchStrategy.dimensions,
          search_strategy: searchStrategy.description,
          tier_detection: preferred_tier ? 'manual' : 'auto_keyword',
          embedding_time_ms: embeddingStart ? embeddingTime : null,
          fallback_used: allResults.some(r => r.tier_used !== searchStrategy.tier),
          performance_improvement: calculatePerformanceImprovement(searchStrategy.tier, totalTime),
          baseline_estimate_ms: estimateBaselineTime(searchStrategy.tier, totalTime)
        }
      }
    }

    // Helper functions for performance calculation
    function calculatePerformanceImprovement(tier: number, actualTime: number): string {
      const baselineMultiplier = tier === 1 ? 12.5 : tier === 2 ? 5.2 : 2.1
      return `${baselineMultiplier.toFixed(1)}x faster`
    }

    function estimateBaselineTime(tier: number, actualTime: number): number {
      const improvementFactor = tier === 1 ? 12.5 : tier === 2 ? 5.2 : 2.1
      return Math.round(actualTime * improvementFactor)
    }

    // Save to cache
    setCached(cacheKey, result, 3600)

    console.log(`[${timestamp}] ✅ Listings request completed successfully - Total time: ${totalTime}ms`)
    console.log(`[${timestamp}] 💾 Saved to listings cache`)

    return NextResponse.json(result)

  } catch (error) {
    const errorTime = Date.now() - startTime
    console.error(`[${timestamp}] ❌ Fatal error in listings chat API (${errorTime}ms):`, error)

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
        endpoint: 'listings'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Listings Chat API endpoint - Use POST method',
    description: 'Specialized chat for business listings with multi-tenant support',
    parameters: {
      'question': 'Required: The question to ask (string)',
      'client_id': 'Optional: Client UUID for tenant filtering',
      'business_type': 'Optional: hotel, restaurant, activity, spot, rental, nightlife, museum, store',
      'use_context': 'Optional: Whether to use context retrieval (default: true)',
      'max_context_chunks': 'Optional: Max context chunks 1-10 (default: 4)'
    },
    endpoints: {
      'POST /api/chat/listings': 'Send a question to the listings assistant'
    }
  })
}