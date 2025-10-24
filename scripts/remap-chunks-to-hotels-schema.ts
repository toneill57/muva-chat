#!/usr/bin/env tsx
/**
 * REMAP MANUAL CHUNKS TO HOTELS SCHEMA
 *
 * Re-maps orphaned accommodation_units_manual_chunks to point to correct
 * units in hotels.accommodation_units (private schema with sensitive data)
 *
 * Why: Chunks currently point to UUIDs that don't exist in any table.
 * Solution: Extract unit name from manual title, match to hotels.accommodation_units
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/remap-chunks-to-hotels-schema.ts [tenant_id] [--dry-run]
 *
 * Examples:
 *   npx tsx scripts/remap-chunks-to-hotels-schema.ts --dry-run
 *   npx tsx scripts/remap-chunks-to-hotels-schema.ts b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf
 *   npx tsx scripts/remap-chunks-to-hotels-schema.ts <tenant-id> --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

// ============================================================================
// SETUP
// ============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================================
// UTILITIES
// ============================================================================

interface HotelUnit {
  id: string
  name: string
  motopress_unit_id: number
}

interface OrphanedChunk {
  old_unit_id: string
  manual_title: string | null
  chunk_count: number
}

/**
 * Extract unit name from manual title
 * Examples:
 *   "Manual Operativo - Habitación Natural Mystic" → "Natural Mystic"
 *   "Manual Operativo - Apartamento Misty Morning" → "Misty Morning"
 */
function extractUnitName(manualTitle: string | null): string | null {
  if (!manualTitle) return null

  const patterns = [
    /Manual Operativo - Habitación (.+)/i,
    /Manual Operativo - Apartamento (.+)/i,
    /Manual Operativo - (.+)/i,
  ]

  for (const pattern of patterns) {
    const match = manualTitle.match(pattern)
    if (match) return match[1].trim()
  }

  return null
}

/**
 * Find best matching hotel unit by name
 * Uses fuzzy matching to handle minor variations
 */
function findBestMatch(
  unitName: string,
  hotelUnits: HotelUnit[]
): HotelUnit | null {
  // Exact match first
  const exactMatch = hotelUnits.find(
    (unit) => unit.name.toLowerCase() === unitName.toLowerCase()
  )
  if (exactMatch) return exactMatch

  // Partial match (unit name contains extracted name or vice versa)
  const partialMatch = hotelUnits.find((unit) => {
    const unitLower = unit.name.toLowerCase()
    const nameLower = unitName.toLowerCase()
    return unitLower.includes(nameLower) || nameLower.includes(unitLower)
  })

  return partialMatch || null
}

// ============================================================================
// MAIN LOGIC
// ============================================================================

