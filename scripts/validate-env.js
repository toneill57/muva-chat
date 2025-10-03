#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * Validates that all required environment variables are present before deployment
 */

import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.dirname(__dirname)

// Load environment variables
config({ path: path.join(projectRoot, '.env.local') })

// Required environment variables
const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
]

// Optional but recommended
const RECOMMENDED_VARS = [
  'JWT_SECRET',
  'CLAUDE_MODEL',
]

console.log('🔍 Validating environment variables...\n')

let hasErrors = false
let hasWarnings = false

// Check required variables
console.log('📋 Required Variables:')
REQUIRED_VARS.forEach(varName => {
  const value = process.env[varName]
  if (!value) {
    console.log(`   ❌ ${varName}: MISSING`)
    hasErrors = true
  } else {
    const preview = value.length > 20 ? `${value.slice(0, 20)}...${value.slice(-4)}` : value.slice(0, 10) + '...'
    console.log(`   ✅ ${varName}: ${preview}`)
  }
})

// Check recommended variables
console.log('\n🔧 Recommended Variables:')
RECOMMENDED_VARS.forEach(varName => {
  const value = process.env[varName]
  if (!value) {
    console.log(`   ⚠️  ${varName}: NOT SET (using defaults)`)
    hasWarnings = true
  } else {
    console.log(`   ✅ ${varName}: ${value.slice(0, 20)}...`)
  }
})

// Test connections flag
const testConnections = process.argv.includes('--test-connections')

if (testConnections) {
  console.log('\n🔌 Testing connections...')
  // Here you could add actual connection tests
  // For now, just validate format

  const supabaseUrl = process.env.SUPABASE_URL
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.log('   ❌ SUPABASE_URL must start with https://')
    hasErrors = true
  } else if (supabaseUrl) {
    console.log('   ✅ Supabase URL format valid')
  }
}

// Summary
console.log('\n' + '='.repeat(50))
if (hasErrors) {
  console.log('❌ Validation FAILED - Missing required variables')
  process.exit(1)
} else if (hasWarnings) {
  console.log('⚠️  Validation PASSED with warnings')
  process.exit(0)
} else {
  console.log('✅ All environment variables validated successfully')
  process.exit(0)
}
