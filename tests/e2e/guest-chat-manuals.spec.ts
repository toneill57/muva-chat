import { test, expect } from './fixtures';
import { askQuestion, waitForResponseComplete } from './setup';

test.describe('Guest Chat - Manual Chunks', () => {

  test('should retrieve WiFi password for Misty Morning', async ({ guestPage }) => {
    // Act
    const response = await askQuestion(guestPage, 'What is the WiFi password?');
    await waitForResponseComplete(guestPage);

    // Assert
    expect(response.length).toBeGreaterThan(10); // Non-empty response
    
    // Verify contains WiFi-related keywords
    expect(response.toLowerCase()).toMatch(/wifi|wi-fi|internet|network|password|contraseña|clave/i);

    // Screenshot for manual verification
    await guestPage.screenshot({
      path: 'test-results/wifi-password-response.png',
      fullPage: true
    });
  });

  test('should handle WiFi query variations', async ({ guestPage }) => {
    const queries = [
      'wifi password',
      'internet password',
      'how to connect to wifi',
      '¿Cuál es la contraseña del WiFi?',
    ];

    for (const query of queries) {
      const response = await askQuestion(guestPage, query);
      await waitForResponseComplete(guestPage);

      expect(response.length).toBeGreaterThan(10);
      expect(response.toLowerCase()).toMatch(/wifi|internet|red|network|password|contraseña/i);
    }
  });

});

test.describe('Guest Chat - Policies', () => {

  test('should retrieve check-out time', async ({ guestPage }) => {
    const response = await askQuestion(guestPage, 'What time is check-out?');
    await waitForResponseComplete(guestPage);

    // Verify mentions time-related keywords
    expect(response.toLowerCase()).toMatch(/check-out|salida|departure|time|hora|11|12|noon|mediodía/i);
    
    // Verify response is substantial
    expect(response.length).toBeGreaterThan(20);
  });

  test('should retrieve house rules', async ({ guestPage }) => {
    const response = await askQuestion(guestPage, 'What are the house rules?');
    await waitForResponseComplete(guestPage);

    expect(response.length).toBeGreaterThan(50);
    expect(response.toLowerCase()).toMatch(/rules|reglas|policy|política|guest|huésped/i);
  });

  test('should handle policy query in Spanish', async ({ guestPage }) => {
    const response = await askQuestion(
      guestPage,
      '¿A qué hora es el check-out?'
    );
    await waitForResponseComplete(guestPage);

    expect(response.toLowerCase()).toMatch(/check-out|salida|hora|11|12/i);
    expect(response.length).toBeGreaterThan(15);
  });

});
