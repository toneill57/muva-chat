import { createServerClient } from '@/lib/supabase'
import { MotoPresClient } from './client'
import { MotoPresDataMapper } from './data-mapper'
import { generateEmbedding } from '@/lib/openai'

interface SyncResult {
  success: boolean
  created: number
  updated: number
  errors: string[]
  totalProcessed: number
  message: string
  embeddings_generated?: number
  embeddings_failed?: number
  embeddings_skipped?: number
}

interface IntegrationConfig {
  id: string
  tenant_id: string
  config_data: any
  is_active: boolean
}

export class MotoPresSyncManager {
  private supabase = createServerClient()

  async getIntegrationConfig(tenantId: string): Promise<IntegrationConfig | null> {
    const { data, error } = await this.supabase
      .from('integration_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'motopress')
      .eq('is_active', true)
      .single()

    if (error || !data) {
      console.error('No active MotoPress integration found for tenant:', tenantId)
      return null
    }

    return data
  }

  private async decrypt(configData: any): Promise<{ api_key?: string; consumer_key?: string; consumer_secret: string; site_url: string }> {
    // Import decryptCredentials dynamically to avoid circular dependencies
    const { decryptCredentials } = await import('@/lib/admin-auth')

    try {
      // Decrypt the credentials using the proper crypto function
      const decryptedApiKey = await decryptCredentials(configData.api_key)
      const decryptedConsumerSecret = await decryptCredentials(configData.consumer_secret)

      return {
        api_key: decryptedApiKey,
        consumer_key: decryptedApiKey, // Alias for backwards compatibility
        consumer_secret: decryptedConsumerSecret,
        site_url: configData.site_url // site_url is not encrypted
      }
    } catch (error) {
      console.error('Failed to decrypt credentials:', error)
      throw new Error('Failed to decrypt MotoPress credentials')
    }
  }

  async syncAccommodations(tenantId: string, forceEmbeddings: boolean = false): Promise<SyncResult> {
    const startTime = Date.now()
    let created = 0
    let updated = 0
    let embeddingsGenerated = 0
    let embeddingsFailed = 0
    let embeddingsSkipped = 0
    const errors: string[] = []

    try {
      // Get integration configuration
      const config = await this.getIntegrationConfig(tenantId)
      if (!config) {
        return {
          success: false,
          created: 0,
          updated: 0,
          errors: ['No active MotoPress integration configuration found'],
          totalProcessed: 0,
          message: 'Integration not configured'
        }
      }

      // Decrypt credentials
      const credentials = await this.decrypt(config.config_data)

      // Initialize MotoPress client
      const client = new MotoPresClient({
        apiKey: credentials.consumer_key || credentials.api_key || '', // Support both field names for backwards compatibility
        consumerSecret: credentials.consumer_secret,
        siteUrl: credentials.site_url
      })

      // Test connection first
      const connectionTest = await client.testConnection()
      if (!connectionTest.success) {
        // Provide more specific error messaging
        let errorMessage = 'Connection test failed'
        if (connectionTest.message.includes('401') || connectionTest.message.includes('invalid_username')) {
          errorMessage = 'Authentication failed - Invalid MotoPress credentials'
        } else if (connectionTest.message.includes('404')) {
          errorMessage = 'MotoPress API endpoint not found - Check site URL'
        } else if (connectionTest.message.includes('timeout') || connectionTest.message.includes('Network')) {
          errorMessage = 'Network connection failed - Check internet connectivity'
        }

        return {
          success: false,
          created: 0,
          updated: 0,
          errors: [`${errorMessage}: ${connectionTest.message}`],
          totalProcessed: 0,
          message: errorMessage
        }
      }

      // Fetch all accommodations from MotoPress
      console.log('Fetching accommodations from MotoPress...')
      const response = await client.getAllAccommodations()

      if (response.error || !response.data) {
        return {
          success: false,
          created: 0,
          updated: 0,
          errors: [response.error || 'Failed to fetch accommodations'],
          totalProcessed: 0,
          message: 'Failed to fetch data from MotoPress'
        }
      }

      const motoPresAccommodations = response.data
      console.log(`Retrieved ${motoPresAccommodations.length} accommodations from MotoPress`)

      // Fetch all rates (pricing) from MotoPress in bulk
      console.log('Fetching rates (pricing) from MotoPress...')
      const ratesResponse = await client.getAllRates()

      if (ratesResponse.error || !ratesResponse.data) {
        console.warn('⚠️ Failed to fetch rates:', ratesResponse.error)
        // Continue without pricing data
      }

      const motoPresRates = ratesResponse.data || []
      console.log(`Retrieved ${motoPresRates.length} rates from MotoPress`)

      // Map rates to pricing by accommodation_type_id
      const pricingMap = new Map()
      if (motoPresRates.length > 0) {
        const pricingData = MotoPresDataMapper.mapRatesToPricing(motoPresRates)
        pricingData.forEach(pricing => {
          pricingMap.set(pricing.accommodation_type_id, pricing)
        })
        console.log(`📊 Mapped pricing for ${pricingMap.size} accommodations`)
      }

      // Get hotel_id for this tenant (dynamic lookup)
      const { data: hotel, error: hotelError } = await this.supabase
        .from('hotels')
        .select('id')
        .eq('tenant_id', tenantId)
        .single()

      if (hotelError || !hotel) {
        return {
          success: false,
          created: 0,
          updated: 0,
          errors: [`No hotel found for tenant_id: ${tenantId}. Error: ${hotelError?.message || 'Hotel not found'}`],
          totalProcessed: 0,
          message: 'Hotel lookup failed'
        }
      }

      const hotelId = hotel.id
      console.log(`🏨 Dynamic lookup: tenant_id="${tenantId}" → hotel_id="${hotelId}"`)

      // Map to accommodation units
      const accommodationUnits = MotoPresDataMapper.mapBulkAccommodations(
        motoPresAccommodations,
        tenantId
      )

      // Add hotel_id and pricing to all units
      accommodationUnits.forEach(unit => {
        unit.hotel_id = hotelId

        // Add pricing data as JSONB object if available
        const pricing = pricingMap.get(unit.motopress_unit_id)
        if (pricing) {
          unit.pricing = {
            base_price: pricing.base_price,
            base_price_low_season: pricing.base_price_low_season,
            base_price_high_season: pricing.base_price_high_season,
            currency: pricing.currency,
            price_per_person_low: pricing.price_per_person_low,
            price_per_person_high: pricing.price_per_person_high,
            minimum_stay: pricing.minimum_stay,
            base_adults: pricing.base_adults,
            base_children: pricing.base_children,
            season_id: pricing.season_id,
            priority: pricing.priority,
            price_variations: pricing.price_variations
          }
          console.log(`💰 Added pricing to ${unit.name}: $${pricing.base_price} COP (Low: $${pricing.base_price_low_season}, High: $${pricing.base_price_high_season})`)
        } else {
          unit.pricing = {}
          console.warn(`⚠️ No pricing found for accommodation_type_id ${unit.motopress_unit_id}`)
        }
      })

      // Process each accommodation unit
      for (const unit of accommodationUnits) {
        try {
          // Check if already exists by motopress_instance_id using SQL (hotels schema)
          const { data: existingResult, error: selectError } = await this.supabase.rpc('exec_sql', {
            sql: `
              SELECT id FROM hotels.accommodation_units
              WHERE tenant_id = '${tenantId}'
              AND motopress_unit_id = ${unit.motopress_unit_id}
              LIMIT 1
            `
          })

          if (selectError) {
            errors.push(`Failed to check existing ${unit.name}: ${selectError.message}`)
            continue
          }

          const existing = existingResult?.data?.[0]

          if (existing) {
            // Update existing using SQL (hotels schema)
            const updateSql = `
              UPDATE hotels.accommodation_units
              SET
                name = '${unit.name?.replace(/'/g, "''")}',
                description = '${unit.description?.replace(/'/g, "''") || ''}',
                short_description = '${unit.short_description?.replace(/'/g, "''") || ''}',
                capacity = '${JSON.stringify(unit.capacity)}'::jsonb,
                bed_configuration = '${JSON.stringify(unit.bed_configuration)}'::jsonb,
                view_type = '${unit.view_type || ''}',
                tourism_features = '${JSON.stringify(unit.tourism_features)}'::jsonb,
                unique_features = '${JSON.stringify(unit.unique_features)}'::jsonb,
                images = '${JSON.stringify(unit.images)}'::jsonb,
                accommodation_mphb_type = '${unit.accommodation_mphb_type || ''}',
                pricing = '${JSON.stringify(unit.pricing || {})}'::jsonb,
                status = '${unit.status}',
                updated_at = NOW()
              WHERE id = '${existing.id}'
            `

            const { error: updateError } = await this.supabase.rpc('exec_sql', { sql: updateSql })

            if (updateError) {
              errors.push(`Failed to update ${unit.name}: ${updateError.message}`)
            } else {
              updated++
              console.log(`Updated accommodation: ${unit.name}`)

              // Regenerate embeddings for updated accommodation if forceEmbeddings is true
              if (forceEmbeddings) {
                try {
                  await this.generateEmbeddingsForUnit(unit, tenantId, hotelId)
                  embeddingsGenerated++
                } catch (embeddingError: any) {
                  console.error(`Failed to generate embeddings for ${unit.name}:`, embeddingError)
                  errors.push(`Embeddings failed for ${unit.name}: ${embeddingError.message}`)
                  embeddingsFailed++
                }
              } else {
                embeddingsSkipped++
              }
            }
          } else {
            // Create new using SQL (hotels schema) with deterministic UUID
            const insertSql = `
              INSERT INTO hotels.accommodation_units (
                id,
                hotel_id, tenant_id, motopress_unit_id, name, description, short_description,
                capacity, bed_configuration, view_type, tourism_features, unique_features,
                images, accommodation_mphb_type, pricing, status, is_featured, display_order, created_at, updated_at
              ) VALUES (
                hotels.generate_deterministic_uuid('${unit.tenant_id}', ${unit.motopress_unit_id}),
                '${unit.hotel_id}',
                '${unit.tenant_id}',
                ${unit.motopress_unit_id},
                '${unit.name?.replace(/'/g, "''")}',
                '${unit.description?.replace(/'/g, "''") || ''}',
                '${unit.short_description?.replace(/'/g, "''") || ''}',
                '${JSON.stringify(unit.capacity)}'::jsonb,
                '${JSON.stringify(unit.bed_configuration)}'::jsonb,
                '${unit.view_type || ''}',
                '${JSON.stringify(unit.tourism_features)}'::jsonb,
                '${JSON.stringify(unit.unique_features)}'::jsonb,
                '${JSON.stringify(unit.images)}'::jsonb,
                '${unit.accommodation_mphb_type || ''}',
                '${JSON.stringify(unit.pricing || {})}'::jsonb,
                '${unit.status}',
                ${unit.is_featured || false},
                ${unit.display_order || 1},
                NOW(),
                NOW()
              )
            `

            const { error: insertError } = await this.supabase.rpc('exec_sql', { sql: insertSql })

            if (insertError) {
              errors.push(`Failed to create ${unit.name}: ${insertError.message}`)
            } else {
              created++
              console.log(`Created accommodation: ${unit.name}`)

              // Generate embeddings for new accommodation
              try {
                await this.generateEmbeddingsForUnit(unit, tenantId, hotelId)
                embeddingsGenerated++
              } catch (embeddingError: any) {
                console.error(`Failed to generate embeddings for ${unit.name}:`, embeddingError)
                errors.push(`Embeddings failed for ${unit.name}: ${embeddingError.message}`)
                embeddingsFailed++
              }
            }
          }
        } catch (error: any) {
          errors.push(`Error processing ${unit.name}: ${error.message}`)
        }
      }

      // Update last sync timestamp
      await this.supabase
        .from('integration_configs')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', config.id)

      // Log sync history
      await this.logSyncHistory(tenantId, {
        sync_type: 'manual',
        status: errors.length === 0 ? 'success' : 'partial_success',
        records_processed: accommodationUnits.length,
        records_created: created,
        records_updated: updated,
        error_message: errors.length > 0 ? errors.join('; ') : null,
        metadata: {
          duration_ms: Date.now() - startTime,
          motopress_count: motoPresAccommodations.length,
          errors_count: errors.length
        }
      })

      const totalProcessed = created + updated
      const success = errors.length === 0

      return {
        success,
        created,
        updated,
        errors,
        totalProcessed,
        message: success
          ? `Successfully synced ${totalProcessed} accommodations with ${embeddingsGenerated} embeddings generated`
          : `Synced ${totalProcessed} accommodations with ${errors.length} errors`,
        embeddings_generated: embeddingsGenerated,
        embeddings_failed: embeddingsFailed,
        embeddings_skipped: embeddingsSkipped
      }

    } catch (error: any) {
      console.error('Sync failed:', error)

      await this.logSyncHistory(tenantId, {
        sync_type: 'manual',
        status: 'error',
        records_processed: 0,
        records_created: 0,
        records_updated: 0,
        error_message: error.message,
        metadata: {
          duration_ms: Date.now() - startTime,
          error_stack: error.stack?.substring(0, 500)
        }
      })

      return {
        success: false,
        created: 0,
        updated: 0,
        errors: [error.message],
        totalProcessed: 0,
        message: 'Sync failed with error'
      }
    }
  }

  private async logSyncHistory(tenantId: string, data: {
    sync_type: string
    status: string
    records_processed: number
    records_created: number
    records_updated: number
    error_message?: string | null
    metadata?: any
  }) {
    try {
      await this.supabase
        .from('sync_history')
        .insert({
          tenant_id: tenantId,
          integration_type: 'motopress',
          ...data,
          completed_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to log sync history:', error)
    }
  }

  async getSyncHistory(tenantId: string, limit: number = 10) {
    const { data, error } = await this.supabase
      .from('sync_history')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'motopress')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch sync history:', error)
      return []
    }

    return data || []
  }

  async getLastSyncStatus(tenantId: string) {
    const { data, error } = await this.supabase
      .from('sync_history')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'motopress')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data
  }

