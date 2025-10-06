/**
 * Test Script: Multi-Modal File Upload + Claude Vision API
 *
 * Purpose: Test file upload API endpoint with Claude Vision analysis
 * FASE 2.5: Multi-Modal File Upload
 * Date: 2025-10-05
 *
 * Usage:
 *   npx ts-node scripts/test-file-upload.ts
 *
 * Requirements:
 *   - Dev server running (./scripts/dev-with-keys.sh)
 *   - Valid guest JWT token (from guest login)
 *   - Test images in scripts/test-assets/
 */

import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = 'http://localhost:3000'
const GUEST_LOGIN_ENDPOINT = `${API_BASE_URL}/api/guest/auth/login`
const CONVERSATIONS_ENDPOINT = `${API_BASE_URL}/api/guest/conversations`

// Test credentials (from guest_reservations table)
// Using actual data from database: tenant_id = SimmerDown (b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf)
const TEST_CREDENTIALS = {
  tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
  check_in_date: '2026-01-01', // Active reservation in DB
  phone_last_4: '0000', // Matches reservation
}

// ============================================================================
// Helper Functions
// ============================================================================

interface GuestSession {
  token: string
  guest_name: string
  conversation_id: string
  reservation_id: string
}

/**
 * Authenticate guest and get JWT token
 */
async function authenticateGuest(): Promise<GuestSession> {
  console.log('\n[test] 1. Authenticating guest...')
  console.log('[test] Credentials:', TEST_CREDENTIALS)

  const response = await fetch(GUEST_LOGIN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_CREDENTIALS),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Authentication failed: ${response.status} ${error}`)
  }

  const data: any = await response.json()

  console.log('[test] ✅ Authenticated:', {
    guest: data.guest_name,
    reservation_id: data.reservation_id,
    has_token: !!data.token,
  })

  return {
    token: data.token,
    guest_name: data.guest_name,
    conversation_id: data.conversation_id,
    reservation_id: data.reservation_id,
  }
}

/**
 * Create a new conversation for testing
 */
async function createTestConversation(token: string): Promise<string> {
  console.log('\n[test] 2. Creating test conversation...')

  const response = await fetch(CONVERSATIONS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Test - File Upload',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Create conversation failed: ${response.status} ${error}`)
  }

  const data: any = await response.json()

  console.log('[test] ✅ Conversation created:', {
    id: data.conversation.id,
    title: data.conversation.title,
  })

  return data.conversation.id
}

/**
 * Upload file to conversation
 */
async function uploadFile(
  conversationId: string,
  token: string,
  filePath: string,
  analysisType: 'location' | 'passport' | 'general'
): Promise<any> {
  console.log(`\n[test] Uploading file: ${path.basename(filePath)}`)
  console.log('[test] Analysis type:', analysisType)

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const fileBuffer = fs.readFileSync(filePath)
  const fileBlob = new Blob([fileBuffer], { type: 'image/png' })
  const fileName = path.basename(filePath)

  const formData = new FormData()
  formData.append('file', fileBlob, fileName)
  formData.append('analysisType', analysisType)

  if (analysisType === 'general') {
    formData.append('customPrompt', '¿Qué hay en esta imagen?')
  }

  const uploadUrl = `${API_BASE_URL}/api/guest/conversations/${conversationId}/attachments`

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Upload failed: ${response.status} ${error}`)
  }

  const data: any = await response.json()

  console.log('[test] ✅ Upload successful:', {
    attachment_id: data.attachment.id,
    file_url: data.attachment.file_url.substring(0, 80) + '...',
    file_size: data.attachment.file_size_bytes,
    duration_ms: data.metadata.duration_ms,
    has_vision: !!data.visionAnalysis,
  })

  if (data.visionAnalysis) {
    console.log('[test] Vision Analysis:', {
      confidence: data.visionAnalysis.confidence,
      description: data.visionAnalysis.description?.substring(0, 150) + '...',
      location: data.visionAnalysis.location,
      passportData: data.visionAnalysis.passportData,
    })
  }

  return data
}

/**
 * Get all attachments for a conversation
 */
async function getAttachments(conversationId: string, token: string): Promise<any> {
  console.log(`\n[test] Getting attachments for conversation: ${conversationId}`)

  const url = `${API_BASE_URL}/api/guest/conversations/${conversationId}/attachments`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Get attachments failed: ${response.status} ${error}`)
  }

  const data: any = await response.json()

  console.log('[test] ✅ Attachments retrieved:', {
    count: data.count,
    files: data.attachments.map((a: any) => ({
      id: a.id,
      filename: a.original_filename,
      type: a.file_type,
      analysis_type: a.analysis_type,
    })),
  })

  return data
}

