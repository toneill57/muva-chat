/**
 * End-to-End Test: Knowledge Base Browser
 *
 * Complete workflow test:
 * 1. Upload a test document
 * 2. Process it to generate embeddings
 * 3. List documents via browser API
 * 4. Delete document via browser API
 * 5. Verify deletion
 *
 * Prerequisites:
 * - .env.local configured
 * - Development server running (npm run dev)
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/test-knowledge-browser-e2e.ts
 */

import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { createServerClient } from '@/lib/supabase'
import OpenAI from 'openai'

const TEST_TENANT_ID = '11111111-1111-1111-1111-111111111111'
const API_BASE = 'http://localhost:3000'

// Initialize OpenAI for embedding generation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

async function setupTestDocument() {
  console.log('\n=== STEP 1: Create Test Document ===')

  const testContent = `# Hotel Amenities Guide

## Swimming Pool
Our outdoor infinity pool is open daily from 6am to 10pm. Pool towels are provided at the pool bar.

## Fitness Center
State-of-the-art equipment available 24/7 for all guests. Personal training sessions can be booked at the front desk.

## Spa Services
Relaxing massages, facials, and body treatments. Open 9am-8pm. Reservations recommended.
`

  const tempDir = join(process.cwd(), 'data', 'temp', TEST_TENANT_ID)

  if (!existsSync(tempDir)) {
    await mkdir(tempDir, { recursive: true })
    console.log(`Created temp directory: ${tempDir}`)
  }

  const filePath = join(tempDir, 'test-amenities.md')
  await writeFile(filePath, testContent)

  console.log(`✅ Created test document: ${filePath}`)
  console.log(`   Content length: ${testContent.length} chars`)

  return { filePath, fileName: 'test-amenities.md', content: testContent }
}

async function uploadDocument(fileName: string, filePath: string) {
  console.log('\n=== STEP 2: Upload Document ===')

  const FormData = (await import('form-data')).default
  const fs = await import('fs')

  const formData = new FormData()

  // Read file as stream
  const fileStream = fs.createReadStream(filePath)
  formData.append('file', fileStream, {
    filename: fileName,
    contentType: 'text/markdown',
  })
  formData.append('tenant_id', TEST_TENANT_ID)

  const response = await fetch(`${API_BASE}/api/admin/upload-docs`, {
    method: 'POST',
    body: formData as any,
    headers: formData.getHeaders(),
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(`Upload failed: ${data.message}`)
  }

  console.log(`✅ Uploaded: ${data.file_id}`)
  console.log(`   Metadata:`, data.metadata)

  return data
}

async function generateEmbeddings(content: string, fileName: string) {
  console.log('\n=== STEP 3: Generate Embeddings ===')

  const supabase = createServerClient()

  // Simple chunking (split by paragraphs)
  const chunks = content
    .split('\n\n')
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0)

  console.log(`Processing ${chunks.length} chunks...`)

  const filePath = `${TEST_TENANT_ID}/${fileName}`

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    // Generate embedding via OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk,
      dimensions: 1536,
    })

    const embedding = embeddingResponse.data[0].embedding

    // Insert into database
    const { error } = await supabase
      .from('tenant_knowledge_embeddings')
      .insert({
        tenant_id: TEST_TENANT_ID,
        file_path: filePath,
        chunk_index: i,
        content: chunk,
        embedding: embedding,
      })

    if (error) {
      throw new Error(`Failed to insert chunk ${i}: ${error.message}`)
    }

    console.log(`   ✓ Chunk ${i + 1}/${chunks.length}: ${chunk.substring(0, 50)}...`)
  }

  console.log(`✅ Generated ${chunks.length} embeddings for ${filePath}`)

  return { chunks: chunks.length, filePath }
}

async function listDocuments() {
  console.log('\n=== STEP 4: List Documents via Browser API ===')

  const response = await fetch(`${API_BASE}/api/admin/knowledge-base?tenant_id=${TEST_TENANT_ID}`)
  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(`List failed: ${data.message}`)
  }

  console.log(`✅ Found ${data.total_files} files with ${data.total_chunks} total chunks`)

  if (data.files && data.files.length > 0) {
    console.log('\nFiles:')
    data.files.forEach((file: any, idx: number) => {
      console.log(`  ${idx + 1}. ${file.file_path}`)
      console.log(`     Chunks: ${file.chunks}`)
      console.log(`     Created: ${new Date(file.created_at).toLocaleString()}`)
    })
  }

  return data
}

async function deleteDocument(filePath: string) {
  console.log('\n=== STEP 5: Delete Document via Browser API ===')

  const response = await fetch(`${API_BASE}/api/admin/knowledge-base`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenant_id: TEST_TENANT_ID,
      file_path: filePath,
    }),
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(`Delete failed: ${data.message}`)
  }

  console.log(`✅ Deleted ${data.deleted_chunks} chunks for ${filePath}`)

  return data
}

async function verifyDeletion() {
  console.log('\n=== STEP 6: Verify Deletion ===')

  const supabase = createServerClient()

  const { count, error } = await supabase
    .from('tenant_knowledge_embeddings')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TEST_TENANT_ID)

  if (error) {
    throw new Error(`Verification failed: ${error.message}`)
  }

  if (count === 0) {
    console.log('✅ Database is clean - all embeddings deleted')
  } else {
    console.log(`⚠️  Warning: ${count} embeddings still exist in database`)
  }

  // Also verify via API
  const response = await fetch(`${API_BASE}/api/admin/knowledge-base?tenant_id=${TEST_TENANT_ID}`)
  const data = await response.json()

  if (data.total_files === 0 && data.total_chunks === 0) {
    console.log('✅ API confirms knowledge base is empty')
  } else {
    throw new Error(`API still shows ${data.total_files} files with ${data.total_chunks} chunks`)
  }

  return true
}

async function cleanup() {
  console.log('\n=== CLEANUP ===')

  // Remove temp directory
  const tempDir = join(process.cwd(), 'data', 'temp', TEST_TENANT_ID)
  if (existsSync(tempDir)) {
    await rm(tempDir, { recursive: true })
    console.log(`✅ Removed temp directory: ${tempDir}`)
  }
}

async function main() {
  console.log('🧪 Knowledge Base Browser - End-to-End Test')
  console.log('==========================================')
  console.log(`Tenant ID: ${TEST_TENANT_ID}`)
  console.log(`API Base: ${API_BASE}`)

  try {
    // Setup
    const { filePath, fileName, content } = await setupTestDocument()

    // Upload
    await uploadDocument(fileName, filePath)

    // Process and generate embeddings
    const { filePath: dbFilePath } = await generateEmbeddings(content, fileName)

    // List documents
    const listResult = await listDocuments()

    // Verify the test file is in the list
    const testFile = listResult.files.find((f: any) => f.file_path === dbFilePath)
    if (!testFile) {
      throw new Error('Test file not found in knowledge base list!')
    }

    console.log(`\n✅ Test file found in knowledge base: ${testFile.file_path} (${testFile.chunks} chunks)`)

    // Delete document
    await deleteDocument(dbFilePath)

    // Verify deletion
    await verifyDeletion()

    // Cleanup temp files
    await cleanup()

    console.log('\n==========================================')
    console.log('✅ ALL END-TO-END TESTS PASSED')
    console.log('==========================================')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ TEST FAILED')
    console.error(error)

    // Attempt cleanup even on failure
    try {
      await cleanup()
    } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError)
    }

    process.exit(1)
  }
}

main()
