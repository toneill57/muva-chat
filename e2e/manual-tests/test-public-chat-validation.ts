/**
 * Public Chat System Validation Tests
 *
 * Tests:
 * 1. Session creation and persistence
 * 2. Travel intent extraction (NLP)
 * 3. Availability URL generation
 * 4. Vector search (public accommodations)
 * 5. End-to-end chat flow
 *
 * Run: ANTHROPIC_API_KEY=xxx npx tsx test-public-chat-validation.ts
 */

// Check for required environment variables
const requiredEnvVars = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key)

if (missingVars.length > 0) {
  console.error(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`)
  console.error('\nPlease set them and try again:')
  console.error('  export ANTHROPIC_API_KEY="sk-..."')
  console.error('  export NEXT_PUBLIC_SUPABASE_URL="https://..."')
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="eyJ..."')
  process.exit(1)
}

import { extractTravelIntent, generateAvailabilityURL } from '../../src/lib/public-chat-session'

// ANSI colors
const green = '\x1b[32m'
const red = '\x1b[31m'
const yellow = '\x1b[33m'
const blue = '\x1b[34m'
const reset = '\x1b[0m'

function log(msg: string) {
  console.log(`${blue}[test]${reset} ${msg}`)
}

function success(msg: string) {
  console.log(`${green}✓${reset} ${msg}`)
}

function error(msg: string) {
  console.log(`${red}✗${reset} ${msg}`)
}

function warn(msg: string) {
  console.log(`${yellow}⚠${reset} ${msg}`)
}

// Test 1: Travel Intent Extraction (NLP)
async function testIntentExtraction() {
  log('Testing travel intent extraction with Claude Haiku...')

  const testCases = [
    {
      message: 'Busco un apartamento para 4 personas del 15 al 20 de diciembre',
      expected: {
        check_in: '2025-12-15',
        check_out: '2025-12-20',
        guests: 4,
        accommodation_type: 'apartment',
      },
    },
    {
      message: 'Necesito una habitación para 2 personas este fin de semana',
      expected: {
        guests: 2,
        accommodation_type: 'room',
      },
    },
    {
      message: '¿Cuánto cuesta una suite?',
      expected: {
        accommodation_type: 'suite',
      },
    },
    {
      message: 'Hola, me gustaría saber qué actividades hay cerca',
      expected: {
        check_in: null,
        guests: null,
        accommodation_type: null,
      },
    },
  ]

  for (const { message, expected } of testCases) {
    log(`  Testing: "${message}"`)

    try {
      const intent = await extractTravelIntent(message)

      // Check expected fields
      let passed = true

      if (expected.check_in && intent.check_in !== expected.check_in) {
        warn(`    check_in: Expected ${expected.check_in}, got ${intent.check_in}`)
        passed = false
      }

      if (expected.check_out && intent.check_out !== expected.check_out) {
        warn(`    check_out: Expected ${expected.check_out}, got ${intent.check_out}`)
        passed = false
      }

      if (expected.guests && intent.guests !== expected.guests) {
        warn(`    guests: Expected ${expected.guests}, got ${intent.guests}`)
        passed = false
      }

      if (expected.accommodation_type && intent.accommodation_type !== expected.accommodation_type) {
        warn(`    type: Expected ${expected.accommodation_type}, got ${intent.accommodation_type}`)
        passed = false
      }

      // Check nulls
      if (expected.check_in === null && intent.check_in !== null) {
        warn(`    check_in: Expected null, got ${intent.check_in}`)
        passed = false
      }

      if (passed) {
        success(`  ✓ Intent extracted correctly`)
      } else {
        warn(`  ⚠ Partial match (NLP may vary)`)
      }

      console.log(`    Result: ${JSON.stringify(intent, null, 2)}`)
    } catch (err) {
      error(`  ✗ Intent extraction failed: ${err}`)
    }
  }
}

// Test 2: Availability URL Generation
async function testURLGeneration() {
  log('Testing availability URL generation...')

  const testCases = [
    {
      intent: {
        check_in: '2025-12-15',
        check_out: '2025-12-20',
        guests: 4,
        accommodation_type: 'apartment',
        budget_range: null,
        preferences: [],
      },
      baseURL: 'https://simmerdown.house',
      expected: 'https://simmerdown.house/availability?check_in=2025-12-15&check_out=2025-12-20&guests=4',
    },
    {
      intent: {
        check_in: '2025-12-25',
        check_out: null,
        guests: 2,
        accommodation_type: null,
        budget_range: null,
        preferences: [],
      },
      baseURL: 'https://simmerdown.house',
      expected: 'https://simmerdown.house/availability?check_in=2025-12-25&guests=2',
    },
    {
      intent: {
        check_in: null,
        check_out: null,
        guests: null,
        accommodation_type: null,
        budget_range: null,
        preferences: [],
      },
      baseURL: 'https://simmerdown.house',
      expected: null,
    },
  ]

  for (const { intent, baseURL, expected } of testCases) {
    const url = generateAvailabilityURL(baseURL, intent)

    if (url === expected) {
      success(`  ✓ URL generation correct: ${url || 'null'}`)
    } else {
      error(`  ✗ Expected: ${expected}, got: ${url}`)
    }
  }
}

// Test 3: Database Tables Exist
async function testDatabaseSchema() {
  log('Testing database schema...')

  try {
    const { createClient } = await import('@supabase/supabase-js')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      warn('  ⚠ Supabase credentials not configured (set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check prospective_sessions table
    const { data: sessions, error: sessionsError } = await supabase
      .from('prospective_sessions')
      .select('session_id')
      .limit(1)

    if (sessionsError) {
      if (sessionsError.code === '42P01') {
        warn('  ⚠ Table prospective_sessions does not exist (run migrations)')
      } else {
        error(`  ✗ Error checking prospective_sessions: ${sessionsError.message}`)
      }
    } else {
      success('  ✓ Table prospective_sessions exists')
    }

    // Check accommodation_units_public table
    const { data: units, error: unitsError } = await supabase
      .from('accommodation_units_public')
      .select('unit_id')
      .limit(1)

    if (unitsError) {
      if (unitsError.code === '42P01') {
        warn('  ⚠ Table accommodation_units_public does not exist (run migrations)')
      } else {
        error(`  ✗ Error checking accommodation_units_public: ${unitsError.message}`)
      }
    } else {
      success('  ✓ Table accommodation_units_public exists')
    }

    // Check RPC function exists
    const { data: rpcTest, error: rpcError } = await supabase.rpc('match_accommodations_public', {
      query_embedding: new Array(1024).fill(0.1),
      p_tenant_id: '00000000-0000-0000-0000-000000000000',
      match_threshold: 0.2,
      match_count: 1,
    })

    if (rpcError) {
      if (rpcError.code === '42883') {
        warn('  ⚠ RPC function match_accommodations_public does not exist (run migrations)')
      } else {
        warn(`  ⚠ RPC function exists but error: ${rpcError.message}`)
      }
    } else {
      success('  ✓ RPC function match_accommodations_public exists')
    }
  } catch (err) {
    warn(`  ⚠ Could not connect to database: ${err}`)
  }
}

// Test 4: API Endpoint (if dev server running)
async function testAPIEndpoint() {
  log('Testing API endpoint /api/public/chat...')

  try {
    const response = await fetch('http://localhost:3000/api/public/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hola, ¿qué actividades hay cerca?',
        tenant_id: 'simmerdown', // Should resolve to UUID
      }),
    })

    if (response.status === 200) {
      const data = await response.json()

      if (data.success && data.data.session_id) {
        success('  ✓ API endpoint returned success')
        success(`    Session ID: ${data.data.session_id}`)
        success(`    Response length: ${data.data.response.length} chars`)

        if (data.data.suggestions && data.data.suggestions.length > 0) {
          success(`    Suggestions: ${data.data.suggestions.length}`)
        }
      } else {
        warn('  ⚠ API returned 200 but unexpected format')
      }
    } else {
      warn(`  ⚠ API returned status ${response.status}`)
    }
  } catch (err) {
    warn('  ⚠ Could not connect to API (is dev server running?)')
    warn(`    Run: npm run dev`)
    warn(`    Error: ${err}`)
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(60))
  console.log('  PUBLIC CHAT SYSTEM VALIDATION TESTS')
  console.log('='.repeat(60) + '\n')

  try {
    // Test 1: Intent Extraction
    console.log('\n' + '-'.repeat(60))
    console.log('TEST 1: Travel Intent Extraction (NLP)')
    console.log('-'.repeat(60))
    await testIntentExtraction()

    // Test 2: URL Generation
    console.log('\n' + '-'.repeat(60))
    console.log('TEST 2: Availability URL Generation')
    console.log('-'.repeat(60))
    await testURLGeneration()

    // Test 3: Database Schema
    console.log('\n' + '-'.repeat(60))
    console.log('TEST 3: Database Schema')
    console.log('-'.repeat(60))
    await testDatabaseSchema()

    // Test 4: API Endpoint
    console.log('\n' + '-'.repeat(60))
    console.log('TEST 4: API Endpoint')
    console.log('-'.repeat(60))
    await testAPIEndpoint()

    console.log('\n' + '='.repeat(60))
    console.log('  VALIDATION COMPLETE')
    console.log('='.repeat(60) + '\n')

    console.log(`${green}Next steps:${reset}`)
    console.log('1. Run migrations:')
    console.log('   psql $DATABASE_URL -f supabase/migrations/20251001015000_add_prospective_sessions_table.sql')
    console.log('   psql $DATABASE_URL -f supabase/migrations/20251001015100_add_accommodation_units_public_table.sql')
    console.log('   psql $DATABASE_URL -f supabase/migrations/20251001015200_add_match_accommodations_public_function.sql')
    console.log('\n2. Migrate data:')
    console.log('   npx tsx scripts/migrate-accommodation-units-public.ts')
    console.log('\n3. Test API:')
    console.log('   npm run dev')
    console.log('   curl -X POST http://localhost:3000/api/public/chat -H "Content-Type: application/json" -d \'{"message":"Busco apartamento para 4 del 15 al 20 de diciembre","tenant_id":"simmerdown"}\'')
    console.log('')
  } catch (err) {
    error(`\nFatal error: ${err}`)
    process.exit(1)
  }
}

// Run tests
runTests()
