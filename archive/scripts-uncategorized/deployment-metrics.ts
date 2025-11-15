#!/usr/bin/env tsx
/**
 * Deployment Metrics Tracker
 *
 * FASE 8: Monitoring & Alerting
 *
 * Purpose:
 * - Track deployment success rate across environments
 * - Measure average deployment time
 * - Monitor rollback frequency
 * - Generate historical reports and trends
 * - Store metrics in JSON for analysis
 *
 * Usage:
 *   pnpm dlx tsx scripts/deployment-metrics.ts
 *   pnpm dlx tsx scripts/deployment-metrics.ts --record --env=staging --status=success --duration=120
 *   pnpm dlx tsx scripts/deployment-metrics.ts --report
 *   pnpm dlx tsx scripts/deployment-metrics.ts --report --env=production
 *   pnpm dlx tsx scripts/deployment-metrics.ts --chart
 *
 * Options:
 *   --record                Record a new deployment
 *     --env=<name>          Environment (dev|staging|production)
 *     --status=<status>     Deployment status (success|failure|rollback)
 *     --duration=<seconds>  Deployment duration in seconds
 *     --commit=<sha>        Git commit SHA
 *     --branch=<name>       Git branch name
 *
 *   --report                Generate deployment report
 *     --env=<name>          Filter by environment (optional)
 *     --days=<n>            Report for last N days (default: 30)
 *
 *   --chart                 Generate ASCII chart of deployment trends
 *
 *   --export                Export metrics to JSON file
 *
 * Metrics Storage:
 *   .monitoring/deployment-metrics.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

// ============================================================================
// CONFIGURATION
// ============================================================================

const METRICS_DIR = resolve(process.cwd(), '.monitoring');
const METRICS_FILE = resolve(METRICS_DIR, 'deployment-metrics.json');

// ============================================================================
// TYPES
// ============================================================================

interface DeploymentRecord {
  id: string;
  timestamp: string;
  environment: 'dev' | 'staging' | 'production';
  status: 'success' | 'failure' | 'rollback';
  duration: number; // seconds
  commit?: string;
  branch?: string;
  triggeredBy?: string;
  errorMessage?: string;
}

interface DeploymentMetrics {
  records: DeploymentRecord[];
  lastUpdated: string;
}

interface EnvironmentStats {
  environment: string;
  totalDeployments: number;
  successful: number;
  failed: number;
  rolledBack: number;
  successRate: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  lastDeployment?: DeploymentRecord;
}

// ============================================================================
// METRICS STORAGE
// ============================================================================

function ensureMetricsDirectory() {
  if (!existsSync(METRICS_DIR)) {
    mkdirSync(METRICS_DIR, { recursive: true });
  }
}

function loadMetrics(): DeploymentMetrics {
  if (!existsSync(METRICS_FILE)) {
    return {
      records: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const content = readFileSync(METRICS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('⚠️  Failed to load metrics, starting fresh:', error);
    return {
      records: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

function saveMetrics(metrics: DeploymentMetrics) {
  ensureMetricsDirectory();

  metrics.lastUpdated = new Date().toISOString();

  try {
    writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ Failed to save metrics:', error);
    process.exit(1);
  }
}

// ============================================================================
// RECORD DEPLOYMENT
// ============================================================================

function recordDeployment(
  environment: 'dev' | 'staging' | 'production',
  status: 'success' | 'failure' | 'rollback',
  duration: number,
  commit?: string,
  branch?: string,
  errorMessage?: string
) {
  const metrics = loadMetrics();

  const record: DeploymentRecord = {
    id: `${environment}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    environment,
    status,
    duration,
    commit,
    branch,
    triggeredBy: process.env.USER || 'unknown',
    errorMessage,
  };

  metrics.records.push(record);

  // Keep only last 100 records per environment
  const envRecords = metrics.records.filter((r) => r.environment === environment);
  if (envRecords.length > 100) {
    const toRemove = envRecords.slice(0, envRecords.length - 100);
    metrics.records = metrics.records.filter((r) => !toRemove.includes(r));
  }

  saveMetrics(metrics);

  console.log('');
  console.log('✅ Deployment recorded successfully');
  console.log('');
  console.log(`📍 Environment: ${environment}`);
  console.log(`📊 Status: ${status}`);
  console.log(`⏱️  Duration: ${duration}s`);
  if (commit) console.log(`🔖 Commit: ${commit}`);
  if (branch) console.log(`🌿 Branch: ${branch}`);
  console.log('');
}

// ============================================================================
// CALCULATE STATS
// ============================================================================

function calculateStats(records: DeploymentRecord[], environment?: string): EnvironmentStats[] {
  const environments = environment
    ? [environment]
    : ['dev', 'staging', 'production'];

  return environments.map((env) => {
    const envRecords = records.filter((r) => r.environment === env);

    if (envRecords.length === 0) {
      return {
        environment: env,
        totalDeployments: 0,
        successful: 0,
        failed: 0,
        rolledBack: 0,
        successRate: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
      };
    }

    const successful = envRecords.filter((r) => r.status === 'success').length;
    const failed = envRecords.filter((r) => r.status === 'failure').length;
    const rolledBack = envRecords.filter((r) => r.status === 'rollback').length;

    const durations = envRecords.map((r) => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    const successRate = (successful / envRecords.length) * 100;

    const lastDeployment = envRecords.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

    return {
      environment: env,
      totalDeployments: envRecords.length,
      successful,
      failed,
      rolledBack,
      successRate,
      avgDuration,
      minDuration,
      maxDuration,
      lastDeployment,
    };
  });
}

// ============================================================================
// GENERATE REPORT
// ============================================================================

function generateReport(environment?: string, days: number = 30) {
  const metrics = loadMetrics();

  // Filter by date range
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const filteredRecords = metrics.records.filter((r) =>
    new Date(r.timestamp) >= cutoffDate
  );

  if (filteredRecords.length === 0) {
    console.log('');
    console.log('ℹ️  No deployment records found for the specified period');
    console.log('');
    return;
  }

  const stats = calculateStats(filteredRecords, environment);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                    📊 DEPLOYMENT METRICS REPORT');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`📅 Report Period: Last ${days} days`);
  console.log(`📦 Total Records: ${filteredRecords.length}`);
  console.log('');

  stats.forEach((stat) => {
    if (stat.totalDeployments === 0) return;

    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log(`│ 📍 ${stat.environment.toUpperCase().padEnd(59)} │`);
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log(`│ 📊 Total Deployments: ${stat.totalDeployments.toString().padEnd(43)} │`);
    console.log(`│ ✅ Successful: ${stat.successful.toString().padEnd(49)} │`);
    console.log(`│ ❌ Failed: ${stat.failed.toString().padEnd(53)} │`);
    console.log(`│ 🔄 Rolled Back: ${stat.rolledBack.toString().padEnd(47)} │`);
    console.log(`│ 📈 Success Rate: ${stat.successRate.toFixed(1)}%`.padEnd(66) + '│');
    console.log('│                                                                 │');
    console.log(`│ ⏱️  Avg Duration: ${stat.avgDuration.toFixed(1)}s`.padEnd(66) + '│');
    console.log(`│ ⚡ Min Duration: ${stat.minDuration.toFixed(1)}s`.padEnd(66) + '│');
    console.log(`│ 🐌 Max Duration: ${stat.maxDuration.toFixed(1)}s`.padEnd(66) + '│');

    if (stat.lastDeployment) {
      console.log('│                                                                 │');
      console.log(`│ 🕐 Last Deployment:`.padEnd(66) + '│');
      console.log(`│    ${new Date(stat.lastDeployment.timestamp).toLocaleString().padEnd(60)} │`);
      console.log(`│    Status: ${stat.lastDeployment.status.padEnd(52)} │`);
      if (stat.lastDeployment.commit) {
        console.log(`│    Commit: ${stat.lastDeployment.commit.substring(0, 50).padEnd(52)} │`);
      }
    }

    console.log('└─────────────────────────────────────────────────────────────────┘');
    console.log('');
  });

  // Overall summary
  const totalDeployments = stats.reduce((sum, s) => sum + s.totalDeployments, 0);
  const totalSuccessful = stats.reduce((sum, s) => sum + s.successful, 0);
  const overallSuccessRate = (totalSuccessful / totalDeployments) * 100;

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 OVERALL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`📦 Total Deployments: ${totalDeployments}`);
  console.log(`✅ Total Successful: ${totalSuccessful}`);
  console.log(`📈 Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
  console.log('');

  // Health assessment
  if (overallSuccessRate >= 95) {
    console.log('🎉 Excellent deployment health!');
  } else if (overallSuccessRate >= 80) {
    console.log('✅ Good deployment health');
  } else if (overallSuccessRate >= 60) {
    console.log('⚠️  Deployment health needs improvement');
  } else {
    console.log('🚨 Critical: Deployment health is poor');
  }
  console.log('');
}

// ============================================================================
// ASCII CHART
// ============================================================================

function generateChart(days: number = 30) {
  const metrics = loadMetrics();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const filteredRecords = metrics.records.filter((r) =>
    new Date(r.timestamp) >= cutoffDate
  );

  if (filteredRecords.length === 0) {
    console.log('ℹ️  No data available for chart');
    return;
  }

  // Group by day
  const dailyStats = new Map<string, { success: number; failure: number; rollback: number }>();

  filteredRecords.forEach((record) => {
    const day = new Date(record.timestamp).toISOString().split('T')[0];
    const stats = dailyStats.get(day) || { success: 0, failure: 0, rollback: 0 };

    if (record.status === 'success') stats.success++;
    else if (record.status === 'failure') stats.failure++;
    else if (record.status === 'rollback') stats.rollback++;

    dailyStats.set(day, stats);
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                    📈 DEPLOYMENT TREND (Last 30 Days)');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  const sortedDays = Array.from(dailyStats.keys()).sort();
  const maxDeployments = Math.max(...Array.from(dailyStats.values()).map(s => s.success + s.failure + s.rollback));

  sortedDays.forEach((day) => {
    const stats = dailyStats.get(day)!;
    const total = stats.success + stats.failure + stats.rollback;

    const successBar = '█'.repeat(Math.round((stats.success / maxDeployments) * 30));
    const failureBar = '█'.repeat(Math.round((stats.failure / maxDeployments) * 30));
    const rollbackBar = '█'.repeat(Math.round((stats.rollback / maxDeployments) * 30));

    console.log(`${day} │ ✅${successBar.padEnd(30)} (${stats.success})`);
    if (stats.failure > 0) {
      console.log(`           │ ❌${failureBar.padEnd(30)} (${stats.failure})`);
    }
    if (stats.rollback > 0) {
      console.log(`           │ 🔄${rollbackBar.padEnd(30)} (${stats.rollback})`);
    }
  });

  console.log('');
  console.log('Legend: ✅ Success  ❌ Failure  🔄 Rollback');
  console.log('');
}

// ============================================================================
// EXPORT METRICS
// ============================================================================

function exportMetrics() {
  const metrics = loadMetrics();
  const exportPath = resolve(METRICS_DIR, `deployment-export-${Date.now()}.json`);

  writeFileSync(exportPath, JSON.stringify(metrics, null, 2), 'utf-8');

  console.log('');
  console.log('✅ Metrics exported successfully');
  console.log(`📁 Export Path: ${exportPath}`);
  console.log('');
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  // Record deployment
  if (args.includes('--record')) {
    const envArg = args.find((arg) => arg.startsWith('--env='))?.split('=')[1];
    const statusArg = args.find((arg) => arg.startsWith('--status='))?.split('=')[1];
    const durationArg = args.find((arg) => arg.startsWith('--duration='))?.split('=')[1];
    const commitArg = args.find((arg) => arg.startsWith('--commit='))?.split('=')[1];
    const branchArg = args.find((arg) => arg.startsWith('--branch='))?.split('=')[1];
    const errorArg = args.find((arg) => arg.startsWith('--error='))?.split('=')[1];

    if (!envArg || !statusArg || !durationArg) {
      console.error('❌ Error: --record requires --env, --status, and --duration');
      process.exit(1);
    }

    if (!['dev', 'staging', 'production'].includes(envArg)) {
      console.error('❌ Error: --env must be dev, staging, or production');
      process.exit(1);
    }

    if (!['success', 'failure', 'rollback'].includes(statusArg)) {
      console.error('❌ Error: --status must be success, failure, or rollback');
      process.exit(1);
    }

    recordDeployment(
      envArg as 'dev' | 'staging' | 'production',
      statusArg as 'success' | 'failure' | 'rollback',
      parseInt(durationArg),
      commitArg,
      branchArg,
      errorArg
    );

    return;
  }

  // Generate report
  if (args.includes('--report')) {
    const envArg = args.find((arg) => arg.startsWith('--env='))?.split('=')[1];
    const daysArg = args.find((arg) => arg.startsWith('--days='))?.split('=')[1];
    const days = daysArg ? parseInt(daysArg) : 30;

    generateReport(envArg, days);
    return;
  }

  // Generate chart
  if (args.includes('--chart')) {
    const daysArg = args.find((arg) => arg.startsWith('--days='))?.split('=')[1];
    const days = daysArg ? parseInt(daysArg) : 30;

    generateChart(days);
    return;
  }

  // Export metrics
  if (args.includes('--export')) {
    exportMetrics();
    return;
  }

  // Default: show help
  console.log('');
  console.log('📊 Deployment Metrics Tracker');
  console.log('');
  console.log('Usage:');
  console.log('  pnpm dlx tsx scripts/deployment-metrics.ts --record --env=staging --status=success --duration=120');
  console.log('  pnpm dlx tsx scripts/deployment-metrics.ts --report');
  console.log('  pnpm dlx tsx scripts/deployment-metrics.ts --report --env=production --days=7');
  console.log('  pnpm dlx tsx scripts/deployment-metrics.ts --chart');
  console.log('  pnpm dlx tsx scripts/deployment-metrics.ts --export');
  console.log('');
}

main();
