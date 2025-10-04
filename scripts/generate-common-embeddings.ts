#!/usr/bin/env tsx
/**
 * Generate Common Query Embeddings
 *
 * Pre-generates embeddings for the 20 most common search queries.
 * Run this script after adding new common queries to the list.
 *
 * Usage:
 *   npx tsx scripts/generate-common-embeddings.ts
 */

import { generateCommonQueryEmbeddings } from '../src/lib/common-query-embeddings'

async function main() {
  console.log('=' .repeat(80))
  console.log('🚀 GENERATING COMMON QUERY EMBEDDINGS')
  console.log('=' .repeat(80))
  console.log()

  await generateCommonQueryEmbeddings()

  console.log()
  console.log('✅ Done! Embeddings saved to data/common-query-embeddings.json')
  console.log()
  console.log('Next steps:')
  console.log('1. Commit the generated file to version control')
  console.log('2. App will auto-load embeddings on startup for instant cache hits')
  console.log()
}

main().catch(console.error)
