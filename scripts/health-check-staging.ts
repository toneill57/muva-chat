#!/usr/bin/env tsx
/**
 * Health Check for Staging Environment
 *
 * FASE 3: Enhanced Staging Workflow
 *
 * Purpose:
 * - Verify staging application is running correctly
 * - Test database connection
 * - Test critical API endpoints
 * - Exit with code 0 on success, 1 on failure
 *
 * Usage:
 *   pnpm dlx tsx scripts/health-check-staging.ts
 *
 * Environment Variables (optional):
 *   STAGING_URL - Staging application URL (default: http://localhost:3001)
 *   SUPABASE_STAGING_PROJECT_ID - Staging project ref (vwrlqvcmzucquxkngqvx)
 *   SUPABASE_SERVICE_ROLE_KEY - Staging service role key
 */

import { createClient } from '@supabase/supabase-js';

// Environment configuration
const STAGING_APP_URL = process.env.STAGING_URL || 'http://localhost:3001';
const STAGING_PROJECT_ID = process.env.SUPABASE_STAGING_PROJECT_ID || 'vwrlqvcmzucquxkngqvx';
const STAGING_DB_URL = `https://${STAGING_PROJECT_ID}.supabase.co`;
const STAGING_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface HealthCheckResult {
  name: string;
  status: 'success' | 'failure' | 'warning';
  message: string;
  duration?: number;
}

async function checkDatabaseConnection(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  if (!STAGING_SERVICE_KEY) {
    return {
      name: 'Database Connection',
      status: 'warning',
      message: 'SUPABASE_SERVICE_ROLE_KEY not set - skipping DB check',
      duration: Date.now() - startTime,
    };
  }

  try {
    const supabase = createClient(STAGING_DB_URL, STAGING_SERVICE_KEY);

    // Simple query to test connection
    const { data, error } = await supabase
      .from('hotels')
      .select('id')
      .limit(1);

    const duration = Date.now() - startTime;

    if (error) {
      return {
        name: 'Database Connection',
        status: 'failure',
        message: `Connection failed: ${error.message}`,
        duration,
      };
    }

    return {
      name: 'Database Connection',
      status: 'success',
      message: `Connected successfully (${duration}ms)`,
      duration,
    };
  } catch (error: any) {
    return {
      name: 'Database Connection',
      status: 'failure',
      message: `Error: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

async function checkApplicationEndpoint(url: string, name: string): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'health-check-staging/1.0',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const duration = Date.now() - startTime;

    if (response.ok) {
      return {
        name,
        status: 'success',
        message: `${response.status} OK (${duration}ms)`,
        duration,
      };
    } else {
      return {
        name,
        status: 'failure',
        message: `${response.status} ${response.statusText}`,
        duration,
      };
    }
  } catch (error: any) {
    return {
      name,
      status: 'failure',
      message: `Request failed: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🏥 Health Check - Staging Environment');
  console.log('================================================');
  console.log('');
  console.log(`🌐 Application URL: ${STAGING_APP_URL}`);
  console.log(`💾 Database URL: ${STAGING_DB_URL}`);
  console.log('');

  const results: HealthCheckResult[] = [];

  // Check 1: Database Connection
  console.log('🔍 Checking database connection...');
  const dbCheck = await checkDatabaseConnection();
  results.push(dbCheck);
  console.log(`   ${dbCheck.status === 'success' ? '✅' : dbCheck.status === 'warning' ? '⚠️ ' : '❌'} ${dbCheck.message}`);
  console.log('');

  // Check 2: Application Root
  console.log('🔍 Checking application root endpoint...');
  const rootCheck = await checkApplicationEndpoint(STAGING_APP_URL, 'Application Root');
  results.push(rootCheck);
  console.log(`   ${rootCheck.status === 'success' ? '✅' : '❌'} ${rootCheck.message}`);
  console.log('');

  // Check 3: Health API (if exists)
  console.log('🔍 Checking health API endpoint...');
  const healthCheck = await checkApplicationEndpoint(`${STAGING_APP_URL}/api/health`, 'Health API');
  results.push(healthCheck);
  console.log(`   ${healthCheck.status === 'success' ? '✅' : '❌'} ${healthCheck.message}`);
  console.log('');

  // Summary
  console.log('================================================');
  console.log('📊 Health Check Summary');
  console.log('================================================');
  console.log('');

  const successful = results.filter(r => r.status === 'success').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const failed = results.filter(r => r.status === 'failure').length;

  console.log(`✅ Successful: ${successful}`);
  if (warnings > 0) {
    console.log(`⚠️  Warnings: ${warnings}`);
  }
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
  }
  console.log('');

  // Exit codes
  if (failed > 0) {
    console.log('❌ Health check failed - some critical checks did not pass');
    console.log('');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  Health check passed with warnings');
    console.log('');
    process.exit(0);
  } else {
    console.log('✅ All health checks passed successfully');
    console.log('');
    process.exit(0);
  }
}

// Run main function
main();