async function remapChunks(tenantId: string, dryRun: boolean = false) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 REMAP MANUAL CHUNKS TO HOTELS SCHEMA')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('   Tenant ID:', tenantId)
  console.log('   Dry-run:', dryRun ? '✅ YES (no DB updates)' : '❌ NO (will update DB)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // Step 1: Get all hotel units for this tenant
  // Try hotels schema first (preferred for multi-tenant with sensitive data)
  console.log('📥 Step 1: Fetching hotel units...')

  let hotelUnits: HotelUnit[] = []
  let schemaUsed = ''

  // Try hotels.accommodation_units first
  try {
    const { data, error } = await supabase
      .schema('hotels')
      .from('accommodation_units')
      .select('id, name, motopress_unit_id')
      .eq('tenant_id', tenantId)
      .order('name')

    if (!error && data && data.length > 0) {
      hotelUnits = data as HotelUnit[]
      schemaUsed = 'hotels'
    }
  } catch (e) {
    // hotels schema might not exist, try public
  }

  // Fallback to public.accommodation_units if hotels schema failed
  if (hotelUnits.length === 0) {
    const { data, error } = await supabase
      .from('accommodation_units')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch units: ${error.message}`)
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No accommodation units found for tenant:', tenantId)
      console.log('   Check if the tenant_id is correct.')
      return
    }

    // Add motopress_unit_id as null for public schema units
    hotelUnits = data.map(d => ({ ...d, motopress_unit_id: 0 })) as HotelUnit[]
    schemaUsed = 'public'
  }

  console.log(`   ✅ Found ${hotelUnits.length} units (from ${schemaUsed} schema)`)
  console.log('')

  // Step 2: Process remap
  await processRemap(tenantId, hotelUnits, dryRun)
}

async function processRemap(
  tenantId: string,
  hotelUnits: HotelUnit[],
  dryRun: boolean
) {
  // Step 2: Get orphaned chunks grouped by old unit_id
  console.log('📊 Step 2: Finding orphaned chunks...')

  // Get all chunks for this tenant and group by accommodation_unit_id
  const { data: allChunks, error: chunksError } = await supabase
    .from('accommodation_units_manual_chunks')
    .select('accommodation_unit_id, section_title')
    .eq('tenant_id', tenantId)

  if (chunksError) {
    throw new Error(`Failed to fetch chunks: ${chunksError.message}`)
  }

  // Group chunks by accommodation_unit_id and extract manual titles
  const chunksMap = new Map<string, { manual_title: string | null; chunk_count: number }>()

  for (const chunk of allChunks) {
    const unitId = chunk.accommodation_unit_id
    const existing = chunksMap.get(unitId) || { manual_title: null, chunk_count: 0 }

    // Update manual_title if we find a "Manual Operativo" title
    if (!existing.manual_title && chunk.section_title?.startsWith('Manual Operativo')) {
      existing.manual_title = chunk.section_title
    }

    existing.chunk_count++
    chunksMap.set(unitId, existing)
  }

  // Convert to array format
  const orphanedChunks = Array.from(chunksMap.entries())
    .map(([old_unit_id, data]) => ({
      old_unit_id,
      manual_title: data.manual_title,
      chunk_count: data.chunk_count,
    }))
    .sort((a, b) => b.chunk_count - a.chunk_count)

  if (!orphanedChunks || orphanedChunks.length === 0) {
    console.log('   ✅ No orphaned chunks found - all chunks already mapped correctly')
    return
  }

  console.log(`   Found ${orphanedChunks.length} unique old unit IDs with chunks`)
  console.log('')

  // Step 3: Map each old unit_id to new hotel unit_id
  console.log('🔗 Step 3: Mapping chunks to hotel units...')
  console.log('')

  let totalMapped = 0
  let totalChunksUpdated = 0
  let failed = 0

  for (const orphan of orphanedChunks) {
    const unitName = extractUnitName(orphan.manual_title)

    if (!unitName) {
      console.log(
        `   ⚠️  [SKIP] Old UUID ${orphan.old_unit_id}: No manual title found (${orphan.chunk_count} chunks)`
      )
      failed++
      continue
    }

    const matchedUnit = findBestMatch(unitName, hotelUnits)

    if (!matchedUnit) {
      console.log(
        `   ❌ [FAIL] "${unitName}": No matching hotel unit found (${orphan.chunk_count} chunks)`
      )
      failed++
      continue
    }

    console.log(`   ✅ [MATCH] "${unitName}" → "${matchedUnit.name}"`)
    console.log(`      Old UUID: ${orphan.old_unit_id}`)
    console.log(`      New UUID: ${matchedUnit.id}`)
    console.log(`      Chunks to update: ${orphan.chunk_count}`)

    // Update chunks (unless dry-run)
    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('accommodation_units_manual_chunks')
        .update({
          accommodation_unit_id: matchedUnit.id,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .eq('accommodation_unit_id', orphan.old_unit_id)

      if (updateError) {
        console.log(`      ❌ Update failed: ${updateError.message}`)
        failed++
        continue
      }
    }

    totalMapped++
    totalChunksUpdated += orphan.chunk_count
    console.log('')
  }

  // Step 4: Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ REMAP SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('   Total unique old UUIDs:', orphanedChunks.length)
  console.log('   Successfully mapped:', totalMapped)
  console.log('   Total chunks updated:', totalChunksUpdated)
  console.log('   Failed:', failed)

  if (dryRun) {
    console.log('')
    console.log('   ℹ️  DRY-RUN mode - no database updates were made')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (failed > 0) {
    throw new Error(`${failed} chunk groups failed to remap`)
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  // Parse arguments
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const tenantId =
    args.find((arg) => !arg.startsWith('--')) ||
    'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf' // Default: Simmerdown

  // Validate environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }

  // Run
  await remapChunks(tenantId, dryRun)
}

main()
  .then(() => {
    console.log('')
    process.exit(0)
  })
  .catch((error) => {
    console.error('')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ FATAL ERROR')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(error)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('')
    process.exit(1)
  })
