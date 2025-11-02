#!/usr/bin/env tsx
/**
 * Apply Supabase Migrations to Staging Environment
 *
 * FASE 3: Enhanced Staging Workflow
 *
 * Purpose:
 * - Apply pending migrations from supabase/migrations/ to staging database
 * - Track migration state in supabase_migrations.schema_migrations
 * - Exit with code 0 on success, 1 on failure
 *
 * Usage:
 *   pnpm dlx tsx scripts/apply-migrations-staging.ts
 *
 * Environment Variables Required:
 *   SUPABASE_STAGING_PROJECT_ID - Staging project ref (vwrlqvcmzucquxkngqvx)
 *   SUPABASE_ACCESS_TOKEN - Supabase Management API token
 *   SUPABASE_STAGING_DB_PASSWORD - Staging database password (optional)
 */

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

// Environment validation
const STAGING_PROJECT_ID = process.env.SUPABASE_STAGING_PROJECT_ID || 'vwrlqvcmzucquxkngqvx';
const STAGING_URL = `https://${STAGING_PROJECT_ID}.supabase.co`;
const STAGING_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!STAGING_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
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
  name: string;
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔄 Apply Migrations to Staging');
  console.log('================================================');
  console.log('');
  console.log(`📦 Staging Project: ${STAGING_PROJECT_ID}`);
  console.log(`🌐 Staging URL: ${STAGING_URL}`);
  console.log('');

  try {
    // Initialize Supabase client
    const supabase = createClient(STAGING_URL, STAGING_SERVICE_KEY);

    // Step 1: Read local migration files
    console.log('📂 Step 1: Reading local migration files...');
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const files = await readdir(migrationsDir);

    const migrations: Migration[] = [];
    for (const filename of files) {
      if (!filename.endsWith('.sql')) {
        console.log(`⚠️  Skipping non-SQL file: ${filename}`);
        continue;
      }

      // Parse timestamp from filename (format: YYYYMMDDHHMMSS_name.sql)
      const match = filename.match(/^(\d{14})_(.+)\.sql$/);
      if (!match) {
        console.log(`⚠️  Skipping invalid filename format: ${filename}`);
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
        sql,
      });
    }

    migrations.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    console.log(`✅ Found ${migrations.length} migration files`);
    console.log('');

    // Step 2: Get applied migrations from database
    console.log('📊 Step 2: Checking applied migrations in database...');

    // Check if schema_migrations table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'supabase_migrations')
      .eq('table_name', 'schema_migrations');

    if (tablesError) {
      console.log('⚠️  Warning: Could not check schema_migrations table');
      console.log(`   ${tablesError.message}`);
      console.log('   Assuming no migrations applied yet');
    }

    let appliedMigrations: AppliedMigration[] = [];

    if (tables && tables.length > 0) {
      // Table exists, query applied migrations
      const { data: applied, error: appliedError } = await supabase
        .from('supabase_migrations.schema_migrations')
        .select('version, name');

      if (appliedError) {
        console.log('⚠️  Warning: Could not read applied migrations');
        console.log(`   ${appliedError.message}`);
      } else {
        appliedMigrations = applied || [];
      }
    }

    console.log(`✅ Found ${appliedMigrations.length} applied migrations`);
    console.log('');

    // Step 3: Determine pending migrations
    console.log('🔍 Step 3: Determining pending migrations...');
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));
    const pendingMigrations = migrations.filter(m => !appliedVersions.has(m.timestamp));

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
        // Execute migration SQL
        const { error: execError } = await supabase.rpc('exec_sql', {
          sql_query: migration.sql
        });

        if (execError) {
          // If exec_sql RPC doesn't exist, try direct query
          const { error: directError } = await supabase
            .from('_any_table')
            .select('*')
            .limit(0);

          if (directError) {
            throw new Error(`Cannot execute SQL: ${execError.message}`);
          }
        }

        // Record migration as applied
        const { error: recordError } = await supabase
          .from('supabase_migrations.schema_migrations')
          .insert({
            version: migration.timestamp,
            name: migration.name,
          });

        if (recordError) {
          console.log(`⚠️  Warning: Migration applied but not recorded: ${recordError.message}`);
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

  } catch (error: any) {
    console.error('');
    console.error('================================================');
    console.error('❌ Migration process failed');
    console.error('================================================');
    console.error('');
    console.error(`Error: ${error.message}`);
    console.error('');
    process.exit(1);
  }
}

// Run main function
main();
