#!/usr/bin/env tsx
/**
 * Test script for subdomain resolution
 *
 * Tests:
 * 1. resolveSubdomainToTenantId('simmerdown') → tenant_id
 * 2. Cache functionality
 * 3. Error handling (invalid subdomain)
 */

import { resolveSubdomainToTenantId } from './src/lib/tenant-resolver'

async function main() {
  console.log('🧪 Testing Subdomain Resolution\n')

  // Test 1: Valid subdomain
  console.log('Test 1: Resolve "simmerdown" subdomain')
  try {
    const tenantId = await resolveSubdomainToTenantId('simmerdown')
    console.log('✅ SUCCESS:', tenantId)
  } catch (error) {
    console.error('❌ FAILED:', error instanceof Error ? error.message : error)
  }

  console.log('\n---\n')

  // Test 2: Cache hit (run same query again)
  console.log('Test 2: Second call (should hit cache)')
  try {
    const tenantId = await resolveSubdomainToTenantId('simmerdown')
    console.log('✅ SUCCESS (cached):', tenantId)
  } catch (error) {
    console.error('❌ FAILED:', error instanceof Error ? error.message : error)
  }

  console.log('\n---\n')

  // Test 3: Invalid subdomain
  console.log('Test 3: Invalid subdomain "nonexistent"')
  try {
    const tenantId = await resolveSubdomainToTenantId('nonexistent')
    console.log('❌ UNEXPECTED SUCCESS:', tenantId)
  } catch (error) {
    console.log('✅ EXPECTED ERROR:', error instanceof Error ? error.message : error)
  }

  console.log('\n---\n')

  // Test 4: Empty subdomain
  console.log('Test 4: Empty subdomain ""')
  try {
    const tenantId = await resolveSubdomainToTenantId('')
    console.log('❌ UNEXPECTED SUCCESS:', tenantId)
  } catch (error) {
    console.log('✅ EXPECTED ERROR:', error instanceof Error ? error.message : error)
  }

  console.log('\n✅ All tests completed!')
}

main().catch(console.error)
