/**
 * Check if MotoPress API includes price data for accommodations
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function checkPrices() {
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

  // Get all accommodation types
  const response = await fetch(`${baseUrl}/accommodation_types`, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  console.log('API Response type:', typeof data)
  console.log('API Response keys:', Object.keys(data).slice(0, 10))

  const accommodations = Array.isArray(data) ? data : []

  console.log(`\nFound ${accommodations.length} accommodations from MotoPress\n`)

  accommodations.forEach((acc: any) => {
    console.log(`${acc.id} - ${acc.title}`)

    // Check for price fields
    const priceFields = Object.keys(acc).filter(key =>
      key.toLowerCase().includes('price') ||
      key.toLowerCase().includes('rate') ||
      key.toLowerCase().includes('cost')
    )

    if (priceFields.length > 0) {
      console.log(`  ✅ Price fields:`, priceFields.map(f => `${f}=${acc[f]}`).join(', '))
    } else {
      console.log(`  ❌ NO price fields found`)
    }
    console.log('')
  })
}

checkPrices()
