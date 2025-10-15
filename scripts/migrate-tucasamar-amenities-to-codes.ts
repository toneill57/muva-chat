/**
 * Migration Script: Convert Tucasamar Amenities from Text to Codes
 *
 * Converts descriptive amenities to standardized codes for:
 * - Efficient exact-match searches (JSON @> operator)
 * - Better performance (indexed searches)
 * - Multilingual support
 *
 * Usage:
 *   npx tsx scripts/migrate-tucasamar-amenities-to-codes.ts --dry-run
 *   npx tsx scripts/migrate-tucasamar-amenities-to-codes.ts --execute
 */

import { createClient } from '@supabase/supabase-js'
import { AMENITY_CATALOG, searchAmenities } from '../src/lib/amenities-catalog'

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const TUCASAMAR_TENANT_ID = '2263efba-b62b-417b-a422-a84638bc632f'

// ============================================================================
// Tucasamar Text → Code Mapping
// ============================================================================

const TUCASAMAR_AMENITY_MAPPING: Record<string, string> = {
  // Connectivity
  'WiFi gratuito': 'wifi',
  'wifi gratuito': 'wifi',

  // Climate
  'Aire acondicionado': 'ac',
  'aire acondicionado': 'ac',
  'Ventilador': 'fan',
  'ventilador': 'fan',

  // Kitchen
  'Cocina equipada': 'full_kitchen',
  'cocina equipada': 'full_kitchen',
  'Cocineta eléctrica portátil de dos puestos': 'kitchenette',
  'cocineta eléctrica': 'kitchenette',
  'Microondas': 'microwave',
  'microondas': 'microwave',
  'Horno a Gas.': 'gas_oven',
  'Horno a Gas': 'gas_oven',
  'horno a gas': 'gas_oven',
  'Cafetera': 'coffee_maker',
  'cafetera': 'coffee_maker',

  // Security
  'Cajilla de seguridad': 'safe',
  'cajilla de seguridad': 'safe',
  'Libre de llaves': 'keyless_entry',
  'libre de llaves': 'keyless_entry',

  // Accessibility
  'Ventanas acústicas': 'soundproof_windows',
  'ventanas acústicas': 'soundproof_windows',

  // Bedroom
  'Opción de 6 camas sencillas ó 2 camas matrimoniales y 2 Sencillas.': 'flexible_beds',
  'Opción de 2 camas sencillas ó 1 cama matrimonial': 'flexible_beds',
  'Opción de 2 Camas Sencillas ó 1 matrimonial': 'flexible_beds', // Capital C variation
  'opción de camas': 'flexible_beds',

  // Decorative features (not standard amenities, but mapped for completeness)
  'Cortinas de terciopelo azul marino': 'soundproof_windows', // Navy curtains enhance acoustics
}

/**
 * Convert a text amenity to code
 */
function textToCode(text: string): string | null {
  // Direct mapping
  if (TUCASAMAR_AMENITY_MAPPING[text]) {
    return TUCASAMAR_AMENITY_MAPPING[text]
  }

  // Fuzzy search in catalog
  const results = searchAmenities(text)
  if (results.length > 0) {
    return results[0] // Return best match
  }

  return null
}

// ============================================================================
// Main Migration Logic
// ============================================================================

interface AccommodationUnit {
  unit_id: string
  name: string
  amenities: {
    features: string[]
  }
}

interface MigrationResult {
  unit_id: string
  unit_name: string
  original_amenities: string[]
  converted_codes: string[]
  unmapped_amenities: string[]
  success: boolean
}

