/**
 * Get details of MotoPress accommodation type 323
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function getAccommodation() {
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

  // Get accommodation type 323
  const response = await fetch(`${baseUrl}/accommodation_types/323`, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  })

  const accommodationType = await response.json()

  console.log('🏠 MotoPress Accommodation Type 323:')
  console.log(JSON.stringify(accommodationType, null, 2))
}

getAccommodation()
