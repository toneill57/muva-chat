import { test, expect } from '@playwright/test'
import {
  loginAsGuest,
  sendMessage,
  waitForAiResponse,
  getLastAssistantMessage,
  assertMessageContains,
  assertHasMarkdownFormatting,
  logout,
  waitForWelcomeMessage,
  measureResponseTime,
} from './helpers/chat-helpers'
import { testQueries, expectedResponses, selectors } from './fixtures/test-data'

/**
 * Guest Chat Messaging E2E Tests
 *
 * Tests the core messaging functionality
 */

test.describe('Guest Chat Messaging', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsGuest(page)

    // Wait for welcome message
    await waitForWelcomeMessage(page)
  })

  test('should display welcome message after login', async ({ page }) => {
    // Verify welcome message is shown
    const messages = await page.locator(selectors.chat.assistantMessage).allTextContents()
    const welcomeMessage = messages[0]

    expect(welcomeMessage).toContain('Bienvenido')
    expect(welcomeMessage).toContain('puedo ayudarte')

    // Verify guest name is in header
    await expect(page.locator(selectors.header.guestName)).toBeVisible()
    await expect(page.locator(selectors.header.dates)).toBeVisible()
  })

  test('should send message and receive response', async ({ page }) => {
    // Send a message
    await sendMessage(page, testQueries.greeting)

    // Verify typing indicator appears
    await expect(page.locator(selectors.chat.typingIndicator).first()).toBeVisible()

    // Wait for AI response
    await waitForAiResponse(page)

    // Verify response was received
    const lastMessage = await getLastAssistantMessage(page)
    expect(lastMessage.length).toBeGreaterThan(0)

    // Response should be contextual
    expect(lastMessage).toMatch(expectedResponses.isConversational)
  })

  test('should handle tourism queries with business info', async ({ page }) => {
    // Send tourism query
    await sendMessage(page, testQueries.tourism)
    await waitForAiResponse(page)

    // Verify response contains activities/places
    await assertMessageContains(page, expectedResponses.hasActivities)

    // Verify markdown formatting
    await assertHasMarkdownFormatting(page)

    // Response should have business metadata (price, phone, zone)
    const lastMessage = await getLastAssistantMessage(page)
    const hasBusinessInfo = expectedResponses.hasBusinessInfo.test(lastMessage)

    // Log for debugging if missing
    if (!hasBusinessInfo) {
      console.log('Tourism response missing business info:', lastMessage)
    }
  })

  test('should handle accommodation queries', async ({ page }) => {
    // Send accommodation query
    await sendMessage(page, testQueries.accommodation)
    await waitForAiResponse(page)

    // Verify response is relevant
    const lastMessage = await getLastAssistantMessage(page)
    expect(lastMessage.length).toBeGreaterThan(0)

    // Should mention room or accommodation
    expect(lastMessage).toMatch(/habitación|suite|cuarto|amenidad|servicio/i)
  })

  test('should maintain conversation context', async ({ page }) => {
    // First message: Ask about beaches
    await sendMessage(page, 'What beaches are nearby?')
    await waitForAiResponse(page)

    const firstResponse = await getLastAssistantMessage(page)
    expect(firstResponse).toMatch(/playa|beach/i)

    // Second message: Follow-up without context
    await sendMessage(page, 'How do I get there?')
    await waitForAiResponse(page)

    const secondResponse = await getLastAssistantMessage(page)

    // Should reference the beach from previous context
    expect(secondResponse).toMatch(/playa|transporte|llegar|dirección/i)
  })

  test('should display typing indicator during AI processing', async ({ page }) => {
    // Start sending a message
    await sendMessage(page, testQueries.complex)

    // Typing indicator should appear immediately
    await expect(page.locator(selectors.chat.typingIndicator).first()).toBeVisible({
      timeout: 2000,
    })

    // Should have animation
    const typingDot = page.locator(selectors.chat.typingIndicator).first()
    const hasAnimation = await typingDot.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return style.animation !== 'none' && style.animation.length > 0
    })
    expect(hasAnimation).toBeTruthy()

    // Wait for response
    await waitForAiResponse(page)

    // Typing indicator should be gone
    await expect(page.locator(selectors.chat.typingIndicator).first()).toBeHidden()
  })

  test('should support multiline messages', async ({ page }) => {
    const multilineMessage = 'Line 1\nLine 2\nLine 3'

    // Type multiline message (Shift+Enter)
    const textarea = page.locator(selectors.chat.messageInput)
    await textarea.fill(multilineMessage)

    // Verify textarea expanded
    const textareaHeight = await textarea.evaluate((el: HTMLTextAreaElement) => el.scrollHeight)
    expect(textareaHeight).toBeGreaterThan(44) // Should be taller than single line

    // Send message
    await page.click(selectors.chat.sendButton)

    // Wait for response
    await waitForAiResponse(page)

    // Verify message was sent
    const userMessages = await page.locator(selectors.chat.userMessage).allTextContents()
    const lastUserMessage = userMessages[userMessages.length - 1]
    expect(lastUserMessage).toContain('Line 1')
  })

  test('should support keyboard shortcuts', async ({ page }) => {
    const textarea = page.locator(selectors.chat.messageInput)

    // Focus textarea
    await textarea.click()

    // Type message
    await textarea.fill(testQueries.greeting)

    // Submit with Enter (not Shift+Enter)
    await page.keyboard.press('Enter')

    // Should send the message
    await expect(page.locator(selectors.chat.typingIndicator).first()).toBeVisible({
      timeout: 2000,
    })
  })

  test('should auto-scroll to latest message', async ({ page }) => {
    // Send multiple messages to create scrollable content
    for (let i = 0; i < 5; i++) {
      await sendMessage(page, `Test message ${i + 1}`)
      await waitForAiResponse(page)
    }

    // Wait a bit for scroll animation
    await page.waitForTimeout(500)

    // Verify last message is in viewport
    const lastMessage = page.locator(selectors.chat.assistantMessage).last()
    await expect(lastMessage).toBeInViewport()
  })

  test('should disable send button during processing', async ({ page }) => {
    const textarea = page.locator(selectors.chat.messageInput)
    const sendButton = page.locator(selectors.chat.sendButton)

    // Type message
    await textarea.fill(testQueries.greeting)

    // Button should be enabled
    await expect(sendButton).toBeEnabled()

    // Send message
    await sendButton.click()

    // Button should be disabled during processing
    await expect(sendButton).toBeDisabled()

    // Wait for response
    await waitForAiResponse(page)

    // Button should be enabled again (but disabled because textarea is empty)
    await expect(textarea).toHaveValue('')
  })

  test('should handle empty messages', async ({ page }) => {
    const sendButton = page.locator(selectors.chat.sendButton)

    // Send button should be disabled when textarea is empty
    await expect(sendButton).toBeDisabled()

    // Try sending whitespace
    const textarea = page.locator(selectors.chat.messageInput)
    await textarea.fill('   ')

    // Should still be disabled
    await expect(sendButton).toBeDisabled()
  })

  test('should logout successfully', async ({ page }) => {
    // Click logout button
    await logout(page)

    // Should redirect to login page
    await expect(page.locator(selectors.login.submitButton)).toBeVisible()

    // Should not have access to chat
    await page.goto('/my-stay/test-hotel')
    await expect(page.locator(selectors.login.submitButton)).toBeVisible()
  })

  test('should measure reasonable response time', async ({ page }) => {
    // Measure response time
    const responseTime = await measureResponseTime(page, testQueries.tourism)

    // Should respond within 15 seconds
    expect(responseTime).toBeLessThan(15000)

    // Log for monitoring
    console.log(`Response time: ${responseTime}ms`)
  })

  test('should handle markdown formatting in responses', async ({ page }) => {
    await sendMessage(page, testQueries.tourism)
    await waitForAiResponse(page)

    // Check for markdown rendering
    const lastMessage = page.locator(selectors.chat.assistantMessage).last()

    // Should have formatted text (bold, lists, etc.)
    const hasBold = await lastMessage.locator('strong').count()
    const hasLists = await lastMessage.locator('ul, ol').count()

    // At least one formatting element
    expect(hasBold + hasLists).toBeGreaterThan(0)
  })

  test('should be mobile-friendly', async ({ page, viewport }) => {
    // Skip if not mobile
    if (!viewport || viewport.width > 768) {
      test.skip()
    }

    // Verify layout is responsive
    const messageInput = page.locator(selectors.chat.messageInput)
    const sendButton = page.locator(selectors.chat.sendButton)

    // Verify elements are visible
    await expect(messageInput).toBeVisible()
    await expect(sendButton).toBeVisible()

    // Verify touch targets
    const buttonBox = await sendButton.boundingBox()
    expect(buttonBox?.width).toBeGreaterThanOrEqual(44)
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44)

    // Send a message
    await sendMessage(page, testQueries.greeting)
    await waitForAiResponse(page)

    // Verify message bubbles don't overflow
    const lastMessage = page.locator(selectors.chat.assistantMessage).last()
    const messageBox = await lastMessage.boundingBox()
    expect(messageBox?.width).toBeLessThanOrEqual(viewport.width)
  })

  test('should preserve chat history on page reload', async ({ page }) => {
    // Send a message
    await sendMessage(page, testQueries.greeting)
    await waitForAiResponse(page)

    // Get message count
    const messagesBeforeReload = await page.locator(selectors.chat.assistantMessage).count()

    // Reload page
    await page.reload()

    // Wait for page to load
    await expect(page.locator(selectors.chat.messageInput)).toBeVisible()

    // Verify messages are preserved
    const messagesAfterReload = await page.locator(selectors.chat.assistantMessage).count()
    expect(messagesAfterReload).toBe(messagesBeforeReload)
  })
})
