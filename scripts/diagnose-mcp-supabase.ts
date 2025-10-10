/**
 * MCP Supabase Diagnostic Tool
 *
 * Tests MCP Supabase connection and common operations to diagnose issues.
 * Run with: set -a && source .env.local && set +a && npx tsx scripts/diagnose-mcp-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'ooaumjzaztmutltifhoq';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface DiagnosticResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: DiagnosticResult[] = [];

function logResult(result: DiagnosticResult) {
  results.push(result);
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`\n${icon} ${result.test}`);
  console.log(`   ${result.message}`);
  if (result.details) {
    console.log(`   Details:`, result.details);
  }
}

async function testEnvironmentVariables() {
  console.log('\n🔍 Testing Environment Variables\n' + '━'.repeat(60));

  if (PROJECT_ID) {
    logResult({
      test: 'SUPABASE_PROJECT_ID',
      status: 'PASS',
      message: `Found: ${PROJECT_ID}`,
    });
  } else {
    logResult({
      test: 'SUPABASE_PROJECT_ID',
      status: 'FAIL',
      message: 'Not found in .env.local',
    });
  }

  if (ACCESS_TOKEN) {
    logResult({
      test: 'SUPABASE_ACCESS_TOKEN',
      status: 'PASS',
      message: `Found: ${ACCESS_TOKEN.substring(0, 15)}...`,
    });
  } else {
    logResult({
      test: 'SUPABASE_ACCESS_TOKEN',
      status: 'FAIL',
      message: 'Not found in .env.local (required for MCP tools)',
    });
  }

  if (SUPABASE_URL) {
    logResult({
      test: 'NEXT_PUBLIC_SUPABASE_URL',
      status: 'PASS',
      message: `Found: ${SUPABASE_URL}`,
    });
  } else {
    logResult({
      test: 'NEXT_PUBLIC_SUPABASE_URL',
      status: 'FAIL',
      message: 'Not found in .env.local',
    });
  }

  if (SERVICE_ROLE_KEY) {
    logResult({
      test: 'SUPABASE_SERVICE_ROLE_KEY',
      status: 'PASS',
      message: `Found: ${SERVICE_ROLE_KEY.substring(0, 15)}...`,
    });
  } else {
    logResult({
      test: 'SUPABASE_SERVICE_ROLE_KEY',
      status: 'FAIL',
      message: 'Not found in .env.local',
    });
  }
}

async function testSupabaseConnection() {
  console.log('\n🔍 Testing Supabase JS Client Connection\n' + '━'.repeat(60));

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    logResult({
      test: 'Supabase Connection',
      status: 'FAIL',
      message: 'Missing SUPABASE_URL or SERVICE_ROLE_KEY',
    });
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Test basic query to tenant_registry
    const { data, error } = await supabase
      .from('tenant_registry')
      .select('tenant_id, subdomain')
      .limit(1);

    if (error) {
      logResult({
        test: 'Supabase Query (tenant_registry)',
        status: 'FAIL',
        message: error.message,
        details: error,
      });
    } else {
      logResult({
        test: 'Supabase Query (tenant_registry)',
        status: 'PASS',
        message: `Successfully queried tenant_registry (found ${data?.length || 0} records)`,
      });
    }
  } catch (err: any) {
    logResult({
      test: 'Supabase Connection',
      status: 'FAIL',
      message: err.message,
      details: err,
    });
  }
}

async function simulateMCPListTables() {
  console.log('\n🔍 Simulating MCP list_tables Behavior\n' + '━'.repeat(60));

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    logResult({
      test: 'MCP list_tables Simulation',
      status: 'FAIL',
      message: 'Missing credentials',
    });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Test 1: Query without schema filter (simulates MCP default behavior)
  console.log('\n   Test 1: Listing ALL schemas (MCP default - should show why it fails)');
  try {
    const { data: allSchemas, error: schemasError } = await supabase
      .from('information_schema.schemata')
      .select('schema_name')
      .not('schema_name', 'in', '(pg_toast,pg_temp_1,pg_toast_temp_1)');

    if (schemasError) {
      logResult({
        test: 'MCP list_tables (no schema filter)',
        status: 'FAIL',
        message: `Permission denied: ${schemasError.message}`,
        details: {
          reason: 'Without explicit schemas parameter, MCP tries to read system schemas',
          solution: 'Always use schemas: ["public"] parameter',
        },
      });
    } else {
      logResult({
        test: 'MCP list_tables (no schema filter)',
        status: 'WARN',
        message: `Found ${allSchemas?.length || 0} schemas (may include restricted ones)`,
        details: allSchemas?.map((s: any) => s.schema_name).slice(0, 10),
      });
    }
  } catch (err: any) {
    logResult({
      test: 'MCP list_tables (no schema filter)',
      status: 'FAIL',
      message: err.message,
    });
  }

  // Test 2: Query with explicit 'public' schema (correct MCP usage)
  console.log('\n   Test 2: Listing only PUBLIC schema (correct MCP usage)');
  try {
    const { data: publicTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      logResult({
        test: 'MCP list_tables (schemas: ["public"])',
        status: 'FAIL',
        message: tablesError.message,
      });
    } else {
      logResult({
        test: 'MCP list_tables (schemas: ["public"])',
        status: 'PASS',
        message: `Successfully listed ${publicTables?.length || 0} tables in public schema`,
        details: publicTables?.map((t: any) => t.table_name).slice(0, 10),
      });
    }
  } catch (err: any) {
    logResult({
      test: 'MCP list_tables (schemas: ["public"])',
      status: 'FAIL',
      message: err.message,
    });
  }
}

async function testMCPAccessToken() {
  console.log('\n🔍 Testing MCP Access Token Permissions\n' + '━'.repeat(60));

  if (!ACCESS_TOKEN) {
    logResult({
      test: 'MCP Access Token',
      status: 'FAIL',
      message: 'SUPABASE_ACCESS_TOKEN not found',
    });
    return;
  }

  try {
    // Test Management API access (required for MCP tools)
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_ID}`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );

    if (response.ok) {
      const project = await response.json();
      logResult({
        test: 'MCP Management API Access',
        status: 'PASS',
        message: `Successfully accessed project: ${project.name || PROJECT_ID}`,
        details: {
          region: project.region,
          status: project.status,
        },
      });
    } else {
      const error = await response.text();
      logResult({
        test: 'MCP Management API Access',
        status: 'FAIL',
        message: `HTTP ${response.status}: ${error}`,
        details: {
          hint: 'Check if SUPABASE_ACCESS_TOKEN has correct permissions',
          docs: 'https://supabase.com/docs/guides/api#generating-api-keys',
        },
      });
    }
  } catch (err: any) {
    logResult({
      test: 'MCP Management API Access',
      status: 'FAIL',
      message: err.message,
    });
  }
}

async function printSummary() {
  console.log('\n\n📊 Diagnostic Summary\n' + '='.repeat(60));

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warned = results.filter((r) => r.status === 'WARN').length;

  console.log(`\n  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⚠️  Warnings: ${warned}`);
  console.log(`  📋 Total Tests: ${results.length}`);

  if (failed === 0 && warned === 0) {
    console.log('\n🎉 All tests passed! MCP Supabase should work correctly.');
  } else if (failed > 0) {
    console.log('\n❌ Some tests failed. Review the errors above and check:');
    console.log('   1. .env.local has all required variables');
    console.log('   2. SUPABASE_ACCESS_TOKEN has correct permissions');
    console.log('   3. Always use schemas: ["public"] with mcp__supabase__list_tables');
    console.log('\n📚 Reference: docs/troubleshooting/MCP_SUPABASE_LIST_TABLES_WORKAROUND.md');
  } else {
    console.log('\n⚠️  Tests passed with warnings. Review warnings above.');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

async function main() {
  console.log('🚀 MCP Supabase Diagnostic Tool');
  console.log('='.repeat(60));

  await testEnvironmentVariables();
  await testSupabaseConnection();
  await simulateMCPListTables();
  await testMCPAccessToken();
  await printSummary();
}

main();
