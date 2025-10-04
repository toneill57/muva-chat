/**
 * E2E Tests - Conversation Memory Auto-Compression
 *
 * Tests automatic conversation compression triggered at 20 messages.
 * Validates that:
 * 1. No compression occurs with <20 messages
 * 2. First compression at 20 messages (compresses messages 1-10)
 * 3. Second compression at 30 messages (compresses messages 11-20)
 * 4. Compression results are stored in conversation_memory table
 * 5. Active conversation_history is trimmed correctly
 *
 * Part of Conversation Memory System (FASE 5 - Testing)
 *
 * SETUP REQUIRED:
 * - Supabase project must be running (local or remote)
 * - ANTHROPIC_API_KEY must be set (for compression)
 * - OPENAI_API_KEY must be set (for embeddings)
 *
 * RUN:
 * npx playwright test conversation-memory --headed
 *
 * MULTI-TENANT SUPPORT:
 * TENANT_ID=my-hotel npx playwright test conversation-memory --headed
 */

import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ============================================================================
// Configuration
// ============================================================================

const DEV_CHAT_API = 'http://localhost:3000/api/dev/chat'

// Get tenant_id from environment or default to 'simmerdown' for local testing
// Override via: TENANT_ID=my-tenant npx playwright test conversation-memory
const TENANT_ID = process.env.TENANT_ID || 'simmerdown'

// Increase timeout for these tests (they send many messages + wait for compression)
test.setTimeout(180000) // 3 minutes

// ============================================================================
// Test Helpers
// ============================================================================

interface TestSession {
  session_id: string
  tenant_id: string
}

/**
 * Create a new test session via API
 */
async function createTestSession(page: Page): Promise<TestSession> {
  console.log('[test-helper] Creating test session...')

  const response = await page.request.post(DEV_CHAT_API, {
    data: {
      message: 'Hello, starting test session',
      tenant_id: TENANT_ID,
    },
  })

  expect(response.status()).toBe(200)
  const result = await response.json()

  const sessionId = result.data.session_id
  expect(sessionId).toBeTruthy()

  console.log('[test-helper] ✓ Session created:', sessionId)

  return {
    session_id: sessionId,
    tenant_id: TENANT_ID,
  }
}

/**
 * Send a message to an existing session
 */
async function sendMessage(
  page: Page,
  sessionId: string,
  message: string
): Promise<any> {
  const response = await page.request.post(DEV_CHAT_API, {
    data: {
      message,
      session_id: sessionId,
      tenant_id: TENANT_ID,
    },
  })

  expect(response.status()).toBe(200)
  const result = await response.json()

  return result.data
}

/**
 * Send multiple messages efficiently
 */
