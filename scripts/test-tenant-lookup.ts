/**
 * Test script for getTenantBySubdomain function
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/test-tenant-lookup.ts
 */

import { getTenantBySubdomain } from '@/lib/tenant-utils';

async function testTenantLookup() {
  console.log('🧪 Testing getTenantBySubdomain function...\n');

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Existing tenant
  console.log('Test 1: Lookup existing tenant "simmerdown"');
  try {
    const tenant1 = await getTenantBySubdomain('simmerdown');
    if (tenant1) {
      console.log('✅ PASS - Tenant found:', {
        tenant_id: tenant1.tenant_id,
        nombre_comercial: tenant1.nombre_comercial,
        subdomain: tenant1.subdomain,
      });
      passedTests++;
    } else {
      console.log('❌ FAIL - Tenant not found');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL - Error thrown:', error);
    failedTests++;
  }

  console.log('\n---\n');

  // Test 2: Non-existent tenant
  console.log('Test 2: Lookup non-existent tenant "nonexistent"');
  try {
    const tenant2 = await getTenantBySubdomain('nonexistent');
    if (tenant2 === null) {
      console.log('✅ PASS - Correctly returned null for non-existent tenant');
      passedTests++;
    } else {
      console.log('❌ FAIL - Should return null for non-existent tenant');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL - Error thrown:', error);
    failedTests++;
  }

  console.log('\n---\n');

  // Test 3: Null subdomain
  console.log('Test 3: Lookup with null subdomain');
  try {
    const tenant3 = await getTenantBySubdomain(null);
    if (tenant3 === null) {
      console.log('✅ PASS - Correctly returned null for null subdomain');
      passedTests++;
    } else {
      console.log('❌ FAIL - Should return null for null subdomain');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL - Error thrown:', error);
    failedTests++;
  }

  console.log('\n---\n');

  // Test 4: Invalid subdomain format
  console.log('Test 4: Lookup with invalid subdomain "Invalid_Upper"');
  try {
    const tenant4 = await getTenantBySubdomain('Invalid_Upper');
    if (tenant4 === null) {
      console.log('✅ PASS - Correctly returned null for invalid subdomain format');
      passedTests++;
    } else {
      console.log('❌ FAIL - Should return null for invalid subdomain');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL - Error thrown:', error);
    failedTests++;
  }

  console.log('\n---\n');

  // Test 5: Second existing tenant
  console.log('Test 5: Lookup existing tenant "free-hotel-test"');
  try {
    const tenant5 = await getTenantBySubdomain('free-hotel-test');
    if (tenant5) {
      console.log('✅ PASS - Tenant found:', {
        tenant_id: tenant5.tenant_id,
        nombre_comercial: tenant5.nombre_comercial,
        subdomain: tenant5.subdomain,
      });
      passedTests++;
    } else {
      console.log('❌ FAIL - Tenant not found');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL - Error thrown:', error);
    failedTests++;
  }

  console.log('\n---\n');

  // Summary
  console.log('📊 Test Summary:');
  console.log(`  ✅ Passed: ${passedTests}/5`);
  console.log(`  ❌ Failed: ${failedTests}/5`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests completed successfully!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

testTenantLookup().catch((error) => {
  console.error('\n💥 Fatal error running tests:', error);
  process.exit(1);
});
