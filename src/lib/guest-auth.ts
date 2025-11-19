/**
 * Guest Authentication Library
 *
 * Provides authentication functions for guest users using check-in date + phone last 4 digits.
 * Generates JWT tokens for secure guest sessions.
 */

import { createServerClient } from '@/lib/supabase'
import { SignJWT, jwtVerify } from 'jose'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface GuestSession {
  reservation_id: string
  tenant_id: string
  guest_name: string
  check_in: string  // YYYY-MM-DD format (no timezone issues)
  check_out: string // YYYY-MM-DD format (no timezone issues)
  reservation_code: string
  // 🆕 NUEVO: Permissions and accommodation info (FASE 1.3)
  tenant_features?: {
    muva_access: boolean
  }
  accommodation_unit?: {
    id: string
    name: string
    unit_number?: string
    view_type?: string
  }
  // 🆕 NUEVO: ALL accommodations in reservation (for multi-room bookings)
  accommodation_units?: Array<{
    id: string
    name: string
    unit_number?: string
    view_type?: string
  }>
}

export interface GuestCredentials {
  tenant_id: string
  check_in_date: string  // YYYY-MM-DD
  phone_last_4: string   // 4 digits
}

interface GuestReservation {
  id: string
  tenant_id: string
  guest_name: string
  phone_last_4: string
  check_in_date: string
  check_out_date: string
  reservation_code: string
  status: string
  accommodation_unit_id?: string  // 🆕 NUEVO
}

// Removed ChatConversation interface - legacy table deprecated

// ============================================================================
// Configuration
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production'
const JWT_EXPIRY = process.env.GUEST_TOKEN_EXPIRY || '7d'  // 7 days default
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET)

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Authenticate a guest using check-in date and last 4 digits of phone
 *
 * @param credentials - Guest credentials (tenant_id, check_in_date, phone_last_4)
 * @returns GuestSession if valid, null if authentication fails
 */
export async function authenticateGuest(
  credentials: GuestCredentials
): Promise<GuestSession | null> {
  const { tenant_id, check_in_date, phone_last_4 } = credentials

  // Input validation
  if (!tenant_id || !check_in_date || !phone_last_4) {
    console.error('[guest-auth] Missing required credentials')
    return null
  }

  if (phone_last_4.length !== 4 || !/^\d{4}$/.test(phone_last_4)) {
    console.error('[guest-auth] Invalid phone_last_4 format (must be 4 digits)')
    return null
  }

  try {
    const supabase = createServerClient()

    // Query guest_reservations for matching reservation
    const { data: reservations, error } = await supabase
      .from('guest_reservations')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('check_in_date', check_in_date)
      .eq('phone_last_4', phone_last_4)
      .eq('status', 'active')

    if (error) {
      console.error('[guest-auth] Database error:', error)
      return null
    }

    if (!reservations || reservations.length === 0) {
      console.log('[guest-auth] No active reservation found')
      return null
    }

    // Handle multiple reservations (edge case)
    if (reservations.length > 1) {
      console.warn(`[guest-auth] Multiple reservations found for ${tenant_id}/${check_in_date}/${phone_last_4}`)
      // Use the most recent one
    }

    const reservation = reservations[0] as GuestReservation

    // 🆕 NUEVO: Load accommodation unit data if assigned (FASE 1.3)
    let accommodationUnit: { id: string; name: string; unit_number?: string; view_type?: string } | undefined

    if (reservation.accommodation_unit_id) {
      const { data: units, error: unitError } = await supabase
        .rpc('get_accommodation_unit_by_id', {
          p_unit_id: reservation.accommodation_unit_id,
          p_tenant_id: tenant_id
        })

      if (unitError) {
        console.error('[guest-auth] Failed to load accommodation unit:', unitError)
      }

      const unit = units && units.length > 0 ? units[0] : null
      if (unit) {
        accommodationUnit = {
          id: unit.id,
          name: unit.name,
          unit_number: unit.unit_number || undefined,
          view_type: unit.view_type || undefined,
        }
        console.log(`[guest-auth] Loaded accommodation: ${unit.name} ${unit.unit_number || ''}`)
      }
    }

    // 🆕 NUEVO: Load ALL accommodations from reservation_accommodations (multi-room support)
    const accommodationUnits: Array<{ id: string; name: string; unit_number?: string; view_type?: string }> = []

    const { data: reservationAccommodations, error: accError } = await supabase
      .from('reservation_accommodations')
      .select('accommodation_unit_id')
      .eq('reservation_id', reservation.id)

    if (accError) {
      console.error('[guest-auth] Failed to load reservation accommodations:', accError)
    } else if (reservationAccommodations && reservationAccommodations.length > 0) {
      // Get unique accommodation unit IDs
      const unitIds = [...new Set(
        reservationAccommodations
          .map((ra: any) => ra.accommodation_unit_id)
          .filter(Boolean)
      )]

      console.log(`[guest-auth] Loading ${unitIds.length} accommodation units for reservation`)

      // Load details for each accommodation
      for (const unitId of unitIds) {
        const { data: units, error: unitError } = await supabase
          .rpc('get_accommodation_unit_by_id', {
            p_unit_id: unitId,
            p_tenant_id: tenant_id
          })

        if (!unitError && units && units.length > 0) {
          const unit = units[0]
          accommodationUnits.push({
            id: unit.id,
            name: unit.name,
            unit_number: unit.unit_number || undefined,
            view_type: unit.view_type || undefined,
          })
        }
      }

      console.log(`[guest-auth] ✅ Loaded ${accommodationUnits.length} accommodations:`,
        accommodationUnits.map(u => `${u.name} ${u.unit_number || ''}`).join(', '))
    }

    // SIMPLE FALLBACK: If accommodation_unit_id was NULL but we have data in reservation_accommodations, use the first one
    if (!accommodationUnit && accommodationUnits.length > 0) {
      accommodationUnit = accommodationUnits[0]
      console.log(`[guest-auth] Using fallback accommodation for header: ${accommodationUnit.name}`)
    }

    // Build session object
    const session: GuestSession = {
      reservation_id: reservation.id,
      tenant_id: reservation.tenant_id,
      guest_name: reservation.guest_name,
      check_in: reservation.check_in_date,   // Keep as YYYY-MM-DD string
      check_out: reservation.check_out_date, // Keep as YYYY-MM-DD string
      reservation_code: reservation.reservation_code || '',
      // 🆕 NUEVO: Add permissions and accommodation (FASE 1.3)
      tenant_features: {
        muva_access: true,  // Default: ALL guests have MUVA access (tourism info)
      },
      accommodation_unit: accommodationUnit,  // First accommodation (backward compatibility)
      accommodation_units: accommodationUnits.length > 0 ? accommodationUnits : undefined,  // ALL accommodations
    }

    console.log(`[guest-auth] ✅ Authentication successful for ${reservation.guest_name}`)
    return session
  } catch (error) {
    console.error('[guest-auth] Authentication error:', error)
    return null
  }
}

