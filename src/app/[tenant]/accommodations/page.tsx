'use client'

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import Link from 'next/link'
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Home,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle
} from 'lucide-react'

interface DashboardMetrics {
  totalFutureReservations: number
  checkInsToday: number
  checkInsTomorrow: number
  occupiedUnits: number
  totalUnits: number
  occupancyRate: number
  todayReservations: any[]
  tomorrowReservations: any[]
}

export default function AccommodationsDashboardPage() {
  const { tenant } = useTenant()
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalFutureReservations: 0,
    checkInsToday: 0,
    checkInsTomorrow: 0,
    occupiedUnits: 0,
    totalUnits: 0,
    occupancyRate: 0,
    todayReservations: [],
    tomorrowReservations: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (tenant?.tenant_id) {
      loadMetrics()
    }
  }, [tenant])

  const loadMetrics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get staff token from localStorage
      const token = localStorage.getItem('staff_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Fetch reservations
      const resResponse = await fetch('/api/reservations/list?future=true&status=active', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!resResponse.ok) throw new Error('Failed to fetch reservations')

      const resData = await resResponse.json()
      const reservations = resData.data?.reservations || []

      // Calculate dates
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

      // Filter reservations
      const checkInsToday = reservations.filter((r: any) => r.check_in_date === today)
      const checkInsTomorrow = reservations.filter((r: any) => r.check_in_date === tomorrow)

      // Calculate occupied units (check-in <= today <= check-out)
      const occupiedUnits = new Set(
        reservations
          .filter((r: any) => {
            const checkIn = r.check_in_date
            const checkOut = r.check_out_date
            return checkIn <= today && checkOut >= today
          })
          .map((r: any) => r.accommodation_unit_id)
          .filter(Boolean)
      ).size

      // Get total units
      const unitsResponse = await fetch(`/api/accommodations/units`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const unitsData = await unitsResponse.json()
      const totalUnits = unitsData.data?.length ?? 0

      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

      setMetrics({
        totalFutureReservations: reservations.length,
        checkInsToday: checkInsToday.length,
        checkInsTomorrow: checkInsTomorrow.length,
        occupiedUnits,
        totalUnits,
        occupancyRate,
        todayReservations: checkInsToday,
        tomorrowReservations: checkInsTomorrow
      })
    } catch (err) {
      console.error('[AccommodationsDashboard] Error loading metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setIsLoading(false)
    }
  }

  const StatCard = ({
    title,
    value,
    description,
    icon: Icon,
    color = 'blue',
    linkText,
    linkHref
  }: {
    title: string
    value: string | number
    description: string
    icon: any
    color?: string
    linkText?: string
    linkHref?: string
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    }[color] || 'bg-gray-50 text-gray-700 border-gray-200'

    return (
      <div className={`p-6 rounded-lg border ${colorClasses} hover:shadow-md transition-shadow`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium opacity-80">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          <Icon className="w-8 h-8 opacity-60" />
        </div>
        <p className="text-xs opacity-70 mb-3">{description}</p>
        {linkText && linkHref && (
          <Link
            href={linkHref}
            className="text-xs font-medium hover:underline flex items-center gap-1"
          >
            {linkText} →
          </Link>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando métricas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error al cargar métricas</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadMetrics}
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
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Reservas Futuras"
          value={metrics.totalFutureReservations}
          description="Total de reservas confirmadas"
          icon={Calendar}
          color="blue"
          linkText="Ver todas"
          linkHref="/accommodations/reservations"
        />

        <StatCard
          title="Check-ins Hoy"
          value={metrics.checkInsToday}
          description={`${metrics.checkInsToday} llegadas programadas`}
          icon={CalendarCheck}
          color="green"
          linkText="Ver detalles"
          linkHref="/accommodations/reservations?filter=today"
        />

        <StatCard
          title="Check-ins Mañana"
          value={metrics.checkInsTomorrow}
          description={`${metrics.checkInsTomorrow} llegadas programadas`}
          icon={CalendarClock}
          color="orange"
          linkText="Ver detalles"
          linkHref="/accommodations/reservations?filter=tomorrow"
        />

        <StatCard
          title="Ocupación Actual"
          value={`${metrics.occupancyRate}%`}
          description={`${metrics.occupiedUnits} de ${metrics.totalUnits} unidades ocupadas`}
          icon={Home}
          color="purple"
        />

        <StatCard
          title="Unidades Totales"
          value={metrics.totalUnits}
          description="Habitaciones disponibles"
          icon={Users}
          color="indigo"
          linkText="Ver unidades"
          linkHref="/accommodations/units"
        />

        <StatCard
          title="Gestión"
          value="MotoPress"
          description="Integración activa"
          icon={TrendingUp}
          color="green"
          linkText="Configurar"
          linkHref="/accommodations/integrations"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/accommodations/reservations"
          className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors group"
        >
          <Calendar className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-blue-900 mb-1">Ver Reservas</h3>
          <p className="text-sm text-blue-700">
            Gestiona todas las reservas confirmadas
          </p>
        </Link>

        <Link
          href="/accommodations/calendar"
          className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors group"
        >
          <CalendarDays className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-purple-900 mb-1">Vista Calendario</h3>
          <p className="text-sm text-purple-700">
            Visualiza ocupación mensual
          </p>
        </Link>

        <Link
          href="/accommodations/integrations"
          className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors group"
        >
          <TrendingUp className="w-6 h-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-green-900 mb-1">Sincronizar</h3>
          <p className="text-sm text-green-700">
            Sync manual con MotoPress
          </p>
        </Link>
      </div>

      {/* Today's Check-ins Preview */}
      {metrics.checkInsToday > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" />
            Check-ins de Hoy ({metrics.checkInsToday})
          </h3>
          <div className="space-y-2">
            {metrics.todayReservations.slice(0, 3).map((reservation: any) => (
              <div
                key={reservation.id}
                className="bg-white rounded-lg p-3 border border-green-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{reservation.guest_name}</p>
                    <p className="text-sm text-gray-600">
                      {reservation.accommodation_unit?.name || 'Unidad no asignada'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-700">
                      {reservation.check_in_time}
                    </p>
                    <p className="text-xs text-gray-500">
                      {reservation.adults} adultos
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {metrics.checkInsToday > 3 && (
              <Link
                href="/accommodations/reservations?filter=today"
                className="block text-center text-sm text-green-700 hover:text-green-900 font-medium pt-2"
              >
                Ver todas las llegadas de hoy →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
