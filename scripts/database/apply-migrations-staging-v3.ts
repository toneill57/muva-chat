#!/usr/bin/env tsx
/**
 * Apply Supabase Migrations to Staging Environment (v3 - usando REST API)
 *
 * FASE 3: Enhanced Staging Workflow
 *
 * Purpose:
 * - Apply pending migrations from supabase/migrations/ to staging database
 * - Uses Supabase REST API (no requiere database pooling)
 * - Exit with code 0 on success, 1 on failure
 *
 * Usage:
 *   pnpm dlx tsx scripts/apply-migrations-staging-v3.ts
 *
 * Environment Variables Required:
 *   SUPABASE_STAGING_PROJECT_ID - Staging project ref (rvjmwwvkhglcuqwcznph)
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (for API authentication)
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

// Environment validation
const STAGING_PROJECT_ID = process.env.SUPABASE_STAGING_PROJECT_ID || 'rvjmwwvkhglcuqwcznph';
const STAGING_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STAGING_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const SUPABASE_URL = `https://${STAGING_PROJECT_ID}.supabase.co`;

interface Migration {
  filename: string;
  timestamp: string;
  name: string;
  path: string;
  sql: string;
}

/**
 * Execute SQL via Supabase REST API
 */
async function executeSql(sql: string): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': STAGING_SERVICE_KEY,
      'Authorization': `Bearer ${STAGING_SERVICE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (!response.ok) {
    // Fallback: try direct query endpoint
    const directResponse = await fetch(`${SUPABASE_URL}/rest/v1/?sql=${encodeURIComponent(sql)}`, {
      method: 'GET',
      headers: {
        'apikey': STAGING_SERVICE_KEY,
        'Authorization': `Bearer ${STAGING_SERVICE_KEY}`,
      }
    });

    if (!directResponse.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return directResponse.json();
  }

  return response.json();
}

/**
 * Get applied migrations from database
 */
async function getAppliedMigrations(): Promise<string[]> {
  try {
    const sql = `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version`;
    const result = await executeSql(sql);
    return Array.isArray(result) ? result.map((r: any) => r.version) : [];
  } catch (error) {
    console.log('⚠️  Warning: Could not check applied migrations');
    return [];
  }
}

/**
 * Record migration as applied
 */
async function recordMigration(timestamp: string, name: string): Promise<void> {
  const sql = `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${timestamp}', '${name}')`;
  await executeSql(sql);
}

/**
 * Apply migration SQL
 */
async function applyMigration(sql: string): Promise<void> {
  await executeSql(sql);
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔄 Apply Migrations to Staging (v3 - REST API)');
  console.log('================================================');
  console.log(`📦 Staging Project: ${STAGING_PROJECT_ID}`);
  console.log(`🌐 Staging URL: ${SUPABASE_URL}`);
  console.log('');

  // Step 1: Read local migration files
  console.log('📂 Step 1: Reading local migration files...');
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

  let files: string[];
  try {
    files = await readdir(migrationsDir);
  } catch (error) {
    console.error('❌ Error: Could not read migrations directory');
    console.error(`   ${migrationsDir}`);
    process.exit(1);
  }

  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

  if (sqlFiles.length === 0) {
    console.log('✅ No migration files found - nothing to apply');
    process.exit(0);
  }

  const migrations: Migration[] = [];
  for (const file of sqlFiles) {
    const match = file.match(/^(\d+)_(.+)\.sql$/);
    if (!match) {
      console.log(`⚠️  Skipping invalid filename: ${file}`);
      continue;
    }

    const [, timestamp, name] = match;
    const path = join(migrationsDir, file);
    const sql = await readFile(path, 'utf-8');

    migrations.push({
      filename: file,
      timestamp,
      name,
      path,
      sql,
    });
  }

  console.log(`✅ Found ${migrations.length} migration files`);
  console.log('');

  // Step 2: Check applied migrations
  console.log('📊 Step 2: Checking applied migrations in database...');

  const appliedMigrations = await getAppliedMigrations();
  console.log(`✅ Found ${appliedMigrations.length} applied migrations`);
  console.log('');

  // Step 3: Determine pending migrations
  console.log('🔍 Step 3: Determining pending migrations...');
  const appliedSet = new Set(appliedMigrations);
  const pendingMigrations = migrations.filter(m => !appliedSet.has(m.timestamp));

  if (pendingMigrations.length === 0) {
    console.log('✅ No pending migrations - database is up to date');
    console.log('');
    console.log('================================================');
    console.log('✅ Migration check completed successfully');
    console.log('================================================');
    console.log('');
    process.exit(0);
  }

  console.log(`📝 Found ${pendingMigrations.length} pending migrations:`);
  pendingMigrations.forEach(m => {
    console.log(`   - ${m.filename}`);
  });
  console.log('');

  // Step 4: Apply pending migrations
  console.log('🚀 Step 4: Applying pending migrations...');
  console.log('');

  let appliedCount = 0;
  let failedCount = 0;

  for (const migration of pendingMigrations) {
    console.log(`Applying: ${migration.filename}...`);

    try {
      // Apply migration
      await applyMigration(migration.sql);

      // Record migration as applied
      try {
        await recordMigration(migration.timestamp, migration.name);
      } catch (recordError) {
        console.log(`⚠️  Warning: Migration applied but not recorded in schema_migrations`);
      }

      console.log(`✅ Applied: ${migration.filename}`);
      appliedCount++;
    } catch (error: any) {
      console.error(`❌ Failed: ${migration.filename}`);
      console.error(`   Error: ${error.message}`);
      failedCount++;

      // Stop on first failure
      console.log('');
      console.log('================================================');
      console.log('❌ Migration failed - stopping execution');
      console.log('================================================');
      console.log('');
      console.log(`✅ Successfully applied: ${appliedCount} migrations`);
      console.log(`❌ Failed: ${failedCount} migrations`);
      console.log('');
      process.exit(1);
    }
  }

  console.log('');
  console.log('================================================');
  console.log('✅ All migrations applied successfully');
  console.log('================================================');
  console.log('');
  console.log(`✅ Successfully applied: ${appliedCount} migrations`);
  console.log('');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
