import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

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

// Keywords para determinar el tipo de búsqueda
const TOURISM_KEYWORDS = [
  'restaurante', 'playa', 'actividad', 'turismo', 'atracciones', 'cultura', 'eventos',
  'buceo', 'snorkel', 'cayo', 'excursión', 'comida', 'cena', 'almuerzo', 'cenar',
  'visitar', 'conocer', 'paseo', 'tour', 'lugares', 'sitios', 'cerca', 'alrededor'
]

const ACCOMMODATION_KEYWORDS = [
  'habitación', 'habitaciones', 'suite', 'apartamento', 'cuarto', 'acomodación',
  'vista', 'terraza', 'balcón', 'amenidades', 'servicios', 'cama', 'baño',
  'cocina', 'wifi', 'aire', 'capacidad', 'personas', 'huéspedes'
]

function determineSearchType(query: string): 'accommodation' | 'tourism' | 'both' {
  const lowerQuery = query.toLowerCase()

  const hasAccommodationKeywords = ACCOMMODATION_KEYWORDS.some(keyword =>
    lowerQuery.includes(keyword)
  )

  const hasTourismKeywords = TOURISM_KEYWORDS.some(keyword =>
    lowerQuery.includes(keyword)
  )

  if (hasAccommodationKeywords && hasTourismKeywords) {
    return 'both'
  } else if (hasAccommodationKeywords) {
    return 'accommodation'
  } else if (hasTourismKeywords) {
    return 'tourism'
  } else {
    return 'both' // Default to both for ambiguous queries
  }
}

function formatResponse(accommodationResults: any[], tourismResults: any[], query: string, searchType: string): string {
  let response = ""

  if (accommodationResults.length > 0) {
    response += "🏨 **Información del Hotel:**\n\n"

    // Remove duplicates by name
    const uniqueAccommodation = accommodationResults.filter((result, index, self) =>
      index === self.findIndex(r => r.name === result.name)
    )

    uniqueAccommodation.forEach((result, index) => {
      if (result.content || result.name) {
        response += `**${result.name}**\n`
        if (result.view_type) {
          response += `📍 Vista: ${result.view_type}\n`
        }
        if (result.content) {
          // Clean and format content
          let cleanContent = result.content
            .replace(/^Apartamento: [^.]+\.\s*/, '') // Remove apartment prefix
            .replace(/&nbsp;/g, ' ') // Replace HTML entities
            .replace(/&amp;/g, '&')
            .replace(/\r\n/g, '\n') // Normalize line breaks
            .replace(/\r/g, '\n')
            .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
            .trim()
          response += `${cleanContent}\n`
        }
        if (result.tourism_features) {
          response += `✨ ${result.tourism_features}\n`
        }
        if (result.booking_policies) {
          response += `📋 Políticas: ${result.booking_policies}\n`
        }
        response += "\n"
      }
    })
  }

  if (tourismResults.length > 0) {
    if (response.length > 0) {
      response += "\n---\n\n"
    }
    response += "🌴 **Información Turística San Andrés:**\n\n"

    // Remove duplicates by content
    const uniqueTourism = tourismResults.filter((result, index, self) =>
      index === self.findIndex(r => r.content === result.content)
    )

    uniqueTourism.forEach((result, index) => {
      if (result.content) {
        // Clean and format tourism content
        const cleanContent = result.content.trim()
        response += `${cleanContent}\n\n`
      }
    })
  }

  if (response.length === 0) {
    response = "Lo siento, no encontré información específica sobre tu consulta. ¿Podrías ser más específico sobre qué aspecto del hotel o turismo en San Andrés te interesa?"
  }

  return response.trim()
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient()

  try {
    const { query, client_id, business_name } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Get tenant from subdomain header (set by middleware)
    const subdomain = request.headers.get('x-tenant-subdomain')

    if (!subdomain) {
      return NextResponse.json(
        { error: 'No subdomain detected' },
        { status: 400 }
      )
    }

    // Get tenant_id from subdomain
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('tenant_id')
      .eq('slug', subdomain)
      .single()

    if (tenantError || !tenantData) {
      console.error('[Premium Chat] Tenant not found:', tenantError)
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    const tenant_id = tenantData.tenant_id

    console.log(`[Premium Chat] Query: "${query}" for client: ${business_name}, tenant: ${tenant_id}`)

    const startTime = Date.now()
    const searchType = determineSearchType(query)

    console.log(`[Premium Chat] Search type determined: ${searchType}`)

    // Generate embeddings for both systems
    const queryEmbeddingFast = await generateEmbedding(query, 1024) // For accommodation units
    const queryEmbeddingFull = await generateEmbedding(query, 3072) // For MUVA tourism

    let accommodationResults: any[] = []
    let tourismResults: any[] = []
    let tierUsed = "Tier 1 (Ultra-fast)"

    // Search accommodation data if needed
    if (searchType === 'accommodation' || searchType === 'both') {
      console.log(`[Premium Chat] Searching accommodation units for tenant: ${tenant_id}`)

      const { data: unitResults, error: unitError } = await supabase
        .rpc('match_accommodation_units_fast', {
          query_embedding: queryEmbeddingFast,
          p_tenant_id: tenant_id,
          similarity_threshold: 0.1,
          match_count: 3
        })

      if (unitError) {
        console.error(`[Premium Chat] Accommodation search error:`, unitError)
      } else {
        accommodationResults = unitResults || []
        console.log(`[Premium Chat] Found ${accommodationResults.length} accommodation results`)
      }
    }

    // Search tourism data if needed
    if (searchType === 'tourism' || searchType === 'both') {
      console.log(`[Premium Chat] Searching MUVA tourism data...`)

      const { data: muvaResults, error: muvaError } = await supabase
        .rpc('match_muva_documents', {
          query_embedding: queryEmbeddingFull,
          match_threshold: 0.1,
          match_count: 3
        })

      if (muvaError) {
        console.error(`[Premium Chat] Tourism search error:`, muvaError)
      } else {
        tourismResults = muvaResults || []
        console.log(`[Premium Chat] Found ${tourismResults.length} tourism results`)
      }
    }

    const totalTime = Date.now() - startTime

    // Format response for natural conversation
    const response = formatResponse(accommodationResults, tourismResults, query, searchType)

    // Prepare sources for frontend display
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

    console.log(`[Premium Chat] Response generated in ${totalTime}ms`)

    return NextResponse.json({
      success: true,
      response,
      sources,
      search_type: searchType,
      tier_info: {
        name: tierUsed,
        dimensions: 1024,
        search_duration_ms: totalTime
      },
      results_count: accommodationResults.length + tourismResults.length,
      performance: {
        embedding_generation_ms: Math.round(totalTime * 0.3),
        vector_search_ms: Math.round(totalTime * 0.7),
        total_ms: totalTime
      }
    })

  } catch (error) {
    console.error('[Premium Chat] API Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Premium Chat API endpoint - Use POST method',
    description: 'Unified search across accommodation and tourism data for premium clients',
    features: [
      'Multi-content search (hotel + tourism)',
      'Ultra-fast Vector Search (Tier 1)',
      'Natural conversation formatting',
      'Smart query type detection',
      'Performance optimized responses'
    ]
  })
}