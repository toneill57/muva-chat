import { NextRequest, NextResponse } from 'next/server'
import { verifyGuestToken, extractTokenFromHeader, GuestAuthErrors } from '@/lib/guest-auth'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/guest/reservation-sire-data?guest_order=N
 *
 * Returns existing SIRE data for a specific guest in the reservation.
 * Used to sync frontend state with database on SIRE mode start.
 *
 * Query Parameters:
 * - guest_order: Guest number (1 = titular, 2+ = companions). Defaults to 1.
 *
 * Data Sources:
 * - guest_order=1 (titular): Reads from guest_reservations (backwards compatibility)
 * - guest_order>1 (companions): Reads from reservation_guests
 *
 * This is CRITICAL for frontend-backend sync:
 * - Prevents duplicate field requests
 * - Ensures progressive disclosure continues from correct field
 * - Handles cases where guest has previously started SIRE registration
 */
export async function GET(request: NextRequest) {
  try {
    // === AUTHENTICATION ===
    const cookieToken = request.cookies.get('guest_token')?.value
    const authHeader = request.headers.get('Authorization')
    const headerToken = extractTokenFromHeader(authHeader)
    const token = cookieToken || headerToken

    if (!token) {
      return NextResponse.json(
        { error: GuestAuthErrors.MISSING_HEADER },
        { status: 401 }
      )
    }

    const session = await verifyGuestToken(token)

    if (!session) {
      return NextResponse.json(
        { error: GuestAuthErrors.INVALID_TOKEN },
        { status: 401 }
      )
    }

    // === PARSE GUEST_ORDER PARAMETER ===
    const url = new URL(request.url)
    const guestOrder = parseInt(url.searchParams.get('guest_order') || '1', 10)

    console.log('[reservation-sire-data] Loading data for guest_order:', guestOrder)

    // === FETCH SIRE DATA BASED ON GUEST_ORDER ===
    const supabase = createServerClient()
    const sireData: Record<string, string> = {}

    if (guestOrder === 1) {
      // For titular (guest_order=1), read from guest_reservations (backwards compatibility)
      const { data: reservationData, error } = await supabase
        .from('guest_reservations')
        .select(`
          document_type,
          document_number,
          first_surname,
          second_surname,
          given_names,
          nationality_code,
          birth_date,
          origin_city_code,
          destination_city_code,
          movement_type,
          movement_date,
          hotel_sire_code,
          hotel_city_code
        `)
        .eq('id', session.reservation_id)
        .single()

      if (error) {
        console.error('[reservation-sire-data] Error fetching reservation:', error)
        return NextResponse.json(
          { error: 'Failed to fetch reservation data' },
          { status: 500 }
        )
      }

      // === MAP DB COLUMNS TO PROGRESSIVE DISCLOSURE FIELD NAMES ===
      if (reservationData.document_type) {
        sireData.document_type_code = reservationData.document_type
      }

      if (reservationData.document_number) {
        sireData.identification_number = reservationData.document_number
      }

      if (reservationData.first_surname) {
        sireData.first_surname = reservationData.first_surname
      }

      // second_surname can be empty string (intentionally skipped)
      if (reservationData.second_surname !== null) {
        sireData.second_surname = reservationData.second_surname || ''
      }

      if (reservationData.given_names) {
        sireData.names = reservationData.given_names
      }

      if (reservationData.nationality_code) {
        sireData.nationality_code = reservationData.nationality_code
      }

      // Convert birth_date from YYYY-MM-DD to DD/MM/YYYY
      if (reservationData.birth_date) {
        const parts = reservationData.birth_date.split('-')
        if (parts.length === 3) {
          sireData.birth_date = `${parts[2]}/${parts[1]}/${parts[0]}`
        }
      }

      if (reservationData.origin_city_code) {
        sireData.origin_place = reservationData.origin_city_code
      }

      if (reservationData.destination_city_code) {
        sireData.destination_place = reservationData.destination_city_code
      }

      if (reservationData.movement_type) {
        sireData.movement_type = reservationData.movement_type
      }

      // Convert movement_date from YYYY-MM-DD to DD/MM/YYYY
      if (reservationData.movement_date) {
        const parts = reservationData.movement_date.split('-')
        if (parts.length === 3) {
          sireData.movement_date = `${parts[2]}/${parts[1]}/${parts[0]}`
        }
      }

      if (reservationData.hotel_sire_code) {
        sireData.hotel_code = reservationData.hotel_sire_code
      }

      if (reservationData.hotel_city_code) {
        sireData.city_code = reservationData.hotel_city_code
      }
    } else {
      // For companions (guest_order > 1), read from reservation_guests
      const { data: guestData, error } = await supabase
        .from('reservation_guests')
        .select(`
          document_type,
          document_number,
          first_surname,
          second_surname,
          given_names,
          nationality_code,
          birth_date,
          origin_city_code,
          destination_city_code
        `)
        .eq('reservation_id', session.reservation_id)
        .eq('guest_order', guestOrder)
        .single()

      if (error) {
        // Guest not found is NOT an error - return empty sireData
        if (error.code === 'PGRST116') {
          console.log('[reservation-sire-data] Guest not found (expected for new companions):', {
            reservation_id: session.reservation_id,
            guest_order: guestOrder,
          })
        } else {
          console.error('[reservation-sire-data] Error fetching guest:', error)
          return NextResponse.json(
            { error: 'Failed to fetch guest data' },
            { status: 500 }
          )
        }
      }

      // === MAP DB COLUMNS TO PROGRESSIVE DISCLOSURE FIELD NAMES ===
      if (guestData) {
        if (guestData.document_type) {
          sireData.document_type_code = guestData.document_type
        }

        if (guestData.document_number) {
          sireData.identification_number = guestData.document_number
        }

        if (guestData.first_surname) {
          sireData.first_surname = guestData.first_surname
        }

        // second_surname can be empty string (intentionally skipped)
        if (guestData.second_surname !== null) {
          sireData.second_surname = guestData.second_surname || ''
        }

        if (guestData.given_names) {
          sireData.names = guestData.given_names
        }

        if (guestData.nationality_code) {
          sireData.nationality_code = guestData.nationality_code
        }

        // Convert birth_date from YYYY-MM-DD to DD/MM/YYYY
        if (guestData.birth_date) {
          const parts = guestData.birth_date.split('-')
          if (parts.length === 3) {
            sireData.birth_date = `${parts[2]}/${parts[1]}/${parts[0]}`
          }
        }

        if (guestData.origin_city_code) {
          sireData.origin_place = guestData.origin_city_code
        }

        if (guestData.destination_city_code) {
          sireData.destination_place = guestData.destination_city_code
        }
      }
    }

    console.log('[reservation-sire-data] Returning SIRE data:', {
      reservation_id: session.reservation_id,
      guest_order: guestOrder,
      fields: Object.keys(sireData),
    })

    return NextResponse.json({
      success: true,
      sireData,
    })

  } catch (error) {
    console.error('[reservation-sire-data] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
