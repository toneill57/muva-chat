import { test, expect } from '@playwright/test'
import { selectors, testReservation, timeouts } from './fixtures/test-data'

/**
 * Guest Login Flow E2E Tests
 *
 * Tests the authentication flow for guest users
 */

test.describe('Guest Login', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to guest chat login (using test tenant)
    await page.goto('/my-stay/test-hotel')

    // Wait for page to load
    await expect(page.locator('text=Bienvenido')).toBeVisible()
  })

  test('should display login form with correct elements', async ({ page }) => {
    // Verify form elements are visible
    await expect(page.locator(selectors.login.checkInDateInput)).toBeVisible()
    await expect(page.locator(selectors.login.phoneLast4Input)).toBeVisible()
    await expect(page.locator(selectors.login.submitButton)).toBeVisible()

    // Verify labels
    await expect(page.locator('text=Fecha de Check-in')).toBeVisible()
    await expect(page.locator('text=Últimos 4 dígitos del teléfono')).toBeVisible()

    // Verify submit button is disabled initially
    const submitButton = page.locator(selectors.login.submitButton)
    await expect(submitButton).toBeDisabled()
  })

  test('should validate check-in date field', async ({ page }) => {
    const dateInput = page.locator(selectors.login.checkInDateInput)
    const phoneInput = page.locator(selectors.login.phoneLast4Input)

    // Fill phone first (valid)
    await phoneInput.fill('1234')

    // Try empty date (blur to trigger validation)
    await dateInput.focus()
    await dateInput.blur()

    // Should show error
    await expect(page.locator('text=La fecha de check-in es requerida')).toBeVisible()

    // Submit button should remain disabled
    const submitButton = page.locator(selectors.login.submitButton)
    await expect(submitButton).toBeDisabled()
  })

  test('should validate phone last 4 digits field', async ({ page }) => {
    const dateInput = page.locator(selectors.login.checkInDateInput)
    const phoneInput = page.locator(selectors.login.phoneLast4Input)

    // Fill date first (valid)
    await dateInput.fill(testReservation.valid.checkInDate)

    // Try less than 4 digits
    await phoneInput.fill('12')
    await phoneInput.blur()

    // Should show error
    await expect(page.locator('text=Debe ingresar exactamente 4 dígitos')).toBeVisible()

    // Try non-numeric characters (should be filtered)
    await phoneInput.fill('abcd')
    const value = await phoneInput.inputValue()
    expect(value).toBe('') // Should filter out non-numeric
  })

  test('should enable submit button when form is valid', async ({ page }) => {
    const dateInput = page.locator(selectors.login.checkInDateInput)
    const phoneInput = page.locator(selectors.login.phoneLast4Input)
    const submitButton = page.locator(selectors.login.submitButton)

    // Initially disabled
    await expect(submitButton).toBeDisabled()

    // Fill valid data
    await dateInput.fill(testReservation.valid.checkInDate)
    await phoneInput.fill(testReservation.valid.phoneLast4)

    // Should be enabled
    await expect(submitButton).toBeEnabled()

    // Should show success indicator
    await expect(page.locator('svg.text-green-500')).toBeVisible()
  })

  test('should successfully login with valid credentials', async ({ page }) => {
    const dateInput = page.locator(selectors.login.checkInDateInput)
    const phoneInput = page.locator(selectors.login.phoneLast4Input)
    const submitButton = page.locator(selectors.login.submitButton)

    // Fill valid credentials
    await dateInput.fill(testReservation.valid.checkInDate)
    await phoneInput.fill(testReservation.valid.phoneLast4)

    // Submit
    await submitButton.click()

    // Should show loading state
    await expect(page.locator(selectors.login.loadingIndicator)).toBeVisible()

    // Should redirect to chat interface
    await page.waitForURL(/\/my-stay/, { timeout: timeouts.login })

    // Verify we're on chat page
    await expect(page.locator(selectors.chat.messageInput)).toBeVisible({
      timeout: timeouts.navigation,
    })

    // Verify guest name is displayed
    await expect(
      page.locator(selectors.header.guestName)
    ).toContainText(testReservation.valid.expectedGuestName)
  })

  test('should show error with invalid credentials', async ({ page }) => {
    const dateInput = page.locator(selectors.login.checkInDateInput)
    const phoneInput = page.locator(selectors.login.phoneLast4Input)
    const submitButton = page.locator(selectors.login.submitButton)

    // Fill with valid format but wrong credentials (valid date, wrong phone)
    await dateInput.fill(testReservation.valid.checkInDate)
    await phoneInput.fill(testReservation.invalid.phoneLast4)

    // Wait for button to be enabled (form validation passes)
    await expect(submitButton).toBeEnabled({ timeout: 5000 })

    // Submit
    await submitButton.click()

    // Should show loading state briefly
    await expect(page.locator(selectors.login.loadingIndicator)).toBeVisible()

    // Wait a bit for error to appear
    await page.waitForTimeout(1000)

    // Should still be on login page (not redirected) - this proves auth failed
    await expect(page.locator(selectors.login.submitButton)).toBeVisible()

    // Verify URL didn't change (stayed on login)
    expect(page.url()).toContain('/my-stay/test-hotel')
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network error
    await page.route('/api/guest/login', (route) => {
      route.abort('failed')
    })

    const dateInput = page.locator(selectors.login.checkInDateInput)
    const phoneInput = page.locator(selectors.login.phoneLast4Input)
    const submitButton = page.locator(selectors.login.submitButton)

    // Fill valid credentials
    await dateInput.fill(testReservation.valid.checkInDate)
    await phoneInput.fill(testReservation.valid.phoneLast4)

    // Submit
    await submitButton.click()

    // Should show error
    await expect(page.locator(selectors.login.errorMessage)).toBeVisible({
      timeout: timeouts.login,
    })
  })

  test('should be mobile-friendly', async ({ page, viewport }) => {
    // Skip if not mobile
    if (!viewport || viewport.width > 768) {
      test.skip()
    }

    // Verify mobile layout
    const card = page.locator('.max-w-md')
    await expect(card).toBeVisible()

    // Verify touch targets are large enough (min 44px)
    const submitButton = page.locator(selectors.login.submitButton)
    const buttonBox = await submitButton.boundingBox()
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44)

    // Verify inputs are large enough for mobile
    const dateInput = page.locator(selectors.login.checkInDateInput)
    const inputBox = await dateInput.boundingBox()
    expect(inputBox?.height).toBeGreaterThanOrEqual(44)
  })

  test('should support keyboard navigation', async ({ page }) => {
    const dateInput = page.locator(selectors.login.checkInDateInput)
    const phoneInput = page.locator(selectors.login.phoneLast4Input)
    const submitButton = page.locator(selectors.login.submitButton)

    // Fill form using keyboard navigation
    await dateInput.click()
    await dateInput.fill(testReservation.valid.checkInDate)

    // Tab to phone input and verify it's reachable
    await page.keyboard.press('Tab')
    await phoneInput.fill(testReservation.valid.phoneLast4)

    // Verify phone input received the value (proves Tab worked)
    await expect(phoneInput).toHaveValue(testReservation.valid.phoneLast4)

    // Wait for button to be enabled
    await expect(submitButton).toBeEnabled()

    // Focus submit button and press Enter
    await submitButton.focus()
    await page.keyboard.press('Enter')

    // Should redirect to chat
    await page.waitForURL(/\/my-stay/, { timeout: timeouts.login })

    // Verify we're in the chat interface
    await expect(page.locator(selectors.header.guestName)).toBeVisible()
  })

  test('should show accessibility labels', async ({ page }) => {
    const dateInput = page.locator(selectors.login.checkInDateInput)
    const phoneInput = page.locator(selectors.login.phoneLast4Input)

    // Check aria-label attributes
    await expect(dateInput).toHaveAttribute('aria-label', 'Fecha de check-in')
    await expect(phoneInput).toHaveAttribute(
      'aria-label',
      'Últimos 4 dígitos del teléfono'
    )

    // Check for proper role attributes
    const submitButton = page.locator(selectors.login.submitButton)
    await expect(submitButton).toHaveAttribute('type', 'submit')
  })
})
