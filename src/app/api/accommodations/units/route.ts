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

      console.log(`[Accommodations Units API] ✅ Found ${fallbackData.length} units (fallback)`)

      return NextResponse.json(
        {
          success: true,
          data: fallbackData || []
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
