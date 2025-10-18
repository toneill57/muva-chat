'use client'

import { useState, useEffect, useRef } from 'react'
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
  ExternalLink,
  X,
  Loader2,
  AlertCircle,
  Trash2,
  AlertTriangle,
  AlertOctagon,
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

  // Complete booking details
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

interface SyncProgress {
  current: number
  total: number
  message: string
}

interface SyncStats {
  total: number
  created: number
  updated: number
  errors: number
  blocksExcluded?: number
  pastExcluded?: number
}

// Helper to extract metadata from booking_notes
interface BookingMetadata {
  roomName: string | null
  airbnbUrl: string | null
}

// ============================================================================
// Component
// ============================================================================

export default function ReservationsList() {
  const router = useRouter()

  const [reservations, setReservations] = useState<ReservationItem[]>([])
  const [tenantInfo, setTenantInfo] = useState<{
    tenant_id: string
    hotel_name: string
    slug: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // SSE Sync State
  const [syncing, setSyncing] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [progress, setProgress] = useState<SyncProgress>({ current: 0, total: 0, message: '' })
  const [syncStartTime, setSyncStartTime] = useState<number>(0)
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Expanded cards state (for additional details)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // Delete All Reservations State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteConfirm2, setShowDeleteConfirm2] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [motoPressCount, setMotoPressCount] = useState(0)

  useEffect(() => {
    fetchReservations()
  }, [])

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
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
          tenant_id: data.data.tenant_info.tenant_id,
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

  const handleUnifiedSync = async () => {
    if (!tenantInfo?.tenant_id) {
      alert('Error: No se pudo obtener el tenant ID')
      return
    }

    setSyncing(true)
    setSyncError(null)
    setSyncStats(null)
    setProgress({ current: 0, total: 0, message: 'Iniciando sincronización...' })
    setShowProgressModal(true)
    setSyncStartTime(Date.now())

    const token = localStorage.getItem('staff_token')
    if (!token) {
      router.push('/staff/login')
      return
    }

    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(
      `/api/integrations/motopress/sync-all?tenant_id=${tenantInfo.tenant_id}&token=${encodeURIComponent(token)}`
    )
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'progress') {
          setProgress({
            current: data.current || 0,
            total: data.total || 0,
            message: data.message || ''
          })
        } else if (data.type === 'complete') {
          // Success!
          setSyncStats(data.stats)
          setProgress({
            current: data.stats.total || 0,
            total: data.stats.total || 0,
            message: 'Sincronización completada exitosamente'
          })

          eventSource.close()
          eventSourceRef.current = null
          setSyncing(false)

          // Refresh reservations list after 2 seconds
          setTimeout(() => {
            fetchReservations()
          }, 2000)
        } else if (data.type === 'error') {
          setSyncError(data.message)
          setProgress({
            current: 0,
            total: 0,
            message: `Error: ${data.message}`
          })
          eventSource.close()
          eventSourceRef.current = null
          setSyncing(false)
        }
      } catch (err) {
        console.error('[SSE] Parse error:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error:', err)
      setSyncError('Error de conexión durante la sincronización')
      setProgress({
        current: 0,
        total: 0,
        message: 'Error de conexión'
      })
      eventSource.close()
      eventSourceRef.current = null
      setSyncing(false)
    }
  }

  const closeProgressModal = () => {
    // Only allow closing if sync is complete or errored
    if (!syncing) {
      setShowProgressModal(false)
      setSyncStats(null)
      setSyncError(null)
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

  // Extract metadata from booking_notes
  const extractBookingMetadata = (bookingNotes: string | null): BookingMetadata => {
    if (!bookingNotes) {
      return { roomName: null, airbnbUrl: null }
    }

    // Extract "Room: XXX" from notes
    const roomMatch = bookingNotes.match(/Room:\s*(.+?)(?:\n|$)/i)
    const roomName = roomMatch ? roomMatch[1].trim() : null

    // Extract Airbnb URL (https://www.airbnb.com/...)
    const urlMatch = bookingNotes.match(/(https?:\/\/(?:www\.)?airbnb\.com\/[^\s]+)/i)
    const airbnbUrl = urlMatch ? urlMatch[1] : null

    return { roomName, airbnbUrl }
  }

  // Check if reservation is new (created < 24h ago)
  const isNewReservation = (createdAt: string): boolean => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
    return diffHours < 24
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

  const toggleCardExpansion = (key: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const handleDeleteAllReservations = () => {
    // Count MotoPress reservations
    const motoPressReservations = reservations.filter(r => r.booking_source === 'motopress')
    setMotoPressCount(motoPressReservations.length)

    if (motoPressReservations.length === 0) {
      alert('No hay reservas de MotoPress para eliminar')
      return
    }

    // Show first confirmation dialog
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete1 = () => {
    // Close first dialog, open second
    setShowDeleteConfirm(false)
    setShowDeleteConfirm2(true)
    setDeleteConfirmText('')
  }

  const handleConfirmDelete2 = async () => {
    if (deleteConfirmText !== 'BORRAR TODO') {
      return // Button should be disabled anyway
    }

    setIsDeleting(true)
    setShowDeleteConfirm2(false)

    try {
      const token = localStorage.getItem('staff_token')
      if (!token) {
        router.push('/staff/login')
        return
      }

      const response = await fetch('/api/integrations/motopress/delete-all-reservations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenant_id: tenantInfo?.tenant_id
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('staff_token')
          localStorage.removeItem('staff_info')
          router.push('/staff/login')
          return
        }
        if (response.status === 403) {
          throw new Error('No tienes permisos para esta acción')
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        alert(`✅ ${data.data.deleted} reservas eliminadas exitosamente`)
        // Refresh reservations list
        await fetchReservations()
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      console.error('[deleteAllReservations] Error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete reservations'
      alert(`❌ Error al eliminar reservas: ${errorMessage}`)
    } finally {
      setIsDeleting(false)
      setDeleteConfirmText('')
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setShowDeleteConfirm2(false)
    setDeleteConfirmText('')
  }

  // Calculate elapsed time and progress percentage
  const getTimeElapsed = (): string => {
    if (!syncStartTime) return '0s'
    const elapsed = Math.floor((Date.now() - syncStartTime) / 1000)
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
  }

  const getProgressPercentage = (): number => {
    if (!progress.total || progress.total === 0) return 0
    return Math.round((progress.current / progress.total) * 100)
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
              {/* Manual Refresh Button */}
              <button
                onClick={fetchReservations}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh reservations"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">Actualizar</span>
              </button>

              {/* Unified Sync Button */}
              <button
                onClick={handleUnifiedSync}
                disabled={syncing || isDeleting}
                className="flex items-center space-x-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Sync with MotoPress"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">Sincronizar Reservas</span>
              </button>

              {/* Delete All Reservations Button */}
              <button
                onClick={handleDeleteAllReservations}
                disabled={syncing || isDeleting}
                className="flex items-center space-x-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Delete all MotoPress reservations"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">Borrar Todas</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* First Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-labelledby="delete-confirm-1-title"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border-2 border-red-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h2 id="delete-confirm-1-title" className="text-lg font-semibold text-red-900">
                  Confirmar Borrado de Reservas
                </h2>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-slate-700 mb-4">
                Estás a punto de borrar <strong>TODAS</strong> las reservas de MotoPress de este hotel.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-red-900 mb-2">
                  Total de reservas: <span className="text-2xl font-bold">{motoPressCount}</span>
                </p>
                <p className="text-sm text-red-700">Fuente: MotoPress</p>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mb-6">
                <p className="text-sm font-semibold text-yellow-900">
                  ⚠️ Esta acción NO se puede deshacer.
                </p>
              </div>

              <p className="text-slate-700 font-medium mb-4">
                ¿Estás seguro de que deseas continuar?
              </p>

              {/* Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete1}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Sí, continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Second Delete Confirmation Modal (Type to Confirm) */}
      {showDeleteConfirm2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-labelledby="delete-confirm-2-title"
          aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCancelDelete()
            } else if (e.key === 'Enter' && deleteConfirmText === 'BORRAR TODO') {
              handleConfirmDelete2()
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border-2 border-red-500">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center space-x-3">
                <AlertOctagon className="w-6 h-6 text-white" />
                <h2 id="delete-confirm-2-title" className="text-lg font-semibold text-white">
                  Última Confirmación
                </h2>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-slate-700 mb-4">
                Para confirmar el borrado de <strong className="text-red-600">{motoPressCount}</strong> reservas de MotoPress, escribe:
              </p>

              <div className="bg-slate-100 border-2 border-slate-300 rounded-lg p-3 mb-4 text-center">
                <p className="text-lg font-mono font-bold text-slate-900">BORRAR TODO</p>
              </div>

              <p className="text-sm text-slate-600 mb-3">en el campo de abajo:</p>

              {/* Text Input */}
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Escribe aquí..."
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all font-mono mb-6"
                aria-label="Confirmation text input"
                autoFocus
              />

              {/* Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete2}
                  disabled={deleteConfirmText !== 'BORRAR TODO'}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-red-400"
                >
                  Borrar Todas las Reservas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-labelledby="sync-modal-title"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="sync-modal-title" className="text-lg font-semibold text-white">
                    Sincronizando Reservas de MotoPress
                  </h2>
                  {tenantInfo && (
                    <p className="text-sm text-green-100 mt-1">
                      {tenantInfo.hotel_name}
                    </p>
                  )}
                </div>
                {!syncing && (
                  <button
                    onClick={closeProgressModal}
                    className="p-1 hover:bg-green-800 rounded-lg transition-colors"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    Progreso
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    {getProgressPercentage()}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>

              {/* Status Message */}
              <div className="mb-4">
                <div className="flex items-start space-x-3">
                  {syncing ? (
                    <Loader2 className="w-5 h-5 text-green-600 animate-spin mt-0.5" />
                  ) : syncError ? (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${syncError ? 'text-red-700' : 'text-slate-900'}`}>
                      {progress.message || 'Iniciando...'}
                    </p>
                    {progress.total > 0 && (
                      <p className="text-xs text-slate-600 mt-1">
                        Página {progress.current} de {progress.total}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Time Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600 mb-1">Tiempo transcurrido</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {getTimeElapsed()}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600 mb-1">
                    {syncing ? 'Procesando...' : 'Estado'}
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {syncing ? (
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                        Activo
                      </span>
                    ) : syncError ? (
                      'Error'
                    ) : (
                      'Completo'
                    )}
                  </p>
                </div>
              </div>

              {/* Success Stats */}
              {syncStats && !syncError && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-900 mb-3">
                    Sincronización completada exitosamente
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-green-700">
                        <span className="font-semibold">{syncStats.created}</span> creadas
                      </p>
                    </div>
                    <div>
                      <p className="text-green-700">
                        <span className="font-semibold">{syncStats.updated}</span> actualizadas
                      </p>
                    </div>
                    {syncStats.blocksExcluded !== undefined && syncStats.blocksExcluded > 0 && (
                      <div className="col-span-2">
                        <p className="text-green-600 text-xs">
                          {syncStats.blocksExcluded} bloques de calendario excluidos
                        </p>
                      </div>
                    )}
                    {syncStats.pastExcluded !== undefined && syncStats.pastExcluded > 0 && (
                      <div className="col-span-2">
                        <p className="text-blue-600 text-xs">
                          {syncStats.pastExcluded} reservas pasadas/lejanas excluidas
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {syncError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-900 mb-1">
                    Error durante la sincronización
                  </p>
                  <p className="text-sm text-red-700">{syncError}</p>
                </div>
              )}

              {/* Close Button */}
              {!syncing && (
                <div className="mt-6">
                  <button
                    onClick={closeProgressModal}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                      syncError
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {syncError ? 'Cerrar' : 'Aceptar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            <div className="py-16 text-center">
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

              {/* Reservations Cards - 2-column grid on desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {groupReservations(reservations).map((group) => {
                  // Use first reservation for common data
                  const firstReservation = group[0]
                  const cardKey = firstReservation.external_booking_id || firstReservation.id
                  const daysUntil = getDaysUntil(firstReservation.check_in_date)
                  const urgencyColor = getUrgencyColor(daysUntil)
                  const urgencyLabel = getUrgencyLabel(daysUntil)
                  const sourceBadge = getBookingSourceBadge(firstReservation.booking_source)
                  const isNew = isNewReservation(firstReservation.created_at)
                  const isExpanded = expandedCards.has(cardKey)

                  // Extract metadata from booking_notes
                  const metadata = extractBookingMetadata(firstReservation.booking_notes)

                  // Multi-unit booking indicators
                  const isMultiUnit = group.length > 1
                  const totalPrice = group.reduce((sum, r) => sum + (r.total_price || 0), 0)
                  const totalAdults = group.reduce((sum, r) => sum + (r.adults || 0), 0)
                  const totalChildren = group.reduce((sum, r) => sum + (r.children || 0), 0)

                  return (
                    <div
                      key={cardKey}
                      className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow ${
                        isNew ? 'border-green-300 ring-2 ring-green-100' : 'border-slate-200'
                      }`}
                    >
                      {/* New Badge */}
                      {isNew && (
                        <div className="mb-3">
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-200">
                            <BadgeCheck className="w-3 h-3 mr-1" />
                            Nueva (últimas 24h)
                          </span>
                        </div>
                      )}

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

                      {/* Room Name from MotoPress (if available) */}
                      {metadata.roomName && (
                        <div className="mb-4 pb-4 border-b border-slate-200">
                          <div className="flex items-start space-x-3">
                            <Home className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-blue-900">
                                {metadata.roomName}
                              </p>
                              <p className="text-xs text-slate-500">Nombre de la habitación (MotoPress)</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Main Info Grid */}
                      <div className="grid grid-cols-1 gap-3 mb-4">
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
                              <p className="text-sm font-medium text-slate-700 break-all">
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

                        {/* Guest Capacity */}
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

                        {/* Price */}
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
                      </div>

                      {/* Airbnb URL */}
                      {metadata.airbnbUrl && (
                        <div className="mb-4">
                          <a
                            href={metadata.airbnbUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg transition-colors text-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>Ver en Airbnb</span>
                          </a>
                        </div>
                      )}

                      {/* Expandable Additional Details */}
                      {(firstReservation.guest_country || firstReservation.external_booking_id || isMultiUnit || firstReservation.booking_notes) && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <button
                            onClick={() => toggleCardExpansion(cardKey)}
                            className="flex items-center justify-between w-full text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                            aria-expanded={isExpanded}
                          >
                            <span>Detalles adicionales</span>
                            <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="mt-3 space-y-3">
                              {/* Country */}
                              {firstReservation.guest_country && (
                                <div className="flex items-start space-x-3">
                                  <Globe className="w-4 h-4 text-slate-400 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">
                                      {firstReservation.guest_country}
                                    </p>
                                    <p className="text-xs text-slate-500">País</p>
                                  </div>
                                </div>
                              )}

                              {/* External Booking ID */}
                              {firstReservation.external_booking_id && (
                                <div className="flex items-start space-x-3">
                                  <BadgeCheck className="w-4 h-4 text-slate-400 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-mono text-slate-700 break-all">
                                      {firstReservation.external_booking_id}
                                    </p>
                                    <p className="text-xs text-slate-500">ID de reserva externa</p>
                                  </div>
                                </div>
                              )}

                              {/* Multi-Unit Details */}
                              {isMultiUnit && (
                                <div className="pt-2 border-t border-slate-100">
                                  <div className="flex items-start space-x-3 mb-2">
                                    <Home className="w-4 h-4 text-purple-600 mt-0.5" />
                                    <p className="text-sm font-medium text-slate-700">
                                      Unidades reservadas ({group.length}):
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2 ml-7">
                                    {group.map((unit, idx) => (
                                      <div
                                        key={unit.id}
                                        className="bg-slate-50 rounded-lg p-2 border border-slate-200"
                                      >
                                        <p className="text-sm font-medium text-slate-900">
                                          {unit.accommodation_unit?.name || `Unidad ${idx + 1}`}
                                        </p>
                                        <p className="text-xs text-slate-600">
                                          {unit.adults} adulto{unit.adults !== 1 ? 's' : ''}
                                          {unit.children > 0 && `, ${unit.children} niño${unit.children !== 1 ? 's' : ''}`}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Booking Notes */}
                              {firstReservation.booking_notes && (
                                <div className="pt-2 border-t border-slate-100">
                                  <div className="flex items-start space-x-3">
                                    <StickyNote className="w-4 h-4 text-amber-500 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-slate-600 mb-1">Notas completas:</p>
                                      <p className="text-xs text-slate-700 whitespace-pre-wrap break-words">
                                        {firstReservation.booking_notes}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
