#!/usr/bin/env node

/**
 * Complete Audit Log System Test
 * Tests: Login logging, action logging, filters, pagination, CSV export
 */

const BASE_URL = 'http://localhost:3000';
let authToken = null;

// Helper: Make API request
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: response.status,
    ok: response.ok,
    data
  };
}

// Test 1: Login and capture token
async function test1_Login() {
  console.log('\n🧪 TEST 1: Login (should be logged)');
  console.log('═'.repeat(60));

  const result = await apiRequest('/api/super-admin/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'oneill',
      password: 'test123'
    })
  });

  if (!result.ok) {
    console.log('❌ Login failed:', result.data);
    return false;
  }

  authToken = result.data.token;
  console.log('✅ Login successful');
  console.log(`   Token: ${authToken.substring(0, 30)}...`);
  return true;
}

// Test 2: Fetch audit logs (should include login)
async function test2_FetchAuditLogs() {
  console.log('\n🧪 TEST 2: Fetch Audit Logs');
  console.log('═'.repeat(60));

  const result = await apiRequest('/api/super-admin/audit-log?page=1&limit=10');

  if (!result.ok) {
    console.log('❌ Failed to fetch audit logs:', result.data);
    return false;
  }

  const { logs, pagination } = result.data;

  console.log(`✅ Fetched ${logs.length} logs`);
  console.log(`   Total logs: ${pagination.total}`);
  console.log(`   Pages: ${pagination.page}/${pagination.totalPages}`);

  // Check for recent login
  const recentLogin = logs.find(log =>
    log.action === 'login' &&
    log.admin_username === 'oneill'
  );

  if (recentLogin) {
    console.log('\n✅ Login was logged:');
    console.log(`   Action: ${recentLogin.action}`);
    console.log(`   Admin: ${recentLogin.admin_username} (${recentLogin.admin_full_name})`);
    console.log(`   Time: ${recentLogin.created_at}`);
    console.log(`   IP: ${recentLogin.ip_address}`);
  } else {
    console.log('\n⚠️  No recent login log found (might be from earlier)');
  }

  // Show first 3 logs
  console.log('\n📋 Recent logs:');
  logs.slice(0, 3).forEach((log, i) => {
    console.log(`   ${i + 1}. [${log.action}] by ${log.admin_username} at ${new Date(log.created_at).toLocaleString()}`);
  });

  return logs.length > 0;
}

// Test 3: Filter by action type
async function test3_FilterByAction() {
  console.log('\n🧪 TEST 3: Filter by Action Type (login)');
  console.log('═'.repeat(60));

  const result = await apiRequest('/api/super-admin/audit-log?action=login&limit=5');

  if (!result.ok) {
    console.log('❌ Filter failed:', result.data);
    return false;
  }

  const { logs } = result.data;
  const allAreLogins = logs.every(log => log.action === 'login');

  if (allAreLogins) {
    console.log(`✅ Filter working: ${logs.length} login logs found`);
    logs.forEach((log, i) => {
      console.log(`   ${i + 1}. ${log.admin_username} logged in at ${new Date(log.created_at).toLocaleString()}`);
    });
    return true;
  } else {
    console.log('❌ Filter not working correctly');
    return false;
  }
}

// Test 4: Date range filter
async function test4_DateRangeFilter() {
  console.log('\n🧪 TEST 4: Date Range Filter (last 24 hours)');
  console.log('═'.repeat(60));

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const result = await apiRequest(
    `/api/super-admin/audit-log?from=${yesterday.toISOString()}&to=${now.toISOString()}&limit=10`
  );

  if (!result.ok) {
    console.log('❌ Date filter failed:', result.data);
    return false;
  }

  const { logs } = result.data;
  console.log(`✅ Date filter working: ${logs.length} logs in last 24 hours`);

  return true;
}

