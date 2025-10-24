import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyStaffToken, extractTokenFromHeader } from '@/lib/staff-auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Staff authentication
    const authHeader = request.headers.get('Authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - Missing token' }, { status: 401 })
    }

    const staffSession = await verifyStaffToken(token)

    if (!staffSession) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    const tenantId = staffSession.tenant_id

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'active'
    const propertyId = searchParams.get('property_id')
    const futureOnly = searchParams.get('future_only') !== 'false' // Default true

    // Query guest_reservations (where Airbnb reservations are actually stored)
    let query = supabase
      .from('guest_reservations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('booking_source', 'airbnb')

    // Filter by future dates
    if (futureOnly) {
      const today = new Date().toISOString().split('T')[0]
      query = query.gte('check_out_date', today)
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Filter by property
    if (propertyId) {
      query = query.eq('accommodation_unit_id', propertyId)
    }

    // Order by check-in date
    query = query.order('check_in_date', { ascending: true })

    const { data: reservations, error } = await query

    if (error) {
      console.error('[API] Error fetching Airbnb reservations:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch reservations' },
        { status: 500 }
      )
    }

    // Get reservation IDs
    const reservationIds = reservations?.map(r => r.id) || []

    // Fetch reservation_accommodations data
    const reservationAccommodationsMap = new Map<string, any[]>()

    if (reservationIds.length > 0) {
      const { data: accommodationsData } = await supabase
        .from('reservation_accommodations')
        .select('*')
        .in('reservation_id', reservationIds)

      if (accommodationsData) {
        accommodationsData.forEach((acc: any) => {
          if (!reservationAccommodationsMap.has(acc.reservation_id)) {
            reservationAccommodationsMap.set(acc.reservation_id, [])
          }
          reservationAccommodationsMap.get(acc.reservation_id)!.push(acc)
        })
      }
    }

    // Get unique accommodation_unit_ids
    const allAccommodations = Array.from(reservationAccommodationsMap.values()).flat()
    const accommodationUnitIds = [...new Set(
      allAccommodations
        .map((acc: any) => acc.accommodation_unit_id)
        .filter(Boolean)
    )]

    // Fetch accommodation names using RPC function
    const accommodationUnitsMap = new Map<string, any>()

    if (accommodationUnitIds.length > 0) {
      const { data: unitsData, error: unitsError } = await supabase.rpc(
        'get_accommodation_units_by_ids',
        { p_unit_ids: accommodationUnitIds }
      )

      if (!unitsError && unitsData) {
        unitsData.forEach((unit: any) => {
          accommodationUnitsMap.set(unit.id, {
            id: unit.id,
            name: unit.name,
            unit_number: unit.unit_number,
            unit_type: unit.unit_type,
          })
        })
      }
    }

    // Transform data to match UnifiedReservation format
    const transformedReservations = reservations?.map((res) => {
      // Get accommodations for this reservation
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
        ...res,
        // Add reservation_accommodations array (like MotoPress)
        reservation_accommodations: reservationAccommodations,
        // Also add property_name for backwards compatibility
        property_name: reservationAccommodations[0]?.accommodation_unit?.name || 'Unknown Property',
        // Map date fields for UnifiedReservation
        start_date: res.check_in_date,
        end_date: res.check_out_date,
        // Map phone fields
        guest_phone_last4: res.phone_last_4,
        phone_last_4: res.phone_last_4
      }
    }) || []

    return NextResponse.json({
      success: true,
      reservations: transformedReservations,
      total: transformedReservations.length
    })
  } catch (error) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
