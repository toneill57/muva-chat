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

  private decrypt(configData: any): { api_key?: string; consumer_key?: string; consumer_secret: string; site_url: string } {
    // TODO: Implement proper decryption
    // For now, using base64 decode (NEVER use in production)
    try {
      if (configData.encrypted) {
        return JSON.parse(Buffer.from(configData.encrypted, 'base64').toString())
      }
      // If already decrypted or in plain format
      return configData
    } catch {
      return configData
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
      const credentials = this.decrypt(config.config_data)

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
      console.log('First MotoPress accommodation sample:', JSON.stringify(motoPresAccommodations[0], null, 2))
      const accommodationUnits = MotoPresDataMapper.mapBulkAccommodations(
        motoPresAccommodations,
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
                images, accommodation_mphb_type, status, is_featured, display_order, created_at, updated_at
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

  private async generateEmbeddingsForUnit(unit: any, tenantId: string, hotelId?: string): Promise<void> {
    try {
      // Create content text for embeddings based on accommodation_units structure
      const contentParts = [
        unit.name,
        unit.description,
        unit.short_description,
        unit.capacity && `Capacity: ${JSON.stringify(unit.capacity)}`,
        unit.bed_configuration && `Bed configuration: ${JSON.stringify(unit.bed_configuration)}`,
        unit.view_type && `View: ${unit.view_type}`,
        unit.tourism_features && `Tourism features: ${JSON.stringify(unit.tourism_features)}`,
        unit.unique_features && `Unique features: ${JSON.stringify(unit.unique_features)}`,
        unit.location_details && `Location: ${JSON.stringify(unit.location_details)}`
      ].filter(Boolean).join('\n')

      console.log(`Generating embeddings for: ${unit.name}`)

      // Generate multi-tier embeddings (Matryoshka system)
      const [embedding_fast, embedding_balanced] = await Promise.all([
        generateEmbedding(contentParts, 1024),   // Tier 1 - Fast
        generateEmbedding(contentParts, 1536)    // Tier 2 - Balanced
      ])

      // Update the accommodation unit with embeddings using SQL (hotels schema)
      const updateEmbeddingsSql = `
        UPDATE hotels.accommodation_units
        SET
          embedding_fast = '${JSON.stringify(embedding_fast)}'::vector,
          embedding_balanced = '${JSON.stringify(embedding_balanced)}'::vector,
          updated_at = NOW()
        WHERE tenant_id = '${tenantId}'
        AND motopress_unit_id = ${unit.motopress_unit_id}
      `

      const { error } = await this.supabase.rpc('exec_sql', { sql: updateEmbeddingsSql })

      if (error) {
        console.error(`Failed to update embeddings for ${unit.name}:`, error)
        throw new Error(`Embedding update failed: ${error.message}`)
      }

      console.log(`✅ Embeddings generated for: ${unit.name}`)

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
      const credentials = this.decrypt(config.config_data)

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
                images, accommodation_mphb_type, status, is_featured, display_order, created_at, updated_at
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