# FASE 3: E2E Testing Automatizado - Workflow

**Agente:** @agent-backend-developer
**Tiempo estimado:** 6-8h
**Prioridad:** 🔴 ALTA (prevenir regresiones)
**Estado:** ⏳ PENDIENTE

---

## 🎯 OBJETIVO

Crear suite completa de tests E2E con Playwright que valide el flujo completo del guest chat, desde autenticación hasta respuestas con manual chunks.

**Meta:** Prevenir regresiones futuras detectando bugs ANTES de producción.

---

## 📋 PRE-REQUISITOS

### Verificaciones Previas

```bash
# 1. Verificar que FASE 1-2 estén completas
cd /Users/oneill/Sites/apps/muva-chat

# 2. Confirmar que guest chat funciona (manual test)
# - Login como guest
# - Preguntar por WiFi password
# - Verificar respuesta correcta

# 3. Confirmar migrations aplicadas
npm run supabase:status
```

**Criterios de inicio:**
- ✅ 219/219 manual chunks accesibles (SQL validation)
- ✅ RPC `match_unit_manual_chunks` retorna >0 resultados
- ✅ Guest chat responde preguntas operacionales

---

## 🚀 EJECUCIÓN

### Tarea 3.1: Setup Playwright (60 min)

**Objetivo:** Instalar y configurar Playwright para tests E2E.

```bash
# Paso 1: Instalar Playwright
cd /Users/oneill/Sites/apps/muva-chat
npm install --save-dev @playwright/test

# Paso 2: Instalar browsers
npx playwright install chromium firefox

# Paso 3: Verificar instalación
npx playwright --version
```

