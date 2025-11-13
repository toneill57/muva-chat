interface MotoPresAccommodation {
  id: number
  title: string | { rendered: string }  // MotoPress can return string OR object
  excerpt?: string  // Clean text preview (used in extractAccommodationPreview)
  content?: {
    rendered: string
  }
  description?: string  // MotoPress direct HTML field (NO excerpt field exists)
  // MotoPress direct fields (TOP LEVEL - not in meta!)
  adults?: number          // Top-level adults capacity
  children?: number        // Top-level children capacity
  total_capacity?: number  // Top-level total capacity
  base_adults?: number     // Top-level base adults
  base_children?: number   // Top-level base children
  size?: number           // Direct size field
  view?: string          // Direct view field
  bed_type?: string      // Direct bed type field
  amenities?: string[]   // Direct amenities array
  images?: Array<{       // Direct images array
    id: number
    src: string
    title: string
    alt: string
  }>
  services?: string[]    // Array of service names
  attributes?: string[]  // Array of attributes
  tags?: Array<{         // Tags array
    id: number
    name: string
  }>
  featured_media?: number // Featured media ID
  _links?: {              // WordPress _links with featured media URL
    featured_media?: Array<{
      href: string
    }>
  }
  meta?: {
    mphb_room_type_id?: number
    mphb_price?: number
    mphb_location?: string
  }
  categories?: Array<{
    id: number
    name: string
  }>
  status: string
  date?: string
  modified?: string
}

interface AccommodationUnit {
  id?: string
  hotel_id?: string
  motopress_type_id?: number
  motopress_unit_id?: number
  accommodation_mphb_type?: string
  name: string
  unit_number?: string
  description?: string
  short_description?: string
  unit_type?: string
  capacity?: any // JSONB
  bed_configuration?: any // JSONB
  size_m2?: number
  floor_number?: number
  view_type?: string
  tourism_features?: any // JSONB
  booking_policies?: any // JSONB
  unique_features?: any // JSONB
  accessibility_features?: any // JSONB
  location_details?: any // JSONB
  is_featured?: boolean
  display_order?: number
  status?: string
  embedding_fast?: number[]
  embedding_balanced?: number[]
  images?: any // JSONB
  amenities_list?: any // JSONB
  categories?: Array<{
    id: number
    name: string
  }> // MotoPress categories for accommodation type classification
  pricing?: {
    base_price?: number
    base_price_low_season?: number
    base_price_high_season?: number
    currency?: string
    price_per_person_low?: number
    price_per_person_high?: number
    minimum_stay?: number
    base_adults?: number
    base_children?: number
    season_id?: number
    priority?: number
    price_variations?: Array<{
      adults: number
      children: number
      price: number
    }>
  } // JSONB - MotoPress pricing data from rates API
  // UI-specific computed fields (added by API route)
  accommodation_type?: string // Human-readable type name
  photo_count?: number // Count of images
  children_capacity?: number // Child capacity
  total_capacity?: number // adults + children
  location_area?: string // Location area name
  amenities_summary?: {
    total: number
    included: number
    premium: number
    featured: number
  }
  pricing_summary?: {
    seasonal_rules: number
    hourly_rules: number
    base_price_range: [number, number]
    price_per_person?: number // Calculated: base_price / total_capacity
  }
  // NEW: Enrichment fields from MotoPress
  services_list?: string[] // Services array from MotoPress
  attributes_list?: string[] // Attributes array from MotoPress
  tags_list?: Array<{ id: number; name: string }> // Tags from MotoPress
  featured_image_url?: string // Featured media URL
  capacity_differential?: number // total_capacity - (adults + children) = extra spaces
  highlights?: string[] // Parsed from excerpt (balcón, acústicas, etc)
  category_badge?: string // Primary category name for visual badge
  room_type_id?: number // MotoPress room type ID
  chunks_count?: number // Number of semantic chunks
  embedding_status?: {
    has_fast: boolean
    has_balanced: boolean
    fast_dimensions: number
    balanced_dimensions: number
  }
  tenant_id: string
  accommodation_type_id?: string
  created_at?: string
  updated_at?: string
}

