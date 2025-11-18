#!/usr/bin/env tsx
/**
 * Setup Supabase Branch - Automated Branch Creation Script
 *
 * Usage:
 *   pnpm dlx tsx scripts/setup-supabase-branch.ts --name <branch-name> [--with-data]
 *
 * Examples:
 *   pnpm dlx tsx scripts/setup-supabase-branch.ts --name staging
 *   pnpm dlx tsx scripts/setup-supabase-branch.ts --name feature-xyz --with-data
 *
 * Environment Variables Required:
 *   SUPABASE_ACCESS_TOKEN - Get from https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_ID - Parent project ID (default: iyeueszchbvlutlcmvcb)
 */

import { parseArgs } from 'node:util';

// Configuration
const PARENT_PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'iyeueszchbvlutlcmvcb';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const API_BASE = 'https://api.supabase.com/v1';

interface BranchResponse {
  id: string;
  project_id: number;
  name: string;
  git_branch?: string;
  project_ref: string;
  status: string;
  created_at: string;
}

interface ProjectKeysResponse {
  anon: string;
  service_role: string;
}

interface DatabasePasswordResponse {
  password: string;
}

async function checkEnvironment() {
  if (!ACCESS_TOKEN) {
    console.error('❌ Error: SUPABASE_ACCESS_TOKEN environment variable not set');
    console.error('\nGet your access token from: https://supabase.com/dashboard/account/tokens');
    console.error('Then set it in your .env.local file or export it:\n');
    console.error('  export SUPABASE_ACCESS_TOKEN=your_token_here\n');
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
  console.log(`   Parent Project: ${PARENT_PROJECT_ID}`);
}

async function createBranch(branchName: string, withData: boolean = false): Promise<BranchResponse> {
  console.log(`\n📋 Creating branch: ${branchName}`);
  console.log(`   Copy data: ${withData ? 'Yes' : 'No (schema only)'}`);

  const response = await fetch(`${API_BASE}/projects/${PARENT_PROJECT_ID}/branches`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      branch_name: branchName,
      git_branch: branchName, // Sync with Git branch name
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create branch: ${JSON.stringify(error)}`);
  }

  const branch: BranchResponse = await response.json();
  console.log('✅ Branch created successfully');
  console.log(`   Branch ID: ${branch.id}`);
  console.log(`   Project Ref: ${branch.project_ref}`);
  console.log(`   Status: ${branch.status}`);

  return branch;
}

async function getBranchKeys(projectRef: string): Promise<ProjectKeysResponse> {
  console.log('\n🔑 Fetching API keys...');

  const response = await fetch(`${API_BASE}/projects/${projectRef}/api-keys`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch API keys');
  }

  const keys = await response.json();
  console.log('✅ API keys retrieved');

  return keys;
}

async function getDatabasePassword(projectRef: string): Promise<string> {
  console.log('\n🔐 Fetching database password...');

  const response = await fetch(`${API_BASE}/projects/${projectRef}/database/password`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    console.log('⚠️  Could not fetch database password automatically');
    console.log('   You can get it from: Supabase Dashboard → Project Settings → Database');
    return 'GET_FROM_DASHBOARD';
  }

  const data: DatabasePasswordResponse = await response.json();
  console.log('✅ Database password retrieved');

  return data.password;
}

async function waitForBranchReady(projectRef: string, maxWaitSeconds: number = 300): Promise<void> {
  console.log('\n⏳ Waiting for branch to be ready...');

  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`${API_BASE}/projects/${projectRef}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    if (response.ok) {
      const project = await response.json();
      if (project.status === 'ACTIVE_HEALTHY') {
        console.log('✅ Branch is ready!');
        return;
      }
      console.log(`   Status: ${project.status} (waiting...)`);
    }

    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
  }

  console.log('⚠️  Timeout waiting for branch. It may still be initializing.');
  console.log('   Check status at: https://supabase.com/dashboard/project/' + projectRef);
}

function displayEnvConfig(branchName: string, projectRef: string, keys: ProjectKeysResponse, dbPassword: string) {
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  BRANCH CONFIGURATION - Add to .env.' + branchName.padEnd(26) + '║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`# Supabase Branch: ${branchName}`);
  console.log(`# Git Branch: ${branchName}`);
  console.log(`# Project Ref: ${projectRef}`);
  console.log(`# Created: ${new Date().toISOString().split('T')[0]}\n`);

  console.log(`NEXT_PUBLIC_SUPABASE_URL=https://${projectRef}.supabase.co`);
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${keys.anon}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY=${keys.service_role}`);
  console.log(`SUPABASE_PROJECT_ID=${projectRef}`);
  console.log(`SUPABASE_DB_PASSWORD=${dbPassword}`);
  console.log('');
  console.log(`# Environment`);
  console.log(`NODE_ENV=${branchName}`);
  console.log('');

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  NEXT STEPS                                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`1. Copy the configuration above to: .env.${branchName}`);
  console.log(`2. Verify branch at: https://supabase.com/dashboard/project/${projectRef}`);
  console.log(`3. If you need to copy data from dev/production, run:`);
  console.log(`   pnpm dlx tsx scripts/copy-dev-to-staging.ts`);
  console.log('');
}

async function main() {
  try {
    // Parse arguments
    const { values } = parseArgs({
      options: {
        name: {
          type: 'string',
          short: 'n',
        },
        'with-data': {
          type: 'boolean',
          default: false,
        },
        help: {
          type: 'boolean',
          short: 'h',
        },
      },
    });

    if (values.help || !values.name) {
      console.log(`
Usage: pnpm dlx tsx scripts/setup-supabase-branch.ts --name <branch-name> [--with-data]

Options:
  --name, -n          Branch name (required) - should match Git branch name
  --with-data        Copy data from parent project (default: false, schema only)
  --help, -h         Show this help message

Examples:
  pnpm dlx tsx scripts/setup-supabase-branch.ts --name staging
  pnpm dlx tsx scripts/setup-supabase-branch.ts --name feature-auth --with-data

Environment Variables Required:
  SUPABASE_ACCESS_TOKEN   Get from https://supabase.com/dashboard/account/tokens
  SUPABASE_PROJECT_ID     Parent project ID (default: iyeueszchbvlutlcmvcb)
      `);
      process.exit(values.help ? 0 : 1);
    }

    const branchName = values.name as string;
    const withData = values['with-data'] as boolean;

    console.log('🚀 Supabase Branch Setup Script\n');

    // Step 1: Validate environment
    await checkEnvironment();

    // Step 2: Create branch
    const branch = await createBranch(branchName, withData);

    // Step 3: Wait for branch to be ready
    await waitForBranchReady(branch.project_ref);

    // Step 4: Get API keys
    const keys = await getBranchKeys(branch.project_ref);

    // Step 5: Get database password
    const dbPassword = await getDatabasePassword(branch.project_ref);

    // Step 6: Display configuration
    displayEnvConfig(branchName, branch.project_ref, keys, dbPassword);

    console.log('✅ Branch setup completed successfully!\n');

    // Warning about data
    if (!withData) {
      console.log('⚠️  Note: Branch was created with schema only (no data)');
      console.log('   To copy data from production, use:');
      console.log('   pnpm dlx tsx scripts/copy-dev-to-staging.ts\n');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('already exists')) {
      console.log('\n💡 Tip: Branch already exists. Use a different name or delete the existing branch first.');
    } else if (error.message.includes('SUPABASE_ACCESS_TOKEN')) {
      console.log('\n💡 Tip: Make sure to set your SUPABASE_ACCESS_TOKEN environment variable.');
    }

    process.exit(1);
  }
}

main();
