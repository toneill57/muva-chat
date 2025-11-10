'use client'

import { useState, useEffect, useContext } from 'react'
import { TenantContext } from '@/contexts/TenantContext'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Home,
  Users,
  Bed,
  Eye,
  MapPin,
  Star,
  Wifi,
  Coffee,
  Music,
  Palette,
  Zap,
  Shield,
  CheckCircle,
  DollarSign,
  Clock,
  Layers,
  Crown,
  Trash2,
  AlertTriangle,
  Baby,
  Maximize
} from "lucide-react"
import { AccommodationManualsSection } from './AccommodationManualsSection'
import { ManualAnalytics } from './ManualAnalytics'
import { ManualContentModal } from './ManualContentModal'
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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface AccommodationUnit {
  id: string
  original_unit_id?: string // ID from hotels.accommodation_units (for manuals FK)
  name: string
  unit_number: string
  description: string
  short_description: string
  capacity: any
  bed_configuration: any
  view_type: string
  tourism_features: string
  booking_policies: string
  unique_features: string[]
  categories: Array<{ id: number; name: string }>
  is_featured: boolean
  display_order: number
  status: string
  is_active?: boolean
  is_bookable?: boolean
  embedding_status: {
    has_fast: boolean
    has_balanced: boolean
    fast_dimensions: number
    balanced_dimensions: number
  }
  pricing_summary: {
    seasonal_rules: number
    hourly_rules: number
    base_price_range: number[]
    base_price_low_season?: number
    base_price_high_season?: number
    price_per_person?: number
  }
  amenities_summary: {
    total: number
    included: number
    premium: number
    featured: number
  }
  unit_amenities: any[]
  pricing_rules: any[]
  photos: Array<{ url: string; alt?: string; is_primary?: boolean }>
  photo_count: number
  chunks_count: number
  // BASE FIELDS
  size_m2?: number
  location_area?: string
  children_capacity?: number
  total_capacity?: number
  accommodation_type?: string
  room_type_id?: number
  // ENRICHMENT FIELDS
  services_list?: string[]
  attributes_list?: string[]
  tags_list?: Array<{ id: number; name: string }>
  featured_image_url?: string
  capacity_differential?: number
  highlights?: string[]
  category_badge?: string
}

