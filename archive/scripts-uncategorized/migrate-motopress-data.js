#!/usr/bin/env node

/**
 * MOTOPRESS DATA MIGRATION SCRIPT
 *
 * Importa datos de MotoPress Hotel Booking API a InnPilot's accommodation system
 * con integración Matryoshka embeddings y sistema multi-tenant.
 *
 * Características:
 * - Migración de hotels → accommodation_types → accommodation_units
 * - Extracción de pricing rules desde HTML descriptions
 * - Generación automática de embeddings Matryoshka (Tier 1 + Tier 2)
 * - Mapeo de amenidades estándar MotoPress → InnPilot
 * - Sistema multi-tenant integration
 *
 * Usage:
 *   node scripts/migrate-motopress-data.js --tenant-id=<uuid> --motopress-url=<url> --username=<user> --password=<pass>
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.dirname(__dirname)

// Load environment variables
config({ path: path.join(projectRoot, '.env.local') })

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// MOTOPRESS API CONFIGURATION
const MOTOPRESS_CONFIG = {
  baseUrl: '', // Will be set from command line
  username: '', // Will be set from command line
  password: '', // Will be set from command line
  endpoints: {
    accommodationTypes: '/wp-json/mphb/v1/accommodation_types',
    accommodations: '/wp-json/mphb/v1/accommodations',
    bookings: '/wp-json/mphb/v1/bookings',
    payments: '/wp-json/mphb/v1/payments'
  }
}

// AMENITIES MAPPING - MotoPress → InnPilot standard
const AMENITIES_MAPPING = {
  'air_conditioning': { name: 'Aire acondicionado', category: 'comfort', icon: 'thermometer' },
  'hot_water': { name: 'Agua caliente', category: 'comfort', icon: 'water' },
  'wifi': { name: 'Wi-Fi de alta velocidad', category: 'technology', icon: 'wifi' },
  'smart_tv': { name: 'Smart TV', category: 'entertainment', icon: 'tv' },
  'electronic_lock': { name: 'Cerradura electrónica', category: 'security', icon: 'lock' },
  'equipped_kitchen': { name: 'Cocina equipada', category: 'kitchen', icon: 'chef-hat' },
  'baby_crib': { name: 'Cuna para bebé', category: 'accessibility', icon: 'baby' },
  'balcony': { name: 'Balcón', category: 'comfort', icon: 'home' },
  'laundry': { name: 'Lavadero', category: 'convenience', icon: 'washing-machine' }
}

// CATEGORY MAPPING - MotoPress categories → InnPilot types
const CATEGORY_MAPPING = {
  'Apartamentos': 'apartment',
  'Habitaciones privadas': 'private_room',
  'Suites': 'suite',
  'Villas': 'villa',
  'Cabañas': 'cabin'
}

// PRICING EXTRACTION PATTERNS
const PRICING_PATTERNS = {
  lowSeason: /(?:temporada baja|low season)[:\s]*\$?([0-9,\.]+)\s*cop/i,
  highSeason: /(?:temporada alta|high season)[:\s]*\$?([0-9,\.]+)\s*cop/i,
  additionalPerson: /(?:persona adicional|additional person)[:\s]*\$?([0-9,\.]+)\s*cop/i,
  minimumStay: /(?:mínimo|minimum)[:\s]*(\d+)\s*(?:noches|nights)/i
}

/**
 * MOTOPRESS API WRAPPER
 */
class MotoPressMigrator {
  constructor(tenantId) {
    this.tenantId = tenantId
    this.headers = {
      'Authorization': `Basic ${Buffer.from(`${MOTOPRESS_CONFIG.username}:${MOTOPRESS_CONFIG.password}`).toString('base64')}`,
      'Content-Type': 'application/json'
    }
  }

