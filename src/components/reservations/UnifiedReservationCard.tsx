'use client'

import { useState } from 'react'
import {
  Calendar,
  MapPin,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  Globe,
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  Users,
  DollarSign,
  Home,
  BadgeCheck,
  Trash2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { getStatusDisplay, type ReservationStatus } from '@/types/reservations'

// ============================================================================
// INTERFACE UNIFICADA
// ============================================================================

interface UnifiedReservation {
  // Basic Identification
  id: string
  reservation_code?: string | null
  external_booking_id?: string | null

  // Temporal Data
  check_in_date: string
  start_date?: string // Airbnb format
  check_out_date: string
  end_date?: string // Airbnb format
  check_in_time?: string | null
  check_out_time?: string | null

  // Status & Classification
  status: string
  booking_source?: string // 'airbnb' | 'motopress' | 'manual'
  source?: string // Airbnb alternative
  event_type?: string // 'reservation' | 'block' | 'maintenance' | 'parent_block'

  // Guest Information - MotoPress format
  guest_name?: string | null
  guest_email?: string | null
  guest_country?: string | null // Oculto - solo para sugerencia interna
  phone_full?: string | null
  phone_last_4?: string | null
  guest_phone_last4?: string // Airbnb format
  adults?: number
  children?: number
  total_guests?: number

  // SIRE Compliance Fields (9 campos)
  document_type?: string | null
  document_number?: string | null
  first_surname?: string | null
  second_surname?: string | null
  given_names?: string | null
  birth_date?: string | null
  nationality_code?: string | null
  origin_city_code?: string | null
  destination_city_code?: string | null

  // Financial
  total_price?: number | null
  currency?: string

  // Notes & Description
  booking_notes?: string | null
  description?: string | null

  // Property/Accommodation
  property_name?: string
  accommodation_unit_id?: string | null
  reservation_accommodations?: Array<{
    id: string
    accommodation_unit: {
      name: string
      unit_number?: string | null
    } | null
    room_rate?: number | null
  }>

  // Airbnb ICS Metadata
  external_uid?: string | null
  ics_dtstamp?: string | null
  sequence_number?: number
  source_priority?: number
  first_seen_at?: string | null
  last_seen_at?: string | null
  sync_generation?: string | null

  // Tenant Data (for automatic SIRE fields)
  tenant_hotel_code?: string | null
  tenant_city_code?: string | null

  // Timestamps
  created_at: string
  updated_at?: string | null
  last_modified?: string | null
}

interface UnifiedReservationCardProps {
  reservation: UnifiedReservation
  onDelete?: (reservationId: string) => Promise<void>
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseReservationCode(description?: string | null): string | null {
  if (!description) return null
  const match = description.match(/details\/([A-Z0-9]+)/)
  return match ? match[1] : null
}

function parsePhoneLast4(description?: string | null): string | null {
  if (!description) return null
  const match = description.match(/Last 4 Digits\): (\d{4})/)
  return match ? match[1] : null
}

function buildAirbnbURL(reservationCode?: string | null): string | null {
  if (!reservationCode) return null
  return `https://www.airbnb.com.co/hosting/reservations/details/${reservationCode}`
}

function calculateNights(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diff = end.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { locale: es, addSuffix: true })
  } catch {
    return dateString
  }
}

function formatDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  } catch {
    return dateStr
  }
}

function getDaysUntil(dateStr: string): number {
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
    const checkIn = new Date(year, month - 1, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    checkIn.setHours(0, 0, 0, 0)
    const diffTime = checkIn.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  } catch {
    return 999
  }
}

function calculateSireCompleteness(reservation: UnifiedReservation): { completed: number; total: number } {
  const sireFields = [
    reservation.document_type,
    reservation.document_number,
    reservation.first_surname,
    reservation.given_names,
    reservation.birth_date,
    reservation.nationality_code,
    reservation.origin_city_code,
    reservation.destination_city_code,
  ]

  const completed = sireFields.filter(field => field && String(field).trim() !== '').length
  return { completed, total: 8 }
}

function getUrgencyColor(daysUntil: number): string {
  if (daysUntil <= 0) return 'bg-red-100 text-red-800 border-red-200'
  if (daysUntil <= 3) return 'bg-orange-100 text-orange-800 border-orange-200'
  if (daysUntil <= 7) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-green-100 text-green-800 border-green-200'
}

function getUrgencyLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'Hoy'
  if (daysUntil === 1) return 'Mañana'
  if (daysUntil < 0) return 'Atrasado'
  return `En ${daysUntil} días`
}

