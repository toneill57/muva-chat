'use client'

import ReservationsList from '@/components/Staff/ReservationsList'

export default function AccommodationsReservationsPage() {
  // Simply render the ReservationsList component
  // This is the same component used in /staff/reservations
  // It already handles authentication, fetching, filtering, and display
  return <ReservationsList />
}
