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

export async function POST(request: NextRequest) {
  try {
    const { query, search_type = 'tourism', similarity_threshold = 0.1, match_count = 5 } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

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
      console.error('[Accommodation Search] Tenant not found:', tenantError)
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    const tenant_id = tenantData.tenant_id

    const startTime = Date.now()

    // Generate embeddings based on search type
    let queryEmbedding: number[]
    let dimensions: number
    let tierName: string

    if (search_type === 'tourism') {
      dimensions = 1024
      tierName = 'Tier 1 (Ultra-fast Tourism)'
      queryEmbedding = await generateEmbedding(query, dimensions)
    } else {
      dimensions = 1536
      tierName = 'Tier 2 (Balanced Policies)'
      queryEmbedding = await generateEmbedding(query, dimensions)
    }

    // Search accommodation units using new hotels schema function
    const tier = search_type === 'tourism' ? 1 : 2

    const { data: unitResults, error: unitError } = await supabase
      .rpc('match_hotels_documents', {
        query_embedding: queryEmbedding,
        tenant_id_filter: tenant_id,
        business_type_filter: 'hotel',
        match_threshold: similarity_threshold,
        match_count,
        tier
      })

    // For now, we'll focus on accommodation units from hotels schema
    // Hotels table will be added later when needed
    const hotelResults: any[] = []
    const hotelError = null

    const endTime = Date.now()
    const searchDuration = endTime - startTime

    if (unitError || hotelError) {
      console.error('Search error:', { unitError, hotelError })
      return NextResponse.json({
        error: 'Search failed',
        details: { unitError, hotelError }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      query,
      search_type,
      tier_info: {
        name: tierName,
        dimensions,
        search_duration_ms: searchDuration
      },
      results: {
        accommodation_units: unitResults || [],
        hotels: hotelResults || [],
        total_units: unitResults?.length || 0,
        total_hotels: hotelResults?.length || 0
      },
      performance: {
        embedding_generation_ms: Math.round(searchDuration * 0.7), // Estimate
        vector_search_ms: Math.round(searchDuration * 0.3), // Estimate
        total_ms: searchDuration
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}