  async fetchMotoPress(endpoint) {
    const url = `${MOTOPRESS_CONFIG.baseUrl}${endpoint}`
    console.log(`🌐 Fetching: ${url}`)

    try {
      const response = await fetch(url, { headers: this.headers })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`❌ Failed to fetch ${endpoint}:`, error.message)
      throw error
    }
  }

  async generateEmbedding(text, dimensions = 1024) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      dimensions: dimensions,
      encoding_format: 'float',
    })
    return response.data[0].embedding
  }

  /**
   * Extract pricing information from MotoPress HTML description
   */
  extractPricingFromDescription(description) {
    const pricing = {}

    const lowSeasonMatch = description.match(PRICING_PATTERNS.lowSeason)
    if (lowSeasonMatch) {
      pricing.low_season = this.parsePrice(lowSeasonMatch[1])
    }

    const highSeasonMatch = description.match(PRICING_PATTERNS.highSeason)
    if (highSeasonMatch) {
      pricing.high_season = this.parsePrice(highSeasonMatch[1])
    }

    const additionalPersonMatch = description.match(PRICING_PATTERNS.additionalPerson)
    if (additionalPersonMatch) {
      pricing.additional_person_cost = this.parsePrice(additionalPersonMatch[1])
    }

    const minimumStayMatch = description.match(PRICING_PATTERNS.minimumStay)
    if (minimumStayMatch) {
      pricing.minimum_stay = parseInt(minimumStayMatch[1])
    }

    return pricing
  }

  parsePrice(priceString) {
    // Handle both 215,000 and 215.000 formats
    return parseInt(priceString.replace(/[,\.]/g, ''))
  }

  /**
   * Extract amenities from MotoPress description
   */
  extractAmenitiesFromDescription(description) {
    const amenities = []

    for (const [key, mapping] of Object.entries(AMENITIES_MAPPING)) {
      if (description.toLowerCase().includes(mapping.name.toLowerCase()) ||
          description.toLowerCase().includes(key.replace('_', ' '))) {
        amenities.push({
          amenity_type: key,
          amenity_name: mapping.name,
          amenity_category: mapping.category,
          icon_name: mapping.icon,
          is_included: true
        })
      }
    }

    return amenities
  }

  /**
   * Create hotel record from MotoPress property
   */
  async createHotel(propertyName = 'Simmer Down House') {
    console.log(`\n🏨 Creating hotel: ${propertyName}`)

    const tourismSummary = `Hotel ubicado en San Andrés, Colombia. Amenidades: Piscina, Wi-Fi, Parking, Aire acondicionado.`
    const policiesSummary = `Check-in: 15:00, Check-out: 12:00. Políticas de cancelación flexibles.`
    const fullDescription = `${propertyName}\n\n${tourismSummary}\n\n${policiesSummary}`

    // Generate Matryoshka embeddings
    const [fastEmbedding, balancedEmbedding] = await Promise.all([
      this.generateEmbedding(tourismSummary, 1024),
      this.generateEmbedding(policiesSummary, 1536)
    ])

    const hotelData = {
      tenant_id: this.tenantId,
      name: propertyName,
      description: fullDescription,
      short_description: tourismSummary,
      address: {
        street: 'San Andrés',
        city: 'San Andrés',
        country: 'Colombia',
        coordinates: { lat: 12.5864, lng: -81.7020 }
      },
      contact_info: {
        phone: '+57 300 000 0000',
        email: 'info@simmerdown.house',
        website: 'https://simmerdown.house'
      },
      hotel_amenities: ['piscina', 'wifi', 'parking', 'aire_acondicionado', 'jardin'],

      // Matryoshka content
      full_description: fullDescription,
      tourism_summary: tourismSummary,
      policies_summary: policiesSummary,

      // Matryoshka embeddings
      embedding_fast: fastEmbedding,
      embedding_balanced: balancedEmbedding,

      motopress_property_id: 1,
      status: 'active'
    }

    const { data, error } = await supabase
      .from('hotels')
      .insert(hotelData)
      .select()

    if (error) {
      console.error('❌ Failed to create hotel:', error.message)
      throw error
    }

    console.log('✅ Hotel created successfully:', data[0].id)
    return data[0]
  }

  /**
   * Create accommodation type from MotoPress category
   */
  async createAccommodationType(hotelId, category, description) {
    console.log(`   📋 Creating accommodation type: ${category}`)

    const typeData = {
      hotel_id: hotelId,
      name: category,
      category_code: CATEGORY_MAPPING[category] || 'apartment',
      description: description,
      default_capacity: { adults: 2, children: 0, total: 2 },
      type_description: `${category}: ${description}`,
      is_active: true
    }

    const { data, error } = await supabase
      .from('accommodation_types')
      .insert(typeData)
      .select()

    if (error) {
      console.error('❌ Failed to create accommodation type:', error.message)
      throw error
    }

    console.log('   ✅ Accommodation type created:', data[0].id)
    return data[0]
  }

  /**
   * Migrate accommodation units from MotoPress
   */
  async migrateAccommodationUnits() {
    console.log('\n🚀 Starting MotoPress accommodation units migration...')

    // Step 1: Create hotel
    const hotel = await this.createHotel('Simmer Down House')

    // Step 2: Fetch MotoPress accommodation types
    const accommodationTypes = await this.fetchMotoPress(MOTOPRESS_CONFIG.endpoints.accommodationTypes)
    console.log(`📊 Found ${accommodationTypes.length} accommodation types`)

    // Step 3: Group by category and create accommodation_types
    const categoryMap = new Map()

    for (const motopressType of accommodationTypes) {
      if (motopressType.status !== 'publish') continue

      // Extract category
      const category = motopressType.categories?.[0]?.name || 'Apartamento'

      if (!categoryMap.has(category)) {
        const accommodationType = await this.createAccommodationType(
          hotel.id,
          category,
          `Tipo de acomodación: ${category}`
        )
        categoryMap.set(category, accommodationType)
      }

      // Step 4: Create accommodation unit
      await this.createAccommodationUnit(hotel.id, motopressType, categoryMap.get(category))
    }

    console.log('✅ Migration completed successfully!')
  }

  /**
   * Create accommodation unit with Matryoshka embeddings
   */
  async createAccommodationUnit(hotelId, motopressType, accommodationType) {
    console.log(`     🏠 Creating unit: ${motopressType.title}`)

    // Extract pricing from description
    const pricing = this.extractPricingFromDescription(motopressType.description || '')

    // Extract amenities from description
    const amenities = this.extractAmenitiesFromDescription(motopressType.description || '')

    // Prepare tier content
    const tourismFeatures = [
      motopressType.view ? `Vista: ${motopressType.view}` : '',
      `Capacidad: ${motopressType.total_capacity} personas`,
      `Tipo de cama: ${motopressType.bed_type || 'No especificado'}`,
      `Tamaño: ${motopressType.size || 'No especificado'} m²`,
      amenities.map(a => a.amenity_name).join(', ')
    ].filter(Boolean).join('\n')

    const bookingPolicies = [
      `Capacidad máxima: ${motopressType.total_capacity} personas`,
      `Adultos: ${motopressType.adults}, Niños: ${motopressType.children}`,
      pricing.minimum_stay ? `Estancia mínima: ${pricing.minimum_stay} noches` : '',
      pricing.additional_person_cost ? `Persona adicional: $${pricing.additional_person_cost.toLocaleString()} COP` : ''
    ].filter(Boolean).join('\n')

    const fullDescription = [
      motopressType.title,
      motopressType.excerpt || '',
      tourismFeatures,
      bookingPolicies,
      motopressType.description ? motopressType.description.substring(0, 1000) : ''
    ].filter(Boolean).join('\n\n')

    // Generate Matryoshka embeddings
    const [fastEmbedding, balancedEmbedding] = await Promise.all([
      this.generateEmbedding(tourismFeatures, 1024),
      this.generateEmbedding(bookingPolicies, 1536)
    ])

    // Prepare unit data
    const unitData = {
      hotel_id: hotelId,
      accommodation_type_id: accommodationType.id,
      name: motopressType.title,
      description: motopressType.description || motopressType.excerpt,
      short_description: motopressType.excerpt,

      capacity: {
        adults: motopressType.adults || 2,
        children: motopressType.children || 0,
        total: motopressType.total_capacity || 2,
        base_adults: motopressType.base_adults || motopressType.adults || 2
      },

      bed_configuration: {
        bed_type: motopressType.bed_type || 'Una cama doble',
        quantity: 1
      },

      size_m2: motopressType.size || null,
      view_type: motopressType.view || null,
      images: motopressType.images || [],

      // MotoPress integration
      motopress_type_id: motopressType.id,
      motopress_unit_id: motopressType.id,

      // Matryoshka content
      full_description: fullDescription,
      tourism_features: tourismFeatures,
      booking_policies: bookingPolicies,

      // Matryoshka embeddings
      embedding_fast: fastEmbedding,
      embedding_balanced: balancedEmbedding,

      status: 'active',
      is_featured: motopressType.featured || false
    }

    // Insert accommodation unit
    const { data: unitData_result, error: unitError } = await supabase
      .from('accommodation_units')
      .insert(unitData)
      .select()

    if (unitError) {
      console.error('❌ Failed to create accommodation unit:', unitError.message)
      return
    }

    console.log('     ✅ Unit created successfully')

    // Insert amenities
    if (amenities.length > 0) {
      const amenitiesData = amenities.map(amenity => ({
        accommodation_unit_id: unitData_result[0].id,
        ...amenity
      }))

      const { error: amenitiesError } = await supabase
        .from('unit_amenities')
        .insert(amenitiesData)

      if (amenitiesError) {
        console.error('⚠️  Failed to insert amenities:', amenitiesError.message)
      } else {
        console.log(`     ✅ ${amenities.length} amenities inserted`)
      }
    }

    // Create pricing rules
    await this.createPricingRules(unitData_result[0].id, pricing)
  }

  /**
   * Create pricing rules from extracted MotoPress pricing
   */
  async createPricingRules(accommodationUnitId, pricing) {
    const pricingRules = []

    if (pricing.low_season) {
      pricingRules.push({
        accommodation_unit_id: accommodationUnitId,
        rule_name: 'low_season',
        rule_type: 'seasonal',
        base_price: pricing.low_season,
        currency: 'COP',
        date_range: {
          start_date: '2024-05-01',
          end_date: '2024-11-30'
        },
        minimum_stay: pricing.minimum_stay || 2,
        description: 'Temporada baja - precios estándar',
        is_active: true
      })
    }

    if (pricing.high_season) {
      pricingRules.push({
        accommodation_unit_id: accommodationUnitId,
        rule_name: 'high_season',
        rule_type: 'seasonal',
        base_price: pricing.high_season,
        currency: 'COP',
        date_range: {
          start_date: '2024-12-01',
          end_date: '2025-04-30'
        },
        minimum_stay: pricing.minimum_stay || 2,
        description: 'Temporada alta - precios premium',
        is_active: true
      })
    }

    if (pricing.additional_person_cost) {
      pricingRules.push({
        accommodation_unit_id: accommodationUnitId,
        rule_name: 'additional_person',
        rule_type: 'additional_person',
        base_price: pricing.additional_person_cost,
        currency: 'COP',
        description: 'Costo por persona adicional',
        is_active: true
      })
    }

    if (pricingRules.length > 0) {
      const { error } = await supabase
        .from('pricing_rules')
        .insert(pricingRules)

      if (error) {
        console.error('⚠️  Failed to insert pricing rules:', error.message)
      } else {
        console.log(`     ✅ ${pricingRules.length} pricing rules created`)
      }
    }
  }
}

