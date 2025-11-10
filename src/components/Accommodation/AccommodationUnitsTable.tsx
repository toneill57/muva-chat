'use client'

import { useState } from 'react'
import { AccommodationUnit } from '@/types/accommodation'
import { ChevronUp, ChevronDown, Users, Baby, Eye, Edit, Hotel, Home, Building2, FileText, X, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PhotoCarousel from '@/components/Public/PhotoCarousel'

interface AccommodationUnitsTableProps {
  units: AccommodationUnit[]
  onUnitClick: (unitId: string) => void
  onSort?: (field: string) => void
  sortConfig?: { field: string; direction: 'asc' | 'desc' }
}

export function AccommodationUnitsTable({
  units,
  onUnitClick,
  onSort,
  sortConfig
}: AccommodationUnitsTableProps) {
  const [selectedUnit, setSelectedUnit] = useState<AccommodationUnit | null>(null)

  const getSortIcon = (field: string) => {
    if (!sortConfig || sortConfig.field !== field) return null
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />
  }

  const getUnitTypeIcon = (type: string) => {
    const lowerType = type?.toLowerCase() || ''
    if (lowerType.includes('apartment') || lowerType.includes('apartamento')) {
      return <Home className="w-4 h-4" />
    }
    if (lowerType.includes('suite')) {
      return <Building2 className="w-4 h-4" />
    }
    return <Hotel className="w-4 h-4" />
  }

  const formatPrice = (price: number | undefined) => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const getUnitTypeBadgeVariant = (type: string) => {
    const lowerType = type?.toLowerCase() || ''
    if (lowerType.includes('suite')) return 'default'
    if (lowerType.includes('apartment') || lowerType.includes('apartamento')) return 'secondary'
    return 'outline'
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Anuncio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ubicación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacidad
              </th>
              <th
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  onSort ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''
                }`}
                onClick={() => onSort?.('pricing_summary.base_price_low_season')}
              >
                <div className="flex items-center gap-2">
                  Precio {getSortIcon('pricing_summary.base_price_low_season')}
                </div>
              </th>
              <th
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  onSort ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''
                }`}
                onClick={() => onSort?.('is_active')}
              >
                <div className="flex items-center gap-2">
                  Status {getSortIcon('is_active')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Manuales
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {units.map((unit) => (
              <tr
                key={unit.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                onClick={() => onUnitClick(unit.id)}
              >
                {/* Image + Name */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    {/* Image */}
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {(unit.featured_image_url || (unit.photos && unit.photos.length > 0)) ? (
                        <img
                          src={unit.featured_image_url || unit.photos?.[0]?.url}
                          alt={unit.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <Home className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    {/* Name */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getUnitTypeIcon(unit.accommodation_type || '')}
                        <span className="text-sm font-semibold text-gray-900 truncate">{unit.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 truncate">{unit.accommodation_type || 'Standard'}</span>
                    </div>
                  </div>
                </td>

                {/* Ubicación */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">
                    {unit.location_area || 'San Andrés, San Andrés y Providencia'}
                  </span>
                </td>

                {/* Capacidad */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span>{unit.capacity?.adults || unit.total_capacity || 2}</span>
                    </div>
                    {unit.children_capacity !== undefined && unit.children_capacity > 0 && (
                      <div className="flex items-center gap-1">
                        <Baby className="w-4 h-4 text-purple-500" />
                        <span>{unit.children_capacity}</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Precio */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">
                      {formatPrice(unit.pricing_summary?.base_price_low_season)}
                    </div>
                    {unit.pricing_summary?.base_price_high_season &&
                     unit.pricing_summary.base_price_high_season !== unit.pricing_summary.base_price_low_season && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Alta: {formatPrice(unit.pricing_summary.base_price_high_season)}
                      </div>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    variant={unit.is_active || unit.status === 'active' ? 'default' : 'secondary'}
                    className={
                      unit.is_active || unit.status === 'active'
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }
                  >
                    {unit.is_active || unit.status === 'active' ? 'Activa' : 'Inactiva'}
                  </Badge>
                </td>

                {/* Manuales */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span>{unit.manuals_count || 0}</span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedUnit(unit)
                      }}
                      className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      aria-label="Ver fotos de la unidad"
                      title="Ver Fotos"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onUnitClick(unit.id)
                      }}
                      className="hover:bg-gray-50 hover:text-gray-600 transition-colors"
                      aria-label="Ver detalles completos"
                      title="Detalles"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile hint */}
      <div className="md:hidden mt-3 p-3 text-center text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
        Desliza horizontalmente para ver todas las columnas
      </div>

      {/* Empty state */}
      {units.length === 0 && (
        <div className="text-center py-12">
          <Hotel className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">No hay unidades disponibles</p>
        </div>
      )}

      {/* Modal de Fotos */}
      {selectedUnit && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUnit(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">{selectedUnit.name}</h3>
                  <p className="text-sm text-gray-500">{selectedUnit.accommodation_type}</p>
                </div>
                <Button
                  onClick={() => setSelectedUnit(null)}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Galería de Fotos con Lightbox */}
              {selectedUnit.photos && selectedUnit.photos.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3">
                    Galería ({selectedUnit.photos.length} {selectedUnit.photos.length === 1 ? 'foto' : 'fotos'})
                  </h4>
                  <PhotoCarousel
                    photos={selectedUnit.photos.map(p => ({
                      url: p.url,
                      caption: p.alt || selectedUnit.name
                    }))}
                  />
                </div>
              )}

              {/* Detalles Adicionales */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columna Izquierda */}
                <div>
                  {selectedUnit.tourism_features && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Tourism Features</h4>
                      <p className="text-sm text-gray-600">{selectedUnit.tourism_features}</p>
                    </div>
                  )}
                  {selectedUnit.booking_policies && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Booking Policies</h4>
                      <p className="text-sm text-gray-600">{selectedUnit.booking_policies}</p>
                    </div>
                  )}
                </div>

                {/* Columna Derecha */}
                <div>
                  {selectedUnit.pricing_summary && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Pricing</h4>
                      <div className="space-y-2">
                        <div className="p-2 bg-gray-50 rounded text-sm">
                          <strong>Temporada Baja:</strong> {formatPrice(selectedUnit.pricing_summary.base_price_low_season)}
                        </div>
                        <div className="p-2 bg-gray-50 rounded text-sm">
                          <strong>Temporada Alta:</strong> {formatPrice(selectedUnit.pricing_summary.base_price_high_season)}
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedUnit.unit_amenities && selectedUnit.unit_amenities.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">
                        Amenities ({selectedUnit.unit_amenities.length})
                      </h4>
                      <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                        {selectedUnit.unit_amenities.map((amenity: any, index: number) => (
                          <div key={index} className="text-sm text-gray-600 flex items-center">
                            <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                            {amenity.amenity_name || amenity}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón para ver página completa */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button
                  onClick={() => {
                    setSelectedUnit(null)
                    onUnitClick(selectedUnit.id)
                  }}
                  className="w-full"
                >
                  Ver Página Completa
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
