/**
 * Accommodation Unit Types
 * Shared types for accommodation-related components
 */

export interface AccommodationUnit {
  id: string
  original_unit_id?: string // ID from hotels.accommodation_units (for manuals FK)
  name: string
  unit_number: string
  description: string
  short_description: string
  capacity: {
    adults?: number
    children?: number
  }
  bed_configuration: {
    bed_type?: string
    bed_count?: number
  }
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
  manuals_count?: number
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