  /**
   * Create semantic chunks from MotoPress accommodation data
   * Replicates Simmerdown's chunking strategy but for JSON instead of markdown
   */
  private createChunksFromUnit(unit: any): Array<{
    sectionType: string
    sectionTitle: string
    content: string
  }> {
    const chunks: Array<{ sectionType: string; sectionTitle: string; content: string }> = []

    // Chunk 1: Overview (name + description + capacity + size)
    const overviewContent = [
      unit.name,
      unit.description || unit.short_description || '',
      unit.capacity ? `Capacidad: ${unit.capacity.adults} adultos, ${unit.capacity.children} niños (Total: ${unit.capacity.total} personas)` : '',
      unit.size_m2 ? `Tamaño: ${unit.size_m2}m²` : '',
      unit.unit_type ? `Tipo: ${unit.unit_type}` : ''
    ].filter(Boolean).join('\n\n')

    chunks.push({
      sectionType: 'overview',
      sectionTitle: 'Overview',
      content: `${unit.name} - Overview\n\n${overviewContent}`
    })

    // Chunk 2: Capacity & Beds
    const capacityContent = [
      unit.capacity ? `Capacidad máxima: ${unit.capacity.total} personas (${unit.capacity.adults} adultos, ${unit.capacity.children} niños)` : '',
      unit.bed_configuration ? `Configuración de camas: ${unit.bed_configuration.bed_type} (${unit.bed_configuration.bed_count} cama(s))` : '',
      unit.bed_configuration?.details || ''
    ].filter(Boolean).join('\n\n')

    if (capacityContent) {
      chunks.push({
        sectionType: 'capacity',
        sectionTitle: 'Capacity & Beds',
        content: `${unit.name} - Capacity & Beds\n\n${capacityContent}`
      })
    }

    // Chunk 3: Amenities
    const amenitiesContent = [
      unit.amenities_list && unit.amenities_list.length > 0 ? `Amenities: ${unit.amenities_list.join(', ')}` : '',
      unit.unique_features?.motopress_features && unit.unique_features.motopress_features.length > 0
        ? `Características especiales: ${unit.unique_features.motopress_features.join(', ')}`
        : ''
    ].filter(Boolean).join('\n\n')

    if (amenitiesContent) {
      chunks.push({
        sectionType: 'amenities',
        sectionTitle: 'Amenities',
        content: `${unit.name} - Amenities\n\n${amenitiesContent}`
      })
    }

    // Chunk 4: Location & View
    const locationContent = [
      unit.view_type ? `Vista: ${unit.view_type}` : '',
      unit.location_details?.area ? `Área: ${unit.location_details.area}` : '',
      unit.location_details?.view ? `Detalles de vista: ${unit.location_details.view}` : '',
      unit.tourism_features?.view ? `Vista turística: ${unit.tourism_features.view}` : '',
      unit.tourism_features?.location ? `Ubicación: ${unit.tourism_features.location}` : ''
    ].filter(Boolean).join('\n\n')

    if (locationContent) {
      chunks.push({
        sectionType: 'location',
        sectionTitle: 'Location & View',
        content: `${unit.name} - Location & View\n\n${locationContent}`
      })
    }

    // Chunk 5: Pricing (if available)
    if (unit.tourism_features?.price_per_night) {
      const pricingContent = `Precio por noche: $${unit.tourism_features.price_per_night.toLocaleString()}`
      chunks.push({
        sectionType: 'pricing',
        sectionTitle: 'Pricing',
        content: `${unit.name} - Pricing\n\n${pricingContent}`
      })
    }

    // Chunk 6: Images (if available)
    if (unit.images && unit.images.length > 0) {
      const imagesContent = unit.images
        .map((img: any, idx: number) => `${idx + 1}. ${img.alt || `Imagen ${idx + 1}`}`)
        .join('\n')

      chunks.push({
        sectionType: 'images',
        sectionTitle: 'Images',
        content: `${unit.name} - Images\n\n${unit.images.length} fotos disponibles:\n${imagesContent}`
      })
    }

    // Chunk 7: Features & Attributes
    const featuresContent = [
      unit.unique_features?.special_attributes && unit.unique_features.special_attributes.length > 0
        ? `Atributos especiales: ${JSON.stringify(unit.unique_features.special_attributes)}`
        : '',
      unit.tourism_features?.amenities && unit.tourism_features.amenities.length > 0
        ? `Amenidades turísticas: ${unit.tourism_features.amenities.join(', ')}`
        : ''
    ].filter(Boolean).join('\n\n')

    if (featuresContent) {
      chunks.push({
        sectionType: 'features',
        sectionTitle: 'Features',
        content: `${unit.name} - Features\n\n${featuresContent}`
      })
    }

    return chunks
  }

