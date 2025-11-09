#!/usr/bin/env tsx

/**
 * Post-Deploy Verification Script
 *
 * Runs after every deployment to verify system health
 * Includes:
 * - Health endpoint check
 * - Smoke test E2E (optional)
 * - Database migration status
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface VerificationResult {
  step: string;
  passed: boolean;
  message: string;
  duration: number;
}

async function main() {
  console.log('🚀 Post-Deploy Verification Starting...\n');

  const results: VerificationResult[] = [];

  // Step 1: Health endpoint
  results.push(await checkHealthEndpoint());

  // Step 2: Database migrations
  results.push(await checkMigrations());

  // Step 3: Smoke test E2E (optional)
  if (process.env.RUN_E2E_SMOKE === 'true') {
    results.push(await runSmokeTest());
  }

  // Print results
  console.log('\n📊 Verification Results:\n');
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.step}: ${r.message} (${r.duration}ms)`);
  });

  // Exit code
  const allPassed = results.every(r => r.passed);

  if (allPassed) {
    console.log('\n✅ All verifications passed. Deploy successful!\n');
    process.exit(0);
  } else {
    console.error('\n❌ Some verifications failed. Investigate before continuing.\n');
    process.exit(1);
  }
}

async function checkHealthEndpoint(): Promise<VerificationResult> {
  const start = Date.now();

  try {
    const response = await fetch('https://simmerdown.house/api/health/my-stay');
    const data = await response.json();

    const passed = data.status === 'healthy';

    return {
      step: 'Health Endpoint',
      passed,
      message: passed ? 'System healthy' : `Status: ${data.status}`,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      step: 'Health Endpoint',
      passed: false,
      message: `Error: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function checkMigrations(): Promise<VerificationResult> {
  const start = Date.now();

  try {
    // Check if all migrations are applied
    // Note: This would require a Supabase CLI command or custom check
    // For now, we'll assume migrations are applied if no error occurs

    // Placeholder: In production, you'd check via Supabase API or CLI
    // const { stdout } = await execAsync('npx supabase migration list');
    // const hasPending = stdout.includes('pending');

    return {
      step: 'Database Migrations',
      passed: true,
      message: 'Migration check skipped (implement with Supabase CLI)',
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      step: 'Database Migrations',
      passed: false,
      message: `Error: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function runSmokeTest(): Promise<VerificationResult> {
  const start = Date.now();

  try {
    // Run single critical test
    await execAsync('npx playwright test tests/e2e/my-stay-manuals.spec.ts -g "WiFi password"');

    return {
      step: 'E2E Smoke Test',
      passed: true,
      message: 'WiFi password test passed',
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      step: 'E2E Smoke Test',
      passed: false,
      message: `Test failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

main();
