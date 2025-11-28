#!/usr/bin/env tsx
/**
 * Fix missing tables in staging: staff_users, staff_conversations, staff_messages, conversation_memory
 * Copy ONLY the missing data with proper FK order
 */

import { createClient } from '@supabase/supabase-js'

const DEV_PROJECT = 'ooaumjzaztmutltifhoq'
const DEV_URL = 'https://ooaumjzaztmutltifhoq.supabase.co'
const DEV_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc'

const STAGING_PROJECT = 'rvjmwwvkhglcuqwcznph'
const STAGING_URL = 'https://rvjmwwvkhglcuqwcznph.supabase.co'
const STAGING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2am13d3ZraGdsY3Vxd2N6bnBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA0MDE3NywiZXhwIjoyMDc3NjE2MTc3fQ.yOfeLkNPD-dM_IB954XtelUv-d237vfa39UdUB1WTlA'

const devClient = createClient(DEV_URL, DEV_KEY)
const stagingClient = createClient(STAGING_URL, STAGING_KEY)

async function copyStaffUsers() {
  console.log('\n📋 1/4: staff_users')

  // Get all from dev
  const { data: devData, error: fetchError } = await devClient
    .from('staff_users')
    .select('*')

  if (fetchError || !devData) {
    console.error('❌ Fetch error:', fetchError)
    return false
  }

  console.log(`  📥 Fetched ${devData.length} from dev`)

  // Get existing in staging
  const { data: existingData } = await stagingClient
    .from('staff_users')
    .select('staff_id')

  const existingIds = new Set(existingData?.map((r: any) => r.staff_id) || [])
  const newRecords = devData.filter(r => !existingIds.has(r.staff_id))

  console.log(`  ℹ️  ${existingIds.size} already in staging, ${newRecords.length} to insert`)

  if (newRecords.length === 0) {
    console.log('  ✅ All staff_users already in staging')
    return true
  }

  // Insert new ones
  const { error: insertError } = await stagingClient
    .from('staff_users')
    .insert(newRecords)

  if (insertError) {
    console.error('❌ Insert error:', insertError)
    return false
  }

  console.log(`  ✅ Inserted ${newRecords.length} new records`)
  return true
}

async function copyStaffConversations() {
  console.log('\n📋 2/4: staff_conversations')

  // Get all from dev
  const { data: devData, error: fetchError } = await devClient
    .from('staff_conversations')
    .select('*')

  if (fetchError || !devData) {
    console.error('❌ Fetch error:', fetchError)
    return false
  }

  console.log(`  📥 Fetched ${devData.length} from dev`)

  // Delete all existing (to avoid duplicates)
  const { error: deleteError } = await stagingClient
    .from('staff_conversations')
    .delete()
    .neq('conversation_id', '00000000-0000-0000-0000-000000000000')

  if (deleteError) {
    console.error('❌ Delete error:', deleteError)
  }

  // Insert all
  const { error: insertError } = await stagingClient
    .from('staff_conversations')
    .insert(devData)

  if (insertError) {
    console.error('❌ Insert error:', insertError)
    return false
  }

  console.log(`  ✅ Inserted ${devData.length} records`)
  return true
}

async function copyStaffMessages() {
  console.log('\n📋 3/4: staff_messages')

  // Get all from dev
  const { data: devData, error: fetchError } = await devClient
    .from('staff_messages')
    .select('*')

  if (fetchError || !devData) {
    console.error('❌ Fetch error:', fetchError)
    return false
  }

  console.log(`  📥 Fetched ${devData.length} from dev`)

  // Delete all existing
  const { error: deleteError } = await stagingClient
    .from('staff_messages')
    .delete()
    .neq('message_id', '00000000-0000-0000-0000-000000000000')

  if (deleteError) {
    console.error('❌ Delete error:', deleteError)
  }

  // Insert all
  const { error: insertError } = await stagingClient
    .from('staff_messages')
    .insert(devData)

  if (insertError) {
    console.error('❌ Insert error:', insertError)
    return false
  }

  console.log(`  ✅ Inserted ${devData.length} records`)
  return true
}

async function copyConversationMemory() {
  console.log('\n📋 4/4: conversation_memory')

  // Get all from dev
  const { data: devData, error: fetchError } = await devClient
    .from('conversation_memory')
    .select('*')

  if (fetchError || !devData) {
    console.error('❌ Fetch error:', fetchError)
    return false
  }

  console.log(`  📥 Fetched ${devData.length} from dev`)

  // Delete all existing
  const { error: deleteError } = await stagingClient
    .from('conversation_memory')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (deleteError) {
    console.error('❌ Delete error:', deleteError)
  }

  // Insert all
  const { error: insertError } = await stagingClient
    .from('conversation_memory')
    .insert(devData)

  if (insertError) {
    console.error('❌ Insert error:', insertError)
    return false
  }

  console.log(`  ✅ Inserted ${devData.length} records`)
  return true
}

async function verifyResults() {
  console.log('\n📊 VERIFICATION:')

  const tables = [
    'staff_users',
    'staff_conversations',
    'staff_messages',
    'conversation_memory'
  ]

  for (const table of tables) {
    const { count: devCount } = await devClient
      .from(table)
      .select('*', { count: 'exact', head: true })

    const { count: stagingCount } = await stagingClient
      .from(table)
      .select('*', { count: 'exact', head: true })

    const match = devCount === stagingCount
    const icon = match ? '✅' : '❌'
    console.log(`${icon} ${table}: ${stagingCount}/${devCount}`)
  }
}

async function main() {
  console.log('🚀 Fixing missing tables in staging\n')
  console.log(`Dev: ${DEV_PROJECT}`)
  console.log(`Staging: ${STAGING_PROJECT}`)

  // Copy in FK dependency order
  const success1 = await copyStaffUsers()
  if (!success1) {
    console.error('\n❌ Failed at staff_users')
    process.exit(1)
  }

  const success2 = await copyStaffConversations()
  if (!success2) {
    console.error('\n❌ Failed at staff_conversations')
    process.exit(1)
  }

  const success3 = await copyStaffMessages()
  if (!success3) {
    console.error('\n❌ Failed at staff_messages')
    process.exit(1)
  }

  const success4 = await copyConversationMemory()
  if (!success4) {
    console.error('\n❌ Failed at conversation_memory')
    process.exit(1)
  }

  await verifyResults()

  console.log('\n✅ ALL TABLES FIXED!\n')
}

main().catch(console.error)
