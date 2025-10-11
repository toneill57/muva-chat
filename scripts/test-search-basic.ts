#!/usr/bin/env npx tsx
/**
 * Basic test to check if search works at all
 */

import { createClient } from '@supabase/supabase-js'
import { OpenAI } from 'openai'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const TUCASAMAR_TENANT_ID = '2263efba-b62b-417b-a422-a84638bc632f'

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1024
  })
  return response.data[0].embedding
}

async function main() {
  console.log('🧪 Basic Search Test\n')

  // Test 1: Check how many units exist
  const { data: allUnits, error: countError } = await supabase
    .from('accommodation_units_public')
    .select('name, is_active, is_bookable, embedding_fast')
    .eq('tenant_id', TUCASAMAR_TENANT_ID)

  console.log(`📊 Units in database:`)
  console.log(`   Total: ${allUnits?.length || 0}`)
  allUnits?.forEach((unit: any) => {
    const hasEmbedding = unit.embedding_fast != null
    console.log(`   - ${unit.name}: active=${unit.is_active}, bookable=${unit.is_bookable}, embedding=${hasEmbedding}`)
  })
  console.log()

  // Test 2: Search with very low threshold
  console.log('🔍 Testing search with threshold=0.0 and generic query...')
  const embedding = await generateEmbedding('habitación hotel San Andrés')

  const { data: searchResults, error: searchError } = await supabase.rpc('match_accommodations_public', {
    query_embedding: embedding,
    p_tenant_id: TUCASAMAR_TENANT_ID,
    match_threshold: 0.0, // Accept anything
    match_count: 10
  })

  if (searchError) {
    console.error('❌ Search error:', searchError)
  } else {
    console.log(`   Found: ${searchResults?.length || 0} results`)
    searchResults?.forEach((result: any, idx: number) => {
      console.log(`   ${idx + 1}. ${result.name} - Similarity: ${(result.similarity * 100).toFixed(2)}%`)
    })
  }
}

main().catch(console.error)
