'use client'

import { use, useState, useEffect, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { TenantContext } from '@/contexts/TenantContext'
import { AccommodationUnit } from '@/types/accommodation'
import { AccommodationUnitDetail } from '@/components/Accommodation/AccommodationUnitDetail'
import { ManualContentModal } from '@/components/Accommodation/ManualContentModal'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  params: Promise<{ tenant: string; unitId: string }>
}

/**
 * Unit Detail Page (Client Component)
 * Dynamic route: /accommodations/units/[unitId]
 *
 * FASE 2: Full implementation with AccommodationUnitDetail component
 * - Fetches unit data from API (client-side to include subdomain header)
 * - Integrates AccommodationManualsSection and ManualAnalytics
 * - Includes modal for viewing manual content
 */
export default function UnitDetailPage({ params }: Props) {
  // Unwrap params Promise (Next.js 15 requirement)
  const { tenant: tenantSlug, unitId } = use(params)

  const router = useRouter()
  const tenantContext = useContext(TenantContext)
  const tenant = tenantContext?.tenant

  const [unit, setUnit] = useState<AccommodationUnit | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedManualId, setSelectedManualId] = useState<string | null>(null)

  useEffect(() => {
    if (tenant?.tenant_id) {
      fetchUnit()
    }
  }, [tenant?.tenant_id, unitId])

  const fetchUnit = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get authentication token
      const token = localStorage.getItem('staff_token')

      // Fetch all units from API (client-side fetch includes subdomain header from middleware)
      const response = await fetch(`/api/accommodations/units`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (!result.success || !result.data) {
        console.error('[UnitDetailPage] API returned error:', result.error)
        setError('Failed to load unit data')
        setIsLoading(false)
        return
      }

      const units: AccommodationUnit[] = result.data

      // Match by slug (URL-friendly name) or by ID
      const foundUnit = units.find((u: AccommodationUnit) => {
        // Generate slug from unit name
        const slug = u.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')

        return slug === unitId || u.id === unitId
      })

      if (!foundUnit) {
        setError('Unit not found')
        setIsLoading(false)
        return
      }

      setUnit(foundUnit)
    } catch (err) {
      console.error('[UnitDetailPage] Error fetching unit:', err)
      setError('Failed to load unit data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewManualContent = (manualId: string) => {
    setSelectedManualId(manualId)
  }

  const handleCloseModal = () => {
    setSelectedManualId(null)
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse max-w-7xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !unit) {
    return (
      <div className="p-6 text-center max-w-4xl mx-auto">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <div className="text-red-500 text-lg font-medium">{error || 'Unit not found'}</div>
          <div className="flex gap-3">
            <Button onClick={() => router.back()} variant="outline">
              Volver a la lista
            </Button>
            {error && (
              <Button onClick={fetchUnit} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!tenant?.tenant_id) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500">Loading tenant information...</div>
      </div>
    )
  }

  return (
    <>
      <AccommodationUnitDetail
        unit={unit}
        tenantId={tenant.tenant_id}
        onViewManualContent={handleViewManualContent}
      />

      {/* Manual Content Modal - Shows chunks with accordion */}
      <ManualContentModal
        manualId={selectedManualId}
        unitId={unit.original_unit_id || unit.id}
        tenantId={tenant.tenant_id}
        onClose={handleCloseModal}
      />
    </>
  )
}
