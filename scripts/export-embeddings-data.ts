import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function escapeSQL(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (Array.isArray(value)) {
    const vectorStr = '[' + value.join(',') + ']';
    return "'" + vectorStr + "'::vector";
  }
  if (typeof value === 'object') {
    const jsonStr = JSON.stringify(value).replace(/'/g, "''");
    return "'" + jsonStr + "'::jsonb";
  }
  const strValue = String(value).replace(/'/g, "''");
  return "'" + strValue + "'";
}

async function exportCodeEmbeddings() {
  console.log('Exporting code_embeddings...');
  const batchSize = 500;
  let allInserts: string[] = [];
  
  for (let i = 0; i < 9; i++) {
    const offset = i * batchSize;
    console.log('  Batch ' + (i + 1) + '/9: offset ' + offset);
    
    const { data, error } = await supabase
      .from('code_embeddings')
      .select('*')
      .order('id')
      .range(offset, offset + batchSize - 1);
    
    if (error) throw error;
    if (!data || data.length === 0) continue;
    
    for (const row of data as any[]) {
      const values = [
        escapeSQL(row.id),
        escapeSQL(row.file_path),
        escapeSQL(row.chunk_index),
        escapeSQL(row.content),
        escapeSQL(row.embedding),
        escapeSQL(row.metadata),
        escapeSQL(row.created_at),
        escapeSQL(row.updated_at),
      ].join(', ');
      
      allInserts.push('INSERT INTO code_embeddings (id, file_path, chunk_index, content, embedding, metadata, created_at, updated_at) VALUES (' + values + ');');
    }
  }
  
  console.log('Generated ' + allInserts.length + ' inserts');
  return allInserts;
}

async function exportManualChunks() {
  console.log('Exporting accommodation_units_manual_chunks...');
  
  const { data, error } = await supabase
    .from('accommodation_units_manual_chunks')
    .select('*')
    .order('id');
  
  if (error) throw error;
  const inserts: string[] = [];
  
  for (const row of data as any[]) {
    const values = [
      escapeSQL(row.id),
      escapeSQL(row.tenant_id),
      escapeSQL(row.accommodation_unit_id),
      escapeSQL(row.manual_id),
      escapeSQL(row.chunk_content),
      escapeSQL(row.chunk_index),
      escapeSQL(row.total_chunks),
      escapeSQL(row.section_title),
      escapeSQL(row.metadata),
      escapeSQL(row.embedding),
      escapeSQL(row.embedding_balanced),
      escapeSQL(row.embedding_fast),
      escapeSQL(row.created_at),
      escapeSQL(row.updated_at),
    ].join(', ');
    
    inserts.push('INSERT INTO accommodation_units_manual_chunks (id, tenant_id, accommodation_unit_id, manual_id, chunk_content, chunk_index, total_chunks, section_title, metadata, embedding, embedding_balanced, embedding_fast, created_at, updated_at) VALUES (' + values + ');');
  }
  
  console.log('Generated ' + inserts.length + ' inserts');
  return inserts;
}

async function main() {
  console.log('Starting export...\n');
  
  try {
    const codeInserts = await exportCodeEmbeddings();
    const manualInserts = await exportManualChunks();
    
    const header = '-- Phase 3e: Embeddings Data\n-- Generated: ' + new Date().toISOString() + '\n\nSET session_replication_role = replica;\n\n';
    const footer = '\nSET session_replication_role = DEFAULT;\n';
    
    const outputDir = '/Users/oneill/Sites/apps/muva-chat/migrations/backup-2025-10-31';
    
    const part1 = codeInserts.slice(0, 2000);
    writeFileSync(join(outputDir, '14a-data-embeddings-part1.sql'), header + part1.join('\n') + footer);
    console.log('Written 14a (2000 rows)');
    
    const part2 = codeInserts.slice(2000);
    writeFileSync(join(outputDir, '14b-data-embeddings-part2.sql'), header + part2.join('\n') + footer);
    console.log('Written 14b (' + part2.length + ' rows)');
    
    writeFileSync(join(outputDir, '14c-data-embeddings-other.sql'), header + manualInserts.join('\n') + footer);
    console.log('Written 14c (' + manualInserts.length + ' rows)');
    
    console.log('\nExport complete!');
    
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

main();