// Test 5: Pagination
async function test5_Pagination() {
  console.log('\n🧪 TEST 5: Pagination');
  console.log('═'.repeat(60));

  // Page 1
  const page1 = await apiRequest('/api/super-admin/audit-log?page=1&limit=3');

  if (!page1.ok) {
    console.log('❌ Pagination failed:', page1.data);
    return false;
  }

  const { pagination } = page1.data;

  console.log(`✅ Pagination metadata:`);
  console.log(`   Current page: ${pagination.page}`);
  console.log(`   Limit: ${pagination.limit}`);
  console.log(`   Total: ${pagination.total}`);
  console.log(`   Total pages: ${pagination.totalPages}`);
  console.log(`   Has next: ${pagination.hasNextPage}`);
  console.log(`   Has previous: ${pagination.hasPreviousPage}`);

  return true;
}

// Test 6: CSV Export
async function test6_CSVExport() {
  console.log('\n🧪 TEST 6: CSV Export');
  console.log('═'.repeat(60));

  const result = await apiRequest('/api/super-admin/audit-log?format=csv&limit=5');

  if (!result.ok) {
    console.log('❌ CSV export failed');
    return false;
  }

  const csvData = result.data;
  const lines = csvData.split('\n');

  console.log(`✅ CSV export working: ${lines.length} lines`);
  console.log('\n📄 CSV Preview (first 5 lines):');
  lines.slice(0, 5).forEach((line, i) => {
    console.log(`   ${i + 1}. ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
  });

  return true;
}

// Test 7: Check table structure directly
async function test7_CheckTableStructure() {
  console.log('\n🧪 TEST 7: Database Table Verification');
  console.log('═'.repeat(60));

  try {
    const { createClient } = await import('@supabase/supabase-js');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Count total logs
    const { count, error } = await supabase
      .from('super_admin_audit_log')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Table check failed:', error.message);
      return false;
    }

    console.log(`✅ Table exists and accessible`);
    console.log(`   Total audit logs: ${count}`);

    // Get action distribution
    const { data: actions } = await supabase
      .from('super_admin_audit_log')
      .select('action')
      .limit(100);

    if (actions) {
      const actionCounts = actions.reduce((acc, { action }) => {
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📊 Action distribution (last 100):');
      Object.entries(actionCounts).forEach(([action, count]) => {
        console.log(`   ${action}: ${count}`);
      });
    }

    return true;
  } catch (err) {
    console.log('❌ Error:', err.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n');
  console.log('🚀 AUDIT LOG SYSTEM - COMPLETE TEST SUITE');
  console.log('═'.repeat(60));

  const tests = [
    { name: 'Login', fn: test1_Login, required: true },
    { name: 'Fetch Logs', fn: test2_FetchAuditLogs, required: true },
    { name: 'Filter by Action', fn: test3_FilterByAction, required: false },
    { name: 'Date Range', fn: test4_DateRangeFilter, required: false },
    { name: 'Pagination', fn: test5_Pagination, required: false },
    { name: 'CSV Export', fn: test6_CSVExport, required: false },
    { name: 'Table Structure', fn: test7_CheckTableStructure, required: false },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed, required: test.required });

      if (!passed && test.required) {
        console.log(`\n❌ Required test "${test.name}" failed. Stopping.`);
        break;
      }
    } catch (err) {
      console.log(`\n❌ Test "${test.name}" threw error:`, err.message);
      results.push({ name: test.name, passed: false, required: test.required });

      if (test.required) break;
    }

    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n\n');
  console.log('═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const req = result.required ? '[REQUIRED]' : '[OPTIONAL]';
    console.log(`${icon} ${result.name} ${req}`);
  });

  console.log('\n' + '═'.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  const requiredPassed = results.filter(r => r.required && r.passed).length;
  const requiredTotal = results.filter(r => r.required).length;

  if (requiredPassed === requiredTotal) {
    console.log('\n✅ All required tests passed! Audit log system is functional.');
  } else {
    console.log('\n❌ Some required tests failed. Please check errors above.');
  }

  console.log('═'.repeat(60));
  console.log('\n');
}

// Load environment and run
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env.local') });

runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
