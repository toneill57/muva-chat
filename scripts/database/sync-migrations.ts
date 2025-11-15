#!/usr/bin/env node
/**
 * Sync Migrations Manually
 *
 * FASE 6: Migration Management System
 *
 * Purpose:
 * - Apply specific migration manually (emergency/out-of-order scenarios)
 * - Require --force flag for production safety
 * - Validate backup exists before production migrations
 * - Detailed logging of migration application
 *
 * Usage:
 *   pnpm dlx tsx scripts/sync-migrations.ts --env=staging --migration=20251105143000_fix_rls.sql
 *   pnpm dlx tsx scripts/sync-migrations.ts --env=production --migration=20251105143000_fix_rls.sql --force
 *   pnpm dlx tsx scripts/sync-migrations.ts --env=dev --migration=20251105143000_fix_rls.sql --dry-run
 */

import { readFile, stat, readdir } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { existsSync, statSync, readdirSync } from 'fs';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
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
    envKey: 'SUPABASE_SERVICE_ROLE_KEY_DEV',
  },
  staging: {
    id: 'ooaumjzaztmutltifhoq',
    name: 'Staging',
    envKey: 'SUPABASE_SERVICE_ROLE_KEY',
  },
  production: {
    id: 'ztfslsrkemlfjqpzksir',
    name: 'Production',
    envKey: 'SUPABASE_SERVICE_ROLE_KEY_PRODUCTION',
  },
};

interface Migration {
  filename: string;
  timestamp: string;
  name: string;
  sql: string;
  path: string;
}

async function verifyBackupExists(): Promise<boolean> {
  console.log(`${colors.cyan}🔍 Verifying recent backup exists...${colors.reset}`);
  
  const backupsDir = join(process.cwd(), 'backups');
  
  if (!existsSync(backupsDir)) {
    console.error(`${colors.red}❌ Backups directory not found: ${backupsDir}${colors.reset}`);
    return false;
  }
  
  try {
    const files = readdirSync(backupsDir);
    const productionBackups = files.filter(f => f.startsWith('production-') && f.endsWith('.sql.gz'));
    
    if (productionBackups.length === 0) {
      console.error(`${colors.red}❌ No production backups found!${colors.reset}`);
      console.error(`${colors.gray}   Run backup-production-db.ts first${colors.reset}`);
      return false;
    }
    
    // Check most recent backup
    const latestBackup = productionBackups.sort().reverse()[0];
    const backupPath = join(backupsDir, latestBackup);
    const stats = statSync(backupPath);
    const ageMinutes = (Date.now() - stats.mtimeMs) / (1000 * 60);
    
    console.log(`   ${colors.green}✅ Latest backup: ${latestBackup}${colors.reset}`);
    console.log(`   ${colors.gray}Age: ${ageMinutes.toFixed(1)} minutes${colors.reset}`);
    
    if (ageMinutes > 30) {
      console.warn(`${colors.yellow}⚠️  Backup is older than 30 minutes${colors.reset}`);
      console.warn(`${colors.gray}   Consider creating fresh backup for safety${colors.reset}`);
    }
    
    return true;
    
  } catch (error: any) {
    console.error(`${colors.red}❌ Could not verify backups: ${error.message}${colors.reset}`);
    return false;
  }
}

async function getMigrationFile(migrationName: string): Promise<Migration> {
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  
  // Check if exact filename provided
  const exactPath = join(migrationsDir, migrationName);
  
  if (existsSync(exactPath)) {
    const sql = await readFile(exactPath, 'utf-8');
    const match = migrationName.match(/^(\d{14})_(.+)\.sql$/);
    
    if (!match) {
      throw new Error(`Invalid migration filename format: ${migrationName}`);
    }
    
    const [, timestamp, name] = match;
    
    return {
      filename: migrationName,
      timestamp,
      name,
      sql,
      path: exactPath,
    };
  }
  
  // Try to find by timestamp or partial name
  const files = await readdir(migrationsDir);
  const candidates = files.filter(f => 
    f.includes(migrationName) && f.endsWith('.sql')
  );
  
  if (candidates.length === 0) {
    throw new Error(`Migration not found: ${migrationName}`);
  }
  
  if (candidates.length > 1) {
    console.error(`${colors.red}❌ Multiple migrations match: ${migrationName}${colors.reset}`);
    console.error('');
    console.error('Matches:');
    candidates.forEach(c => console.error(`  - ${c}`));
    console.error('');
    console.error('Please specify exact filename');
    throw new Error('Ambiguous migration name');
  }
  
  const filename = candidates[0];
  const path = join(migrationsDir, filename);
  const sql = await readFile(path, 'utf-8');
  const match = filename.match(/^(\d{14})_(.+)\.sql$/);
  
  if (!match) {
    throw new Error(`Invalid migration filename format: ${filename}`);
  }
  
  const [, timestamp, name] = match;
  
  return {
    filename,
    timestamp,
    name,
    sql,
    path,
  };
}

