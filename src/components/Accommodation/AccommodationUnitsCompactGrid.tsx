'use client'

import { useState } from 'react'
import { AccommodationUnit } from '@/types/accommodation'
import { Hotel, Home, Building2, Users, Baby, Eye, Edit, CheckCircle2, XCircle, FileText, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PhotoCarousel from '@/components/Public/PhotoCarousel'

interface AccommodationUnitsCompactGridProps {
  units: AccommodationUnit[]
  onUnitClick: (unitId: string) => void
}

export function AccommodationUnitsCompactGrid({ units, onUnitClick }: AccommodationUnitsCompactGridProps) {
  const [selectedUnit, setSelectedUnit] = useState<AccommodationUnit | null>(null)

  const getUnitTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'room':
      case 'habitación':
        return <Hotel className="w-5 h-5 text-blue-600" />
      case 'apartment':
      case 'apartamento':
        return <Home className="w-5 h-5 text-green-600" />
      case 'suite':
        return <Building2 className="w-5 h-5 text-purple-600" />
      default:
        return <Hotel className="w-5 h-5 text-gray-600" />
    }
  }

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price)
  }

  const getCapacityText = (unit: AccommodationUnit) => {
    const adults = unit.capacity?.adults || unit.total_capacity || 0
    const children = unit.capacity?.children || unit.children_capacity || 0

    const parts = []
    if (adults > 0) {
      parts.push(`${adults} ${adults === 1 ? 'adulto' : 'adultos'}`)
    }
    if (children > 0) {
      parts.push(`${children} ${children === 1 ? 'niño' : 'niños'}`)
    }

    return parts.length > 0 ? parts.join(', ') : 'Capacidad no especificada'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {units.map((unit) => (
        <div
          key={unit.id}
          className="group relative bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
          onClick={() => onUnitClick(unit.id)}
        >
          {/* Featured Image */}
          <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
            {(unit.featured_image_url || (unit.photos && unit.photos.length > 0)) ? (
              <img
                src={unit.featured_image_url || unit.photos?.[0]?.url}
                alt={unit.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <Home className="w-16 h-16 text-gray-400" />
              </div>
            )}

            {/* Status Badge - Top Right */}
            <div className="absolute top-3 right-3">
              <Badge
                variant={unit.is_active || unit.status === 'active' ? 'default' : 'secondary'}
                className={
                  unit.is_active || unit.status === 'active'
                    ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                    : 'bg-gray-500 text-white hover:bg-gray-600 shadow-md'
                }
              >
                {unit.is_active || unit.status === 'active' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Activa
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Inactiva
                  </>
                )}
              </Badge>
            </div>

            {/* Quick Actions Overlay - Bottom on hover */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex gap-2 justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedUnit(unit)
                }}
                className="bg-white/90 hover:bg-white shadow-lg"
              >
                <Eye className="w-4 h-4 mr-1" />
                Ver Fotos
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onUnitClick(unit.id)
                }}
                className="bg-white/90 hover:bg-white shadow-lg"
              >
                <Edit className="w-4 h-4 mr-1" />
                Detalles
              </Button>
            </div>
          </div>

          {/* Content Below Image */}
          <div className="p-4">
            {/* Unit Name + Type */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-base line-clamp-1" title={unit.name}>
                {unit.name}
              </h3>
              {getUnitTypeIcon(unit.accommodation_type || 'room')}
            </div>

            {/* Type Badge */}
            {unit.accommodation_type && (
              <Badge variant="outline" className="capitalize mb-3 text-xs">
                {unit.accommodation_type}
              </Badge>
            )}

            {/* Capacity */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="line-clamp-1">{getCapacityText(unit)}</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(unit.pricing_summary?.base_price_low_season || 0)}
              </span>
              <span className="text-sm text-gray-500">/ noche</span>
            </div>

            {/* Manuals Count */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-3 border-t border-gray-100">
              <FileText className="w-3.5 h-3.5" />
              <span>
                {unit.manuals_count || 0} {(unit.manuals_count || 0) === 1 ? 'manual' : 'manuales'}
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* Empty State */}
      {units.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
          <Hotel className="w-16 h-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium">No hay unidades disponibles</p>
          <p className="text-sm">Prueba ajustando los filtros de búsqueda</p>
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
