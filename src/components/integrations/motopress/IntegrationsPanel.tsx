'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Clock, Settings, RefreshCw, Upload } from 'lucide-react'

interface IntegrationStatus {
  connected: boolean
  last_sync?: string
  accommodations_count?: number
  is_active: boolean
  error?: string
}

interface IntegrationsPanelProps {
  tenantId: string
  onConfigure: () => void
  onSync: () => void
  onImport: () => void
}

export function IntegrationsPanel({ tenantId, onConfigure, onSync, onImport }: IntegrationsPanelProps) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    checkIntegrationStatus()
  }, [tenantId])

  const checkIntegrationStatus = async () => {
    try {
      setLoading(true)

      // Check if configuration exists
      const configResponse = await fetch(`/api/integrations/motopress/configure?tenant_id=${tenantId}`)
      const configData = await configResponse.json()

      if (!configData.exists) {
        setStatus({ connected: false, is_active: false })
        return
      }

      // Test connection
      const testResponse = await fetch('/api/integrations/motopress/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId })
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

  const handleSync = async () => {
    try {
      setSyncing(true)

      const response = await fetch('/api/integrations/motopress/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId })
      })

      const result = await response.json()

      if (result.success) {
        alert(`Sync successful! Created: ${result.data.created}, Updated: ${result.data.updated}`)
        checkIntegrationStatus() // Refresh status
      } else {
        alert(`Sync failed: ${result.message}`)
      }

      onSync()
    } catch (error) {
      console.error('Sync failed:', error)
      alert('Sync failed with error')
    } finally {
      setSyncing(false)
    }
  }

  const getStatusBadge = () => {
    if (loading) return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Checking...</Badge>
    if (!status) return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Unknown</Badge>
    if (!status.is_active) return <Badge variant="outline">Not Configured</Badge>
    if (status.connected) return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>
    return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Disconnected</Badge>
  }

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) return 'Less than 1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} days ago`
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          MotoPress Integration
        </CardTitle>
        <CardDescription>
          Import and sync accommodation data from your MotoPress Hotel Booking plugin
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {getStatusBadge()}
            </div>
            {status?.accommodations_count && (
              <p className="text-xs text-muted-foreground">
                {status.accommodations_count} accommodations available
              </p>
            )}
            {status?.error && (
              <p className="text-xs text-red-500">Error: {status.error}</p>
            )}
          </div>

          <div className="text-right text-sm text-muted-foreground">
            <p>Last sync: {formatLastSync(status?.last_sync)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onConfigure}
            className="flex items-center gap-1"
          >
            <Settings className="w-4 h-4" />
            {status?.is_active ? 'Reconfigure' : 'Configure'}
          </Button>

          {status?.is_active && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing || !status.connected}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>

              <Button
                size="sm"
                onClick={onImport}
                disabled={!status.connected}
                className="flex items-center gap-1"
              >
                <Upload className="w-4 h-4" />
                Import Data
              </Button>
            </>
          )}
        </div>

        {/* Quick Stats */}
        {status?.connected && status.accommodations_count && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium">Ready to import {status.accommodations_count} accommodations</p>
            <p className="text-muted-foreground">
              Data will be synced to your accommodation units and embeddings will be generated automatically
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}