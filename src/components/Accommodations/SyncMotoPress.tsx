'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

interface SyncMotoPressProps {
  tenantId: string
  onSyncComplete?: () => void
}

export function SyncMotoPress({ tenantId, onSyncComplete }: SyncMotoPressProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [syncResult, setSyncResult] = useState<{
    success: boolean
    message: string
    data?: any
  } | null>(null)

  // Cooldown timer (60 seconds)
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(cooldownRemaining - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownRemaining])

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      setSyncResult(null)

      // Get staff token from localStorage
      const token = localStorage.getItem('staff_token')
      if (!token) {
        setSyncResult({
          success: false,
          message: '❌ Not authenticated - please login again'
        })
        setIsSyncing(false)
        return
      }

      const response = await fetch('/api/integrations/motopress/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tenant_id: tenantId })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setLastSyncTime(new Date())
        setCooldownRemaining(60) // 60 second cooldown
        setSyncResult({
          success: true,
          message: `✅ Sincronización exitosa: ${result.data.created} creadas, ${result.data.updated} actualizadas`,
          data: result.data
        })

        // Call callback after 2 seconds to allow user to see the message
        if (onSyncComplete) {
          setTimeout(onSyncComplete, 2000)
        }
      } else {
        setSyncResult({
          success: false,
          message: `❌ Error: ${result.message || 'Sync failed'}`
        })
      }
    } catch (error) {
      console.error('Sync error:', error)
      setSyncResult({
        success: false,
        message: `❌ Error de conexión: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const canSync = cooldownRemaining === 0 && !isSyncing

  return (
    <div className="space-y-3">
      <button
        onClick={handleSync}
        disabled={!canSync}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          canSync
            ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
        title={
          cooldownRemaining > 0
            ? `Espera ${cooldownRemaining}s antes de sincronizar nuevamente`
            : isSyncing
            ? 'Sincronizando...'
            : 'Sincronizar reservas desde MotoPress'
        }
      >
        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium">
          {isSyncing
            ? 'Sincronizando...'
            : cooldownRemaining > 0
            ? `Espera ${cooldownRemaining}s`
            : 'Sincronizar MotoPress'}
        </span>
      </button>

      {/* Sync Result Message */}
      {syncResult && (
        <div
          className={`p-3 rounded-lg border flex items-start gap-2 ${
            syncResult.success
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {syncResult.success ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{syncResult.message}</p>
            {syncResult.data && syncResult.data.errors && syncResult.data.errors.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer hover:underline">
                  Ver errores ({syncResult.data.errors.length})
                </summary>
                <ul className="mt-1 text-xs space-y-1">
                  {syncResult.data.errors.slice(0, 5).map((error: string, idx: number) => (
                    <li key={idx} className="ml-4">
                      • {error}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Last Sync Time */}
      {lastSyncTime && (
        <p className="text-xs text-gray-500">
          Última sincronización: {lastSyncTime.toLocaleTimeString('es-ES')}
        </p>
      )}
    </div>
  )
}
