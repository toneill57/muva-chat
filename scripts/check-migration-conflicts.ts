#!/usr/bin/env tsx
/**
 * Check Migration Conflicts
 *
 * Purpose: Detect timestamp conflicts and ordering issues in migration files
 *
 * Checks:
 * 1. Duplicate timestamps (two migrations with same timestamp)
 * 2. Chronological order (migrations should be in timestamp order)
 * 3. Timestamp format validation
 *
 * Usage:
 *   pnpm dlx tsx scripts/check-migration-conflicts.ts
 *
 * Exit codes:
 *   0 - No conflicts detected
 *   1 - Conflicts found
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

interface Migration {
  filename: string;
  timestamp: string;
  description: string;
}

const conflicts: string[] = [];

/**
 * Parse migration filename
 */
function parseMigrationFilename(filename: string): Migration | null {
  const match = filename.match(/^(\d{14})_(.+)\.sql$/);

  if (!match) {
    return null;
  }

  return {
    filename,
    timestamp: match[1],
    description: match[2],
  };
}

/**
 * Validate timestamp format
 */
function isValidTimestamp(timestamp: string): boolean {
  if (timestamp.length !== 14) return false;

  const year = parseInt(timestamp.substring(0, 4), 10);
  const month = parseInt(timestamp.substring(4, 6), 10);
  const day = parseInt(timestamp.substring(6, 8), 10);
  const hour = parseInt(timestamp.substring(8, 10), 10);
  const minute = parseInt(timestamp.substring(10, 12), 10);
  const second = parseInt(timestamp.substring(12, 14), 10);

  if (year < 2020 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  if (second < 0 || second > 59) return false;

  return true;
}

/**
 * Main conflict checking function
 */
async function checkMigrationConflicts(): Promise<void> {
  console.log(`${colors.cyan}🔍 Checking migration conflicts...${colors.reset}\n`);

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.log(`${colors.yellow}⚠️  No migrations directory found${colors.reset}`);
    console.log(`${colors.green}✅ No conflicts to check${colors.reset}`);
    process.exit(0);
  }

  // Get all .sql files
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log(`${colors.yellow}⚠️  No migration files found${colors.reset}`);
    console.log(`${colors.green}✅ No conflicts to check${colors.reset}`);
    process.exit(0);
  }

  console.log(`Found ${files.length} migration file(s)\n`);

  // Parse all migrations
  const migrations: Migration[] = [];
  const invalidFiles: string[] = [];

  for (const file of files) {
    const migration = parseMigrationFilename(file);

    if (!migration) {
      invalidFiles.push(file);
      continue;
    }

    // Validate timestamp format
    if (!isValidTimestamp(migration.timestamp)) {
      conflicts.push(`Invalid timestamp format in: ${file} (${migration.timestamp})`);
      continue;
    }

    migrations.push(migration);
  }

  // Check for invalid filenames
  if (invalidFiles.length > 0) {
    conflicts.push(`${invalidFiles.length} file(s) have invalid naming format:`);
    for (const file of invalidFiles) {
      conflicts.push(`  - ${file}`);
    }
  }

  // Check for duplicate timestamps
  const timestampMap = new Map<string, string[]>();

  for (const migration of migrations) {
    const existing = timestampMap.get(migration.timestamp) || [];
    existing.push(migration.filename);
    timestampMap.set(migration.timestamp, existing);
  }

  let duplicatesFound = false;
  for (const [timestamp, filenames] of timestampMap.entries()) {
    if (filenames.length > 1) {
      duplicatesFound = true;
      conflicts.push(`Duplicate timestamp ${timestamp}:`);
      for (const filename of filenames) {
        conflicts.push(`  - ${filename}`);
      }
    }
  }

  // Check chronological order
  let previousTimestamp = '00000000000000';
  let orderIssues = false;

  for (const migration of migrations) {
    if (migration.timestamp < previousTimestamp) {
      orderIssues = true;
      conflicts.push(`Out-of-order migration: ${migration.filename} (${migration.timestamp} < ${previousTimestamp})`);
    }
    previousTimestamp = migration.timestamp;
  }

  // Print results
  console.log('='.repeat(60));

  if (conflicts.length === 0) {
    console.log(`${colors.green}✅ No duplicate timestamps found${colors.reset}`);
    console.log(`${colors.green}✅ Migrations in correct chronological order${colors.reset}`);
    console.log(`${colors.green}✅ No conflicts detected${colors.reset}`);
    console.log('='.repeat(60));
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ Found ${conflicts.length} conflict(s)${colors.reset}\n`);

    for (const conflict of conflicts) {
      console.log(`${colors.red}•${colors.reset} ${conflict}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`${colors.yellow}⚠️  Please resolve conflicts before merging${colors.reset}`);
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Run conflict check
checkMigrationConflicts().catch((error) => {
  console.error(`${colors.red}❌ Conflict check failed:${colors.reset}`, error);
  process.exit(1);
});
