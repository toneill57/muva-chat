/**
 * Test Helper: Reservation Factory
 *
 * Creates test reservation objects with all required fields populated.
 * Prevents hardcoding test data and encountering NOT NULL constraint errors.
 *
 * Usage:
 * ```typescript
 * import { createTestReservation } from '@/lib/test-helpers/reservation-factory'
 *
 * // Minimal reservation with defaults
 * const reservation = createTestReservation()
 *
 * // Override specific fields
 * const customReservation = createTestReservation({
 *   guest_name: 'John Doe',
 *   check_in_date: '2025-12-01',
 *   phone_last_4: '5678'
 * })
 * ```
 */

export interface TestReservation {
  tenant_id: string
  guest_name: string
  phone_full: string
  phone_last_4: string
  check_in_date: string  // YYYY-MM-DD
  check_out_date: string // YYYY-MM-DD
  reservation_code?: string
  status: 'active' | 'cancelled' | 'pending'
  accommodation_unit_id?: string
  guest_email?: string
  guest_country?: string
  adults: number
  children: number
  total_price?: number
  currency: string
  check_in_time: string  // HH:MM:SS
  check_out_time: string // HH:MM:SS
  booking_source: 'manual' | 'motopress' | 'airbnb' | 'booking.com'
  booking_notes?: string
  external_booking_id?: string
}

/**
 * Create a test reservation with sensible defaults
 */
export function createTestReservation(
  overrides?: Partial<TestReservation>
): TestReservation {
  // Default: tomorrow check-in, 3-night stay
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const checkOut = new Date(tomorrow)
  checkOut.setDate(checkOut.getDate() + 3)

  const defaults: TestReservation = {
    tenant_id: 'test-tenant-id',
    guest_name: 'Test Guest',
    phone_full: 'N/A', // Default for no phone
    phone_last_4: '0000', // Default for guest auth
    check_in_date: tomorrow.toISOString().split('T')[0],
    check_out_date: checkOut.toISOString().split('T')[0],
    reservation_code: `TEST-${Math.floor(Math.random() * 10000)}`,
    status: 'active',
    adults: 2,
    children: 0,
    currency: 'COP',
    check_in_time: '15:00:00',
    check_out_time: '12:00:00',
    booking_source: 'manual',
  }

  return {
    ...defaults,
    ...overrides,
  }
}

/**
 * Create a MotoPress-synced test reservation
 */
export function createMotoPressReservation(
  overrides?: Partial<TestReservation>
): TestReservation {
  return createTestReservation({
    booking_source: 'motopress',
    external_booking_id: `MP-${Math.floor(Math.random() * 100000)}`,
    phone_full: '+57 300 123 4567',
    phone_last_4: '4567',
    ...overrides,
  })
}

/**
 * Create a cancelled reservation for testing cancellation flows
 */
export function createCancelledReservation(
  overrides?: Partial<TestReservation>
): TestReservation {
  return createTestReservation({
    status: 'cancelled',
    booking_notes: 'Cancelled by guest',
    ...overrides,
  })
}

/**
 * Create a batch of test reservations for load testing
 */
export function createTestReservationBatch(
  count: number,
  overrides?: Partial<TestReservation>
): TestReservation[] {
  return Array.from({ length: count }, (_, index) => {
    // Stagger check-in dates
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + index)
    const checkOut = new Date(tomorrow)
    checkOut.setDate(checkOut.getDate() + 2)

    return createTestReservation({
      guest_name: `Test Guest ${index + 1}`,
      check_in_date: tomorrow.toISOString().split('T')[0],
      check_out_date: checkOut.toISOString().split('T')[0],
      phone_last_4: String(1000 + index).slice(-4),
      ...overrides,
    })
  })
}
