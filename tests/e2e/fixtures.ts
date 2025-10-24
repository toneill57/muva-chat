import { test as base, Page } from '@playwright/test';
import { loginAsGuestWithToken, GuestSession, TEST_GUESTS } from './setup';

type GuestFixtures = {
  guestPage: Page;
  guestSession: GuestSession;
};

export const test = base.extend<GuestFixtures>({
  guestSession: async ({}, use) => {
    // Default to Misty Morning guest
    await use(TEST_GUESTS.MISTY_MORNING.session);
  },

  guestPage: async ({ page, guestSession }, use) => {
    // Auto-login before each test using token (faster than UI login)
    await loginAsGuestWithToken(page, guestSession);
    await use(page);
    // Auto-cleanup after test (page will be closed by Playwright)
  },
});

export { expect } from '@playwright/test';
