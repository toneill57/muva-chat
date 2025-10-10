/**
 * Test script for Knowledge Base Browser API
 *
 * Tests:
 * 1. GET /api/admin/knowledge-base - List documents
 * 2. DELETE /api/admin/knowledge-base - Delete document
 *
 * Prerequisites:
 * - .env.local configured with Supabase credentials
 * - tenant_knowledge_embeddings table exists
 * - At least one document uploaded via upload-docs API
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/test-knowledge-browser-api.ts
 */

import { createServerClient } from '@/lib/supabase'

const TEST_TENANT_ID = process.env.TEST_TENANT_ID || '11111111-1111-1111-1111-111111111111'
const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function testGetKnowledgeBase() {
  console.log('\n=== TEST 1: GET /api/admin/knowledge-base ===')

  try {
    const url = `${API_BASE}/api/admin/knowledge-base?tenant_id=${TEST_TENANT_ID}`
    console.log(`Fetching: ${url}`)

    const response = await fetch(url)
    const data = await response.json()

    console.log('Response status:', response.status)
    console.log('Response data:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.error('❌ GET request failed')
      return false
    }

    if (!data.success) {
      console.error('❌ API returned success: false')
      return false
    }

    console.log(`✅ Found ${data.total_files} files with ${data.total_chunks} total chunks`)

    // Display files
    if (data.files && data.files.length > 0) {
      console.log('\nFiles:')
      data.files.forEach((file: any, idx: number) => {
        console.log(`  ${idx + 1}. ${file.file_path}`)
        console.log(`     Chunks: ${file.chunks}`)
        console.log(`     Created: ${new Date(file.created_at).toLocaleString()}`)
      })
    } else {
      console.log('\nℹ️  No files found in knowledge base')
      console.log('💡 Upload a document first using: npm run upload-test-doc')
    }

    return true
  } catch (error) {
    console.error('❌ Test failed with error:', error)
    return false
  }
}

async function testDeleteKnowledgeBase() {
  console.log('\n=== TEST 2: DELETE /api/admin/knowledge-base ===')

  try {
    // First, get a file to delete
    const listResponse = await fetch(`${API_BASE}/api/admin/knowledge-base?tenant_id=${TEST_TENANT_ID}`)
    const listData = await listResponse.json()

    if (!listData.success || !listData.files || listData.files.length === 0) {
      console.log('⚠️  No files available to delete. Skipping DELETE test.')
      return true
    }

    const fileToDelete = listData.files[0]
    console.log(`Attempting to delete: ${fileToDelete.file_path} (${fileToDelete.chunks} chunks)`)

    // Ask for confirmation
    console.log('\n⚠️  This will actually delete the file from the database!')
    console.log('To proceed with deletion, set DELETE_CONFIRMATION=true in environment')

    if (process.env.DELETE_CONFIRMATION !== 'true') {
      console.log('ℹ️  Skipping actual deletion (safety check)')
      console.log('💡 To test deletion, run: DELETE_CONFIRMATION=true npx tsx scripts/test-knowledge-browser-api.ts')
      return true
    }

    // Proceed with deletion
    const deleteResponse = await fetch(`${API_BASE}/api/admin/knowledge-base`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenant_id: TEST_TENANT_ID,
        file_path: fileToDelete.file_path,
      }),
    })

    const deleteData = await deleteResponse.json()

    console.log('Delete response status:', deleteResponse.status)
    console.log('Delete response data:', JSON.stringify(deleteData, null, 2))

    if (!deleteResponse.ok || !deleteData.success) {
      console.error('❌ DELETE request failed')
      return false
    }

    console.log(`✅ Successfully deleted ${deleteData.deleted_chunks} chunks`)

    // Verify deletion
    const verifyResponse = await fetch(`${API_BASE}/api/admin/knowledge-base?tenant_id=${TEST_TENANT_ID}`)
    const verifyData = await verifyResponse.json()

    const stillExists = verifyData.files?.some((f: any) => f.file_path === fileToDelete.file_path)

    if (stillExists) {
      console.error('❌ File still exists after deletion!')
      return false
    }

    console.log('✅ Verified: File no longer in knowledge base')
    return true
  } catch (error) {
    console.error('❌ Test failed with error:', error)
    return false
  }
}

