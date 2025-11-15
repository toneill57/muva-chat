/**
 * Debug script para diagnosticar problemas de mapeo de pricing en MotoPress
 *
 * Este script muestra:
 * 1. Accommodations y sus IDs
 * 2. Rates y sus accommodation_type_id
 * 3. El mapeo entre accommodations y rates
 *
 * Uso: pnpm dlx tsx scripts/debug-motopress-pricing.ts
 */

import { createClient } from '@supabase/supabase-js'
import { MotoPresClient } from '../src/lib/integrations/motopress/client'
import { MotoPresDataMapper } from '../src/lib/integrations/motopress/data-mapper'

// Decrypt function (copied from sync-manager)
async function decrypt(configData: any): Promise<{
  api_key?: string
  consumer_key?: string
  consumer_secret: string
  site_url: string
}> {
  const { decryptCredentials } = await import('../src/lib/admin-auth')

  try {
    const decryptedApiKey = await decryptCredentials(configData.api_key)
    const decryptedConsumerSecret = await decryptCredentials(configData.consumer_secret)

    return {
      api_key: decryptedApiKey,
      consumer_key: decryptedApiKey,
      consumer_secret: decryptedConsumerSecret,
      site_url: configData.site_url
    }
  } catch (error) {
    console.error('Failed to decrypt credentials:', error)
    throw new Error('Failed to decrypt MotoPress credentials')
  }
}

async function main() {
  // Setup Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get tenant_id from command line or use default
  const tenantId = process.argv[2] || 'tucasamar'

  console.log(`\n🔍 Debugging MotoPress Pricing for tenant: ${tenantId}\n`)
  console.log('='.repeat(80))

  // Get integration config
  console.log('\n📋 Step 1: Getting MotoPress integration config...')
  const { data: config, error: configError } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('integration_type', 'motopress')
    .eq('is_active', true)
    .single()

  if (configError || !config) {
    console.error('❌ No active MotoPress integration found for tenant:', tenantId)
    process.exit(1)
  }

  console.log('✅ Found MotoPress integration config')

  // Decrypt credentials
  console.log('\n🔐 Step 2: Decrypting credentials...')
  const credentials = await decrypt(config.config_data)
  console.log('✅ Credentials decrypted')
  console.log(`   Site URL: ${credentials.site_url}`)

  // Initialize MotoPress client
  const client = new MotoPresClient({
    apiKey: credentials.consumer_key || credentials.api_key || '',
    consumerSecret: credentials.consumer_secret,
    siteUrl: credentials.site_url
  })

  // Fetch accommodations
  console.log('\n🏨 Step 3: Fetching accommodations from MotoPress...')
  const accommodationsResponse = await client.getAllAccommodations()

  if (accommodationsResponse.error || !accommodationsResponse.data) {
    console.error('❌ Failed to fetch accommodations:', accommodationsResponse.error)
    process.exit(1)
  }

  const accommodations = accommodationsResponse.data
  console.log(`✅ Retrieved ${accommodations.length} accommodations\n`)

  // Display accommodations
  console.log('Accommodations:')
  console.log('-'.repeat(80))
  accommodations.forEach((acc, idx) => {
    const title = typeof acc.title === 'string' ? acc.title : acc.title?.rendered || `Accommodation ${acc.id}`
    console.log(`${idx + 1}. ID: ${acc.id} | Name: ${title}`)
  })

  // Fetch rates
  console.log('\n\n💰 Step 4: Fetching rates (pricing) from MotoPress...')
  const ratesResponse = await client.getAllRates()

  if (ratesResponse.error || !ratesResponse.data) {
    console.error('⚠️  Failed to fetch rates:', ratesResponse.error)
    console.log('\n⚠️  This could be why pricing is not being mapped!')
    console.log('   Possible reasons:')
    console.log('   1. MotoPress site has no rates configured')
    console.log('   2. MotoPress API endpoint /rates is not accessible')
    console.log('   3. Authentication issue with MotoPress API')
    process.exit(1)
  }

  const rates = ratesResponse.data
  console.log(`✅ Retrieved ${rates.length} rates\n`)

  if (rates.length === 0) {
    console.error('⚠️  NO RATES FOUND!')
    console.log('\n💡 This is why pricing is not being mapped to accommodations.')
    console.log('   Please configure rates in MotoPress admin panel.')
    process.exit(0)
  }

  // Display rates
  console.log('Rates:')
  console.log('-'.repeat(80))
  rates.forEach((rate, idx) => {
    console.log(`${idx + 1}. Rate ID: ${rate.id}`)
    console.log(`   Title: ${rate.title}`)
    console.log(`   Accommodation Type ID: ${rate.accommodation_type_id}`)
    console.log(`   Season Prices: ${rate.season_prices?.length || 0} seasons`)

    if (rate.season_prices && rate.season_prices.length > 0) {
      rate.season_prices.forEach((season: any, seasonIdx: number) => {
        console.log(`      Season ${seasonIdx + 1}: Base Price = $${season.base_price} COP`)
      })
    }
    console.log('')
  })

  // Map rates to pricing
  console.log('\n🗺️  Step 5: Mapping rates to pricing...')
  const pricingData = MotoPresDataMapper.mapRatesToPricing(rates)

  const pricingMap = new Map()
  pricingData.forEach(pricing => {
    pricingMap.set(pricing.accommodation_type_id, pricing)
  })

  console.log(`✅ Created pricing map with ${pricingMap.size} entries\n`)

  // Check mapping
  console.log('🔍 Step 6: Checking accommodation → pricing mapping...')
  console.log('='.repeat(80))

  let matchedCount = 0
  let unmatchedCount = 0

  accommodations.forEach((acc) => {
    const title = typeof acc.title === 'string' ? acc.title : acc.title?.rendered || `Accommodation ${acc.id}`
    const pricing = pricingMap.get(acc.id)

    if (pricing) {
      matchedCount++
      console.log(`\n✅ MATCH: ${title}`)
      console.log(`   Accommodation ID: ${acc.id}`)
      console.log(`   Base Price: $${pricing.base_price} COP`)
      console.log(`   Low Season: $${pricing.base_price_low_season} COP`)
      console.log(`   High Season: $${pricing.base_price_high_season} COP`)
    } else {
      unmatchedCount++
      console.log(`\n❌ NO MATCH: ${title}`)
      console.log(`   Accommodation ID: ${acc.id}`)
      console.log(`   → No rate found with accommodation_type_id = ${acc.id}`)
    }
  })

  // Summary
  console.log('\n\n📊 SUMMARY')
  console.log('='.repeat(80))
  console.log(`Total Accommodations: ${accommodations.length}`)
  console.log(`Total Rates: ${rates.length}`)
  console.log(`Matched (with pricing): ${matchedCount}`)
  console.log(`Unmatched (no pricing): ${unmatchedCount}`)

  if (unmatchedCount > 0) {
    console.log('\n⚠️  PROBLEM DETECTED!')
    console.log(`   ${unmatchedCount} accommodations don't have pricing configured in MotoPress.`)
    console.log('   ')
    console.log('   💡 Solutions:')
    console.log('   1. Go to MotoPress admin panel')
    console.log('   2. Create rates for each accommodation type')
    console.log('   3. Make sure each rate has the correct "Accommodation Type" selected')
    console.log('   4. Run the sync again')
  } else {
    console.log('\n✅ ALL ACCOMMODATIONS HAVE PRICING!')
    console.log('   The mapping should work correctly during sync.')
  }

  console.log('\n' + '='.repeat(80) + '\n')
}

main().catch(console.error)