  private async generateEmbeddingsForUnit(unit: any, tenantId: string, hotelId?: string): Promise<void> {
    try {
      console.log(`📦 Creating chunks for: ${unit.name}`)

      // ✅ NEW: Create semantic chunks from JSON data (like Simmerdown does with markdown)
      const chunks = this.createChunksFromUnit(unit)
      console.log(`   Generated ${chunks.length} chunks`)

      // ✅ NEW: Process each chunk (like Simmerdown)
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]

        console.log(`   ⏳ [${i + 1}/${chunks.length}] Generating embeddings (Tier 1 + Tier 2) for: ${chunk.sectionTitle}...`)

        // Generate BOTH Tier 1 and Tier 2 embeddings in parallel
        const [embedding_fast, embedding_balanced] = await Promise.all([
          generateEmbedding(chunk.content, 1024),   // Tier 1 - Fast (1024d)
          generateEmbedding(chunk.content, 1536)    // Tier 2 - Balanced (1536d)
        ])

        // ✅ NEW: Save to accommodation_units_public (NOT hotels.accommodation_units)
        const chunkName = `${unit.name} - ${chunk.sectionTitle}`

        const chunkRecord = {
          tenant_id: tenantId,
          name: chunkName,
          unit_number: unit.motopress_unit_id?.toString() || `unit-${i + 1}`,  // ✅ FIX: Use motopress_unit_id as display number
          unit_type: unit.unit_type || 'accommodation',
          description: chunk.content,
          short_description: unit.short_description || '',
          amenities: unit.amenities_list || [],
          pricing: unit.pricing || {},
          photos: unit.images || [],
          metadata: {
            section_type: chunk.sectionType,
            section_title: chunk.sectionTitle,
            original_accommodation: unit.name,
            chunk_index: i + 1,
            total_chunks: chunks.length,
            motopress_unit_id: unit.motopress_unit_id,
            source_type: 'motopress_json',
            synced_at: new Date().toISOString(),
            // ✅ FIX: Campos necesarios para que las cards funcionen correctamente
            view_type: unit.view_type || null,  // ✅ Ahora en metadata (no como columna directa)
            capacity: unit.capacity?.total || 2,
            bed_configuration: unit.bed_configuration ? [{ type: unit.bed_configuration.bed_type }] : [],
            unit_amenities: unit.amenities_list || [], // Array format for proper mapping
            // ✅ NUEVOS CAMPOS MOTOPRESS (identificados por mapper)
            size_m2: unit.size_m2 || null,
            location_area: unit.location_details?.area || null,
            children_capacity: unit.capacity?.children || 0,
            accommodation_mphb_type: unit.accommodation_mphb_type || 'Standard',
            motopress_room_type_id: unit.motopress_type_id || null,
            categories: unit.categories || []
          },
          embedding_fast: embedding_fast,
          embedding: embedding_balanced,
          is_active: unit.status === 'active',
          is_bookable: true
        }

        // Upsert to accommodation_units_public
        const { error } = await this.supabase
          .from('accommodation_units_public')
          .upsert(chunkRecord, {
            onConflict: 'tenant_id,name'
          })

        if (error) {
          console.error(`   ❌ [${i + 1}/${chunks.length}] Failed to save chunk:`, error)
          throw new Error(`Chunk save failed: ${error.message}`)
        }

        console.log(`   ✅ [${i + 1}/${chunks.length}] Chunk synced: ${chunk.sectionTitle}`)
      }

