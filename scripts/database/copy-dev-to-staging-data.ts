/**
 * Script to copy data from dev to staging
 * Handles all tables with proper data type conversion
 */

import { createClient } from '@supabase/supabase-js'

const DEV_PROJECT = 'ooaumjzaztmutltifhoq'
const STAGING_PROJECT = 'rvjmwwvkhglcuqwcznph'
const SUPABASE_URL_DEV = `https://${DEV_PROJECT}.supabase.co`
const SUPABASE_URL_STAGING = `https://${STAGING_PROJECT}.supabase.co`

// Service role keys from environment
const DEV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV!
const STAGING_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_STAGING!

const devClient = createClient(SUPABASE_URL_DEV, DEV_KEY)
const stagingClient = createClient(SUPABASE_URL_STAGING, STAGING_KEY)

interface TableConfig {
  name: string
  expectedCount: number
}

const TABLES: TableConfig[] = [
  { name: 'conversation_memory', expectedCount: 10 },
  { name: 'reservation_accommodations', expectedCount: 93 },
  { name: 'staff_conversations', expectedCount: 45 },
  { name: 'staff_messages', expectedCount: 60 },
  { name: 'sync_history', expectedCount: 85 },
  { name: 'hotel_operations', expectedCount: 10 },
  { name: 'job_logs', expectedCount: 39 },
  { name: 'prospective_sessions', expectedCount: 412 },
  { name: 'chat_messages', expectedCount: 349 },
  { name: 'guest_conversations', expectedCount: 114 },
]

async function copyTable(tableName: string, expectedCount: number) {
  console.log(`\n📋 Processing ${tableName}...`)

  // 1. Fetch from dev
  const { data: devData, error: fetchError } = await devClient
    .from(tableName)
    .select('*')

  if (fetchError) {
    console.error(`❌ Error fetching from dev:`, fetchError)
    return false
  }

  if (!devData || devData.length === 0) {
    console.log(`⚠️  No data in dev for ${tableName}`)
    return true
  }

  console.log(`   Fetched ${devData.length} records from dev`)

  // 2. Clear staging
  const { error: deleteError } = await stagingClient
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (deleteError) {
    console.error(`❌ Error clearing staging:`, deleteError)
    return false
  }

  console.log(`   Cleared staging table`)

  // 3. Insert into staging (in batches of 100)
  const batchSize = 100
  let inserted = 0

  for (let i = 0; i < devData.length; i += batchSize) {
    const batch = devData.slice(i, i + batchSize)

    const { error: insertError } = await stagingClient
      .from(tableName)
      .insert(batch)

    if (insertError) {
      console.error(`❌ Error inserting batch ${i}-${i + batch.length}:`, insertError)
      return false
    }

    inserted += batch.length
    console.log(`   Inserted ${inserted}/${devData.length}`)
  }

  // 4. Verify count
  const { count: stagingCount, error: countError } = await stagingClient
    .from(tableName)
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error(`❌ Error counting staging:`, countError)
    return false
  }

  const success = stagingCount === devData.length
  const status = success ? '✅' : '❌'
  console.log(`${status} ${tableName}: ${stagingCount}/${devData.length} ${success ? 'SUCCESS' : 'MISMATCH'}`)

  return success
}

async function main() {
  console.log('🚀 Starting data copy from dev to staging...\n')
  console.log(`Dev: ${DEV_PROJECT}`)
  console.log(`Staging: ${STAGING_PROJECT}`)

  const results: Record<string, boolean> = {}

  for (const table of TABLES) {
    const success = await copyTable(table.name, table.expectedCount)
    results[table.name] = success
  }

  console.log('\n\n📊 FINAL SUMMARY:')
  console.log('═'.repeat(50))

  let allSuccess = true
  for (const [tableName, success] of Object.entries(results)) {
    const status = success ? '✅' : '❌'
    console.log(`${status} ${tableName}`)
    if (!success) allSuccess = false
  }

  console.log('═'.repeat(50))

  if (allSuccess) {
    console.log('✅ ALL TABLES COPIED SUCCESSFULLY!')
  } else {
    console.log('❌ SOME TABLES FAILED - Check errors above')
    process.exit(1)
  }
}

main().catch(console.error)
