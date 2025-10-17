'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar as BigCalendar, momentLocalizer, View, Event } from 'react-big-calendar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { AlertCircle, Calendar, X, User, Home, Phone, Mail } from 'lucide-react'

// Configure date-fns localizer
const localizer = momentLocalizer(require('moment'))

interface Reservation {
  id: string
  guest_name: string
  guest_email: string | null
  phone_full: string
  check_in_date: string
  check_out_date: string
  status: string
  accommodation_unit: {
    id: string
    name: string
  } | null
  adults: number
  children: number
  total_price: number | null
  currency: string
  booking_source: string
}

interface CalendarEvent extends Event {
  id: string
  title: string
  start: Date
  end: Date
  resource: Reservation
}

export default function CalendarViewPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [view, setView] = useState<View>('month')

  useEffect(() => {
    loadReservations()
  }, [])

  const loadReservations = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get authentication token
      const token = localStorage.getItem('staff_token')

      // Fetch all reservations (not just future)
      const response = await fetch('/api/reservations/list?future=false', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      if (data.success) {
        setReservations(data.data.reservations || [])
      } else {
        throw new Error(data.error || 'Failed to load')
      }
    } catch (err) {
      console.error('[CalendarView] Error:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  // Transform reservations to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return reservations.map((reservation) => {
      // Parse YYYY-MM-DD dates
      const [inYear, inMonth, inDay] = reservation.check_in_date.split('-').map(Number)
      const [outYear, outMonth, outDay] = reservation.check_out_date.split('-').map(Number)

      const start = new Date(inYear, inMonth - 1, inDay)
      const end = new Date(outYear, outMonth - 1, outDay)

      return {
        id: reservation.id,
        title: `${reservation.guest_name} - ${reservation.accommodation_unit?.name || 'Sin unidad'}`,
        start,
        end,
        resource: reservation
      }
    })
  }, [reservations])

  // Event style based on status
  const eventStyleGetter = (event: CalendarEvent) => {
    const status = event.resource.status
    let backgroundColor = '#3b82f6' // blue (active)

    if (status === 'cancelled') {
      backgroundColor = '#ef4444' // red
    } else if (status === 'completed') {
      backgroundColor = '#10b981' // green
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.875rem',
        padding: '2px 5px'
      }
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
  }

  const formatPrice = (price: number | null, currency: string): string => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      minimumFractionDigits: 0
    }).format(price)
  }

  const formatDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`
  }

  if (isLoading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando calendario...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error al cargar calendario</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadReservations}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-600" />
            Vista Calendario
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {reservations.length} reservas en total
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-gray-700">Confirmada</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-gray-700">Completada</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span className="text-gray-700">Cancelada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg border border-gray-200 p-6" style={{ minHeight: '600px' }}>
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%', minHeight: 500 }}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day', 'agenda']}
          view={view}
          onView={setView}
          messages={{
            next: 'Siguiente',
            previous: 'Anterior',
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            agenda: 'Agenda',
            date: 'Fecha',
            time: 'Hora',
            event: 'Reserva',
            noEventsInRange: 'No hay reservas en este rango',
            showMore: (total) => `+ Ver ${total} más`
          }}
        />
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Detalles de Reserva</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Guest Info */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-gray-900">Información del Huésped</h4>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-lg font-medium text-gray-900">{selectedEvent.resource.guest_name}</p>
                  {selectedEvent.resource.guest_email && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {selectedEvent.resource.guest_email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {selectedEvent.resource.phone_full}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-gray-900">Fechas</h4>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Check-in</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(selectedEvent.resource.check_in_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Check-out</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(selectedEvent.resource.check_out_date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Accommodation */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Home className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-gray-900">Alojamiento</h4>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-900">
                    {selectedEvent.resource.accommodation_unit?.name || 'Sin asignar'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedEvent.resource.adults} adulto{selectedEvent.resource.adults !== 1 ? 's' : ''}
                    {selectedEvent.resource.children > 0 &&
                      `, ${selectedEvent.resource.children} niño${selectedEvent.resource.children !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
              </div>

              {/* Price & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Precio Total</p>
                  <p className="font-medium text-gray-900">
                    {formatPrice(selectedEvent.resource.total_price, selectedEvent.resource.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Fuente</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {selectedEvent.resource.booking_source}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