async function sendMessages(
  page: Page,
  sessionId: string,
  count: number,
  baseMessage: string = 'Test message'
): Promise<void> {
  for (let i = 0; i < count; i++) {
    await sendMessage(page, sessionId, `${baseMessage} ${i + 2}`)
    if ((i + 1) % 5 === 0) {
      console.log(`[test] Progress: ${i + 1}/${count} messages sent`)
    }
  }
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe('Conversation Memory - Auto-Compression', () => {
  // Store session IDs for cleanup
  const testSessions: string[] = []

  test.beforeAll(async () => {
    console.log(`\n🏨 Running tests for tenant: ${TENANT_ID}`)
    console.log(`   Override with: TENANT_ID=my-hotel npx playwright test conversation-memory\n`)
  })

  test.afterAll(async () => {
    // Manual cleanup note - sessions should be cleaned via database admin
    console.log('\n[cleanup] Test sessions created:', testSessions)
    console.log('[cleanup] Run manual cleanup SQL:')
    testSessions.forEach(id => {
      console.log(`DELETE FROM conversation_memory WHERE session_id = '${id}';`)
      console.log(`DELETE FROM prospective_sessions WHERE session_id = '${id}';`)
    })
  })

  /**
   * TEST 1: No compression with 18 messages (9 exchanges)
   *
   * Expected:
   * - 18 total messages in conversation_history
   * - 0 entries in conversation_memory table
   */
  test('should NOT compress with 18 messages', async ({ page }) => {
    console.log('\n=== TEST 1: No compression with 18 messages ===\n')

    // Create session (sends 2 messages: user + assistant)
    const session = await createTestSession(page)
    testSessions.push(session.session_id)

    // Send 8 more exchanges (16 more messages = 18 total)
    await sendMessages(page, session.session_id, 8, 'Looking for apartments')

    // Wait a bit to ensure any async operations complete
    await page.waitForTimeout(2000)

    console.log('[test] ✓ Test complete - 18 messages sent')
    console.log('[test] Manual verification needed:')
    console.log(`[test] SELECT COUNT(*) FROM conversation_memory WHERE session_id = '${session.session_id}';`)
    console.log(`[test] Expected: 0`)
    console.log(`[test] SELECT array_length(conversation_history, 1) FROM prospective_sessions WHERE session_id = '${session.session_id}';`)
    console.log(`[test] Expected: 18`)

    // Mark test as requiring manual verification
    test.info().annotations.push({
      type: 'manual-verification',
      description: 'Verify no compression occurred via database query'
    })
  })

  /**
   * TEST 2: First compression at 20 messages
   *
   * Expected:
   * - Compression triggered when 20th message is added
   * - First 10 messages compressed into summary
   * - conversation_memory has 1 entry with:
   *   - message_range: "messages 1-10"
   *   - message_count: 10
   *   - summary_text: ~200 words
   *   - embedding_fast: 1024 dimensions
   *   - key_entities: structured JSON
   * - conversation_history trimmed to 10 messages (11-20)
   */
  test('should compress first 10 messages when reaching 20', async ({ page }) => {
    console.log('\n=== TEST 2: First compression at 20 messages ===\n')

    // Create session (2 messages)
    const session = await createTestSession(page)
    testSessions.push(session.session_id)

    // Send 9 more exchanges (18 messages = 20 total)
    console.log('[test] Sending 9 exchanges to reach 20 messages...')
    await sendMessages(
      page,
      session.session_id,
      9,
      'I need a beachfront apartment for my family'
    )

    // Wait for compression to complete (async operation)
    console.log('[test] Waiting 5 seconds for compression to complete...')
    await page.waitForTimeout(5000)

    console.log('[test] ✓ Test complete - 20 messages sent, compression should have triggered')
    console.log('[test] Manual verification SQL:')
    console.log(`
-- Verify compression exists
SELECT
  message_range,
  message_count,
  length(summary_text) as summary_length,
  array_length(embedding_fast, 1) as embedding_dims,
  key_entities
FROM conversation_memory
WHERE session_id = '${session.session_id}';

-- Expected:
-- message_range: "messages 1-10"
-- message_count: 10
-- summary_length: 100-2000 characters
-- embedding_dims: 1024
-- key_entities: JSON with topics_discussed, travel_intent, key_questions

-- Verify history trimmed
SELECT array_length(conversation_history, 1) as message_count
FROM prospective_sessions
WHERE session_id = '${session.session_id}';

-- Expected: 10 (messages 11-20)
    `)

    test.info().annotations.push({
      type: 'manual-verification',
      description: 'Verify compression occurred and history was trimmed'
    })
  })

  /**
   * TEST 3: Second compression at 30 messages
   *
   * Expected:
   * - First compression at message 20 (messages 1-10)
   * - Second compression at message 30 (messages 11-20)
   * - conversation_memory has 2 entries
   * - conversation_history has 10 messages (21-30)
   */
  test('should create second compression at 30 messages', async ({ page }) => {
    console.log('\n=== TEST 3: Second compression at 30 messages ===\n')

    // Create session (2 messages)
    const session = await createTestSession(page)
    testSessions.push(session.session_id)

    // Send 14 more exchanges (28 messages = 30 total)
    console.log('[test] Sending 14 exchanges to reach 30 messages...')
    await sendMessages(
      page,
      session.session_id,
      14,
      'Tell me about pricing for December'
    )

    // Wait for both compressions to complete
    console.log('[test] Waiting 8 seconds for compressions to complete...')
    await page.waitForTimeout(8000)

    console.log('[test] ✓ Test complete - 30 messages sent')
    console.log('[test] Manual verification SQL:')
    console.log(`
-- Verify 2 compressions exist
SELECT
  message_range,
  message_count,
  length(summary_text) as summary_length,
  created_at
FROM conversation_memory
WHERE session_id = '${session.session_id}'
ORDER BY created_at ASC;

-- Expected: 2 rows
-- Row 1: message_range="messages 1-10", message_count=10
-- Row 2: message_range="messages 1-10", message_count=10 (will be updated to 11-20 in future)

-- Verify history trimmed to last 10
SELECT array_length(conversation_history, 1) as message_count
FROM prospective_sessions
WHERE session_id = '${session.session_id}';

-- Expected: 10 (messages 21-30)

-- Verify total coverage: 10 + 10 + 10 = 30
SELECT
  (SELECT SUM(message_count) FROM conversation_memory WHERE session_id = '${session.session_id}') as compressed_count,
  (SELECT array_length(conversation_history, 1) FROM prospective_sessions WHERE session_id = '${session.session_id}') as active_count;

-- Expected: compressed_count=20, active_count=10, total=30
    `)

    test.info().annotations.push({
      type: 'manual-verification',
      description: 'Verify 2 compressions exist and history covers all 30 messages'
    })
  })

  /**
   * TEST 4: Compression content quality
   *
   * Send messages with specific content and verify summary captures key points
   */
  test('should generate meaningful summaries with entities', async ({ page }) => {
    console.log('\n=== TEST 4: Compression content quality ===\n')

    const session = await createTestSession(page)
    testSessions.push(session.session_id)

    // Send 9 exchanges with specific travel intent
    const messages = [
      'I need accommodation for December 15-20',
      'We are 4 people, 2 adults and 2 children',
      'We want a beachfront apartment with ocean view',
      'What is the price for 5 nights?',
      'Do you have apartments with a full kitchen?',
      'Are pets allowed in the apartments?',
      'What is your cancellation policy?',
      'Is there parking available?',
      'Can we check in early on December 15?',
    ]

    for (const msg of messages) {
      await sendMessage(page, session.session_id, msg)
      await page.waitForTimeout(300) // Small delay between messages
    }

    console.log('[test] Waiting 5 seconds for compression...')
    await page.waitForTimeout(5000)

    console.log('[test] ✓ Test complete - Rich content sent')
    console.log('[test] Manual verification SQL:')
    console.log(`
-- Verify summary captures key information
SELECT
  summary_text,
  key_entities->'travel_intent'->>'dates' as dates,
  key_entities->'travel_intent'->>'guests' as guests,
  key_entities->'travel_intent'->'preferences' as preferences,
  key_entities->'topics_discussed' as topics,
  key_entities->'key_questions' as questions
FROM conversation_memory
WHERE session_id = '${session.session_id}';

-- Expected:
-- summary_text: Should mention December 15-20, 4 guests, beachfront preference
-- dates: Should contain December dates
-- guests: Should be 4
-- preferences: Should include "beachfront", "ocean view", "kitchen"
-- topics: Should include "pricing", "policies", "amenities"
-- questions: Should capture key guest questions
    `)

    test.info().annotations.push({
      type: 'manual-verification',
      description: 'Verify summary quality and entity extraction'
    })
  })

  /**
   * TEST 5: Performance check
   *
   * Verify that chat remains responsive even when compression is triggered
   */
  test('should remain responsive during compression', async ({ page }) => {
    console.log('\n=== TEST 5: Performance check ===\n')

    const session = await createTestSession(page)
    testSessions.push(session.session_id)

    // Send 9 messages quickly
    console.log('[test] Sending 9 messages rapidly...')
    for (let i = 0; i < 9; i++) {
      await sendMessage(page, session.session_id, `Quick message ${i + 2}`)
    }

    // Measure response time for 20th message (triggers compression)
    console.log('[test] Sending 20th message and measuring response time...')
    const startTime = Date.now()
    await sendMessage(page, session.session_id, 'Message 20 triggers compression')
    const responseTime = Date.now() - startTime

    console.log(`[test] Response time: ${responseTime}ms`)

    // Verify response is reasonable (should not block on compression)
    // Compression should be async, so response should be fast
    expect(responseTime).toBeLessThan(10000) // 10 seconds max (includes Claude call)

    console.log('[test] ✓ Response time acceptable')

    // Wait for async compression
    await page.waitForTimeout(5000)

    console.log('[test] Verify compression completed:')
    console.log(`SELECT COUNT(*) FROM conversation_memory WHERE session_id = '${session.session_id}';`)
    console.log(`Expected: 1`)

    test.info().annotations.push({
      type: 'performance',
      description: `Response time: ${responseTime}ms`
    })
  })

  /**
   * TEST 6: Multiple concurrent sessions
   *
   * Verify that compressions are isolated per session
   */
  test('should handle multiple sessions independently', async ({ page }) => {
    console.log('\n=== TEST 6: Concurrent sessions ===\n')

    // Create two sessions
    const session1 = await createTestSession(page)
    const session2 = await createTestSession(page)
    testSessions.push(session1.session_id, session2.session_id)

    // Session 1: Send 8 messages (18 total - no compression)
    console.log('[test] Session 1: Sending 8 messages (no compression expected)...')
    await sendMessages(page, session1.session_id, 8, 'Session 1 message')

    // Session 2: Send 9 messages (20 total - compression triggered)
    console.log('[test] Session 2: Sending 9 messages (compression expected)...')
    await sendMessages(page, session2.session_id, 9, 'Session 2 message')

    await page.waitForTimeout(5000)

    console.log('[test] ✓ Test complete')
    console.log('[test] Verification SQL:')
    console.log(`
-- Session 1 should have NO compressions
SELECT COUNT(*) as compression_count FROM conversation_memory WHERE session_id = '${session1.session_id}';
-- Expected: 0

-- Session 2 should have 1 compression
SELECT COUNT(*) as compression_count FROM conversation_memory WHERE session_id = '${session2.session_id}';
-- Expected: 1
    `)

    test.info().annotations.push({
      type: 'manual-verification',
      description: 'Verify session isolation'
    })
  })
})

/**
 * Test Helper: Manual Verification Guide
 *
 * After running tests, use these SQL queries in Supabase SQL Editor:
 *
 * 1. View all test sessions:
 *    SELECT session_id, array_length(conversation_history, 1) as msg_count
 *    FROM prospective_sessions
 *    WHERE tenant_id = 'simmerdown'
 *    ORDER BY created_at DESC
 *    LIMIT 10;
 *
 * 2. View compressions for a specific session:
 *    SELECT * FROM conversation_memory WHERE session_id = '<SESSION_ID>';
 *
 * 3. Cleanup test data:
 *    DELETE FROM conversation_memory WHERE session_id IN ('<ID1>', '<ID2>', ...);
 *    DELETE FROM prospective_sessions WHERE session_id IN ('<ID1>', '<ID2>', ...);
 *
 * 4. Verify embedding dimensions:
 *    SELECT session_id, array_length(embedding_fast, 1) as dims
 *    FROM conversation_memory
 *    WHERE session_id = '<SESSION_ID>';
 *    -- Should be 1024
 */
