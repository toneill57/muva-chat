'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Settings,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Upload,
  Clock,
  ChevronDown,
  ChevronRight,
  Zap
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface AccommodationPreviewItem {
  id: number
  name: string
  capacity: number
  price?: number
  status: string
  description_preview: string
  isNew?: boolean
}

interface SyncHistoryItem {
  id: string
  started_at: string
  completed_at: string
  status: string
  records_created: number
  records_updated: number
  error_message?: string
}

interface SyncProgress {
  status: string
  processed: number
  total: number
  created: number
  updated: number
  errors: number
}

interface FullSyncProgress {
  current: number
  total: number
  message: string
}

interface FullSyncStats {
  total: number
  created: number
  updated: number
  errors: number
  accommodations?: number
  reservations?: number
}

interface MotoPressPanelContentProps {
  tenantId: string
  onClose: () => void
  onSyncComplete?: () => void
}

export function MotoPressPanelContent({
  tenantId,
  onClose,
  onSyncComplete
}: MotoPressPanelContentProps) {
  // Section visibility
  const [configOpen, setConfigOpen] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Configuration state
  const [formData, setFormData] = useState({ api_key: '', api_secret: '', site_url: '' })
  const [showApiKey, setShowApiKey] = useState(false)
  const [showApiSecret, setShowApiSecret] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [connectionMessage, setConnectionMessage] = useState('')

  // Preview state
  const [accommodations, setAccommodations] = useState<AccommodationPreviewItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Sync state
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [syncMessage, setSyncMessage] = useState('')
  const [forceEmbeddings, setForceEmbeddings] = useState(true) // ✅ Default TRUE - always regenerate embeddings

  // History state
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Full Sync state (SSE for accommodations + reservations)
  const [fullSyncing, setFullSyncing] = useState(false)
  const [showFullSyncModal, setShowFullSyncModal] = useState(false)
  const [fullSyncProgress, setFullSyncProgress] = useState<FullSyncProgress>({ current: 0, total: 0, message: '' })
  const [fullSyncStats, setFullSyncStats] = useState<FullSyncStats | null>(null)
  const [fullSyncError, setFullSyncError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Load existing configuration on mount
  useEffect(() => {
    loadExistingConfig()
    // Don't auto-load sync history - only load when user opens History section
  }, [tenantId])

  // Load sync history when History section is opened
  useEffect(() => {
    if (historyOpen) {
      loadSyncHistory()
    }
  }, [historyOpen])

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const loadExistingConfig = async () => {
    try {
      const token = localStorage.getItem('staff_token')
      if (!token) {
        console.warn('[MotoPressPanelContent] No authentication token found')
        return
      }

      const response = await fetch(`/api/integrations/motopress/configure?tenant_id=${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()

      if (data.exists && data.config) {
        setFormData(prev => ({
          ...prev,
          site_url: data.config.site_url || ''
        }))

        // Don't auto-test - user needs to provide credentials first
        // testConnection(true)
      }
    } catch (error) {
      console.error('Failed to load configuration:', error)
    }
  }

  const testConnection = async (isAutoTest = false) => {
    if (!isAutoTest && (!formData.api_key || !formData.api_secret || !formData.site_url)) {
      setConnectionMessage('Please provide API key, API secret, and site URL')
      setConnectionStatus('error')
      return
    }

    try {
      const token = localStorage.getItem('staff_token')
      if (!token) {
        setConnectionMessage('Not authenticated - please login again')
        setConnectionStatus('error')
        return
      }

      setConnectionStatus('testing')
      setConnectionMessage('Testing connection...')

      console.log('[MotoPressPanelContent] Testing connection with:', {
        site_url: formData.site_url,
        has_api_key: !!formData.api_key,
        has_api_secret: !!formData.api_secret
      })

      const response = await fetch('/api/integrations/motopress/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          ...(formData.api_key && { api_key: formData.api_key }),
          ...(formData.api_secret && { consumer_secret: formData.api_secret }),
          ...(formData.site_url && { site_url: formData.site_url })
        })
      })

      console.log('[MotoPressPanelContent] Response status:', response.status)
      const result = await response.json()
      console.log('[MotoPressPanelContent] Response data:', result)

      if (result.connected) {
        setConnectionStatus('success')
        setConnectionMessage(`Connected! Found ${result.accommodations_count || 0} accommodations`)

        // Don't auto-load preview - wait for user to save configuration first
        // setTimeout(() => {
        //   loadAccommodationsPreview()
        //   setPreviewOpen(true)
        // }, 500)
      } else {
        setConnectionStatus('error')
        setConnectionMessage(result.error || 'Connection failed')
      }
    } catch (error) {
      setConnectionStatus('error')
      setConnectionMessage('Network error - failed to test connection')
    }
  }

  const saveConfiguration = async () => {
    if (connectionStatus !== 'success') {
      setConnectionMessage('Please test the connection first')
      return
    }

    try {
      const token = localStorage.getItem('staff_token')
      if (!token) {
        setConnectionMessage('Not authenticated - please login again')
        setConnectionStatus('error')
        return
      }

      const response = await fetch('/api/integrations/motopress/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          api_key: formData.api_key,
          consumer_secret: formData.api_secret,
          site_url: formData.site_url,
          is_active: true
        })
      })

      const result = await response.json()

      if (result.success) {
        setConnectionMessage('Configuration saved successfully!')

        // Auto-load preview after successful save
        setTimeout(() => {
          loadAccommodationsPreview()
          setPreviewOpen(true)
        }, 500)
      } else {
        setConnectionMessage(result.error || 'Failed to save configuration')
        setConnectionStatus('error')
      }
    } catch (error) {
      setConnectionMessage('Failed to save configuration')
      setConnectionStatus('error')
    }
  }

  const loadAccommodationsPreview = async () => {
    try {
      setLoadingPreview(true)

      const token = localStorage.getItem('staff_token')
      if (!token) {
        setConnectionMessage('Not authenticated - please login again')
        setConnectionStatus('error')
        setLoadingPreview(false)
        return
      }

      const response = await fetch(
        `/api/integrations/motopress/accommodations?tenant_id=${tenantId}&preview=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Backend already provides accommodation data - just use it
      const accommodations = data.accommodations || []
      setAccommodations(accommodations)

      // Pre-select all accommodations by default (backend can mark isNew if needed)
      const allIds = new Set<number>(
        accommodations.map((acc: AccommodationPreviewItem) => acc.id)
      )
      setSelectedIds(allIds)

    } catch (error: any) {
      console.error('Failed to load accommodations:', error)
      setConnectionMessage(error.message || 'Failed to load accommodations')
      setConnectionStatus('error')
    } finally {
      setLoadingPreview(false)
    }
  }

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === accommodations.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(accommodations.map(acc => acc.id)))
    }
  }

  const startSync = async () => {
    if (selectedIds.size === 0) {
      setSyncMessage('Please select at least one accommodation to import')
      return
    }

    try {
      const token = localStorage.getItem('staff_token')
      if (!token) {
        setSyncMessage('Not authenticated - please login again')
        return
      }

      setSyncing(true)
      setSyncOpen(true)
      setSyncMessage('Starting sync...')
      setSyncProgress({ status: 'starting', processed: 0, total: selectedIds.size, created: 0, updated: 0, errors: 0 })

      const response = await fetch('/api/integrations/motopress/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          selected_ids: Array.from(selectedIds),
          force_embeddings: forceEmbeddings
        })
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      // Poll for progress
      pollSyncProgress()

    } catch (error: any) {
      setSyncMessage(error.message || 'Sync failed')
      setSyncProgress(prev => prev ? { ...prev, status: 'error' } : null)
      setSyncing(false)
    }
  }

  const pollSyncProgress = async () => {
    const token = localStorage.getItem('staff_token')
    if (!token) {
      setSyncMessage('Not authenticated')
      setSyncing(false)
      return
    }

    let pollCount = 0
    const pollInterval = setInterval(async () => {
      try {
        pollCount++

        const response = await fetch(
          `/api/integrations/motopress/sync/progress?tenant_id=${tenantId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )
        const data = await response.json()

        // Update progress - if API doesn't return progress, show simulated progress
        if (data.processed !== undefined && data.total !== undefined) {
          setSyncProgress(data)
        } else {
          // Simulated progress based on poll count (prevents 0/0/0 display)
          setSyncProgress(prev => ({
            status: 'processing',
            processed: Math.min(pollCount * 2, selectedIds.size),
            total: selectedIds.size,
            created: data.created || prev?.created || 0,
            updated: data.updated || prev?.updated || 0,
            errors: data.errors || prev?.errors || 0
          }))
        }

        setSyncMessage(data.message || 'Sincronizando...')

        // Check for completion: 'success', 'partial_success', or 'error'
        const isCompleted = data.status === 'success' || data.status === 'partial_success' || data.status === 'error'

        if (isCompleted) {
          clearInterval(pollInterval)
          setSyncing(false)

          if (data.status === 'success' || data.status === 'partial_success') {
            const syncDetails = data.sync_details || {}
            const created = syncDetails.records_created || data.created || 0
            const updated = syncDetails.records_updated || data.updated || 0

            // Update final progress
            setSyncProgress({
              status: 'success',
              processed: selectedIds.size,
              total: selectedIds.size,
              created,
              updated,
              errors: data.errors || 0
            })

            setSyncMessage(`✅ Sync completado! ${created} creados, ${updated} actualizados`)

            // Auto-close after 2 seconds
            setTimeout(() => {
              onClose()
              onSyncComplete?.()
            }, 2000)
          } else {
            setSyncMessage(`❌ Sync failed: ${data.sync_details?.error_message || 'Unknown error'}`)
          }

          // Reload history
          loadSyncHistory()
        }
      } catch (error) {
        clearInterval(pollInterval)
        setSyncing(false)
        setSyncMessage('Failed to get sync progress')
      }
    }, 2000)
  }

  const handleFullSync = async () => {
    try {
      const token = localStorage.getItem('staff_token')
      if (!token) {
        setFullSyncError('No authentication token found')
        return
      }

      setFullSyncing(true)
      setFullSyncError(null)
      setFullSyncStats(null)
      setFullSyncProgress({ current: 0, total: 0, message: 'Iniciando sincronización completa...' })
      setShowFullSyncModal(true)

      // Close any existing EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const eventSource = new EventSource(
        `/api/integrations/motopress/sync-all?tenant_id=${tenantId}&token=${encodeURIComponent(token)}`
      )
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'progress') {
            setFullSyncProgress({
              current: data.current || 0,
              total: data.total || 0,
              message: data.message || ''
            })
          } else if (data.type === 'complete') {
            // Success!
            setFullSyncStats(data.stats)
            setFullSyncProgress({
              current: data.stats.total || 0,
              total: data.stats.total || 0,
              message: 'Sincronización completada exitosamente'
            })

            eventSource.close()
            eventSourceRef.current = null
            setFullSyncing(false)

            // Reload sync history and close modal after 3 seconds
            loadSyncHistory()
            setTimeout(() => {
              setShowFullSyncModal(false)
              onSyncComplete?.()
            }, 3000)
          } else if (data.type === 'error') {
            setFullSyncError(data.message)
            setFullSyncProgress({
              current: 0,
              total: 0,
              message: `Error: ${data.message}`
            })
            eventSource.close()
            eventSourceRef.current = null
            setFullSyncing(false)
          }
        } catch (err) {
          console.error('[SSE] Parse error:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('[SSE] Connection error:', err)
        setFullSyncError('Error de conexión durante la sincronización')
        setFullSyncProgress({
          current: 0,
          total: 0,
          message: 'Error de conexión'
        })
        eventSource.close()
        eventSourceRef.current = null
        setFullSyncing(false)
      }
    } catch (error: any) {
      setFullSyncError(error.message || 'Error al iniciar sincronización')
      setFullSyncing(false)
    }
  }

  const loadSyncHistory = async () => {
    try {
      setLoadingHistory(true)

      const token = localStorage.getItem('staff_token')
      if (!token) {
        console.warn('[MotoPressPanelContent] No token for sync history')
        setLoadingHistory(false)
        return
      }

      const response = await fetch(
        `/api/integrations/motopress/sync?tenant_id=${tenantId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      const data = await response.json()

      if (data.history) {
        setSyncHistory(data.history.slice(0, 5)) // Last 5 syncs
      }
    } catch (error) {
      console.error('Failed to load sync history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Section 1: Configuration */}
      <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <div className="w-full cursor-pointer">
              <CardHeader className="hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {configOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <Settings className="w-5 h-5 text-blue-600" />
                    <CardTitle>Configuración</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon()}
                  </div>
                </div>
              </CardHeader>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="site_url">Site URL</Label>
                <Input
                  id="site_url"
                  type="url"
                  placeholder="https://your-site.com"
                  value={formData.site_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, site_url: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_key">API Key (Consumer Key)</Label>
                <div className="relative">
                  <Input
                    id="api_key"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="ck_..."
                    value={formData.api_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_secret">Consumer Secret</Label>
                <div className="relative">
                  <Input
                    id="api_secret"
                    type={showApiSecret ? 'text' : 'password'}
                    placeholder="cs_..."
                    value={formData.api_secret}
                    onChange={(e) => setFormData(prev => ({ ...prev, api_secret: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiSecret(!showApiSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {connectionMessage && (
                <Alert variant={connectionStatus === 'error' ? 'destructive' : 'default'}>
                  {getStatusIcon()}
                  <AlertDescription>{connectionMessage}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => testConnection(false)}
                  disabled={connectionStatus === 'testing' || !formData.api_key || !formData.api_secret || !formData.site_url}
                >
                  {connectionStatus === 'testing' ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>

                {connectionStatus === 'success' && formData.api_key && formData.api_secret && (
                  <Button onClick={saveConfiguration}>
                    <Settings className="w-4 h-4 mr-2" />
                    Save Configuration
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Section 2: Preview */}
      {connectionStatus === 'success' && (
        <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <div className="w-full cursor-pointer">
                <CardHeader className="hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {previewOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      <Upload className="w-5 h-5 text-green-600" />
                      <CardTitle>Vista Previa</CardTitle>
                      <Badge variant="outline">
                        {selectedIds.size} de {accommodations.length} seleccionados
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="space-y-4 pt-2">
                {loadingPreview ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Cargando alojamientos...
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.size === accommodations.length && accommodations.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                        <span className="text-sm font-medium">Seleccionar Todos</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={loadAccommodationsPreview}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Actualizar
                      </Button>
                    </div>

                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {accommodations.map((accommodation) => (
                          <Card key={accommodation.id} className="p-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedIds.has(accommodation.id)}
                                onCheckedChange={() => toggleSelection(accommodation.id)}
                                className="mt-1"
                              />

                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-medium text-sm">{accommodation.name}</h4>
                                    <p className="text-xs text-gray-600 line-clamp-1">
                                      {accommodation.description_preview}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    {accommodation.isNew && (
                                      <Badge variant="default" className="bg-green-500 text-xs">
                                        Nuevo
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      {accommodation.capacity} huéspedes
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Section 3: Sync */}
      {selectedIds.size > 0 && (
        <Collapsible open={syncOpen} onOpenChange={setSyncOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <div className="w-full cursor-pointer">
                <CardHeader className="hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {syncOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                      <CardTitle>Sincronización</CardTitle>
                    </div>
                  </div>
                </CardHeader>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-center space-x-2 pb-2">
                  <Checkbox
                    id="force-embeddings"
                    checked={forceEmbeddings}
                    onCheckedChange={(checked) => setForceEmbeddings(checked as boolean)}
                  />
                  <Label htmlFor="force-embeddings" className="text-sm font-medium cursor-pointer">
                    🔄 Regenerar todos los embeddings (incluye unidades ya existentes)
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={startSync}
                    disabled={syncing || fullSyncing || selectedIds.size === 0}
                    className="flex-1"
                  >
                    {syncing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {syncing ? 'Sincronizando...' : `Importar ${selectedIds.size} seleccionados`}
                  </Button>

                  <Button
                    onClick={handleFullSync}
                    disabled={syncing || fullSyncing}
                    variant="default"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {fullSyncing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    {fullSyncing ? 'Sincronizando...' : 'Importar todo + reservas'}
                  </Button>
                </div>

                {syncProgress && (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(syncProgress.processed / syncProgress.total) * 100}%`
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{syncProgress.created}</div>
                        <div className="text-xs text-gray-600">Creados</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">{syncProgress.updated}</div>
                        <div className="text-xs text-gray-600">Actualizados</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-600">{syncProgress.errors}</div>
                        <div className="text-xs text-gray-600">Errores</div>
                      </div>
                    </div>
                  </div>
                )}

                {syncMessage && (
                  <Alert>
                    <AlertDescription>{syncMessage}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Section 4: History */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <div className="w-full cursor-pointer">
              <CardHeader className="hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {historyOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <Clock className="w-5 h-5 text-gray-600" />
                    <CardTitle>Historial</CardTitle>
                  </div>
                  <button
                    className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      loadSyncHistory()
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-2">
              {loadingHistory ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : syncHistory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay sincronizaciones previas
                </p>
              ) : (
                <div className="space-y-2">
                  {syncHistory.map((item) => (
                    <Card key={item.id} className="p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">
                            {new Date(item.started_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="text-xs text-gray-600">
                            {item.records_created} creados, {item.records_updated} actualizados
                          </div>
                        </div>
                        <Badge
                          variant={item.status === 'completed' ? 'default' : 'destructive'}
                          className={item.status === 'completed' ? 'bg-green-500' : ''}
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Full Sync Progress Modal */}
      <Dialog open={showFullSyncModal} onOpenChange={(open) => {
        // Only allow closing if sync is complete or errored
        if (!fullSyncing) {
          setShowFullSyncModal(open)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className={`w-5 h-5 ${fullSyncing ? 'animate-spin' : ''}`} />
              Sincronización Completa
            </DialogTitle>
            <DialogDescription>
              Importando alojamientos y reservas desde MotoPress
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{fullSyncProgress.message}</span>
                <span>{fullSyncProgress.current} / {fullSyncProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: fullSyncProgress.total > 0
                      ? `${(fullSyncProgress.current / fullSyncProgress.total) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>

            {/* Stats */}
            {fullSyncStats && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-green-600 text-lg">{fullSyncStats.created}</div>
                    <div className="text-xs text-gray-600">Creados</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600 text-lg">{fullSyncStats.updated}</div>
                    <div className="text-xs text-gray-600">Actualizados</div>
                  </div>
                  {fullSyncStats.accommodations !== undefined && (
                    <div className="text-center">
                      <div className="font-semibold text-purple-600 text-lg">{fullSyncStats.accommodations}</div>
                      <div className="text-xs text-gray-600">Alojamientos</div>
                    </div>
                  )}
                  {fullSyncStats.reservations !== undefined && (
                    <div className="text-center">
                      <div className="font-semibold text-indigo-600 text-lg">{fullSyncStats.reservations}</div>
                      <div className="text-xs text-gray-600">Reservas</div>
                    </div>
                  )}
                </div>
                {fullSyncStats.errors > 0 && (
                  <div className="text-center pt-2 border-t">
                    <div className="font-semibold text-red-600 text-lg">{fullSyncStats.errors}</div>
                    <div className="text-xs text-gray-600">Errores</div>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {fullSyncError && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{fullSyncError}</AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {!fullSyncing && fullSyncStats && !fullSyncError && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ✅ Sincronización completada exitosamente!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