export class MotoPresDataMapper {
  /**
   * Parse excerpt/description to extract key highlights
   * Looks for keywords that are selling points
   */
  private static extractHighlights(text: string): string[] {
    if (!text) return []

    const highlights: string[] = []
    const lowerText = text.toLowerCase()

    // Key features to look for
    const featureMap: { [key: string]: string } = {
      'balcón': '🏖️ Con balcón',
      'balcon': '🏖️ Con balcón',
      'terraza': '🏖️ Con terraza',
      'acústica': '🔇 Ventanas acústicas',
      'acustica': '🔇 Ventanas acústicas',
      'vista al mar': '🌊 Vista al mar',
      'vista mar': '🌊 Vista al mar',
      'frente al mar': '🌊 Frente al mar',
      'aire acondicionado': '❄️ Aire acondicionado',
      'wifi': '📶 WiFi gratuito',
      'wi-fi': '📶 WiFi gratuito',
      'cocina': '🍳 Cocina equipada',
      'cocineta': '🍳 Cocineta',
      'jacuzzi': '🛁 Jacuzzi privado',
      'piscina': '🏊 Acceso a piscina',
      'estacionamiento': '🚗 Estacionamiento',
      'parking': '🚗 Estacionamiento',
      'pet-friendly': '🐕 Pet-friendly',
      'mascota': '🐕 Pet-friendly',
      'desayuno incluido': '🍳 Desayuno incluido',
      'desayuno': '🍳 Desayuno disponible'
    }

    // Check for each feature
    for (const [keyword, highlight] of Object.entries(featureMap)) {
      if (lowerText.includes(keyword) && !highlights.includes(highlight)) {
        highlights.push(highlight)
      }
    }

    return highlights
  }

