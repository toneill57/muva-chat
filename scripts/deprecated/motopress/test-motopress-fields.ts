/**
 * Test script to inspect MotoPress API fields
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function testMotoPress() {
  // Get tenant and config
  const { data: tenant } = await supabase
    .from('tenant_registry')
    .select('tenant_id')
    .eq('slug', 'simmerdown')
    .single()

  if (!tenant) {
    console.error('Tenant not found')
    return
  }

  const { data: config } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('tenant_id', tenant.tenant_id)
    .eq('integration_type', 'motopress')
    .eq('is_active', true)
    .single()

  if (!config) {
    console.error('No MotoPress config found')
    return
  }

  const credentials = config.config_data
  const auth = Buffer.from(`${credentials.consumer_key}:${credentials.consumer_secret}`).toString('base64')
  const baseUrl = `${credentials.site_url.replace(/\/$/, '')}/wp-json/mphb/v1`

  // Fetch one confirmed booking
  const response = await fetch(`${baseUrl}/bookings?status=confirmed&per_page=3`, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  })

  const bookings = await response.json()

  console.log('🔍 MotoPress API Response Analysis\n')
  console.log('━'.repeat(60))

  for (const booking of bookings) {
    console.log(`\nBooking ID: MP-${booking.id}`)
    console.log(`Guest: ${booking.customer.first_name} ${booking.customer.last_name}`)
    console.log(`Reserved Accommodations: ${booking.reserved_accommodations.length} units\n`)

    booking.reserved_accommodations.forEach((unit: any, index: number) => {
      console.log(`   Unit ${index + 1}:`)
      console.log(`      accommodation: ${unit.accommodation}`)
      console.log(`      accommodation_type: ${unit.accommodation_type}`)
      console.log(`      adults: ${unit.adults}`)
      console.log(`      children: ${unit.children}`)
      console.log(`      guest_name: ${unit.guest_name}`)
    })
  }

  console.log('\n' + '━'.repeat(60))
  console.log('\n📊 hotels.accommodation_units available:\n')

  const { data: units } = await supabase
    .schema('hotels')
    .from('accommodation_units')
    .select('name, motopress_unit_id')
    .eq('tenant_id', tenant.tenant_id)
    .order('name')

  units?.forEach((unit) => {
    console.log(`   ${unit.name}: motopress_unit_id = ${unit.motopress_unit_id}`)
  })

  console.log('\n' + '━'.repeat(60))
  console.log('\n✅ Analysis complete')
}

testMotoPress()
