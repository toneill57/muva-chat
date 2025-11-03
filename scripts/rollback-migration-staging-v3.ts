#!/usr/bin/env tsx
/**
 * Rollback Staging Migration - V3
 *
 * FASE 3: Enhanced Staging Workflow
 *
 * Purpose:
 * - Remove migration record from schema_migrations table
 * - Uses MCP-compatible approach (Management API)
 * - IMPORTANT: Does NOT revert schema changes (only removes record)
 *
 * Usage:
 *   pnpm dlx tsx scripts/rollback-migration-staging-v3.ts <migration_version>
 *
 * Example:
 *   pnpm dlx tsx scripts/rollback-migration-staging-v3.ts 20251101120000
 *
 * Exit codes:
 *   0 - Rollback successful
 *   1 - Rollback failed
 */

const STAGING_PROJECT_ID = process.env.SUPABASE_STAGING_PROJECT_ID || 'rvjmwwvkhglcuqwcznph';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ Error: SUPABASE_ACCESS_TOKEN environment variable not set');
  console.error('   This token is required for Management API access');
  process.exit(1);
}

// Get migration version from command line
const migrationVersion = process.argv[2];

if (!migrationVersion) {
  console.error('❌ Error: Migration version required');
  console.error('');
  console.error('Usage: pnpm dlx tsx scripts/rollback-migration-staging-v3.ts <migration_version>');
  console.error('');
  console.error('Example: pnpm dlx tsx scripts/rollback-migration-staging-v3.ts 20251101120000');
  process.exit(1);
}

/**
 * Execute SQL query via Management API
 * Simulates mcp__supabase__execute_sql
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
 * Check if migration exists
 */
async function checkMigrationExists(version: string): Promise<boolean> {
  try {
    const query = `
      SELECT version, name
      FROM supabase_migrations.schema_migrations
      WHERE version = '${version}'
    `;

    const result = await executeQuery(query);
    return result.length > 0;
  } catch (error) {
    console.error('❌ Failed to check migration existence:', error);
    return false;
  }
}

/**
 * Get migration details
 */
async function getMigrationDetails(version: string): Promise<any> {
  try {
    const query = `
      SELECT version, name
      FROM supabase_migrations.schema_migrations
      WHERE version = '${version}'
    `;

    const result = await executeQuery(query);
    return result[0] || null;
  } catch (error) {
    console.error('❌ Failed to get migration details:', error);
    return null;
  }
}

/**
 * Delete migration record
 */
async function deleteMigrationRecord(version: string): Promise<boolean> {
  try {
    const query = `
      DELETE FROM supabase_migrations.schema_migrations
      WHERE version = '${version}'
    `;

    await executeQuery(query);

    // Verify deletion
    const stillExists = await checkMigrationExists(version);
    return !stillExists;
  } catch (error) {
    console.error('❌ Failed to delete migration record:', error);
    return false;
  }
}

/**
 * List recent migrations for context
 */
async function listRecentMigrations(): Promise<any[]> {
  try {
    const query = `
      SELECT version, name
      FROM supabase_migrations.schema_migrations
      ORDER BY version DESC
      LIMIT 10
    `;

    return await executeQuery(query);
  } catch (error) {
    console.error('⚠️  Could not list recent migrations:', error);
    return [];
  }
}

async function main() {
  console.log('');
  console.log('⏪ MUVA Chat - Staging Migration Rollback v3');
  console.log('============================================');
  console.log(`📦 Project: ${STAGING_PROJECT_ID}`);
  console.log(`🔧 Using: MCP-compatible Management API approach`);
  console.log(`📋 Migration: ${migrationVersion}`);
  console.log('');

  console.log('⚠️  IMPORTANT WARNING:');
  console.log('   This tool only removes the migration record from schema_migrations table.');
  console.log('   It does NOT revert schema changes (CREATE TABLE, ALTER TABLE, etc).');
  console.log('   You must manually revert schema changes if needed.');
  console.log('');

  // Step 1: Check if migration exists
  console.log('🔍 Checking migration status...');
  const migrationExists = await checkMigrationExists(migrationVersion);

  if (!migrationExists) {
    console.error(`❌ Migration ${migrationVersion} not found in schema_migrations`);
    console.log('');
    console.log('📋 Recent migrations in database:');
    const recentMigrations = await listRecentMigrations();
    if (recentMigrations.length > 0) {
      recentMigrations.forEach(m => {
        console.log(`   - ${m.version}: ${m.name || 'unnamed'}`);
      });
    } else {
      console.log('   No migrations found');
    }
    process.exit(1);
  }

  // Step 2: Get migration details
  const migrationDetails = await getMigrationDetails(migrationVersion);
  if (migrationDetails) {
    console.log('');
    console.log('📄 Migration details:');
    console.log(`   Version: ${migrationDetails.version}`);
    console.log(`   Name: ${migrationDetails.name || 'unnamed'}`);
  }

  // Step 3: Delete migration record
  console.log('');
  console.log('🗑️  Deleting migration record...');
  const success = await deleteMigrationRecord(migrationVersion);

  if (!success) {
    console.error('❌ Failed to delete migration record');
    process.exit(1);
  }

  console.log('✅ Migration record deleted successfully');

  // Step 4: Show remaining migrations
  console.log('');
  console.log('📋 Remaining migrations after rollback:');
  const remainingMigrations = await listRecentMigrations();
  if (remainingMigrations.length > 0) {
    remainingMigrations.slice(0, 5).forEach(m => {
      console.log(`   - ${m.version}: ${m.name || 'unnamed'}`);
    });
    if (remainingMigrations.length > 5) {
      console.log(`   ... and ${remainingMigrations.length - 5} more`);
    }
  } else {
    console.log('   No migrations remaining');
  }

  // Final reminder
  console.log('');
  console.log('========================================');
  console.log('⚠️  REMINDER:');
  console.log('   Migration record has been removed.');
  console.log('   Schema changes were NOT reverted.');
  console.log('   ');
  console.log('   To fully rollback, you must:');
  console.log('   1. Manually revert schema changes');
  console.log('   2. Test thoroughly before re-applying');
  console.log('========================================');
  console.log('');

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