// Removed getOrCreateConversation() - conversations now created on-demand via POST /api/guest/conversations

/**
 * Generate JWT token for guest session
 *
 * @param session - Guest session data
 * @returns JWT token string
 */
export async function generateGuestToken(session: GuestSession): Promise<string> {
  try {
    const token = await new SignJWT({
      reservation_id: session.reservation_id,
      tenant_id: session.tenant_id,
      guest_name: session.guest_name,
      check_in: session.check_in,                        // Already YYYY-MM-DD string
      check_out: session.check_out,                      // Already YYYY-MM-DD string
      reservation_code: session.reservation_code,        // Código de reserva
      accommodation_unit: session.accommodation_unit,    // Info de alojamiento (first room)
      accommodation_units: session.accommodation_units,  // ALL rooms in reservation
      tenant_features: session.tenant_features,          // Permisos (MUVA access)
      type: 'guest',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRY)
      .sign(SECRET_KEY)

    return token
  } catch (error) {
    console.error('[guest-auth] Token generation error:', error)
    throw new Error('Failed to generate authentication token')
  }
}

/**
 * Verify and decode JWT token
 *
 * @param token - JWT token string
 * @returns Decoded session data if valid, null if invalid/expired
 */
export async function verifyGuestToken(token: string): Promise<GuestSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)

    // Validate payload structure
    if (!payload.reservation_id || !payload.tenant_id) {
      console.error('[guest-auth] Invalid token payload structure')
      return null
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      console.log('[guest-auth] Token expired')
      return null
    }

    // 🆕 OPTIMIZACIÓN: Try to read session data from JWT first (new tokens)
    // This avoids DB queries on every request, improving performance
    const hasFullPayload = payload.check_in && payload.check_out && payload.accommodation_unit !== undefined

    if (hasFullPayload) {
      // New JWT format (includes all session data)
      const session: GuestSession = {
        reservation_id: payload.reservation_id as string,
        tenant_id: payload.tenant_id as string,
        guest_name: payload.guest_name as string,
        check_in: payload.check_in as string,    // Keep as YYYY-MM-DD string
        check_out: payload.check_out as string,  // Keep as YYYY-MM-DD string
        reservation_code: (payload.reservation_code as string) || '',
        tenant_features: (payload.tenant_features as any) || { muva_access: true },
        accommodation_unit: payload.accommodation_unit as any,
        accommodation_units: payload.accommodation_units as any,  // ALL rooms
      }

      console.log(`[guest-auth] ✅ Token verified (from JWT payload) for ${session.guest_name}`)
      return session
    }

    // 🔄 FALLBACK: Old JWT format (needs DB query to reconstruct session)
    console.log('[guest-auth] ⚠️ Old JWT format detected, fetching data from DB...')

    // Fetch fresh reservation data from database
    const supabase = createServerClient()
    const { data: reservation, error } = await supabase
      .from('guest_reservations')
      .select('*')
      .eq('id', payload.reservation_id as string)
      .single()

    if (error || !reservation) {
      console.error('[guest-auth] Failed to fetch reservation data:', error)
      return null
    }

    // Load accommodation unit data if assigned
    let accommodationUnit: { id: string; name: string; unit_number?: string; view_type?: string } | undefined

    if (reservation.accommodation_unit_id) {
      const { data: units, error: unitError } = await supabase
        .rpc('get_accommodation_unit_by_id', {
          p_unit_id: reservation.accommodation_unit_id,
          p_tenant_id: reservation.tenant_id
        })

      if (unitError) {
        console.error('[guest-auth] Failed to load accommodation unit:', unitError)
      }

      const unit = units && units.length > 0 ? units[0] : null
      if (unit) {
        accommodationUnit = {
          id: unit.id,
          name: unit.name,
          unit_number: unit.unit_number || undefined,
          view_type: unit.view_type || undefined,
        }
      }
    }

    // Load ALL accommodations from reservation_accommodations (multi-room support)
    const accommodationUnits: Array<{ id: string; name: string; unit_number?: string; view_type?: string }> = []

    const { data: reservationAccommodations, error: accError } = await supabase
      .from('reservation_accommodations')
      .select('accommodation_unit_id')
      .eq('reservation_id', reservation.id)

    if (accError) {
      console.error('[guest-auth] Failed to load reservation accommodations:', accError)
    } else if (reservationAccommodations && reservationAccommodations.length > 0) {
      const unitIds = [...new Set(
        reservationAccommodations
          .map((ra: any) => ra.accommodation_unit_id)
          .filter(Boolean)
      )]

      for (const unitId of unitIds) {
        const { data: units, error: unitError } = await supabase
          .rpc('get_accommodation_unit_by_id', {
            p_unit_id: unitId,
            p_tenant_id: reservation.tenant_id
          })

        if (!unitError && units && units.length > 0) {
          const unit = units[0]
          accommodationUnits.push({
            id: unit.id,
            name: unit.name,
            unit_number: unit.unit_number || undefined,
            view_type: unit.view_type || undefined,
          })
        }
      }

      console.log(`[guest-auth] ✅ Loaded ${accommodationUnits.length} accommodations (fallback):`,
        accommodationUnits.map(u => `${u.name} ${u.unit_number || ''}`).join(', '))
    }

    // SIMPLE FALLBACK: If accommodation_unit_id was NULL but we have data in reservation_accommodations, use the first one
    if (!accommodationUnit && accommodationUnits.length > 0) {
      accommodationUnit = accommodationUnits[0]
      console.log(`[guest-auth] Using fallback accommodation for header: ${accommodationUnit.name}`)
    }

    // Reconstruct session with real data from database
    const session: GuestSession = {
      reservation_id: payload.reservation_id as string,
      tenant_id: payload.tenant_id as string,
      guest_name: payload.guest_name as string,
      check_in: reservation.check_in_date,   // Keep as YYYY-MM-DD string
      check_out: reservation.check_out_date, // Keep as YYYY-MM-DD string
      reservation_code: reservation.reservation_code || '',
      tenant_features: {
        muva_access: true,  // Default: ALL guests have MUVA access
      },
      accommodation_unit: accommodationUnit,
      accommodation_units: accommodationUnits.length > 0 ? accommodationUnits : undefined,
    }

    console.log(`[guest-auth] ✅ Token verified (from DB) for ${session.guest_name} (${reservation.check_in_date} - ${reservation.check_out_date})`)
    return session
  } catch (error) {
    console.error('[guest-auth] Token verification error:', error)
    return null
  }
}

/**
 * Check if token is expired
 *
 * @param session - Guest session (with dates as YYYY-MM-DD strings)
 * @returns true if session is expired (past check-out date)
 */
export function isTokenExpired(session: GuestSession): boolean {
  const now = new Date()

  // Parse YYYY-MM-DD string to Date for comparison
  const [year, month, day] = session.check_out.split('-').map(Number)
  const checkOutDate = new Date(year, month - 1, day)

  // Consider expired 7 days after check-out
  const expiryDate = new Date(checkOutDate)
  expiryDate.setDate(expiryDate.getDate() + 7)

  return now > expiryDate
}

/**
 * Extract token from Authorization header
 *
 * @param authHeader - Authorization header value (e.g., "Bearer <token>")
 * @returns Token string or null
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

// ============================================================================
// Export helper utilities
// ============================================================================

export const GuestAuthErrors = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  NO_RESERVATION: 'No active reservation found',
  INVALID_TOKEN: 'Invalid or expired token',
  EXPIRED_SESSION: 'Session has expired',
  MISSING_HEADER: 'Authorization header missing',
} as const
