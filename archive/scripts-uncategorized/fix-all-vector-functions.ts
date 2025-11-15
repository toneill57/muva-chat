#!/usr/bin/env tsx
/**
 * Fix ALL vector search functions by adding 'extensions' to search_path
 * Applies fix to PRODUCTION database
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Production credentials
const SUPABASE_URL = 'https://ooaumjzaztmutltifhoq.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

console.log('🔧 Fixing ALL vector search functions in PRODUCTION...\n')

async function applyFix() {
  const sql = readFileSync(join(__dirname, '..', 'fix-all-vector-functions.sql'), 'utf-8')

  // Split by CREATE OR REPLACE FUNCTION
  const functions = sql.split(/(?=CREATE OR REPLACE FUNCTION)/).filter(f => f.trim())

  console.log(`📝 Found ${functions.length} functions to fix\n`)

  for (const [index, funcSQL] of functions.entries()) {
    const match = funcSQL.match(/FUNCTION\s+(\w+\.\w+|\w+)\(/)
    const funcName = match ? match[1] : `function-${index + 1}`

    console.log(`[${index + 1}/${functions.length}] Applying: ${funcName}`)

    try {
      const { error } = await supabase.rpc('exec_sql', { query: funcSQL })

      if (error) {
        // Try direct execution if exec_sql RPC doesn't exist
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ query: funcSQL })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }
        console.log(`  ✅ ${funcName} fixed`)
      } else {
        console.log(`  ✅ ${funcName} fixed`)
      }
    } catch (err: any) {
      console.error(`  ❌ ${funcName} failed: ${err.message}`)
    }
  }

  console.log('\n✅ All functions processed')
}

applyFix().catch(console.error)
