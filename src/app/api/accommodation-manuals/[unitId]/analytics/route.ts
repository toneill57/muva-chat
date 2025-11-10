/**
 * Manual Analytics API
 *
 * GET /api/accommodation-manuals/[unitId]/analytics
 * Returns analytics metrics for a specific accommodation unit's manuals
 *
 * Metrics:
 * - total_uploads: Total number of manuals uploaded
 * - total_views: Total number of manual views
 * - total_search_hits: Total times manuals appeared in guest chat searches
 * - total_deletes: Total number of manuals deleted
 * - recent_activity: Last 7 days activity
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================

interface AnalyticsMetrics {
  total_uploads: number
  total_views: number
  total_search_hits: number
  total_deletes: number
  recent_activity: {
    uploads: number
    views: number
    search_hits: number
    deletes: number
  }
  top_manuals: Array<{
    manual_id: string
    filename: string
    view_count: number
    search_hit_count: number
  }>
}

interface SuccessResponse {
  success: true
  data: AnalyticsMetrics
}

interface ErrorResponse {
  success: false
  error: string
}

type ApiResponse = SuccessResponse | ErrorResponse

// ============================================================================
// GET: Retrieve Analytics
// ============================================================================

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ unitId: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const { unitId } = await context.params

    console.log('[Analytics] Fetching for unit:', unitId)

    // 1. Get subdomain from headers
    const host = request.headers.get('host') || ''
    const subdomain = host.split('.')[0].split(':')[0] // Handle localhost:3001

    if (!subdomain || subdomain === 'localhost') {
      console.error('[Analytics] No subdomain detected')
      return NextResponse.json(
        { success: false, error: 'No subdomain detected' },
        { status: 400 }
      )
    }

    // 2. Create Supabase client
    const supabase = createServerClient()

    // 3. Get tenant_id from subdomain
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('tenant_id')
      .eq('slug', subdomain)
      .single()

    if (tenantError || !tenantData) {
      console.error('[Analytics] Tenant not found:', tenantError)
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    const tenantId = tenantData.tenant_id

    // 4. Query analytics data
    const { data: analytics, error: analyticsError } = await supabase
      .from('accommodation_manual_analytics')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('accommodation_unit_id', unitId)

    if (analyticsError) {
      console.error('[Analytics] Query failed:', analyticsError)
      return NextResponse.json(
        { success: false, error: analyticsError.message },
        { status: 500 }
      )
    }

    // 5. Calculate metrics
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const metrics: AnalyticsMetrics = {
      total_uploads: analytics.filter(a => a.event_type === 'upload').length,
      total_views: analytics.filter(a => a.event_type === 'view').length,
      total_search_hits: analytics.filter(a => a.event_type === 'search_hit').length,
      total_deletes: analytics.filter(a => a.event_type === 'delete').length,
      recent_activity: {
        uploads: analytics.filter(
          a => a.event_type === 'upload' && new Date(a.created_at) > sevenDaysAgo
        ).length,
        views: analytics.filter(
          a => a.event_type === 'view' && new Date(a.created_at) > sevenDaysAgo
        ).length,
        search_hits: analytics.filter(
          a => a.event_type === 'search_hit' && new Date(a.created_at) > sevenDaysAgo
        ).length,
        deletes: analytics.filter(
          a => a.event_type === 'delete' && new Date(a.created_at) > sevenDaysAgo
        ).length
      },
      top_manuals: []
    }

    // 6. Get top manuals by views + search hits
    const manualStats = analytics.reduce((acc, event) => {
      if (!event.manual_id) return acc

      if (!acc[event.manual_id]) {
        acc[event.manual_id] = {
          manual_id: event.manual_id,
          filename: '',
          view_count: 0,
          search_hit_count: 0
        }
      }

      if (event.event_type === 'view') {
        acc[event.manual_id].view_count++
      } else if (event.event_type === 'search_hit') {
        acc[event.manual_id].search_hit_count++
      }

      return acc
    }, {} as Record<string, { manual_id: string; filename: string; view_count: number; search_hit_count: number }>)

    // Get manual filenames
    const manualIds = Object.keys(manualStats)
    if (manualIds.length > 0) {
      const { data: manuals } = await supabase
        .from('accommodation_manuals')
        .select('id, filename')
        .in('id', manualIds)

      if (manuals) {
        manuals.forEach(manual => {
          if (manualStats[manual.id]) {
            manualStats[manual.id].filename = manual.filename
          }
        })
      }
    }

    // Sort by total engagement (views + search hits)
    type ManualStat = {
      manual_id: string
      filename: string
      view_count: number
      search_hit_count: number
    }

    const sortedManuals = (Object.values(manualStats) as ManualStat[])
      .sort((a, b) => {
        const aTotal = a.view_count + a.search_hit_count
        const bTotal = b.view_count + b.search_hit_count
        return bTotal - aTotal
      })
      .slice(0, 5) // Top 5 manuals

    metrics.top_manuals = sortedManuals

    console.log('[Analytics] Metrics calculated:', metrics)

    return NextResponse.json({
      success: true,
      data: metrics
    })

  } catch (error: any) {
    console.error('[Analytics] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