// ============================================================================
// Test Cases
// ============================================================================

async function testImageUpload(session: GuestSession, conversationId: string) {
  console.log('\n========================================')
  console.log('TEST 1: Image Upload (General Analysis)')
  console.log('========================================')

  // Create a small test image programmatically (1x1 PNG)
  const testImagePath = path.join(__dirname, 'test-image.png')
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  )
  fs.writeFileSync(testImagePath, pngBuffer)

  try {
    const result = await uploadFile(conversationId, session.token, testImagePath, 'general')

    // Validate response
    if (!result.success) {
      throw new Error('Upload failed: success = false')
    }

    if (!result.attachment || !result.attachment.file_url) {
      throw new Error('Missing attachment data in response')
    }

    console.log('[test] ✅ TEST 1 PASSED')
  } finally {
    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath)
    }
  }
}

async function testFileSizeLimit(session: GuestSession, conversationId: string) {
  console.log('\n========================================')
  console.log('TEST 2: File Size Limit (>10MB)')
  console.log('========================================')

  // Create a 11MB file
  const largeFilePath = path.join(__dirname, 'test-large-file.png')
  const largeBuffer = Buffer.alloc(11 * 1024 * 1024) // 11MB
  fs.writeFileSync(largeFilePath, largeBuffer)

  try {
    await uploadFile(conversationId, session.token, largeFilePath, 'general')
    console.log('[test] ❌ TEST 2 FAILED - Should have rejected large file')
  } catch (error) {
    if (error instanceof Error && error.message.includes('400')) {
      console.log('[test] ✅ TEST 2 PASSED - Large file rejected')
    } else {
      throw error
    }
  } finally {
    // Cleanup
    if (fs.existsSync(largeFilePath)) {
      fs.unlinkSync(largeFilePath)
    }
  }
}

async function testInvalidFileType(session: GuestSession, conversationId: string) {
  console.log('\n========================================')
  console.log('TEST 3: Invalid File Type (.txt)')
  console.log('========================================')

  const txtFilePath = path.join(__dirname, 'test-file.txt')
  fs.writeFileSync(txtFilePath, 'Test content')

  try {
    await uploadFile(conversationId, session.token, txtFilePath, 'general')
    console.log('[test] ❌ TEST 3 FAILED - Should have rejected .txt file')
  } catch (error) {
    if (error instanceof Error && error.message.includes('400')) {
      console.log('[test] ✅ TEST 3 PASSED - Invalid file type rejected')
    } else {
      throw error
    }
  } finally {
    // Cleanup
    if (fs.existsSync(txtFilePath)) {
      fs.unlinkSync(txtFilePath)
    }
  }
}

async function testGetAttachments(session: GuestSession, conversationId: string) {
  console.log('\n========================================')
  console.log('TEST 4: Get Attachments (List)')
  console.log('========================================')

  const result = await getAttachments(conversationId, session.token)

  if (result.count === 0) {
    console.log('[test] ⚠️  TEST 4 WARNING - No attachments found (expected at least 1)')
  } else {
    console.log('[test] ✅ TEST 4 PASSED')
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log('========================================')
  console.log('MULTI-MODAL FILE UPLOAD - TEST SUITE')
  console.log('========================================')
  console.log('Date:', new Date().toISOString())
  console.log('API Base URL:', API_BASE_URL)

  try {
    // Step 1: Authenticate guest
    const session = await authenticateGuest()

    // Step 2: Create test conversation
    const conversationId = await createTestConversation(session.token)

    // Step 3: Run test cases
    await testImageUpload(session, conversationId)
    await testFileSizeLimit(session, conversationId)
    await testInvalidFileType(session, conversationId)
    await testGetAttachments(session, conversationId)

    console.log('\n========================================')
    console.log('✅ ALL TESTS COMPLETED')
    console.log('========================================')
  } catch (error) {
    console.error('\n========================================')
    console.error('❌ TEST SUITE FAILED')
    console.error('========================================')
    console.error('Error:', error)
    process.exit(1)
  }
}

// Run tests
runTests()
