import { Page, expect } from '@playwright/test'
import { selectors, timeouts, testReservation } from '../fixtures/test-data'

/**
 * Helper functions for Guest Chat E2E tests
 */

/**
 * Login as a guest user
 */
export async function loginAsGuest(
  page: Page,
  checkInDate: string = testReservation.valid.checkInDate,
  phoneLast4: string = testReservation.valid.phoneLast4
) {
  // Navigate to login page with tenant_id
  await page.goto(`/my-stay/${testReservation.valid.tenantId}`)

  // Fill in credentials
  await page.fill(selectors.login.checkInDateInput, checkInDate)
  await page.fill(selectors.login.phoneLast4Input, phoneLast4)

  // Submit form
  await page.click(selectors.login.submitButton)

  // Wait for navigation to chat interface
  await page.waitForURL(/\/my-stay/, { timeout: timeouts.login })

  // Verify we're on the chat page
  await expect(page.locator(selectors.chat.messageInput)).toBeVisible()
}

/**
 * Send a message in the chat
 */
export async function sendMessage(page: Page, message: string) {
  // Type message
  await page.fill(selectors.chat.messageInput, message)

  // Click send button
  await page.click(selectors.chat.sendButton)

  // Wait for message to appear in chat
  await page.waitForSelector(
    `${selectors.chat.userMessage}:has-text("${message.substring(0, 20)}")`,
    { timeout: timeouts.messageSend }
  )
}

/**
 * Wait for AI response
 */
export async function waitForAiResponse(page: Page) {
  // Wait for typing indicator to appear
  await expect(page.locator(selectors.chat.typingIndicator).first()).toBeVisible({
    timeout: 2000,
  })

  // Wait for typing indicator to disappear (response received)
  await expect(page.locator(selectors.chat.typingIndicator).first()).toBeHidden({
    timeout: timeouts.aiResponse,
  })

  // Wait a bit for rendering
  await page.waitForTimeout(500)
}

/**
 * Get all messages in the chat
 */
export async function getAllMessages(page: Page) {
  const userMessages = await page.locator(selectors.chat.userMessage).allTextContents()
  const assistantMessages = await page.locator(selectors.chat.assistantMessage).allTextContents()

  return {
    user: userMessages,
    assistant: assistantMessages,
    total: userMessages.length + assistantMessages.length,
  }
}

/**
 * Get the last assistant message
 */
export async function getLastAssistantMessage(page: Page): Promise<string> {
  const messages = await page.locator(selectors.chat.assistantMessage).allTextContents()
  return messages[messages.length - 1] || ''
}

/**
 * Click a follow-up suggestion
 */
export async function clickFollowUpSuggestion(page: Page, index: number = 0) {
  const suggestions = page.locator(selectors.chat.followUpSuggestion)
  await suggestions.nth(index).click()
}

/**
 * Click an entity badge
 */
export async function clickEntityBadge(page: Page, entityName: string) {
  await page.click(`${selectors.chat.entityBadge}:has-text("${entityName}")`)
}

/**
 * Check if typing indicator is visible
 */
export async function isTypingIndicatorVisible(page: Page): Promise<boolean> {
  return await page.locator(selectors.chat.typingIndicator).first().isVisible()
}

/**
 * Logout from chat
 */
export async function logout(page: Page) {
  await page.click(selectors.chat.logoutButton)

  // Wait for redirect to login page
  await page.waitForSelector(selectors.login.submitButton, {
    timeout: timeouts.navigation,
  })
}

/**
 * Check if error is displayed
 */
export async function isErrorDisplayed(page: Page): Promise<boolean> {
  return await page.locator(selectors.chat.errorBar).isVisible()
}

/**
 * Click retry button
 */
export async function clickRetry(page: Page) {
  await page.click(selectors.chat.retryButton)
}

/**
 * Wait for welcome message
 */
export async function waitForWelcomeMessage(page: Page) {
  await page.waitForSelector(
    `${selectors.chat.assistantMessage}:has-text("Bienvenido")`,
    { timeout: 15000 } // Increased timeout for history loading + welcome message
  )
}

/**
 * Assert message contains text
 */
export async function assertMessageContains(page: Page, text: string | RegExp) {
  const lastMessage = await getLastAssistantMessage(page)
  if (typeof text === 'string') {
    expect(lastMessage).toContain(text)
  } else {
    expect(lastMessage).toMatch(text)
  }
}

/**
 * Assert message has markdown formatting
 */
export async function assertHasMarkdownFormatting(page: Page) {
  const lastMessage = await getLastAssistantMessage(page)
  expect(lastMessage).toMatch(/\*\*|\*|#|-/)
}

/**
 * Take screenshot with name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `e2e/screenshots/${name}.png`,
    fullPage: true,
  })
}

/**
 * Measure message response time
 */
export async function measureResponseTime(
  page: Page,
  message: string
): Promise<number> {
  const startTime = Date.now()

  await sendMessage(page, message)
  await waitForAiResponse(page)

  const endTime = Date.now()
  return endTime - startTime
}

/**
 * Simulate network error
 */
export async function simulateNetworkError(page: Page) {
  await page.route('/api/guest/chat', (route) => {
    route.abort('failed')
  })
}

/**
 * Restore network
 */
export async function restoreNetwork(page: Page) {
  await page.unroute('/api/guest/chat')
}
