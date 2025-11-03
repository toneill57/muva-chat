#!/usr/bin/env tsx
/**
 * Apply Supabase Migrations to Staging Environment - V4
 *
 * FASE 3: Enhanced Staging Workflow
 *
 * Purpose:
 * - Apply pending migrations from supabase/migrations/ to staging database
 * - Uses MCP tools instead of psql/REST API (works with ANY Supabase plan)
 * - Track migration state in supabase_migrations.schema_migrations
 * - Exit with code 0 on success, 1 on failure
 *
 * Usage:
 *   pnpm dlx tsx scripts/apply-migrations-staging-v4.ts
 *
 * NOTE: This script simulates MCP tool calls by using Supabase Management API
 * directly, as MCP tools aren't available in GitHub Actions environment.
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

// Environment validation
const STAGING_PROJECT_ID = process.env.SUPABASE_STAGING_PROJECT_ID || 'rvjmwwvkhglcuqwcznph';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ Error: SUPABASE_ACCESS_TOKEN environment variable not set');
  console.error('   This token is required for Management API access');
  process.exit(1);
}

interface Migration {
  filename: string;
  timestamp: string;
  name: string;
  path: string;
  sql: string;
}

interface AppliedMigration {
  version: string;
  name?: string;
  executed_at?: string;
}

/**
 * Simulates mcp__supabase__list_migrations by calling Management API
 */
async function listMigrations(): Promise<AppliedMigration[]> {
  try {
    // Use Management API to execute SQL query
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${STAGING_PROJECT_ID}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            SELECT version, name
            FROM supabase_migrations.schema_migrations
            ORDER BY version ASC
          `
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to list migrations:', error);
      return [];
    }

    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('❌ Error listing migrations:', error);
    return [];
  }
}

/**
 * Simulates mcp__supabase__apply_migration by calling Management API
 */
async function applyMigration(name: string, sql: string, version: string): Promise<boolean> {
  try {
    console.log(`\n📝 Applying migration: ${name} (${version})`);

    // Use Management API to apply migration
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${STAGING_PROJECT_ID}/database/migrations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          version: version,
          statements: [sql]
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Migration failed:', error);

      // Try alternative approach: direct SQL execution via query endpoint
      console.log('   Trying alternative approach via query endpoint...');

      const altResponse = await fetch(
        `https://api.supabase.com/v1/projects/${STAGING_PROJECT_ID}/database/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: sql
          })
        }
      );

      if (!altResponse.ok) {
        const altError = await altResponse.text();
        console.error('❌ Alternative approach also failed:', altError);
        return false;
      }

      // Record migration in schema_migrations table
      const recordResponse = await fetch(
        `https://api.supabase.com/v1/projects/${STAGING_PROJECT_ID}/database/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: `
              INSERT INTO supabase_migrations.schema_migrations (version, name)
              VALUES ('${version}', '${name}')
              ON CONFLICT (version) DO NOTHING
            `
          })
        }
      );

      if (!recordResponse.ok) {
        console.error('⚠️  Warning: Migration applied but not recorded in schema_migrations');
      }
    }

    console.log(`✅ Migration applied successfully: ${name}`);
    return true;
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    return false;
  }
}

/**
 * Load migrations from filesystem
 */
async function loadMigrations(): Promise<Migration[]> {
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

  try {
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    const migrations: Migration[] = [];

    for (const filename of sqlFiles) {
      const match = filename.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        console.warn(`⚠️  Skipping invalid filename: ${filename}`);
        continue;
      }

      const [, timestamp, name] = match;
      const path = join(migrationsDir, filename);
      const sql = await readFile(path, 'utf-8');

      migrations.push({
        filename,
        timestamp,
        name,
        path,
        sql
      });
    }

    return migrations;
  } catch (error) {
    console.error('❌ Error loading migrations:', error);
    return [];
  }
}

async function main() {
  console.log('');
  console.log('🚀 MUVA Chat - Staging Migration Runner v4');
  console.log('==========================================');
  console.log(`📦 Project: ${STAGING_PROJECT_ID}`);
  console.log(`🔧 Using: MCP-compatible Management API approach`);
  console.log('');

  // Step 1: Load local migrations
  console.log('📂 Loading local migrations...');
  const localMigrations = await loadMigrations();
  console.log(`   Found ${localMigrations.length} migration files`);

  if (localMigrations.length === 0) {
    console.log('✅ No migrations found to apply');
    process.exit(0);
  }

  // Step 2: Get applied migrations
  console.log('\n🔍 Checking applied migrations...');
  const appliedMigrations = await listMigrations();
  const appliedVersions = new Set(appliedMigrations.map(m => m.version));
  console.log(`   Found ${appliedMigrations.length} applied migrations`);

  // Step 3: Find pending migrations
  const pendingMigrations = localMigrations.filter(
    m => !appliedVersions.has(m.timestamp)
  );

  if (pendingMigrations.length === 0) {
    console.log('\n✅ All migrations are already applied');
    process.exit(0);
  }

  console.log(`\n📋 ${pendingMigrations.length} pending migrations to apply:`);
  pendingMigrations.forEach(m => {
    console.log(`   - ${m.timestamp}_${m.name}`);
  });

  // Step 4: Apply pending migrations
  console.log('\n🚀 Applying migrations...');
  let successCount = 0;
  let failureCount = 0;

  for (const migration of pendingMigrations) {
    const success = await applyMigration(
      migration.name,
      migration.sql,
      migration.timestamp
    );

    if (success) {
      successCount++;
    } else {
      failureCount++;
      console.error(`❌ Failed to apply: ${migration.filename}`);
      console.error('   Stopping migration process');
      break; // Stop on first failure
    }
  }

  // Step 5: Summary
  console.log('\n========================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Applied: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`   ⏳ Skipped: ${pendingMigrations.length - successCount - failureCount}`);
  console.log('========================================\n');

  // Exit with appropriate code
  if (failureCount > 0) {
    console.error('❌ Migration process failed');
    process.exit(1);
  }

  console.log('✅ All migrations applied successfully');
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run main function
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});