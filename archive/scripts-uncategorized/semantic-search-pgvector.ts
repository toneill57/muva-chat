#!/usr/bin/env tsx
/**
 * Semantic Search via Supabase pgvector
 *
 * Tests the search_code_embeddings() RPC function
 * Replaces Zilliz MCP server functionality with direct pgvector queries
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/semantic-search-pgvector.ts "your search query"
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

interface SearchResult {
  file_path: string;
  chunk_index: number;
  content: string;
  similarity: number;
}

async function semanticSearch(
  query: string,
  options: {
    threshold?: number;
    count?: number;
    verbose?: boolean;
  } = {}
): Promise<SearchResult[]> {
  const { threshold = 0.6, count = 10, verbose = true } = options;

  // Initialize clients
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
    throw new Error('Missing required environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const openai = new OpenAI({ apiKey: openaiApiKey });

  if (verbose) {
    console.log(`🔍 Semantic Search: "${query}"`);
    console.log(`   Threshold: ${threshold}`);
    console.log(`   Max results: ${count}\n`);
  }

  // Step 1: Generate embedding for query
  const embeddingStart = Date.now();
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
    dimensions: 1536,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;
  const embeddingTime = Date.now() - embeddingStart;

  if (verbose) {
    console.log(`✅ Query embedding generated (${embeddingTime}ms)`);
  }

  // Step 2: Search using RPC function
  const searchStart = Date.now();
  const { data, error } = await supabase.rpc('search_code_embeddings', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_threshold: threshold,
    match_count: count,
  });

  const searchTime = Date.now() - searchStart;

  if (error) {
    console.error('❌ Search error:', error);
    throw error;
  }

  if (verbose) {
    console.log(`✅ Vector search complete (${searchTime}ms)`);
    console.log(`   Total time: ${embeddingTime + searchTime}ms\n`);
  }

  return data as SearchResult[];
}

async function main() {
  const query = process.argv[2];

  if (!query) {
    console.error('❌ Error: No search query provided');
    console.error('\nUsage:');
    console.error('  set -a && source .env.local && set +a && npx tsx scripts/semantic-search-pgvector.ts "your query"');
    console.error('\nExamples:');
    console.error('  npx tsx scripts/semantic-search-pgvector.ts "SIRE compliance validation"');
    console.error('  npx tsx scripts/semantic-search-pgvector.ts "matryoshka embeddings"');
    process.exit(1);
  }

  try {
    const results = await semanticSearch(query, {
      threshold: 0.6,
      count: 10,
      verbose: true,
    });

    console.log(`📊 Results (${results.length} matches):\n`);

    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.file_path} (chunk ${result.chunk_index})`);
      console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`   Preview: ${result.content.substring(0, 150).replace(/\n/g, ' ')}...`);
      console.log('');
    });

    // Performance summary
    console.log('---');
    console.log('✅ Search successful!');
    console.log(`   Files found: ${new Set(results.map(r => r.file_path)).size}`);
    console.log(`   Chunks found: ${results.length}`);
    console.log(`   Avg similarity: ${(results.reduce((sum, r) => sum + r.similarity, 0) / results.length * 100).toFixed(1)}%`);

    if (results.length === 0) {
      console.log('\n⚠️  No results found. Try lowering the threshold or adjusting your query.');
    }
  } catch (error: any) {
    console.error('\n❌ Search failed:', error.message);
    process.exit(1);
  }
}

main();
