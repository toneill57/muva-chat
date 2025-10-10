/**
 * SIRE Guest Data API Endpoint
 *
 * GET /api/sire/guest-data?reservation_id=xxx
 * Returns complete SIRE guest data for a single reservation with human-readable catalog lookups.
 * Requires staff authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyStaffToken, extractTokenFromHeader, StaffAuthErrors } from '@/lib/staff-auth'

// ============================================================================
// Types
// ============================================================================

interface SIREGuestData {
  // Core reservation fields
  reservation_id: string
  reservation_code: string | null
  tenant_id: string
  guest_name: string
  check_in_date: string
  check_out_date: string
  status: string

  // SIRE Field 1-2: Hotel identification
  hotel_sire_code: string | null
  hotel_city_code: string | null

  // SIRE Field 3-4: Document identification
  document_type: string | null
  document_type_name: string | null
  document_number: string | null

  // SIRE Field 5: Nationality (SIRE country code)
  nationality_code: string | null
  nationality_name: string | null

  // SIRE Field 6-8: Guest name (separated per SIRE spec)
  first_surname: string | null
  second_surname: string | null
  given_names: string | null

  // SIRE Field 9-10: Movement tracking
  movement_type: string | null
  movement_date: string | null

  // SIRE Field 11: Origin (procedencia)
  origin_city_code: string | null
  origin_city_name: string | null

  // SIRE Field 12: Destination (destino)
  destination_city_code: string | null
  destination_city_name: string | null

  // SIRE Field 13: Birth date
  birth_date: string | null
}

interface SuccessResponse {
  success: true
  data: SIREGuestData
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

    console.log('[sire/guest-data] Fetching SIRE guest data:', {
      reservation_id: reservationId,
      tenant_id: staffSession.tenant_id,
      staff_username: staffSession.username,
    })

    // Call RPC function
    const supabase = createServerClient()
    const { data, error } = await supabase.rpc('get_sire_guest_data', {
      p_reservation_id: reservationId,
    })

    if (error) {
      console.error('[sire/guest-data] RPC error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch SIRE guest data',
          code: 'RPC_ERROR',
        },
        { status: 500 }
      )
    }

    // Check if reservation exists and belongs to tenant
    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reservation not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      )
    }

    const guestData = data[0]

    // Verify tenant ownership
    if (guestData.tenant_id !== staffSession.tenant_id) {
      console.warn('[sire/guest-data] Unauthorized access attempt:', {
        reservation_id: reservationId,
        reservation_tenant: guestData.tenant_id,
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

    console.log('[sire/guest-data] ✅ SIRE guest data retrieved:', {
      reservation_code: guestData.reservation_code,
      guest_name: guestData.guest_name,
      has_sire_data: !!(
        guestData.document_type &&
        guestData.document_number &&
        guestData.nationality_code
      ),
    })

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: guestData as SIREGuestData,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[sire/guest-data] Unexpected error:', error)

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
