'use client'

import { useState, useEffect, useContext, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from 'use-debounce'
import { TenantContext } from '@/contexts/TenantContext'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Home,
  Crown,
  Layers,
  Clock,
  Trash2,
  AlertTriangle
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { AccommodationUnitsCompactGrid } from '@/components/Accommodation/AccommodationUnitsCompactGrid'
import { AccommodationUnitsTable } from '@/components/Accommodation/AccommodationUnitsTable'
import { UnitViewToggle } from '@/components/Accommodation/UnitViewToggle'
import { UnitSearchBar } from '@/components/Accommodation/UnitSearchBar'
import { AccommodationUnit } from '@/types/accommodation'

export default function AccommodationUnitsPage() {
  const router = useRouter()
  const tenantContext = useContext(TenantContext)
  const tenant = tenantContext?.tenant
  const { toast } = useToast()

  // Estado viewMode con localStorage sync
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('unit-view-preference')
      return (saved === 'grid' || saved === 'table') ? saved : 'grid'
    }
    return 'grid'
  })

  const [units, setUnits] = useState<AccommodationUnit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Search and Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300)

  const [filters, setFilters] = useState({
    types: [] as string[],
    capacityRange: null as [number, number] | null,
    priceRange: null as [number, number] | null,
    status: null as 'active' | 'inactive' | null,
  })

  const [sortBy, setSortBy] = useState({
    field: 'name' as 'name' | 'accommodation_type' | 'total_capacity' | 'pricing_summary',
    direction: 'asc' as 'asc' | 'desc'
  })

  // Sync viewMode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('unit-view-preference', viewMode)
    }
  }, [viewMode])

  useEffect(() => {
    if (tenant?.tenant_id) {
      fetchUnits()
    }
  }, [tenant?.tenant_id])

  const fetchUnits = async () => {
    try {
      setIsLoading(true)

      // Get authentication token
      const token = localStorage.getItem('staff_token')

      if (!tenant?.tenant_id) {
        setError('Tenant information not available')
        setIsLoading(false)
        return
      }

      const response = await fetch(`/api/accommodations/units`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()

      if (data.success) {
        // API already returns consolidated units (grouped from chunks)
        console.log('[Units Page] First unit data:', data.data?.[0])
        console.log('[Units Page] Featured image URL:', data.data?.[0]?.featured_image_url)
        console.log('[Units Page] Photos array:', data.data?.[0]?.photos)

        // Sort units: Active first, then Inactive
        const sortedUnits = (data.data || []).sort((a: AccommodationUnit, b: AccommodationUnit) => {
          // Active units (is_active = true) should come first
          if (a.is_active && !b.is_active) return -1
          if (!a.is_active && b.is_active) return 1
          return 0
        })

        setUnits(sortedUnits)
      } else {
        setError('No units found')
      }
    } catch (err) {
      setError('Failed to fetch units data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAll = async () => {
    if (confirmationText !== tenant?.slug) {
      toast({
        title: "Confirmación incorrecta",
        description: `Debes escribir "${tenant?.slug}" para confirmar`,
        variant: "destructive"
      })
      return
    }

    try {
      setIsDeleting(true)
      const token = localStorage.getItem('staff_token')

      const response = await fetch('/api/accommodation/units/delete-all', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tenant_id: tenant?.tenant_id })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Éxito",
          description: `${data.deleted_count} accommodation(s) eliminados`,
        })
        setShowDeleteDialog(false)
        setConfirmationText('')
        await fetchUnits()
      } else {
        toast({
          title: "Error",
          description: data.error || 'Failed to delete accommodations',
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: "Error",
        description: 'Failed to delete accommodations',
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handler para navegación a página individual
  const handleUnitClick = (unitId: string) => {
    const unit = units.find(u => u.id === unitId)
    if (unit) {
      const slug = unit.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      router.push(`/accommodations/units/${slug}`)
    }
  }

  // Filtered and Sorted Units (computed with useMemo)
  const filteredUnits = useMemo(() => {
    if (!units || units.length === 0) return []

    let result = [...units]

    // 1. Apply search (debounced)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase()
      result = result.filter(unit =>
        unit.name?.toLowerCase().includes(query) ||
        unit.accommodation_type?.toLowerCase().includes(query) ||
        unit.description?.toLowerCase().includes(query) ||
        unit.short_description?.toLowerCase().includes(query) ||
        unit.unit_number?.toLowerCase().includes(query)
      )
    }

    // 2. Apply filters
    if (filters.types.length > 0) {
      result = result.filter(unit =>
        filters.types.includes(unit.accommodation_type || '')
      )
    }

    if (filters.capacityRange) {
      const [min, max] = filters.capacityRange
      result = result.filter(unit => {
        const capacity = unit.total_capacity || unit.capacity?.adults || 0
        return capacity >= min && capacity <= max
      })
    }

    if (filters.priceRange) {
      const [min, max] = filters.priceRange
      result = result.filter(unit => {
        const price = unit.pricing_summary?.base_price_low_season || 0
        return price >= min && price <= max
      })
    }

    if (filters.status) {
      const isActive = filters.status === 'active'
      result = result.filter(unit => unit.is_active === isActive)
    }

    // 3. Apply sorting
    result.sort((a, b) => {
      // FIRST: Always sort by is_active (active units first, inactive last)
      if (a.is_active && !b.is_active) return -1
      if (!a.is_active && b.is_active) return 1

      // SECOND: If both have same active status, apply custom sorting
      let aVal: any = a[sortBy.field as keyof AccommodationUnit]
      let bVal: any = b[sortBy.field as keyof AccommodationUnit]

      // Handle nested pricing_summary
      if (sortBy.field === 'pricing_summary') {
        aVal = a.pricing_summary?.base_price_low_season || 0
        bVal = b.pricing_summary?.base_price_low_season || 0
      }

      // Handle capacity
      if (sortBy.field === 'total_capacity') {
        aVal = a.total_capacity || a.capacity?.adults || 0
        bVal = b.total_capacity || b.capacity?.adults || 0
      }

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''

      // String comparison (case-insensitive)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (aVal === bVal) return 0

      const comparison = aVal > bVal ? 1 : -1
      return sortBy.direction === 'asc' ? comparison : -comparison
    })

    return result
  }, [units, debouncedSearchQuery, filters, sortBy])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-2">{error}</div>
        <Button onClick={fetchUnits} variant="outline">Retry</Button>
      </div>
    )
  }

  return (
    <div className="p-6 animate-fadeIn">
      {/* Header con título y botón delete (EXISTING - NO MODIFICAR) */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Accommodation Units</h2>
            <p className="text-gray-600">Themed reggae-inspired suites with Matryoshka embeddings</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{units.length} Units Active</p>
              <p className="text-xs text-gray-500">Multi-tier search enabled</p>
            </div>
            {units.length > 0 && (
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats - EXISTING CODE - NO MODIFICAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center">
            <Home className="h-5 w-5 text-blue-500 mr-2" />
            <div>
              <p className="text-lg font-bold">{units.length}</p>
              <p className="text-xs text-gray-500">Total Units</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <Crown className="h-5 w-5 text-yellow-500 mr-2" />
            <div>
              <p className="text-lg font-bold">{units.filter(u => u.is_featured).length}</p>
              <p className="text-xs text-gray-500">Featured</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <Layers className="h-5 w-5 text-purple-500 mr-2" />
            <div>
              <p className="text-lg font-bold">100%</p>
              <p className="text-xs text-gray-500">Embedding Coverage</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <p className="text-lg font-bold">18ms</p>
              <p className="text-xs text-gray-500">Avg Search Time</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filters Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar - 50% width on desktop */}
          <div className="w-full md:w-1/2">
            <UnitSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar por nombre, tipo, descripción o número..."
            />
          </div>

          {/* Filters - placeholder for future UnitFilters component */}
          <div className="w-full md:w-1/2 flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {/* TODO: Add UnitFilters component here */}
              Filtros disponibles próximamente
            </div>
          </div>
        </div>

        {/* Results Count & Quick Stats */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          {searchQuery || filters.types.length > 0 || filters.status ? (
            <span className="font-medium text-gray-900">
              {filteredUnits.length === 0 ? (
                'No se encontraron resultados'
              ) : (
                <>
                  Mostrando {filteredUnits.length} de {units.length} unidad{filteredUnits.length !== 1 ? 'es' : ''}
                </>
              )}
            </span>
          ) : (
            <span>
              {filteredUnits.length} unidad{filteredUnits.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Header con título y toggle */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Unidades de Alojamiento</h2>
        <UnitViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Renderizado condicional Grid/Tabla */}
      {viewMode === 'grid' ? (
        <AccommodationUnitsCompactGrid
          units={filteredUnits}
          onUnitClick={handleUnitClick}
        />
      ) : (
        <AccommodationUnitsTable
          units={filteredUnits}
          onUnitClick={handleUnitClick}
        />
      )}

      {/* COMMENTED: Old monolithic grid - replaced with compact grid/table toggle (Redesign Phase 1) */}
      {/* <AccommodationUnitsGrid units={units} /> */}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar todos los accommodations?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Esta acción eliminará <strong>{units.length} accommodations</strong> de forma permanente.
                  No se puede deshacer.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">
                    Para confirmar, escribe el nombre del tenant: <code className="px-2 py-1 bg-gray-100 rounded">{tenant?.slug}</code>
                  </p>
                  <Input
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder={tenant?.slug}
                    className="font-mono"
                    disabled={isDeleting}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmationText('')
                setShowDeleteDialog(false)
              }}
              disabled={isDeleting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isDeleting || confirmationText !== tenant?.slug}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Todo
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