async function testValidation() {
  console.log('\n=== TEST 3: Validation Tests ===')

  // Test 1: Missing tenant_id
  try {
    console.log('\nTest 3.1: GET without tenant_id')
    const response = await fetch(`${API_BASE}/api/admin/knowledge-base`)
    const data = await response.json()

    if (response.status === 400 && data.error === 'Missing tenant_id') {
      console.log('✅ Correctly rejected missing tenant_id')
    } else {
      console.error('❌ Should have rejected missing tenant_id')
      return false
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }

  // Test 2: DELETE without tenant_id
  try {
    console.log('\nTest 3.2: DELETE without tenant_id')
    const response = await fetch(`${API_BASE}/api/admin/knowledge-base`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: 'test.md' }),
    })
    const data = await response.json()

    if (response.status === 400 && data.error === 'Missing tenant_id') {
      console.log('✅ Correctly rejected missing tenant_id in DELETE')
    } else {
      console.error('❌ Should have rejected missing tenant_id')
      return false
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }

  // Test 3: DELETE without file_path
  try {
    console.log('\nTest 3.3: DELETE without file_path')
    const response = await fetch(`${API_BASE}/api/admin/knowledge-base`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: TEST_TENANT_ID }),
    })
    const data = await response.json()

    if (response.status === 400 && data.error === 'Missing file_path') {
      console.log('✅ Correctly rejected missing file_path in DELETE')
    } else {
      console.error('❌ Should have rejected missing file_path')
      return false
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }

  console.log('\n✅ All validation tests passed')
  return true
}

async function testDirectDatabaseQuery() {
  console.log('\n=== TEST 4: Direct Database Query ===')

  try {
    const supabase = createServerClient()

    // Count total embeddings for test tenant
    const { count, error } = await supabase
      .from('tenant_knowledge_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', TEST_TENANT_ID)

    if (error) {
      console.error('❌ Database query failed:', error)
      return false
    }

    console.log(`✅ Found ${count} total embeddings in database for tenant ${TEST_TENANT_ID}`)

    // Get unique file paths
    const { data: files, error: filesError } = await supabase
      .from('tenant_knowledge_embeddings')
      .select('file_path')
      .eq('tenant_id', TEST_TENANT_ID)

    if (filesError) {
      console.error('❌ Files query failed:', filesError)
      return false
    }

    const uniqueFiles = new Set(files?.map(f => f.file_path) || [])
    console.log(`✅ Found ${uniqueFiles.size} unique files:`)
    uniqueFiles.forEach(file => console.log(`   - ${file}`))

    return true
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

async function main() {
  console.log('🧪 Knowledge Base Browser API Test Suite')
  console.log('========================================')
  console.log(`Test Tenant ID: ${TEST_TENANT_ID}`)
  console.log(`API Base URL: ${API_BASE}`)

  const results = {
    directQuery: await testDirectDatabaseQuery(),
    get: await testGetKnowledgeBase(),
    validation: await testValidation(),
    delete: await testDeleteKnowledgeBase(),
  }

  console.log('\n========================================')
  console.log('📊 TEST SUMMARY')
  console.log('========================================')
  console.log(`Direct DB Query: ${results.directQuery ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`GET endpoint:    ${results.get ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Validation:      ${results.validation ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`DELETE endpoint: ${results.delete ? '✅ PASS' : '❌ FAIL'}`)

  const allPassed = Object.values(results).every(r => r === true)
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)

  process.exit(allPassed ? 0 : 1)
}

main()