async function checkMigrationApplied(projectId: string, serviceKey: string, timestamp: string): Promise<boolean> {
  const url = `https://${projectId}.supabase.co`;
  const supabase = createClient(url, serviceKey);
  
  try {
    const { data, error } = await supabase
      .from('supabase_migrations.schema_migrations')
      .select('version')
      .eq('version', timestamp)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found (which is OK)
      throw error;
    }
    
    return !!data;
  } catch (error: any) {
    console.warn(`${colors.yellow}⚠️  Could not check applied migrations: ${error.message}${colors.reset}`);
    return false;
  }
}

async function applyMigration(projectId: string, serviceKey: string, migration: Migration, dryRun: boolean): Promise<void> {
  const url = `https://${projectId}.supabase.co`;
  const supabase = createClient(url, serviceKey);
  
  if (dryRun) {
    console.log('');
    console.log(`${colors.cyan}📄 Migration SQL (DRY RUN):${colors.reset}`);
    console.log(`${colors.gray}${'─'.repeat(60)}${colors.reset}`);
    console.log(migration.sql);
    console.log(`${colors.gray}${'─'.repeat(60)}${colors.reset}`);
    console.log('');
    console.log(`${colors.yellow}ℹ️  Dry run mode - migration NOT applied${colors.reset}`);
    return;
  }
  
  console.log(`${colors.cyan}🚀 Applying migration...${colors.reset}`);
  
  try {
    // Execute migration SQL
    const { error: execError } = await supabase.rpc('exec_sql', {
      sql_query: migration.sql
    });
    
    if (execError) {
      throw new Error(`Migration execution failed: ${execError.message}`);
    }
    
    console.log(`   ${colors.green}✅ Migration SQL executed${colors.reset}`);
    
    // Record migration in schema_migrations
    const { error: recordError } = await supabase
      .from('supabase_migrations.schema_migrations')
      .insert({
        version: migration.timestamp,
        name: migration.name,
      });
    
    if (recordError) {
      console.warn(`   ${colors.yellow}⚠️  Migration applied but not recorded: ${recordError.message}${colors.reset}`);
    } else {
      console.log(`   ${colors.green}✅ Migration recorded in schema_migrations${colors.reset}`);
    }
    
  } catch (error: any) {
    throw new Error(`Failed to apply migration: ${error.message}`);
  }
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔧 Sync Migrations Manually');
  console.log('================================================');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('');
    console.log('Usage:');
    console.log('  pnpm dlx tsx scripts/sync-migrations.ts --env=<environment> --migration=<file> [options]');
    console.log('');
    console.log('Required:');
    console.log('  --env=<env>           Target environment (dev, staging, production)');
    console.log('  --migration=<file>    Migration filename or timestamp');
    console.log('');
    console.log('Options:');
    console.log('  --force               Required for production (safety check)');
    console.log('  --dry-run             Show what would be applied without applying');
    console.log('  --help, -h            Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  pnpm dlx tsx scripts/sync-migrations.ts --env=staging --migration=20251105143000_fix_rls.sql');
    console.log('  pnpm dlx tsx scripts/sync-migrations.ts --env=production --migration=20251105143000 --force');
    console.log('  pnpm dlx tsx scripts/sync-migrations.ts --env=dev --migration=fix_rls --dry-run');
    console.log('');
    process.exit(0);
  }
  
  const envArg = args.find(arg => arg.startsWith('--env='));
  const migrationArg = args.find(arg => arg.startsWith('--migration='));
  const forceFlag = args.includes('--force');
  const dryRunFlag = args.includes('--dry-run');
  
  if (!envArg || !migrationArg) {
    console.error('');
    console.error(`${colors.red}❌ Error: Missing required arguments${colors.reset}`);
    console.error('');
    console.error('Usage:');
    console.error('  pnpm dlx tsx scripts/sync-migrations.ts --env=<environment> --migration=<file>');
    console.error('');
    console.error('Run with --help for more information');
    console.error('');
    process.exit(1);
  }
  
  const env = envArg.split('=')[1] as 'dev' | 'staging' | 'production';
  const migrationName = migrationArg.split('=')[1];
  
  if (!['dev', 'staging', 'production'].includes(env)) {
    console.error(`${colors.red}❌ Error: Invalid environment: ${env}${colors.reset}`);
    console.error(`${colors.gray}   Valid values: dev, staging, production${colors.reset}`);
    console.error('');
    process.exit(1);
  }
  
  const project = SUPABASE_PROJECTS[env];
  
  console.log('');
  console.log(`${colors.bright}Target:${colors.reset} ${project.name} (${project.id})`);
  console.log(`${colors.bright}Migration:${colors.reset} ${migrationName}`);
  console.log(`${colors.bright}Mode:${colors.reset} ${dryRunFlag ? 'DRY RUN' : 'APPLY'}`);
  console.log('');
  
  // Safety check for production
  if (env === 'production' && !forceFlag && !dryRunFlag) {
    console.error(`${colors.red}❌ Error: Production requires --force flag${colors.reset}`);
    console.error('');
    console.error('This is a safety measure to prevent accidental production changes.');
    console.error('');
    console.error('To apply migration to production:');
    console.error(`  pnpm dlx tsx scripts/sync-migrations.ts --env=production --migration=${migrationName} --force`);
    console.error('');
    console.error('To preview migration without applying:');
    console.error(`  pnpm dlx tsx scripts/sync-migrations.ts --env=production --migration=${migrationName} --dry-run`);
    console.error('');
    process.exit(1);
  }
  
  // Verify backup exists for production
  if (env === 'production' && !dryRunFlag) {
    const hasBackup = await verifyBackupExists();
    if (!hasBackup) {
      console.error('');
      console.error(`${colors.red}❌ CRITICAL: No recent backup found${colors.reset}`);
      console.error('');
      console.error('Create backup before applying production migrations:');
      console.error('  pnpm dlx tsx scripts/backup-production-db.ts');
      console.error('');
      process.exit(1);
    }
    console.log('');
  }
  
  // Get service key
  const serviceKey = process.env[project.envKey];
  
  if (!serviceKey) {
    console.error(`${colors.red}❌ Error: ${project.envKey} not set${colors.reset}`);
    console.error('');
    process.exit(1);
  }
  
  // Load migration file
  console.log(`${colors.cyan}📂 Loading migration file...${colors.reset}`);
  
  let migration: Migration;
  try {
    migration = await getMigrationFile(migrationName);
    console.log(`   ${colors.green}✅ Found: ${migration.filename}${colors.reset}`);
    console.log(`   ${colors.gray}Timestamp: ${migration.timestamp}${colors.reset}`);
    console.log(`   ${colors.gray}Name: ${migration.name}${colors.reset}`);
  } catch (error: any) {
    console.error('');
    console.error(`${colors.red}❌ ${error.message}${colors.reset}`);
    console.error('');
    process.exit(1);
  }
  
  console.log('');
  
  // Check if already applied
  console.log(`${colors.cyan}🔍 Checking migration status...${colors.reset}`);
  const isApplied = await checkMigrationApplied(project.id, serviceKey, migration.timestamp);
  
  if (isApplied) {
    console.log(`   ${colors.yellow}⚠️  Migration already applied${colors.reset}`);
    console.log('');
    console.log(`${colors.yellow}WARNING: This migration is already in schema_migrations${colors.reset}`);
    console.log('');
    
    if (!forceFlag && !dryRunFlag) {
      console.error('To force re-apply (dangerous):');
      console.error(`  pnpm dlx tsx scripts/sync-migrations.ts --env=${env} --migration=${migrationName} --force`);
      console.error('');
      process.exit(1);
    }
  } else {
    console.log(`   ${colors.green}✅ Migration not yet applied${colors.reset}`);
  }
  
  console.log('');
  
  // Apply migration
  try {
    await applyMigration(project.id, serviceKey, migration, dryRunFlag);
    
    console.log('');
    console.log('================================================');
    if (dryRunFlag) {
      console.log('✅ Dry run completed');
    } else {
      console.log('✅ Migration applied successfully');
    }
    console.log('================================================');
    console.log('');
    
    if (!dryRunFlag) {
      console.log('📋 Next Steps:');
      console.log('  1. Verify application still works');
      console.log('  2. Check for any errors in logs');
      console.log('  3. Test critical features');
      console.log('');
    }
    
    process.exit(0);
    
  } catch (error: any) {
    console.error('');
    console.error('================================================');
    console.error(`${colors.red}❌ Migration failed${colors.reset}`);
    console.error('================================================');
    console.error('');
    console.error(`Error: ${error.message}`);
    console.error('');
    
    if (env === 'production') {
      console.error('🔄 ROLLBACK REQUIRED:');
      console.error('  1. Run rollback-production.ts immediately');
      console.error('  2. Investigate migration failure');
      console.error('  3. Fix migration SQL');
      console.error('  4. Test in staging again');
      console.error('');
    }
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('');
  console.error(`${colors.red}❌ Unexpected error: ${error.message}${colors.reset}`);
  console.error('');
  process.exit(1);
});
