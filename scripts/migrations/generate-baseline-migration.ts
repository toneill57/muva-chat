/**
 * Generate Baseline Migration Package
 * 
 * Exports complete DDL from production database to recreate schema from scratch.
 * Part of FASE 0: Baseline Migration Export
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const PROD_PROJECT_ID = 'ooaumjzaztmutltifhoq';
const PROD_URL = 'https://' + PROD_PROJECT_ID + '.supabase.co';
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD!;

const OUTPUT_DIR = path.join(process.cwd(), 'docs/database/migrations/baseline');

console.log('Connecting to production database...');
console.log('Using key:', PROD_KEY ? 'Found' : 'NOT FOUND');

const supabase = createClient(PROD_URL, PROD_KEY);

async function query(sql: string): Promise<any[]> {
  const response = await fetch(PROD_URL + '/rest/v1/rpc/execute_sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': PROD_KEY,
      'Authorization': 'Bearer ' + PROD_KEY,
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    throw new Error('Query failed: ' + response.statusText);
  }

  return await response.json();
}

async function generateExtensionsFile() {
  console.log('📦 Generating 000_extensions.sql...');
  
  const extensions = await query(`
    SELECT
      extname AS extension_name,
      extversion AS version,
      nspname AS schema
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY extname;
  `);

  const today = new Date().toISOString().split('T')[0];
  const vectorVersion = extensions.find((e: any) => e.extension_name === 'vector')?.version || 'N/A';
  const uuidVersion = extensions.find((e: any) => e.extension_name === 'uuid-ossp')?.version || 'N/A';

  const content = `-- ============================================================================
-- MUVA Chat Database - Extensions
-- ============================================================================
-- Generated: ${today}
-- Source: Production (${PROD_PROJECT_ID})
-- Total Extensions: ${extensions.length}
--
-- This file installs all PostgreSQL extensions required by MUVA Chat.
-- ============================================================================

-- Vector similarity search (required for embeddings - text-embedding-3-large)
-- Version: ${vectorVersion}
-- Used by: Matryoshka embeddings (3072/1536/1024 dims)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- UUID generation functions
-- Version: ${uuidVersion}
-- Used by: All tables with UUID primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Network operations (HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Query performance statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

-- GraphQL API (Supabase auto-generated)
CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;

-- Supabase Vault (secure secrets storage)
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, '000_extensions.sql'), content);
  console.log('✅ 000_extensions.sql created');
}

async function main() {
  console.log('🚀 Starting Baseline Migration Export...\\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    await generateExtensionsFile();
    
    console.log('\\n✅ Phase 1 complete! Next: Generate tables with MCP queries.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
