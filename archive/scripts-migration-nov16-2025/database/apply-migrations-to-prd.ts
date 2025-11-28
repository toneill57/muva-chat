#!/usr/bin/env tsx
/**
 * Apply All Migrations to Production (main) Environment
 *
 * FASE 3.2: Apply 18 migrations to kprqghwdnaykxhostivv (main/prd)
 *
 * Usage:
 *   pnpm dlx tsx scripts/database/apply-migrations-to-prd.ts
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const PROJECT_ID = 'kprqghwdnaykxhostivv'; // main (prd)
const MIGRATIONS_DIR = join(process.cwd(), 'supabase/migrations');

interface MigrationFile {
  filename: string;
  name: string;
  path: string;
  content: string;
}

async function applyMigration(migration: MigrationFile): Promise<void> {
  console.log(`\n📝 Applying: ${migration.filename}`);
  console.log(`   Name: ${migration.name}`);
  console.log(`   Size: ${Math.round(migration.content.length / 1024)}KB`);

  // Here we would call mcp__supabase__apply_migration
  // For now, just log the details
  console.log(`   ✅ Migration prepared for application`);
}

async function main() {
  console.log('🚀 Starting Migration Application to PRD');
  console.log(`📦 Project ID: ${PROJECT_ID}`);
  console.log(`📁 Migrations Directory: ${MIGRATIONS_DIR}\n`);

  // Read all migration files
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Sort chronologically

  console.log(`Found ${files.length} migration files:\n`);

  const migrations: MigrationFile[] = files.map(filename => {
    const path = join(MIGRATIONS_DIR, filename);
    const content = readFileSync(path, 'utf-8');
    const name = filename.replace(/\.sql$/, '');

    return { filename, name, path, content };
  });

  // Display migration list
  migrations.forEach((m, i) => {
    console.log(`${i + 1}. ${m.filename} (${Math.round(m.content.length / 1024)}KB)`);
  });

  console.log(`\n${'='.repeat(80)}\n`);

  // Apply each migration
  for (const migration of migrations) {
    await applyMigration(migration);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`\n✅ All ${migrations.length} migrations prepared for application`);
  console.log(`\nNext: Use MCP tool to apply each migration to ${PROJECT_ID}`);
}

main().catch(console.error);
