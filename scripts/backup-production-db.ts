#!/usr/bin/env tsx
/**
 * Backup Production Database
 *
 * FASE 4: Production Deployment Workflow
 *
 * Purpose:
 * - Create full database backup before production deployment
 * - Uses pg_dump to export schema + data
 * - Compresses backup with gzip
 * - Stores backup with timestamp and git commit metadata
 *
 * Usage:
 *   pnpm dlx tsx scripts/backup-production-db.ts
 *
 * Environment Variables Required:
 *   SUPABASE_PRODUCTION_PROJECT_ID - Production project ref (ooaumjzaztmutltifhoq)
 *   SUPABASE_DB_PASSWORD_PRODUCTION - Database password
 *   GITHUB_SHA (optional) - Git commit hash for metadata
 *
 * Output:
 *   backups/production-YYYYMMDD-HHMMSS-{commit}.sql.gz
 */

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

// Environment validation
const PRODUCTION_PROJECT_ID = process.env.SUPABASE_PRODUCTION_PROJECT_ID || 'ooaumjzaztmutltifhoq';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD_PRODUCTION;
const GITHUB_SHA = process.env.GITHUB_SHA || 'local';

if (!DB_PASSWORD) {
  console.error('❌ Error: SUPABASE_DB_PASSWORD_PRODUCTION environment variable not set');
  process.exit(1);
}

// PostgreSQL connection details
const PG_HOST = `aws-0-us-west-1.pooler.supabase.com`;
const PG_PORT = '6543';
const PG_USER = `postgres.${PRODUCTION_PROJECT_ID}`;
const PG_DATABASE = 'postgres';

// Backup configuration
const BACKUP_DIR = join(process.cwd(), 'backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const COMMIT_SHORT = GITHUB_SHA.slice(0, 7);
const BACKUP_FILENAME = `production-${TIMESTAMP}-${COMMIT_SHORT}.sql`;
const BACKUP_PATH = join(BACKUP_DIR, BACKUP_FILENAME);
const BACKUP_PATH_GZ = `${BACKUP_PATH}.gz`;

async function main() {
  console.log('');
  console.log('================================================');
  console.log('💾 Backup Production Database');
  console.log('================================================');
  console.log(`📦 Production Project: ${PRODUCTION_PROJECT_ID}`);
  console.log(`🌐 Production URL: https://${PRODUCTION_PROJECT_ID}.supabase.co`);
  console.log(`📂 Backup Directory: ${BACKUP_DIR}`);
  console.log(`📄 Backup File: ${BACKUP_FILENAME}`);
  console.log('');

  // Step 1: Create backups directory
  console.log('📁 Step 1: Creating backups directory...');
  try {
    mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✅ Directory ready: ${BACKUP_DIR}`);
  } catch (error: any) {
    console.error('❌ Failed to create backups directory');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
  console.log('');

  // Step 2: Create backup metadata
  console.log('📋 Step 2: Creating backup metadata...');
  const metadata = {
    timestamp: new Date().toISOString(),
    project_id: PRODUCTION_PROJECT_ID,
    commit: GITHUB_SHA,
    environment: 'production',
    database: PG_DATABASE,
    host: PG_HOST,
    backup_type: 'full',
    compressed: true,
  };

  const metadataPath = `${BACKUP_PATH}.json`;
  try {
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`✅ Metadata saved: ${metadataPath}`);
  } catch (error: any) {
    console.error('❌ Failed to save metadata');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
  console.log('');

  // Step 3: Create database backup using pg_dump
  console.log('🔄 Step 3: Creating database backup (this may take several minutes)...');
  console.log('');

  try {
    // pg_dump command with compression
    const pgDumpCommand = `PGPASSWORD="${DB_PASSWORD}" pg_dump \
      --host=${PG_HOST} \
      --port=${PG_PORT} \
      --username=${PG_USER} \
      --dbname=${PG_DATABASE} \
      --format=plain \
      --no-owner \
      --no-acl \
      --verbose \
      --file="${BACKUP_PATH}"`;

    console.log('Executing pg_dump...');
    execSync(pgDumpCommand, {
      stdio: 'inherit',
      env: { ...process.env, PGPASSWORD: DB_PASSWORD }
    });

    console.log('');
    console.log('✅ Database backup created successfully');
    console.log('');

    // Step 4: Compress backup
    console.log('🗜️  Step 4: Compressing backup...');
    execSync(`gzip "${BACKUP_PATH}"`, { stdio: 'inherit' });
    console.log(`✅ Backup compressed: ${BACKUP_PATH_GZ}`);

  } catch (error: any) {
    console.error('');
    console.error('❌ Backup failed');
    console.error(`   Error: ${error.message}`);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   - Verify SUPABASE_DB_PASSWORD_PRODUCTION is correct');
    console.log('   - Check network connectivity to Supabase');
    console.log('   - Ensure pg_dump is installed: sudo apt-get install postgresql-client');
    console.log('');
    process.exit(1);
  }
  console.log('');

  // Step 5: Verify backup file
  console.log('🔍 Step 5: Verifying backup file...');
  try {
    const statCommand = `stat -f%z "${BACKUP_PATH_GZ}" 2>/dev/null || stat -c%s "${BACKUP_PATH_GZ}"`;
    const sizeBytes = parseInt(execSync(statCommand, { encoding: 'utf-8' }).trim());
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

    if (sizeBytes < 1000) {
      console.error('❌ Backup file is suspiciously small (< 1KB)');
      console.error('   This may indicate an incomplete backup');
      process.exit(1);
    }

    console.log(`✅ Backup verified: ${sizeMB} MB`);
  } catch (error: any) {
    console.error('⚠️  Warning: Could not verify backup file size');
  }
  console.log('');

  // Step 6: Cleanup old backups (keep last 7)
  console.log('🧹 Step 6: Cleaning up old backups...');
  try {
    const cleanupCommand = `cd ${BACKUP_DIR} && ls -t production-*.sql.gz | tail -n +8 | xargs -r rm --`;
    execSync(cleanupCommand, { stdio: 'pipe' });
    console.log('✅ Old backups cleaned (keeping last 7)');
  } catch (error: any) {
    console.log('ℹ️  No old backups to clean');
  }
  console.log('');

  console.log('================================================');
  console.log('✅ Backup completed successfully');
  console.log('================================================');
  console.log('');
  console.log('📊 Backup Summary:');
  console.log(`   File: ${BACKUP_FILENAME}.gz`);
  console.log(`   Path: ${BACKUP_PATH_GZ}`);
  console.log(`   Metadata: ${metadataPath}`);
  console.log(`   Commit: ${GITHUB_SHA}`);
  console.log('');
  console.log('💡 To restore this backup:');
  console.log(`   gunzip ${BACKUP_PATH_GZ}`);
  console.log(`   psql [connection-string] < ${BACKUP_PATH}`);
  console.log('');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
