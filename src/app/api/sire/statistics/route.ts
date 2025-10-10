/**
 * SIRE Statistics API Endpoint
 *
 * GET /api/sire/statistics?start_date=2025-01-01&end_date=2025-01-31
 * Returns SIRE compliance statistics for the authenticated tenant in a date range.
 * Requires staff authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyStaffToken, extractTokenFromHeader, StaffAuthErrors } from '@/lib/staff-auth'

// ============================================================================
// Types
// ============================================================================

interface TopNationality {
  country: string
  count: number
}

interface SIREStatistics {
  total_reservations: number
  sire_complete_reservations: number
  sire_incomplete_reservations: number
  completion_rate: number

  // Breakdown by movement type
  check_ins_complete: number
  check_outs_complete: number

  // Top nationalities
  top_nationalities: TopNationality[]

  // Missing field statistics
  missing_hotel_code: number
  missing_document: number
  missing_nationality: number
  missing_names: number
}

interface SuccessResponse {
  success: true
  data: SIREStatistics
  metadata: {
    tenant_id: string
    start_date: string
    end_date: string
  }
}

interface ErrorResponse {
  success: false
  error: string
  code?: string
}

type Response = SuccessResponse | ErrorResponse

// ============================================================================
// Helper Functions
// ============================================================================

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<Response>> {
  try {
    // Extract and verify authentication token
    const authHeader = request.headers.get('Authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: StaffAuthErrors.MISSING_HEADER,
          code: 'MISSING_AUTH_HEADER',
        },
        { status: 401 }
      )
    }

    // Verify staff token
    const staffSession = await verifyStaffToken(token)

    if (!staffSession) {
      return NextResponse.json(
        {
          success: false,
          error: StaffAuthErrors.INVALID_TOKEN,
          code: 'INVALID_TOKEN',
        },
        { status: 401 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: start_date and end_date',
          code: 'MISSING_PARAMETERS',
        },
        { status: 400 }
      )
    }

    // Validate date formats
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD',
          code: 'INVALID_DATE_FORMAT',
        },
        { status: 400 }
      )
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'start_date must be before or equal to end_date',
          code: 'INVALID_DATE_RANGE',
        },
        { status: 400 }
      )
    }

    console.log('[sire/statistics] Fetching SIRE statistics:', {
      tenant_id: staffSession.tenant_id,
      start_date: startDate,
      end_date: endDate,
      staff_username: staffSession.username,
    })

    // Call RPC function
    const supabase = createServerClient()
    const { data, error } = await supabase.rpc('get_sire_statistics', {
      p_tenant_id: staffSession.tenant_id,
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (error) {
      console.error('[sire/statistics] RPC error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch SIRE statistics',
          code: 'RPC_ERROR',
        },
        { status: 500 }
      )
    }

    // Check if data exists
    if (!data || data.length === 0) {
      // Return empty statistics if no data found
      return NextResponse.json(
        {
          success: true,
          data: {
            total_reservations: 0,
            sire_complete_reservations: 0,
            sire_incomplete_reservations: 0,
            completion_rate: 0,
            check_ins_complete: 0,
            check_outs_complete: 0,
            top_nationalities: [],
            missing_hotel_code: 0,
            missing_document: 0,
            missing_nationality: 0,
            missing_names: 0,
          },
          metadata: {
            tenant_id: staffSession.tenant_id,
            start_date: startDate,
            end_date: endDate,
          },
        },
        { status: 200 }
      )
    }

    const stats = data[0]

    console.log('[sire/statistics] ✅ Statistics retrieved:', {
      total: stats.total_reservations,
      complete: stats.sire_complete_reservations,
      completion_rate: `${stats.completion_rate}%`,
    })

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          total_reservations: Number(stats.total_reservations) || 0,
          sire_complete_reservations: Number(stats.sire_complete_reservations) || 0,
          sire_incomplete_reservations: Number(stats.sire_incomplete_reservations) || 0,
          completion_rate: Number(stats.completion_rate) || 0,
          check_ins_complete: Number(stats.check_ins_complete) || 0,
          check_outs_complete: Number(stats.check_outs_complete) || 0,
          top_nationalities: stats.top_nationalities || [],
          missing_hotel_code: Number(stats.missing_hotel_code) || 0,
          missing_document: Number(stats.missing_document) || 0,
          missing_nationality: Number(stats.missing_nationality) || 0,
          missing_names: Number(stats.missing_names) || 0,
        },
        metadata: {
          tenant_id: staffSession.tenant_id,
          start_date: startDate,
          end_date: endDate,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[sire/statistics] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// OPTIONS Handler (CORS)
// ============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
