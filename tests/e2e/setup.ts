import { Page, expect } from '@playwright/test';
import { SignJWT } from 'jose';

export interface GuestCredentials {
  check_in_date: string;
  phone_last_4: string;
}

export interface GuestSession {
  reservation_id: string;
  tenant_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  reservation_code: string;
  accommodation_unit?: {
    id: string;
    name: string;
    unit_number?: string;
  };
  accommodation_units?: Array<{
    id: string;
    name: string;
    unit_number?: string;
  }>;
}

// Test guest data matching database test reservations
export const TEST_GUESTS = {
  MISTY_MORNING: {
    check_in_date: new Date().toISOString().split('T')[0], // Today
    phone_last_4: '7890',
    session: {
      reservation_id: '68c3c081-0561-4fe7-9934-db356ef23a62',
      tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
      guest_name: 'Test Guest MM',
      check_in: new Date().toISOString().split('T')[0],
      check_out: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reservation_code: 'TEST-MM-001',
      accommodation_unit: {
        id: '11c6bdba-c595-432e-9b3f-abcb5eb1a8a4',
        name: 'Misty Morning',
        unit_number: '326',
      },
      accommodation_units: [{
        id: '11c6bdba-c595-432e-9b3f-abcb5eb1a8a4',
        name: 'Misty Morning',
        unit_number: '326',
      }],
    },
  },
  NATURAL_MYSTIC: {
    check_in_date: new Date().toISOString().split('T')[0],
    phone_last_4: '7891',
    session: {
      reservation_id: '566ca567-aae6-48ef-bde6-702f9beefd23',
      tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
      guest_name: 'Test Guest NM',
      check_in: new Date().toISOString().split('T')[0],
      check_out: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reservation_code: 'TEST-NM-001',
      accommodation_unit: {
        id: '980a0d29-95db-4ec0-a390-590eb23b033d',
        name: 'Natural Mystic',
        unit_number: '320',
      },
      accommodation_units: [{
        id: '980a0d29-95db-4ec0-a390-590eb23b033d',
        name: 'Natural Mystic',
        unit_number: '320',
      }],
    },
  },
  MULTI_ROOM: {
    check_in_date: new Date().toISOString().split('T')[0],
    phone_last_4: '7892',
    session: {
      reservation_id: '1eabb63d-5092-473e-9b56-41a4b8cc2c82',
      tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
      guest_name: 'Test Multi Room Guest',
      check_in: new Date().toISOString().split('T')[0],
      check_out: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reservation_code: 'TEST-MULTI-001',
      accommodation_unit: {
        id: '11c6bdba-c595-432e-9b3f-abcb5eb1a8a4',
        name: 'Misty Morning',
        unit_number: '326',
      },
      accommodation_units: [
        {
          id: '11c6bdba-c595-432e-9b3f-abcb5eb1a8a4',
          name: 'Misty Morning',
          unit_number: '326',
        },
        {
          id: '980a0d29-95db-4ec0-a390-590eb23b033d',
          name: 'Natural Mystic',
          unit_number: '320',
        },
      ],
    },
  },
};

/**
 * Generate JWT token for guest session (for test setup)
 */