export function AccommodationUnitsGrid() {
  const tenantContext = useContext(TenantContext)
  const tenant = tenantContext?.tenant
  const { toast } = useToast()
  const [units, setUnits] = useState<AccommodationUnit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<AccommodationUnit | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [manualModalId, setManualModalId] = useState<string | null>(null)
  const [manualModalUnitId, setManualModalUnitId] = useState<string | null>(null)

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
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()

      if (data.success) {
        // API already returns consolidated units (grouped from chunks)
        setUnits(data.data || [])
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

  const getThemeColor = (unitName: string) => {
    return 'gray' // All units use same color
  }

  const getThemeIcon = (unitName: string) => {
    return Home // All units use same icon
  }

  const formatPrice = (priceRange: number[]) => {
    if (!priceRange || priceRange.length === 0) return 'N/A'
    const min = Math.min(...priceRange)
    const max = Math.max(...priceRange)
    return min === max ? `$${min.toLocaleString()}` : `$${min.toLocaleString()} - $${max.toLocaleString()}`
  }

  const InfoCard = ({ icon: Icon, label, value, color = 'blue', subtitle }: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string | number
    color?: 'blue' | 'green' | 'purple' | 'gray' | 'yellow'
    subtitle?: string
  }) => {
    const bgColors = {
      blue: 'bg-blue-50/50 group-hover:bg-blue-100/70',
      green: 'bg-green-50/50 group-hover:bg-green-100/70',
      purple: 'bg-purple-50/50 group-hover:bg-purple-100/70',
      gray: 'bg-gray-50/50 group-hover:bg-gray-100/70',
      yellow: 'bg-yellow-50/50 group-hover:bg-yellow-100/70'
    }

    const iconColors = {
      blue: 'text-blue-500',
      green: 'text-green-500',
      purple: 'text-purple-500',
      gray: 'text-gray-500',
      yellow: 'text-yellow-500'
    }

    return (
      <div className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-300 ${bgColors[color]}`}>
        <Icon className={`h-4 w-4 mb-1 ${iconColors[color]}`} />
        <span className="text-xs text-gray-500">{label}</span>
        <span className="font-medium text-sm">{value}</span>
        {subtitle && (
          <span className="text-xs text-gray-400 mt-0.5">{subtitle}</span>
        )}
      </div>
    )
  }

  const UnitCard = ({ unit }: { unit: AccommodationUnit }) => {
    const themeColor = getThemeColor(unit.name)
    const ThemeIcon = getThemeIcon(unit.name)

    return (
      <Card className="relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-pointer hover:shadow-lg">

        <CardHeader className="pb-3">
          {/* Featured Image (if available) */}
          {unit.featured_image_url && (
            <div className="mb-3 -mx-6 -mt-6 overflow-hidden">
              <img
                src={unit.featured_image_url}
                alt={unit.name}
                className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
            </div>
          )}

          {/* Category Badge (top-left corner) */}
          {unit.category_badge && (
            <div className="absolute top-2 left-2 z-10">
              <Badge className="bg-blue-600 text-white text-xs shadow-lg">
                {unit.category_badge}
              </Badge>
            </div>
          )}

          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-xl shadow-sm group-hover:shadow-md transition-all duration-300 ${
                themeColor === 'green' ? 'bg-gradient-to-br from-green-100 to-green-200' :
                themeColor === 'blue' ? 'bg-gradient-to-br from-blue-100 to-blue-200' :
                themeColor === 'purple' ? 'bg-gradient-to-br from-purple-100 to-purple-200' :
                'bg-gradient-to-br from-gray-100 to-gray-200'
              }`}>
                <ThemeIcon className={`h-6 w-6 group-hover:scale-110 transition-transform duration-300 ${
                  themeColor === 'green' ? 'text-green-600' :
                  themeColor === 'blue' ? 'text-blue-600' :
                  themeColor === 'purple' ? 'text-purple-600' :
                  'text-gray-600'
                }`} />
              </div>
              <div className="flex-1">
                <CardTitle className={`text-lg font-bold text-gray-900 transition-colors duration-300 ${
                  themeColor === 'green' ? 'group-hover:text-green-700' :
                  themeColor === 'blue' ? 'group-hover:text-blue-700' :
                  themeColor === 'purple' ? 'group-hover:text-purple-700' :
                  'group-hover:text-gray-700'
                }`}>{unit.name}</CardTitle>
                <Badge
                  variant={unit.status === 'active' ? 'default' : 'secondary'}
                  className={`mt-1 text-xs ${
                    unit.status === 'active'
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-400 hover:bg-gray-500 text-white'
                  }`}
                >
                  {unit.status === 'active' ? '✓ Activa' : '⊗ Inactiva'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Highlights from excerpt parsing */}
          {unit.highlights && unit.highlights.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {unit.highlights.slice(0, 3).map((highlight, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
                  {highlight}
                </Badge>
              ))}
              {unit.highlights.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{unit.highlights.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Badges informativos */}
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              #{unit.room_type_id || unit.unit_number}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {unit.accommodation_type || 'Standard'}
            </Badge>
            {unit.size_m2 && (
              <Badge variant="secondary" className="text-xs">
                {unit.size_m2}m²
              </Badge>
            )}
            {unit.photo_count > 0 && (
              <Badge variant="default" className="bg-blue-500 text-xs">
                📸 {unit.photo_count}
              </Badge>
            )}
            {/* Show capacity differential if there are extra spaces */}
            {unit.capacity_differential && unit.capacity_differential > 0 && (
              <Badge variant="default" className="bg-purple-500 text-white text-xs">
                +{unit.capacity_differential} extra
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Grid 3x3 - Responsive: 2 cols mobile, 3 cols desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {/* Fila 1: Capacidad */}
            <InfoCard
              icon={Users}
              label="Adultos"
              value={unit.capacity?.adults || 2}
              color="blue"
            />
            <InfoCard
              icon={Baby}
              label="Niños"
              value={unit.children_capacity || 0}
              color="purple"
            />
            <InfoCard
              icon={Home}
              label="Total"
              value={unit.total_capacity || unit.capacity?.adults || 2}
              color="green"
            />

            {/* Fila 2: Espacio & Vista */}
            <InfoCard
              icon={Eye}
              label="Vista"
              value={unit.view_type || 'Vista estándar'}
              color="blue"
            />
            <InfoCard
              icon={Bed}
              label="Cama"
              value={unit.bed_configuration?.bed_type || 'Queen'}
              color="purple"
            />
            <InfoCard
              icon={Maximize}
              label="Tamaño"
              value={unit.size_m2 ? `${unit.size_m2}m²` : 'N/A'}
              color="gray"
            />

            {/* Fila 3: Precios Estacionales & Amenidades */}
            <InfoCard
              icon={DollarSign}
              label="Temp. Alta"
              value={unit.pricing_summary?.base_price_high_season
                ? `$${unit.pricing_summary.base_price_high_season.toLocaleString('es-CO')}`
                : 'N/A'}
              color="purple"
            />
            <InfoCard
              icon={Star}
              label="Amenidades"
              value={unit.amenities_summary?.total || 0}
              color="yellow"
            />
            <InfoCard
              icon={DollarSign}
              label="Temp. Baja"
              value={unit.pricing_summary?.base_price_low_season
                ? `$${unit.pricing_summary.base_price_low_season.toLocaleString('es-CO')}`
                : formatPrice(unit.pricing_summary?.base_price_range || 0)}
              color="green"
              subtitle={unit.pricing_summary?.price_per_person ? `$${unit.pricing_summary.price_per_person.toLocaleString()}/persona` : undefined}
            />
          </div>

          {/* Enhanced Description */}
          <div className="relative">
            <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed font-medium">{unit.short_description}</p>
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-gradient-to-tl from-white via-white to-transparent"></div>
          </div>

          {/* Unique Features */}
          {unit.unique_features && unit.unique_features.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Características Únicas</h4>
              <div className="flex flex-wrap gap-1">
                {unit.unique_features.slice(0, 2).map((feature, index) => (
                  <span
                    key={index}
                    className={`px-3 py-1.5 text-xs rounded-full font-semibold shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-105 ${
                      themeColor === 'green' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800' :
                      themeColor === 'blue' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800' :
                      themeColor === 'purple' ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800' :
                      'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'
                    }`}
                  >
                    {feature.length > 25 ? `${feature.substring(0, 25)}...` : feature}
                  </span>
                ))}
                {unit.unique_features.length > 2 && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-xs rounded-full font-semibold shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-105 animate-pulse">
                    +{unit.unique_features.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Info Técnica */}
          <div className="border-t pt-3 mt-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <Layers className="h-4 w-4 mr-1" />
              Información Técnica
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">ID: {unit.unit_number}</Badge>
              <Badge variant="outline">Tipo: {unit.accommodation_type || 'Standard'}</Badge>
              {unit.room_type_id && (
                <Badge variant="outline">Room Type: {unit.room_type_id}</Badge>
              )}
              <Badge variant="outline">{unit.chunks_count} secciones</Badge>
            </div>
          </div>

          {/* Embeddings Status */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <Layers className="h-4 w-4 mr-1" />
              Matryoshka Embeddings
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className={`flex items-center p-2 rounded ${
                unit.embedding_status?.has_fast ? 'bg-green-50' : 'bg-gray-50'
              }`}>
                <Zap className={`h-3 w-3 mr-1 ${
                  unit.embedding_status?.has_fast ? 'text-green-500' : 'text-gray-400'
                }`} />
                <div>
                  <p className="text-xs font-medium">Tier 1</p>
                  <p className="text-xs text-gray-500">
                    {unit.embedding_status?.has_fast ? `${unit.embedding_status.fast_dimensions}d` : 'N/A'}
                  </p>
                </div>
              </div>
              <div className={`flex items-center p-2 rounded ${
                unit.embedding_status?.has_balanced ? 'bg-blue-50' : 'bg-gray-50'
              }`}>
                <Shield className={`h-3 w-3 mr-1 ${
                  unit.embedding_status?.has_balanced ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <div>
                  <p className="text-xs font-medium">Tier 2</p>
                  <p className="text-xs text-gray-500">
                    {unit.embedding_status?.has_balanced ? `${unit.embedding_status.balanced_dimensions}d` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Manuals Section */}
          <AccommodationManualsSection
            unitId={unit.original_unit_id || unit.id}
            tenantId={tenant?.tenant_id || ''}
            onViewContent={(manualId) => {
              setManualModalId(manualId)
              setManualModalUnitId(unit.original_unit_id || unit.id)
            }}
          />

          {/* Analytics Section */}
          <ManualAnalytics unitId={unit.original_unit_id || unit.id} />

          {/* Enhanced Action Button */}
          <Button
            onClick={() => setSelectedUnit(unit)}
            className={`w-full text-white font-semibold py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group-hover:animate-pulse ${
              themeColor === 'green' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' :
              themeColor === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' :
              themeColor === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' :
              'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
            }`}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6 animate-fadeIn">
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

      {/* Quick Stats */}
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

      {/* Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {units.map((unit) => (
          <UnitCard key={unit.name || unit.id} unit={unit} />
        ))}
      </div>

      {/* Detailed View Modal */}
      {selectedUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{selectedUnit.name}</h3>
                <Button
                  onClick={() => setSelectedUnit(null)}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              </div>

              {/* Gallery Section */}
              {selectedUnit.photos && selectedUnit.photos.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Gallery ({selectedUnit.photos.length} photos)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {selectedUnit.photos.map((photo, index) => (
                      <div key={index} className="relative aspect-video bg-gray-100 rounded overflow-hidden group">
                        <img
                          src={photo.url}
                          alt={photo.alt || `Photo ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                          loading="lazy"
                        />
                        {photo.is_primary && (
                          <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            Primary
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Tourism Features (Tier 1)</h4>
                  <p className="text-sm text-gray-600 mb-4">{selectedUnit.tourism_features}</p>

                  <h4 className="font-medium mb-2">Booking Policies (Tier 2)</h4>
                  <p className="text-sm text-gray-600 mb-4">{selectedUnit.booking_policies}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Pricing Rules</h4>
                  <div className="space-y-2 mb-4">
                    {selectedUnit.pricing_rules?.slice(0, 3).map((rule, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                        <strong>{rule.rule_name}:</strong> ${rule.base_price} {rule.currency}
                      </div>
                    ))}
                  </div>

                  <h4 className="font-medium mb-2">Amenities ({selectedUnit.unit_amenities?.length || 0})</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {selectedUnit.unit_amenities?.map((amenity, index) => (
                      <div key={index} className="text-sm text-gray-600 flex items-center">
                        <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                        {amenity.amenity_name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Manual Content Modal */}
      {manualModalId && manualModalUnitId && (
        <ManualContentModal
          manualId={manualModalId}
          unitId={manualModalUnitId}
          tenantId={tenant?.tenant_id || ''}
          onClose={() => {
            setManualModalId(null)
            setManualModalUnitId(null)
          }}
        />
      )}
    </div>
  )
}