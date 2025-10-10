/**
 * SIRE Data Completeness API Endpoint
 *
 * GET /api/sire/data-completeness?reservation_id=xxx
 * Validates SIRE data completeness for a reservation.
 * Returns is_complete flag, list of missing mandatory fields, and validation errors.
 * Requires staff authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyStaffToken, extractTokenFromHeader, StaffAuthErrors } from '@/lib/staff-auth'

// ============================================================================
// Types
// ============================================================================

interface CompletenessResult {
  is_complete: boolean
  missing_fields: string[]
  validation_errors: string[]
}

interface SuccessResponse {
  success: true
  data: CompletenessResult
  metadata: {
    reservation_id: string
    tenant_id: string
  }
}

interface ErrorResponse {
  success: false
  error: string
  code?: string
}

type Response = SuccessResponse | ErrorResponse

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
    const reservationId = url.searchParams.get('reservation_id')

    if (!reservationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: reservation_id',
          code: 'MISSING_PARAMETER',
        },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(reservationId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid reservation_id format (must be UUID)',
          code: 'INVALID_UUID',
        },
        { status: 400 }
      )
    }

    console.log('[sire/data-completeness] Checking SIRE data completeness:', {
      reservation_id: reservationId,
      tenant_id: staffSession.tenant_id,
      staff_username: staffSession.username,
    })

    // First, verify the reservation belongs to the tenant
    const supabase = createServerClient()
    const { data: reservation, error: reservationError } = await supabase
      .from('guest_reservations')
      .select('id, tenant_id, reservation_code')
      .eq('id', reservationId)
      .single()

    if (reservationError || !reservation) {
      console.error('[sire/data-completeness] Reservation not found:', reservationError)
      return NextResponse.json(
        {
          success: false,
          error: 'Reservation not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      )
    }

    // Verify tenant ownership
    if (reservation.tenant_id !== staffSession.tenant_id) {
      console.warn('[sire/data-completeness] Unauthorized access attempt:', {
        reservation_id: reservationId,
        reservation_tenant: reservation.tenant_id,
        staff_tenant: staffSession.tenant_id,
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Reservation does not belong to your tenant',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      )
    }

    // Call RPC function to check completeness
    const { data, error } = await supabase.rpc('check_sire_data_completeness', {
      p_reservation_id: reservationId,
    })

    if (error) {
      console.error('[sire/data-completeness] RPC error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to check SIRE data completeness',
          code: 'RPC_ERROR',
        },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No completeness data returned',
          code: 'NO_DATA',
        },
        { status: 500 }
      )
    }

    const completeness = data[0]

    console.log('[sire/data-completeness] ✅ Completeness check result:', {
      reservation_code: reservation.reservation_code,
      is_complete: completeness.is_complete,
      missing_fields_count: completeness.missing_fields?.length || 0,
      validation_errors_count: completeness.validation_errors?.length || 0,
    })

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          is_complete: completeness.is_complete,
          missing_fields: completeness.missing_fields || [],
          validation_errors: completeness.validation_errors || [],
        },
        metadata: {
          reservation_id: reservationId,
          tenant_id: staffSession.tenant_id,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[sire/data-completeness] Unexpected error:', error)

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
