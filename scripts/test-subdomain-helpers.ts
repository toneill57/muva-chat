/**
 * Integration Test Script for Subdomain Helper Functions
 *
 * Tests all tenant-utils functions:
 * - getSubdomain() - Extracting subdomain from hostname
 * - isValidSubdomain() - Validating subdomain format
 * - getTenantBySubdomain() - Database integration
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/test-subdomain-helpers.ts
 */

import { getTenantBySubdomain, getSubdomain, isValidSubdomain } from '../src/lib/tenant-utils';

async function testSubdomainHelpers() {
  console.log('🧪 Testing Subdomain Helper Functions\n');

  // Test 1: getSubdomain() from various hostnames
  console.log('TEST 1: getSubdomain()');
  const testCases = [
    { hostname: 'simmerdown.innpilot.io', expected: 'simmerdown' },
    { hostname: 'free-hotel-test.innpilot.io', expected: 'free-hotel-test' },
    { hostname: 'innpilot.io', expected: null },
    { hostname: 'www.innpilot.io', expected: null },
    { hostname: 'simmerdown.localhost', expected: 'simmerdown' },
    { hostname: 'localhost:3000', expected: null },
  ];

  let test1Passed = 0;
  for (const { hostname, expected } of testCases) {
    const result = getSubdomain(hostname);
    const status = result === expected ? '✅' : '❌';
    if (result === expected) test1Passed++;
    console.log(`${status} ${hostname} → ${result} (expected: ${expected})`);
  }

  // Test 2: isValidSubdomain()
  console.log('\nTEST 2: isValidSubdomain()');
  const validationCases = [
    { subdomain: 'simmerdown', valid: true },
    { subdomain: 'free-hotel-test', valid: true },
    { subdomain: 'test123', valid: true },
    { subdomain: 'Invalid_Upper', valid: false },
    { subdomain: 'has space', valid: false },
    { subdomain: 'special!char', valid: false },
    { subdomain: '', valid: false },
  ];

  let test2Passed = 0;
  for (const { subdomain, valid } of validationCases) {
    const result = isValidSubdomain(subdomain);
    const status = result === valid ? '✅' : '❌';
    if (result === valid) test2Passed++;
    console.log(`${status} "${subdomain}" → ${result} (expected: ${valid})`);
  }

  // Test 3: Full integration with DB
  console.log('\nTEST 3: getTenantBySubdomain() Integration');
  const integrationCases = ['simmerdown', 'free-hotel-test', 'nonexistent'];

  let test3Passed = 0;
  for (const subdomain of integrationCases) {
    const tenant = await getTenantBySubdomain(subdomain);
    const status = tenant ? '✅' : '⚠️';
    if (tenant || subdomain === 'nonexistent') test3Passed++;
    console.log(`${status} ${subdomain} → ${tenant ? tenant.nombre_comercial : 'null'}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY:');
  console.log(`TEST 1 (getSubdomain): ${test1Passed}/${testCases.length} passed`);
  console.log(`TEST 2 (isValidSubdomain): ${test2Passed}/${validationCases.length} passed`);
  console.log(`TEST 3 (getTenantBySubdomain): ${test3Passed}/${integrationCases.length} passed`);

  const allPassed = test1Passed === testCases.length &&
                    test2Passed === validationCases.length &&
                    test3Passed === integrationCases.length;

  if (allPassed) {
    console.log('\n✨ All tests passed! ✅');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the output above.');
  }
}

testSubdomainHelpers().catch((error) => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
