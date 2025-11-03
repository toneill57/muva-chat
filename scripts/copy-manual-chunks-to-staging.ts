#!/usr/bin/env tsx
/**
 * Copy accommodation_units_manual and accommodation_units_manual_chunks
 * from production to staging
 */

import { createClient } from '@supabase/supabase-js'

// Production
const PROD_URL = 'https://ooaumjzaztmutltifhoq.supabase.co'
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Staging
const STAGING_URL = 'https://rvjmwwvkhglcuqwcznph.supabase.co'
const STAGING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2am13d3ZraGdsY3Vxd2N6bnBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA0MDE3NywiZXhwIjoyMDc3NjE2MTc3fQ.yOfeLkNPD-dM_IB954XtelUv-d237vfa39UdUB1WTlA'

const prodClient = createClient(PROD_URL, PROD_KEY, { auth: { persistSession: false } })
const stagingClient = createClient(STAGING_URL, STAGING_KEY, { auth: { persistSession: false } })

async function copyData() {
  console.log('📦 Copying accommodation manuals from PROD to STAGING...\n')

  // 1. Export accommodation_units_manual from production
  console.log('1️⃣ Exporting accommodation_units_manual from production...')
  const { data: manuals, error: exportManualError } = await prodClient
    .from('accommodation_units_manual')
    .select('*')

  if (exportManualError) {
    console.error('❌ Error exporting manuals:', exportManualError)
    process.exit(1)
  }

  console.log(`   ✅ Exported ${manuals?.length || 0} manuals`)

  // 2. Export accommodation_units_manual_chunks from production
  console.log('2️⃣ Exporting accommodation_units_manual_chunks from production...')
  const { data: chunks, error: exportChunksError } = await prodClient
    .from('accommodation_units_manual_chunks')
    .select('*')

  if (exportChunksError) {
    console.error('❌ Error exporting chunks:', exportChunksError)
    process.exit(1)
  }

  console.log(`   ✅ Exported ${chunks?.length || 0} chunks\n`)

  // 3. Clear staging tables (in correct order due to FK)
  console.log('3️⃣ Clearing staging tables...')

  const { error: deleteChunksError } = await stagingClient
    .from('accommodation_units_manual_chunks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (deleteChunksError) {
    console.error('❌ Error clearing chunks:', deleteChunksError)
    process.exit(1)
  }

  const { error: deleteManualsError } = await stagingClient
    .from('accommodation_units_manual')
    .delete()
    .neq('unit_id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (deleteManualsError) {
    console.error('❌ Error clearing manuals:', deleteManualsError)
    process.exit(1)
  }

  console.log('   ✅ Staging tables cleared\n')

  // 4. Insert manuals into staging
  console.log('4️⃣ Inserting manuals into staging...')
  const { error: insertManualsError } = await stagingClient
    .from('accommodation_units_manual')
    .insert(manuals!)

  if (insertManualsError) {
    console.error('❌ Error inserting manuals:', insertManualsError)
    process.exit(1)
  }

  console.log(`   ✅ Inserted ${manuals?.length || 0} manuals`)

  // 5. Insert chunks into staging (in batches of 50 to avoid timeout)
  console.log('5️⃣ Inserting chunks into staging...')
  const batchSize = 50
  const totalChunks = chunks?.length || 0

  for (let i = 0; i < totalChunks; i += batchSize) {
    const batch = chunks!.slice(i, i + batchSize)
    const { error: insertChunksError } = await stagingClient
      .from('accommodation_units_manual_chunks')
      .insert(batch)

    if (insertChunksError) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, insertChunksError)
      process.exit(1)
    }

    console.log(`   ✅ Inserted batch ${i / batchSize + 1}/${Math.ceil(totalChunks / batchSize)} (${batch.length} chunks)`)
  }

  console.log(`\n✅ COMPLETED!`)
  console.log(`   - accommodation_units_manual: ${manuals?.length || 0} rows`)
  console.log(`   - accommodation_units_manual_chunks: ${chunks?.length || 0} rows`)
}

copyData().catch(console.error)
