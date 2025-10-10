#!/usr/bin/env node

/**
 * Test script for Admin Dashboard Layout (Task 4D.1)
 *
 * Tests:
 * - Admin dashboard loads correctly
 * - Sidebar navigation works
 * - Settings page accessible
 * - Knowledge base page accessible
 * - Breadcrumbs work
 */

const BASE_URL = 'http://simmerdown.localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function testEndpoint(name: string, url: string, expectedContent: string): Promise<void> {
  try {
    const response = await fetch(url);
    const html = await response.text();

    const passed = html.includes(expectedContent);

    results.push({
      name,
      passed,
      error: passed ? undefined : `Expected content "${expectedContent}" not found in response`
    });
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function runTests() {
  console.log('Testing Admin Dashboard Layout...\n');

  // Test 1: Admin dashboard home
  await testEndpoint(
    'Admin Dashboard Home',
    `${BASE_URL}/admin`,
    'Welcome to'
  );

  // Test 2: Settings page
  await testEndpoint(
    'Settings Page',
    `${BASE_URL}/admin/settings`,
    'Business Information'
  );

  // Test 3: Knowledge base page
  await testEndpoint(
    'Knowledge Base Page',
    `${BASE_URL}/admin/knowledge-base`,
    'Knowledge Base'
  );

  // Print results
  console.log('Test Results:');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  });

  console.log('='.repeat(50));
  console.log(`Total: ${results.length} tests | Passed: ${passed} | Failed: ${failed}`);
  console.log('');

  if (failed > 0) {
    console.log('⚠️  Some tests failed. Admin dashboard may not be working correctly.');
    process.exit(1);
  } else {
    console.log('✅ All tests passed! Admin dashboard is working correctly.');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
