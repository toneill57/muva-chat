#!/usr/bin/env tsx
/**
 * Alert on Failure - Proactive Error Detection System
 *
 * FASE 8: Monitoring & Alerting
 *
 * Purpose:
 * - Monitor services for failures and degradation
 * - Read and analyze .claude/errors.jsonl for error patterns
 * - Detect critical issues before they impact users
 * - Send notifications (console for now, extensible to Slack/email)
 * - Suggest auto-restart or remediation actions
 *
 * Usage:
 *   pnpm dlx tsx scripts/alert-on-failure.ts
 *   pnpm dlx tsx scripts/alert-on-failure.ts --env=production
 *   pnpm dlx tsx scripts/alert-on-failure.ts --check-errors-only
 *   pnpm dlx tsx scripts/alert-on-failure.ts --auto-restart
 *
 * Options:
 *   --env=<name>         Check specific environment (dev|staging|production)
 *   --check-errors-only  Only analyze .claude/errors.jsonl, skip health checks
 *   --auto-restart       Attempt to restart services if down (VPS only)
 *   --threshold=<n>      Alert threshold for repeated errors (default: 3)
 *
 * Environment Variables:
 *   SLACK_WEBHOOK_URL    - Slack webhook for notifications (optional)
 *   ALERT_EMAIL          - Email for critical alerts (optional)
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
  pm2Name?: string;
}

const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  dev: {
    name: 'dev',
    displayName: 'Development',
    url: process.env.DEV_URL || 'http://localhost:3000',
    projectId: process.env.DEV_SUPABASE_PROJECT_ID || 'rvjmwwvkhglcuqwcznph',
  },
  staging: {
    name: 'staging',
    displayName: 'Staging',
    url: process.env.STAGING_URL || 'https://simmerdown.staging.muva.chat',
    projectId: process.env.STAGING_SUPABASE_PROJECT_ID || 'bddcvjoeoiekzfetvxoe', // NEW TST environment
    pm2Name: 'muva-staging',
  },
  production: {
    name: 'production',
    displayName: 'Production',
    url: process.env.PROD_URL || 'https://simmerdown.muva.chat',
    projectId: process.env.PROD_SUPABASE_PROJECT_ID || 'ooaumjzaztmutltifhoq',
    pm2Name: 'muva-production',
  },
};

const ERROR_THRESHOLD = 3; // Alert if same error appears 3+ times

// ============================================================================
// TYPES
// ============================================================================

interface Alert {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  environment: string;
  title: string;
  message: string;
  timestamp: string;
  suggestedAction?: string;
  errorCount?: number;
}

interface ErrorLogEntry {
  timestamp: string;
  tool: string;
  type: string;
  exit_code?: number;
  details: string;
  output?: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'error' | 'unknown';
  responseTime: number;
  error?: string;
}

// ============================================================================
// HEALTH CHECK FUNCTIONS
// ============================================================================

async function checkServiceHealth(config: EnvironmentConfig): Promise<HealthStatus> {
  try {
    const startTime = Date.now();
    const curlCommand = `curl -s -m 5 -o /dev/null -w "%{http_code}" "${config.url}/api/health"`;
    const statusCode = execSync(curlCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const responseTime = Date.now() - startTime;

    if (statusCode === '200') {
      return { status: 'healthy', responseTime };
    } else if (statusCode === '503') {
      return { status: 'degraded', responseTime, error: 'Service degraded' };
    } else {
      return { status: 'error', responseTime, error: `HTTP ${statusCode}` };
    }
  } catch (error: any) {
    return {
      status: 'error',
      responseTime: 0,
      error: error.message || 'Connection failed',
    };
  }
}

// ============================================================================
// ERROR LOG ANALYSIS
// ============================================================================

function readErrorLog(): ErrorLogEntry[] {
  const errorLogPath = resolve(process.cwd(), '.claude/errors.jsonl');

  if (!existsSync(errorLogPath)) {
    return [];
  }

  try {
    const content = readFileSync(errorLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    return lines.map((line) => {
      try {
        return JSON.parse(line) as ErrorLogEntry;
      } catch {
        return null;
      }
    }).filter((entry): entry is ErrorLogEntry => entry !== null);
  } catch (error) {
    console.error('⚠️  Failed to read error log:', error);
    return [];
  }
}

function analyzeErrorPatterns(errors: ErrorLogEntry[]): Alert[] {
  const alerts: Alert[] = [];

  if (errors.length === 0) {
    return alerts;
  }

  // Group errors by type and details
  const errorGroups = new Map<string, ErrorLogEntry[]>();

  errors.forEach((error) => {
    const key = `${error.tool}:${error.type}:${error.details.substring(0, 50)}`;
    const group = errorGroups.get(key) || [];
    group.push(error);
    errorGroups.set(key, group);
  });

  // Check for repeated errors
  errorGroups.forEach((group, key) => {
    if (group.length >= ERROR_THRESHOLD) {
      const firstError = group[0];
      const lastError = group[group.length - 1];

      let severity: 'CRITICAL' | 'WARNING' | 'INFO' = 'WARNING';
      let suggestedAction = 'Review error logs and fix the underlying issue';

      // Categorize by tool
      if (firstError.tool === 'mcp__supabase__execute_sql' || firstError.tool.includes('supabase')) {
        severity = 'CRITICAL';
        suggestedAction = 'Check database connectivity and schema. May need migration or rollback.';
      } else if (firstError.tool === 'Edit' && firstError.details.includes('not found')) {
        severity = 'WARNING';
        suggestedAction = 'Use Read tool before Edit to ensure exact string match.';
      } else if (firstError.tool === 'Bash' && firstError.exit_code !== 0) {
        severity = 'WARNING';
        suggestedAction = `Check script: ${firstError.details}`;
      }

      alerts.push({
        severity,
        environment: 'local',
        title: `Repeated Error: ${firstError.tool} (${group.length}x)`,
        message: `Error repeated ${group.length} times between ${firstError.timestamp} and ${lastError.timestamp}`,
        timestamp: lastError.timestamp,
        suggestedAction,
        errorCount: group.length,
      });
    }
  });

  // Check for database errors
  const dbErrors = errors.filter((e) => e.tool.includes('supabase') || e.details.toLowerCase().includes('database'));
  if (dbErrors.length > 0) {
    alerts.push({
      severity: 'CRITICAL',
      environment: 'local',
      title: 'Database Errors Detected',
      message: `${dbErrors.length} database-related error(s) found in error log`,
      timestamp: dbErrors[dbErrors.length - 1].timestamp,
      suggestedAction: 'Check database connectivity, schema, and migrations',
      errorCount: dbErrors.length,
    });
  }

  // Check for authentication errors
  const authErrors = errors.filter((e) => e.details.toLowerCase().includes('auth') || e.details.toLowerCase().includes('token'));
  if (authErrors.length > 0) {
    alerts.push({
      severity: 'WARNING',
      environment: 'local',
      title: 'Authentication Errors Detected',
      message: `${authErrors.length} authentication-related error(s) found`,
      timestamp: authErrors[authErrors.length - 1].timestamp,
      suggestedAction: 'Verify API keys and tokens in environment variables',
      errorCount: authErrors.length,
    });
  }

  return alerts;
}

// ============================================================================
// SERVICE MONITORING
// ============================================================================

async function monitorServices(envFilter?: string): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const envsToCheck = envFilter
    ? [ENVIRONMENTS[envFilter]]
    : Object.values(ENVIRONMENTS);

  for (const config of envsToCheck) {
    if (!config) continue;

    const health = await checkServiceHealth(config);

    if (health.status === 'error') {
      alerts.push({
        severity: config.name === 'production' ? 'CRITICAL' : 'WARNING',
        environment: config.name,
        title: `${config.displayName} Service DOWN`,
        message: health.error || 'Service is not responding',
        timestamp: new Date().toISOString(),
        suggestedAction: config.pm2Name
          ? `Restart service: pm2 restart ${config.pm2Name}`
          : 'Check application logs and restart development server',
      });
    } else if (health.status === 'degraded') {
      alerts.push({
        severity: 'WARNING',
        environment: config.name,
        title: `${config.displayName} Service DEGRADED`,
        message: 'Service is responding but reporting degraded status',
        timestamp: new Date().toISOString(),
        suggestedAction: 'Check health endpoint for details on degraded services',
      });
    } else if (health.responseTime > 5000) {
      alerts.push({
        severity: 'WARNING',
        environment: config.name,
        title: `${config.displayName} Slow Response`,
        message: `Health check took ${health.responseTime}ms (threshold: 5000ms)`,
        timestamp: new Date().toISOString(),
        suggestedAction: 'Check server load and database performance',
      });
    }
  }

  return alerts;
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

function sendSlackNotification(alert: Alert) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return; // Slack not configured
  }

  try {
    const emoji = alert.severity === 'CRITICAL' ? '🚨' : alert.severity === 'WARNING' ? '⚠️' : 'ℹ️';
    const color = alert.severity === 'CRITICAL' ? '#ff0000' : alert.severity === 'WARNING' ? '#ffaa00' : '#0066ff';

    const payload = {
      text: `${emoji} ${alert.title}`,
      attachments: [
        {
          color,
          fields: [
            { title: 'Environment', value: alert.environment, short: true },
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Message', value: alert.message, short: false },
            { title: 'Suggested Action', value: alert.suggestedAction || 'N/A', short: false },
            { title: 'Timestamp', value: alert.timestamp, short: true },
          ],
        },
      ],
    };

    execSync(`curl -X POST -H 'Content-Type: application/json' -d '${JSON.stringify(payload)}' "${webhookUrl}"`, {
      stdio: 'ignore',
    });
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

function displayAlert(alert: Alert) {
  const emoji = alert.severity === 'CRITICAL' ? '🚨' : alert.severity === 'WARNING' ? '⚠️' : 'ℹ️';
  const border = alert.severity === 'CRITICAL' ? '═' : '─';

  console.log('');
  console.log(border.repeat(70));
  console.log(`${emoji} [${alert.severity}] ${alert.title}`);
  console.log(border.repeat(70));
  console.log('');
  console.log(`📍 Environment: ${alert.environment}`);
  console.log(`📝 Message: ${alert.message}`);
  if (alert.errorCount) {
    console.log(`🔢 Error Count: ${alert.errorCount}`);
  }
  console.log(`🕐 Timestamp: ${alert.timestamp}`);
  console.log('');
  if (alert.suggestedAction) {
    console.log(`💡 Suggested Action:`);
    console.log(`   ${alert.suggestedAction}`);
    console.log('');
  }
  console.log(border.repeat(70));
}

// ============================================================================
// AUTO-RESTART FUNCTION
// ============================================================================

async function attemptAutoRestart(alert: Alert, config: EnvironmentConfig): Promise<boolean> {
  if (!config.pm2Name) {
    console.log('⚠️  Auto-restart not available for this environment (no PM2 config)');
    return false;
  }

  try {
    console.log(`🔄 Attempting auto-restart: ${config.pm2Name}...`);

    // This would require SSH access to VPS - for now, just show command
    console.log(`   Command: pm2 restart ${config.pm2Name}`);
    console.log('   (Auto-restart requires SSH access - run manually on VPS)');

    return false; // Not implemented yet
  } catch (error: any) {
    console.error(`❌ Auto-restart failed: ${error.message}`);
    return false;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const envArg = args.find((arg) => arg.startsWith('--env='))?.split('=')[1];
  const checkErrorsOnly = args.includes('--check-errors-only');
  const autoRestart = args.includes('--auto-restart');
  const thresholdArg = args.find((arg) => arg.startsWith('--threshold='))?.split('=')[1];

  const threshold = thresholdArg ? parseInt(thresholdArg) : ERROR_THRESHOLD;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                    🚨 ALERT SYSTEM - MUVA MONITORING');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`📅 Scan Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })} COT`);
  console.log(`🎯 Error Threshold: ${threshold}`);
  console.log('');

  const allAlerts: Alert[] = [];

  // Check error log
  console.log('🔍 Analyzing error log (.claude/errors.jsonl)...');
  const errors = readErrorLog();
  console.log(`   Found ${errors.length} error(s) in log`);

  if (errors.length > 0) {
    const errorAlerts = analyzeErrorPatterns(errors);
    allAlerts.push(...errorAlerts);
    console.log(`   Generated ${errorAlerts.length} alert(s) from error patterns`);
  }
  console.log('');

  // Check services (unless errors-only mode)
  if (!checkErrorsOnly) {
    console.log('🔍 Monitoring service health...');
    const serviceAlerts = await monitorServices(envArg);
    allAlerts.push(...serviceAlerts);
    console.log(`   Generated ${serviceAlerts.length} alert(s) from service checks`);
    console.log('');
  }

  // Display all alerts
  if (allAlerts.length === 0) {
    console.log('✅ No issues detected - all systems operational');
    console.log('');
    process.exit(0);
  }

  console.log(`⚠️  Found ${allAlerts.length} alert(s):`);
  console.log('');

  // Sort by severity
  const criticalAlerts = allAlerts.filter((a) => a.severity === 'CRITICAL');
  const warningAlerts = allAlerts.filter((a) => a.severity === 'WARNING');
  const infoAlerts = allAlerts.filter((a) => a.severity === 'INFO');

  [...criticalAlerts, ...warningAlerts, ...infoAlerts].forEach((alert) => {
    displayAlert(alert);

    // Send notifications
    if (process.env.SLACK_WEBHOOK_URL) {
      sendSlackNotification(alert);
    }

    // Auto-restart if requested and critical
    if (autoRestart && alert.severity === 'CRITICAL') {
      const config = ENVIRONMENTS[alert.environment];
      if (config) {
        attemptAutoRestart(alert, config);
      }
    }
  });

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 ALERT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`🚨 CRITICAL: ${criticalAlerts.length}`);
  console.log(`⚠️  WARNING: ${warningAlerts.length}`);
  console.log(`ℹ️  INFO: ${infoAlerts.length}`);
  console.log('');

  if (criticalAlerts.length > 0) {
    console.log('🔔 CRITICAL ALERTS DETECTED - Immediate action required');
    console.log('');
    process.exit(1);
  } else if (warningAlerts.length > 0) {
    console.log('⚠️  Warnings detected - review recommended');
    console.log('');
    process.exit(0);
  } else {
    console.log('✅ All alerts are informational');
    console.log('');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error in alert system:', error);
  process.exit(1);
});
