#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface OrphanedManual {
  unit_id: string
  manual_content: string
}

interface RemapResult {
  unitName: string
  oldUnitId: string
  newUnitId: string
  manualsUpdated: number
  chunksUpdated: number
}

/**
 * Smart Remap Manual IDs
 *
 * Fixes orphaned accommodation_units_manual and chunks after unit recreation.
 * Uses stable identifiers (unit name) to find current unit_id.
 *
 * SAFE: Avoids re-embedding by updating existing manual/chunk records.
 */
async function smartRemapManualIds(tenantId: string): Promise<void> {
  console.log('🔄 Starting smart remap for tenant:', tenantId)
  console.log('=' .repeat(60))

  // Step 1: Find orphaned manuals (unit_id not in accommodation_units_public)
  console.log('\n📊 Step 1: Finding orphaned manuals...')

  const { data: allManuals, error: manualsError } = await supabase
    .from('accommodation_units_manual')
    .select('unit_id, manual_content')

  if (manualsError) {
    console.error('❌ Error fetching manuals:', manualsError.message)
    throw manualsError
  }

  if (!allManuals || allManuals.length === 0) {
    console.log('ℹ️  No manuals found in database')
    return
  }

  console.log(`   Found ${allManuals.length} total manuals`)

  // Get all current unit IDs for this tenant
  const { data: currentUnits, error: unitsError } = await supabase
    .from('accommodation_units_public')
    .select('unit_id')
    .eq('tenant_id', tenantId)

  if (unitsError) {
    console.error('❌ Error fetching current units:', unitsError.message)
    throw unitsError
  }

  const currentUnitIds = new Set(currentUnits?.map(u => u.unit_id) || [])
  console.log(`   Found ${currentUnitIds.size} current units for tenant`)

  // Filter orphaned manuals
  const orphanedManuals = allManuals.filter(m => !currentUnitIds.has(m.unit_id))

  if (orphanedManuals.length === 0) {
    console.log('\n✅ No orphaned manuals found - all manuals linked to current units')
    return
  }

  console.log(`\n⚠️  Found ${orphanedManuals.length} orphaned manuals`)
  console.log('=' .repeat(60))

  // Step 2: Remap each orphaned manual
  const results: RemapResult[] = []
  let successCount = 0
  let failureCount = 0

  for (let i = 0; i < orphanedManuals.length; i++) {
    const manual = orphanedManuals[i]
    console.log(`\n[${i + 1}/${orphanedManuals.length}] Processing orphaned manual...`)

    try {
      // Extract unit name from markdown H1 heading
      // Format: "# Manual Operativo - Apartamento One Love" or "# Manual Operativo - Habitación Kaya"
      const headingMatch = manual.manual_content.match(/^#\s+Manual Operativo\s+-\s+(?:Apartamento|Habitación)\s+(.+)$/m)
      const unitName = headingMatch?.[1]?.trim()

      if (!unitName) {
        console.warn(`   ❌ Could not extract unit_name from manual ${manual.unit_id}`)
        console.warn(`   Content preview: ${manual.manual_content.substring(0, 200)}...`)
        failureCount++
        continue
      }

      console.log(`   🔍 Unit name: "${unitName}"`)
      console.log(`   🔍 Old unit_id: ${manual.unit_id}`)

      // Find current unit_id using stable ID mapping
      const { data: currentUnitId, error: rpcError } = await supabase.rpc(
        'get_accommodation_unit_by_name',
        { p_unit_name: unitName, p_tenant_id: tenantId }
      )

      if (rpcError) {
        console.warn(`   ❌ RPC error for "${unitName}":`, rpcError.message)
        failureCount++
        continue
      }

      if (!currentUnitId) {
        console.warn(`   ❌ No current unit found for: "${unitName}"`)
        console.warn(`   This unit may have been permanently deleted`)
        failureCount++
        continue
      }

      console.log(`   ✅ New unit_id: ${currentUnitId}`)

      // Check if manual already exists for new unit_id (prevent duplicates)
      const { data: existingManual, error: checkError } = await supabase
        .from('accommodation_units_manual')
        .select('unit_id')
        .eq('unit_id', currentUnitId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found (OK)
        console.warn(`   ⚠️  Error checking existing manual:`, checkError.message)
      }

      if (existingManual) {
        console.warn(`   ⚠️  Manual already exists for unit_id ${currentUnitId}`)
        console.warn(`   Skipping to prevent duplicate - consider manual cleanup`)
        failureCount++
        continue
      }

      // Update manual.unit_id
      const { error: manualUpdateError } = await supabase
        .from('accommodation_units_manual')
        .update({ unit_id: currentUnitId, updated_at: new Date().toISOString() })
        .eq('unit_id', manual.unit_id)

      if (manualUpdateError) {
        console.error(`   ❌ Failed to update manual:`, manualUpdateError.message)
        failureCount++
        continue
      }

      console.log(`   ✅ Updated accommodation_units_manual`)

      // Update chunks.accommodation_unit_id
      const { data: chunksData, error: chunksUpdateError } = await supabase
        .from('accommodation_units_manual_chunks')
        .update({ accommodation_unit_id: currentUnitId })
        .eq('accommodation_unit_id', manual.unit_id)
        .select('chunk_id')

      if (chunksUpdateError) {
        console.error(`   ❌ Failed to update chunks:`, chunksUpdateError.message)
        failureCount++
        continue
      }

      const chunksUpdated = chunksData?.length || 0
      console.log(`   ✅ Updated ${chunksUpdated} accommodation_units_manual_chunks`)

      results.push({
        unitName,
        oldUnitId: manual.unit_id,
        newUnitId: currentUnitId,
        manualsUpdated: 1,
        chunksUpdated
      })

      successCount++
      console.log(`   🔄 Remapped "${unitName}": ${manual.unit_id} → ${currentUnitId}`)

    } catch (error) {
      console.error(`   ❌ Unexpected error:`, error)
      failureCount++
    }
  }

  // Step 3: Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 REMAP SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Successful: ${successCount}/${orphanedManuals.length}`)
  console.log(`❌ Failed: ${failureCount}/${orphanedManuals.length}`)

  if (results.length > 0) {
    console.log('\nRemapped units:')
    results.forEach(r => {
      console.log(`  - ${r.unitName}`)
      console.log(`    Old ID: ${r.oldUnitId}`)
      console.log(`    New ID: ${r.newUnitId}`)
      console.log(`    Chunks: ${r.chunksUpdated}`)
    })
  }

  console.log('\n✅ Smart remap completed!')
}

// CLI execution
async function main() {
  const tenantId = process.argv[2]

  if (!tenantId) {
    console.error('❌ ERROR: Missing tenant ID parameter')
    console.error('')
    console.error('Usage:')
    console.error('  npm run remap:manual-ids <tenant_uuid>')
    console.error('')
    console.error('Example:')
    console.error('  npm run remap:manual-ids b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf')
    console.error('')
    process.exit(1)
  }

  // Validate UUID format
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(tenantId)) {
    console.error('❌ ERROR: Invalid UUID format')
    console.error(`Received: ${tenantId}`)
    console.error('Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
    process.exit(1)
  }

  try {
    await smartRemapManualIds(tenantId)
  } catch (error) {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  }
}

main()