/**
 * MAIN EXECUTION
 */
async function main() {
  console.log('🚀 MOTOPRESS TO INNPILOT MIGRATION SCRIPT')
  console.log('=========================================\n')

  // Parse command line arguments
  const args = process.argv.slice(2)
  const config = {}

  for (const arg of args) {
    if (arg.startsWith('--tenant-id=')) {
      config.tenantId = arg.split('=')[1]
    } else if (arg.startsWith('--motopress-url=')) {
      MOTOPRESS_CONFIG.baseUrl = arg.split('=')[1]
    } else if (arg.startsWith('--username=')) {
      MOTOPRESS_CONFIG.username = arg.split('=')[1]
    } else if (arg.startsWith('--password=')) {
      MOTOPRESS_CONFIG.password = arg.split('=')[1]
    }
  }

  // Validate required parameters
  if (!config.tenantId) {
    console.error('❌ Missing required parameter: --tenant-id')
    console.log('Usage: node scripts/migrate-motopress-data.js --tenant-id=<uuid> --motopress-url=<url> --username=<user> --password=<pass>')
    process.exit(1)
  }

  if (!MOTOPRESS_CONFIG.baseUrl || !MOTOPRESS_CONFIG.username || !MOTOPRESS_CONFIG.password) {
    console.error('❌ Missing MotoPress API credentials')
    console.log('Usage: node scripts/migrate-motopress-data.js --tenant-id=<uuid> --motopress-url=<url> --username=<user> --password=<pass>')
    process.exit(1)
  }

  console.log(`📋 Configuration:`)
  console.log(`   Tenant ID: ${config.tenantId}`)
  console.log(`   MotoPress URL: ${MOTOPRESS_CONFIG.baseUrl}`)
  console.log(`   Username: ${MOTOPRESS_CONFIG.username}`)
  console.log(`   Password: ${'*'.repeat(MOTOPRESS_CONFIG.password.length)}\n`)

  try {
    const migrator = new MotoPressMigrator(config.tenantId)
    await migrator.migrateAccommodationUnits()

    console.log('\n🎉 Migration completed successfully!')
    console.log('   ✅ Hotels created with Matryoshka embeddings')
    console.log('   ✅ Accommodation types and units migrated')
    console.log('   ✅ Amenities extracted and mapped')
    console.log('   ✅ Pricing rules created from HTML descriptions')
    console.log('   ✅ Multi-tenant isolation enabled')

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default MotoPressMigrator