async function migrateAmenities(dryRun: boolean = true): Promise<void> {
  console.log('🚀 Tucasamar Amenities Migration')
  console.log('=' .repeat(50))
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '⚡ EXECUTE (will update DB)'}`)
  console.log(`Tenant ID: ${TUCASAMAR_TENANT_ID}`)
  console.log('')

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Step 1: Fetch all Tucasamar units
  console.log('📥 Fetching Tucasamar accommodation units...')
  const { data: units, error: fetchError } = await supabase
    .from('accommodation_units_public')
    .select('unit_id, name, amenities')
    .eq('tenant_id', TUCASAMAR_TENANT_ID)

  if (fetchError) {
    console.error('❌ Error fetching units:', fetchError)
    process.exit(1)
  }

  if (!units || units.length === 0) {
    console.log('⚠️  No units found for Tucasamar')
    process.exit(0)
  }

  console.log(`✅ Found ${units.length} units\n`)

  // Step 2: Convert amenities for each unit
  const results: MigrationResult[] = []

  for (const unit of units as AccommodationUnit[]) {
    console.log(`\n📦 Processing: ${unit.name}`)
    console.log('-'.repeat(50))

    const originalAmenities = unit.amenities?.features || []
    const convertedCodes: string[] = []
    const unmappedAmenities: string[] = []

    console.log(`Original amenities (${originalAmenities.length}):`)
    originalAmenities.forEach((amenity, idx) => {
      console.log(`  ${idx + 1}. "${amenity}"`)
    })

    console.log('\nConversion:')
    for (const amenity of originalAmenities) {
      const code = textToCode(amenity)
      if (code) {
        convertedCodes.push(code)
        const label = AMENITY_CATALOG[code]?.es || code
        console.log(`  ✅ "${amenity}" → ${code} (${label})`)
      } else {
        unmappedAmenities.push(amenity)
        console.log(`  ⚠️  "${amenity}" → NO MAPPING FOUND`)
      }
    }

    results.push({
      unit_id: unit.unit_id,
      unit_name: unit.name,
      original_amenities: originalAmenities,
      converted_codes: convertedCodes,
      unmapped_amenities: unmappedAmenities,
      success: unmappedAmenities.length === 0
    })

    console.log(`\nResult:`)
    console.log(`  Converted: ${convertedCodes.length}/${originalAmenities.length}`)
    console.log(`  Codes: [${convertedCodes.join(', ')}]`)
    if (unmappedAmenities.length > 0) {
      console.log(`  ⚠️  Unmapped: ${unmappedAmenities.length} amenities need manual mapping`)
    }
  }

  // Step 3: Summary
  console.log('\n\n' + '='.repeat(50))
  console.log('📊 MIGRATION SUMMARY')
  console.log('='.repeat(50))

  const totalUnits = results.length
  const successfulUnits = results.filter(r => r.success).length
  const unitsWithUnmapped = results.filter(r => r.unmapped_amenities.length > 0).length
  const totalUnmapped = results.reduce((sum, r) => sum + r.unmapped_amenities.length, 0)

  console.log(`Total units: ${totalUnits}`)
  console.log(`Fully converted: ${successfulUnits}/${totalUnits} (${Math.round(successfulUnits/totalUnits*100)}%)`)
  console.log(`Units with unmapped amenities: ${unitsWithUnmapped}`)
  console.log(`Total unmapped amenities: ${totalUnmapped}`)

  if (totalUnmapped > 0) {
    console.log('\n⚠️  UNMAPPED AMENITIES FOUND:')
    const allUnmapped = new Set<string>()
    results.forEach(r => r.unmapped_amenities.forEach(a => allUnmapped.add(a)))
    Array.from(allUnmapped).forEach((amenity, idx) => {
      console.log(`  ${idx + 1}. "${amenity}"`)
    })
    console.log('\n💡 Add these to TUCASAMAR_AMENITY_MAPPING or AMENITY_CATALOG')
  }

  // Step 4: Execute migration if not dry-run
  if (!dryRun) {
    console.log('\n\n' + '='.repeat(50))
    console.log('⚡ EXECUTING MIGRATION')
    console.log('='.repeat(50))

    let updatedCount = 0
    let errorCount = 0

    for (const result of results) {
      if (!result.success) {
        console.log(`⏭️  Skipping ${result.unit_name} (has unmapped amenities)`)
        continue
      }

      console.log(`\n📝 Updating ${result.unit_name}...`)

      const { error: updateError } = await supabase
        .from('accommodation_units_public')
        .update({
          amenities: {
            features: result.converted_codes
          }
        })
        .eq('unit_id', result.unit_id)

      if (updateError) {
        console.error(`  ❌ Error: ${updateError.message}`)
        errorCount++
      } else {
        console.log(`  ✅ Updated successfully`)
        updatedCount++
      }
    }

    console.log('\n\n' + '='.repeat(50))
    console.log('✨ MIGRATION COMPLETE')
    console.log('='.repeat(50))
    console.log(`Updated: ${updatedCount}/${totalUnits} units`)
    console.log(`Errors: ${errorCount}`)
    console.log(`Skipped: ${totalUnits - updatedCount - errorCount}`)
  } else {
    console.log('\n\n' + '='.repeat(50))
    console.log('🔍 DRY RUN COMPLETE - No changes made')
    console.log('='.repeat(50))
    console.log('Run with --execute to apply changes')
  }
}

// ============================================================================
// CLI Execution
// ============================================================================

const args = process.argv.slice(2)
const dryRun = !args.includes('--execute')

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

migrateAmenities(dryRun).catch((error) => {
  console.error('\n❌ Migration failed:', error)
  process.exit(1)
})
