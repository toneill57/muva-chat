interface MotoPresAccommodation {
  id: number
  title: {
    rendered: string
  } | string  // MotoPress can return string directly
  content?: {
    rendered: string
  }
  description?: string  // MotoPress direct HTML field
  excerpt?: string      // MotoPress short description
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

    // Clean HTML content for description - MotoPress format handling
    const rawDescription = motoPresData.description || motoPresData.content?.rendered
    const cleanDescription = rawDescription
      ? rawDescription.replace(/<[^>]*>/g, '').trim()
      : undefined

    console.log(`📝 Mapping ${motoPresData.id}: description found=${!!rawDescription}, length=${rawDescription?.length || 0}`)

    // Use MotoPress excerpt or create short description from cleaned content
    const shortDescription = motoPresData.excerpt?.trim() ||
      (cleanDescription && cleanDescription.length > 200
        ? cleanDescription.substring(0, 200) + '...'
        : cleanDescription)

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
      name: (typeof motoPresData.title === 'string' ? motoPresData.title : motoPresData.title?.rendered) || `Accommodation ${motoPresData.id}`,
      description: cleanDescription,
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

    // Get first 100 characters of description without HTML
    const cleanDescription = data.content?.rendered
      ? data.content.rendered.replace(/<[^>]*>/g, '').trim()
      : ''
    const descriptionPreview = cleanDescription.length > 100
      ? cleanDescription.substring(0, 100) + '...'
      : cleanDescription

    return {
      id: data.id,
      name: typeof data.title === 'string' ? data.title : data.title.rendered,
      capacity,
      price: meta.mphb_price,
      status: data.status,
      description_preview: descriptionPreview
    }
  }
}