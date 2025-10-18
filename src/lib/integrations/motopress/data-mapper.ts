interface MotoPresAccommodation {
  id: number
  title: string  // MotoPress returns string directly
  content?: {
    rendered: string
  }
  description?: string  // MotoPress direct HTML field (NO excerpt field exists)
  // MotoPress direct fields
  size?: number         // Direct size field
  view?: string        // Direct view field
  amenities?: string[] // Direct amenities array
  images?: Array<{     // Direct images array
    id: number
    src: string
    title: string
    alt: string
  }>
  meta: {
    mphb_room_type_id?: number
    mphb_adults?: number
    mphb_children?: number
    mphb_bed_type?: string
    mphb_room_size?: string
    mphb_amenities?: string[]
    mphb_gallery?: string[]
    mphb_price?: number
    mphb_view?: string
    mphb_location?: string
  }
  categories?: Array<{
    id: number
    name: string
  }>
  featured_media: number
  status: string
  date: string
  modified: string
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
  tenant_id: string
  accommodation_type_id?: string
  created_at?: string
  updated_at?: string
}

export class MotoPresDataMapper {
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

    // Build capacity object (JSONB format)
    const adults = meta.mphb_adults || 2
    const children = meta.mphb_children || 0
    const capacity = {
      adults,
      children,
      total: adults + children
    }

    // Build bed configuration object (JSONB format)
    const bed_configuration = {
      bed_type: meta.mphb_bed_type || 'standard',
      bed_count: 1,
      details: meta.mphb_bed_type || 'Standard bed configuration'
    }

    // Extract size from direct field or meta field
    const size_m2 = motoPresData.size ||
      (meta.mphb_room_size ? parseInt(meta.mphb_room_size.match(/(\d+)/)?.[1] || '0') : undefined)

    console.log(`📐 Mapping ${motoPresData.id}: size=${motoPresData.size}, meta_size=${meta.mphb_room_size}, final_size=${size_m2}`)

    // Build tourism features (JSONB format) - use direct fields first
    const tourism_features = {
      amenities: motoPresData.amenities || meta.mphb_amenities || [],
      view: motoPresData.view || meta.mphb_view,
      location: meta.mphb_location,
      price_per_night: meta.mphb_price
    }

    console.log(`🎯 Mapping ${motoPresData.id}: view="${motoPresData.view}", amenities=${motoPresData.amenities?.length || 0}`)

    // Build location details (JSONB format) - use direct fields first
    const location_details = meta.mphb_location || motoPresData.view ? {
      area: meta.mphb_location,
      view: motoPresData.view || meta.mphb_view
    } : undefined

    // Build images array (JSONB format) - use direct fields first
    const title = typeof motoPresData.title === 'string' ? motoPresData.title : motoPresData.title?.rendered || `Accommodation ${motoPresData.id}`
    const images = motoPresData.images?.map((img, index) => ({
      url: img.src,
      alt: `${title} - Image ${index + 1}`,
      is_primary: index === 0
    })) || (meta.mphb_gallery ? meta.mphb_gallery.map((img, index) => ({
      url: img,
      alt: `${title} - Image ${index + 1}`,
      is_primary: index === 0
    })) : [])

    console.log(`🖼️ Mapping ${motoPresData.id}: images=${motoPresData.images?.length || 0}, meta_gallery=${meta.mphb_gallery?.length || 0}, final_images=${images.length}`)

    // Build unique features (JSONB format) - use direct fields first
    const unique_features = {
      motopress_features: motoPresData.amenities || meta.mphb_amenities || [],
      special_attributes: []
    }

    // Extract MotoPress accommodation type for matching
    // Use categories to determine accommodation type or fallback to a default
    const accommodationMphbType = (motoPresData.categories?.length ?? 0) > 0
      ? motoPresData.categories?.[0].name?.toLowerCase()
      : 'apartamento'

    console.log(`🏠 Mapping ${motoPresData.id}: accommodation_mphb_type="${accommodationMphbType}", categories=${JSON.stringify(motoPresData.categories)})`)

    return {
      tenant_id: tenantId,
      motopress_type_id: meta.mphb_room_type_id,
      motopress_unit_id: motoPresData.id,
      accommodation_mphb_type: accommodationMphbType,
      name: motoPresData.title || `Accommodation ${motoPresData.id}`,
      description: description,
      short_description: shortDescription,
      unit_type: 'accommodation',
      capacity,
      bed_configuration,
      size_m2,
      view_type: motoPresData.view || meta.mphb_view,
      tourism_features,
      location_details,
      unique_features,
      images,
      amenities_list: motoPresData.amenities || meta.mphb_amenities || [],
      categories: motoPresData.categories || [],
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
    const adults = meta.mphb_adults || 2
    const children = meta.mphb_children || 0
    const capacity = adults + children

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