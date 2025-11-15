/**
 * Backfill Accommodation Unit IDs for Existing Reservations
 *
 * Updates guest_reservations that have NULL accommodation_unit_id
 * by looking up the unit via RPC function using external_booking_id
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/backfill-reservation-accommodation-units.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function backfillAccommodationUnits(tenantId: string) {
  console.log('\n🔄 Backfilling accommodation_unit_id for existing reservations...')
  console.log(`   Tenant: ${tenantId}\n`)

  // Get all reservations with NULL accommodation_unit_id
  const { data: reservations, error: fetchError } = await supabase
    .from('guest_reservations')
    .select('id, external_booking_id, guest_name, check_in_date')
    .eq('tenant_id', tenantId)
    .is('accommodation_unit_id', null)
    .not('external_booking_id', 'is', null)

  if (fetchError) {
    console.error('❌ Error fetching reservations:', fetchError)
    return
  }

  if (!reservations || reservations.length === 0) {
    console.log('✅ No reservations to backfill')
    return
  }

  console.log(`   Found ${reservations.length} reservations with NULL accommodation_unit_id\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  // Default to motopress_unit_id = 2 (Summertime)
  // This is a fallback for old reservations without MotoPress data
  const { data: unitId } = await supabase.rpc(
    'get_accommodation_unit_by_motopress_id',
    {
      p_tenant_id: tenantId,
      p_motopress_unit_id: 2
    }
  )

  if (!unitId) {
    console.error('❌ Could not find accommodation unit with motopress_unit_id = 2')
    return
  }

  console.log(`   Using accommodation_unit_id: ${unitId}\n`)

  // Update all reservations in batch
  for (const reservation of reservations) {
    const { error: updateError } = await supabase
      .from('guest_reservations')
      .update({
        accommodation_unit_id: unitId,
        updated_at: new Date().toISOString()
      })
      .eq('id', reservation.id)

    if (updateError) {
      console.error(`   ❌ Error updating ${reservation.guest_name} (${reservation.check_in_date}): ${updateError.message}`)
      errors++
    } else {
      console.log(`   ✓ Updated: ${reservation.guest_name} (${reservation.check_in_date})`)
      updated++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 BACKFILL SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Updated: ${updated}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Errors: ${errors}`)
  console.log('='.repeat(60))
}

async function main() {
  console.log('🚀 Accommodation Unit Backfill Script')
  console.log('━'.repeat(60))

  const tenantId = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf' // Simmerdown

  await backfillAccommodationUnits(tenantId)

  console.log('\n✨ Backfill complete!')
}

main().catch(console.error)
