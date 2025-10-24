import { test, expect } from './fixtures';
import { askQuestion, waitForResponseComplete } from './setup';

test.describe('Guest Chat - Tourism Content', () => {

  test('should provide beach recommendations', async ({ guestPage }) => {
    const response = await askQuestion(
      guestPage,
      'What are the best beaches near Taganga?'
    );
    await waitForResponseComplete(guestPage);

    expect(response.length).toBeGreaterThan(50);
    expect(response.toLowerCase()).toMatch(/beach|playa|mar|sea|taganga|santa marta/i);
  });

  test('should provide restaurant recommendations', async ({ guestPage }) => {
    const response = await askQuestion(
      guestPage,
      'Where can I eat good seafood?'
    );
    await waitForResponseComplete(guestPage);

    expect(response.length).toBeGreaterThan(30);
    expect(response.toLowerCase()).toMatch(/restaurant|food|comida|seafood|mariscos|eat|comer/i);
  });

  test('should handle tourism query in Spanish', async ({ guestPage }) => {
    const response = await askQuestion(
      guestPage,
      '¿Qué actividades turísticas hay en Santa Marta?'
    );
    await waitForResponseComplete(guestPage);

    expect(response.length).toBeGreaterThan(50);
    expect(response.toLowerCase()).toMatch(/actividad|tour|playa|beach|ciudad|santa marta/i);
  });

});
