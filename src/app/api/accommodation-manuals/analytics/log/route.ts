/**
 * Manual Analytics Logging API
 *
 * POST /api/accommodation-manuals/analytics/log
 * Logs analytics events for manual usage tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================

interface LogEventRequest {
  manual_id: string | null
  tenant_id: string
  accommodation_unit_id: string
  event_type: 'upload' | 'view' | 'search_hit' | 'delete'
  metadata?: Record<string, any>
}

interface SuccessResponse {
  success: true
  event_id: string
}

interface ErrorResponse {
  success: false
  error: string
}

type ApiResponse = SuccessResponse | ErrorResponse

// ============================================================================
// POST: Log Analytics Event
// ============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const body: LogEventRequest = await request.json()

    const {
      manual_id,
      tenant_id,
      accommodation_unit_id,
      event_type,
      metadata = {}
    } = body

    console.log('[Analytics Log] Event:', event_type, 'Manual:', manual_id)

    // Validate required fields
    if (!tenant_id || !accommodation_unit_id || !event_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate event_type
    if (!['upload', 'view', 'search_hit', 'delete'].includes(event_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event_type' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createServerClient()

    // Insert event using the helper function
    const { data, error } = await supabase.rpc('log_manual_analytics_event', {
      p_manual_id: manual_id,
      p_tenant_id: tenant_id,
      p_accommodation_unit_id: accommodation_unit_id,
      p_event_type: event_type,
      p_metadata: metadata
    })

    if (error) {
      console.error('[Analytics Log] RPC error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('[Analytics Log] Event logged:', data)

    return NextResponse.json({
      success: true,
      event_id: data
    })

  } catch (error: any) {
    console.error('[Analytics Log] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
