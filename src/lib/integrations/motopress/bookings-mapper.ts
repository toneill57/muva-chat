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
   * Maps MotoPress booking status to internal reservation status
   *
   * @param motopressStatus - Status from MotoPress API
   * @returns Internal status (active, pending_payment, requires_admin_action, cancelled)
   */
  static mapStatus(motopressStatus: string): string {
    switch (motopressStatus.toLowerCase()) {
      case 'confirmed':
        return 'active'
      case 'pending-payment':
        return 'pending_payment'
      case 'pending':
        return 'pending_admin'
      case 'cancelled':
      case 'abandoned':
        return 'cancelled'
      default:
        // Default to pending_admin for any unknown status
        console.warn(`[MotoPresBookingsMapper] Unknown status: ${motopressStatus}, defaulting to 'pending_admin'`)
        return 'pending_admin'
    }
  }

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
    // 1. Detect if this is an Airbnb booking
    const isAirbnb = (booking.ical_description || '').includes('airbnb.com')

    // 2. Extract phone data from iCal description (Airbnb bookings)
    const phone = this.extractPhoneFromIcal(booking.ical_description || '')
    const reservationCode = this.extractReservationCode(booking.ical_description || '')

    // 3. Parse phone_last_4 from customer.phone (MotoPress direct) or iCal (Airbnb)
    let phoneLast4 = '0000'
    if (isAirbnb) {
      // Airbnb: extract from iCal
      phoneLast4 = phone.last4
    } else if (booking.customer.phone) {
      // MotoPress direct: extract last 4 digits from customer.phone
      const phoneDigits = booking.customer.phone.replace(/[^0-9]/g, '')
      phoneLast4 = phoneDigits.slice(-4).padStart(4, '0')
    }

    // 4. Find accommodation_unit_id by matching MotoPress accommodation TYPE ID
    const motopressTypeId = booking.reserved_accommodations[0]?.accommodation_type
    let accommodationUnitId: string | null = null

    console.log(`[mapper] Booking ${booking.id}: Looking for accommodation TYPE ID=${motopressTypeId}`)

    if (motopressTypeId) {
      // Query hotels.accommodation_units using RPC (tenant_id must be UUID, not string)
      const { data: units, error } = await supabase.rpc('get_accommodation_unit_by_motopress_id', {
        p_tenant_id: tenantId, // Already UUID string format
        p_motopress_type_id: motopressTypeId  // Fixed: use correct parameter name
      })

      if (error) {
        console.log(`[mapper] ❌ RPC error for accommodation ${motopressTypeId}:`, error)
      } else if (units && units.length > 0) {
        const unit = units[0]
        accommodationUnitId = unit.id
        console.log(`[mapper] ✅ MATCH: Unit "${unit.name}" (motopress_type_id=${unit.motopress_type_id}) matches booking accommodation ${motopressTypeId}`)
      } else {
        console.log(`[mapper] ❌ NO MATCH: No unit found for motopress_type_id=${motopressTypeId}`)
      }
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

    // 5. Map to GuestReservation schema
    return {
      tenant_id: tenantId,
      guest_name: guestName,
      phone_full: booking.customer.phone || phone.full,
      phone_last_4: phoneLast4,  // Use parsed phone_last_4 (Airbnb or MotoPress)
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
      booking_source: isAirbnb ? 'mphb-airbnb' : 'motopress',  // Detect Airbnb via MotoPress vs direct MotoPress
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
    // 1. Detect if this is an Airbnb booking
    const isAirbnb = (booking.ical_description || '').includes('airbnb.com')

    // 2. Extract phone data from iCal description (Airbnb bookings)
    const phone = this.extractPhoneFromIcal(booking.ical_description || '')
    const reservationCode = this.extractReservationCode(booking.ical_description || '')

    // 3. Parse phone_last_4 from customer.phone (MotoPress direct) or iCal (Airbnb)
    let phoneLast4 = '0000'
    if (isAirbnb) {
      // Airbnb: extract from iCal
      phoneLast4 = phone.last4
    } else if (booking.customer?.phone) {
      // MotoPress direct: extract last 4 digits from customer.phone
      const phoneDigits = booking.customer.phone.replace(/[^0-9]/g, '')
      phoneLast4 = phoneDigits.slice(-4).padStart(4, '0')
    }

    // 4. Extract room name from _embedded data
    const roomName = this.extractRoomNameFromEmbedded(booking)

    // 5. Find accommodation_unit_id by matching MotoPress accommodation TYPE ID
    const motopressTypeId = booking.reserved_accommodations[0]?.accommodation_type
    let accommodationUnitId: string | null = null

    console.log(`[mapper] Booking ${booking.id}: Looking for accommodation TYPE ID=${motopressTypeId}`)

    if (motopressTypeId) {
      // Query hotels.accommodation_units using RPC (tenant_id must be UUID, not string)
      const { data: units, error } = await supabase.rpc('get_accommodation_unit_by_motopress_id', {
        p_tenant_id: tenantId, // Already UUID string format
        p_motopress_type_id: motopressTypeId  // Fixed: use correct parameter name
      })

      if (error) {
        console.log(`[mapper] ❌ RPC error for accommodation ${motopressTypeId}:`, error)
      } else if (units && units.length > 0) {
        const unit = units[0]
        accommodationUnitId = unit.id
        console.log(`[mapper] ✅ MATCH: Unit "${unit.name}" (motopress_type_id=${unit.motopress_type_id}) matches booking accommodation ${motopressTypeId}`)
      } else {
        console.log(`[mapper] ❌ NO MATCH: No unit found for motopress_type_id=${motopressTypeId}`)
      }
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
      phone_last_4: phoneLast4,  // Use parsed phone_last_4 (Airbnb or MotoPress)
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      check_in_time: booking.check_in_time || '15:00:00',
      check_out_time: booking.check_out_time || '12:00:00',
      reservation_code: reservationCode,
      status: this.mapStatus(booking.status),  // Map MotoPress status to internal status
      accommodation_unit_id: accommodationUnitId,
      guest_email: booking.customer?.email || null,
      guest_country: booking.customer?.country || null,
      adults: booking.reserved_accommodations[0]?.adults || 1,
      children: booking.reserved_accommodations[0]?.children || 0,
      total_price: booking.total_price || null,
      currency: booking.currency || 'COP',
      booking_source: isAirbnb ? 'mphb-airbnb' : 'motopress',  // Detect Airbnb via MotoPress vs direct MotoPress
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
   * Separates direct reservations from ICS imports (Airbnb)
   */
  static async mapBulkBookingsWithEmbed(
    bookings: any[],
    tenantId: string,
    supabase: SupabaseClient
  ): Promise<{
    reservations: GuestReservation[];
    icsImports: any[];
    pastExcluded: number;
    statusExcluded: number;
    icsExcluded: number;
  }> {
    const mapped: GuestReservation[] = []
    const icsImports: any[] = []
    let pastExcluded = 0
    let statusExcluded = 0
    let icsExcluded = 0

    // Calculate date range: 2 months ago to 2 years in future
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today

    const twoMonthsAgo = new Date(today)
    twoMonthsAgo.setMonth(today.getMonth() - 2)

    const twoYearsFromNow = new Date()
    twoYearsFromNow.setFullYear(today.getFullYear() + 2)

    for (const booking of bookings) {
      try {
        // Log every booking we process
        console.log(`[mapper] 🔍 Processing booking ${booking.id}: status=${booking.status}, imported=${booking.imported}, check_in=${booking.check_in_date}`)

        // Skip only cancelled and abandoned bookings (import all other statuses INCLUDING ICS)
        if (booking.status === 'cancelled' || booking.status === 'abandoned') {
          statusExcluded++
          console.log(`[mapper] ⏩ Skip booking ${booking.id}: status=${booking.status}`)
          continue
        }

        // Skip reservations older than 2 months and reservations beyond 2 years (APPLIES TO BOTH direct + ICS)
        const checkInDate = new Date(booking.check_in_date)
        console.log(`[mapper] 📅 Date check for booking ${booking.id}: checkInDate=${checkInDate.toISOString()}, twoMonthsAgo=${twoMonthsAgo.toISOString()}, twoYears=${twoYearsFromNow.toISOString()}`)

        if (checkInDate < twoMonthsAgo || checkInDate > twoYearsFromNow) {
          pastExcluded++

          // Track ICS imports separately for stats
          if (booking.imported === true) {
            icsExcluded++
          }

          console.log(`[mapper] ⏩ Skip booking ${booking.id}: check_in=${booking.check_in_date} (${checkInDate < twoMonthsAgo ? 'older than 2 months' : 'too far future'})`)
          continue
        }

        // Process ALL future reservations (direct MotoPress + ICS imports from Airbnb)
        const bookingType = booking.imported === true ? 'ICS import (Airbnb)' : 'direct MotoPress'
        console.log(`[mapper] ✅ Mapping ${bookingType} booking ${booking.id}: status=${booking.status}, check_in=${booking.check_in_date}`)
        const reservation = await this.mapToGuestReservationWithEmbed(booking, tenantId, supabase)
        mapped.push(reservation)
        console.log(`[mapper] ✅ Mapped successfully: ${reservation.guest_name}`)
      } catch (error) {
        console.error(`[MotoPresBookingsMapper] Failed to map booking ${booking.id}:`, error)
        // Continue with next booking instead of failing entire batch
      }
    }

    return {
      reservations: mapped,
      icsImports: [], // Now processed together with direct bookings
      pastExcluded,
      statusExcluded,
      icsExcluded
    }
  }

  /**
   * Saves multiple accommodations for a reservation to the junction table
   * Supports multi-room bookings (e.g., family reserving 3 rooms)
   *
   * @param reservationId - UUID of the saved guest_reservation
   * @param booking - MotoPress booking object with reserved_accommodations array
   * @param tenantId - UUID of the tenant
   * @param supabase - Supabase client for database operations
   * @returns Number of accommodations saved
   */
  static async saveReservationAccommodations(
    reservationId: string,
    booking: MotoPresBooking | any,
    tenantId: string,
    supabase: SupabaseClient
  ): Promise<number> {
    if (!booking.reserved_accommodations || booking.reserved_accommodations.length === 0) {
      console.warn(`[mapper] ⚠️ Booking ${booking.id} has no reserved_accommodations`)
      return 0
    }

    console.log(`[mapper] 💾 Saving ${booking.reserved_accommodations.length} accommodation(s) for reservation ${reservationId}`)

    const accommodationsToInsert: any[] = []

    // Iterate through ALL reserved accommodations
    for (const reserved of booking.reserved_accommodations) {
      const motopressTypeId = reserved.accommodation_type
      const motopressInstanceId = reserved.accommodation
      const roomRate = reserved.rate

      console.log(`[mapper]   - Processing accommodation: type_id=${motopressTypeId}, instance_id=${motopressInstanceId}, rate=${roomRate}`)

      // Find matching accommodation_unit_id
      let accommodationUnitId: string | null = null

      if (motopressTypeId) {
        const { data: units, error } = await supabase.rpc('get_accommodation_unit_by_motopress_id', {
          p_tenant_id: tenantId,
          p_motopress_type_id: motopressTypeId  // Fixed: use correct parameter name
        })

        if (error) {
          console.log(`[mapper]     ❌ RPC error for accommodation ${motopressTypeId}:`, error)
        } else if (units && units.length > 0) {
          const unit = units[0]
          accommodationUnitId = unit.id
          console.log(`[mapper]     ✅ MATCH: Unit "${unit.name}" (id=${unit.id})`)
        } else {
          // NO MATCH: Leave NULL - trigger will auto-link based on motopress_type_id
          console.log(`[mapper]     ⚠️ NO MATCH: No unit found for motopress_type_id=${motopressTypeId} - will be auto-linked by trigger`)
          accommodationUnitId = null
        }
      }

      // Add to batch insert (accommodation_unit_id should always have a value now due to auto-creation)
      accommodationsToInsert.push({
        reservation_id: reservationId,
        accommodation_unit_id: accommodationUnitId,
        motopress_accommodation_id: motopressInstanceId,
        motopress_type_id: motopressTypeId,
        room_rate: roomRate
      })
    }

    // Batch insert all accommodations
    if (accommodationsToInsert.length > 0) {
      const { error } = await supabase
        .from('reservation_accommodations')
        .insert(accommodationsToInsert)

      if (error) {
        console.error(`[mapper] ❌ Failed to insert reservation_accommodations:`, error)
        throw error
      }

      console.log(`[mapper] ✅ Saved ${accommodationsToInsert.length} accommodation(s) to reservation_accommodations`)
    }

    return accommodationsToInsert.length
  }
}
