'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Save, AlertCircle, CheckCircle, Home } from 'lucide-react'

interface AirbnbFeedConfig {
  id?: string
  property_id: string
  property_name: string
  feed_url: string
  is_active: boolean
}

interface AirbnbConfigPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  onConfigComplete?: () => void
}

export function AirbnbConfigPanel({
  open,
  onOpenChange,
  tenantId,
  onConfigComplete
}: AirbnbConfigPanelProps) {
  const [feeds, setFeeds] = useState<AirbnbFeedConfig[]>([])
  const [accommodationUnits, setAccommodationUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (open && tenantId) {
      loadExistingFeeds()
      loadAccommodationUnits()
    }
  }, [open, tenantId])

  const loadAccommodationUnits = async () => {
    try {
      const token = localStorage.getItem('staff_token')
      if (!token) return

      const response = await fetch('/api/accommodations/units', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setAccommodationUnits(data.data || [])
      }
    } catch (err) {
      console.error('Failed to load accommodation units:', err)
    }
  }

  const loadExistingFeeds = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('staff_token')
      if (!token) return

      const response = await fetch('/api/calendar/feeds', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        const airbnbFeeds = (data.feeds || [])
          .filter((f: any) => f.source_platform === 'airbnb')
          .map((f: any) => ({
            id: f.id,
            property_id: f.accommodation_unit_id,
            property_name: f.feed_name || f.accommodation_unit_id,
            feed_url: f.feed_url,
            is_active: f.is_active
          }))
        setFeeds(airbnbFeeds)
      }
    } catch (err) {
      console.error('Failed to load feeds:', err)
      setError('Error al cargar configuración existente')
    } finally {
      setLoading(false)
    }
  }

  const addFeed = () => {
    setFeeds([...feeds, {
      property_id: '',
      property_name: '',
      feed_url: '',
      is_active: true
    }])
  }

  const removeFeed = (index: number) => {
    setFeeds(feeds.filter((_, i) => i !== index))
  }

  const updateFeed = (index: number, field: keyof AirbnbFeedConfig, value: any) => {
    const updated = [...feeds]
    updated[index] = { ...updated[index], [field]: value }

    // If property_id changed, update property_name
    if (field === 'property_id') {
      const unit = accommodationUnits.find(u => u.id === value)
      if (unit) {
        updated[index].property_name = unit.name
      }
    }

    setFeeds(updated)
  }

  const saveConfiguration = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const token = localStorage.getItem('staff_token')
      if (!token) {
        setError('No hay token de autenticación')
        return
      }

      // Validate feeds
      for (const feed of feeds) {
        if (!feed.property_id || !feed.feed_url) {
          setError('Todos los campos son obligatorios')
          return
        }

        // Validate URL format
        if (!feed.feed_url.includes('airbnb.com') || !feed.feed_url.includes('.ics')) {
          setError('URL inválida. Debe ser un enlace de calendario de Airbnb (.ics)')
          return
        }
      }

      // Save each feed
      for (const feed of feeds) {
        const method = feed.id ? 'PATCH' : 'POST'
        const url = '/api/calendar/feeds'

        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: feed.id,
            tenant_id: tenantId,
            property_id: feed.property_id,
            source: 'airbnb',
            feed_url: feed.feed_url,
            is_active: feed.is_active,
            sync_frequency: 3600 // 1 hour
          })
        })

        if (!response.ok) {
          throw new Error('Error al guardar configuración')
        }
      }

      setSuccess('Configuración guardada exitosamente')
      setTimeout(() => {
        onConfigComplete?.()
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-red-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Configurar Airbnb</h2>
              <p className="text-pink-100 text-sm mt-1">
                Sincroniza tus calendarios de Airbnb
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Cómo obtener tu enlace de calendario:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Ve a tu listado en Airbnb</li>
              <li>Haz clic en "Calendario" en el menú</li>
              <li>Selecciona "Disponibilidad" → "Sincronizar calendarios"</li>
              <li>Copia el "Enlace del calendario de exportación"</li>
              <li>Pega el enlace aquí abajo</li>
            </ol>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {/* Feed List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-600 mt-4">Cargando...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feeds.map((feed, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      Feed #{index + 1}
                    </h3>
                    <button
                      onClick={() => removeFeed(index)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Property Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Propiedad / Habitación
                      </label>
                      <select
                        value={feed.property_id}
                        onChange={(e) => updateFeed(index, 'property_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      >
                        <option value="">Selecciona una propiedad...</option>
                        {accommodationUnits.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} {unit.unit_type ? `(${unit.unit_type})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Feed URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL del Calendario ICS
                      </label>
                      <input
                        type="url"
                        value={feed.feed_url}
                        onChange={(e) => updateFeed(index, 'feed_url', e.target.value)}
                        placeholder="https://www.airbnb.com/calendar/ical/..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono text-sm"
                      />
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={feed.is_active}
                        onChange={(e) => updateFeed(index, 'is_active', e.target.checked)}
                        className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                      />
                      <label className="text-sm text-gray-700">
                        Sincronización activa
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Feed Button */}
              <button
                onClick={addFeed}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-pink-500 hover:text-pink-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Agregar otro feed</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={saveConfiguration}
              disabled={saving || feeds.length === 0}
              className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