      console.log(`✅ All ${chunks.length} chunks synced for: ${unit.name}`)

    } catch (error: any) {
      console.error(`Embedding generation failed for ${unit.name}:`, error)
      throw error
    }
  }

  async syncSelectedAccommodations(tenantId: string, selectedIds: number[], forceEmbeddings: boolean = false): Promise<SyncResult> {
    const startTime = Date.now()
    let created = 0
    let updated = 0
    let embeddingsGenerated = 0
    let embeddingsFailed = 0
    let embeddingsSkipped = 0
    const errors: string[] = []

    try {
      console.log(`Starting selective sync for tenant: ${tenantId}, selected: ${selectedIds.length} accommodations`)

      // Get integration configuration
      const config = await this.getIntegrationConfig(tenantId)
      if (!config) {
        return {
          success: false,
          created: 0,
          updated: 0,
          errors: ['No active MotoPress integration configuration found'],
          totalProcessed: 0,
          message: 'Integration not configured'
        }
      }

      // Decrypt credentials
      const credentials = await this.decrypt(config.config_data)

      // Initialize MotoPress client
      const client = new MotoPresClient({
        apiKey: credentials.consumer_key || credentials.api_key || '', // Support both field names for backwards compatibility
        consumerSecret: credentials.consumer_secret,
        siteUrl: credentials.site_url
      })

      // Fetch selected accommodations from MotoPress
      console.log('Fetching selected accommodations from MotoPress...')
      const allAccommodationsResponse = await client.getAllAccommodations()

      if (allAccommodationsResponse.error || !allAccommodationsResponse.data) {
        return {
          success: false,
          created: 0,
          updated: 0,
          errors: [allAccommodationsResponse.error || 'Failed to fetch accommodations'],
          totalProcessed: 0,
          message: 'Failed to fetch data from MotoPress'
        }
      }

      // Filter to selected accommodations only
      const selectedAccommodations = allAccommodationsResponse.data.filter(acc =>
        selectedIds.includes(acc.id)
      )

      console.log(`Processing ${selectedAccommodations.length} selected accommodations`)

      // Get hotel_id for this tenant (dynamic lookup)
      const { data: hotel, error: hotelError } = await this.supabase
        .from('hotels')
        .select('id')
        .eq('tenant_id', tenantId)
        .single()

      if (hotelError || !hotel) {
        return {
          success: false,
          created: 0,
          updated: 0,
          errors: [`No hotel found for tenant_id: ${tenantId}. Error: ${hotelError?.message || 'Hotel not found'}`],
          totalProcessed: 0,
          message: 'Hotel lookup failed'
        }
      }

      const hotelId = hotel.id
      console.log(`🏨 Dynamic lookup: tenant_id="${tenantId}" → hotel_id="${hotelId}"`)

      // Map to accommodation units
      const accommodationUnits = MotoPresDataMapper.mapBulkAccommodations(
        selectedAccommodations,
        tenantId
      )

      // Add hotel_id to all units
      accommodationUnits.forEach(unit => {
        unit.hotel_id = hotelId
      })

      // Process each accommodation unit
      for (const unit of accommodationUnits) {
        try {
          // Check if already exists by motopress_instance_id using SQL (hotels schema)
          const { data: existingResult, error: selectError } = await this.supabase.rpc('exec_sql', {
            sql: `
              SELECT id FROM hotels.accommodation_units
              WHERE tenant_id = '${tenantId}'
              AND motopress_unit_id = ${unit.motopress_unit_id}
              LIMIT 1
            `
          })

          if (selectError) {
            errors.push(`Failed to check existing ${unit.name}: ${selectError.message}`)
            continue
          }

          const existing = existingResult?.data?.[0]

          if (existing) {
            // Update existing using SQL (hotels schema)
            const updateSql = `
              UPDATE hotels.accommodation_units
              SET
                name = '${unit.name?.replace(/'/g, "''")}',
                description = '${unit.description?.replace(/'/g, "''") || ''}',
                short_description = '${unit.short_description?.replace(/'/g, "''") || ''}',
                capacity = '${JSON.stringify(unit.capacity)}'::jsonb,
                bed_configuration = '${JSON.stringify(unit.bed_configuration)}'::jsonb,
                view_type = '${unit.view_type || ''}',
                tourism_features = '${JSON.stringify(unit.tourism_features)}'::jsonb,
                unique_features = '${JSON.stringify(unit.unique_features)}'::jsonb,
                images = '${JSON.stringify(unit.images)}'::jsonb,
                accommodation_mphb_type = '${unit.accommodation_mphb_type || ''}',
                pricing = '${JSON.stringify(unit.pricing || {})}'::jsonb,
                status = '${unit.status}',
                updated_at = NOW()
              WHERE id = '${existing.id}'
            `

            const { error: updateError } = await this.supabase.rpc('exec_sql', { sql: updateSql })

            if (updateError) {
              errors.push(`Failed to update ${unit.name}: ${updateError.message}`)
            } else {
              updated++
              console.log(`Updated accommodation: ${unit.name}`)

              // Regenerate embeddings for updated accommodation if forceEmbeddings is true
              if (forceEmbeddings) {
                try {
                  await this.generateEmbeddingsForUnit(unit, tenantId, hotelId)
                  embeddingsGenerated++
                } catch (embeddingError: any) {
                  console.error(`Failed to generate embeddings for ${unit.name}:`, embeddingError)
                  errors.push(`Embeddings failed for ${unit.name}: ${embeddingError.message}`)
                  embeddingsFailed++
                }
              } else {
                embeddingsSkipped++
              }
            }
          } else {
            // Create new using SQL (hotels schema) with deterministic UUID
            const insertSql = `
              INSERT INTO hotels.accommodation_units (
                id,
                hotel_id, tenant_id, motopress_unit_id, name, description, short_description,
                capacity, bed_configuration, view_type, tourism_features, unique_features,
                images, accommodation_mphb_type, pricing, status, is_featured, display_order, created_at, updated_at
              ) VALUES (
                hotels.generate_deterministic_uuid('${unit.tenant_id}', ${unit.motopress_unit_id}),
                '${unit.hotel_id}',
                '${unit.tenant_id}',
                ${unit.motopress_unit_id},
                '${unit.name?.replace(/'/g, "''")}',
                '${unit.description?.replace(/'/g, "''") || ''}',
                '${unit.short_description?.replace(/'/g, "''") || ''}',
                '${JSON.stringify(unit.capacity)}'::jsonb,
                '${JSON.stringify(unit.bed_configuration)}'::jsonb,
                '${unit.view_type || ''}',
                '${JSON.stringify(unit.tourism_features)}'::jsonb,
                '${JSON.stringify(unit.unique_features)}'::jsonb,
                '${JSON.stringify(unit.images)}'::jsonb,
                '${unit.accommodation_mphb_type || ''}',
                '${JSON.stringify(unit.pricing || {})}'::jsonb,
                '${unit.status}',
                ${unit.is_featured || false},
                ${unit.display_order || 1},
                NOW(),
                NOW()
              )
            `

            const { error: insertError } = await this.supabase.rpc('exec_sql', { sql: insertSql })

            if (insertError) {
              errors.push(`Failed to create ${unit.name}: ${insertError.message}`)
            } else {
              created++
              console.log(`Created accommodation: ${unit.name}`)

              // Generate embeddings for new accommodation
              try {
                await this.generateEmbeddingsForUnit(unit, tenantId, hotelId)
                embeddingsGenerated++
              } catch (embeddingError: any) {
                console.error(`Failed to generate embeddings for ${unit.name}:`, embeddingError)
                errors.push(`Embeddings failed for ${unit.name}: ${embeddingError.message}`)
                embeddingsFailed++
              }
            }
          }
        } catch (error: any) {
          errors.push(`Error processing ${unit.name}: ${error.message}`)
        }
      }

      // Update last sync timestamp
      await this.supabase
        .from('integration_configs')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', config.id)

      // Log sync history
      await this.logSyncHistory(tenantId, {
        sync_type: 'selective',
        status: errors.length === 0 ? 'success' : 'partial_success',
        records_processed: accommodationUnits.length,
        records_created: created,
        records_updated: updated,
        error_message: errors.length > 0 ? errors.join('; ') : null,
        metadata: {
          duration_ms: Date.now() - startTime,
          selected_ids: selectedIds,
          selected_count: selectedIds.length,
          errors_count: errors.length
        }
      })

      const totalProcessed = created + updated
      const success = errors.length === 0

      return {
        success,
        created,
        updated,
        errors,
        totalProcessed,
        message: success
          ? `Successfully imported ${totalProcessed} accommodations with ${embeddingsGenerated} embeddings generated`
          : `Imported ${totalProcessed} accommodations with ${errors.length} errors`,
        embeddings_generated: embeddingsGenerated,
        embeddings_failed: embeddingsFailed,
        embeddings_skipped: embeddingsSkipped
      }

    } catch (error: any) {
      console.error('Selective sync failed:', error)

      await this.logSyncHistory(tenantId, {
        sync_type: 'selective',
        status: 'error',
        records_processed: 0,
        records_created: 0,
        records_updated: 0,
        error_message: error.message,
        metadata: {
          duration_ms: Date.now() - startTime,
          selected_ids: selectedIds,
          error_stack: error.stack?.substring(0, 500)
        }
      })

      return {
        success: false,
        created: 0,
        updated: 0,
        errors: [error.message],
        totalProcessed: 0,
        message: 'Selective sync failed with error'
      }
    }
  }
}