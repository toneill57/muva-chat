'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  User,
  Phone,
  Home,
  RefreshCw,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Mail,
  Globe,
  Users,
  DollarSign,
  StickyNote,
  BadgeCheck,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface ReservationItem {
  id: string
  tenant_id: string
  guest_name: string
  phone_full: string
  phone_last_4: string
  check_in_date: string
  check_out_date: string
  reservation_code: string | null
  status: string
  accommodation_unit: {
    id: string
    name: string
    unit_number: string | null
    unit_type: string | null
  } | null

  // 🆕 NEW: Complete booking details
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

  created_at: string
  updated_at: string
}

interface ReservationsData {
  total: number
  reservations: ReservationItem[]
  tenant_info: {
    tenant_id: string
    hotel_name: string
    slug: string
  }
}

// ============================================================================
// Component
// ============================================================================

export default function ReservationsList() {
  const router = useRouter()

  const [reservations, setReservations] = useState<ReservationItem[]>([])
  const [tenantInfo, setTenantInfo] = useState<{ hotel_name: string; slug: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncingMotoPress, setIsSyncingMotoPress] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    fetchReservations()
  }, [])

  const fetchReservations = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('staff_token')
      if (!token) {
        router.push('/staff/login')
        return
      }

      const response = await fetch('/api/reservations/list?future=true&status=active', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Clear invalid token
          localStorage.removeItem('staff_token')
          localStorage.removeItem('staff_info')

          // Extract tenant slug from hostname (e.g., "tucasamar.localhost" -> "tucasamar")
          const hostname = window.location.hostname
          const tenantSlug = hostname.split('.')[0]

          // Redirect to tenant-specific login page
          router.push(`/${tenantSlug}/staff/login`)
          return
        }

        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data: { success: boolean; data: ReservationsData } = await response.json()

      if (data.success) {
        setReservations(data.data.reservations)
        setTenantInfo({
          hotel_name: data.data.tenant_info.hotel_name,
          slug: data.data.tenant_info.slug,
        })
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('[ReservationsList] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load reservations')
    } finally {
      setIsLoading(false)
    }
  }

  const syncMotoPress = async () => {
    setIsSyncingMotoPress(true)
    setError(null)

    try {
      const token = localStorage.getItem('staff_token')
      if (!token) {
        router.push('/staff/login')
        return
      }

      // Get tenant_id from tenantInfo
      const staffInfo = localStorage.getItem('staff_info')
      if (!staffInfo) {
        throw new Error('No staff info found')
      }

      const parsedStaffInfo = JSON.parse(staffInfo)
      const tenantId = parsedStaffInfo.tenant_id

      if (!tenantId) {
        throw new Error('No tenant ID found')
      }

      console.log('[syncMotoPress] Syncing reservations for tenant:', tenantId)

      const response = await fetch('/api/integrations/motopress/sync-reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tenant_id: tenantId })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log('[syncMotoPress] ✅ Sync successful:', data.data)
        alert(`✅ Sincronización exitosa!\n\nNuevas: ${data.data.created}\nActualizadas: ${data.data.updated}\nTotal: ${data.data.total}`)

        // Refresh reservations list
        await fetchReservations()
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      console.error('[syncMotoPress] Error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync with MotoPress'
      setError(errorMessage)
      alert(`❌ Error al sincronizar: ${errorMessage}`)
    } finally {
      setIsSyncingMotoPress(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('staff_token')
    localStorage.removeItem('staff_info')
    router.push('/staff/login')
  }

  const handleBackToDashboard = () => {
    router.push('/staff')
  }

  const formatDate = (dateStr: string): string => {
    // Parse YYYY-MM-DD string to local date (avoid timezone issues)
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)

    // Format as DD-MM-AAAA
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const aaaa = date.getFullYear()

    return `${dd}-${mm}-${aaaa}`
  }

  const getDaysUntil = (dateStr: string): number => {
    // Parse YYYY-MM-DD string to local date (avoid timezone issues)
    const [year, month, day] = dateStr.split('-').map(Number)
    const checkIn = new Date(year, month - 1, day)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    checkIn.setHours(0, 0, 0, 0)

    const diffTime = checkIn.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getUrgencyColor = (daysUntil: number): string => {
    if (daysUntil <= 0) return 'bg-red-100 text-red-800 border-red-200'
    if (daysUntil <= 3) return 'bg-orange-100 text-orange-800 border-orange-200'
    if (daysUntil <= 7) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getUrgencyLabel = (daysUntil: number): string => {
    if (daysUntil === 0) return 'Hoy'
    if (daysUntil === 1) return 'Mañana'
    if (daysUntil < 0) return 'Atrasado'
    return `En ${daysUntil} días`
  }

  const formatPrice = (price: number | null, currency: string): string => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getBookingSourceBadge = (source: string): { label: string; color: string } => {
    const sourceMap: { [key: string]: { label: string; color: string } } = {
      'motopress': { label: 'MotoPress', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      'airbnb': { label: 'Airbnb', color: 'bg-pink-100 text-pink-800 border-pink-200' },
      'manual': { label: 'Manual', color: 'bg-gray-100 text-gray-800 border-gray-200' },
    }
    return sourceMap[source] || { label: source, color: 'bg-gray-100 text-gray-800 border-gray-200' }
  }

  // Group reservations by external_booking_id (for multi-unit bookings)
  const groupReservations = (reservations: ReservationItem[]): ReservationItem[][] => {
    const groups: { [key: string]: ReservationItem[] } = {}

    reservations.forEach((reservation) => {
      const key = reservation.external_booking_id || reservation.id
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(reservation)
    })

    return Object.values(groups)
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToDashboard}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Próximas Reservas</h1>
                {tenantInfo && (
                  <p className="text-sm text-slate-600 mt-1">{tenantInfo.hotel_name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={fetchReservations}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh reservations"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">Actualizar</span>
              </button>

              <button
                onClick={syncMotoPress}
                disabled={isSyncingMotoPress}
                className="flex items-center space-x-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Sync with MotoPress"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingMotoPress ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">Actualizar (nuevo)</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600">Cargando reservas...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-800 font-medium mb-2">Error al cargar reservas</p>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button
                onClick={fetchReservations}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && reservations.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No hay reservas futuras
              </h3>
              <p className="text-slate-600 mb-4">
                No se encontraron reservas confirmadas para las próximas fechas.
              </p>
              <p className="text-sm text-slate-500">
                Última actualización: {lastUpdated.toLocaleTimeString('es-ES')}
              </p>
            </div>
          )}

          {/* Reservations List */}
          {!isLoading && !error && reservations.length > 0 && (
            <div className="space-y-4">
              {/* Stats Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total de reservas futuras</p>
                    <p className="text-3xl font-bold text-blue-900">{reservations.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600 mb-1">Última actualización</p>
                    <p className="text-sm font-medium text-slate-900">
                      {lastUpdated.toLocaleTimeString('es-ES')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reservations Cards - Grouped by external_booking_id */}
              {groupReservations(reservations).map((group) => {
                // Use first reservation for common data
                const firstReservation = group[0]
                const daysUntil = getDaysUntil(firstReservation.check_in_date)
                const urgencyColor = getUrgencyColor(daysUntil)
                const urgencyLabel = getUrgencyLabel(daysUntil)
                const sourceBadge = getBookingSourceBadge(firstReservation.booking_source)

                // Multi-unit booking indicators
                const isMultiUnit = group.length > 1
                const totalPrice = group.reduce((sum, r) => sum + (r.total_price || 0), 0)
                const totalAdults = group.reduce((sum, r) => sum + (r.adults || 0), 0)
                const totalChildren = group.reduce((sum, r) => sum + (r.children || 0), 0)

                return (
                  <div
                    key={firstReservation.external_booking_id || firstReservation.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                  >
                    {/* Header: Guest Name + Badges */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <User className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-slate-900">
                            {firstReservation.guest_name}
                          </h3>
                          {isMultiUnit && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full border border-purple-200">
                              {group.length} unidades
                            </span>
                          )}
                        </div>

                        {firstReservation.reservation_code && (
                          <p className="text-sm text-slate-600 ml-8">
                            Código: <span className="font-mono font-medium">{firstReservation.reservation_code}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end space-y-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${urgencyColor}`}>
                          {urgencyLabel}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${sourceBadge.color}`}>
                          {sourceBadge.label}
                        </div>
                      </div>
                    </div>

                    {/* Main Info Grid - 3 columns on larger screens */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      {/* Check-in/out dates */}
                      <div className="flex items-start space-x-3">
                        <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {formatDate(firstReservation.check_in_date)} - {formatDate(firstReservation.check_out_date)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {Math.ceil(
                              (new Date(firstReservation.check_out_date).getTime() -
                                new Date(firstReservation.check_in_date).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )}{' '}
                            noches • {firstReservation.check_in_time} - {firstReservation.check_out_time}
                          </p>
                        </div>
                      </div>

                      {/* Email */}
                      {firstReservation.guest_email && (
                        <div className="flex items-start space-x-3">
                          <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {firstReservation.guest_email}
                            </p>
                            <p className="text-xs text-slate-500">Email</p>
                          </div>
                        </div>
                      )}

                      {/* Phone */}
                      <div className="flex items-start space-x-3">
                        <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {firstReservation.phone_full || `***-${firstReservation.phone_last_4}`}
                          </p>
                          <p className="text-xs text-slate-500">Teléfono</p>
                        </div>
                      </div>

                      {/* Country */}
                      {firstReservation.guest_country && (
                        <div className="flex items-start space-x-3">
                          <Globe className="w-5 h-5 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {firstReservation.guest_country}
                            </p>
                            <p className="text-xs text-slate-500">País</p>
                          </div>
                        </div>
                      )}

                      {/* Guest Capacity - Aggregated for multi-unit */}
                      <div className="flex items-start space-x-3">
                        <Users className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {totalAdults} adulto{totalAdults !== 1 ? 's' : ''}
                            {totalChildren > 0 && `, ${totalChildren} niño${totalChildren !== 1 ? 's' : ''}`}
                          </p>
                          <p className="text-xs text-slate-500">Huéspedes totales</p>
                        </div>
                      </div>

                      {/* Price - Aggregated for multi-unit */}
                      {totalPrice > 0 && (
                        <div className="flex items-start space-x-3">
                          <DollarSign className="w-5 h-5 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {formatPrice(totalPrice, firstReservation.currency)}
                            </p>
                            <p className="text-xs text-slate-500">
                              Precio total{isMultiUnit && ` (${group.length} unidades)`}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div className="flex items-start space-x-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-green-700 capitalize">
                            {firstReservation.status === 'active' ? 'Confirmada' : firstReservation.status}
                          </p>
                          <p className="text-xs text-slate-500">Estado</p>
                        </div>
                      </div>
                    </div>

                    {/* Multi-Unit Details */}
                    {isMultiUnit && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-start space-x-3 mb-3">
                          <Home className="w-5 h-5 text-purple-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              Unidades reservadas ({group.length}):
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {group.map((unit, idx) => (
                                <div
                                  key={unit.id}
                                  className="bg-slate-50 rounded-lg p-3 border border-slate-200"
                                >
                                  <p className="text-sm font-medium text-slate-900">
                                    {unit.accommodation_unit?.name || `Unidad ${idx + 1}`}
                                  </p>
                                  <p className="text-xs text-slate-600">
                                    {unit.adults} adulto{unit.adults !== 1 ? 's' : ''}
                                    {unit.children > 0 && `, ${unit.children} niño${unit.children !== 1 ? 's' : ''}`}
                                  </p>
                                  {unit.accommodation_unit?.unit_number && (
                                    <p className="text-xs text-slate-500">
                                      #{unit.accommodation_unit.unit_number}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Booking Notes (if present) */}
                    {firstReservation.booking_notes && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-start space-x-3">
                          <StickyNote className="w-5 h-5 text-amber-500 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-slate-600 mb-1">Notas especiales:</p>
                            <p className="text-sm text-slate-700">{firstReservation.booking_notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
