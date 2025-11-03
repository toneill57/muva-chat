#!/usr/bin/env tsx
/**
 * Check for Pending Migrations
 *
 * FASE 3: Enhanced Staging Workflow
 *
 * Purpose:
 * - Compare local migration files with applied migrations in database
 * - Exit with code 0 if all migrations are applied
 * - Exit with code 1 if pending migrations are found
 * - Used by CI/CD to enforce migration application before deployment
 *
 * Usage:
 *   pnpm dlx tsx scripts/check-pending-migrations.ts
 *
 * Environment Variables:
 *   SUPABASE_STAGING_PROJECT_ID - Staging project ref
 *   SUPABASE_ACCESS_TOKEN - Management API token
 */

import { readdir } from 'fs/promises';
import { join } from 'path';

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
}

interface AppliedMigration {
  version: string;
  name?: string;
  executed_at?: string;
}

/**
 * Execute SQL query via Management API
 */
async function executeQuery(query: string): Promise<any> {
  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${STAGING_PROJECT_ID}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Query failed: ${error}`);
    }

    const data = await response.json();
    // Management API can return data in different formats
    // Try multiple possible response structures
    return data.result || data.data || data || [];
  } catch (error) {
    console.error('❌ Query execution error:', error);
    throw error;
  }
}

/**
 * Get list of applied migrations from database
 */
async function getAppliedMigrations(): Promise<AppliedMigration[]> {
  try {
    const query = `
      SELECT version, name
      FROM supabase_migrations.schema_migrations
      ORDER BY version ASC
    `;

    return await executeQuery(query);
  } catch (error) {
    console.error('❌ Failed to get applied migrations:', error);
    // Return empty array to treat all as pending
    return [];
  }
}

/**
 * Load migration files from filesystem
 */
async function loadLocalMigrations(): Promise<Migration[]> {
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

      migrations.push({
        filename,
        timestamp,
        name
      });
    }

    return migrations;
  } catch (error) {
    console.error('❌ Error loading local migrations:', error);
    return [];
  }
}

async function main() {
  console.log('');
  console.log('🔍 MUVA Chat - Migration Status Check');
  console.log('=====================================');
  console.log(`📦 Project: ${STAGING_PROJECT_ID}`);
  console.log('');

  // Load local migrations
  console.log('📂 Loading local migrations...');
  const localMigrations = await loadLocalMigrations();
  console.log(`   Found ${localMigrations.length} local migration files`);

  if (localMigrations.length === 0) {
    console.log('✅ No migrations to check');
    process.exit(0);
  }

  // Get applied migrations
  console.log('');
  console.log('🔍 Checking applied migrations in database...');
  const appliedMigrations = await getAppliedMigrations();
  const appliedVersions = new Set(appliedMigrations.map(m => m.version));
  console.log(`   Found ${appliedMigrations.length} applied migrations`);

  // Find pending migrations
  const pendingMigrations = localMigrations.filter(
    m => !appliedVersions.has(m.timestamp)
  );

  // Display status
  console.log('');
  console.log('📊 Migration Status:');
  console.log('-------------------');

  // Show applied migrations
  if (appliedMigrations.length > 0) {
    console.log('✅ Applied migrations:');
    appliedMigrations.forEach(m => {
      const localMig = localMigrations.find(l => l.timestamp === m.version);
      const name = localMig ? localMig.name : m.name || 'unknown';
      console.log(`   ✓ ${m.version}_${name}`);
    });
  }

  // Show pending migrations
  if (pendingMigrations.length > 0) {
    console.log('');
    console.log('⏳ Pending migrations:');
    pendingMigrations.forEach(m => {
      console.log(`   ✗ ${m.filename}`);
    });
  }

  // Summary and exit
  console.log('');
  console.log('=====================================');

  if (pendingMigrations.length === 0) {
    console.log('✅ All migrations are applied');
    console.log('   Deployment can proceed');
    console.log('=====================================');
    console.log('');
    process.exit(0);
  } else {
    console.log(`❌ ${pendingMigrations.length} pending migration(s) found`);
    console.log('');
    console.log('   DEPLOYMENT BLOCKED');
    console.log('');
    console.log('   To fix this issue:');
    console.log('   1. Apply migrations manually via Supabase Dashboard');
    console.log('   2. Or use: pnpm dlx tsx scripts/apply-migrations-staging-v4.ts');
    console.log('   3. Then push again to trigger deployment');
    console.log('=====================================');
    console.log('');
    process.exit(1);
  }
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