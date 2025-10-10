/**
 * SIRE Monthly Export API Endpoint
 *
 * GET /api/sire/monthly-export?year=2025&month=1&movement_type=E
 * Retrieves all SIRE-compliant reservations for monthly TXT export.
 * Filters by movement_date (check-in or check-out) and ensures all mandatory SIRE fields are present.
 * Requires staff authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyStaffToken, extractTokenFromHeader, StaffAuthErrors } from '@/lib/staff-auth'

// ============================================================================
// Types
// ============================================================================

interface SIREMonthlyRecord {
  reservation_id: string
  reservation_code: string | null

  // SIRE Fields in TXT export order
  hotel_sire_code: string
  hotel_city_code: string
  document_type: string
  document_number: string
  nationality_code: string
  first_surname: string
  second_surname: string | null
  given_names: string
  movement_type: string
  movement_date: string
  origin_city_code: string | null
  destination_city_code: string | null
  birth_date: string | null

  // Metadata for validation
  guest_name: string
  check_in_date: string
  check_out_date: string
  status: string
}

interface SuccessResponse {
  success: true
  data: {
    records: SIREMonthlyRecord[]
    total_records: number
    month_start: string
    month_end: string
  }
  metadata: {
    tenant_id: string
    year: number
    month: number
    movement_type: string | null
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

function isValidMonth(month: number): boolean {
  return month >= 1 && month <= 12
}

function isValidYear(year: number): boolean {
  return year >= 2000 && year <= 2100
}

function isValidMovementType(type: string): boolean {
  return type === 'E' || type === 'S'
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
    const yearParam = url.searchParams.get('year')
    const monthParam = url.searchParams.get('month')
    const movementTypeParam = url.searchParams.get('movement_type')

    // Validate required parameters
    if (!yearParam || !monthParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: year and month',
          code: 'MISSING_PARAMETERS',
        },
        { status: 400 }
      )
    }

    // Parse and validate year
    const year = parseInt(yearParam, 10)
    if (isNaN(year) || !isValidYear(year)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid year (must be between 2000-2100)',
          code: 'INVALID_YEAR',
        },
        { status: 400 }
      )
    }

    // Parse and validate month
    const month = parseInt(monthParam, 10)
    if (isNaN(month) || !isValidMonth(month)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid month (must be between 1-12)',
          code: 'INVALID_MONTH',
        },
        { status: 400 }
      )
    }

    // Validate movement type (optional)
    let movementType: string | null = null
    if (movementTypeParam) {
      const upperMovementType = movementTypeParam.toUpperCase()
      if (!isValidMovementType(upperMovementType)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid movement_type (must be E or S)',
            code: 'INVALID_MOVEMENT_TYPE',
          },
          { status: 400 }
        )
      }
      movementType = upperMovementType
    }

    console.log('[sire/monthly-export] Fetching monthly export:', {
      tenant_id: staffSession.tenant_id,
      year,
      month,
      movement_type: movementType || 'all',
      staff_username: staffSession.username,
    })

    // Call RPC function
    const supabase = createServerClient()
    const { data, error } = await supabase.rpc('get_sire_monthly_export', {
      p_tenant_id: staffSession.tenant_id,
      p_year: year,
      p_month: month,
      p_movement_type: movementType,
    })

    if (error) {
      console.error('[sire/monthly-export] RPC error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch monthly export data',
          code: 'RPC_ERROR',
        },
        { status: 500 }
      )
    }

    const records = data || []

    // Calculate month boundaries for metadata
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)

    console.log('[sire/monthly-export] ✅ Export data retrieved:', {
      total_records: records.length,
      month_range: `${monthStart.toISOString().split('T')[0]} to ${monthEnd.toISOString().split('T')[0]}`,
      movement_type: movementType || 'all',
    })

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          records: records as SIREMonthlyRecord[],
          total_records: records.length,
          month_start: monthStart.toISOString().split('T')[0],
          month_end: monthEnd.toISOString().split('T')[0],
        },
        metadata: {
          tenant_id: staffSession.tenant_id,
          year,
          month,
          movement_type: movementType,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[sire/monthly-export] Unexpected error:', error)

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
