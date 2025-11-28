/**
 * Create sire_submissions table for SIRE compliance tracking
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const sql = readFileSync('/tmp/create_sire_submissions.sql', 'utf8')

// Split into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0)

console.log('Executing', statements.length, 'SQL statements...')

async function run() {
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';'
    console.log(`\n[${i+1}/${statements.length}] Executing: ${stmt.substring(0, 60)}...`)

    try {
      const { data, error } = await supabase.rpc('execute_sql', { query: stmt })

      if (error) {
        console.error('❌ Error:', error)
      } else {
        console.log('✅ Success')
      }
    } catch (e: any) {
      console.error('❌ Exception:', e.message)
    }
  }

  console.log('\n✅ Migration complete')
}

run()
