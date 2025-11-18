#!/usr/bin/env tsx
/**
 * Monitoring Dashboard - Multi-Environment Status
 *
 * FASE 8: Monitoring & Alerting
 *
 * Purpose:
 * - Display comprehensive status of all environments (dev, staging, production)
 * - Check health endpoints for each environment
 * - Show database metrics and connectivity
 * - Display recent deployment status
 * - Track performance metrics
 * - Provide quick overview of system health
 *
 * Usage:
 *   pnpm dlx tsx scripts/monitoring-dashboard.ts
 *   pnpm dlx tsx scripts/monitoring-dashboard.ts --env=production
 *   pnpm dlx tsx scripts/monitoring-dashboard.ts --json
 *
 * Options:
 *   --env=<name>    Show only specific environment (dev|staging|production)
 *   --json          Output raw JSON instead of formatted dashboard
 *   --refresh       Auto-refresh every N seconds (--refresh=30)
 *
 * Environment Variables:
 *   DEV_SUPABASE_PROJECT_ID       - Dev Supabase project (default: iyeueszchbvlutlcmvcb)
 *   STAGING_SUPABASE_PROJECT_ID   - Staging Supabase project (default: bddcvjoeoiekzfetvxoe - NEW TST)
 *   PROD_SUPABASE_PROJECT_ID      - Production Supabase project (default: kprqghwdnaykxhostivv)
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface EnvironmentConfig {
  name: string;
  displayName: string;
  url: string;
  projectId: string;
  vpsPath?: string;
}

const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  dev: {
    name: 'dev',
    displayName: 'Development',
    url: process.env.DEV_URL || 'http://localhost:3000',
    projectId: process.env.DEV_SUPABASE_PROJECT_ID || 'iyeueszchbvlutlcmvcb',
  },
  staging: {
    name: 'staging',
    displayName: 'Staging',
    url: process.env.STAGING_URL || 'https://simmerdown.staging.muva.chat',
    projectId: process.env.STAGING_SUPABASE_PROJECT_ID || 'bddcvjoeoiekzfetvxoe', // NEW TST environment
    vpsPath: '/var/www/muva-chat-staging',
  },
  production: {
    name: 'production',
    displayName: 'Production',
    url: process.env.PROD_URL || 'https://simmerdown.muva.chat',
    projectId: process.env.PROD_SUPABASE_PROJECT_ID || 'kprqghwdnaykxhostivv',
    vpsPath: '/var/www/muva-chat',
  },
};

// ============================================================================
// TYPES
// ============================================================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'error' | 'unknown';
  timestamp: string;
  responseTime: number;
  services?: {
    openai?: { status: string };
    anthropic?: { status: string };
    supabase?: {
      status: string;
      responseTime: string;
      error: string | null;
    };
  };
  environment?: {
    runtime?: string;
    region?: string;
    deployment?: string;
  };
  error?: string;
}

interface DatabaseMetrics {
  status: 'healthy' | 'error' | 'unknown';
  latency: number;
  error?: string;
}

interface RPCFunctionsMetrics {
  status: 'healthy' | 'degraded' | 'error' | 'unknown';
  latency: number;
  criticalCount?: number;
  invalidCount?: number;
  error?: string;
  details?: Array<{
    function: string;
    status: string;
    critical: boolean;
  }>;
}

interface DeploymentInfo {
  lastDeployment?: string;
  commitSha?: string;
  branch?: string;
  deployer?: string;
}

interface EnvironmentStatus {
  environment: string;
  displayName: string;
  health: HealthStatus;
  database: DatabaseMetrics;
  rpcFunctions: RPCFunctionsMetrics;
  deployment: DeploymentInfo;
  overall: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
}

// ============================================================================
// HEALTH CHECK FUNCTIONS
// ============================================================================

async function checkHealth(config: EnvironmentConfig): Promise<HealthStatus> {
  const startTime = Date.now();

  try {
    const curlCommand = `curl -s -m 5 "${config.url}/api/health"`;
    const response = execSync(curlCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const responseTime = Date.now() - startTime;

    const data = JSON.parse(response);

    return {
      ...data,
      responseTime,
    };
  } catch (error: any) {
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: error.message || 'Connection failed',
    };
  }
}

async function checkDatabase(config: EnvironmentConfig): Promise<DatabaseMetrics> {
  const startTime = Date.now();

  try {
    // Try to check database via health endpoint
    const curlCommand = `curl -s -m 3 "${config.url}/api/health/db" || echo '{"error":"not_available"}'`;
    const response = execSync(curlCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const latency = Date.now() - startTime;

    const data = JSON.parse(response);

    if (data.error) {
      return {
        status: 'unknown',
        latency,
        error: data.error,
      };
    }

    return {
      status: data.status === 'ok' ? 'healthy' : 'error',
      latency,
      error: data.error,
    };
  } catch (error: any) {
    return {
      status: 'error',
      latency: Date.now() - startTime,
      error: error.message || 'Connection failed',
    };
  }
}

async function checkRPCFunctions(config: EnvironmentConfig): Promise<RPCFunctionsMetrics> {
  const startTime = Date.now();

  try {
    // Check RPC functions via database health endpoint
    const curlCommand = `curl -s -m 5 "${config.url}/api/health/database" || echo '{"error":"not_available"}'`;
    const response = execSync(curlCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const latency = Date.now() - startTime;

    const data = JSON.parse(response);

    if (data.error) {
      return {
        status: 'unknown',
        latency,
        error: data.error,
      };
    }

    // Parse checks to get function status
    const checks = data.checks || [];
    const funcChecks = checks.filter((c: any) => c.name.startsWith('rpc_search_path_'));

    const criticalInvalid = funcChecks.filter(
      (c: any) => c.status !== 'healthy' && c.metadata?.critical === true
    ).length;

    const totalInvalid = funcChecks.filter((c: any) => c.status !== 'healthy').length;

    // Extract function details for display
    const details = funcChecks.map((c: any) => ({
      function: c.metadata?.function || c.name.replace('rpc_search_path_', ''),
      status: c.status,
      critical: c.metadata?.critical || false,
    }));

    // Determine overall RPC status
    let status: 'healthy' | 'degraded' | 'error' | 'unknown' = 'healthy';
    if (criticalInvalid > 0) {
      status = 'error';
    } else if (totalInvalid > 0) {
      status = 'degraded';
    } else if (data.status !== 'healthy') {
      status = 'degraded';
    }

    return {
      status,
      latency,
      criticalCount: criticalInvalid,
      invalidCount: totalInvalid,
      details,
    };
  } catch (error: any) {
    return {
      status: 'unknown',
      latency: Date.now() - startTime,
      error: error.message || 'Connection failed',
    };
  }
}

function getDeploymentInfo(config: EnvironmentConfig): DeploymentInfo {
  try {
    // Try to read git info from local .git directory
    const gitDir = resolve(process.cwd(), '.git');

    if (!existsSync(gitDir)) {
      return {};
    }

    // Get current branch
    const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

    // Get last commit
    const commitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

    // Get last commit author
    const deployer = execSync('git log -1 --format="%an"', { encoding: 'utf-8' }).trim();

    // Get last commit date
    const lastDeployment = execSync('git log -1 --format="%ai"', { encoding: 'utf-8' }).trim();

    return {
      lastDeployment,
      commitSha,
      branch,
      deployer,
    };
  } catch (error) {
    return {};
  }
}

// ============================================================================
// STATUS AGGREGATION
// ============================================================================

async function getEnvironmentStatus(config: EnvironmentConfig): Promise<EnvironmentStatus> {
  console.log(`📊 Checking ${config.displayName}...`);

  const [health, database, rpcFunctions, deployment] = await Promise.all([
    checkHealth(config),
    checkDatabase(config),
    checkRPCFunctions(config),
    Promise.resolve(getDeploymentInfo(config)),
  ]);

  // Determine overall status
  let overall: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN' = 'UNKNOWN';

  if (health.status === 'healthy' && database.status === 'healthy' && rpcFunctions.status === 'healthy') {
    overall = 'UP';
  } else if (health.status === 'degraded' || database.status !== 'healthy' || rpcFunctions.status === 'degraded') {
    overall = 'DEGRADED';
  } else if (health.status === 'error' || rpcFunctions.status === 'error') {
    overall = 'DOWN';
  }

  return {
    environment: config.name,
    displayName: config.displayName,
    health,
    database,
    rpcFunctions,
    deployment,
    overall,
  };
}

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

function getStatusEmoji(status: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN'): string {
  switch (status) {
    case 'UP':
      return '🟢';
    case 'DEGRADED':
      return '🟡';
    case 'DOWN':
      return '🔴';
    default:
      return '⚪';
  }
}

function formatResponseTime(ms: number): string {
  if (ms < 100) return `${ms}ms`;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

function displayDashboard(statuses: EnvironmentStatus[]) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                    🖥️  MUVA MONITORING DASHBOARD');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`📅 Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })} COT`);
  console.log('');

  // Overall Summary
  const upCount = statuses.filter((s) => s.overall === 'UP').length;
  const degradedCount = statuses.filter((s) => s.overall === 'DEGRADED').length;
  const downCount = statuses.filter((s) => s.overall === 'DOWN').length;

  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ 📊 OVERALL STATUS                                               │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│   🟢 UP: ${upCount}   🟡 DEGRADED: ${degradedCount}   🔴 DOWN: ${downCount}                                  │`);
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');

  // Environment Details
  statuses.forEach((status) => {
    const emoji = getStatusEmoji(status.overall);

    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log(`│ ${emoji} ${status.displayName.toUpperCase().padEnd(59)} │`);
    console.log('├─────────────────────────────────────────────────────────────────┤');

    // Health Status
    console.log(`│ 🏥 Health: ${status.health.status.padEnd(48)} │`);
    console.log(`│    Response Time: ${formatResponseTime(status.health.responseTime).padEnd(42)} │`);

    if (status.health.error) {
      console.log(`│    Error: ${status.health.error.substring(0, 48).padEnd(51)} │`);
    }

    if (status.health.environment) {
      console.log(`│    Region: ${(status.health.environment.region || 'N/A').padEnd(50)} │`);
      console.log(`│    Deployment: ${(status.health.environment.deployment || 'N/A').padEnd(44)} │`);
    }

    // Database Status
    console.log('│                                                                 │');
    console.log(`│ 💾 Database: ${status.database.status.padEnd(47)} │`);
    console.log(`│    Latency: ${formatResponseTime(status.database.latency).padEnd(49)} │`);

    if (status.database.error) {
      console.log(`│    Error: ${status.database.error.substring(0, 48).padEnd(51)} │`);
    }

    // RPC Functions Status
    console.log('│                                                                 │');
    const rpcEmoji = status.rpcFunctions.status === 'healthy' ? '✅' : status.rpcFunctions.status === 'degraded' ? '⚠️' : '🔴';
    console.log(`│ ${rpcEmoji} RPC Functions: ${status.rpcFunctions.status.padEnd(43)} │`);
    console.log(`│    Latency: ${formatResponseTime(status.rpcFunctions.latency).padEnd(49)} │`);

    if (status.rpcFunctions.criticalCount !== undefined && status.rpcFunctions.criticalCount > 0) {
      console.log(`│    🔴 Critical invalid: ${status.rpcFunctions.criticalCount.toString().padEnd(37)} │`);
    }

    if (status.rpcFunctions.invalidCount !== undefined && status.rpcFunctions.invalidCount > 0) {
      console.log(`│    ⚠️  Total invalid: ${status.rpcFunctions.invalidCount.toString().padEnd(39)} │`);
    }

    if (status.rpcFunctions.error) {
      console.log(`│    Error: ${status.rpcFunctions.error.substring(0, 48).padEnd(51)} │`);
    }

    if (status.rpcFunctions.details && status.rpcFunctions.details.length > 0) {
      const invalidFuncs = status.rpcFunctions.details.filter(d => d.status !== 'healthy');
      if (invalidFuncs.length > 0) {
        console.log(`│    Invalid functions:${''.padEnd(42)} │`);
        invalidFuncs.forEach(func => {
          const criticalBadge = func.critical ? '🔴' : '⚠️';
          const funcName = func.function.substring(0, 30);
          console.log(`│      ${criticalBadge} ${funcName.padEnd(52)} │`);
        });
      }
    }

    // Deployment Info
    if (status.deployment.lastDeployment) {
      console.log('│                                                                 │');
      console.log(`│ 🚀 Last Deployment: ${formatTimestamp(status.deployment.lastDeployment).padEnd(40)} │`);
      console.log(`│    Commit: ${(status.deployment.commitSha || 'N/A').padEnd(50)} │`);
      console.log(`│    Branch: ${(status.deployment.branch || 'N/A').padEnd(50)} │`);
    }

    console.log('└─────────────────────────────────────────────────────────────────┘');
    console.log('');
  });

  // Footer
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('💡 TIP: Run with --refresh=30 for auto-refresh every 30 seconds');
  console.log('');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const envArg = args.find((arg) => arg.startsWith('--env='))?.split('=')[1];
  const jsonOutput = args.includes('--json');
  const refreshArg = args.find((arg) => arg.startsWith('--refresh'));
  const refreshInterval = refreshArg ? parseInt(refreshArg.split('=')[1] || '30') : 0;

  // Determine which environments to check
  let envsToCheck = Object.values(ENVIRONMENTS);

  if (envArg) {
    const selectedEnv = ENVIRONMENTS[envArg];
    if (!selectedEnv) {
      console.error(`❌ Error: Invalid environment '${envArg}'`);
      console.error(`   Valid options: ${Object.keys(ENVIRONMENTS).join(', ')}`);
      process.exit(1);
    }
    envsToCheck = [selectedEnv];
  }

  // Run checks
  const statuses = await Promise.all(envsToCheck.map(getEnvironmentStatus));

  // Display results
  if (jsonOutput) {
    console.log(JSON.stringify(statuses, null, 2));
  } else {
    displayDashboard(statuses);
  }

  // Check if any environment is down
  const hasDown = statuses.some((s) => s.overall === 'DOWN');
  const hasDegraded = statuses.some((s) => s.overall === 'DEGRADED');

  if (hasDown) {
    console.log('🚨 WARNING: One or more environments are DOWN');
    if (!refreshInterval) {
      process.exit(1);
    }
  } else if (hasDegraded) {
    console.log('⚠️  WARNING: One or more environments are DEGRADED');
  }

  // Auto-refresh if requested
  if (refreshInterval > 0) {
    console.log(`\n🔄 Refreshing in ${refreshInterval} seconds... (Press Ctrl+C to stop)\n`);
    setTimeout(() => main(), refreshInterval * 1000);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Monitoring stopped by user');
  process.exit(0);
});

// Run
main().catch((error) => {
  console.error('❌ Fatal error in monitoring dashboard:', error);
  process.exit(1);
});
