/**
 * Reservations List API Endpoint
 *
 * GET /api/reservations/list
 * Returns list of confirmed future reservations for the authenticated tenant.
 * Requires staff authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyStaffToken, extractTokenFromHeader, StaffAuthErrors } from '@/lib/staff-auth'

// ============================================================================
// Types
// ============================================================================

interface ReservationListItem {
  id: string
  tenant_id: string
  guest_name: string
  phone_full: string
  phone_last_4: string
  check_in_date: string
  check_out_date: string
  reservation_code: string | null
  status: string

  // 🆕 UPDATED: Multiple accommodations per reservation (junction table)
  reservation_accommodations: Array<{
    id: string
    motopress_accommodation_id: number | null
    motopress_type_id: number | null
    room_rate: number | null
    accommodation_unit: {
      id: string
      name: string
      unit_number: string | null
      unit_type: string | null
    } | null
  }>

  // 🆕 NEW: Complete booking details (PHASE 3)
  guest_email: string | null
  guest_country: string | null
  adults: number
  children: number
  total_price: number | null
  currency: string
  check_in_time: string
  check_out_time: string
  booking_source: string
  external_booking_id: string | null
  booking_notes: string | null

  // 🆕 NEW: SIRE Compliance Fields (FASE 2) - 9 campos oficiales
  document_type: string | null              // '3'=Pasaporte, '5'=Cédula, '10'=PEP, '46'=Diplomático
  document_number: string | null            // Alfanumérico 6-15 chars sin guiones
  birth_date: string | null                 // YYYY-MM-DD format
  first_surname: string | null              // Primer apellido (MAYÚSCULAS, con acentos)
  second_surname: string | null             // Segundo apellido (opcional, puede estar vacío)
  given_names: string | null                // Nombres (MAYÚSCULAS, con acentos)
  nationality_code: string | null           // Código SIRE (249=USA, 169=COL) - NO ISO
  origin_city_code: string | null           // Ciudad/país procedencia (DIVIPOLA o SIRE)
  destination_city_code: string | null      // Ciudad/país destino (DIVIPOLA o SIRE)

  created_at: string
  updated_at: string
}

interface ReservationsListSuccessResponse {
  success: true
  data: {
    total: number
    reservations: ReservationListItem[]
    tenant_info: {
      tenant_id: string
      hotel_name: string
      slug: string
    }
  }
}

interface ReservationsListErrorResponse {
  success: false
  error: string
  code?: string
}

type ReservationsListResponse = ReservationsListSuccessResponse | ReservationsListErrorResponse

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<ReservationsListResponse>> {
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

    console.log('[reservations-list] Fetching reservations for tenant:', {
      tenant_id: staffSession.tenant_id,
      staff_username: staffSession.username,
    })

    // Get query parameters
    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status') || 'active'
    const futureOnly = url.searchParams.get('future') !== 'false' // Default true

    // Build query
    const supabase = createServerClient()

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Query reservations with accommodation units from hotels schema
    let query = supabase
      .from('guest_reservations')
      .select(`
        id,
        tenant_id,
        guest_name,
        phone_full,
        phone_last_4,
        check_in_date,
        check_out_date,
        reservation_code,
        status,
        guest_email,
        guest_country,
        adults,
        children,
        total_price,
        currency,
        check_in_time,
        check_out_time,
        booking_source,
        external_booking_id,
        booking_notes,
        document_type,
        document_number,
        birth_date,
        first_surname,
        second_surname,
        given_names,
        nationality_code,
        origin_city_code,
        destination_city_code,
        created_at,
        updated_at
      `)
      .eq('tenant_id', staffSession.tenant_id)
      .eq('status', statusFilter)

    // Filter future reservations only
    if (futureOnly) {
      query = query.gte('check_in_date', today)
    }

    // Order by check-in date (nearest first)
    query = query.order('check_in_date', { ascending: true })

    const { data: reservationsData, error: reservationsError } = await query

    if (reservationsError) {
      console.error('[reservations-list] Query error:', reservationsError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch reservations',
          code: 'QUERY_ERROR',
        },
        { status: 500 }
      )
    }

    // Get reservation IDs for junction table lookup
    const reservationIds = (reservationsData || []).map((r: any) => r.id)

    // Fetch reservation_accommodations data
    const reservationAccommodationsMap = new Map<string, any[]>()

    if (reservationIds.length > 0) {
      console.log('[reservations-list] Fetching accommodation mappings for', reservationIds.length, 'reservations')

      const { data: accommodationsData, error: accommodationsError } = await supabase
        .from('reservation_accommodations')
        .select('id, reservation_id, accommodation_unit_id, motopress_accommodation_id, motopress_type_id, room_rate')
        .in('reservation_id', reservationIds)

      if (accommodationsError) {
        console.error('[reservations-list] Accommodations query error:', accommodationsError)
      } else if (accommodationsData) {
        // Group accommodations by reservation_id
        accommodationsData.forEach((acc: any) => {
          if (!reservationAccommodationsMap.has(acc.reservation_id)) {
            reservationAccommodationsMap.set(acc.reservation_id, [])
          }
          reservationAccommodationsMap.get(acc.reservation_id)!.push(acc)
        })
        console.log('[reservations-list] Found', accommodationsData.length, 'accommodation mappings')
      }
    }

    // Get unique accommodation_unit_ids for cross-schema lookup
    const allAccommodations = Array.from(reservationAccommodationsMap.values()).flat()
    const accommodationUnitIds = [...new Set(
      allAccommodations
        .map((acc: any) => acc.accommodation_unit_id)
        .filter(Boolean)
    )]

    const accommodationUnitsMap = new Map<string, any>()

    if (accommodationUnitIds.length > 0) {
      console.log('[reservations-list] Fetching', accommodationUnitIds.length, 'unique accommodation units')

      const { data: unitsData, error: unitsError } = await supabase.rpc(
        'get_accommodation_units_by_ids',
        { p_unit_ids: accommodationUnitIds }
      )

      if (unitsError) {
        console.error('[reservations-list] RPC error:', unitsError)
      } else if (unitsData) {
        unitsData.forEach((unit: any) => {
          accommodationUnitsMap.set(unit.id, {
            id: unit.id,
            name: unit.name,
            unit_number: unit.unit_number,
            unit_type: unit.unit_type,
          })
        })
        console.log('[reservations-list] Map populated with', accommodationUnitsMap.size, 'units')
      }
    }

    // Get tenant information
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('tenant_id, nombre_comercial, slug')
      .eq('tenant_id', staffSession.tenant_id)
      .single()

    if (tenantError || !tenantData) {
      console.error('[reservations-list] Tenant not found:', tenantError)
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
          code: 'TENANT_NOT_FOUND',
        },
        { status: 404 }
      )
    }

    // Transform data to match response interface
    const reservations: ReservationListItem[] = (reservationsData || []).map((res: any) => {
      // Get accommodations for this reservation from junction table
      const reservationAccommodations = (reservationAccommodationsMap.get(res.id) || []).map((acc: any) => ({
        id: acc.id,
        motopress_accommodation_id: acc.motopress_accommodation_id,
        motopress_type_id: acc.motopress_type_id,
        room_rate: acc.room_rate,
        accommodation_unit: acc.accommodation_unit_id
          ? accommodationUnitsMap.get(acc.accommodation_unit_id) || null
          : null
      }))

      return {
        id: res.id,
        tenant_id: res.tenant_id,
        guest_name: res.guest_name,
        phone_full: res.phone_full,
        phone_last_4: res.phone_last_4,
        check_in_date: res.check_in_date,
        check_out_date: res.check_out_date,
        reservation_code: res.reservation_code,
        status: res.status,
        reservation_accommodations: reservationAccommodations, // Array of accommodations

        // 🆕 NEW: Complete booking details (PHASE 3)
        guest_email: res.guest_email,
        guest_country: res.guest_country,
        adults: res.adults || 1,
        children: res.children || 0,
        total_price: res.total_price,
        currency: res.currency || 'COP',
        check_in_time: res.check_in_time || '15:00',
        check_out_time: res.check_out_time || '12:00',
        booking_source: res.booking_source || 'manual',
        external_booking_id: res.external_booking_id,
        booking_notes: res.booking_notes,

        // 🆕 NEW: SIRE Compliance Fields (FASE 2) - 9 campos oficiales
        document_type: res.document_type,
        document_number: res.document_number,
        birth_date: res.birth_date,
        first_surname: res.first_surname,
        second_surname: res.second_surname,
        given_names: res.given_names,
        nationality_code: res.nationality_code,
        origin_city_code: res.origin_city_code,
        destination_city_code: res.destination_city_code,

        created_at: res.created_at,
        updated_at: res.updated_at,
      }
    })

    console.log('[reservations-list] ✅ Found reservations:', {
      total: reservations.length,
      tenant: tenantData.nombre_comercial,
      filter_status: statusFilter,
      future_only: futureOnly,
    })

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          total: reservations.length,
          reservations,
          tenant_info: {
            tenant_id: tenantData.tenant_id,
            hotel_name: tenantData.nombre_comercial,
            slug: tenantData.slug,
          },
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[reservations-list] Unexpected error:', error)

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
