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
  Clock
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface AirbnbReservation {
  // Basic Identification
  id: string
  external_uid?: string
  summary: string

  // Temporal Data
  start_date: string
  end_date: string
  check_in_time?: string
  check_out_time?: string

  // Event Classification
  source: string
  event_type: string
  status: string

  // Guest Information
  guest_name?: string
  guest_email?: string
  guest_phone?: string
  guest_phone_last4?: string
  total_guests?: number
  adults?: number
  children?: number

  // Reservation Details (parsed from ICS)
  reservation_code?: string
  reservation_url?: string
  total_price?: number
  currency?: string
  description?: string

  // SIRE Compliance Fields (9 campos de huésped)
  document_type?: string
  document_number?: string
  first_surname?: string
  second_surname?: string
  given_names?: string
  birth_date?: string
  nationality_code?: string
  origin_city_code?: string
  destination_city_code?: string

  // Sync Metadata
  ics_dtstamp?: string
  sequence_number?: number
  source_priority?: number
  sync_generation?: string
  first_seen_at?: string
  last_seen_at?: string

  // Relationships
  property_name: string
  accommodation_unit_id?: string
  parent_event_id?: string

  // Timestamps
  created_at: string
  updated_at?: string
  last_modified?: string
}

interface AirbnbReservationCardProps {
  reservation: AirbnbReservation
}

// ========== HELPER FUNCTIONS ==========

function parseReservationCode(description?: string): string | null {
  if (!description) return null
  const match = description.match(/details\/([A-Z0-9]+)/)
  return match ? match[1] : null
}

function parsePhoneLast4(description?: string): string | null {
  if (!description) return null
  const match = description.match(/Last 4 Digits\): (\d{4})/)
  return match ? match[1] : null
}

function buildAirbnbURL(reservationCode?: string): string | null {
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

function calculateSireCompleteness(reservation: AirbnbReservation): { completed: number; total: number } {
  const sireFields = [
    reservation.document_type,
    reservation.document_number,
    reservation.first_surname,
    reservation.given_names,
    reservation.birth_date,
    reservation.nationality_code,
    reservation.origin_city_code,
    reservation.destination_city_code,
    // second_surname is optional, not counted
  ]

  const completed = sireFields.filter(field => field && field.trim() !== '').length
  return { completed, total: 8 } // 8 mandatory fields (segundo_apellido is optional)
}

function getEventTypeBadge(eventType: string) {
  const badges: Record<string, { label: string; color: string }> = {
    'reservation': { label: 'Reserva', color: 'bg-green-100 text-green-800' },
    'block': { label: 'Bloqueado', color: 'bg-gray-100 text-gray-800' },
    'maintenance': { label: 'Mantenimiento', color: 'bg-blue-100 text-blue-800' },
    'parent_block': { label: 'Bloqueo Heredado', color: 'bg-purple-100 text-purple-800' },
  }
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
  const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
  return badge
}

function getSireProgressBadge(completed: number, total: number) {
  const percentage = (completed / total) * 100
  let color = 'bg-red-100 text-red-800' // 0%
  if (percentage >= 100) {
    color = 'bg-green-100 text-green-800' // 100%
  } else if (percentage > 0) {
    color = 'bg-yellow-100 text-yellow-800' // Partial
  }
  return { color, label: `SIRE: ${completed}/${total}` }
}

// ========== MAIN COMPONENT ==========

export default function AirbnbReservationCard({ reservation }: AirbnbReservationCardProps) {
  const [showSireData, setShowSireData] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)

  // Parse fields from ICS description
  const reservationCode = parseReservationCode(reservation.description) || reservation.reservation_code
  const phoneLast4 = parsePhoneLast4(reservation.description) || reservation.guest_phone_last4
  const reservationURL = buildAirbnbURL(reservationCode) || reservation.reservation_url

  // Calculate values
  const nights = calculateNights(reservation.start_date, reservation.end_date)
  const sireProgress = calculateSireCompleteness(reservation)
  const eventTypeBadge = getEventTypeBadge(reservation.event_type)
  const statusBadge = getStatusBadge(reservation.status)
  const sireProgressBadge = getSireProgressBadge(sireProgress.completed, sireProgress.total)

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* ========== SECCIÓN 1: INFO AIRBNB (SIEMPRE VISIBLE) ========== */}
      <div className="p-6">
        {/* Header con Propiedad */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-pink-600" />
              <span className="font-semibold text-gray-900">{reservation.property_name}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${eventTypeBadge.color}`}>
                {eventTypeBadge.label}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${sireProgressBadge.color}`}>
                {sireProgressBadge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Código de Reserva */}
        {reservationCode && (
          <div className="mb-3">
            <div className="text-sm text-gray-600 mb-1">Código de reserva</div>
            {reservationURL ? (
              <a
                href={reservationURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 font-mono font-medium"
              >
                {reservationCode}
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <div className="font-mono font-medium text-gray-900">{reservationCode}</div>
            )}
          </div>
        )}

        {/* Fechas */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Check-in:</span>
            <span className="font-medium text-gray-900">
              {new Date(reservation.start_date).toLocaleDateString('es-CO', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Check-out:</span>
            <span className="font-medium text-gray-900">
              {new Date(reservation.end_date).toLocaleDateString('es-CO', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Duración:</span>
            <span className="font-medium text-gray-900">
              {nights} noche{nights !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Teléfono últimos 4 dígitos */}
        {phoneLast4 && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Tel. (últimos 4 dígitos):</span>
            <span className="font-mono font-medium text-gray-900">{phoneLast4}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* ========== SECCIÓN 2: DATOS SIRE (EXPANDIBLE) ========== */}
        <div>
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
              {/* Subsección: Identificación */}
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

              {/* Subsección: Datos Personales */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Datos Personales
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 min-w-[120px]">Primer apellido:</span>
                    <span className={`font-medium ${reservation.first_surname ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {reservation.first_surname || 'No disponible aún'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 min-w-[120px]">Segundo apellido:</span>
                    <span className={`font-medium ${reservation.second_surname ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {reservation.second_surname || 'No disponible aún'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 min-w-[120px]">Nombres:</span>
                    <span className={`font-medium ${reservation.given_names ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {reservation.given_names || 'No disponible aún'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 min-w-[120px]">Fecha nacimiento:</span>
                    <span className={`font-medium ${reservation.birth_date ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {reservation.birth_date || 'No disponible aún'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subsección: Datos de Viaje */}
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

        {/* ========== SECCIÓN 3: METADATOS TÉCNICOS (COLAPSADO POR DEFECTO) ========== */}
        <div className="mt-4">
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
              <div className="flex items-start gap-2">
                <span className="text-gray-600 min-w-[140px]">UID:</span>
                <span className="font-mono text-gray-900 break-all">{reservation.external_uid || 'N/A'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-600 min-w-[140px]">DTSTAMP:</span>
                <span className="font-mono text-gray-900">{reservation.ics_dtstamp || 'N/A'}</span>
              </div>
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
      </div>
    </div>
  )
}
