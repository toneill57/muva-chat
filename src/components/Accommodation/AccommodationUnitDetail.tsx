'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Edit,
  Users,
  Home,
  DollarSign,
  Bed,
  Eye,
  Maximize,
  Baby,
  Star,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { AccommodationManualsSection } from '@/components/Accommodation/AccommodationManualsSection'
import { ManualAnalytics } from '@/components/Accommodation/ManualAnalytics'
import type { AccommodationUnit } from '@/types/accommodation'

interface Props {
  unit: AccommodationUnit
  tenantId: string
  onViewManualContent: (manualId: string) => void
}

export function AccommodationUnitDetail({ unit, tenantId, onViewManualContent }: Props) {
  const router = useRouter()
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showTechnicalInfo, setShowTechnicalInfo] = useState(false)

  const description = unit.short_description || ''
  const shouldTruncate = description.length > 300

  // Format price helper
  const formatPrice = (price?: number) => {
    if (!price) return 'N/A'
    return `$${price.toLocaleString('es-CO')}`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a la lista
        </Button>
        <Button variant="outline" disabled>
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-2">{unit.name}</h1>

      {/* Status Badge */}
      <div className="mb-8">
        <Badge
          variant={unit.status === 'active' ? 'default' : 'secondary'}
          className={`text-xs ${
            unit.status === 'active'
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-400 hover:bg-gray-500 text-white'
          }`}
        >
          {unit.status === 'active' ? 'Activa' : 'Inactiva'}
        </Badge>
        {unit.category_badge && (
          <Badge className="ml-2 bg-blue-600 text-white text-xs">
            {unit.category_badge}
          </Badge>
        )}
      </div>

      {/* Photo Gallery */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          {unit.featured_image_url || (unit.photos && unit.photos.length > 0) ? (
            <img
              src={unit.featured_image_url || unit.photos[0]?.url}
              alt={unit.name}
              className="w-full h-96 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
              <Home className="h-12 w-12 text-muted-foreground" />
              <p className="ml-3 text-muted-foreground">No image available</p>
            </div>
          )}

          {/* Photo Gallery Thumbnails */}
          {unit.photos && unit.photos.length > 1 && (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mt-4">
              {unit.photos.slice(0, 6).map((photo, idx) => (
                <div
                  key={idx}
                  className="relative aspect-video bg-gray-100 rounded overflow-hidden"
                >
                  <img
                    src={photo.url}
                    alt={photo.alt || `Photo ${idx + 1}`}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                  />
                  {photo.is_primary && (
                    <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">
                      Primary
                    </div>
                  )}
                </div>
              ))}
              {unit.photos.length > 6 && (
                <div className="aspect-video bg-gray-200 rounded flex items-center justify-center text-xs text-gray-600 font-medium">
                  +{unit.photos.length - 6}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats - Grid de 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Capacidad Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {unit.total_capacity || unit.capacity?.adults || 0}
              </span>
              <span className="text-sm text-muted-foreground">personas</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Precio Temporada Baja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">
                {formatPrice(unit.pricing_summary?.base_price_low_season)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Amenidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">
                {unit.amenities_summary?.total || 0}
              </span>
              <span className="text-sm text-muted-foreground">servicios</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid - 2 filas separadas para mejor agrupación */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Detalles de la Unidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Fila 1: Capacidad + Especificaciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Capacity Details */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Capacidad</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Adultos</span>
                    </div>
                    <span className="font-medium">{unit.capacity?.adults || 2}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Baby className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Niños</span>
                    </div>
                    <span className="font-medium">{unit.children_capacity || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Total</span>
                    </div>
                    <span className="font-bold">{unit.total_capacity || unit.capacity?.adults || 2}</span>
                  </div>
                </div>
              </div>

              {/* Room Details */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Especificaciones</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Maximize className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Tamaño</span>
                    </div>
                    <span className="font-medium">{unit.size_m2 ? `${unit.size_m2}m²` : 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Vista</span>
                    </div>
                    <span className="font-medium">{unit.view_type || 'Vista estándar'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bed className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Tipo de cama</span>
                    </div>
                    <span className="font-medium">{unit.bed_configuration?.bed_type || 'Queen'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila 2: Precios + Ubicación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Pricing Details */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Precios</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Temporada Baja</span>
                    </div>
                    <span className="font-medium">
                      {formatPrice(unit.pricing_summary?.base_price_low_season)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Temporada Alta</span>
                    </div>
                    <span className="font-medium">
                      {formatPrice(unit.pricing_summary?.base_price_high_season)}
                    </span>
                  </div>
                  {unit.pricing_summary?.price_per_person && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Por persona</span>
                      </div>
                      <span className="font-medium">
                        {formatPrice(unit.pricing_summary.price_per_person)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              {unit.location_area && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Ubicación</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{unit.location_area}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description con Read More */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Descripción</CardTitle>
        </CardHeader>
        <CardContent>
          {description ? (
            <>
              <p className="text-muted-foreground leading-relaxed">
                {shouldTruncate && !showFullDescription
                  ? `${description.substring(0, 300)}...`
                  : description}
              </p>
              {shouldTruncate && (
                <Button
                  variant="link"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="mt-2 px-0"
                >
                  {showFullDescription ? 'Leer menos' : 'Leer más'}
                </Button>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No description available</p>
          )}
        </CardContent>
      </Card>

      {/* Highlights */}
      {unit.highlights && unit.highlights.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Destacados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unit.highlights.map((highlight, idx) => (
                <Badge key={idx} variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200">
                  {highlight}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unique Features */}
      {unit.unique_features && unit.unique_features.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Características Únicas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {unit.unique_features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Amenities Grid */}
      {unit.unit_amenities && unit.unit_amenities.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Amenidades ({unit.unit_amenities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {unit.unit_amenities.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Star className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm truncate" title={amenity.amenity_name}>
                    {amenity.amenity_name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="my-8" />

      {/* Technical Info (Collapsible) */}
      <Collapsible open={showTechnicalInfo} onOpenChange={setShowTechnicalInfo} className="mb-8">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>Información Técnica</span>
            </div>
            {showTechnicalInfo ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Unit ID</p>
                  <p className="font-mono text-sm">{unit.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unit Number</p>
                  <p className="font-mono text-sm">{unit.unit_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Accommodation Type</p>
                  <p className="text-sm">{unit.accommodation_type || 'Standard'}</p>
                </div>
                {unit.room_type_id && (
                  <div>
                    <p className="text-xs text-muted-foreground">Room Type ID</p>
                    <p className="font-mono text-sm">{unit.room_type_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Display Order</p>
                  <p className="text-sm">{unit.display_order || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Featured</p>
                  <p className="text-sm">{unit.is_featured ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bookable</p>
                  <p className="text-sm">{unit.is_bookable ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Separator className="my-8" />

      {/* Manuales Section - NO MODIFICAR */}
      <div className="mb-8">
        <AccommodationManualsSection
          unitId={unit.original_unit_id || unit.id}
          tenantId={tenantId}
          onViewContent={onViewManualContent}
        />
      </div>

      <Separator className="my-8" />

      {/* Analytics Section - NO MODIFICAR */}
      <div className="mb-8">
        <ManualAnalytics unitId={unit.original_unit_id || unit.id} />
      </div>

      <Separator className="my-8" />

      {/* Embeddings Status - Información Técnica al final */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Matryoshka Embeddings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className={`flex items-center p-4 rounded-lg ${
              unit.embedding_status?.has_fast ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
            }`}>
              <Zap className={`h-5 w-5 mr-3 ${
                unit.embedding_status?.has_fast ? 'text-green-500' : 'text-gray-400'
              }`} />
              <div>
                <p className="text-sm font-medium">Tier 1 (Fast)</p>
                <p className="text-xs text-muted-foreground">
                  {unit.embedding_status?.has_fast
                    ? `${unit.embedding_status.fast_dimensions}d enabled`
                    : 'Not available'}
                </p>
              </div>
            </div>
            <div className={`flex items-center p-4 rounded-lg ${
              unit.embedding_status?.has_balanced ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
            }`}>
              <Shield className={`h-5 w-5 mr-3 ${
                unit.embedding_status?.has_balanced ? 'text-blue-500' : 'text-gray-400'
              }`} />
              <div>
                <p className="text-sm font-medium">Tier 2 (Balanced)</p>
                <p className="text-xs text-muted-foreground">
                  {unit.embedding_status?.has_balanced
                    ? `${unit.embedding_status.balanced_dimensions}d enabled`
                    : 'Not available'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
