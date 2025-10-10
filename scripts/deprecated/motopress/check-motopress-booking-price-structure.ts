/**
 * Check if MotoPress booking API includes individual unit prices
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function checkPriceStructure() {
  const tenantId = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'

  const { data: config } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('integration_type', 'motopress')
    .single()

  if (!config) return

  const credentials = config.config_data
  const auth = Buffer.from(`${credentials.consumer_key}:${credentials.consumer_secret}`).toString('base64')
  const baseUrl = `${credentials.site_url.replace(/\/$/, '')}/wp-json/mphb/v1`

  // Get MP-28675 (NATALY's booking with 8 units)
  const response = await fetch(`${baseUrl}/bookings/28675`, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  })

  const booking = await response.json()

  console.log('🔍 MP-28675 Price Structure Analysis:\n')
  console.log(`Total price: $${booking.total_price.toLocaleString()} ${booking.currency}`)
  console.log(`Total units: ${booking.reserved_accommodations.length}`)
  console.log(`Price/unit (divided): $${(booking.total_price / booking.reserved_accommodations.length).toLocaleString()}\n`)

  console.log('Individual units:')
  booking.reserved_accommodations.forEach((unit: any, idx: number) => {
    console.log(`\nUnit ${idx + 1} (accommodation_type: ${unit.accommodation_type}):`)
    console.log(`  - Adults: ${unit.adults}`)
    console.log(`  - Children: ${unit.children}`)
    console.log(`  - Accommodation ID: ${unit.accommodation}`)
    console.log(`  - Rate ID: ${unit.rate_id}`)

    // Check for any price-related fields
    const priceFields = Object.keys(unit).filter(key =>
      key.toLowerCase().includes('price') ||
      key.toLowerCase().includes('cost') ||
      key.toLowerCase().includes('amount') ||
      key.toLowerCase().includes('rate')
    )

    if (priceFields.length > 0) {
      console.log(`  ✅ Price fields found:`, priceFields.map(f => `${f}=${unit[f]}`).join(', '))
    } else {
      console.log(`  ❌ NO price fields found in unit`)
    }
  })

  console.log('\n\nComplete first unit structure:')
  console.log(JSON.stringify(booking.reserved_accommodations[0], null, 2))
}

checkPriceStructure()
