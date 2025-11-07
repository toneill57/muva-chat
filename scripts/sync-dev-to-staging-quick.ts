#!/usr/bin/env tsx
/**
 * Quick sync dev data to staging - DIRECT COPY
 * Uses existing .env.local keys + prompts for staging key
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

const DEV_PROJECT = 'ooaumjzaztmutltifhoq'
const STAGING_PROJECT = 'rvjmwwvkhglcuqwcznph'

// Dev key from .env.local
const DEV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!DEV_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found')
  console.error('   Run: set -a && source .env.local && set +a')
  process.exit(1)
}

// Prompt for staging key
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve))
}

const TABLES = [
  'conversation_memory',
  'reservation_accommodations',
  'staff_conversations',
  'staff_messages',
  'sync_history',
  'hotel_operations',
  'job_logs',
  'prospective_sessions',
  'chat_messages',
  'guest_conversations',
]

async function copyTable(
  devClient: any,
  stagingClient: any,
  tableName: string
): Promise<{ success: boolean; count: number }> {
  try {
    console.log(`\n📋 ${tableName}...`)

    // 1. Fetch all from dev
    const { data: devData, error: fetchError } = await devClient
      .from(tableName)
      .select('*')

    if (fetchError) {
      console.error(`  ❌ Fetch error:`, fetchError.message)
      return { success: false, count: 0 }
    }

    if (!devData || devData.length === 0) {
      console.log(`  ⏭️  Empty in dev`)
      return { success: true, count: 0 }
    }

    console.log(`  📥 Fetched ${devData.length} records`)

    // 2. Delete all from staging
    const { error: deleteError } = await stagingClient
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (deleteError) {
      console.error(`  ❌ Delete error:`, deleteError.message)
      return { success: false, count: 0 }
    }

    console.log(`  🗑️  Cleared staging`)

    // 3. Insert in batches
    const batchSize = 100
    let inserted = 0

    for (let i = 0; i < devData.length; i += batchSize) {
      const batch = devData.slice(i, i + batchSize)

      const { error: insertError } = await stagingClient
        .from(tableName)
        .insert(batch)

      if (insertError) {
        console.error(`  ❌ Insert error (batch ${i}):`, insertError.message)
        return { success: false, count: inserted }
      }

      inserted += batch.length
      if (devData.length > 100) {
        console.log(`  📤 ${inserted}/${devData.length}`)
      }
    }

    // 4. Verify
    const { count, error: countError } = await stagingClient
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error(`  ⚠️  Count error:`, countError.message)
    }

    const match = count === devData.length
    console.log(`  ${match ? '✅' : '❌'} ${count}/${devData.length} records`)

    return { success: match, count: count || 0 }
  } catch (error: any) {
    console.error(`  ❌ Exception:`, error.message)
    return { success: false, count: 0 }
  }
}

async function main() {
  console.log('🚀 Dev → Staging Data Sync\n')
  console.log(`Dev: ${DEV_PROJECT}`)
  console.log(`Staging: ${STAGING_PROJECT}\n`)

  // Ask for staging key
  console.log('⚠️  Need staging service_role_key')
  console.log('   Get it from: https://supabase.com/dashboard/project/rvjmwwvkhglcuqwcznph/settings/api\n')

  const STAGING_KEY = await askQuestion('Paste staging service_role_key: ')
  rl.close()

  if (!STAGING_KEY || STAGING_KEY.length < 100) {
    console.error('\n❌ Invalid key')
    process.exit(1)
  }

  console.log('\n✅ Keys validated\n')

  const devClient = createClient(
    `https://${DEV_PROJECT}.supabase.co`,
    DEV_KEY
  )

  const stagingClient = createClient(
    `https://${STAGING_PROJECT}.supabase.co`,
    STAGING_KEY
  )

  // Copy all tables
  const results: Record<string, boolean> = {}

  for (const table of TABLES) {
    const { success, count } = await copyTable(devClient, stagingClient, table)
    results[table] = success
  }

  // Summary
  console.log('\n\n' + '═'.repeat(60))
  console.log('📊 FINAL RESULTS')
  console.log('═'.repeat(60))

  let allSuccess = true
  for (const [table, success] of Object.entries(results)) {
    console.log(`${success ? '✅' : '❌'} ${table}`)
    if (!success) allSuccess = false
  }

  console.log('═'.repeat(60))

  if (allSuccess) {
    console.log('✅ ALL TABLES SYNCED SUCCESSFULLY!\n')
  } else {
    console.log('❌ SOME TABLES FAILED\n')
    process.exit(1)
  }
}

main().catch(console.error)
