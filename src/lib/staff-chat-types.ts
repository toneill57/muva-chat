/**
 * Type definitions for Staff Chat - Reservations & Tenant Context
 *
 * Extended types for reservation queries and business context
 */

// ============================================================================
// Reservation Query Types
// ============================================================================

export interface ReservationSearchParams {
  checkInDate?: string // YYYY-MM-DD format
  checkOutDate?: string // YYYY-MM-DD format
  guestName?: string
  phone?: string
  email?: string
  reservationCode?: string
  accommodationName?: string
}

export interface ReservationQueryDetection {
  isReservationQuery: boolean
  queryType: 'sql' | 'vector' | 'hybrid' | 'none'
  params: ReservationSearchParams
  confidence: number
}

// ============================================================================
// Tenant Context Types
// ============================================================================

export interface TenantContextData {
  tenant_id: string
  business_name: string
  legal_name?: string
  address?: string
  phone?: string
  email?: string
  seo_description?: string
  business_type?: string
  social_media?: {
    facebook?: string
    instagram?: string
    whatsapp?: string
  }
  features?: {
    muva_access?: boolean
    sire_enabled?: boolean
    [key: string]: any
  }
}

// ============================================================================
// Reservation Result Types
// ============================================================================

export interface ReservationMatch {
  id: string
  guest_name: string
  phone_full: string
  check_in_date: string
  check_out_date: string
  reservation_code: string | null
  status: string
  accommodation_units: Array<{
    name: string
    unit_number: string | null
  }>
  adults: number
  children: number
  total_price: number | null
  guest_email: string | null
}
