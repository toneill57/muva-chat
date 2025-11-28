#!/usr/bin/env tsx
/**
 * Execute DDL SQL via Supabase Management API
 *
 * This is the ONLY reliable way to execute DDL programmatically in Supabase.
 * MCP tools and execute_sql() RPC do NOT work for DDL.
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/execute-ddl-via-api.ts path/to/migration.sql
 *
 * Requirements:
 *   - SUPABASE_ACCESS_TOKEN in .env.local
 *   - Project ID hardcoded or from SUPABASE_URL
 */

import { readFileSync } from 'fs';

const PROJECT_ID = 'zpyxgkvonrxbhvmkuzlt'; // Extract from SUPABASE_URL if needed

async function executeDDL(sqlFilePath: string) {
  console.log(`🔧 Executing DDL from: ${sqlFilePath}\n`);

  // Read SQL file
  let sql: string;
  try {
    sql = readFileSync(sqlFilePath, 'utf-8');
  } catch (err: any) {
    console.error('❌ Error reading SQL file:', err.message);
    process.exit(1);
  }

  // Verify environment
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('❌ SUPABASE_ACCESS_TOKEN not found in environment');
    console.error('Run: set -a && source .env.local && set +a');
    process.exit(1);
  }

  // Execute via Management API
  console.log('📡 Sending request to Supabase Management API...\n');

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
      }
    );

    const result = await response.json();

    // Check HTTP status
    if (!response.ok) {
      console.error('❌ HTTP Error:', response.status);
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    // Management API returns [] for successful DDL
    if (Array.isArray(result) && result.length === 0) {
      console.log('✅ DDL executed successfully!\n');
      return true;
    }

    // If result has data, show it
    if (Array.isArray(result) && result.length > 0) {
      console.log('✅ Query executed successfully!');
      console.log('Result:', JSON.stringify(result, null, 2), '\n');
      return true;
    }

    // Unexpected result
    console.error('❌ Unexpected result format:', JSON.stringify(result, null, 2));
    process.exit(1);

  } catch (err: any) {
    console.error('❌ Network error:', err.message);
    process.exit(1);
  }
}

// Main
const sqlFile = process.argv[2];

if (!sqlFile) {
  console.error('Usage: npx tsx scripts/execute-ddl-via-api.ts path/to/migration.sql');
  process.exit(1);
}

executeDDL(sqlFile)
  .then(() => {
    console.log('🎉 DDL execution completed!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  });
