'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Users, DollarSign, MapPin, Eye, Import, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AccommodationPreviewItem {
  id: number
  name: string
  capacity: number
  price?: number
  status: string
  description_preview: string
  bed_type?: string
  view_type?: string
  size?: string
}

interface AccommodationPreviewProps {
  tenantId: string
  onImport: (selectedIds: number[]) => void
  onCancel: () => void
}

export function AccommodationPreview({ tenantId, onImport, onCancel }: AccommodationPreviewProps) {
  const [accommodations, setAccommodations] = useState<AccommodationPreviewItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAccommodations()
  }, [tenantId])

  const fetchAccommodations = async () => {
    try {
      setLoading(true)
      setError('')

      // Get client and fetch accommodations
      const response = await fetch(`/api/integrations/motopress/accommodations?tenant_id=${tenantId}&preview=true`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setAccommodations(data.accommodations || [])

      // Select all by default
      const allIds = new Set<number>((data.accommodations || []).map((acc: AccommodationPreviewItem) => acc.id))
      setSelectedIds(allIds)

    } catch (error: any) {
      console.error('Failed to fetch accommodations:', error)
      setError(error.message || 'Failed to fetch accommodations from MotoPress')
    } finally {
      setLoading(false)
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

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      setError('Please select at least one accommodation to import')
      return
    }

    setImporting(true)
    try {
      await onImport(Array.from(selectedIds))
    } catch (error) {
      setError('Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading accommodations from MotoPress...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Error Loading Accommodations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={fetchAccommodations}>
              Retry
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Import MotoPress Accommodations
        </CardTitle>
        <CardDescription>
          Preview and select accommodations to import from your MotoPress site
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Selection Controls */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === accommodations.length && accommodations.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm font-medium">
              Select All ({selectedIds.size} of {accommodations.length} selected)
            </span>
          </div>

          <Badge variant="outline">
            {accommodations.length} accommodations found
          </Badge>
        </div>

        {/* Accommodations List */}
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {accommodations.map((accommodation) => (
              <Card key={accommodation.id} className="p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(accommodation.id)}
                    onCheckedChange={() => toggleSelection(accommodation.id)}
                    className="mt-1"
                  />

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{accommodation.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {accommodation.description_preview}
                        </p>
                      </div>

                      <Badge variant={accommodation.status === 'publish' ? 'default' : 'secondary'}>
                        {accommodation.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {accommodation.capacity} guests
                      </div>

                      {accommodation.price && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${accommodation.price}/night
                        </div>
                      )}

                      {accommodation.bed_type && (
                        <div className="flex items-center gap-1">
                          <span>🛏️</span>
                          {accommodation.bed_type}
                        </div>
                      )}

                      {accommodation.view_type && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {accommodation.view_type}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-between pt-3 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={importing || selectedIds.size === 0}
              className="flex items-center gap-1"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Import className="w-4 h-4" />
              )}
              {importing ? 'Importing...' : `Import ${selectedIds.size} Selected`}
            </Button>
          </div>
        </div>

        {/* Import Info */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium">What happens during import:</p>
          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
            <li>Selected accommodations will be added to your accommodation units</li>
            <li>Embeddings will be generated automatically for chat search</li>
            <li>Existing accommodations will be updated with latest data</li>
            <li>All data will be properly formatted for InnPilot system</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}