'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import UnifiedReservationCard from '@/components/reservations/UnifiedReservationCard'
import {
  Calendar,
  Filter,
  Home,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface AirbnbReservation {
  // Basic Identification
  id: string
  external_uid?: string // UID from ICS file
  summary: string

  // Temporal Data (supports both formats for UnifiedReservationCard)
  check_in_date: string // Required by UnifiedReservation
  check_out_date: string // Required by UnifiedReservation
  start_date: string // Airbnb format (same as check_in_date)
  end_date: string // Airbnb format (same as check_out_date)
  check_in_time?: string
  check_out_time?: string

  // Event Classification
  source: string // airbnb, booking.com, vrbo, motopress, etc.
  event_type: string // reservation, block, maintenance, parent_block
  status: string // active, pending, cancelled, completed

  // Guest Information
  guest_name?: string
  guest_email?: string
  guest_phone?: string
  guest_phone_last4?: string // Last 4 digits from ICS (Airbnb specific)
  total_guests?: number
  adults?: number
  children?: number

  // Reservation Details (parsed from ICS)
  reservation_code?: string // Parsed from DESCRIPTION field
  reservation_url?: string // Constructed from reservation_code
  total_price?: number
  currency?: string
  description?: string

  // SIRE Compliance Fields (9 campos de huésped - to be collected during check-in)
  // Identificación
  document_type?: string // '3'=Pasaporte, '5'=Cédula, '10'=PEP, '46'=Diplomático
  document_number?: string // Alfanumérico sin guiones

  // Datos Personales
  first_surname?: string // Primer apellido (max 45 chars)
  second_surname?: string // Segundo apellido (opcional, max 45 chars)
  given_names?: string // Nombres (max 60 chars)
  birth_date?: string // Fecha nacimiento (DD/MM/YYYY)

  // Datos de Viaje
  nationality_code?: string // Código nacionalidad SIRE (USA=249, COL=169)
  origin_city_code?: string // Ciudad/país de donde vino (DIVIPOLA o SIRE)
  destination_city_code?: string // Ciudad/país a donde va después (DIVIPOLA o SIRE)

  // Sync Metadata
  ics_dtstamp?: string // When event was generated in ICS
  sequence_number?: number // Version of the event
  source_priority?: number // Priority for conflict resolution (1-10)
  sync_generation?: string // When it was synced
  first_seen_at?: string // First time seen in sync
  last_seen_at?: string // Last time seen in feed

  // Relationships
  property_name: string
  accommodation_unit_id?: string
  parent_event_id?: string

  // Tenant Data (for automatic SIRE fields)
  tenant_hotel_code?: string | null
  tenant_city_code?: string | null

  // Timestamps
  created_at: string
  updated_at?: string
  last_modified?: string
}

interface Property {
  unit_id: string
  name: string
}

export default function AirbnbReservationsPage() {
  const { tenant } = useTenant()
  const [reservations, setReservations] = useState<AirbnbReservation[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [propertyFilter, setPropertyFilter] = useState<string>('all')

  useEffect(() => {
    if (tenant?.tenant_id) {
      loadData()
    }
  }, [tenant])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const token = localStorage.getItem('staff_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Fetch reservations (all events from ICS)
      const resResponse = await fetch('/api/reservations/airbnb', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!resResponse.ok) {
        throw new Error('Failed to fetch reservations')
      }

      const resData = await resResponse.json()

      // Fetch tenant SIRE configuration for automatic fields
      let hotelCode: string | null = null
      let cityCode: string | null = null

      if (tenant?.tenant_id) {
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )

          const { data: tenantData } = await supabase
            .from('tenant_registry')
            .select('features')
            .eq('tenant_id', tenant.tenant_id)
            .single()

          if (tenantData?.features) {
            hotelCode = tenantData.features.sire_hotel_code || null
            cityCode = tenantData.features.sire_city_code || null
          }
        } catch (err) {
          console.error('[AirbnbReservations] Failed to fetch tenant SIRE config:', err)
          // Continue without SIRE codes - will show "No configurado" in UI
        }
      }

      // Enrich reservations with tenant SIRE data
      const enrichedReservations = (resData.reservations || []).map((res: AirbnbReservation) => ({
        ...res,
        tenant_hotel_code: hotelCode,
        tenant_city_code: cityCode,
      }))

      setReservations(enrichedReservations)

      // Fetch properties for filter
      const propsResponse = await fetch('/api/accommodations/units', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (propsResponse.ok) {
        const propsData = await propsResponse.json()
        setProperties(propsData.data || [])
      }
    } catch (err) {
      console.error('[AirbnbReservations] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter reservations
  const filteredReservations = reservations.filter((res) => {
    if (statusFilter !== 'all' && res.status.toLowerCase() !== statusFilter) {
      return false
    }
    if (propertyFilter !== 'all' && res.accommodation_unit_id !== propertyFilter) {
      return false
    }
    return true
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-pink-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando reservas de Airbnb...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2 text-center">
            Error al cargar reservas
          </h3>
          <p className="text-red-700 mb-4 text-center">{error}</p>
          <button
            onClick={loadData}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-rose-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Reservas de Airbnb</h1>
          </div>
          <p className="text-pink-100">
            {filteredReservations.length} reserva{filteredReservations.length !== 1 ? 's' : ''} futura{filteredReservations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtros:</span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="confirmed">Confirmadas</option>
              <option value="cancelled">Canceladas</option>
              <option value="completed">Completadas</option>
            </select>

            {/* Property Filter */}
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">Todas las propiedades</option>
              {properties.map((prop) => (
                <option key={prop.unit_id} value={prop.unit_id}>
                  {prop.name}
                </option>
              ))}
            </select>

            {/* Reset Filters */}
            {(statusFilter !== 'all' || propertyFilter !== 'all') && (
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setPropertyFilter('all')
                }}
                className="px-4 py-2 text-sm text-pink-600 hover:text-pink-700 font-medium"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredReservations.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay reservas
            </h3>
            <p className="text-gray-600">
              {statusFilter !== 'all' || propertyFilter !== 'all'
                ? 'No se encontraron reservas con los filtros seleccionados.'
                : 'No hay reservas futuras de Airbnb en este momento.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredReservations.map((reservation) => (
              <UnifiedReservationCard
                key={reservation.id}
                reservation={reservation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