  static mapToAccommodationUnit(
    motoPresData: MotoPresAccommodation,
    tenantId: string
  ): AccommodationUnit {
    console.log('Processing accommodation:', {
      id: motoPresData.id,
      title: motoPresData.title,
      titleType: typeof motoPresData.title
    })
    const meta = motoPresData.meta || {}

    // Use excerpt field which contains clean text (no HTML)
    const description = motoPresData.excerpt || ''
    const shortDescription = description.length > 200
      ? description.substring(0, 200) + '...'
      : description

    console.log(`📝 Mapping ${motoPresData.id}: excerpt length=${description.length}`)

    // 🔍 DEBUG: Log raw capacity data from MotoPress (TOP-LEVEL fields, not meta!)
    console.log(`[CAPACITY DEBUG] ${motoPresData.id} "${typeof motoPresData.title === 'string' ? motoPresData.title : motoPresData.title?.rendered}":`, {
      adults_raw: motoPresData.adults,
      adults_type: typeof motoPresData.adults,
      children_raw: motoPresData.children,
      children_type: typeof motoPresData.children,
      total_capacity_raw: motoPresData.total_capacity,
      base_adults_raw: motoPresData.base_adults,
      base_children_raw: motoPresData.base_children
    });

    // Build capacity object (JSONB format)
    // Use explicit type check to preserve 0 values (0 || 2 would incorrectly return 2)
    // MotoPress stores capacity at TOP LEVEL, not in meta!
    const adults = typeof motoPresData.adults === 'number' ? motoPresData.adults :
                   (typeof motoPresData.base_adults === 'number' ? motoPresData.base_adults : 2)
    const children = typeof motoPresData.children === 'number' ? motoPresData.children :
                     (typeof motoPresData.base_children === 'number' ? motoPresData.base_children : 0)
    const capacity = {
      adults,
      children,
      total: typeof motoPresData.total_capacity === 'number' ? motoPresData.total_capacity : (adults + children)
    }

    console.log(`[CAPACITY MAPPED] ${motoPresData.id}:`, capacity);

    // Build bed configuration object (JSONB format)
    // MotoPress stores bed_type at TOP LEVEL, not in meta!
    const bed_configuration = {
      bed_type: motoPresData.bed_type || 'standard',
      bed_count: 1,
      details: motoPresData.bed_type || 'Standard bed configuration'
    }

    // Extract size from top-level field (MotoPress stores size at TOP LEVEL)
    const size_m2 = motoPresData.size

    console.log(`📐 Mapping ${motoPresData.id}: size=${motoPresData.size}`)

    // Build tourism features (JSONB format) - MotoPress stores these at TOP LEVEL
    const tourism_features = {
      amenities: motoPresData.amenities || [],
      view: motoPresData.view,
      location: meta.mphb_location,
      price_per_night: meta.mphb_price
    }

    console.log(`🎯 Mapping ${motoPresData.id}: view="${motoPresData.view}", amenities=${motoPresData.amenities?.length || 0}`)

    // Build location details (JSONB format) - location in meta, view at top level
    const location_details = meta.mphb_location || motoPresData.view ? {
      area: meta.mphb_location,
      view: motoPresData.view
    } : undefined

    // Build images array (JSONB format) - MotoPress stores images at TOP LEVEL
    const title = typeof motoPresData.title === 'string' ? motoPresData.title : motoPresData.title?.rendered || `Accommodation ${motoPresData.id}`
    const images = motoPresData.images?.map((img, index) => ({
      url: img.src,
      alt: `${title} - Image ${index + 1}`,
      is_primary: index === 0
    })) || []

    console.log(`🖼️ Mapping ${motoPresData.id}: images=${motoPresData.images?.length || 0}, final_images=${images.length}`)

    // Build unique features (JSONB format) - MotoPress stores amenities at TOP LEVEL
    const unique_features = {
      motopress_features: motoPresData.amenities || [],
      special_attributes: []
    }

    // Extract MotoPress accommodation type for matching
    // Use categories to determine accommodation type or fallback to a default
    const accommodationMphbType = (motoPresData.categories?.length ?? 0) > 0
      ? motoPresData.categories?.[0].name?.toLowerCase()
      : 'apartamento'

    console.log(`🏠 Mapping ${motoPresData.id}: accommodation_mphb_type="${accommodationMphbType}", categories=${JSON.stringify(motoPresData.categories)})`)

    // Extract highlights from excerpt/description
    const highlights = this.extractHighlights(description || motoPresData.description || '')

    // Calculate capacity differential (extra spaces beyond base capacity)
    const baseCapacity = adults + children
    const capacityDifferential = capacity.total - baseCapacity

    // Extract featured image URL from _links if available
    const featuredImageUrl = motoPresData._links?.featured_media?.[0]?.href

    // Extract category badge (first category name)
    const categoryBadge = motoPresData.categories?.[0]?.name

    console.log(`✨ Enrichment ${motoPresData.id}: highlights=${highlights.length}, capacity_diff=${capacityDifferential}, featured_img=${!!featuredImageUrl}`)

    return {
      tenant_id: tenantId,
      motopress_type_id: meta.mphb_room_type_id,
      motopress_unit_id: motoPresData.id,
      accommodation_mphb_type: accommodationMphbType,
      name: title,
      description: description,
      short_description: shortDescription,
      unit_type: 'accommodation',
      capacity,
      bed_configuration,
      size_m2,
      view_type: motoPresData.view,
      tourism_features,
      location_details,
      unique_features,
      images,
      amenities_list: motoPresData.amenities || [],
      categories: motoPresData.categories || [],
      // NEW: Enrichment fields
      services_list: motoPresData.services || [],
      attributes_list: motoPresData.attributes || [],
      tags_list: motoPresData.tags || [],
      featured_image_url: featuredImageUrl,
      capacity_differential: capacityDifferential,
      highlights,
      category_badge: categoryBadge,
      status: motoPresData.status === 'publish' ? 'active' : 'inactive',
      is_featured: false,
      display_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  static mapBulkAccommodations(
    motoPresData: MotoPresAccommodation[],
    tenantId: string
  ): AccommodationUnit[] {
    return motoPresData.map(accommodation =>
      this.mapToAccommodationUnit(accommodation, tenantId)
    )
  }

  static validateMotoPresData(data: any): data is MotoPresAccommodation {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.id === 'number' &&
      typeof data.title === 'object' &&
      typeof data.title.rendered === 'string' &&
      typeof data.status === 'string'
    )
  }

  static extractAccommodationPreview(data: MotoPresAccommodation): {
    id: number
    name: string
    capacity: number
    price?: number
    status: string
    description_preview: string
  } {
    const meta = data.meta || {}
    // MotoPress stores capacity at TOP LEVEL, not in meta!
    const adults = typeof data.adults === 'number' ? data.adults :
                   (typeof data.base_adults === 'number' ? data.base_adults : 2)
    const children = typeof data.children === 'number' ? data.children :
                     (typeof data.base_children === 'number' ? data.base_children : 0)
    const capacity = typeof data.total_capacity === 'number' ? data.total_capacity : (adults + children)

    // Use excerpt for clean preview text
    const descriptionPreview = data.excerpt
      ? (data.excerpt.length > 100 ? data.excerpt.substring(0, 100) + '...' : data.excerpt)
      : ''

    return {
      id: data.id,
      name: typeof data.title === 'string' ? data.title : data.title?.rendered || `Accommodation ${data.id}`,
      capacity,
      price: meta.mphb_price,
      status: data.status,
      description_preview: descriptionPreview
    }
  }

  static mapRatesToPricing(rates: any[]): {
    accommodation_type_id: number
    base_price: number
    base_price_low_season: number
    base_price_high_season: number
    currency: string
    price_per_person_low: number
    price_per_person_high: number
    minimum_stay: number
    base_adults: number
    base_children: number
    season_id: number
    priority: number
    price_variations: Array<{
      adults: number
      children: number
      price: number
    }>
  }[] {
    return rates.map(rate => {
      const seasonPrices = rate.season_prices || []

      // Handle multiple seasons or single season
      let basePriceLow = 0
      let basePriceHigh = 0

      if (seasonPrices.length === 0) {
        // No seasons defined
        basePriceLow = 0
        basePriceHigh = 0
      } else if (seasonPrices.length === 1) {
        // Single season (like Tu Casa Mar) - use same price for both
        basePriceLow = seasonPrices[0].base_price || 0
        basePriceHigh = seasonPrices[0].base_price || 0
      } else {
        // Multiple seasons - find lowest and highest by priority
        // Lower priority = higher price (common convention)
        const sortedByPrice = [...seasonPrices].sort((a, b) => (a.base_price || 0) - (b.base_price || 0))
        basePriceLow = sortedByPrice[0]?.base_price || 0
        basePriceHigh = sortedByPrice[sortedByPrice.length - 1]?.base_price || 0
      }

      // Get first season price for other fields (priority 0 is default)
      const primarySeason = seasonPrices[0] || {}

      return {
        accommodation_type_id: rate.accommodation_type_id,
        base_price: primarySeason.base_price || 0,
        base_price_low_season: basePriceLow,
        base_price_high_season: basePriceHigh,
        currency: 'COP', // MotoPress uses COP for Colombian properties
        price_per_person_low: 0, // MotoPress uses variations instead
        price_per_person_high: 0, // MotoPress uses variations instead
        minimum_stay: 1, // Default minimum stay
        base_adults: primarySeason.base_adults || 2,
        base_children: primarySeason.base_children || 0,
        season_id: primarySeason.season_id || 0,
        priority: primarySeason.priority || 0,
        price_variations: primarySeason.variations || []
      }
    })
  }
}