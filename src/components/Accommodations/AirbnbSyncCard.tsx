'use client'

import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'

interface SyncStats {
  totalFeeds: number
  activeFeeds: number
  lastSyncTime: string | null
  eventsImported: number
  failedSyncs: number
}

export default function AirbnbSyncCard() {
  const { tenant } = useTenant()
  const [stats, setStats] = useState<SyncStats>({
    totalFeeds: 0,
    activeFeeds: 0,
    lastSyncTime: null,
    eventsImported: 0,
    failedSyncs: 0,
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<'success' | 'error' | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (tenant?.tenant_id) {
      loadStats()
    }
  }, [tenant])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('staff_token')
      if (!token) return

      const response = await fetch('/api/calendar/feeds', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch feeds')

      const data = await response.json()
      const feeds = data.feeds || []

      const activeFeeds = feeds.filter((f: any) => f.is_active)
      const totalEvents = feeds.reduce((sum: number, f: any) => sum + (f.events_imported_total || 0), 0)
      const failedSyncs = feeds.reduce((sum: number, f: any) => sum + (f.failed_syncs || 0), 0)

      // Get most recent sync time
      const lastSync = feeds
        .filter((f: any) => f.last_sync_at)
        .sort((a: any, b: any) => new Date(b.last_sync_at).getTime() - new Date(a.last_sync_at).getTime())[0]

      setStats({
        totalFeeds: feeds.length,
        activeFeeds: activeFeeds.length,
        lastSyncTime: lastSync?.last_sync_at || null,
        eventsImported: totalEvents,
        failedSyncs,
      })
    } catch (error) {
      console.error('Failed to load sync stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      setLastSyncResult(null)

      const token = localStorage.getItem('staff_token')
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`/api/calendar/sync?tenant_id=${tenant?.tenant_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      const result = await response.json()

      setLastSyncResult(result.success ? 'success' : 'error')
      await loadStats()

      // Show notification
      if (result.success) {
        const newEvents = result.stats?.newEvents || 0
        const updatedEvents = result.stats?.updatedEvents || 0
        alert(`Sincronización exitosa!\n\nNuevos eventos: ${newEvents}\nActualizados: ${updatedEvents}`)
      }
    } catch (error) {
      console.error('Sync error:', error)
      setLastSyncResult('error')
      alert('Error en la sincronización. Por favor intenta de nuevo.')
    } finally {
      setIsSyncing(false)
    }
  }

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Nunca'

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Hace un momento'
    if (diffMins < 60) return `Hace ${diffMins} minutos`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`

    const diffDays = Math.floor(diffHours / 24)
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
  }

  if (isLoading) {
    return (
      <div className="p-6 rounded-lg border bg-white animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    )
  }

  if (stats.totalFeeds === 0) {
    return (
      <div className="p-6 rounded-lg border border-gray-200 bg-gray-50">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">Sincronización Airbnb</p>
            <p className="text-lg font-semibold text-gray-500 mt-2">No configurado</p>
          </div>
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Configura feeds de Airbnb para sincronizar automáticamente tus reservas
        </p>
        <a
          href="/accommodations/integrations"
          className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
        >
          Configurar ahora →
        </a>
      </div>
    )
  }

  const statusColor = stats.failedSyncs > 0 ? 'orange' : 'green'
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  }[statusColor]

  const StatusIcon = stats.failedSyncs > 0 ? AlertCircle : CheckCircle

  return (
    <div className={`p-6 rounded-lg border ${colorClasses} hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-80">Sincronización Airbnb</p>
          <p className="text-3xl font-bold mt-2">{stats.activeFeeds}</p>
        </div>
        <StatusIcon className="w-8 h-8 opacity-60" />
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs opacity-70">
          <span>Feeds activos:</span>
          <span className="font-medium">{stats.activeFeeds} de {stats.totalFeeds}</span>
        </div>
        <div className="flex justify-between text-xs opacity-70">
          <span>Eventos importados:</span>
          <span className="font-medium">{stats.eventsImported}</span>
        </div>
        <div className="flex justify-between text-xs opacity-70">
          <span>Última sincronización:</span>
          <span className="font-medium">{formatTimeAgo(stats.lastSyncTime)}</span>
        </div>
        {stats.failedSyncs > 0 && (
          <div className="flex justify-between text-xs text-orange-800 font-medium">
            <span>Fallos:</span>
            <span>{stats.failedSyncs}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            isSyncing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : statusColor === 'green'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-orange-600 text-white hover:bg-orange-700'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
        </button>

        {lastSyncResult && (
          <div className="flex items-center gap-1">
            {lastSyncResult === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-current/10">
        <a
          href="/accommodations/integrations"
          className="text-xs font-medium hover:underline flex items-center gap-1"
        >
          Configurar feeds →
        </a>
      </div>
    </div>
  )
}
