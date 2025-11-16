#!/usr/bin/env tsx
/**
 * Apply All Migration Files to Fresh Supabase Branch
 * Branch ID: bddcvjoeoiekzfetvxoe (NEW TST environment)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const PROJECT_REF = 'bddcvjoeoiekzfetvxoe' // NEW TST environment
const MIGRATIONS_DIR = '/Users/oneill/Sites/apps/muva-chat/migrations/backup-2025-10-31'

// Migration files in order
const MIGRATIONS = [
  { name: '01_schema_foundation', file: '01-schema-foundation.sql', type: 'schema' },
  { name: '02_schema_catalog', file: '02-schema-catalog.sql', type: 'schema' },
  { name: '03_schema_operations', file: '03-schema-operations.sql', type: 'schema' },
  { name: '04_schema_reservations', file: '04-schema-reservations.sql', type: 'schema' },
  { name: '05_schema_embeddings', file: '05-schema-embeddings.sql', type: 'schema' },
  { name: '06_schema_integrations', file: '06-schema-integrations.sql', type: 'schema' },
  { name: '10_data_foundation', file: '10-data-foundation.sql', type: 'data' },
  { name: '11_data_catalog', file: '11-data-catalog.sql', type: 'data_large' },
  { name: '12_data_operations', file: '12-data-operations.sql', type: 'data_large' },
  { name: '13_data_reservations', file: '13-data-reservations.sql', type: 'data_critical' },
  { name: '15_data_integrations', file: '15-data-integrations.sql', type: 'data' },
]

const supabase = createClient(
  `https://${PROJECT_REF}.supabase.co`,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface MigrationResult {
  name: string
  type: string
  status: 'success' | 'failed' | 'skipped'
  error?: string
  sizeMB?: number
}

const results: MigrationResult[] = []

async function applyMigration(name: string, sql: string): Promise<void> {
  const { error } = await supabase.rpc('execute_sql', { query: sql })
  if (error) throw error
}

async function main() {
  console.log('='.repeat(80))
  console.log('FRESH BRANCH MIGRATION EXECUTION')
  console.log('Branch Project Ref:', PROJECT_REF)
  console.log('Total Migrations:', MIGRATIONS.length)
  console.log('='.repeat(80))
  console.log()

  for (const migration of MIGRATIONS) {
    const filePath = join(MIGRATIONS_DIR, migration.file)
    
    try {
      const stats = require('fs').statSync(filePath)
      const sizeMB = stats.size / (1024 * 1024)
      
      console.log(`[${migration.type}] ${migration.name}`)
      console.log(`  File: ${migration.file} (${sizeMB.toFixed(2)} MB)`)
      
      // Skip files over 10MB (will fail due to size limits)
      if (sizeMB > 10) {
        console.log(`  Status: SKIPPED (file too large: ${sizeMB.toFixed(2)} MB)`)
        results.push({
          name: migration.name,
          type: migration.type,
          status: 'skipped',
          error: `File size ${sizeMB.toFixed(2)} MB exceeds 10MB limit`,
          sizeMB
        })
        console.log()
        continue
      }
      
      const sql = readFileSync(filePath, 'utf-8')
      
      console.log(`  Applying...`)
      await applyMigration(migration.name, sql)
      
      console.log(`  Status: SUCCESS`)
      results.push({
        name: migration.name,
        type: migration.type,
        status: 'success',
        sizeMB
      })
      
    } catch (error: any) {
      console.log(`  Status: FAILED`)
      console.log(`  Error: ${error.message}`)
      results.push({
        name: migration.name,
        type: migration.type,
        status: 'failed',
        error: error.message
      })
    }
    
    console.log()
  }

  // Summary
  console.log('='.repeat(80))
  console.log('MIGRATION SUMMARY')
  console.log('='.repeat(80))
  
  const successful = results.filter(r => r.status === 'success')
  const failed = results.filter(r => r.status === 'failed')
  const skipped = results.filter(r => r.status === 'skipped')
  
  console.log(`Total: ${results.length}`)
  console.log(`Success: ${successful.length}`)
  console.log(`Failed: ${failed.length}`)
  console.log(`Skipped: ${skipped.length}`)
  console.log()
  
  if (failed.length > 0) {
    console.log('FAILED MIGRATIONS:')
    failed.forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
    console.log()
  }
  
  if (skipped.length > 0) {
    console.log('SKIPPED MIGRATIONS:')
    skipped.forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
    console.log()
  }
  
  // Write results to JSON
  const resultsFile = join(MIGRATIONS_DIR, 'FRESH_MIGRATION_RESULTS.json')
  require('fs').writeFileSync(resultsFile, JSON.stringify(results, null, 2))
  console.log(`Results saved to: ${resultsFile}`)
}

main().catch(console.error)
