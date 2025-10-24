import { test, expect } from './fixtures';
import { askQuestion, waitForResponseComplete, TEST_GUESTS } from './setup';

test.describe('Guest Chat - Multi-Room Support', () => {

  test.use({ guestSession: TEST_GUESTS.MULTI_ROOM.session });

  test('should see WiFi for all assigned rooms', async ({ guestPage }) => {
    const response = await askQuestion(
      guestPage,
      'What are the WiFi passwords for my rooms?'
    );
    await waitForResponseComplete(guestPage);

    // Should mention WiFi/password keywords
    expect(response.toLowerCase()).toMatch(/wifi|password|contraseña|internet/i);
    
    // Response should be substantial (likely covering multiple rooms)
    expect(response.length).toBeGreaterThan(30);
  });

  test('should specify which room when asked about specific unit', async ({ guestPage }) => {
    const response = await askQuestion(
      guestPage,
      'What is the WiFi password for Natural Mystic?'
    );
    await waitForResponseComplete(guestPage);

    expect(response.toLowerCase()).toMatch(/natural mystic|wifi|password/i);
    expect(response.length).toBeGreaterThan(15);
  });

});
