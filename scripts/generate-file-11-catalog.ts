#!/usr/bin/env tsx
/**
 * Generate File 11: Catalog Data (750 rows, 26 columns)
 * Tables: sire_content (8), muva_content (742), policies (0)
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OUTPUT_FILE = 'migrations/fresh-2025-11-01/11-data-catalog.sql';

// SQL formatting utilities
const esc = (str: any) => {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
};

const uuid = (id: any) => id ? `'${id}'::uuid` : 'NULL';
const ts = (date: any) => date ? `'${date}'::timestamptz` : 'NULL';
const jsonb = (obj: any) => obj ? `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb` : 'NULL';
const arr = (items: any[]) => {
  if (!items || items.length === 0) return 'ARRAY[]::text[]';
  return `ARRAY[${items.map(esc).join(', ')}]`;
};

async function main() {
  console.log('📝 Generating 11-data-catalog.sql...\n');

  let sql = `-- 11-data-catalog.sql
-- Generated: ${new Date().toISOString().split('T')[0]}
-- Group 2: Catalog Data (3 tables, ~750 rows)
-- ⭐ COMPLETE 26 columns for muva_content

BEGIN;
SET session_replication_role = replica;

`;

  // ========================================
  // Table 1: sire_content
  // ========================================
  console.log('Fetching sire_content...');
  const { data: sireContent, error: sireError } = await supabase
    .from('sire_content')
    .select('*')
    .order('created_at');

  if (sireError) throw sireError;

  const sireCount = sireContent?.length || 0;
  console.log(`  Found ${sireCount} rows`);

  sql += `-- ========================================
-- TABLE 1: sire_content (${sireCount} rows)
-- ========================================
`;

  if (sireCount > 0) {
    sql += `INSERT INTO sire_content (
  id,
  category,
  title,
  content,
  section,
  metadata,
  created_at,
  updated_at
) VALUES\n`;

    sql += sireContent!.map(row =>
      `(${uuid(row.id)}, ${esc(row.category)}, ${esc(row.title)}, ${esc(row.content)}, ${esc(row.section)}, ${jsonb(row.metadata)}, ${ts(row.created_at)}, ${ts(row.updated_at)})`
    ).join(',\n') + ';\n\n';
  } else {
    sql += `-- No data currently\n\n`;
  }

  // ========================================
  // Table 2: muva_content (⭐ 26 columns)
  // ========================================
  console.log('Fetching muva_content (may take a moment)...');
  const { data: muvaContent, error: muvaError } = await supabase
    .from('muva_content')
    .select('*')
    .order('created_at');

  if (muvaError) throw muvaError;

  const muvaCount = muvaContent?.length || 0;
  console.log(`  Found ${muvaCount} rows`);

  sql += `-- ========================================
-- TABLE 2: muva_content (${muvaCount} rows, ⭐ 26 columns)
-- CRITICAL: Oct 31 had incomplete columns
-- ========================================
`;

  if (muvaCount > 0) {
    sql += `INSERT INTO muva_content (
  id,
  content,
  embedding,
  source_file,
  document_type,
  chunk_index,
  total_chunks,
  page_number,
  section_title,
  language,
  embedding_model,
  token_count,
  created_at,
  updated_at,
  title,
  description,
  category,
  status,
  version,
  tags,
  keywords,
  embedding_fast,
  schema_type,
  schema_version,
  business_info,
  subcategory
) VALUES\n`;

    sql += muvaContent!.map(row => {
      // Vector formatting - keep as string representation
      const embedding = row.embedding ? esc(row.embedding) : 'NULL';
      const embedding_fast = row.embedding_fast ? esc(row.embedding_fast) : 'NULL';

      return `(${uuid(row.id)}, ${esc(row.content)}, ${embedding}, ${esc(row.source_file)}, ${esc(row.document_type)}, ${row.chunk_index ?? 'NULL'}, ${row.total_chunks ?? 'NULL'}, ${row.page_number ?? 'NULL'}, ${esc(row.section_title)}, ${esc(row.language)}, ${esc(row.embedding_model)}, ${row.token_count ?? 'NULL'}, ${ts(row.created_at)}, ${ts(row.updated_at)}, ${esc(row.title)}, ${esc(row.description)}, ${esc(row.category)}, ${esc(row.status)}, ${esc(row.version)}, ${arr(row.tags)}, ${arr(row.keywords)}, ${embedding_fast}, ${esc(row.schema_type)}, ${esc(row.schema_version)}, ${jsonb(row.business_info)}, ${esc(row.subcategory)})`;
    }).join(',\n') + ';\n\n';
  } else {
    sql += `-- No data currently\n\n`;
  }

  // ========================================
  // Table 3: policies
  // ========================================
  console.log('Fetching policies...');
  const { data: policies, error: policiesError } = await supabase
    .from('policies')
    .select('*')
    .order('created_at');

  const policiesCount = policies?.length || 0;
  console.log(`  Found ${policiesCount} rows`);

  sql += `-- ========================================
-- TABLE 3: policies (${policiesCount} rows)
-- ========================================
`;

  if (policiesCount > 0) {
    sql += `INSERT INTO policies (
  id,
  tenant_id,
  policy_type,
  title,
  content,
  effective_date,
  created_at,
  updated_at
) VALUES\n`;

    sql += policies!.map(row =>
      `(${uuid(row.id)}, ${uuid(row.tenant_id)}, ${esc(row.policy_type)}, ${esc(row.title)}, ${esc(row.content)}, ${ts(row.effective_date)}, ${ts(row.created_at)}, ${ts(row.updated_at)})`
    ).join(',\n') + ';\n\n';
  } else {
    sql += `-- No data currently\n\n`;
  }

  // Footer
  sql += `SET session_replication_role = DEFAULT;
COMMIT;

-- Validation
SELECT 'sire_content' as table_name, COUNT(*) as row_count FROM sire_content
UNION ALL
SELECT 'muva_content', COUNT(*) FROM muva_content
UNION ALL
SELECT 'policies', COUNT(*) FROM policies;

-- Expected totals:
-- sire_content: ${sireCount}
-- muva_content: ${muvaCount}
-- policies: ${policiesCount}
-- TOTAL: ${sireCount + muvaCount + policiesCount}
`;

  // Write file
  writeFileSync(OUTPUT_FILE, sql);

  const totalRows = sireCount + muvaCount + policiesCount;
  console.log(`\n✅ Generated ${OUTPUT_FILE}`);
  console.log(`   Total rows: ${totalRows}`);
  console.log(`   File size: ${(Buffer.byteLength(sql) / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
