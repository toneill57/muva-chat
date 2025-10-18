import { SupabaseClient } from '@supabase/supabase-js'

// MotoPress Booking Interface (from API response)
export interface MotoPresBooking {
  id: number
  status: string
  date_created: string
  date_created_utc: string
  key: string
  check_in_date: string
  check_out_date: string
  check_in_time: string
  check_out_time: string
  customer: {
    first_name: string
    last_name: string
    email: string
    phone: string
    country: string
    state: string
    city: string
    zip: string
    address1: string
  }
  reserved_accommodations: Array<{
    accommodation: number // MotoPress unit instance ID
    accommodation_type: number // MotoPress accommodation type ID
    rate: number
    adults: number
    children: number
    guest_name: string
    services: any[]
    accommodation_price_per_days: any[]
    fees: any[]
    taxes: any
    discount: number
  }>
  coupon_code: string
  currency: string
  total_price: number
  checkout_id: string
  payments: any[]
  imported: boolean
  ical_description: string
  ical_prodid: string
  ical_summary: string
  note: string
  internal_notes: any[]
}

// Guest Reservation Interface (database schema)
export interface GuestReservation {
  tenant_id: string
  guest_name: string
  phone_full: string
  phone_last_4: string
  check_in_date: string
  check_out_date: string
  check_in_time: string
  check_out_time: string
  reservation_code: string | null
  status: string
  accommodation_unit_id: string | null
  guest_email: string | null
  guest_country: string | null
  adults: number
  children: number
  total_price: number | null
  currency: string
  booking_source: string
  external_booking_id: string
  booking_notes: string | null
  // SIRE compliance fields (null for MotoPress imports)
  document_type: string | null
  document_number: string | null
  birth_date: string | null
  first_surname: string | null
  second_surname: string | null
  given_names: string | null
  nationality_code: string | null
  origin_city_code: string | null
  destination_city_code: string | null
  hotel_sire_code: string | null
  hotel_city_code: string | null
  movement_type: string | null
  movement_date: string | null
}

export class MotoPresBookingsMapper {
  /**
   * Extracts phone last 4 digits from iCal description
   * MotoPress stores Airbnb phone data like: "Phone Number (Last 4 Digits): 8216"
   */
  static extractPhoneFromIcal(ical: string): { full: string; last4: string } {
    const match = ical.match(/Phone Number \(Last 4 Digits\):\s*(\d{4})/)
    return {
      full: 'N/A', // MotoPress doesn't provide full phone number
      last4: match?.[1] || '0000'
    }
  }

  /**
   * Extracts reservation code from iCal description
   * Example: "Reservation URL: https://www.airbnb.com/.../HMFYJRTJ38" → "HMFYJRTJ38"
   */
  static extractReservationCode(ical: string): string | null {
    const match = ical.match(/\/([A-Z0-9]{10,})/)
    return match?.[1] || null
  }

