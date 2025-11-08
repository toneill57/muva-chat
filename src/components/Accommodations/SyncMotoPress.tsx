'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react'

interface SyncMotoPressProps {
  tenantId: string
  onSyncComplete?: () => void
}

interface ProgressEvent {
  type: 'progress' | 'complete' | 'error'
  current?: number
  total?: number
  message?: string
  data?: any
}

export function SyncMotoPress({ tenantId, onSyncComplete }: SyncMotoPressProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' })
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
      setShowModal(true)
      setSyncResult(null)
      setProgress({ current: 0, total: 0, message: 'Iniciando sincronización...' })

      // Get staff token from localStorage
      const token = localStorage.getItem('staff_token')
      if (!token) {
        setSyncResult({
          success: false,
          message: '❌ Not authenticated - please login again'
        })
        setIsSyncing(false)
        setShowModal(false)
        return
      }

      // Use EventSource for Server-Sent Events (SSE)
      const eventSource = new EventSource(
        `/api/integrations/motopress/sync?tenant_id=${tenantId}&token=${token}`
      )

      eventSource.onmessage = (event) => {
        const data: ProgressEvent = JSON.parse(event.data)

        if (data.type === 'progress') {
          setProgress({
            current: data.current || 0,
            total: data.total || 0,
            message: data.message || 'Sincronizando...'
          })
        } else if (data.type === 'complete') {
          setLastSyncTime(new Date())
          setCooldownRemaining(60) // 60 second cooldown
          setSyncResult({
            success: true,
            message: `✅ Sincronización exitosa: ${data.data?.created || 0} creadas, ${data.data?.updated || 0} actualizadas`,
            data: data.data
          })
          setProgress({
            current: 100,
            total: 100,
            message: '✅ Completado'
          })
          eventSource.close()
          setIsSyncing(false)

          // Call callback after 2 seconds
          if (onSyncComplete) {
            setTimeout(onSyncComplete, 2000)
          }

          // Auto-close modal after 3 seconds
          setTimeout(() => {
            setShowModal(false)
          }, 3000)
        } else if (data.type === 'error') {
          setSyncResult({
            success: false,
            message: `❌ Error: ${data.message || 'Sync failed'}`
          })
          setProgress({
            current: 0,
            total: 0,
            message: `❌ ${data.message || 'Error'}`
          })
          eventSource.close()
          setIsSyncing(false)
        }
      }

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error)
        setSyncResult({
          success: false,
          message: `❌ Error de conexión durante sincronización`
        })
        setProgress({
          current: 0,
          total: 0,
          message: '❌ Error de conexión'
        })
        eventSource.close()
        setIsSyncing(false)
      }
    } catch (error) {
      console.error('Sync error:', error)
      setSyncResult({
        success: false,
        message: `❌ Error de conexión: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      setIsSyncing(false)
      setShowModal(false)
    }
  }

  const canSync = cooldownRemaining === 0 && !isSyncing

  const progressPercentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <>
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

      {/* Progress Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Sincronizando Alojamientos
              </h3>
              {!isSyncing && (
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{progress.message}</span>
                <span className="font-semibold text-blue-600">
                  {progressPercentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              {progress.total > 0 && (
                <p className="text-xs text-gray-500 text-center">
                  {progress.current} de {progress.total} alojamientos
                </p>
              )}
            </div>

            {/* Status Icon */}
            <div className="flex items-center justify-center py-4">
              {isSyncing ? (
                <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
              ) : syncResult?.success ? (
                <CheckCircle className="w-12 h-12 text-green-500" />
              ) : (
                <AlertCircle className="w-12 h-12 text-red-500" />
              )}
            </div>

            {/* Result Message */}
            {syncResult && (
              <div className="text-center">
                <p className={`text-sm font-medium ${
                  syncResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {syncResult.message}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
