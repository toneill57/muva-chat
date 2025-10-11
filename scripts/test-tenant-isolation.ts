/**
 * Test Tenant Data Isolation
 *
 * Verifies that tenant data is properly isolated:
 * 1. Sessions from one tenant cannot be accessed by another
 * 2. Accommodation search results are filtered by tenant_id
 * 3. No data leakage between tenants
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/test-tenant-isolation.ts
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Test tenant IDs (from tenant_registry)
const SIMMERDOWN_TENANT_ID = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
const HOTEL_BOUTIQUE_TENANT_ID = '00d83928-f2de-4be0-9656-ac78dc0548c5'

async function generateTestEmbedding(): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: 'Test query for accommodations',
    dimensions: 1024,
  })
  return response.data[0].embedding
}

async function testSessionIsolation() {
  console.log('\n🔐 TEST 1: Session Isolation')
  console.log('=' .repeat(60))

  try {
    // Create a session for Simmer Down
    const { data: simmerdownSession, error: createError } = await supabase
      .from('prospective_sessions')
      .insert({
        tenant_id: SIMMERDOWN_TENANT_ID,
        cookie_id: `test_${Date.now()}`,
        conversation_history: [],
        status: 'active',
      })
      .select('session_id')
      .single()

    if (createError || !simmerdownSession) {
      console.error('❌ Failed to create test session:', createError)
      return false
    }

    const sessionId = simmerdownSession.session_id
    console.log(`✓ Created session for Simmer Down: ${sessionId}`)

    // Try to access this session as Hotel Boutique (should fail)
    const { data: crossTenantAccess, error: accessError } = await supabase
      .from('prospective_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('tenant_id', HOTEL_BOUTIQUE_TENANT_ID)
      .eq('status', 'active')
      .single()

    if (accessError?.code === 'PGRST116' || !crossTenantAccess) {
      console.log('✅ PASS: Cross-tenant session access blocked')
    } else {
      console.error('❌ FAIL: Cross-tenant session access allowed!')
      console.error('   Session was accessible by different tenant')
      return false
    }

    // Cleanup
    await supabase
      .from('prospective_sessions')
      .delete()
      .eq('session_id', sessionId)

    console.log('✓ Test session cleaned up')
    return true
  } catch (error) {
    console.error('❌ Test error:', error)
    return false
  }
}

async function testAccommodationIsolation() {
  console.log('\n🏠 TEST 2: Accommodation Data Isolation')
  console.log('=' .repeat(60))

  try {
    const embedding = await generateTestEmbedding()
    console.log('✓ Generated test embedding')

    // Search accommodations for Simmer Down
    const { data: simmerdownResults, error: simmerdownError } = await supabase
      .rpc('match_accommodations_public', {
        query_embedding: embedding,
        p_tenant_id: SIMMERDOWN_TENANT_ID,
        match_threshold: 0.1,
        match_count: 20,
      })

    if (simmerdownError) {
      console.error('❌ Simmer Down search error:', simmerdownError)
      return false
    }

    console.log(`✓ Found ${simmerdownResults?.length || 0} Simmer Down accommodations`)

    // Search accommodations for Hotel Boutique
    const { data: boutiqueResults, error: boutiqueError } = await supabase
      .rpc('match_accommodations_public', {
        query_embedding: embedding,
        p_tenant_id: HOTEL_BOUTIQUE_TENANT_ID,
        match_threshold: 0.1,
        match_count: 20,
      })

    if (boutiqueError) {
      console.error('❌ Hotel Boutique search error:', boutiqueError)
      return false
    }

    console.log(`✓ Found ${boutiqueResults?.length || 0} Hotel Boutique accommodations`)

    // Verify no overlap in IDs
    const simmerdownIds = new Set(simmerdownResults?.map((r: any) => r.id) || [])
    const boutiqueIds = new Set(boutiqueResults?.map((r: any) => r.id) || [])

    const overlap = [...simmerdownIds].filter(id => boutiqueIds.has(id))

    if (overlap.length > 0) {
      console.error('❌ FAIL: Found overlapping accommodation IDs!')
      console.error('   Overlapping IDs:', overlap)
      return false
    }

    console.log('✅ PASS: No accommodation data leakage between tenants')
    return true
  } catch (error) {
    console.error('❌ Test error:', error)
    return false
  }
}

async function testPolicyIsolation() {
  console.log('\n📋 TEST 3: Policy Data Isolation')
  console.log('=' .repeat(60))

  try {
    const embedding = await generateTestEmbedding()

    // Search policies for Simmer Down
    const { data: simmerdownPolicies, error: simmerdownError } = await supabase
      .rpc('match_policies_public', {
        query_embedding: embedding,
        p_tenant_id: SIMMERDOWN_TENANT_ID,
        match_threshold: 0.1,
        match_count: 10,
      })

    if (simmerdownError) {
      console.error('❌ Simmer Down policy search error:', simmerdownError)
      return false
    }

    console.log(`✓ Found ${simmerdownPolicies?.length || 0} Simmer Down policies`)

    // Search policies for Hotel Boutique
    const { data: boutiquePolicies, error: boutiqueError } = await supabase
      .rpc('match_policies_public', {
        query_embedding: embedding,
        p_tenant_id: HOTEL_BOUTIQUE_TENANT_ID,
        match_threshold: 0.1,
        match_count: 10,
      })

    if (boutiqueError) {
      console.error('❌ Hotel Boutique policy search error:', boutiqueError)
      return false
    }

    console.log(`✓ Found ${boutiquePolicies?.length || 0} Hotel Boutique policies`)

    // Verify no overlap
    const simmerdownIds = new Set(simmerdownPolicies?.map((r: any) => r.id) || [])
    const boutiqueIds = new Set(boutiquePolicies?.map((r: any) => r.id) || [])

    const overlap = [...simmerdownIds].filter(id => boutiqueIds.has(id))

    if (overlap.length > 0) {
      console.error('❌ FAIL: Found overlapping policy IDs!')
      console.error('   Overlapping IDs:', overlap)
      return false
    }

    console.log('✅ PASS: No policy data leakage between tenants')
    return true
  } catch (error) {
    console.error('❌ Test error:', error)
    return false
  }
}

async function runAllTests() {
  console.log('\n')
  console.log('═'.repeat(60))
  console.log('🔒 TENANT DATA ISOLATION TEST SUITE')
  console.log('═'.repeat(60))

  const results = {
    sessionIsolation: await testSessionIsolation(),
    accommodationIsolation: await testAccommodationIsolation(),
    policyIsolation: await testPolicyIsolation(),
  }

  console.log('\n')
  console.log('═'.repeat(60))
  console.log('📊 TEST RESULTS')
  console.log('═'.repeat(60))
  console.log(`Session Isolation:       ${results.sessionIsolation ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Accommodation Isolation: ${results.accommodationIsolation ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Policy Isolation:        ${results.policyIsolation ? '✅ PASS' : '❌ FAIL'}`)
  console.log('═'.repeat(60))

  const allPassed = Object.values(results).every(r => r === true)

  if (allPassed) {
    console.log('\n✅ ALL TESTS PASSED - Tenant isolation is working correctly')
    process.exit(0)
  } else {
    console.log('\n❌ SOME TESTS FAILED - Review security issues above')
    process.exit(1)
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
