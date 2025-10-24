// Reservation status types matching database constraint

export type ReservationStatus =
  | 'active'                  // Confirmed reservation
  | 'pending_payment'         // Awaiting payment completion
  | 'pending_admin'           // Requires admin review/action
  | 'pending'                 // General pending state (legacy)
  | 'inactive'                // Inactive/past reservation
  | 'cancelled'               // Cancelled or abandoned reservation

// Helper to determine if a reservation status is pending (requires action)
export function isPendingStatus(status: ReservationStatus): boolean {
  return status === 'pending_payment' || status === 'pending_admin'
}

// Helper to get status display information
export function getStatusDisplay(status: ReservationStatus): {
  label: string
  color: string
  bgColor: string
  borderColor: string
  canDelete: boolean
} {
  switch (status) {
    case 'active':
      return {
        label: 'Confirmada',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        canDelete: false
      }
    case 'pending_payment':
      return {
        label: 'Requiere Pago',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        canDelete: true
      }
    case 'pending_admin':
      return {
        label: 'Requiere Acción',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        canDelete: true
      }
    case 'pending':
      return {
        label: 'Pendiente',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-300',
        canDelete: true
      }
    case 'inactive':
      return {
        label: 'Inactiva',
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        canDelete: false
      }
    case 'cancelled':
      return {
        label: 'Cancelada',
        color: 'text-gray-400',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        canDelete: false
      }
    default:
      return {
        label: 'Desconocido',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-300',
        canDelete: false
      }
  }
}
