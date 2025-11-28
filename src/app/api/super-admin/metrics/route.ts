/**
 * Super Admin Platform Metrics Endpoint
 *
 * Returns aggregated platform-wide metrics for the super admin dashboard.
 * Protected by superAdminMiddleware (JWT authentication required).
 *
 * GET /api/super-admin/metrics
 * Headers: { Authorization: "Bearer <token>" }
 * Response: {
 *   total_tenants: number,
 *   active_tenants: number,
 *   total_conversations_30d: number,
 *   active_users_30d: number,
 *   muva_content_count: number,
 *   last_updated: string (ISO timestamp)
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

    // Query the v_platform_metrics view
    // This view aggregates platform-wide statistics
    const { data: metrics, error: metricsError } = await supabase
      .from('v_platform_metrics')
      .select('*')
      .single()

    if (metricsError) {
      console.error('[api/super-admin/metrics] Error fetching platform metrics:', metricsError)
      return NextResponse.json(
        { error: 'Failed to fetch platform metrics' },
        { status: 500 }
      )
    }

    // Count total MUVA content items
    // (tourism content entries in muva_content table)
    const { count: muvaContentCount, error: contentError } = await supabase
      .from('muva_content')
      .select('*', { count: 'exact', head: true })

    if (contentError) {
      console.error('[api/super-admin/metrics] Error counting MUVA content:', contentError)
      // Don't fail the entire request if content count fails
    }

    // Compose response
    const response = {
      total_tenants: metrics?.total_tenants || 0,
      active_tenants: metrics?.active_tenants || 0,
      total_conversations_30d: metrics?.total_conversations_30d || 0,
      active_users_30d: metrics?.active_users_30d || 0,
      muva_content_count: muvaContentCount || 0,
      last_updated: new Date().toISOString(),
    }

    console.log('[api/super-admin/metrics] ✅ Metrics fetched successfully')

    return NextResponse.json(response)
  } catch (error) {
    console.error('[api/super-admin/metrics] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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
