#!/usr/bin/env npx tsx
/**
 * Test Tucasamar Chat Search
 * Verifies that tucasamar units appear in public chat search results
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

(async () => {
  console.log('🔍 Testing Tucasamar Chat Search\n');

  // Simulate user query
  const userQuery = 'Busco una habitación en San Andrés cerca de la playa con cocina';
  console.log(`User query: "${userQuery}"\n`);

  // Generate embedding
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: userQuery,
    dimensions: 1024
  });

  const queryEmbedding = response.data[0].embedding;
  console.log('✅ Generated embedding (1024d)\n');

  // Search with RPC
  const { data: results, error } = await supabase.rpc('match_accommodations_public', {
    query_embedding: queryEmbedding,
    p_tenant_id: '2263efba-b62b-417b-a422-a84638bc632f',
    match_threshold: 0.3,
    match_count: 5
  });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`📊 Found ${results.length} results:\n`);

  results.forEach((result: any, idx: number) => {
    console.log(`${idx + 1}. ${result.metadata.name}`);
    console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
    console.log(`   Preview: ${result.content.substring(0, 100)}...`);
    console.log();
  });

  if (results.length > 0) {
    console.log('✅ Chat search working perfectly for Tucasamar!');
  } else {
    console.log('❌ No results found - chat search not working');
    process.exit(1);
  }
})();
