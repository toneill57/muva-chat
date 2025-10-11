#!/usr/bin/env npx tsx
/**
 * Tucasamar Embedding Migration Script
 *
 * Problem: tucasamar has 6 accommodation units with embeddings in hotels.accommodation_units
 * but the public chat searches in accommodation_units_public (different table)
 *
 * Solution: Copy data from hotels.accommodation_units → accommodation_units_public
 * Pattern: Replicate Simmerdown's pattern (data in BOTH tables)
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/migrate-tucasamar-to-public.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const TUCASAMAR_TENANT_ID = '2263efba-b62b-417b-a422-a84638bc632f'
const HOTELS_SCHEMA = 'hotels'

interface HotelsAccommodationUnit {
  id: string
  tenant_id: string
  hotel_id: string | null
  name: string
  description: string | null
  short_description: string | null
  unit_number: string | null
  unit_type: string | null
  embedding_fast: string | null
  embedding_balanced: string | null
  images: any
  unique_features: any
  amenities_list: any
  capacity: any
  status: string | null
  view_type: string | null
  floor_number: number | null
  motopress_type_id: number | null
}

async function migrateToPublic() {
  console.log('🚀 Tucasamar Embedding Migration')
  console.log('=====================================\n')

  try {
    // STEP 1: Query units from hotels.accommodation_units using execute_sql
    console.log(`📊 Querying units from hotels.accommodation_units...`)
    console.log(`   Schema: ${HOTELS_SCHEMA}`)
    console.log(`   Tenant ID: ${TUCASAMAR_TENANT_ID}\n`)

    const { data: queryResult, error: queryError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT
          id, tenant_id, hotel_id, name, description, short_description,
          unit_number, unit_type, embedding_fast, embedding_balanced,
          images, unique_features, amenities_list, capacity, status,
          view_type, floor_number, motopress_type_id
        FROM hotels.accommodation_units
        WHERE tenant_id = '${TUCASAMAR_TENANT_ID}'
        ORDER BY name
      `
    })

    if (queryError) {
      console.error('❌ Error querying units:', queryError)
      process.exit(1)
    }

    // execute_sql returns data as array directly
    const units = (Array.isArray(queryResult) ? queryResult : []) as HotelsAccommodationUnit[]

    if (!units || units.length === 0) {
      console.log('⚠️  No units found in hotels.accommodation_units for tucasamar')
      process.exit(0)
    }

    console.log(`✅ Found ${units.length} units to migrate\n`)

    // Print unit names
    units.forEach((unit: any, idx: number) => {
      console.log(`   ${idx + 1}. ${unit.name} (${unit.unit_type || 'unknown type'})`)
    })
    console.log()

    // STEP 2: Check embeddings
    const unitsWithEmbeddings = units.filter((u: any) => u.embedding_fast)
    console.log(`📦 Embeddings status:`)
    console.log(`   Units with embedding_fast: ${unitsWithEmbeddings.length}/${units.length}`)
    console.log(`   Units without embeddings: ${units.length - unitsWithEmbeddings.length}\n`)

    if (unitsWithEmbeddings.length === 0) {
      console.log('⚠️  WARNING: No units have embeddings! Migration will proceed but chat search won\'t work.')
    }

    // STEP 3: Transform and insert
    console.log(`🔄 Transforming and inserting into accommodation_units_public...\n`)

    let successCount = 0
    let errorCount = 0

    for (const unit of units) {
      try {
        console.log(`   Processing: ${unit.name}...`)

        // Transform data structure
        const publicUnit = {
          unit_id: unit.id, // id → unit_id
          tenant_id: TUCASAMAR_TENANT_ID, // Already UUID format
          name: unit.name,
          unit_number: unit.unit_number || '',
          unit_type: unit.unit_type || 'room',
          description: unit.description || `${unit.name} accommodation in Tu Casa en el Mar`,
          short_description: unit.short_description || null,

          // CRITICAL: Preserve embeddings
          embedding_fast: unit.embedding_fast, // Vector 1024d
          embedding: null, // Optional full embedding (not available in source)

          // Transform JSONB structures
          photos: unit.images || [], // images → photos
          amenities: unit.amenities_list || {}, // Direct copy
          highlights: unit.unique_features || [], // unique_features → highlights

          // Build pricing (placeholder - real prices would come from MotoPress)
          pricing: {
            base_price_night: null,
            currency: 'COP',
            seasonal_pricing: [],
            min_nights: 1
          },

          // Boolean flags (CRITICAL for RPC match_accommodations_public filters)
          is_active: true, // Must be true for chat search
          is_bookable: true,

          // Metadata
          metadata: {
            source_unit_id: unit.id,
            hotel_id: unit.hotel_id,
            motopress_type_id: unit.motopress_type_id,
            floor_number: unit.floor_number,
            capacity: unit.capacity,
            view_type: unit.view_type,
            migrated_from: 'hotels.accommodation_units',
            migration_date: new Date().toISOString()
          },

          // Timestamps
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Insert into accommodation_units_public
        const { error: insertError } = await supabase
          .from('accommodation_units_public')
          .insert(publicUnit)

        if (insertError) {
          // Check if it's a duplicate
          if (insertError.code === '23505') {
            console.log(`     ⚠️  Unit already exists (duplicate), skipping...`)
            successCount++ // Count as success since data exists
          } else {
            throw insertError
          }
        } else {
          console.log(`     ✅ Migrated successfully`)
          successCount++
        }

      } catch (error) {
        console.error(`     ❌ Error: ${error}`)
        errorCount++
      }
    }

    // STEP 4: Final report
    console.log('\n=====================================')
    console.log('✅ Migration Complete')
    console.log('=====================================')
    console.log(`📊 Results:`)
    console.log(`   ✅ Successfully migrated: ${successCount}/${units.length}`)
    console.log(`   ❌ Errors: ${errorCount}`)
    console.log(`   📦 Embeddings preserved: ${unitsWithEmbeddings.length}`)
    console.log('=====================================\n')

    if (errorCount > 0) {
      console.log('⚠️  Some units failed to migrate. Review errors above.')
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run migration
migrateToPublic().catch(console.error)
