/**
 * Populate motopress_type_id in hotels.accommodation_units
 *
 * Fetches accommodation_types from MotoPress API and updates each unit
 * with its corresponding accommodation_type_id for proper mapping.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const MOTOPRESS_KEY = process.env.MOTOPRESS_KEY!
const MOTOPRESS_SECRET = process.env.MOTOPRESS_SECRET!
const MOTOPRESS_URL = process.env.MOTOPRESS_URL!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface MotoPressAccommodationType {
  id: number
  title: string
  accommodations?: Array<{ id: number; title: string }>
}

interface AccommodationUnit {
  id: string
  name: string
  motopress_unit_id: number | null
  motopress_type_id: number | null
}

async function fetchMotoPressAccommodationTypes(): Promise<MotoPressAccommodationType[]> {
  const credentials = Buffer.from(`${MOTOPRESS_KEY}:${MOTOPRESS_SECRET}`).toString('base64')

  const url = `${MOTOPRESS_URL}/wp-json/mphb/v1/accommodation_types?per_page=100`

  console.log(`Fetching accommodation types from: ${url}`)

  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`MotoPress API error: ${response.status} ${response.statusText}`)
  }

  const types = await response.json()
  console.log(`✓ Fetched ${types.length} accommodation types from MotoPress`)

  return types
}

async function fetchMotoPressAccommodations(typeId: number): Promise<number[]> {
  const credentials = Buffer.from(`${MOTOPRESS_KEY}:${MOTOPRESS_SECRET}`).toString('base64')

  const url = `${MOTOPRESS_URL}/wp-json/mphb/v1/accommodations?accommodation_type=${typeId}&per_page=100`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    console.warn(`Warning: Could not fetch accommodations for type ${typeId}`)
    return []
  }

  const accommodations = await response.json()
  return accommodations.map((a: any) => a.id)
}

async function main() {
  console.log('\n🚀 Starting motopress_type_id population...\n')

  console.log('ℹ️  In MotoPress: accommodation_units represent TYPES (not individual rooms)')
  console.log('   Therefore: motopress_unit_id === motopress_type_id\n')

  // Fetch InnPilot accommodation_units needing type_id populated
  // Using dedicated RPC function (efficient, type-safe, no execute_sql needed)
  const { data: units, error } = await supabase.rpc(
    'get_accommodation_units_needing_type_id',
    { p_tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf' }
  ) as { data: AccommodationUnit[] | null; error: any }

  if (error) {
    console.error('Error fetching units:', error)
    process.exit(1)
  }

  console.log(`Found ${units?.length || 0} units to update\n`)

  if (!units || units.length === 0) {
    console.log('✅ All units already have motopress_type_id populated!\n')
    return
  }

  // Update via SQL (hotels schema requires raw query)
  console.log('Updating units...\n')

  const { data: result, error: updateError } = await supabase.rpc('execute_sql', {
    query: `
      UPDATE hotels.accommodation_units
      SET motopress_type_id = motopress_unit_id
      WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
        AND motopress_unit_id IS NOT NULL
        AND motopress_type_id IS NULL
      RETURNING id, name, motopress_unit_id, motopress_type_id;
    `
  }) as { data: AccommodationUnit[] | null; error: any }

  if (updateError) {
    console.error('✗ Update failed:', updateError)
    process.exit(1)
  }

  const updated = result?.length || 0

  result?.forEach(unit => {
    console.log(`✓ ${unit.name}: motopress_type_id = ${unit.motopress_type_id}`)
  })

  console.log(`\n📊 Summary:`)
  console.log(`  ✓ Updated: ${updated}/${units.length}`)
  console.log(`  ${updated === units.length ? '🎉' : '⚠️'} ${updated === units.length ? 'All done!' : 'Some failed'}\n`)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
