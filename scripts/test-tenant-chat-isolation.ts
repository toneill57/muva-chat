#!/usr/bin/env tsx

/**
 * Test Tenant Chat Isolation
 *
 * This script tests the tenant-specific chat endpoint to ensure:
 * 1. Each tenant only sees their own documentation
 * 2. No cross-contamination between tenants
 * 3. Proper error handling when tenant not found
 *
 * Prerequisites:
 * - 2 tenants seeded with different documentation
 * - Tenant A (simmerdown): surf-classes.md
 * - Tenant B (xyz): hotel-rooms.md
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing environment variables')
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// Colors for console output
const RESET = '\x1b[0m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const BLUE = '\x1b[34m'

interface TestResult {
  test: string
  passed: boolean
  message: string
  details?: any
}

const results: TestResult[] = []

/**
 * Seed test tenants with different documentation
 */
async function seedTestTenants() {
  console.log(`\n${BLUE}═══════════════════════════════════════════════════${RESET}`)
  console.log(`${BLUE}  SEEDING TEST TENANTS${RESET}`)
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`)

  // Generate embedding for test content (mock - in real scenario we'd use OpenAI)
  const mockEmbedding = Array(1536).fill(0).map(() => Math.random())

  // Seed Tenant A (simmerdown)
  const { data: tenantA, error: tenantAError } = await supabase
    .from('tenant_registry')
    .upsert({
      subdomain: 'simmerdown',
      nombre_comercial: 'SimmerDown Guest House',
      slug: 'simmerdown',
      nit: '900123456-7',
      razon_social: 'SimmerDown Guest House SAS',
      schema_name: 'tenant_simmerdown'
    }, { onConflict: 'subdomain' })
    .select()
    .single()

  if (tenantAError && tenantAError.code !== '23505') { // Ignore unique violation
    console.error(`${RED}❌ Failed to seed Tenant A:${RESET}`, tenantAError)
    return null
  }

  // Get tenant A if upsert didn't return data
  let tenantAData = tenantA
  if (!tenantAData) {
    const { data } = await supabase
      .from('tenant_registry')
      .select()
      .eq('subdomain', 'simmerdown')
      .single()
    tenantAData = data
  }

  console.log(`${GREEN}✅ Tenant A seeded: SimmerDown (${tenantAData?.tenant_id})${RESET}`)

  // Seed Tenant B (xyz)
  const { data: tenantB, error: tenantBError } = await supabase
    .from('tenant_registry')
    .upsert({
      subdomain: 'xyz',
      nombre_comercial: 'XYZ Hotel',
      slug: 'xyz',
      nit: '900654321-9',
      razon_social: 'XYZ Hotel Ltda',
      schema_name: 'tenant_xyz'
    }, { onConflict: 'subdomain' })
    .select()
    .single()

  if (tenantBError && tenantBError.code !== '23505') {
    console.error(`${RED}❌ Failed to seed Tenant B:${RESET}`, tenantBError)
    return null
  }

  let tenantBData = tenantB
  if (!tenantBData) {
    const { data } = await supabase
      .from('tenant_registry')
      .select()
      .eq('subdomain', 'xyz')
      .single()
    tenantBData = data
  }

  console.log(`${GREEN}✅ Tenant B seeded: XYZ Hotel (${tenantBData?.tenant_id})${RESET}`)

  return {
    tenantA: tenantAData,
    tenantB: tenantBData
  }
}

/**
 * Generate real embedding using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536
  })

  return response.data[0].embedding
}

/**
 * Seed tenant-specific embeddings
 */
async function seedTenantEmbeddings(tenantId: string, docs: Array<{path: string, content: string}>) {
  for (const doc of docs) {
    // Generate REAL semantic embedding
    console.log(`  Generating embedding for ${doc.path}...`)
    const embedding = await generateEmbedding(doc.content)

    const { error } = await supabase
      .from('tenant_knowledge_embeddings')
      .upsert({
        tenant_id: tenantId,
        file_path: doc.path,
        chunk_index: 0,
        content: doc.content,
        embedding: embedding
      }, { onConflict: 'tenant_id,file_path,chunk_index' })

    if (error) {
      console.error(`${RED}❌ Failed to seed embedding for ${doc.path}:${RESET}`, error)
      return false
    }
  }

  console.log(`${GREEN}✅ Seeded ${docs.length} embeddings for tenant ${tenantId}${RESET}`)
  return true
}

/**
 * Test: Chat API returns 404 for invalid subdomain
 */
async function testInvalidSubdomain() {
  console.log(`\n${YELLOW}Testing: Invalid subdomain returns 404${RESET}`)

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-subdomain': 'nonexistent'
      },
      body: JSON.stringify({
        question: 'Test question',
        use_context: true
      })
    })

    const data = await response.json()

    if (response.status === 404) {
      results.push({
        test: 'Invalid subdomain',
        passed: true,
        message: '404 returned for nonexistent tenant'
      })
      console.log(`${GREEN}✅ PASS: Returns 404 for invalid subdomain${RESET}`)
      return true
    } else {
      results.push({
        test: 'Invalid subdomain',
        passed: false,
        message: `Expected 404, got ${response.status}`,
        details: data
      })
      console.log(`${RED}❌ FAIL: Expected 404, got ${response.status}${RESET}`)
      return false
    }
  } catch (error) {
    results.push({
      test: 'Invalid subdomain',
      passed: false,
      message: `Request failed: ${error}`,
      details: error
    })
    console.log(`${RED}❌ FAIL: Request failed${RESET}`, error)
    return false
  }
}

/**
 * Test: Tenant A can query their own docs
 */
async function testTenantAQuery() {
  console.log(`\n${YELLOW}Testing: Tenant A can query their own docs${RESET}`)

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-subdomain': 'simmerdown'
      },
      body: JSON.stringify({
        question: 'How much are surf classes?',
        use_context: true,
        max_context_chunks: 5
      })
    })

    const data = await response.json()

    if (response.ok && data.response) {
      results.push({
        test: 'Tenant A query',
        passed: true,
        message: 'Successfully retrieved response with tenant context',
        details: { response: data.response.substring(0, 100) }
      })
      console.log(`${GREEN}✅ PASS: Tenant A received response${RESET}`)
      console.log(`Response preview: "${data.response.substring(0, 150)}..."`)
      return true
    } else {
      results.push({
        test: 'Tenant A query',
        passed: false,
        message: `Request failed with status ${response.status}`,
        details: data
      })
      console.log(`${RED}❌ FAIL: Request failed${RESET}`, data)
      return false
    }
  } catch (error) {
    results.push({
      test: 'Tenant A query',
      passed: false,
      message: `Request failed: ${error}`,
      details: error
    })
    console.log(`${RED}❌ FAIL: Request failed${RESET}`, error)
    return false
  }
}

/**
 * Test: Tenant B can query their own docs
 */
async function testTenantBQuery() {
  console.log(`\n${YELLOW}Testing: Tenant B can query their own docs${RESET}`)

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-subdomain': 'xyz'
      },
      body: JSON.stringify({
        question: 'How much are hotel rooms?',
        use_context: true,
        max_context_chunks: 5
      })
    })

    const data = await response.json()

    if (response.ok && data.response) {
      results.push({
        test: 'Tenant B query',
        passed: true,
        message: 'Successfully retrieved response with tenant context',
        details: { response: data.response.substring(0, 100) }
      })
      console.log(`${GREEN}✅ PASS: Tenant B received response${RESET}`)
      console.log(`Response preview: "${data.response.substring(0, 150)}..."`)
      return true
    } else {
      results.push({
        test: 'Tenant B query',
        passed: false,
        message: `Request failed with status ${response.status}`,
        details: data
      })
      console.log(`${RED}❌ FAIL: Request failed${RESET}`, data)
      return false
    }
  } catch (error) {
    results.push({
      test: 'Tenant B query',
      passed: false,
      message: `Request failed: ${error}`,
      details: error
    })
    console.log(`${RED}❌ FAIL: Request failed${RESET}`, error)
    return false
  }
}

/**
 * Test: Tenant A asking about Tenant B's docs gets no results
 */
async function testTenantIsolation() {
  console.log(`\n${YELLOW}Testing: Tenant isolation (A asks about B's docs)${RESET}`)

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-subdomain': 'simmerdown'
      },
      body: JSON.stringify({
        question: 'How much are hotel rooms?', // This is Tenant B's content
        use_context: true,
        max_context_chunks: 5
      })
    })

    const data = await response.json()

    // Should return "I don't have information" or similar
    if (response.ok && data.response &&
        (data.response.includes("don't have") ||
         data.response.includes("no information") ||
         data.response.includes("not loaded"))) {
      results.push({
        test: 'Tenant isolation',
        passed: true,
        message: 'Tenant A correctly cannot access Tenant B docs',
        details: { response: data.response.substring(0, 100) }
      })
      console.log(`${GREEN}✅ PASS: Tenant isolation working${RESET}`)
      console.log(`Response: "${data.response.substring(0, 150)}..."`)
      return true
    } else {
      results.push({
        test: 'Tenant isolation',
        passed: false,
        message: 'Tenant A may have accessed Tenant B docs (isolation breach)',
        details: data
      })
      console.log(`${RED}❌ FAIL: Possible isolation breach${RESET}`)
      console.log(`Response: "${data.response?.substring(0, 150)}..."`)
      return false
    }
  } catch (error) {
    results.push({
      test: 'Tenant isolation',
      passed: false,
      message: `Request failed: ${error}`,
      details: error
    })
    console.log(`${RED}❌ FAIL: Request failed${RESET}`, error)
    return false
  }
}

