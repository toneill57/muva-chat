import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.dirname(__dirname)

// Load environment variables
config({ path: path.join(projectRoot, '.env.local') })

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================================================
// CHUNKING FUNCTION (from populate-embeddings.js line 1231)
// ============================================================================

function chunkDocument(content) {
  // NORMALIZE: Remove incorrect indentation from markdown headers
  // Fix headers like "  ## Title" → "## Title" to ensure chunking works correctly
  content = content.split('\n').map(line => {
    // If line starts with spaces followed by markdown header, trim the spaces
    if (/^\s+(#{1,6})\s/.test(line)) {
      return line.trim()
    }
    return line
  }).join('\n')

  const CHUNK_SIZE = 600  // Reduced from 1000 to ensure semantic sections stay separate
  const OVERLAP = 100

  const separators = [
    '\n\n',
    '\n# ', '\n## ', '\n### ',  // Fixed: Split at major sections (##) before subsections (###)
    '\n**Q:**', '\n**A:**',
    '\n**', '\n- ', '\n\\d+\\. ',
    '\n', '. ', '? ', '! ', '; ', ': ', ', ', ' '
  ]

  function findWordBoundary(text, targetIndex, searchBackward = true) {
    if (targetIndex <= 0) return 0
    if (targetIndex >= text.length) return text.length

    const direction = searchBackward ? -1 : 1
    let index = targetIndex

    while (index > 0 && index < text.length) {
      const char = text[index]
      if (/\s/.test(char) || /[.!?;:,\n]/.test(char)) {
        return searchBackward ? index + 1 : index
      }
      index += direction
    }

    return targetIndex
  }

  function recursiveSplit(text, separators) {
    if (text.length <= CHUNK_SIZE) {
      return [text]
    }

    for (const separator of separators) {
      const isRegexSeparator = separator.includes('\\d')
      let parts

      if (isRegexSeparator) {
        const regex = new RegExp(separator, 'g')
        const matches = [...text.matchAll(regex)]
        if (matches.length === 0) continue

        parts = []
        let lastIndex = 0
        matches.forEach(match => {
          parts.push(text.slice(lastIndex, match.index))
          parts.push(match[0])
          lastIndex = match.index + match[0].length
        })
        parts.push(text.slice(lastIndex))
        parts = parts.filter(part => part.length > 0)
      } else {
        if (!text.includes(separator)) continue
        parts = text.split(separator)
      }

      const chunks = []
      let currentChunk = ''

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i] + (i < parts.length - 1 ? separator : '')

        // SPECIAL HANDLING: Force split at major section headers (##) to keep semantic sections separate
        const isMajorSectionSeparator = separator === '\n## ' && currentChunk.length > 0
        const wouldExceedSize = currentChunk.length + part.length > CHUNK_SIZE

        if ((wouldExceedSize || isMajorSectionSeparator) && currentChunk.length > 0) {
          chunks.push(currentChunk.trim())
          const overlapStart = Math.max(0, currentChunk.length - OVERLAP)
          const overlapStartSafe = findWordBoundary(currentChunk, overlapStart, false)
          currentChunk = currentChunk.slice(overlapStartSafe) + part
        } else {
          currentChunk += part
        }
      }

      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }

      return chunks
    }

    // Fallback: hard split by character count with word boundaries
    const chunks = []
    let currentPos = 0

    while (currentPos < text.length) {
      let endPos = currentPos + CHUNK_SIZE
      if (endPos >= text.length) {
        const lastChunk = text.slice(currentPos).trim()
        if (lastChunk.length > 0) {
          chunks.push(lastChunk)
        }
        break
      }

      endPos = findWordBoundary(text, endPos, true)
      const chunk = text.slice(currentPos, endPos).trim()
      if (chunk.length > 0) {
        chunks.push(chunk)
      }

      const overlapStart = Math.max(currentPos, endPos - OVERLAP)
      currentPos = findWordBoundary(text, overlapStart, false)
    }

    return chunks
  }

  return recursiveSplit(content, separators)
    .filter(chunk => chunk.length >= 50)
}

// ============================================================================
// SECTION TITLE EXTRACTION
// ============================================================================

/**
 * Extract meaningful section title from chunk content
 * Strategy: Look for headers in first 70% of chunk to avoid "next section" headers
 */
