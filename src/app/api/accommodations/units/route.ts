/**
 * Accommodation Units API Endpoint
 *
 * GET /api/accommodations/units
 * Returns list of accommodation units for the current tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

interface UnitsSuccessResponse {
  success: true
  data: any[]
}

interface UnitsErrorResponse {
  success: false
  error: string
  code?: string
}

type UnitsResponse = UnitsSuccessResponse | UnitsErrorResponse

export async function GET(request: NextRequest): Promise<NextResponse<UnitsResponse>> {
  try {
    // Get tenant from subdomain header (set by middleware)
    const subdomain = request.headers.get('x-tenant-subdomain')

    if (!subdomain) {
      return NextResponse.json(
        {
          success: false,
          error: 'No subdomain detected',
          code: 'NO_SUBDOMAIN'
        },
        { status: 400 }
      )
    }

    console.log('[Accommodations Units API] Fetching units for subdomain:', subdomain)

    const supabase = createServerClient()

    // Get tenant_id from subdomain
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('tenant_id')
      .eq('slug', subdomain)
      .single()

    if (tenantError || !tenantData) {
      console.error('[Accommodations Units API] Tenant not found:', tenantError)
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
          code: 'TENANT_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    const tenantId = tenantData.tenant_id

    // Query accommodation units using RPC function (respects RLS)
    const { data: unitsData, error: unitsError } = await supabase
      .rpc('get_accommodation_units_by_tenant', {
        p_tenant_id: tenantId
      })

    if (unitsError) {
      console.error('[Accommodations Units API] RPC error:', unitsError)

      // Fallback to direct query if RPC doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('accommodation_units_public')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)

      if (fallbackError) {
        console.error('[Accommodations Units API] Fallback query error:', fallbackError)
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to fetch units',
            code: 'QUERY_ERROR'
          },
          { status: 500 }
        )
      }

      console.log(`[Accommodations Units API] ✅ Found ${fallbackData.length} chunks (raw)`)

      // Group chunks by original_accommodation to show only base units
      const groupedUnits = fallbackData.reduce((acc: any, chunk: any) => {
        const baseName = chunk.metadata?.original_accommodation || chunk.name

        if (!acc[baseName]) {
          // First chunk for this unit - use as base
          acc[baseName] = {
            ...chunk,
            id: chunk.unit_id,
            name: baseName, // Clean name without " - Section" suffix
            unit_number: chunk.metadata?.display_order?.toString() || 'N/A',

            // NUEVOS CAMPOS MOTOPRESS
            size_m2: chunk.metadata?.size_m2 || null,
            location_area: chunk.metadata?.location_area || null,
            children_capacity: chunk.metadata?.children_capacity || 0,
            total_capacity: (chunk.metadata?.capacity || 2) + (chunk.metadata?.children_capacity || 0),
            accommodation_type: chunk.metadata?.accommodation_mphb_type || 'Standard',
            room_type_id: chunk.metadata?.motopress_room_type_id || null,

            description: chunk.description || '',
            short_description: chunk.short_description || chunk.description?.substring(0, 150) || '',
            capacity: {
              adults: chunk.metadata?.capacity || 2,
              children: chunk.metadata?.children_capacity || 0,
              total: (chunk.metadata?.capacity || 2) + (chunk.metadata?.children_capacity || 0)
            },
            bed_configuration: {
              bed_type: chunk.metadata?.bed_configuration?.[0]?.type || 'Queen'
            },
            view_type: chunk.metadata?.view_type || 'N/A',
            tourism_features: chunk.metadata?.tourism_features || '',
            booking_policies: chunk.metadata?.booking_policies || '',
            unique_features: chunk.metadata?.unique_features || [],
            categories: chunk.metadata?.categories || [],
            is_featured: chunk.metadata?.is_featured || false,
            display_order: chunk.metadata?.display_order || 0,
            status: chunk.metadata?.status || 'active',
            embedding_status: {
              has_fast: !!chunk.embedding_fast,
              has_balanced: !!chunk.embedding,
              fast_dimensions: chunk.embedding_fast?.length || 0,
              balanced_dimensions: chunk.embedding?.length || 0
            },
            pricing_summary: {
              seasonal_rules: 0,
              hourly_rules: 0,
              base_price_range: chunk.pricing?.base_price ? [
                chunk.pricing.base_price,
                chunk.pricing.base_price
              ] : [0, 0]
            },
            amenities_summary: {
              total: Array.isArray(chunk.metadata?.unit_amenities)
                ? chunk.metadata.unit_amenities.length
                : (typeof chunk.metadata?.unit_amenities === 'string'
                    ? chunk.metadata.unit_amenities.split(',').length
                    : 0),
              included: Array.isArray(chunk.metadata?.unit_amenities)
                ? chunk.metadata.unit_amenities.length
                : (typeof chunk.metadata?.unit_amenities === 'string'
                    ? chunk.metadata.unit_amenities.split(',').length
                    : 0),
              premium: 0,
              featured: 0
            },
            unit_amenities: Array.isArray(chunk.metadata?.unit_amenities)
              ? chunk.metadata.unit_amenities.map((a: any) => {
                  // Handle both formats: string[] (new) and {id, name}[] (old MotoPress)
                  if (typeof a === 'string') {
                    return { amenity_name: a.trim() }
                  } else if (a && typeof a === 'object' && a.name) {
                    return { amenity_name: a.name.trim() }
                  }
                  return { amenity_name: String(a).trim() }
                })
              : (typeof chunk.metadata?.unit_amenities === 'string'
                  ? chunk.metadata.unit_amenities.split(',').map((a: string) => ({
                      amenity_name: a.trim()
                    }))
                  : []),
            photos: chunk.photos || [],
            photo_count: chunk.photos?.length || 0,
            pricing_rules: [],
            chunks_count: 1,
            all_chunks: [chunk]
          }
        } else {
          // Additional chunk - increment counter
          acc[baseName].chunks_count++
          acc[baseName].all_chunks.push(chunk)
        }

        return acc
      }, {})

      const consolidatedUnits = Object.values(groupedUnits)

      console.log(`[Accommodations Units API] ✅ Consolidated to ${consolidatedUnits.length} unique units`)

      return NextResponse.json(
        {
          success: true,
          data: consolidatedUnits
        },
        { status: 200 }
      )
    }

    console.log(`[Accommodations Units API] ✅ Found ${unitsData?.length || 0} units`)

    return NextResponse.json(
      {
        success: true,
        data: unitsData || []
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Accommodations Units API] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  )
}