  /**
   * Maps MotoPress booking to GuestReservation format
   *
   * @param booking - MotoPress booking object from API
   * @param tenantId - UUID of the tenant
   * @param supabase - Supabase client for accommodation unit lookup
   */
  static async mapToGuestReservation(
    booking: MotoPresBooking,
    tenantId: string,
    supabase: SupabaseClient
  ): Promise<GuestReservation> {
    // 1. Extract phone data from iCal description (Airbnb bookings)
    const phone = this.extractPhoneFromIcal(booking.ical_description || '')
    const reservationCode = this.extractReservationCode(booking.ical_description || '')

    // 2. Find accommodation_unit_id by matching MotoPress accommodation_type
    const motopressTypeId = booking.reserved_accommodations[0]?.accommodation_type
    let accommodationUnitId: string | null = null

    if (motopressTypeId) {
      // Try to find unit in accommodation_units_public by metadata
      const { data: units } = await supabase
        .from('accommodation_units_public')
        .select('unit_id, metadata')
        .eq('tenant_id', tenantId)

      // Find matching unit by motopress_type_id in metadata
      const matchingUnit = units?.find((unit: any) => {
        const metadata = unit.metadata || {}
        return metadata.motopress_type_id === motopressTypeId
      })

      accommodationUnitId = matchingUnit?.unit_id || null
    }

    // 3. Build guest name
    let guestName = 'Guest' // Default fallback

    if (booking.customer.first_name && booking.customer.last_name) {
      guestName = `${booking.customer.first_name} ${booking.customer.last_name}`.trim()
    } else if (booking.customer.first_name) {
      guestName = booking.customer.first_name
    } else if (booking.customer.last_name) {
      guestName = booking.customer.last_name
    } else if (booking.reserved_accommodations[0]?.guest_name) {
      guestName = booking.reserved_accommodations[0].guest_name
    }

    // 4. Map to GuestReservation schema
    return {
      tenant_id: tenantId,
      guest_name: guestName,
      phone_full: booking.customer.phone || phone.full,
      phone_last_4: phone.last4,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      check_in_time: booking.check_in_time || '15:00:00',
      check_out_time: booking.check_out_time || '12:00:00',
      reservation_code: reservationCode,
      status: booking.status === 'confirmed' ? 'active' : 'inactive',
      accommodation_unit_id: accommodationUnitId,
      guest_email: booking.customer.email || null,
      guest_country: booking.customer.country || null,
      adults: booking.reserved_accommodations[0]?.adults || 1,
      children: booking.reserved_accommodations[0]?.children || 0,
      total_price: booking.total_price || null,
      currency: booking.currency || 'COP',
      booking_source: 'motopress',
      external_booking_id: booking.id.toString(),
      booking_notes: booking.ical_description || null,
      // SIRE compliance fields (null for MotoPress sync - can be filled by guest later)
      document_type: null,
      document_number: null,
      birth_date: null,
      first_surname: null,
      second_surname: null,
      given_names: null,
      nationality_code: null,
      origin_city_code: null,
      destination_city_code: null,
      hotel_sire_code: null,
      hotel_city_code: null,
      movement_type: null,
      movement_date: null
    }
  }

  /**
   * Batch maps multiple MotoPress bookings
   */
  static async mapBulkBookings(
    bookings: MotoPresBooking[],
    tenantId: string,
    supabase: SupabaseClient
  ): Promise<GuestReservation[]> {
    const mapped: GuestReservation[] = []

    for (const booking of bookings) {
      try {
        const reservation = await this.mapToGuestReservation(booking, tenantId, supabase)
        mapped.push(reservation)
      } catch (error) {
        console.error(`[MotoPresBookingsMapper] Failed to map booking ${booking.id}:`, error)
        // Continue with next booking instead of failing entire batch
      }
    }

    return mapped
  }

  /**
   * Extracts room name from _embedded data
   * When using _embed parameter, MotoPress includes accommodation data in the response
   */
  static extractRoomNameFromEmbedded(booking: any): string | null {
    try {
      // Check if _embedded data exists
      if (!booking._embedded) {
        return null
      }

      // Try to get room name from accommodations
      if (booking._embedded.accommodations && Array.isArray(booking._embedded.accommodations)) {
        const accommodation = booking._embedded.accommodations[0]
        if (accommodation?.title) {
          return accommodation.title
        }
      }

      // Fallback to accommodation_types
      if (booking._embedded.accommodation_types && Array.isArray(booking._embedded.accommodation_types)) {
        const accommodationType = booking._embedded.accommodation_types[0]
        if (accommodationType?.title) {
          return accommodationType.title
        }
      }

      return null
    } catch (error) {
      console.error('[MotoPresBookingsMapper] Error extracting room name from embedded data:', error)
      return null
    }
  }