/**
 * Print final test results
 */
function printResults() {
  console.log(`\n${BLUE}═══════════════════════════════════════════════════${RESET}`)
  console.log(`${BLUE}  TEST RESULTS${RESET}`)
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`)

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  results.forEach((result, index) => {
    const icon = result.passed ? `${GREEN}✅` : `${RED}❌`
    console.log(`${index + 1}. ${icon} ${result.test}${RESET}`)
    console.log(`   ${result.message}`)
    if (result.details) {
      console.log(`   Details:`, result.details)
    }
    console.log()
  })

  console.log(`${BLUE}───────────────────────────────────────────────────${RESET}`)
  console.log(`Total: ${total} | ${GREEN}Passed: ${passed}${RESET} | ${RED}Failed: ${failed}${RESET}`)
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`)

  return failed === 0
}

/**
 * Main execution
 */
async function main() {
  console.log(`${BLUE}╔═══════════════════════════════════════════════════╗${RESET}`)
  console.log(`${BLUE}║  TENANT CHAT ISOLATION TEST                       ║${RESET}`)
  console.log(`${BLUE}╚═══════════════════════════════════════════════════╝${RESET}`)

  // Step 1: Seed test tenants
  const tenants = await seedTestTenants()
  if (!tenants) {
    console.error(`${RED}❌ Failed to seed tenants. Exiting.${RESET}`)
    process.exit(1)
  }

  // Step 2: Seed embeddings
  console.log(`\n${BLUE}═══════════════════════════════════════════════════${RESET}`)
  console.log(`${BLUE}  SEEDING EMBEDDINGS${RESET}`)
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`)

  const tenantASuccess = await seedTenantEmbeddings(tenants.tenantA.tenant_id, [
    {
      path: 'surf-classes.md',
      content: 'Surf classes at SimmerDown cost $50 per hour for private lessons and $30 per hour for group classes. Equipment rental is included in the price.'
    }
  ])

  const tenantBSuccess = await seedTenantEmbeddings(tenants.tenantB.tenant_id, [
    {
      path: 'hotel-rooms.md',
      content: 'Hotel rooms at XYZ Hotel start at $100 per night for standard rooms and $200 per night for deluxe suites. All rooms include breakfast and free WiFi.'
    }
  ])

  if (!tenantASuccess || !tenantBSuccess) {
    console.error(`${RED}❌ Failed to seed embeddings. Exiting.${RESET}`)
    process.exit(1)
  }

  // Step 3: Wait for server to be ready
  console.log(`\n${YELLOW}⏳ Waiting for server to be ready...${RESET}`)
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Step 4: Run tests
  console.log(`\n${BLUE}═══════════════════════════════════════════════════${RESET}`)
  console.log(`${BLUE}  RUNNING TESTS${RESET}`)
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`)

  await testInvalidSubdomain()
  await testTenantAQuery()
  await testTenantBQuery()
  await testTenantIsolation()

  // Step 5: Print results
  const success = printResults()

  process.exit(success ? 0 : 1)
}

main().catch(error => {
  console.error(`${RED}❌ Fatal error:${RESET}`, error)
  process.exit(1)
})
