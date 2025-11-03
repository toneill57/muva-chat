import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function escapeSQL(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

async function generateCatalogMigration() {
  console.log('-- =====================================================================================');
  console.log('-- PHASE 3b: CATALOG DATA MIGRATION');
  console.log('-- =====================================================================================');
  console.log('-- Generated: 2025-10-31');
  console.log('-- Tables: sire_content (8 rows), muva_content (742 rows)');
  console.log('-- Note: Embeddings excluded (will be regenerated)');
  console.log('-- =====================================================================================\n');
  console.log('BEGIN;\n');

  // Policies table (empty)
  console.log('-- =====================================================================================');
  console.log('-- TABLE: policies (0 rows - empty in production)');
  console.log('-- =====================================================================================\n');

  // SIRE content
  console.log('-- =====================================================================================');
  console.log('-- TABLE: sire_content (8 rows)');
  console.log('-- Note: Embeddings excluded - will be regenerated post-migration');
  console.log('-- =====================================================================================\n');

  const { data: sireContent, error: sireError } = await supabase
    .from('sire_content')
    .select('id, content, source_file, document_type, chunk_index, total_chunks, page_number, section_title, language, embedding_model, token_count, created_at, updated_at, title, description, category, status, version, tags, keywords')
    .order('created_at');

  if (sireError) {
    console.error('Error fetching sire_content:', sireError);
    process.exit(1);
  }

  if (sireContent && sireContent.length > 0) {
    console.log('INSERT INTO sire_content (');
    console.log('    id, content, source_file, document_type, chunk_index, total_chunks,');
    console.log('    page_number, section_title, language, embedding_model, token_count,');
    console.log('    created_at, updated_at, title, description, category, status, version, tags, keywords');
    console.log(') VALUES');

    sireContent.forEach((row: any, index: number) => {
      const isLast = index === sireContent.length - 1;
      const content = escapeSQL(row.content);
      const description = escapeSQL(row.description);
      const tags = row.tags ? `ARRAY[${row.tags.map((t: string) => `'${escapeSQL(t)}'`).join(', ')}]` : 'NULL';
      const keywords = row.keywords ? `ARRAY[${row.keywords.map((k: string) => `'${escapeSQL(k)}'`).join(', ')}]` : 'NULL';

      console.log(`(
    '${row.id}',
    '${content}',
    ${row.source_file ? `'${escapeSQL(row.source_file)}'` : 'NULL'},
    ${row.document_type ? `'${row.document_type}'` : 'NULL'},
    ${row.chunk_index ?? 'NULL'},
    ${row.total_chunks ?? 'NULL'},
    ${row.page_number ?? 'NULL'},
    ${row.section_title ? `'${escapeSQL(row.section_title)}'` : 'NULL'},
    ${row.language ? `'${row.language}'` : 'NULL'},
    ${row.embedding_model ? `'${row.embedding_model}'` : 'NULL'},
    ${row.token_count ?? 'NULL'},
    '${row.created_at}',
    '${row.updated_at}',
    ${row.title ? `'${escapeSQL(row.title)}'` : 'NULL'},
    ${description ? `'${description}'` : 'NULL'},
    ${row.category ? `'${row.category}'` : 'NULL'},
    ${row.status ? `'${row.status}'` : 'NULL'},
    ${row.version ? `'${row.version}'` : 'NULL'},
    ${tags},
    ${keywords}
)${isLast ? ';' : ','}`);
    });
  }

  console.log('\n-- =====================================================================================');
  console.log('-- TABLE: muva_content (742 rows)');
  console.log('-- Note: Embeddings excluded - will be regenerated post-migration');
  console.log('-- =====================================================================================\n');

  // Query muva_content in batches
  const batchSize = 100;
  let offset = 0;
  let allMuvaContent: any[] = [];

  while (true) {
    const { data: batch, error: muvaError } = await supabase
      .from('muva_content')
      .select('id, content, source_file, document_type, chunk_index, total_chunks, page_number, section_title, language, embedding_model, token_count, created_at, updated_at, title, description, category, status, version, tags, keywords, schema_type, schema_version, business_info, subcategory')
      .order('created_at')
      .range(offset, offset + batchSize - 1);

    if (muvaError) {
      console.error('Error fetching muva_content:', muvaError);
      process.exit(1);
    }

    if (!batch || batch.length === 0) break;

    allMuvaContent = allMuvaContent.concat(batch);
    offset += batchSize;

    if (batch.length < batchSize) break;
  }

  console.error(`Fetched ${allMuvaContent.length} rows from muva_content`);

  if (allMuvaContent.length > 0) {
    console.log('INSERT INTO muva_content (');
    console.log('    id, content, source_file, document_type, chunk_index, total_chunks,');
    console.log('    page_number, section_title, language, embedding_model, token_count,');
    console.log('    created_at, updated_at, title, description, category, status, version,');
    console.log('    tags, keywords, schema_type, schema_version, business_info, subcategory');
    console.log(') VALUES');

    allMuvaContent.forEach((row: any, index: number) => {
      const isLast = index === allMuvaContent.length - 1;
      const content = escapeSQL(row.content);
      const description = escapeSQL(row.description);
      const tags = row.tags ? `ARRAY[${row.tags.map((t: string) => `'${escapeSQL(t)}'`).join(', ')}]` : 'NULL';
      const keywords = row.keywords ? `ARRAY[${row.keywords.map((k: string) => `'${escapeSQL(k)}'`).join(', ')}]` : 'NULL';
      const businessInfo = row.business_info ? `'${escapeSQL(JSON.stringify(row.business_info))}'::jsonb` : 'NULL';

      console.log(`(
    '${row.id}',
    '${content}',
    ${row.source_file ? `'${escapeSQL(row.source_file)}'` : 'NULL'},
    ${row.document_type ? `'${row.document_type}'` : 'NULL'},
    ${row.chunk_index ?? 'NULL'},
    ${row.total_chunks ?? 'NULL'},
    ${row.page_number ?? 'NULL'},
    ${row.section_title ? `'${escapeSQL(row.section_title)}'` : 'NULL'},
    ${row.language ? `'${row.language}'` : 'NULL'},
    ${row.embedding_model ? `'${row.embedding_model}'` : 'NULL'},
    ${row.token_count ?? 'NULL'},
    '${row.created_at}',
    '${row.updated_at}',
    ${row.title ? `'${escapeSQL(row.title)}'` : 'NULL'},
    ${description ? `'${description}'` : 'NULL'},
    ${row.category ? `'${row.category}'` : 'NULL'},
    ${row.status ? `'${row.status}'` : 'NULL'},
    ${row.version ? `'${row.version}'` : 'NULL'},
    ${tags},
    ${keywords},
    ${row.schema_type ? `'${row.schema_type}'` : 'NULL'},
    ${row.schema_version ? `'${row.schema_version}'` : 'NULL'},
    ${businessInfo},
    ${row.subcategory ? `'${row.subcategory}'` : 'NULL'}
)${isLast ? ';' : ','}`);
    });
  }

  console.log('\n-- =====================================================================================');
  console.log('-- VERIFICATION');
  console.log('-- =====================================================================================');
  console.log('-- SELECT COUNT(*) FROM sire_content;  -- Expected: 8');
  console.log('-- SELECT COUNT(*) FROM muva_content;  -- Expected: 742');
  console.log('-- Total: 750 rows');
  console.log('-- =====================================================================================\n');
  console.log('COMMIT;\n');
  console.log('-- =====================================================================================');
  console.log('-- END PHASE 3b: CATALOG DATA MIGRATION');
  console.log('-- =====================================================================================');
}

generateCatalogMigration().catch(console.error);
