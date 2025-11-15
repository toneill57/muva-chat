#!/usr/bin/env tsx
/**
 * Validate SQL Migration Files
 *
 * Purpose: Validate syntax and format of migration files WITHOUT executing them
 *
 * Validations:
 * 1. Filename format: YYYYMMDDHHMMSS_description.sql
 * 2. Basic SQL syntax (common errors)
 * 3. Dangerous commands (DROP DATABASE, TRUNCATE without conditions, etc)
 * 4. File is not empty
 *
 * Usage:
 *   pnpm dlx tsx scripts/validate-migrations.ts
 *
 * Exit codes:
 *   0 - All migrations valid
 *   1 - Validation errors found
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

interface ValidationError {
  file: string;
  line?: number;
  message: string;
}

const errors: ValidationError[] = [];
let validCount = 0;

// Dangerous SQL patterns that should trigger warnings
const dangerousPatterns = [
  { pattern: /DROP\s+DATABASE/i, message: 'DROP DATABASE is forbidden' },
  { pattern: /TRUNCATE\s+(?!.*WHERE)/i, message: 'TRUNCATE without WHERE clause is dangerous' },
  { pattern: /DELETE\s+FROM\s+\w+\s*;/i, message: 'DELETE without WHERE clause is dangerous' },
  { pattern: /DROP\s+SCHEMA\s+public/i, message: 'DROP SCHEMA public is forbidden' },
];

// Common SQL syntax errors
const syntaxPatterns = [
  { pattern: /SELECT\s+.*\s+FORM\s+/i, message: 'Typo: FORM should be FROM' },
  { pattern: /CREAT\s+TABLE/i, message: 'Typo: CREAT should be CREATE' },
  { pattern: /ALERT\s+TABLE/i, message: 'Typo: ALERT should be ALTER' },
  { pattern: /INSRET\s+INTO/i, message: 'Typo: INSRET should be INSERT' },
];

/**
 * Validate migration filename format
 */
function validateFilename(filename: string): boolean {
  // Expected format: YYYYMMDDHHMMSS_description.sql
  const filenamePattern = /^\d{14}_[\w-]+\.sql$/;

  if (!filenamePattern.test(filename)) {
    errors.push({
      file: filename,
      message: 'Invalid filename format. Expected: YYYYMMDDHHMMSS_description.sql',
    });
    return false;
  }

  return true;
}

/**
 * Validate SQL content
 */
function validateContent(filename: string, content: string): boolean {
  let isValid = true;

  // Check if file is empty
  if (content.trim().length === 0) {
    errors.push({
      file: filename,
      message: 'Migration file is empty',
    });
    return false;
  }

  // Check for dangerous patterns
  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(content)) {
      errors.push({
        file: filename,
        message: `DANGEROUS: ${message}`,
      });
      isValid = false;
    }
  }

  // Check for common syntax errors
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const { pattern, message } of syntaxPatterns) {
      if (pattern.test(line)) {
        errors.push({
          file: filename,
          line: i + 1,
          message: `Syntax error: ${message}`,
        });
        isValid = false;
      }
    }
  }

  return isValid;
}

/**
 * Main validation function
 */
async function validateMigrations(): Promise<void> {
  console.log(`${colors.cyan}🔍 Validating migrations...${colors.reset}\n`);

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.log(`${colors.yellow}⚠️  No migrations directory found at: ${migrationsDir}${colors.reset}`);
    console.log(`${colors.green}✅ No migrations to validate${colors.reset}`);
    process.exit(0);
  }

  // Get all .sql files
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log(`${colors.yellow}⚠️  No migration files found${colors.reset}`);
    console.log(`${colors.green}✅ No migrations to validate${colors.reset}`);
    process.exit(0);
  }

  console.log(`Found ${files.length} migration file(s)\n`);

  // Validate each file
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const filenameValid = validateFilename(file);
    const contentValid = validateContent(file, content);

    if (filenameValid && contentValid) {
      console.log(`${colors.green}✅${colors.reset} ${file} - OK`);
      validCount++;
    } else {
      console.log(`${colors.red}❌${colors.reset} ${file} - ERRORS`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));

  if (errors.length === 0) {
    console.log(`${colors.green}✅ All ${validCount} migration(s) are valid${colors.reset}`);
    console.log('='.repeat(60));
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ Found ${errors.length} error(s) in ${files.length - validCount} file(s)${colors.reset}\n`);

    // Print detailed errors
    for (const error of errors) {
      console.log(`${colors.red}ERROR:${colors.reset} ${error.file}`);
      if (error.line) {
        console.log(`  Line ${error.line}: ${error.message}`);
      } else {
        console.log(`  ${error.message}`);
      }
      console.log();
    }

    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Run validation
validateMigrations().catch((error) => {
  console.error(`${colors.red}❌ Validation failed:${colors.reset}`, error);
  process.exit(1);
});
