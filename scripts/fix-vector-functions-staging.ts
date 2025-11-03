#!/usr/bin/env tsx
/**
 * Fix ALL vector search functions in STAGING by adding 'extensions' to search_path
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Staging credentials
const SUPABASE_URL = 'https://rvjmwwvkhglcuqwcznph.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2am13d3ZraGdsY3Vxd2N6bnBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA0MDE3NywiZXhwIjoyMDc3NjE2MTc3fQ.yOfeLkNPD-dM_IB954XtelUv-d237vfa39UdUB1WTlA'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

console.log('🔧 Fixing ALL vector search functions in STAGING...\n')

async function applyFix() {
  const sql = readFileSync(join(__dirname, '..', 'fix-all-vector-functions.sql'), 'utf-8')

  // Split by CREATE OR REPLACE FUNCTION
  const functions = sql.split(/(?=CREATE OR REPLACE FUNCTION)/).filter(f => f.trim())

  console.log(`📝 Found ${functions.length} functions to fix\n`)

  let successCount = 0
  let failCount = 0

  for (const [index, funcSQL] of functions.entries()) {
    const match = funcSQL.match(/FUNCTION\s+(public\.)?(\w+)\(/)
    const funcName = match ? match[2] : `function-${index + 1}`

    console.log(`[${index + 1}/${functions.length}] Applying: ${funcName}`)

    try {
      const { error } = await supabase.rpc('exec_sql' as any, { query: funcSQL } as any)

      if (error) {
        console.error(`  ❌ ${funcName} failed: ${error.message}`)
        failCount++
      } else {
        console.log(`  ✅ ${funcName} fixed`)
        successCount++
      }
    } catch (err: any) {
      console.error(`  ❌ ${funcName} failed: ${err.message}`)
      failCount++
    }
  }

  console.log(`\n📊 SUMMARY:`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log(`   📝 Total: ${functions.length}`)
}

applyFix().catch(console.error)
