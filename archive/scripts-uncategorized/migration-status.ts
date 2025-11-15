#!/usr/bin/env node
/**
 * Migration Status Reporter
 *
 * FASE 6: Migration Management System
 *
 * Purpose:
 * - Show migration status across different environments
 * - Compare local migration files with applied migrations in database
 * - Display pending, applied, and unknown migrations
 *
 * Usage:
 *   pnpm dlx tsx scripts/migration-status.ts --env=dev
 *   pnpm dlx tsx scripts/migration-status.ts --env=staging
 *   pnpm dlx tsx scripts/migration-status.ts --env=production
 *   pnpm dlx tsx scripts/migration-status.ts --all
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const SUPABASE_PROJECTS = {
  dev: {
    id: 'rvjmwwvkhglcuqwcznph',
    name: 'Development',
  },
  staging: {
    id: 'ooaumjzaztmutltifhoq',
    name: 'Staging',
  },
  production: {
    id: 'ztfslsrkemlfjqpzksir',
    name: 'Production',
  },
};

interface Migration {
  filename: string;
  timestamp: string;
  name: string;
}

interface MigrationStatus {
  migration: Migration;
  status: 'applied' | 'pending' | 'unknown';
  appliedAt?: string;
}

async function getLocalMigrations(): Promise<Migration[]> {
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  
  try {
    const files = await readdir(migrationsDir);
    
    const migrations: Migration[] = [];
    
    for (const filename of files) {
      if (!filename.endsWith('.sql')) {
        continue;
      }
      
      // Parse timestamp from filename (format: YYYYMMDDHHMMSS_name.sql)
      const match = filename.match(/^(\d{14})_(.+)\.sql$/);
      if (!match) {
        console.warn(`${colors.yellow}⚠️  Skipping invalid filename format: ${filename}${colors.reset}`);
        continue;
      }
      
      const [, timestamp, name] = match;
      
      migrations.push({
        filename,
        timestamp,
        name,
      });
    }
    
    return migrations.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  } catch (error: any) {
    console.error(`${colors.red}❌ Error reading local migrations: ${error.message}${colors.reset}`);
    return [];
  }
}

async function getAppliedMigrations(projectId: string, serviceKey: string): Promise<Map<string, string>> {
  const url = `https://${projectId}.supabase.co`;
  const supabase = createClient(url, serviceKey);
  
  try {
    // Query applied migrations from schema_migrations table
    const { data, error } = await supabase
      .from('supabase_migrations.schema_migrations')
      .select('version, name, statements')
      .order('version', { ascending: true });
    
    if (error) {
      // Table might not exist yet
      return new Map();
    }
    
    const appliedMap = new Map<string, string>();
    
    if (data) {
      for (const row of data) {
        appliedMap.set(row.version, row.name || 'unknown');
      }
    }
    
    return appliedMap;
  } catch (error: any) {
    console.error(`${colors.yellow}⚠️  Could not fetch applied migrations: ${error.message}${colors.reset}`);
    return new Map();
  }
}

function formatTimestamp(timestamp: string): string {
  // Convert YYYYMMDDHHMMSS to readable format
  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(4, 6);
  const day = timestamp.substring(6, 8);
  const hour = timestamp.substring(8, 10);
  const minute = timestamp.substring(10, 12);
  const second = timestamp.substring(12, 14);
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function printTable(statuses: MigrationStatus[], environmentName: string) {
  console.log('');
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}  ${environmentName} Environment${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log('');
  
  // Count by status
  const applied = statuses.filter(s => s.status === 'applied').length;
  const pending = statuses.filter(s => s.status === 'pending').length;
  const unknown = statuses.filter(s => s.status === 'unknown').length;
  
  // Summary
  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log(`  ${colors.green}✅ Applied:${colors.reset} ${applied}`);
  console.log(`  ${colors.yellow}⏳ Pending:${colors.reset} ${pending}`);
  console.log(`  ${colors.red}❌ Unknown:${colors.reset} ${unknown}`);
  console.log('');
  
  if (statuses.length === 0) {
    console.log(`${colors.gray}  No migrations found${colors.reset}`);
    console.log('');
    return;
  }
  
  // Table header
  console.log(`${colors.bright}Migrations:${colors.reset}`);
  console.log('');
  console.log(`${colors.gray}  Status   Timestamp           Migration Name${colors.reset}`);
  console.log(`${colors.gray}  ──────── ─────────────────── ────────────────────────────────${colors.reset}`);
  
  // Table rows
  for (const status of statuses) {
    const timestamp = formatTimestamp(status.migration.timestamp);
    const name = status.migration.name.substring(0, 40);
    
    let statusIcon = '';
    let statusColor = colors.reset;
    
    switch (status.status) {
      case 'applied':
        statusIcon = '✅';
        statusColor = colors.green;
        break;
      case 'pending':
        statusIcon = '⏳';
        statusColor = colors.yellow;
        break;
      case 'unknown':
        statusIcon = '❌';
        statusColor = colors.red;
        break;
    }
    
    console.log(`  ${statusColor}${statusIcon} ${status.status.padEnd(7)}${colors.reset} ${colors.gray}${timestamp}${colors.reset}  ${name}`);
  }
  
  console.log('');
}

async function checkEnvironment(env: 'dev' | 'staging' | 'production') {
  const project = SUPABASE_PROJECTS[env];
  
  console.log(`${colors.cyan}📊 Checking ${project.name} environment...${colors.reset}`);
  
  // Get service key from environment
  const serviceKeyVar = env === 'production' 
    ? 'SUPABASE_SERVICE_ROLE_KEY_PRODUCTION'
    : env === 'staging'
    ? 'SUPABASE_SERVICE_ROLE_KEY'
    : 'SUPABASE_SERVICE_ROLE_KEY_DEV';
  
  const serviceKey = process.env[serviceKeyVar];
  
  if (!serviceKey) {
    console.error(`${colors.red}❌ Error: ${serviceKeyVar} not set${colors.reset}`);
    console.error(`${colors.gray}   Set this environment variable to check ${env} migrations${colors.reset}`);
    console.log('');
    return;
  }
  
  // Get local and applied migrations
  const localMigrations = await getLocalMigrations();
  const appliedMigrations = await getAppliedMigrations(project.id, serviceKey);
  
  // Build status list
  const statuses: MigrationStatus[] = [];
  const processedTimestamps = new Set<string>();
  
  // Check local migrations
  for (const migration of localMigrations) {
    processedTimestamps.add(migration.timestamp);
    
    if (appliedMigrations.has(migration.timestamp)) {
      statuses.push({
        migration,
        status: 'applied',
      });
    } else {
      statuses.push({
        migration,
        status: 'pending',
      });
    }
  }
  
  // Check for unknown migrations (in DB but not in local files)
  for (const [timestamp, name] of appliedMigrations.entries()) {
    if (!processedTimestamps.has(timestamp)) {
      statuses.push({
        migration: {
          filename: `${timestamp}_${name}.sql`,
          timestamp,
          name,
        },
        status: 'unknown',
      });
    }
  }
  
  // Sort by timestamp
  statuses.sort((a, b) => a.migration.timestamp.localeCompare(b.migration.timestamp));
  
  // Print table
  printTable(statuses, project.name);
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔍 Migration Status Reporter');
  console.log('================================================');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('');
    console.log('Usage:');
    console.log('  pnpm dlx tsx scripts/migration-status.ts --env=<environment>');
    console.log('  pnpm dlx tsx scripts/migration-status.ts --all');
    console.log('');
    console.log('Options:');
    console.log('  --env=dev         Check development environment');
    console.log('  --env=staging     Check staging environment');
    console.log('  --env=production  Check production environment');
    console.log('  --all             Check all environments');
    console.log('  --help, -h        Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  pnpm dlx tsx scripts/migration-status.ts --env=staging');
    console.log('  pnpm dlx tsx scripts/migration-status.ts --all');
    console.log('');
    process.exit(0);
  }
  
  const envArg = args.find(arg => arg.startsWith('--env='));
  const checkAll = args.includes('--all');
  
  if (!envArg && !checkAll) {
    console.error('');
    console.error(`${colors.red}❌ Error: Missing required argument${colors.reset}`);
    console.error('');
    console.error('Usage:');
    console.error('  pnpm dlx tsx scripts/migration-status.ts --env=<environment>');
    console.error('  pnpm dlx tsx scripts/migration-status.ts --all');
    console.error('');
    console.error('Run with --help for more information');
    console.error('');
    process.exit(1);
  }
  
  console.log('');
  
  if (checkAll) {
    // Check all environments
    await checkEnvironment('dev');
    await checkEnvironment('staging');
    await checkEnvironment('production');
  } else {
    // Check specific environment
    const env = envArg!.split('=')[1] as 'dev' | 'staging' | 'production';
    
    if (!['dev', 'staging', 'production'].includes(env)) {
      console.error(`${colors.red}❌ Error: Invalid environment: ${env}${colors.reset}`);
      console.error(`${colors.gray}   Valid values: dev, staging, production${colors.reset}`);
      console.error('');
      process.exit(1);
    }
    
    await checkEnvironment(env);
  }
  
  console.log('================================================');
  console.log('✅ Migration status check completed');
  console.log('================================================');
  console.log('');
}

main().catch((error) => {
  console.error('');
  console.error(`${colors.red}❌ Unexpected error: ${error.message}${colors.reset}`);
  console.error('');
  process.exit(1);
});