function getEventTypeBadge(eventType?: string) {
  const badges: Record<string, { label: string; color: string }> = {
    'reservation': { label: 'Reserva', color: 'bg-green-100 text-green-800' },
    'block': { label: 'Bloqueado', color: 'bg-gray-100 text-gray-800' },
    'maintenance': { label: 'Mantenimiento', color: 'bg-blue-100 text-blue-800' },
    'parent_block': { label: 'Bloqueo Heredado', color: 'bg-purple-100 text-purple-800' },
  }
  if (!eventType) return null
  const badge = badges[eventType] || { label: eventType, color: 'bg-gray-100 text-gray-800' }
  return badge
}

function getStatusBadge(status: string) {
  const badges: Record<string, { label: string; color: string }> = {
    'active': { label: 'Activa', color: 'bg-green-100 text-green-800' },
    'confirmed': { label: 'Confirmada', color: 'bg-blue-100 text-blue-800' },
    'pending': { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
    'cancelled': { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
    'completed': { label: 'Completada', color: 'bg-gray-100 text-gray-800' },
  }
  const badge = badges[status.toLowerCase()] || { label: status, color: 'bg-gray-100 text-gray-800' }
  return badge
}

function getSourceBadge(source?: string) {
  if (!source) return null
  const badges: Record<string, { label: string; color: string }> = {
    'airbnb': { label: 'Airbnb', color: 'bg-pink-100 text-pink-800' },
    'motopress': { label: 'MotoPress', color: 'bg-blue-100 text-blue-800' },
    'booking.com': { label: 'Booking.com', color: 'bg-cyan-100 text-cyan-800' },
    'vrbo': { label: 'VRBO', color: 'bg-indigo-100 text-indigo-800' },
    'manual': { label: 'Manual', color: 'bg-gray-100 text-gray-800' },
  }
  const badge = badges[source.toLowerCase()] || { label: source, color: 'bg-gray-100 text-gray-800' }
  return badge
}

function getSireProgressBadge(completed: number, total: number) {
  const percentage = (completed / total) * 100
  let color = 'bg-red-100 text-red-800'
  if (percentage >= 100) {
    color = 'bg-green-100 text-green-800'
  } else if (percentage > 0) {
    color = 'bg-yellow-100 text-yellow-800'
  }
  return { color, label: `SIRE: ${completed}/${total}` }
}

function parseGuestNameFallback(guestName?: string | null): {
  parsedFirstName: string | null
  parsedLastName: string | null
} {
  // For old reservations without SIRE fields - parse guest_name as fallback
  if (!guestName) return { parsedFirstName: null, parsedLastName: null }

  const parts = guestName.trim().split(/\s+/).filter(p => p.length > 0)

  if (parts.length === 0) {
    return { parsedFirstName: null, parsedLastName: null }
  }

  if (parts.length === 1) {
    // Only one word - assume it's first name
    return { parsedFirstName: parts[0], parsedLastName: null }
  }

  // Last word = surname, everything else = first names
  const lastName = parts[parts.length - 1]
  const firstName = parts.slice(0, -1).join(' ')

  return { parsedFirstName: firstName, parsedLastName: lastName }
}

function formatPrice(price: number | null | undefined, currency?: string): string {
  if (!price) return 'No disponible aún'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency || 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

function isNewReservation(createdAt: string): boolean {
  try {
    const created = new Date(createdAt)
    const now = new Date()
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
    return diffHours < 24
  } catch {
    return false
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UnifiedReservationCard({ reservation, onDelete }: UnifiedReservationCardProps) {
  const [showSireData, setShowSireData] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showAutoData, setShowAutoData] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Get status display configuration
  const statusDisplay = getStatusDisplay(reservation.status as ReservationStatus)

  // Normalize dates (support both MotoPress and Airbnb formats)
  const checkInDate = reservation.check_in_date || reservation.start_date || ''
  const checkOutDate = reservation.check_out_date || reservation.end_date || ''

  // Parse fields from description (Airbnb)
  const reservationCode = parseReservationCode(reservation.description) || reservation.reservation_code
  const phoneLast4Parsed = parsePhoneLast4(reservation.description) || reservation.phone_last_4 || reservation.guest_phone_last4
  const reservationURL = buildAirbnbURL(reservationCode)

  // Calculate values
  const nights = calculateNights(checkInDate, checkOutDate)
  const daysUntil = getDaysUntil(checkInDate)
  const sireProgress = calculateSireCompleteness(reservation)
  const eventTypeBadge = getEventTypeBadge(reservation.event_type)
  const statusBadge = getStatusBadge(reservation.status)
  const source = reservation.booking_source || reservation.source || 'unknown'
  const sourceBadge = getSourceBadge(source)
  const sireProgressBadge = getSireProgressBadge(sireProgress.completed, sireProgress.total)
  const urgencyColor = getUrgencyColor(daysUntil)
  const urgencyLabel = getUrgencyLabel(daysUntil)
  const isNew = isNewReservation(reservation.created_at)

  // Guest display name
  const guestDisplayName = reservation.guest_name ||
    (reservation.given_names && reservation.first_surname
      ? `${reservation.given_names} ${reservation.first_surname}${reservation.second_surname ? ' ' + reservation.second_surname : ''}`
      : 'Huésped')

  // SIRE name fields with fallback parsing for old reservations
  const parsedNames = parseGuestNameFallback(reservation.guest_name)
  const displayGivenNames = reservation.given_names || parsedNames.parsedFirstName || 'No disponible aún'
  const displayFirstSurname = reservation.first_surname || parsedNames.parsedLastName || 'No disponible aún'
  const displaySecondSurname = reservation.second_surname || 'No disponible aún'

  // Handle delete action
  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm(`¿Estás seguro que deseas eliminar la reserva de ${guestDisplayName}? Esta acción no se puede deshacer.`)) {
      return
    }

    setIsDeleting(true)
    try {
      await onDelete(reservation.id)
    } catch (error) {
      console.error('[UnifiedReservationCard] Error deleting reservation:', error)
      alert('Error al eliminar la reserva. Por favor, intenta nuevamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={`rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${statusDisplay.bgColor} ${statusDisplay.borderColor} ${
      isNew ? 'ring-2 ring-green-100' : ''
    }`}>
      <div className="p-6">
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
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">{guestDisplayName}</h3>
            </div>

            {/* Código de Reserva */}
            {reservationCode && (
              <div className="ml-7 text-sm text-slate-600">
                Código: {reservationURL ? (
                  <a
                    href={reservationURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-pink-600 hover:text-pink-700 font-mono font-medium"
                  >
                    {reservationCode}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="font-mono font-medium">{reservationCode}</span>
                )}
              </div>
            )}
          </div>

          {/* Badges Column + Delete Button */}
          <div className="flex flex-col items-end gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${urgencyColor}`}>
              {urgencyLabel}
            </div>
            {sourceBadge && (
              <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${sourceBadge.color}`}>
                {sourceBadge.label}
              </div>
            )}
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${statusDisplay.color} ${statusDisplay.bgColor} border ${statusDisplay.borderColor}`}>
              {statusDisplay.label}
            </div>
            {eventTypeBadge && (
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${eventTypeBadge.color}`}>
                {eventTypeBadge.label}
              </div>
            )}
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${sireProgressBadge.color}`}>
              {sireProgressBadge.label}
            </div>

            {/* Delete Button (only for pending reservations) */}
            {statusDisplay.canDelete && onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-xs font-semibold rounded-md transition-colors"
                title="Eliminar reserva pendiente"
              >
                {isDeleting ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Accommodation */}
        {(reservation.property_name || reservation.reservation_accommodations) && (
          <div className="mb-4 pb-4 border-b border-slate-200">
            <div className="flex items-start gap-2">
              <Home className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                {reservation.property_name && (
                  <p className="text-sm font-semibold text-emerald-900">{reservation.property_name}</p>
                )}
                {reservation.reservation_accommodations && reservation.reservation_accommodations.length > 0 && (
                  <p className="text-sm font-semibold text-emerald-900">
                    {reservation.reservation_accommodations.map(acc => acc.accommodation_unit?.name || 'Sin nombre').join(', ')}
                  </p>
                )}
                <p className="text-xs text-slate-500">Alojamiento</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Info Grid */}
        <div className="space-y-3 mb-4">
          {/* Dates */}
          <div className="flex items-start gap-2">
            <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-700">
                {formatDate(checkInDate)} - {formatDate(checkOutDate)}
              </p>
              <p className="text-xs text-slate-500">
                {nights} noche{nights !== 1 ? 's' : ''}
                {(reservation.check_in_time || reservation.check_out_time) && (
                  <> • {reservation.check_in_time || '—'} - {reservation.check_out_time || '—'}</>
                )}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-2">
            <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className={`text-sm font-medium ${reservation.guest_email ? 'text-slate-700' : 'text-gray-400 italic'}`}>
                {reservation.guest_email || 'No disponible aún'}
              </p>
              <p className="text-xs text-slate-500">Email</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-2">
            <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className={`text-sm font-medium ${reservation.phone_full || phoneLast4Parsed ? 'text-slate-700' : 'text-gray-400 italic'}`}>
                {reservation.phone_full || (phoneLast4Parsed ? `***-${phoneLast4Parsed}` : 'No disponible aún')}
              </p>
              <p className="text-xs text-slate-500">Teléfono</p>
            </div>
          </div>

          {/* Guests */}
          <div className="flex items-start gap-2">
            <Users className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className={`text-sm font-medium ${reservation.adults || reservation.children ? 'text-slate-700' : 'text-gray-400 italic'}`}>
                {reservation.adults || reservation.children ? (
                  <>
                    {reservation.adults || 0} adulto{(reservation.adults || 0) !== 1 ? 's' : ''}
                    {reservation.children && reservation.children > 0 && `, ${reservation.children} niño${reservation.children !== 1 ? 's' : ''}`}
                  </>
                ) : 'No disponible aún'}
              </p>
              <p className="text-xs text-slate-500">Huéspedes</p>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-start gap-2">
            <DollarSign className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className={`text-sm font-medium ${reservation.total_price ? 'text-slate-700' : 'text-gray-400 italic'}`}>
                {formatPrice(reservation.total_price, reservation.currency)}
              </p>
              <p className="text-xs text-slate-500">Precio total</p>
            </div>
          </div>
        </div>

        {/* SIRE Data Section (Expandable) */}
        <div className="border-t border-slate-200 pt-4">
          <button
            onClick={() => setShowSireData(!showSireData)}
            className="w-full flex items-center justify-between py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Datos para Compliance SIRE</span>
              {sireProgress.completed === sireProgress.total ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-600" />
              )}
            </div>
            {showSireData ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showSireData && (
            <div className="mt-3 space-y-4 px-3">
              {/* Identificación */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Identificación
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 min-w-[120px]">Tipo documento:</span>
                    <span className={`font-medium ${reservation.document_type ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {reservation.document_type
                        ? ({'3': 'Pasaporte', '5': 'Cédula', '10': 'PEP', '46': 'Diplomático'}[reservation.document_type] || reservation.document_type)
                        : 'No disponible aún'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 min-w-[120px]">Número:</span>
                    <span className={`font-medium ${reservation.document_number ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {reservation.document_number || 'No disponible aún'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Datos Personales */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Datos Personales
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 min-w-[120px]">Primer apellido:</span>
                    <span className={`font-medium ${reservation.first_surname || parsedNames.parsedLastName ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {displayFirstSurname}
                    </span>
                    {!reservation.first_surname && parsedNames.parsedLastName && (
                      <span className="text-xs text-blue-600">(parseado)</span>
                    )}
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 min-w-[120px]">Segundo apellido:</span>
                    <span className={`font-medium ${reservation.second_surname ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {displaySecondSurname}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 min-w-[120px]">Nombres:</span>
                    <span className={`font-medium ${reservation.given_names || parsedNames.parsedFirstName ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {displayGivenNames}
                    </span>
                    {!reservation.given_names && parsedNames.parsedFirstName && (
                      <span className="text-xs text-blue-600">(parseado)</span>
                    )}
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 min-w-[120px]">Fecha nacimiento:</span>
                    <span className={`font-medium ${reservation.birth_date ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {reservation.birth_date || 'No disponible aún'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Datos de Viaje */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Datos de Viaje
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 min-w-[120px]">Nacionalidad:</span>
                    <span className={`font-medium ${reservation.nationality_code ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {reservation.nationality_code || 'No disponible aún'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 min-w-[120px]">Procedencia:</span>
                    <span className={`font-medium ${reservation.origin_city_code ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {reservation.origin_city_code || 'No disponible aún'}
                    </span>
                    <span className="text-xs text-gray-500">(de dónde vino)</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 min-w-[120px]">Destino:</span>
                    <span className={`font-medium ${reservation.destination_city_code ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {reservation.destination_city_code || 'No disponible aún'}
                    </span>
                    <span className="text-xs text-gray-500">(a dónde va después)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Automatic SIRE Data Section (Expandable) */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <button
            onClick={() => setShowAutoData(!showAutoData)}
            className="w-full flex items-center justify-between py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Datos Automáticos SIRE</span>
              <span className="text-xs text-gray-500">(generados por el sistema)</span>
            </div>
            {showAutoData ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showAutoData && (
            <div className="mt-3 space-y-3 px-3">
              {/* Código Hotel */}
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 min-w-[140px]">Código Hotel:</span>
                <span className={`font-medium ${reservation.tenant_hotel_code ? 'text-gray-900' : 'text-orange-600'}`}>
                  {reservation.tenant_hotel_code || 'No configurado'}
                </span>
              </div>

              {/* Código Ciudad */}
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 min-w-[140px]">Código Ciudad:</span>
                <span className={`font-medium ${reservation.tenant_city_code ? 'text-gray-900' : 'text-orange-600'}`}>
                  {reservation.tenant_city_code || 'No configurado'}
                </span>
                <span className="text-xs text-gray-500">(ubicación del hotel)</span>
              </div>

              {/* País Residencia */}
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 min-w-[140px]">País Residencia:</span>
                <span className={`font-medium ${reservation.guest_country ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                  {reservation.guest_country || 'No disponible aún'}
                </span>
                <span className="text-xs text-gray-500">(para sugerencia de nacionalidad)</span>
              </div>

              {/* Movimiento Entrada */}
              <div className="space-y-2 p-3 bg-green-50 rounded-lg">
                <h5 className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                  Movimiento de Entrada
                </h5>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-gray-600 min-w-[120px]">Tipo:</span>
                  <span className="font-medium text-gray-900">E</span>
                  <span className="text-xs text-gray-500">(Entrada)</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-gray-600 min-w-[120px]">Fecha:</span>
                  <span className="font-medium text-gray-900">{formatDate(checkInDate)}</span>
                  <span className="text-xs text-gray-500">(check-in)</span>
                </div>
              </div>

              {/* Movimiento Salida */}
              <div className="space-y-2 p-3 bg-orange-50 rounded-lg">
                <h5 className="text-xs font-semibold text-orange-800 uppercase tracking-wide">
                  Movimiento de Salida
                </h5>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-gray-600 min-w-[120px]">Tipo:</span>
                  <span className="font-medium text-gray-900">S</span>
                  <span className="text-xs text-gray-500">(Salida)</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-gray-600 min-w-[120px]">Fecha:</span>
                  <span className="font-medium text-gray-900">{formatDate(checkOutDate)}</span>
                  <span className="text-xs text-gray-500">(check-out)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Details (Expandable) */}
        {(reservation.external_booking_id || reservation.booking_notes || reservation.description) && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-gray-700 text-sm">Detalles adicionales</span>
              {showDetails ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showDetails && (
              <div className="mt-3 space-y-3 px-3 text-sm">
                {reservation.external_booking_id && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">ID de reserva externa</p>
                    <p className="font-mono text-slate-700 break-all">{reservation.external_booking_id}</p>
                  </div>
                )}
                {reservation.booking_notes && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Notas de reserva</p>
                    <p className="text-slate-700 whitespace-pre-wrap">{reservation.booking_notes}</p>
                  </div>
                )}
                {reservation.description && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Descripción</p>
                    <p className="text-slate-700 whitespace-pre-wrap">{reservation.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Technical Metadata (Expandable) */}
        {(reservation.external_uid || reservation.ics_dtstamp || reservation.first_seen_at) && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="w-full flex items-center justify-between py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-700 text-sm">Metadatos Técnicos</span>
              </div>
              {showMetadata ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showMetadata && (
              <div className="mt-3 space-y-2 px-3 text-xs">
                {reservation.external_uid && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 min-w-[140px]">UID:</span>
                    <span className="font-mono text-gray-900 break-all">{reservation.external_uid}</span>
                  </div>
                )}
                {reservation.ics_dtstamp && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 min-w-[140px]">DTSTAMP:</span>
                    <span className="font-mono text-gray-900">{reservation.ics_dtstamp}</span>
                  </div>
                )}
                {reservation.sequence_number !== undefined && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 min-w-[140px]">Sequence:</span>
                    <span className="font-mono text-gray-900">{reservation.sequence_number}</span>
                  </div>
                )}
                {reservation.first_seen_at && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 min-w-[140px]">First seen:</span>
                    <span className="text-gray-900">{formatRelativeTime(reservation.first_seen_at)}</span>
                  </div>
                )}
                {reservation.last_seen_at && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 min-w-[140px]">Last seen:</span>
                    <span className="text-gray-900">{formatRelativeTime(reservation.last_seen_at)}</span>
                  </div>
                )}
                {reservation.source_priority !== undefined && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 min-w-[140px]">Priority:</span>
                    <span className="font-mono text-gray-900">{reservation.source_priority}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