export async function generateTestToken(session: GuestSession): Promise<string> {
  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
  const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

  const token = await new SignJWT({
    reservation_id: session.reservation_id,
    tenant_id: session.tenant_id,
    guest_name: session.guest_name,
    check_in: session.check_in,
    check_out: session.check_out,
    reservation_code: session.reservation_code,
    accommodation_unit: session.accommodation_unit,
    accommodation_units: session.accommodation_units,
    tenant_features: { muva_access: true },
    type: 'guest',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);

  return token;
}

/**
 * Login as guest via UI
 */
export async function loginAsGuest(
  page: Page,
  credentials: GuestCredentials
): Promise<void> {
  await page.goto('/guest-chat');

  await page.fill('input[name="check_in_date"]', credentials.check_in_date);
  await page.fill('input[name="phone_last_4"]', credentials.phone_last_4);
  await page.click('button[type="submit"]');

  // Wait for chat interface to appear (same page, no redirect)
  await expect(page.locator('textarea[placeholder="Escribe tu mensaje..."]')).toBeVisible({ timeout: 10000 });
}

/**
 * Login as guest via direct token (faster for tests)
 */
export async function loginAsGuestWithToken(
  page: Page,
  session: GuestSession
): Promise<void> {
  const token = await generateTestToken(session);

  // Set token in localStorage
  await page.goto('/guest-chat');
  await page.evaluate((tokenValue) => {
    localStorage.setItem('guest_token', tokenValue);
  }, token);

  // Reload to pick up the token
  await page.reload();

  // Wait for chat interface (textarea with placeholder)
  await expect(page.locator('textarea[placeholder="Escribe tu mensaje..."]')).toBeVisible({ timeout: 10000 });
}

/**
 * Ensure there's an active conversation before sending messages
 */
async function ensureConversationActive(page: Page): Promise<void> {
  // Always create a NEW conversation for tests to ensure clean state
  // Use more specific selector to avoid matching conversation list items
  const newConvButton = page.locator('button.bg-blue-600:has-text("Nueva conversación")');
  await newConvButton.click();

  // Wait for the new conversation to be created and ready
  await page.waitForTimeout(1500);
}

/**
 * Ask question in chat and wait for response
 */
export async function askQuestion(
  page: Page,
  question: string
): Promise<string> {
  // Ensure we have an active conversation
  await ensureConversationActive(page);

  const chatInput = page.locator('textarea[placeholder="Escribe tu mensaje..."]');
  const sendButton = page.locator('button[aria-label="Enviar mensaje"]');

  // Wait for input to be ready
  await chatInput.waitFor({ state: 'visible' });
  await chatInput.fill(question);

  // Count messages before sending (should be just the welcome message in new conversation)
  const messagesBefore = await page.locator('p').count();

  await sendButton.click();

  // Wait for send button to be re-enabled (indicates message sent successfully)
  await page.waitForTimeout(500);

  // Wait for new message to appear (assistant response)
  // There should be at least 2 new paragraphs: user message + assistant response
  await page.waitForFunction(
    (beforeCount) => {
      const currentCount = document.querySelectorAll('p').length;
      return currentCount >= beforeCount + 2;
    },
    messagesBefore,
    { timeout: 30000 }
  );

  // Wait a bit longer for the streaming response to complete
  // The assistant response may still be streaming even after paragraphs appear
  await page.waitForTimeout(3000);

  // Get all paragraph elements
  const allMessages = await page.locator('p').all();

  // Find the last substantial message (not a timestamp like "22:05")
  // Iterate from the end, skipping short messages that are likely timestamps
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const messageText = await allMessages[i].textContent() || '';
    // Skip timestamps (format: "HH:MM" or "hace X minutos")
    if (messageText.length > 10 && !messageText.match(/^\d{2}:\d{2}$/)) {
      return messageText;
    }
  }

  return '';
}

/**
 * Wait for streaming response to complete
 */
export async function waitForResponseComplete(page: Page): Promise<void> {
  // Wait for streaming indicator to disappear (if it exists)
  const streamingIndicator = page.locator('[data-testid="streaming-indicator"]');
  const count = await streamingIndicator.count();
  
  if (count > 0) {
    await expect(streamingIndicator).toBeHidden({ timeout: 30000 });
  }
  
  // Alternative: wait a bit for streaming to complete
  await page.waitForTimeout(2000);
}

/**
 * Clear chat history
 */
export async function clearChat(page: Page): Promise<void> {
  const clearButton = page.locator('button[data-testid="clear-chat"]');
  const count = await clearButton.count();
  
  if (count > 0) {
    await clearButton.click();
    await expect(
      page.locator('[data-testid="message-user"]')
    ).toHaveCount(0);
  }
}

/**
 * Logout guest
 */
export async function logout(page: Page): Promise<void> {
  const logoutButton = page.locator('button[data-testid="logout-button"]');
  const count = await logoutButton.count();

  if (count > 0) {
    await logoutButton.click();
    // After logout, should show login form on same /guest-chat page
    await expect(page.locator('input[name="check_in_date"]')).toBeVisible({ timeout: 5000 });
  }
}
