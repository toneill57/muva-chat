'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import {
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Settings,
  RefreshCw,
  Clock,
  Home,
  Upload
} from 'lucide-react'
import { SyncMotoPress } from '@/components/Accommodations/SyncMotoPress'
import { MotoPressPanelDialog } from '@/components/integrations/motopress/MotoPressPanelDialog'

interface IntegrationStatus {
  connected: boolean
  last_sync?: string
  accommodations_count?: number
  is_active: boolean
  error?: string
}

export default function IntegrationsPage() {
  const { tenant } = useTenant()
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    checkIntegrationStatus()
  }, [tenant])

  const checkIntegrationStatus = async () => {
    try {
      setLoading(true)

      // Check if configuration exists
      const configResponse = await fetch(`/api/integrations/motopress/configure?tenant_id=${tenant?.tenant_id}`)
      const configData = await configResponse.json()

      if (!configData.exists) {
        setStatus({ connected: false, is_active: false })
        return
      }

      // Test connection
      const testResponse = await fetch('/api/integrations/motopress/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenant?.tenant_id })
      })
      const testData = await testResponse.json()

      setStatus({
        connected: testData.connected,
        accommodations_count: testData.accommodations_count,
        last_sync: configData.config?.last_sync_at,
        is_active: configData.config?.is_active || false,
        error: testData.error
      })
    } catch (error) {
      console.error('Failed to check integration status:', error)
      setStatus({ connected: false, is_active: false, error: 'Failed to check status' })
    } finally {
      setLoading(false)
    }
  }

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Nunca'
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) return 'Hace menos de 1 hora'
    if (diffHours < 24) return `Hace ${diffHours} horas`
    const diffDays = Math.floor(diffHours / 24)
    return `Hace ${diffDays} días`
  }

  const getStatusBadge = () => {
    if (loading) return <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full border border-gray-300">Verificando...</span>
    if (!status) return <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-300">Error</span>
    if (!status.is_active) return <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full border border-gray-300">No configurado</span>
    if (status.connected) return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-300 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Conectado</span>
    return <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-300 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Desconectado</span>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <LinkIcon className="w-6 h-6 text-green-600" />
          Integraciones Externas
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Sincroniza datos desde plataformas externas
        </p>
      </div>

      {/* MotoPress Integration Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">MotoPress Hotel Booking</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Importa y sincroniza habitaciones y reservas automáticamente
                </p>
                <div className="mt-2">
                  {getStatusBadge()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6">
          {/* Status Details */}
          {status?.is_active && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-gray-900">Unidades Disponibles</h4>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {status.accommodations_count || '0'}
                </p>
                <p className="text-xs text-gray-600 mt-1">Habitaciones detectadas</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-gray-900">Última Sincronización</h4>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatLastSync(status.last_sync)}
                </p>
                <p className="text-xs text-gray-600 mt-1">Actualización automática</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-gray-900">Estado</h4>
                </div>
                <p className="text-lg font-semibold text-green-700">
                  {status.connected ? 'Operativo' : 'Error de conexión'}
                </p>
                <p className="text-xs text-gray-600 mt-1">Sistema activo</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {status?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Error de Conexión</p>
                <p className="text-sm text-red-700 mt-1">{status.error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setPanelOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-md"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">
                {status?.is_active ? 'Reconfigurar' : 'Configurar Integración'}
              </span>
            </button>

            {status?.is_active && status?.connected && (
              <SyncMotoPress
                tenantId={tenant?.tenant_id || ''}
                onSyncComplete={checkIntegrationStatus}
              />
            )}

            <button
              onClick={checkIntegrationStatus}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Verificar Estado</span>
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">¿Cómo funciona?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Conecta tu sitio WordPress con MotoPress Hotel Booking Plugin</li>
              <li>• Sincronización automática de habitaciones y reservas</li>
              <li>• Generación automática de embeddings para búsqueda inteligente</li>
              <li>• Actualizaciones en tiempo real vía webhooks (próximamente)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Placeholder: Future Integrations */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
        <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Más Integraciones Próximamente</h3>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Estamos trabajando en soporte para Airbnb, Booking.com, y otras plataformas de gestión hotelera.
        </p>
      </div>

      {/* MotoPress Panel Modal */}
      {tenant?.tenant_id && (
        <MotoPressPanelDialog
          open={panelOpen}
          onOpenChange={setPanelOpen}
          tenantId={tenant.tenant_id}
          onSyncComplete={checkIntegrationStatus}
        />
      )}
    </div>
  )
}
