/**
 * FASE 3: Automated Screenshot Script
 *
 * This Playwright script automates taking screenshots of the
 * AccommodationManualsSection component in different states.
 *
 * Usage:
 *   pnpm add -D @playwright/test
 *   pnpm dlx playwright test screenshots.spec.ts
 *
 * Requirements:
 *   - Staging server running on localhost:3001
 *   - Valid staff authentication token
 *   - Test manual file available
 */

import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const BASE_URL = 'http://simmerdown.localhost:3001'
const SCREENSHOTS_DIR = path.join(__dirname, '')

test.describe('Accommodation Manuals UI Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1440, height: 900 })

    // Navigate to units page
    await page.goto(`${BASE_URL}/accommodations/units`)

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // TODO: Add authentication if required
    // This depends on your auth implementation
  })

  test('01-empty-state', async ({ page }) => {
    // Find the manuals section
    const manualsSection = page.locator('text=Manuals (0)').first()
    await expect(manualsSection).toBeVisible()

    // Find the dropzone
    const dropzone = page.locator('text=Drag & drop .md file or click to select')
    await expect(dropzone).toBeVisible()

    // Take screenshot of the manuals section
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-empty-state.png'),
      fullPage: false,
    })

    console.log('✅ Screenshot saved: 01-empty-state.png')
  })

  test('02-uploading', async ({ page }) => {
    // Prepare test file
    const testFilePath = path.join(__dirname, '../test-manual.md')
    if (!fs.existsSync(testFilePath)) {
      console.error('Test file not found:', testFilePath)
      test.skip()
    }

    // Find dropzone
    const dropzone = page.locator('text=Drag & drop .md file or click to select')

    // Set up file chooser listener
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      dropzone.click(),
    ])

    // Upload file
    await fileChooser.setFiles(testFilePath)

    // Wait for uploading state (this is time-sensitive!)
    await page.waitForSelector('text=Processing manual...', { timeout: 1000 })

    // Try to capture at ~50% progress
    await page.waitForTimeout(200)

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-uploading.png'),
      fullPage: false,
    })

    console.log('✅ Screenshot saved: 02-uploading.png')

    // Wait for upload to complete before next test
    await page.waitForSelector('text=Manuals (1)', { timeout: 10000 })
  })

  test('03-list-state', async ({ page }) => {
    // Assume manual is already uploaded from previous test
    // Or upload one here if running this test independently

    // Wait for manual list to be visible
    const manualsList = page.locator('text=Manuals (1)').first()
    await expect(manualsList).toBeVisible()

    // Check for Eye and Trash icons
    const viewButton = page.locator('[title="View content"]').first()
    const deleteButton = page.locator('[title="Delete manual"]').first()
    await expect(viewButton).toBeVisible()
    await expect(deleteButton).toBeVisible()

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-list-state.png'),
      fullPage: false,
    })

    console.log('✅ Screenshot saved: 03-list-state.png')
  })

  test('04-modal-closed', async ({ page }) => {
    // Click View button
    const viewButton = page.locator('[title="View content"]').first()
    await viewButton.click()

    // Wait for modal to appear
    await page.waitForSelector('text=Manual Content', { timeout: 5000 })

    // Wait for chunks to load
    await page.waitForTimeout(1000)

    // Take screenshot of modal with all accordions closed
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-modal-closed.png'),
      fullPage: false,
    })

    console.log('✅ Screenshot saved: 04-modal-closed.png')
  })

  test('05-modal-open', async ({ page }) => {
    // Open modal (same as previous test)
    const viewButton = page.locator('[title="View content"]').first()
    await viewButton.click()

    await page.waitForSelector('text=Manual Content', { timeout: 5000 })
    await page.waitForTimeout(1000)

    // Click first accordion to expand
    const firstAccordion = page.locator('button').filter({ hasText: /Welcome Section|Chunk 1/ }).first()
    await firstAccordion.click()

    // Wait for accordion to expand
    await page.waitForTimeout(300)

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-modal-open.png'),
      fullPage: false,
    })

    console.log('✅ Screenshot saved: 05-modal-open.png')
  })

  test('06-after-delete', async ({ page }) => {
    // Click Delete button
    const deleteButton = page.locator('[title="Delete manual"]').first()

    // Set up dialog handler (confirm deletion)
    page.on('dialog', dialog => dialog.accept())

    await deleteButton.click()

    // Wait for manual to be deleted
    await page.waitForSelector('text=Manuals (0)', { timeout: 5000 })

    // Wait for empty state to appear
    await page.waitForSelector('text=Drag & drop .md file or click to select')

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06-after-delete.png'),
      fullPage: false,
    })

    console.log('✅ Screenshot saved: 06-after-delete.png')
  })

  test('07-mobile', async ({ page }) => {
    // Set mobile viewport (iPhone 15 Pro: 393x852)
    await page.setViewportSize({ width: 375, height: 812 })

    // Reload page for responsive layout
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07-mobile.png'),
      fullPage: true,
    })

    console.log('✅ Screenshot saved: 07-mobile.png')
  })

  test('08-desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 })

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Hover over a manual item (if exists) to show hover state
    const manualItem = page.locator('[title="View content"]').first()
    if (await manualItem.isVisible()) {
      await manualItem.hover()
    }

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '08-desktop.png'),
      fullPage: false,
    })

    console.log('✅ Screenshot saved: 08-desktop.png')
  })
})

/**
 * Helper: Clean up all test manuals before running tests
 * (Optional - implement based on your API)
 */
async function cleanupTestManuals() {
  // TODO: Implement API call to delete all test manuals
  // This ensures tests start from a clean state
}

/**
 * Helper: Upload test manual
 * (Optional - implement if needed for isolated tests)
 */
async function uploadTestManual(page: any) {
  const testFilePath = path.join(__dirname, '../test-manual.md')

  const dropzone = page.locator('text=Drag & drop .md file or click to select')
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    dropzone.click(),
  ])

  await fileChooser.setFiles(testFilePath)
  await page.waitForSelector('text=Manuals (1)', { timeout: 10000 })
}
