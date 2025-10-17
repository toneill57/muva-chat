'use client'

import { useEffect } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { SyncHistoryVisualization } from '@/components/integrations/motopress/SyncHistoryVisualization'
import { Clock, TrendingUp } from 'lucide-react'

export default function HistoryPage() {
  const { tenant } = useTenant()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-6 h-6 text-indigo-600" />
          Historial de Sincronización
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Analytics y registros de todas las sincronizaciones con MotoPress
        </p>
      </div>

      {/* Sync History Component */}
      {tenant?.tenant_id ? (
        <SyncHistoryVisualization
          tenantId={tenant.tenant_id}
          integrationType="motopress"
        />
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <TrendingUp className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">Cargando información del tenant</h3>
          <p className="text-yellow-700">
            Espera mientras se carga la información de tu hotel...
          </p>
        </div>
      )}
    </div>
  )
}
