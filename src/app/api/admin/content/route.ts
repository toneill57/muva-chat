import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/admin/content
 *
 * Retrieves landing page content for a tenant
 *
 * @param request - Query params: tenant_id (required)
 * @returns JSON response with landing_page_content object
 */
export async function GET(request: NextRequest) {
  try {
    // Extract tenant_id from query params
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenant_id')

    // Validation: Check if tenant_id is provided
    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing tenant_id',
          message: 'tenant_id query parameter is required'
        },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = createServerClient()

    // Query tenant_registry for landing_page_content
    const { data, error } = await supabase
      .from('tenant_registry')
      .select('landing_page_content')
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      console.error('[content] Database query error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Database query failed',
          message: error.message
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
          message: `No tenant found with ID: ${tenantId}`
        },
        { status: 404 }
      )
    }

    // Success response
    return NextResponse.json({
      success: true,
      content: data.landing_page_content
    })

  } catch (error) {
    console.error('[content] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch landing page content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/content
 *
 * Updates landing page content for a tenant
 *
 * @param request - Body: { tenant_id: string, content: object }
 * @returns JSON response with success status
 */
export async function PUT(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { tenant_id, content } = body

    // Validation: Check required fields
    if (!tenant_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing tenant_id',
          message: 'tenant_id is required in request body'
        },
        { status: 400 }
      )
    }

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing content',
          message: 'content is required in request body'
        },
        { status: 400 }
      )
    }

    // Validate content structure (basic validation)
    if (typeof content !== 'object' || Array.isArray(content)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid content',
          message: 'content must be a valid JSON object'
        },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = createServerClient()

    // Update landing_page_content in tenant_registry
    const { data, error } = await supabase
      .from('tenant_registry')
      .update({ landing_page_content: content })
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (error) {
      console.error('[content] Update error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Update operation failed',
          message: error.message
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
          message: `No tenant found with ID: ${tenant_id}`
        },
        { status: 404 }
      )
    }

    console.log(`[content] Updated landing page content for tenant: ${tenant_id}`)

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Landing page content updated successfully',
      content: data.landing_page_content
    })

  } catch (error) {
    console.error('[content] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to update landing page content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