  /**
   * Maps MotoPress booking WITH _embedded data to GuestReservation format
   * This version handles bookings that were fetched with _embed=1 parameter
   *
   * @param booking - MotoPress booking object with _embedded data from API
   * @param tenantId - UUID of the tenant
   * @param supabase - Supabase client for accommodation unit lookup
   */
  static async mapToGuestReservationWithEmbed(
    booking: any, // Using 'any' because _embedded structure varies
    tenantId: string,
    supabase: SupabaseClient
  ): Promise<GuestReservation> {
    // 1. Extract phone data from iCal description (Airbnb bookings)
    const phone = this.extractPhoneFromIcal(booking.ical_description || '')
    const reservationCode = this.extractReservationCode(booking.ical_description || '')

    // 2. Extract room name from _embedded data
    const roomName = this.extractRoomNameFromEmbedded(booking)

    // 3. Find accommodation_unit_id by matching MotoPress accommodation_type
    const motopressTypeId = booking.reserved_accommodations[0]?.accommodation_type
    let accommodationUnitId: string | null = null

    if (motopressTypeId) {
      // Try to find unit in accommodation_units_public by metadata
      const { data: units } = await supabase
        .from('accommodation_units_public')
        .select('unit_id, metadata')
        .eq('tenant_id', tenantId)

      // Find matching unit by motopress_type_id in metadata
      const matchingUnit = units?.find((unit: any) => {
        const metadata = unit.metadata || {}
        return metadata.motopress_type_id === motopressTypeId
      })

      accommodationUnitId = matchingUnit?.unit_id || null
    }

    // 4. Build guest name
    let guestName = 'Guest' // Default fallback

    if (booking.customer?.first_name && booking.customer?.last_name) {
      guestName = `${booking.customer.first_name} ${booking.customer.last_name}`.trim()
    } else if (booking.customer?.first_name) {
      guestName = booking.customer.first_name
    } else if (booking.customer?.last_name) {
      guestName = booking.customer.last_name
    } else if (booking.reserved_accommodations[0]?.guest_name) {
      guestName = booking.reserved_accommodations[0].guest_name
    }

    // 5. Build booking notes with room name from _embedded data
    let bookingNotes = booking.ical_description || null
    if (roomName && bookingNotes) {
      bookingNotes = `Room: ${roomName}\n\n${bookingNotes}`
    } else if (roomName) {
      bookingNotes = `Room: ${roomName}`
    }

    // 6. Map to GuestReservation schema
    return {
      tenant_id: tenantId,
      guest_name: guestName,
      phone_full: booking.customer?.phone || phone.full,
      phone_last_4: phone.last4,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      check_in_time: booking.check_in_time || '15:00:00',
      check_out_time: booking.check_out_time || '12:00:00',
      reservation_code: reservationCode,
      status: booking.status === 'confirmed' ? 'active' : 'inactive',
      accommodation_unit_id: accommodationUnitId,
      guest_email: booking.customer?.email || null,
      guest_country: booking.customer?.country || null,
      adults: booking.reserved_accommodations[0]?.adults || 1,
      children: booking.reserved_accommodations[0]?.children || 0,
      total_price: booking.total_price || null,
      currency: booking.currency || 'COP',
      booking_source: 'motopress',
      external_booking_id: booking.id?.toString() || '',
      booking_notes: bookingNotes,
      // SIRE compliance fields (null for MotoPress sync - can be filled by guest later)
      document_type: null,
      document_number: null,
      birth_date: null,
      first_surname: null,
      second_surname: null,
      given_names: null,
      nationality_code: null,
      origin_city_code: null,
      destination_city_code: null,
      hotel_sire_code: null,
      hotel_city_code: null,
      movement_type: null,
      movement_date: null
    }
  }

  /**
   * Batch maps multiple MotoPress bookings WITH _embedded data
   * Filters out calendar blocks ("Airbnb Not available")
   */
  static async mapBulkBookingsWithEmbed(
    bookings: any[],
    tenantId: string,
    supabase: SupabaseClient
  ): Promise<{ reservations: GuestReservation[]; blocksExcluded: number }> {
    const mapped: GuestReservation[] = []
    let blocksExcluded = 0

    for (const booking of bookings) {
      try {
        // Skip calendar blocks (no useful data)
        if (booking.ical_summary?.includes('Not available')) {
          blocksExcluded++
          continue
        }

        // Skip non-confirmed bookings
        if (booking.status !== 'confirmed') {
          continue
        }

        const reservation = await this.mapToGuestReservationWithEmbed(booking, tenantId, supabase)
        mapped.push(reservation)
      } catch (error) {
        console.error(`[MotoPresBookingsMapper] Failed to map booking ${booking.id}:`, error)
        // Continue with next booking instead of failing entire batch
      }
    }

    return {
      reservations: mapped,
      blocksExcluded
    }
  }
}
