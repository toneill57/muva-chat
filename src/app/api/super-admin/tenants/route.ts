/**
 * Super Admin Tenants Management Endpoint
 *
 * Provides list view of all tenants with filtering, pagination, and sorting.
 * Protected by superAdminMiddleware (JWT authentication required).
 *
 * GET /api/super-admin/tenants
 * Query Parameters:
 *   - status: "active" | "inactive" (filter by active status)
 *   - tier: "free" | "basic" | "premium" | "enterprise" (filter by subscription tier)
 *   - search: string (search by name or subdomain)
 *   - page: number (default: 1)
 *   - limit: number (default: 10, max: 100)
 *   - sort: string (column to sort by, default: "created_at")
 *   - order: "asc" | "desc" (sort order, default: "desc")
 *
 * Response: {
 *   tenants: Array<TenantStats>,
 *   total: number,
 *   page: number,
 *   limit: number,
 *   totalPages: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { superAdminMiddleware } from '@/lib/middleware-super-admin'

export async function GET(request: NextRequest) {
  // Verify super admin authentication
  const authResult = await superAdminMiddleware(request)

  // If middleware returns a response (error), return it
  if (authResult instanceof NextResponse && authResult.status !== 200) {
    return authResult
  }

  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const status = searchParams.get('status') // "active" | "inactive"
    const tier = searchParams.get('tier') // subscription tier
    const search = searchParams.get('search') // search text
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const sort = searchParams.get('sort') || 'created_at'
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'

    // Start building query
    let query = supabase
      .from('v_tenant_stats')
      .select('*', { count: 'exact' })

    // Apply status filter
    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    // Apply tier filter
    if (tier && ['free', 'basic', 'premium', 'enterprise'].includes(tier)) {
      query = query.eq('subscription_tier', tier)
    }

    // Apply search filter (search in nombre_comercial or subdomain)
    if (search && search.trim().length > 0) {
      const searchTerm = `%${search.trim()}%`
      query = query.or(`nombre_comercial.ilike.${searchTerm},subdomain.ilike.${searchTerm}`)
    }

    // Apply sorting
    const validSortColumns = [
      'created_at',
      'nombre_comercial',
      'subdomain',
      'subscription_tier',
      'conversation_count',
      'public_conversations',
      'authenticated_conversations',
      'accommodation_count',
      'last_activity'
    ]

    if (validSortColumns.includes(sort)) {
      query = query.order(sort, { ascending: order === 'asc' })
    } else {
      // Default sort by created_at desc
      query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data: tenants, error: tenantsError, count } = await query

    if (tenantsError) {
      console.error('[api/super-admin/tenants] Error fetching tenants:', tenantsError)
      return NextResponse.json(
        { error: 'Failed to fetch tenants', details: tenantsError.message },
        { status: 500 }
      )
    }

    // Calculate total pages
    const totalPages = count ? Math.ceil(count / limit) : 0

    console.log(`[api/super-admin/tenants] ✅ Fetched ${tenants?.length || 0} tenants (page ${page}/${totalPages})`)

    // Transform nombre_comercial to business_name for TypeScript interface compatibility
    const transformedTenants = tenants?.map((tenant: any) => ({
      ...tenant,
      business_name: tenant.nombre_comercial
    })) || []

    return NextResponse.json({
      tenants: transformedTenants,
      total: count || 0,
      page,
      limit,
      totalPages
    })
  } catch (error) {
    console.error('[api/super-admin/tenants] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Only allow GET requests
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
