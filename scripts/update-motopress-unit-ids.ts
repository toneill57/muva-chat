/**
 * Update MotoPress Unit IDs Script
 *
 * Fetches accommodation units from MotoPress API and updates motopress_unit_id
 * in hotels.accommodation_units table to match the actual unit instance IDs.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface MotoPresAccommodation {
  id: number
  title: string
  status: string
  accommodation_type: number
}

class MotoPresClient {
  private apiKey: string
  private consumerSecret: string
  private baseUrl: string

  constructor(consumerKey: string, consumerSecret: string, siteUrl: string) {
    this.apiKey = consumerKey
    this.consumerSecret = consumerSecret
    this.baseUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/mphb/v1`
  }

  private async makeRequest<T>(endpoint: string): Promise<{ data?: T; error?: string }> {
    const url = `${this.baseUrl}${endpoint}`

    try {
      const credentials = Buffer.from(`${this.apiKey}:${this.consumerSecret}`).toString('base64')

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'User-Agent': 'InnPilot/1.0',
        },
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { error: `HTTP ${response.status}: ${errorText}` }
      }

      const data = await response.json()
      return { data }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { error: 'Request timeout' }
      }
      return { error: error.message || 'Network error' }
    }
  }

  async getAccommodations(): Promise<{ data?: MotoPresAccommodation[]; error?: string }> {
    return this.makeRequest<MotoPresAccommodation[]>('/accommodations?per_page=100')
  }
}

async function updateUnitIds(tenantId: string) {
  console.log('🔄 Updating MotoPress Unit IDs')
  console.log('━'.repeat(60))

  // Get tenant info
  const { data: tenant } = await supabase
    .from('tenant_registry')
    .select('tenant_id, nombre_comercial, slug')
    .eq('tenant_id', tenantId)
    .single()

  if (!tenant) {
    console.error('❌ Tenant not found')
    return
  }

  console.log(`\n🏨 Tenant: ${tenant.nombre_comercial}`)

  // Get MotoPress config
  const { data: config } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('integration_type', 'motopress')
    .eq('is_active', true)
    .single()

  if (!config) {
    console.error('❌ No active MotoPress integration found')
    return
  }

  // Initialize client
  const client = new MotoPresClient(
    config.config_data.consumer_key,
    config.config_data.consumer_secret,
    config.config_data.site_url
  )

  // Fetch accommodations from MotoPress
  console.log('\n📥 Fetching accommodations from MotoPress...')
  const response = await client.getAccommodations()

  if (response.error || !response.data) {
    console.error(`❌ Failed to fetch accommodations: ${response.error}`)
    return
  }

  const accommodations = response.data
  console.log(`✓ Found ${accommodations.length} accommodations\n`)

  // Display mappings
  console.log('📋 MotoPress Accommodations:')
  console.log('━'.repeat(60))
  for (const acc of accommodations) {
    console.log(`   ID: ${acc.id.toString().padEnd(5)} | ${acc.title}`)
  }

  // Get current units from database
  const { data: dbUnits } = await supabase
    .rpc('execute_sql', {
      query: `
        SELECT id, name, motopress_unit_id
        FROM hotels.accommodation_units
        WHERE tenant_id = '${tenantId}'
        ORDER BY name
      `
    })

  console.log('\n📋 Database Units:')
  console.log('━'.repeat(60))
  for (const unit of dbUnits || []) {
    console.log(`   ${unit.name.padEnd(20)} | Current ID: ${unit.motopress_unit_id || 'NULL'}`)
  }

  // Attempt automatic matching by name similarity
  console.log('\n🔍 Attempting automatic matching...')
  console.log('━'.repeat(60))

  let matchCount = 0
  for (const dbUnit of dbUnits || []) {
    const normalizedDbName = dbUnit.name.toLowerCase().replace(/[^a-z0-9]/g, '')

    for (const mpAcc of accommodations) {
      const normalizedMpName = mpAcc.title.toLowerCase().replace(/[^a-z0-9]/g, '')

      if (normalizedDbName === normalizedMpName ||
          normalizedDbName.includes(normalizedMpName) ||
          normalizedMpName.includes(normalizedDbName)) {

        console.log(`   ✓ Match: "${dbUnit.name}" → MP ID ${mpAcc.id} (${mpAcc.title})`)

        // Update in database
        const { error } = await supabase
          .rpc('execute_sql', {
            query: `
              UPDATE hotels.accommodation_units
              SET motopress_unit_id = ${mpAcc.id}
              WHERE id = '${dbUnit.id}'
            `
          })

        if (error) {
          console.log(`      ❌ Failed to update: ${error.message}`)
        } else {
          matchCount++
        }
        break
      }
    }
  }

  console.log(`\n✅ Successfully matched and updated ${matchCount} units`)
  console.log('\n✨ Done!')
}

// Run for default tenant
updateUnitIds('b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf')