function extractSectionTitle(content) {
  const lines = content.split('\n')
  const contentLength = content.length

  // Calculate position threshold (70% of content)
  const positionThreshold = contentLength * 0.7

  let currentPosition = 0
  const linesInFirstPortion = []

  for (const line of lines) {
    if (currentPosition < positionThreshold) {
      linesInFirstPortion.push(line)
      currentPosition += line.length + 1 // +1 for newline
    } else {
      break
    }
  }

  // PRIORITY 1: Look for major section headers (##) in first 70% of chunk
  for (const line of linesInFirstPortion) {
    const majorHeaderMatch = line.match(/^#{2}\s+(.+)/)
    if (majorHeaderMatch) {
      return majorHeaderMatch[1]
        .replace(/\{#.+\}/, '') // Remove anchor tags like {#emergencias}
        .trim()
        .slice(0, 100)
    }
  }

  // PRIORITY 2: Look for subsections (###) in first 70%
  for (const line of linesInFirstPortion) {
    const subHeaderMatch = line.match(/^#{3}\s+(.+)/)
    if (subHeaderMatch) {
      return subHeaderMatch[1]
        .replace(/\{#.+\}/, '')
        .trim()
        .slice(0, 100)
    }
  }

  // FALLBACK: use first non-empty line (cleaned)
  const firstLine = lines.find(l => l.trim().length > 0)
  if (firstLine) {
    return firstLine
      .replace(/^#+\s*/, '') // Remove markdown headers
      .replace(/^\*\*/, '') // Remove bold markers
      .replace(/\*\*$/, '')
      .trim()
      .slice(0, 100)
  }

  return 'Unknown'
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

async function generateEmbedding(text, dimensions = 3072) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: dimensions,
    encoding_format: 'float',
  })
  return response.data[0].embedding
}

// ============================================================================
// MATRYOSHKA TRUNCATION
// ============================================================================

function createMatryoshkaEmbeddings(fullEmbedding) {
  return {
    embedding: fullEmbedding, // 3072 dims
    embedding_balanced: fullEmbedding.slice(0, 1536), // Truncate to 1536
    embedding_fast: fullEmbedding.slice(0, 1024), // Truncate to 1024
  }
}

// ============================================================================
// MAIN MIGRATION LOGIC
// ============================================================================

async function migrateManualToChunks() {
  console.log('🚀 Starting manual-to-chunks migration...\n')

  // Step 1: Fetch all manuals (without join since FK points to hotels schema)
  console.log('📚 Fetching all manuals from accommodation_units_manual...')
  const { data: manuals, error: fetchError } = await supabase
    .from('accommodation_units_manual')
    .select('unit_id, manual_content, detailed_instructions')

  if (fetchError) {
    console.error('❌ Error fetching manuals:', fetchError)
    process.exit(1)
  }

  if (!manuals || manuals.length === 0) {
    console.log('⚠️  No manuals found to migrate.')
    process.exit(0)
  }

  console.log(`✅ Found ${manuals.length} manuals to process\n`)

  let totalChunksInserted = 0

  // Step 2: Process each manual
  for (const manual of manuals) {
    const manualName = `manual-${manual.unit_id.slice(0, 8)}`

    // Get tenant_id using RPC (FK points to hotels.accommodation_units)
    const { data: tenantId, error: tenantError } = await supabase
      .rpc('get_accommodation_tenant_id', { p_unit_id: manual.unit_id })

    if (tenantError || !tenantId) {
      console.error(`   ❌ Failed to get tenant_id for unit ${manual.unit_id}`)
      continue
    }

    console.log(`📖 Processing ${manualName}...`)

    // Combine manual content and detailed instructions
    const fullContent = [
      manual.manual_content || '',
      manual.detailed_instructions || '',
    ]
      .filter(Boolean)
      .join('\n\n')

    if (!fullContent.trim()) {
      console.log(`   ⚠️  Empty content, skipping\n`)
      continue
    }

    // Step 3: Chunk the content
    const chunks = chunkDocument(fullContent)
    console.log(`   📦 Generated ${chunks.length} chunks`)

    // Step 4: Process chunks in batches (rate limiting)
    const BATCH_SIZE = 10
    let processedChunks = 0

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)

      console.log(`   🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}...`)

      // Process batch in parallel
      const batchPromises = batch.map(async (chunkContent, batchIndex) => {
        const chunkIndex = i + batchIndex

        // Extract section title using improved logic (prefers markdown headers)
        const sectionTitle = extractSectionTitle(chunkContent)

        // Generate full 3072-dim embedding
        const fullEmbedding = await generateEmbedding(chunkContent, 3072)

        // Create Matryoshka embeddings (truncate)
        const embeddings = createMatryoshkaEmbeddings(fullEmbedding)

        // Insert chunk
        const { error: insertError } = await supabase
          .from('accommodation_units_manual_chunks')
          .insert({
            tenant_id: tenantId,
            accommodation_unit_id: manual.unit_id,
            manual_id: manual.unit_id, // Using unit_id as manual_id since manual table has unit_id as PK
            chunk_content: chunkContent,
            chunk_index: chunkIndex,
            total_chunks: chunks.length,
            section_title: sectionTitle || `Chunk ${chunkIndex + 1}`,
            metadata: {
              original_unit_id: manual.unit_id,
              chunk_size: chunkContent.length,
              migration_date: new Date().toISOString(),
            },
            embedding: embeddings.embedding,
            embedding_balanced: embeddings.embedding_balanced,
            embedding_fast: embeddings.embedding_fast,
          })

        if (insertError) {
          console.error(`   ❌ Error inserting chunk ${chunkIndex}:`, insertError)
          throw insertError
        }

        return true
      })

      // Wait for batch to complete
      await Promise.all(batchPromises)
      processedChunks += batch.length

      // Rate limiting: sleep 100ms between batches
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    totalChunksInserted += processedChunks
    console.log(`   ✅ Inserted ${processedChunks} chunks for ${manualName}\n`)
  }

  // Summary
  console.log('━'.repeat(60))
  console.log(`✨ Migration complete!`)
  console.log(`   📚 Manuals processed: ${manuals.length}`)
  console.log(`   📦 Total chunks inserted: ${totalChunksInserted}`)
  console.log(`   📊 Avg chunks per manual: ${(totalChunksInserted / manuals.length).toFixed(1)}`)
  console.log('━'.repeat(60))
}

// Run migration
migrateManualToChunks()
  .then(() => {
    console.log('\n🎉 Migration script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  })
