/**
 * Test Public Chat Search
 *
 * Tests the match_accommodations_public RPC function
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

async function testPublicSearch() {
  console.log('🧪 Testing Public Chat Search\n')

  // Test query
  const query = '¿Qué apartamentos tienen disponibles para 4 personas?'
  console.log(`Query: "${query}"\n`)

  try {
    // Generate embedding
    console.log('1. Generating query embedding...')
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query,
      dimensions: 1024,
    })
    const queryEmbedding = response.data[0].embedding
    console.log(`   ✓ Embedding generated (${queryEmbedding.length} dimensions)\n`)

    // Get tenant ID
    const { data: tenant } = await supabase
      .from('tenant_registry')
      .select('tenant_id, slug')
      .eq('slug', 'simmerdown')
      .single()

    if (!tenant) {
      console.error('❌ Tenant "simmerdown" not found')
      return
    }

    console.log(`2. Tenant: ${tenant.slug} (${tenant.tenant_id})\n`)

    // Call RPC function
    console.log('3. Calling match_accommodations_public()...')
    const { data: results, error } = await supabase.rpc('match_accommodations_public', {
      query_embedding: queryEmbedding,
      p_tenant_id: tenant.tenant_id,
      match_threshold: 0.2,
      match_count: 10,
    })

    if (error) {
      console.error('❌ RPC Error:', error)
      return
    }

    console.log(`   ✓ Found ${results?.length || 0} results\n`)

    // Display results
    if (results && results.length > 0) {
      console.log('📋 Results:\n')
      results.forEach((result: any, index: number) => {
        console.log(`${index + 1}. ${result.name} (${result.source_file})`)
        console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`)
        console.log(`   Content: ${result.content.substring(0, 100)}...`)
        if (result.pricing) {
          console.log(`   Price: $${result.pricing.base_price_night} ${result.pricing.currency}/night`)
        }
        if (result.photos && result.photos.length > 0) {
          console.log(`   Photos: ${result.photos.length} images`)
        }
        console.log()
      })

      console.log('✅ Search working correctly!')
    } else {
      console.log('⚠️  No results found. Check:')
      console.log('   - Embeddings generated correctly')
      console.log('   - Tenant ID matches')
      console.log('   - Match threshold not too high')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testPublicSearch()