**Crear:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: 'html',

  use: {
    baseURL: 'http://simmerdown.localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  webServer: {
    command: './scripts/dev-with-keys.sh',
    url: 'http://simmerdown.localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

**Actualizar:** `package.json`

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

**Validación:**
```bash
npm run test:e2e:ui
# Debe abrir Playwright UI (aunque no haya tests aún)
```

---

### Tarea 3.2: Fixtures & Setup Utilities (60 min)

**Objetivo:** Crear helpers reutilizables para login, queries, y validaciones.

**Crear:** `tests/e2e/setup.ts`

```typescript
import { Page, expect } from '@playwright/test';

export interface GuestCredentials {
  reservationCode: string;
  email: string;
}

export const TEST_GUESTS = {
  MISTY_MORNING: {
    reservationCode: 'TEST-MM-001',
    email: 'guest-mm@test.com',
  },
  NATURAL_MYSTIC: {
    reservationCode: 'TEST-NM-001',
    email: 'guest-nm@test.com',
  },
  MULTI_ROOM: {
    reservationCode: 'TEST-MULTI-001',
    email: 'multi-room@test.com',
  },
} as const;

/**
 * Login as guest and wait for chat interface
 */
export async function loginAsGuest(
  page: Page,
  credentials: GuestCredentials
): Promise<void> {
  await page.goto('/guest/login');

  await page.fill('input[name="reservationCode"]', credentials.reservationCode);
  await page.fill('input[name="email"]', credentials.email);
  await page.click('button[type="submit"]');

  // Wait for redirect to chat
  await page.waitForURL('/guest/chat', { timeout: 10000 });

  // Wait for chat interface to load
  await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
}

/**
 * Ask question in chat and wait for response
 */
export async function askQuestion(
  page: Page,
  question: string
): Promise<string> {
  const chatInput = page.locator('textarea[data-testid="chat-input"]');
  const sendButton = page.locator('button[data-testid="send-button"]');

  await chatInput.fill(question);
  await sendButton.click();

  // Wait for user message to appear
  await expect(
    page.locator('[data-testid="message-user"]').last()
  ).toContainText(question);

  // Wait for assistant response
  const assistantMessage = page.locator('[data-testid="message-assistant"]').last();
  await expect(assistantMessage).toBeVisible({ timeout: 30000 });

  return await assistantMessage.textContent() || '';
}

/**
 * Wait for streaming response to complete
 */
export async function waitForResponseComplete(page: Page): Promise<void> {
  // Wait for streaming indicator to disappear
  await expect(
    page.locator('[data-testid="streaming-indicator"]')
  ).toBeHidden({ timeout: 30000 });
}

/**
 * Clear chat history
 */
export async function clearChat(page: Page): Promise<void> {
  const clearButton = page.locator('button[data-testid="clear-chat"]');
  await clearButton.click();

  await expect(
    page.locator('[data-testid="message-user"]')
  ).toHaveCount(0);
}

/**
 * Logout guest
 */
export async function logout(page: Page): Promise<void> {
  await page.click('button[data-testid="logout-button"]');
  await page.waitForURL('/guest/login', { timeout: 5000 });
}
```

**Crear:** `tests/e2e/fixtures.ts`

```typescript
import { test as base } from '@playwright/test';
import { loginAsGuest, GuestCredentials, TEST_GUESTS } from './setup';

type GuestFixtures = {
  guestPage: Page;
  guestCredentials: GuestCredentials;
};

export const test = base.extend<GuestFixtures>({
  guestCredentials: async ({}, use) => {
    // Default to Misty Morning guest
    await use(TEST_GUESTS.MISTY_MORNING);
  },

  guestPage: async ({ page, guestCredentials }, use) => {
    // Auto-login before each test
    await loginAsGuest(page, guestCredentials);
    await use(page);
    // Auto-cleanup after test
    await page.close();
  },
});

export { expect } from '@playwright/test';
```

**Validación:**
```bash
# Verificar que archivos compilan
npx tsc --noEmit tests/e2e/setup.ts tests/e2e/fixtures.ts
```

---

### Tarea 3.3: Test 1 - WiFi Password Retrieval (40 min)

**Objetivo:** Validar que guest puede obtener WiFi password de su habitación.

**Crear:** `tests/e2e/guest-chat-manuals.spec.ts`

```typescript
import { test, expect } from './fixtures';
import { askQuestion, waitForResponseComplete } from './setup';

test.describe('Guest Chat - Manual Chunks', () => {

  test('should retrieve WiFi password for Misty Morning', async ({ guestPage }) => {
    // Act
    const response = await askQuestion(guestPage, 'What is the WiFi password?');
    await waitForResponseComplete(guestPage);

    // Assert
    expect(response).toContain('WiFi'); // Case insensitive match
    expect(response.length).toBeGreaterThan(10); // Non-empty response

    // Verify contains actual password (not just generic info)
    // Note: Replace with actual WiFi password from manual
    expect(response).toMatch(/password|contraseña|clave/i);

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
      expect(response).toMatch(/wifi|internet|red/i);
    }
  });

});
```

**Validación:**
```bash
npm run test:e2e -- guest-chat-manuals.spec.ts -g "WiFi password"
```

---

### Tarea 3.4: Test 2 - Policies Retrieval (40 min)

**Objetivo:** Validar que guest puede consultar políticas (check-out, house rules).

**Agregar a:** `tests/e2e/guest-chat-manuals.spec.ts`

```typescript
test.describe('Guest Chat - Policies', () => {

  test('should retrieve check-out time', async ({ guestPage }) => {
    const response = await askQuestion(guestPage, 'What time is check-out?');
    await waitForResponseComplete(guestPage);

    // Verify mentions time
    expect(response).toMatch(/\d{1,2}:\d{2}|11|noon|mediodía/i);

    // Verify contains policy-related keywords
    expect(response).toMatch(/check-out|salida|departure/i);
  });

  test('should retrieve house rules', async ({ guestPage }) => {
    const response = await askQuestion(guestPage, 'What are the house rules?');
    await waitForResponseComplete(guestPage);

    expect(response.length).toBeGreaterThan(50);
    expect(response).toMatch(/rules|reglas|policy|política/i);
  });

  test('should handle policy query in Spanish', async ({ guestPage }) => {
    const response = await askQuestion(
      guestPage,
      '¿A qué hora es el check-out?'
    );
    await waitForResponseComplete(guestPage);

    expect(response).toMatch(/\d{1,2}:\d{2}|11/i);
  });

});
```

---

### Tarea 3.5: Test 3 - Tourism Content (40 min)

**Objetivo:** Validar que guest puede consultar info turística (MUVA).

**Crear:** `tests/e2e/guest-chat-tourism.spec.ts`

```typescript
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
    expect(response).toMatch(/beach|playa|mar|sea/i);
  });

  test('should provide restaurant recommendations', async ({ guestPage }) => {
    const response = await askQuestion(
      guestPage,
      'Where can I eat good seafood?'
    );
    await waitForResponseComplete(guestPage);

    expect(response.length).toBeGreaterThan(30);
    expect(response).toMatch(/restaurant|food|comida|seafood|mariscos/i);
  });

  test('should handle tourism query in Spanish', async ({ guestPage }) => {
    const response = await askQuestion(
      guestPage,
      '¿Qué actividades turísticas hay en Santa Marta?'
    );
    await waitForResponseComplete(guestPage);

    expect(response.length).toBeGreaterThan(50);
    expect(response).toMatch(/actividad|tour|playa|beach|ciudad/i);
  });

});
```

---

### Tarea 3.6: Test 4 - Multi-Room Support (40 min)

**Objetivo:** Validar que guest con múltiples habitaciones ve info de TODAS.

**Crear:** `tests/e2e/guest-chat-multiroom.spec.ts`

```typescript
import { test, expect } from './fixtures';
import { askQuestion, waitForResponseComplete, TEST_GUESTS } from './setup';

test.describe('Guest Chat - Multi-Room Support', () => {

  test.use({ guestCredentials: TEST_GUESTS.MULTI_ROOM });

  test('should see WiFi for all assigned rooms', async ({ guestPage }) => {
    const response = await askQuestion(
      guestPage,
      'What are the WiFi passwords for my rooms?'
    );
    await waitForResponseComplete(guestPage);

    // Should mention BOTH rooms
    expect(response).toMatch(/Misty Morning|Natural Mystic/i);

    // Should have multiple WiFi credentials
    const wifiMatches = response.match(/password|contraseña/gi);
    expect(wifiMatches?.length).toBeGreaterThan(1);
  });

  test('should specify which room when asked about specific unit', async ({ guestPage }) => {
    const response = await askQuestion(
      guestPage,
      'What is the WiFi password for Natural Mystic?'
    );
    await waitForResponseComplete(guestPage);

    expect(response).toMatch(/Natural Mystic/i);
    expect(response).toMatch(/wifi|password/i);
  });

});
```

---

### Tarea 3.7: Test 5 - Embedding Model Validation (30 min)

**Objetivo:** Test SQL directo para validar embeddings correctos.

**Crear:** `tests/e2e/database-validation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe('Database - Embedding Validation', () => {

  let supabase: ReturnType<typeof createClient>;

  test.beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  test('should have correct embedding dimensions', async () => {
    const { data, error } = await supabase.rpc('execute_sql', {
      query: `
        SELECT
          COUNT(*) as total_chunks,
          vector_dims(embedding_balanced) as balanced_dims,
          vector_dims(embedding_full) as full_dims
        FROM accommodation_units_manual_chunks
        WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
        LIMIT 1;
      `
    });

    expect(error).toBeNull();
    expect(data[0].balanced_dims).toBe(1024);
    expect(data[0].full_dims).toBe(3072);
    expect(data[0].total_chunks).toBe(219);
  });

  test('should have zero orphaned chunks', async () => {
    const { data, error } = await supabase.rpc('execute_sql', {
      query: `
        SELECT COUNT(*) as orphaned_chunks
        FROM accommodation_units_manual_chunks aumc
        LEFT JOIN hotels.accommodation_units ha
          ON ha.id = aumc.accommodation_unit_id
        WHERE aumc.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
          AND ha.id IS NULL;
      `
    });

    expect(error).toBeNull();
    expect(data[0].orphaned_chunks).toBe(0);
  });

});
```

---

### Tarea 3.8: Test 6 - RPC Functionality (30 min)

**Objetivo:** Test directo del RPC `match_unit_manual_chunks`.

**Agregar a:** `tests/e2e/database-validation.spec.ts`

```typescript
test.describe('Database - RPC Validation', () => {

  test('should return manual chunks for Misty Morning', async () => {
    // Misty Morning UUID in hotels.accommodation_units
    const mistyMorningId = '11c6bdba-c595-432e-9b3f-abcb5eb1a8a4';

    // Generate dummy embedding (all zeros for test)
    const dummyEmbedding = Array(1024).fill(0);

    const { data, error } = await supabase.rpc('match_unit_manual_chunks', {
      query_embedding: dummyEmbedding,
      p_accommodation_unit_id: mistyMorningId,
      match_threshold: 0.0, // Accept any similarity
      match_count: 10,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);

    // Verify structure
    expect(data[0]).toHaveProperty('chunk_content');
    expect(data[0]).toHaveProperty('section_title');
    expect(data[0]).toHaveProperty('similarity');
  });

  test('should return no chunks for non-existent unit', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const dummyEmbedding = Array(1024).fill(0);

    const { data, error } = await supabase.rpc('match_unit_manual_chunks', {
      query_embedding: dummyEmbedding,
      p_accommodation_unit_id: fakeUuid,
      match_threshold: 0.0,
      match_count: 10,
    });

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

});
```

---

## ✅ VALIDACIÓN FINAL

### Ejecutar Suite Completa

```bash
# Ejecutar todos los tests
npm run test:e2e

# Esperado:
# ✓ guest-chat-manuals.spec.ts (4 tests)
# ✓ guest-chat-tourism.spec.ts (3 tests)
# ✓ guest-chat-multiroom.spec.ts (2 tests)
# ✓ database-validation.spec.ts (4 tests)
#
# Total: 13 passed in ~3-4 minutes
```

### Generar Reporte

```bash
# Ver reporte HTML
npx playwright show-report
```

### Criterios de Éxito

- ✅ TODOS los tests (13+) pasan localmente
- ✅ Execution time < 5 minutos
- ✅ 0 tests flakey (ejecutar 3 veces)
- ✅ Screenshots generados solo en failures

---

## 📝 DOCUMENTACIÓN

Al finalizar, crear:

**Archivo:** `docs/chat-core-stabilization/fase-3/RESULTS.md`

```markdown
# FASE 3 - Resultados

**Completado:** [FECHA]
**Tiempo real:** [HORAS]

## Tests Implementados

- ✅ WiFi password retrieval (2 tests)
- ✅ Policies retrieval (3 tests)
- ✅ Tourism content (3 tests)
- ✅ Multi-room support (2 tests)
- ✅ Embedding validation (2 tests)
- ✅ RPC functionality (2 tests)

**Total:** 14 tests

## Métricas

- Execution time: [X] minutos
- Pass rate: 100% (14/14)
- Flakiness: 0%
- Coverage: [X]%

## Screenshots

[Adjuntar screenshots de test results]
```

---

## 🔄 PRÓXIMO PASO

Una vez completada FASE 3:

→ **FASE 4: Code Consolidation** (`fase-4/WORKFLOW.md`)

**Tiempo estimado:** 6-8h
