#!/usr/bin/env tsx

/**
 * VALIDATE ENV VARS SCRIPT
 *
 * Purpose: Validate environment variables completeness and format
 * Usage:
 *   pnpm dlx tsx scripts/validate-env-vars.ts --env=dev
 *   pnpm dlx tsx scripts/validate-env-vars.ts --env=staging
 *   pnpm dlx tsx scripts/validate-env-vars.ts --env=production
 *   pnpm dlx tsx scripts/validate-env-vars.ts --all (check all environments)
 *
 * Exit codes:
 *   0 - All validations passed
 *   1 - Critical variables missing or invalid format
 *
 * Features:
 *   - Reads .env.template as reference
 *   - Validates URLs format (https://, .supabase.co)
 *   - Validates keys format (length, characters)
 *   - Validates DATABASE_URL format
 *   - Color-coded output (red errors, yellow warnings, green success)
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type Environment = 'dev' | 'staging' | 'production';

interface ValidationResult {
  env: Environment;
  passed: boolean;
  missing: string[];
  invalid: string[];
  warnings: string[];
}

interface EnvVar {
  name: string;
  value: string | undefined;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Critical variables that MUST be present and valid
const CRITICAL_VARS = {
  common: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
  ],
  optional: [
    'OPENAI_API_KEY', // Optional, only needed for embeddings
    'SUPABASE_ACCESS_TOKEN', // Optional, only for MCP/branching
    'DATABASE_URL', // Optional, direct PostgreSQL access
    'SUPABASE_DB_PASSWORD', // Optional, for pg_dump/psql
    'JWT_SECRET', // Optional in some contexts
  ]
};

// Environment-specific file mapping
const ENV_FILES: Record<Environment, string> = {
  dev: '.env.dev',
  staging: '.env.staging',
  production: '.env.production',
};

// Supabase project refs (for validation)
const SUPABASE_PROJECTS: Record<Environment, string> = {
  dev: 'iyeueszchbvlutlcmvcb',
  staging: 'bddcvjoeoiekzfetvxoe',
  production: 'kprqghwdnaykxhostivv',
};

// ============================================================================
// ANSI COLOR CODES
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function parseArgs(): { environments: Environment[], showHelp: boolean } {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    return { environments: [], showHelp: true };
  }

  const envArg = args.find(arg => arg.startsWith('--env='));
  const allFlag = args.includes('--all');

  if (allFlag) {
    return { environments: ['dev', 'staging', 'production'], showHelp: false };
  }

  if (envArg) {
    const env = envArg.split('=')[1] as Environment;
    if (!['dev', 'staging', 'production'].includes(env)) {
      console.error(`${colors.red}❌ Invalid environment: ${env}${colors.reset}`);
      console.error(`   Valid options: dev, staging, production`);
      process.exit(1);
    }
    return { environments: [env], showHelp: false };
  }

  // Default: check local .env.local if exists, otherwise error
  return { environments: [], showHelp: false };
}

function displayHelp() {
  console.log(`
${colors.bold}VALIDATE ENV VARS SCRIPT${colors.reset}
${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.bold}Usage:${colors.reset}
  pnpm dlx tsx scripts/validate-env-vars.ts --env=<environment>
  pnpm dlx tsx scripts/validate-env-vars.ts --all

${colors.bold}Options:${colors.reset}
  --env=dev          Validate .env.dev
  --env=staging      Validate .env.staging
  --env=production   Validate .env.production
  --all              Validate all environments
  --help, -h         Show this help message

${colors.bold}Exit Codes:${colors.reset}
  0 - All validations passed
  1 - Critical variables missing or invalid format

${colors.bold}Examples:${colors.reset}
  ${colors.cyan}# Validate staging environment${colors.reset}
  pnpm dlx tsx scripts/validate-env-vars.ts --env=staging

  ${colors.cyan}# Validate all environments at once${colors.reset}
  pnpm dlx tsx scripts/validate-env-vars.ts --all
`);
}

function readEnvFile(filePath: string): Record<string, string> {
  const envVars: Record<string, string> = {};

  if (!fs.existsSync(filePath)) {
    return envVars;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) {
      continue;
    }

    // Parse KEY=VALUE
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Remove quotes if present
      envVars[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  return envVars;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateSupabaseUrl(url: string | undefined, env: Environment): { valid: boolean, error?: string } {
  if (!url) {
    return { valid: false, error: 'URL is missing' };
  }

  // Must start with https://
  if (!url.startsWith('https://')) {
    return { valid: false, error: 'URL must start with https://' };
  }

  // Must end with .supabase.co
  if (!url.endsWith('.supabase.co')) {
    return { valid: false, error: 'URL must end with .supabase.co' };
  }

  // Check project ref matches expected
  const expectedRef = SUPABASE_PROJECTS[env];
  if (!url.includes(expectedRef)) {
    return {
      valid: false,
      error: `URL should contain project ref "${expectedRef}" for ${env} environment`
    };
  }

  return { valid: true };
}

function validateSupabaseKey(key: string | undefined, keyType: 'anon' | 'service_role'): { valid: boolean, error?: string } {
  if (!key) {
    return { valid: false, error: 'Key is missing' };
  }

  // Must start with eyJ (JWT format)
  if (!key.startsWith('eyJ')) {
    return { valid: false, error: 'Key must be a valid JWT (start with eyJ)' };
  }

  // Check minimum length (JWT tokens are usually 200+ chars)
  if (key.length < 100) {
    return { valid: false, error: `Key too short (${key.length} chars, expected 100+)` };
  }

  // Check it has 3 parts (header.payload.signature)
  const parts = key.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Key must have 3 parts (JWT format)' };
  }

  return { valid: true };
}

function validateDatabaseUrl(url: string | undefined, env: Environment): { valid: boolean, error?: string } {
  if (!url) {
    return { valid: false, error: 'DATABASE_URL is missing' };
  }

  // Must start with postgresql://
  if (!url.startsWith('postgresql://')) {
    return { valid: false, error: 'DATABASE_URL must start with postgresql://' };
  }

  // Must contain project ref
  const expectedRef = SUPABASE_PROJECTS[env];
  if (!url.includes(expectedRef)) {
    return {
      valid: false,
      error: `DATABASE_URL should contain project ref "${expectedRef}"`
    };
  }

  // Must contain pooler.supabase.com
  if (!url.includes('pooler.supabase.com')) {
    return { valid: false, error: 'DATABASE_URL should use pooler.supabase.com' };
  }

  return { valid: true };
}

function validateAnthropicKey(key: string | undefined): { valid: boolean, error?: string, warning?: string } {
  if (!key) {
    return { valid: false, error: 'ANTHROPIC_API_KEY is missing' };
  }

  // Check for placeholder syntax (${VAR})
  if (key.startsWith('${') && key.endsWith('}')) {
    return {
      valid: true,
      warning: 'Using placeholder syntax - ensure variable is set at runtime'
    };
  }

  // Check for environment variable reference
  if (key.startsWith('$')) {
    return {
      valid: true,
      warning: 'Using environment variable reference - ensure it is set'
    };
  }

  // Must start with sk-ant-
  if (!key.startsWith('sk-ant-')) {
    return { valid: false, error: 'Key must start with sk-ant-' };
  }

  // Check minimum length
  if (key.length < 50) {
    return { valid: false, error: `Key too short (${key.length} chars, expected 50+)` };
  }

  return { valid: true };
}

function validateOpenAIKey(key: string | undefined): { valid: boolean, error?: string } {
  if (!key) {
    // OpenAI is optional
    return { valid: true };
  }

  // Must start with sk-proj- or sk-
  if (!key.startsWith('sk-proj-') && !key.startsWith('sk-')) {
    return { valid: false, error: 'Key must start with sk-proj- or sk-' };
  }

  // Check minimum length
  if (key.length < 40) {
    return { valid: false, error: `Key too short (${key.length} chars, expected 40+)` };
  }

  return { valid: true };
}

// ============================================================================
// MAIN VALIDATION LOGIC
// ============================================================================

function validateEnvironment(env: Environment): ValidationResult {
  const result: ValidationResult = {
    env,
    passed: true,
    missing: [],
    invalid: [],
    warnings: [],
  };

  const envFilePath = path.join(process.cwd(), ENV_FILES[env]);

  // Check if file exists
  if (!fs.existsSync(envFilePath)) {
    result.passed = false;
    result.missing.push(`File ${ENV_FILES[env]} does not exist`);
    return result;
  }

  const envVars = readEnvFile(envFilePath);

  // Validate NEXT_PUBLIC_SUPABASE_URL
  const urlValidation = validateSupabaseUrl(envVars.NEXT_PUBLIC_SUPABASE_URL, env);
  if (!urlValidation.valid) {
    result.passed = false;
    result.invalid.push(`NEXT_PUBLIC_SUPABASE_URL: ${urlValidation.error}`);
  }

  // Validate NEXT_PUBLIC_SUPABASE_ANON_KEY
  const anonKeyValidation = validateSupabaseKey(envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'anon');
  if (!anonKeyValidation.valid) {
    result.passed = false;
    result.invalid.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKeyValidation.error}`);
  }

  // Validate SUPABASE_SERVICE_ROLE_KEY
  const serviceKeyValidation = validateSupabaseKey(envVars.SUPABASE_SERVICE_ROLE_KEY, 'service_role');
  if (!serviceKeyValidation.valid) {
    result.passed = false;
    result.invalid.push(`SUPABASE_SERVICE_ROLE_KEY: ${serviceKeyValidation.error}`);
  }

  // Validate ANTHROPIC_API_KEY
  const anthropicValidation = validateAnthropicKey(envVars.ANTHROPIC_API_KEY);
  if (!anthropicValidation.valid) {
    result.passed = false;
    result.invalid.push(`ANTHROPIC_API_KEY: ${anthropicValidation.error}`);
  } else if (anthropicValidation.warning) {
    result.warnings.push(`ANTHROPIC_API_KEY: ${anthropicValidation.warning}`);
  }

  // Validate DATABASE_URL (optional but recommended)
  if (envVars.DATABASE_URL) {
    const dbUrlValidation = validateDatabaseUrl(envVars.DATABASE_URL, env);
    if (!dbUrlValidation.valid) {
      result.warnings.push(`DATABASE_URL: ${dbUrlValidation.error}`);
    }
  } else {
    result.warnings.push('DATABASE_URL: Not set (optional, but needed for migrations)');
  }

  // Validate OPENAI_API_KEY (optional)
  if (envVars.OPENAI_API_KEY) {
    const openaiValidation = validateOpenAIKey(envVars.OPENAI_API_KEY);
    if (!openaiValidation.valid) {
      result.warnings.push(`OPENAI_API_KEY: ${openaiValidation.error}`);
    }
  } else {
    result.warnings.push('OPENAI_API_KEY: Not set (optional, only for embeddings)');
  }

  // Check other optional vars
  if (!envVars.SUPABASE_ACCESS_TOKEN) {
    result.warnings.push('SUPABASE_ACCESS_TOKEN: Not set (needed for MCP tools & branch management)');
  }

  if (!envVars.SUPABASE_DB_PASSWORD) {
    result.warnings.push('SUPABASE_DB_PASSWORD: Not set (needed for pg_dump/psql operations)');
  }

  if (!envVars.JWT_SECRET && !envVars.JWT_SECRET_KEY) {
    result.warnings.push('JWT_SECRET: Not set (needed for guest authentication)');
  }

  return result;
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

function printResult(result: ValidationResult) {
  const envLabel = result.env.toUpperCase().padEnd(10);
  const statusIcon = result.passed ? '✅' : '❌';
  const statusColor = result.passed ? colors.green : colors.red;

  console.log(`\n${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}Environment: ${result.env.toUpperCase()}${colors.reset} (${ENV_FILES[result.env]})`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // Missing variables
  if (result.missing.length > 0) {
    console.log(`${colors.red}${colors.bold}❌ Missing:${colors.reset}`);
    result.missing.forEach(msg => {
      console.log(`   ${colors.red}• ${msg}${colors.reset}`);
    });
    console.log();
  }

  // Invalid variables
  if (result.invalid.length > 0) {
    console.log(`${colors.red}${colors.bold}❌ Invalid Format:${colors.reset}`);
    result.invalid.forEach(msg => {
      console.log(`   ${colors.red}• ${msg}${colors.reset}`);
    });
    console.log();
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  Warnings:${colors.reset}`);
    result.warnings.forEach(msg => {
      console.log(`   ${colors.yellow}• ${msg}${colors.reset}`);
    });
    console.log();
  }

  // Summary
  if (result.passed) {
    console.log(`${colors.green}${colors.bold}✅ All critical variables are valid${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bold}❌ Validation failed - fix errors above${colors.reset}`);
  }
}

function printSummary(results: ValidationResult[]) {
  console.log(`\n${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}VALIDATION SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  results.forEach(result => {
    const statusIcon = result.passed ? '✅' : '❌';
    const statusColor = result.passed ? colors.green : colors.red;
    const envLabel = result.env.toUpperCase().padEnd(12);

    console.log(`${statusColor}${statusIcon} ${envLabel}${colors.reset} ${result.passed ? 'PASSED' : 'FAILED'}`);
  });

  const allPassed = results.every(r => r.passed);
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  console.log();
  console.log(`${colors.bold}Total: ${passedCount}/${totalCount} environments passed${colors.reset}`);

  if (allPassed) {
    console.log();
    console.log(`${colors.green}${colors.bold}✅ All environments validated successfully${colors.reset}`);
    console.log();
  } else {
    console.log();
    console.log(`${colors.red}${colors.bold}❌ Some environments have issues - review logs above${colors.reset}`);
    console.log();
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log(`${colors.bold}${colors.cyan}
╔═══════════════════════════════════════════════════╗
║     ENVIRONMENT VARIABLES VALIDATION SCRIPT       ║
╚═══════════════════════════════════════════════════╝
${colors.reset}`);

  const { environments, showHelp } = parseArgs();

  if (showHelp) {
    displayHelp();
    process.exit(0);
  }

  if (environments.length === 0) {
    console.error(`${colors.red}❌ No environment specified${colors.reset}`);
    console.error(`   Use --env=<env> or --all`);
    console.error(`   Run with --help for more information`);
    process.exit(1);
  }

  const results: ValidationResult[] = [];

  for (const env of environments) {
    const result = validateEnvironment(env);
    results.push(result);
    printResult(result);
  }

  if (results.length > 1) {
    printSummary(results);
  }

  // Exit with error if any validation failed
  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
