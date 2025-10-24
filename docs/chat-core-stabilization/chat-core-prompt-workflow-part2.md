# Chat Core Stabilization - Workflow Prompts (Part 2)

**Continuation of:** `chat-core-prompt-workflow.md`
**Covers:** FASES 3, 4, 5, 6
**Última actualización:** Octubre 24, 2025

---

## 🧪 FASE 3: E2E Testing Automatizado (6-8h)

### Task 3.1: Setup Playwright + Configuración

📋 **Context:**
Necesitamos tests E2E automatizados para prevenir regresiones. Playwright es el framework recomendado para Next.js.

🤖 **PROMPT TO @agent-backend-developer:**

```
TAREA 3.1: Setup Playwright para testing E2E del guest chat.

PASOS:

1. Instalar Playwright:
```bash
npm install --save-dev @playwright/test
npx playwright install
```

2. Crear `playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test'

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
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: './scripts/dev-with-keys.sh',
    url: 'http://simmerdown.localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

3. Crear directorio tests:
```bash
mkdir -p tests/e2e
```

4. Actualizar package.json:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

5. Verificar setup:
```bash
npm run test:e2e -- --help
```

EXPECTED: Playwright help output, no errors

Documenta en `docs/chat-core-stabilization/fase-3/TESTS_IMPLEMENTATION.md` el setup completo.
```

✅ **Expected Output:**

```
✅ Playwright installed successfully
✅ playwright.config.ts created
✅ tests/e2e directory created
✅ package.json updated with test scripts

Running verification:
npx playwright test --help
# Shows Playwright CLI help

Documentation created: fase-3/TESTS_IMPLEMENTATION.md
```

🔍 **Validation:**
- [ ] `playwright.config.ts` existe
- [ ] `tests/e2e/` directory existe
- [ ] `npm run test:e2e -- --help` funciona
- [ ] Playwright CLI accesible

---

### Task 3.2: Crear Fixtures y Setup Utilities

📋 **Context:**
Necesitamos helpers para login, hacer preguntas y esperar respuestas.

🤖 **PROMPT TO @agent-backend-developer:**

```
TAREA 3.2: Crear utilities y fixtures para tests E2E.

Crea dos archivos:

1. `tests/e2e/setup.ts`:
```typescript
import { Page, expect } from '@playwright/test'

/**
 * Login as guest with token
 */
export async function loginAsGuest(page: Page, guestToken: string) {
  await page.goto(`/guest/login?token=${guestToken}`)

  // Wait for chat interface to load
  await expect(page.locator('.chat-interface')).toBeVisible({ timeout: 5000 })

  console.log(`✅ Logged in as guest with token: ${guestToken.substring(0, 20)}...`)
}

/**
 * Ask a question in chat
 */
export async function askQuestion(page: Page, question: string) {
  const input = page.locator('textarea[placeholder*="Escribe tu pregunta"]')
  await input.fill(question)
  await input.press('Enter')

  console.log(`📝 Asked question: "${question}"`)
}

/**
 * Wait for AI response
 */
export async function waitForResponse(page: Page, timeoutMs: number = 15000) {
  // Wait for loading indicator to disappear
  const loadingIndicator = page.locator('.loading-indicator, .typing-indicator')
  await loadingIndicator.waitFor({ state: 'hidden', timeout: timeoutMs })

  // Wait for last message to be from assistant
  const lastMessage = page.locator('.message').last()
  await expect(lastMessage).toHaveAttribute('data-role', 'assistant', { timeout: 5000 })

  console.log(`✅ Received AI response`)

  return lastMessage
}

/**
 * Get text content of last message
 */
export async function getLastMessageText(page: Page): Promise<string> {
  const lastMessage = page.locator('.message').last()
  const content = await lastMessage.locator('.message-content').textContent()
  return content || ''
}
```

2. `tests/e2e/fixtures.ts`:
```typescript
/**
 * Test fixtures - Guest tokens for testing
 */

export const GUEST_TOKENS = {
  dreamland: process.env.TEST_GUEST_TOKEN_DREAMLAND || 'test-token-dreamland',
  jammin: process.env.TEST_GUEST_TOKEN_JAMMIN || 'test-token-jammin',
  multiRoom: process.env.TEST_GUEST_TOKEN_MULTI || 'test-token-multi',
}

export const TEST_QUESTIONS = {
  wifi: "¿Cuál es la contraseña del WiFi?",
  policies: "¿Cuál es el horario de check-out?",
  tourism: "¿Qué playas recomiendas cerca?",
  multiRoom: "¿Cuáles son mis habitaciones?",
  airConditioning: "¿Cómo funciona el aire acondicionado?",
}

export const EXPECTED_KEYWORDS = {
  wifi: ['SimmerDown', 'WiFi', 'contraseña', 'password'],
  policies: ['11:00', '11 AM', 'check-out', 'checkout'],
  tourism: ['Johnny Cay', 'Spratt Bight', 'playa', 'beach'],
  multiRoom: ['Kaya', 'Summertime', 'habitación', 'room'],
}
```

VALIDAR:
- Ambos archivos creados
- TypeScript compila sin errores
- Exports accesibles

Documenta en `fase-3/TESTS_IMPLEMENTATION.md`
```

✅ **Expected Output:**

```
✅ tests/e2e/setup.ts created (4 helper functions)
✅ tests/e2e/fixtures.ts created (test data)

TypeScript validation:
npx tsc --noEmit tests/e2e/setup.ts
# No errors

Documentation updated: fase-3/TESTS_IMPLEMENTATION.md
```

🔍 **Validation:**
- [ ] Ambos archivos existen
- [ ] TypeScript compila sin errores
- [ ] Helpers exportados correctamente

---

### Task 3.3: Test 1 - WiFi Password Retrieval

📋 **Context:**
Test crítico #1: Verificar que guest chat responde con password real del WiFi.

🤖 **PROMPT TO @agent-backend-developer:**

```
TAREA 3.3: Crear test E2E para WiFi password retrieval.

Crea `tests/e2e/guest-chat.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { loginAsGuest, askQuestion, waitForResponse, getLastMessageText } from './setup'
import { GUEST_TOKENS, TEST_QUESTIONS, EXPECTED_KEYWORDS } from './fixtures'

test.describe('Guest Chat - WiFi Information', () => {
  test('should respond with WiFi password when asked', async ({ page }) => {
    // 1. Login as guest
    await loginAsGuest(page, GUEST_TOKENS.dreamland)

    // 2. Ask about WiFi
    await askQuestion(page, TEST_QUESTIONS.wifi)

    // 3. Wait for response
    const response = await waitForResponse(page)
    const responseText = await getLastMessageText(page)

    // 4. Assertions
    expect(responseText).toBeTruthy()
    expect(responseText.length).toBeGreaterThan(20)

    // Check for WiFi-related keywords
    const hasWifiKeywords = EXPECTED_KEYWORDS.wifi.some(keyword =>
      responseText.toLowerCase().includes(keyword.toLowerCase())
    )
    expect(hasWifiKeywords).toBeTruthy()

    // Verify NOT generic response
    expect(responseText.toLowerCase()).not.toContain('no tengo información')
    expect(responseText.toLowerCase()).not.toContain('i don\'t have information')

    // Screenshot for evidence
    await page.screenshot({
      path: 'docs/chat-core-stabilization/fase-3/screenshots/test-wifi-success.png'
    })

    console.log(`✅ WiFi test passed. Response: "${responseText.substring(0, 100)}..."`)
  })

  test('should respond within reasonable time', async ({ page }) => {
    await loginAsGuest(page, GUEST_TOKENS.dreamland)
    await askQuestion(page, TEST_QUESTIONS.wifi)

    const startTime = Date.now()
    await waitForResponse(page)
    const duration = Date.now() - startTime

    // Response should be < 3 seconds
    expect(duration).toBeLessThan(3000)

    console.log(`✅ Response time: ${duration}ms (< 3000ms)`)
  })
})
```

EJECUTAR test:
```bash
npm run test:e2e tests/e2e/guest-chat.spec.ts
```

EXPECTED:
- 2 passing tests
- Screenshots creados
- Duration < 3s

Documenta resultados en `fase-3/TEST_RESULTS.md`
```

✅ **Expected Output:**

```
Running 2 tests using 1 worker

  ✓ Guest Chat - WiFi Information › should respond with WiFi password when asked (2.4s)
  ✓ Guest Chat - WiFi Information › should respond within reasonable time (1.8s)

  2 passed (4.2s)

Screenshots saved:
- fase-3/screenshots/test-wifi-success.png

Test results documented: fase-3/TEST_RESULTS.md
```

🔍 **Validation:**
- [ ] 2 tests passing
- [ ] Response time < 3s
- [ ] Screenshot guardado
- [ ] Resultados documentados

---

### Task 3.4-3.6: Tests Adicionales (Policies, Tourism, Multi-room)

📋 **Context:**
Crear tests similares para otros casos críticos.

🤖 **PROMPT TO @agent-backend-developer:**

```
TAREA 3.4-3.6: Agregar tests para Policies, Tourism y Multi-room.

Agrega al archivo `tests/e2e/guest-chat.spec.ts`:

```typescript
test.describe('Guest Chat - Policies', () => {
  test('should respond with check-out time', async ({ page }) => {
    await loginAsGuest(page, GUEST_TOKENS.dreamland)
    await askQuestion(page, TEST_QUESTIONS.policies)

    const response = await waitForResponse(page)
    const responseText = await getLastMessageText(page)

    // Should contain check-out time
    const hasPolicyKeywords = EXPECTED_KEYWORDS.policies.some(keyword =>
      responseText.toLowerCase().includes(keyword.toLowerCase())
    )
    expect(hasPolicyKeywords).toBeTruthy()

    await page.screenshot({
      path: 'docs/chat-core-stabilization/fase-3/screenshots/test-policies-success.png'
    })
  })
})

test.describe('Guest Chat - Tourism', () => {
  test('should respond with local tourism info', async ({ page }) => {
    await loginAsGuest(page, GUEST_TOKENS.dreamland)
    await askQuestion(page, TEST_QUESTIONS.tourism)

    const response = await waitForResponse(page)
    const responseText = await getLastMessageText(page)

    // Should contain tourism-related keywords
    const hasTourismKeywords = EXPECTED_KEYWORDS.tourism.some(keyword =>
      responseText.toLowerCase().includes(keyword.toLowerCase())
    )
    expect(hasTourismKeywords).toBeTruthy()

    await page.screenshot({
      path: 'docs/chat-core-stabilization/fase-3/screenshots/test-tourism-success.png'
    })
  })
})

test.describe('Guest Chat - Multi-room Support', () => {
  test('should show all rooms for multi-room guest', async ({ page }) => {
    await loginAsGuest(page, GUEST_TOKENS.multiRoom)
    await askQuestion(page, TEST_QUESTIONS.multiRoom)

    const response = await waitForResponse(page)
    const responseText = await getLastMessageText(page)

    // Should mention BOTH rooms
    const hasAllRooms = EXPECTED_KEYWORDS.multiRoom.every(keyword =>
      responseText.toLowerCase().includes(keyword.toLowerCase())
    )
    expect(hasAllRooms).toBeTruthy()

    await page.screenshot({
      path: 'docs/chat-core-stabilization/fase-3/screenshots/test-multiroom-success.png'
    })
  })
})
```

EJECUTAR todos los tests:
```bash
npm run test:e2e
```

EXPECTED: 5 passing tests total

Documenta en `fase-3/TEST_RESULTS.md` con todos los screenshots.
```

✅ **Expected Output:**

```
Running 5 tests using 1 worker

  ✓ Guest Chat - WiFi Information › should respond with WiFi password (2.1s)
  ✓ Guest Chat - WiFi Information › should respond within reasonable time (1.7s)
  ✓ Guest Chat - Policies › should respond with check-out time (2.3s)
  ✓ Guest Chat - Tourism › should respond with local tourism info (2.5s)
  ✓ Guest Chat - Multi-room Support › should show all rooms (2.8s)

  5 passed (11.4s)

All screenshots saved in: fase-3/screenshots/
Test results documented: fase-3/TEST_RESULTS.md
```

🔍 **Validation:**
- [ ] 5 tests passing
- [ ] Total execution < 15s
- [ ] All screenshots guardados
- [ ] TEST_RESULTS.md completo

---

### Task 3.7-3.8: Tests Técnicos (Embedding Model, UUID Mapping)

📋 **Context:**
Tests de validación técnica para prevenir problemas conocidos.

🤖 **PROMPT TO @agent-backend-developer:**

```
TAREA 3.7-3.8: Agregar tests técnicos de validación.

Agrega al archivo `tests/e2e/guest-chat.spec.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

test.describe('Technical Validations', () => {
  test('embeddings use correct model', async () => {
    const { data: chunks } = await supabase
      .from('accommodation_units_manual_chunks')
      .select('embedding_balanced')
      .limit(1)
      .single()

    // text-embedding-3-large 1536d should be > 6000 bytes
    const embeddingSize = new TextEncoder().encode(
      JSON.stringify(chunks.embedding_balanced)
    ).length

    expect(embeddingSize).toBeGreaterThan(6000)

    console.log(`✅ Embedding size: ${embeddingSize} bytes (expected >6000)`)
  })

  test('UUID mapping works correctly', async () => {
    // Get a hotel UUID
    const { data: hotelUnit } = await supabase
      .from('hotels.accommodation_units')
      .select('id, name')
      .eq('tenant_id', 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf')
      .limit(1)
      .single()

    // Test mapping function
    const { data: mappedId } = await supabase.rpc('map_hotel_to_public_accommodation_id', {
      p_hotel_unit_id: hotelUnit.id,
      p_tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
    })

    expect(mappedId).toBeTruthy()
    expect(typeof mappedId).toBe('string')

    // Verify mapped ID exists in public table
    const { data: publicUnit } = await supabase
      .from('accommodation_units_public')
      .select('name')
      .eq('unit_id', mappedId)
      .single()

    expect(publicUnit).toBeTruthy()
    expect(publicUnit.name).toContain(hotelUnit.name)

    console.log(`✅ UUID mapping: ${hotelUnit.id.substring(0, 8)}... → ${mappedId.substring(0, 8)}...`)
  })
})
```

EJECUTAR:
```bash
npm run test:e2e
```

EXPECTED: 7 passing tests total

Actualiza `fase-3/TEST_RESULTS.md` con validaciones técnicas.
```

✅ **Expected Output:**

```
Running 7 tests using 1 worker

  ✓ Guest Chat - WiFi Information › should respond with WiFi password (2.1s)
  ✓ Guest Chat - WiFi Information › should respond within reasonable time (1.7s)
  ✓ Guest Chat - Policies › should respond with check-out time (2.3s)
  ✓ Guest Chat - Tourism › should respond with local tourism info (2.5s)
  ✓ Guest Chat - Multi-room Support › should show all rooms (2.8s)
  ✓ Technical Validations › embeddings use correct model (0.3s)
  ✓ Technical Validations › UUID mapping works correctly (0.5s)

  7 passed (12.2s)

✅ Embedding size: 6234 bytes (expected >6000)
✅ UUID mapping: 14fc28a0... → 7220b0fa...

Test results updated: fase-3/TEST_RESULTS.md
```

🔍 **Validation:**
- [ ] 7 tests passing
- [ ] Technical validations passing
- [ ] All documented in TEST_RESULTS.md

---

## 🔄 FASE 4: Code Consolidation (6-8h)

### Task 4.1: Refactor conversational-chat-engine.ts

📋 **Context:**
El archivo tiene código duplicado en líneas 300-400. Extraer funciones.

🤖 **PROMPT TO @agent-backend-developer:**

```
TAREA 4.1: Refactor conversational-chat-engine.ts para reducir duplicación.

ANTES (líneas 300-350 aproximadamente):
```typescript
const searches = []
searches.push(searchAccommodations(...))
searches.push(searchHotelGeneral(...))
if (accommodationUnits.length > 0) {
  const unitManualSearches = accommodationUnits.map(unit =>
    searchUnitManual(queryEmbeddingBalanced, unit.id, unit.name)
  )
  searches.push(Promise.resolve((await Promise.all(unitManualSearches)).flat()))
}
if (hasMuvaAccess) {
  searches.push(searchTourism(...))
}
const results = await Promise.all(searches)
```

DESPUÉS (consolidado):

1. Crear función `buildSearchStrategy()`:
```typescript
interface SearchStrategy {
  accommodations: boolean
  hotelGeneral: boolean
  unitManuals: { unitId: string; name: string }[]
  tourism: boolean
}

function buildSearchStrategy(
  guestInfo: GuestInfo,
  hasMuvaAccess: boolean
): SearchStrategy {
  return {
    accommodations: true, // Always search accommodations
    hotelGeneral: true,   // Always search hotel general
    unitManuals: guestInfo.accommodation_units || [],
    tourism: hasMuvaAccess
  }
}
```

2. Crear función `executeParallelSearch()`:
```typescript
async function executeParallelSearch(
  strategy: SearchStrategy,
  embeddings: { fast: number[]; balanced: number[]; full: number[] }
): Promise<SearchResults> {
  const searches: Promise<any[]>[] = []

  if (strategy.accommodations) {
    searches.push(searchAccommodations(embeddings.fast, ...))
  }

  if (strategy.hotelGeneral) {
    searches.push(searchHotelGeneral(embeddings.balanced, ...))
  }

  if (strategy.unitManuals.length > 0) {
    const unitSearches = strategy.unitManuals.map(unit =>
      searchUnitManual(embeddings.balanced, unit.unitId, unit.name)
    )
    searches.push(Promise.all(unitSearches).then(results => results.flat()))
  } else {
    searches.push(Promise.resolve([]))
  }

  if (strategy.tourism) {
    searches.push(searchTourism(embeddings.fast, ...))
  } else {
    searches.push(Promise.resolve([]))
  }

  const [accommodationResults, hotelResults, manualResults, tourismResults] =
    await Promise.all(searches)

  return {
    accommodations: accommodationResults,
    hotelGeneral: hotelResults,
    unitManuals: manualResults,
    tourism: tourismResults
  }
}
```

3. Actualizar código principal:
```typescript
// NUEVO código consolidado
const strategy = buildSearchStrategy(guestInfo, hasMuvaAccess)
const results = await executeParallelSearch(strategy, {
  fast: queryEmbeddingFast,
  balanced: queryEmbeddingBalanced,
  full: queryEmbeddingFull
})
```

VALIDAR:
- npm run build (0 TypeScript errors)
- npm run test:e2e (todos pasan)
- Performance NO degradado (comparar con baseline)

Documenta en `fase-4/REFACTOR_REPORT.md`
```

✅ **Expected Output:**

```
✅ Functions extracted:
   - buildSearchStrategy() (15 lines)
   - executeParallelSearch() (35 lines)

✅ Original code: 85 lines
✅ New code: 60 lines (-29% reduction)

Validation:
npm run build
# ✅ Build successful (0 errors)

npm run test:e2e
# ✅ 7/7 tests passing

Performance comparison:
Before: avg 1.8s per query
After: avg 1.7s per query
# ✅ No degradation

Documentation: fase-4/REFACTOR_REPORT.md
```

🔍 **Validation:**
- [ ] Build exitoso
- [ ] Tests E2E pasan
- [ ] Performance similar o mejor
- [ ] Código más legible

---

### Task 4.2: Crear src/lib/embeddings/generator.ts

📋 **Context:**
Centralizar embedding generation con modelo HARDCODED.

🤖 **PROMPT TO @agent-backend-developer:**

```
TAREA 4.2: Crear módulo centralizado para embedding generation.

Crea `src/lib/embeddings/generator.ts`:

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// HARDCODED - DO NOT CHANGE
const EMBEDDING_MODEL = 'text-embedding-3-large' as const

interface EmbeddingConfig {
  dimensions: 1024 | 1536 | 3072
  validate?: boolean
}

interface EmbeddingResult {
  embedding: number[]
  model: string
  dimensions: number
  tokens: number
}

/**
 * Generate embedding using ONLY text-embedding-3-large
 * Model is HARDCODED to prevent inconsistencies
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<EmbeddingResult> {
  // Validation
  if (config.validate) {
    if (text.length === 0) {
      throw new Error('Text cannot be empty')
    }
    if (text.length > 8191) {
      console.warn(`Text length ${text.length} exceeds recommended 8191 tokens`)
    }
  }

  // Generate embedding
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: config.dimensions
  })

  const embedding = response.data[0].embedding

  // Logging
  console.log(`[Embeddings] Generated`, {
    model: EMBEDDING_MODEL,
    dimensions: config.dimensions,
    textLength: text.length,
    embeddingLength: embedding.length
  })

  return {
    embedding,
    model: EMBEDDING_MODEL,
    dimensions: config.dimensions,
    tokens: response.usage.total_tokens
  }
}

/**
 * Generate all 3 tier embeddings at once (Matryoshka)
 */
export async function generateMatryoshkaEmbeddings(
  text: string
): Promise<{
  fast: number[]      // 1024d
  balanced: number[]  // 1536d
  full: number[]      // 3072d
}> {
  const [fast, balanced, full] = await Promise.all([
    generateEmbedding(text, { dimensions: 1024 }),
    generateEmbedding(text, { dimensions: 1536 }),
    generateEmbedding(text, { dimensions: 3072 })
  ])

  return {
    fast: fast.embedding,
    balanced: balanced.embedding,
    full: full.embedding
  }
}

/**
 * Get the embedding model being used (for validation)
 */
export function getEmbeddingModel(): string {
  return EMBEDDING_MODEL
}
```

VALIDAR:
- TypeScript compila
- Export functions accesibles
- Model HARDCODED (no configurable)

Documenta en `fase-4/REFACTOR_REPORT.md`
```

✅ **Expected Output:**

```
✅ File created: src/lib/embeddings/generator.ts

Exports:
- generateEmbedding(text, config)
- generateMatryoshkaEmbeddings(text)
- getEmbeddingModel()

Model: HARDCODED as 'text-embedding-3-large' ✅

TypeScript validation:
npx tsc --noEmit src/lib/embeddings/generator.ts
# ✅ No errors

Documentation updated: fase-4/REFACTOR_REPORT.md
```

🔍 **Validation:**
- [ ] Archivo creado
- [ ] TypeScript compila
- [ ] Modelo HARDCODED
- [ ] 3 funciones exportadas

---

### Task 4.3-4.6: Validator, Unified Search, Update Scripts

📋 **Context:**
Crear módulos adicionales y actualizar scripts existentes.

🤖 **PROMPT TO @agent-backend-developer:**

```
TAREA 4.3-4.6: Completar consolidación de código.

1. Crear `src/lib/embeddings/validator.ts`:
```typescript
export function validateEmbeddingConfig(config: any) {
  const validDimensions = [1024, 1536, 3072]
  if (!validDimensions.includes(config.dimensions)) {
    throw new Error(`Invalid dimensions: ${config.dimensions}. Must be 1024, 1536, or 3072`)
  }
}

export function validateEmbeddingOutput(embedding: number[], expectedDimensions: number) {
  if (embedding.length !== expectedDimensions) {
    throw new Error(`Embedding dimension mismatch: got ${embedding.length}, expected ${expectedDimensions}`)
  }
}
```

2. Crear `src/lib/vector-search/unified-search.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const vectorSearchRPC = {
  async searchAccommodations(embedding: number[], tenantId: string, threshold: number, count: number) {
    return supabase.rpc('match_accommodations_public', {
      query_embedding: embedding,
      p_tenant_id: tenantId,
      match_threshold: threshold,
      match_count: count
    })
  },

  async searchHotelGeneral(embedding: number[], tenantId: string, threshold: number, count: number) {
    return supabase.rpc('match_hotel_general_info', {
      query_embedding: embedding,
      p_tenant_id: tenantId,
      match_threshold: threshold,
      match_count: count
    })
  },

  async searchUnitManuals(embedding: number[], unitId: string, threshold: number, count: number) {
    return supabase.rpc('match_unit_manual_chunks', {
      query_embedding: embedding,
      p_accommodation_unit_id: unitId,
      match_threshold: threshold,
      match_count: count
    })
  },

  async searchTourism(embedding: number[], threshold: number, count: number) {
    return supabase.rpc('match_muva_documents', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: count
    })
  }
}
```

3. Actualizar `scripts/process-accommodation-manuals.js`:
```javascript
// Importar generator centralizado
import { generateMatryoshkaEmbeddings } from '../src/lib/embeddings/generator.ts'

// Reemplazar embedding generation inline:
const { fast, balanced, full } = await generateMatryoshkaEmbeddings(manualContent)

// Usar embeddings:
await supabase.from('accommodation_units_manual').upsert({
  embedding: full,
  embedding_balanced: balanced,
  embedding_fast: fast
})
```

4. Actualizar otros scripts que generen embeddings:
- `scripts/sync-accommodations-to-public.ts`
- Cualquier otro script que llame OpenAI embeddings API

VALIDAR:
- npm run build (0 errors)
- npm run test:e2e (7/7 passing)
- Scripts updated funcionan

Documenta cambios en `fase-4/REFACTOR_REPORT.md`
```

✅ **Expected Output:**

```
✅ Files created:
   - src/lib/embeddings/validator.ts
   - src/lib/vector-search/unified-search.ts

✅ Scripts updated:
   - scripts/process-accommodation-manuals.js
   - scripts/sync-accommodations-to-public.ts

Validation:
npm run build
# ✅ Build successful

npm run test:e2e
# ✅ 7/7 tests passing

Updated script test:
node scripts/process-accommodation-manuals.js --tenant simmerdown --dry-run
# ✅ Uses centralized generator

Documentation: fase-4/REFACTOR_REPORT.md
```

🔍 **Validation:**
- [ ] Todos los archivos creados
- [ ] Scripts actualizados funcionan
- [ ] Build y tests pasan
- [ ] Documentación completa

---

## 📚 FASE 5: Documentation Definitiva (4-6h)

### Task 5.1-5.4: ADRs (Architecture Decision Records)

📋 **Context:**
Documentar decisiones arquitectónicas clave con contexto histórico.

🤖 **PROMPT TO @agent-backend-developer:**

```
TAREA 5.1-5.4: Crear 4 ADRs documentando decisiones arquitectónicas.

Crea los siguientes archivos en `docs/adr/`:

**ADR 001: Three-Domain Architecture**
`docs/adr/001-three-domain-architecture.md`:

```markdown
# ADR 001: Three-Domain Architecture for Guest Chat

## Status
Accepted (Implemented October 2025)

## Context
Guest chat needs to answer 3 fundamentally different types of questions:

1. **Tourism (MUVA content)** - Public information about San Andrés
   - Accessible to ALL guests
   - ~700 documents (beaches, restaurants, activities)
   - Needs fast search (Tier 1 - 1024d embeddings)

2. **Hotel General (Policies, Amenities)** - Tenant-specific
   - Accessible to guests of specific hotel
   - Check-in/out times, house rules, services
   - Needs balanced search (Tier 2 - 1536d embeddings)

3. **Unit Manuals (WiFi, Codes, Instructions)** - Private
   - Accessible ONLY to guest assigned to specific unit
   - Sensitive information (passwords, access codes)
   - Needs full precision (Tier 3 - 3072d embeddings)

**Problem:** How to implement permission-based search efficiently?

## Decision
Implement **3 separate vector search domains** with independent RPC functions:

1. `match_muva_documents()` - Tourism (no tenant filter, public)
2. `match_hotel_general_info()` - Hotel info (filtered by tenant_id)
3. `match_unit_manual_chunks()` - Unit manuals (filtered by unit_id)

All 3 searches execute **in parallel** using `Promise.all()`.

## Consequences

### Positive
- ✅ Clear permission boundaries (impossible to leak data cross-domain)
- ✅ Performance optimizable per domain (different embedding tiers)
- ✅ Easy to debug (isolated search logs)
- ✅ Scalable (can add more domains without affecting existing)

### Negative
- ⚠️ More complex code (3 search functions vs 1)
- ⚠️ 3x embedding storage required
- ⚠️ Need to consolidate results from 3 sources

### Risks Mitigated
- 🔒 Guest cannot access other guest's WiFi passwords
- 🔒 Tenant A cannot see tenant B's policies
- 🔒 Public users cannot access any private information

## Implementation
See: `src/lib/conversational-chat-engine.ts:300-350`

## References
- EMBEDDINGS_AND_DOCUMENTS_SYSTEM.md - Full architecture
- conversational-chat-engine.ts - Implementation
```

**Similar format for ADRs 002, 003, 004:**

- ADR 002: Matryoshka Embeddings (3-tier system)
- ADR 003: UUID + Stable ID Strategy (motopress_unit_id)
- ADR 004: Multi-Room Support (array of units)

Crea TODOS los 4 ADRs con:
- Status, Context, Decision, Consequences
- Implementation references
- Related documentation links

Documenta en `fase-5/DOCUMENTATION_INDEX.md`
```

✅ **Expected Output:**

```
✅ ADRs created:
   - docs/adr/001-three-domain-architecture.md
   - docs/adr/002-matryoshka-embeddings.md
   - docs/adr/003-uuid-stable-id-strategy.md
   - docs/adr/004-multi-room-support.md

Each ADR includes:
✅ Status
✅ Context (why this decision)
✅ Decision (what was chosen)
✅ Consequences (pros/cons)
✅ Implementation references
✅ Related documentation

Documentation index: fase-5/DOCUMENTATION_INDEX.md
```

🔍 **Validation:**
- [ ] 4 ADRs creados
- [ ] Cada uno con formato completo
- [ ] Referencias a código incluidas
- [ ] DOCUMENTATION_INDEX.md actualizado

---

### Task 5.5-5.6: Runbooks Operacionales

📋 **Context:**
Crear guías paso a paso para troubleshooting común.

🤖 **PROMPT TO @agent-backend-developer:**

```
TAREA 5.5-5.6: Crear 2 runbooks operacionales.

Crea:

**Runbook 1: Guest Chat Not Responding**
`docs/runbooks/guest-chat-not-responding.md`:

```markdown
# Runbook: Guest Chat Not Responding

**Symptom:** Guest asks about WiFi/Policies, bot responds "no tengo información"

**Time to Resolve:** 5-15 minutes

## Diagnosis (5 min)

### Step 1: Check chunks exist
```sql
SELECT COUNT(*) FROM accommodation_units_manual_chunks
WHERE accommodation_unit_id IN (
  SELECT unit_id FROM accommodation_units_public
  WHERE tenant_id = '<tenant-id>'
);
```
**Expected:** >200 chunks

**If 0 chunks:** → FIX PATH C (Recreate chunks)

### Step 2: Check embedding model
```sql
SELECT octet_length(embedding_balanced::text)
FROM accommodation_units_manual_chunks LIMIT 1;
```
**Expected:** >6000 bytes

**If <6000:** → FIX PATH A (Wrong model)

### Step 3: Check orphaned chunks
```sql
SELECT COUNT(*) FROM accommodation_units_manual_chunks aumc
LEFT JOIN accommodation_units_public aup ON aup.unit_id = aumc.accommodation_unit_id
WHERE aup.unit_id IS NULL;
```
**Expected:** 0 orphaned

**If >0:** → FIX PATH B (Orphaned UUIDs)

## Fix Procedures

### Path A: Wrong Embedding Model
```bash
set -a && source .env.local && set +a
npx tsx scripts/regenerate-manual-embeddings.ts <tenant-id>
```
**Time:** 8-10 minutes
**Validation:** SQL check embedding_size >6000

### Path B: Orphaned UUIDs
```bash
set -a && source .env.local && set +a
npx tsx scripts/smart-remap-manual-ids.ts <tenant-id>
```
**Time:** 2-3 minutes
**Validation:** SQL check orphaned_chunks = 0

### Path C: Chunks Missing
```bash
set -a && source .env.local && set +a
node scripts/process-accommodation-manuals.js --tenant <slug>
```
**Time:** 5-8 minutes
**Validation:** SQL check total_chunks >200

## Validation

Test guest chat manually:
1. Login: `http://<tenant>.localhost:3000/guest/login?token=<token>`
2. Ask: "¿Cuál es la contraseña del WiFi?"
3. Verify: Response contains real password
4. Check logs: `[Chat Engine] Unit manual chunks results: { total_found: 5+ }`

## Escalation

If NONE of the above fixes work:
1. Check guest has valid `accommodation_unit_id` in reservation
2. Check RPC `match_unit_manual_chunks` exists
3. Check OpenAI API key valid
4. Review recent code changes in `conversational-chat-engine.ts`
```

**Runbook 2: Recreate Units Safely**
Similar format with step-by-step safe process.

Documenta en `fase-5/DOCUMENTATION_INDEX.md`
```

✅ **Expected Output:**

```
✅ Runbooks created:
   - docs/runbooks/guest-chat-not-responding.md
   - docs/runbooks/recreate-units-safely.md

Each runbook includes:
✅ Symptom description
✅ Time estimates
✅ Step-by-step diagnosis
✅ Fix procedures (copy-paste commands)
✅ Validation steps
✅ Escalation path

Documentation index updated: fase-5/DOCUMENTATION_INDEX.md
```

🔍 **Validation:**
- [ ] 2 runbooks creados
- [ ] Commands copy-pasteable
- [ ] Tested with real scenarios
- [ ] DOCUMENTATION_INDEX.md actualizado

---

## 🏥 FASE 6: Monitoring Continuo (3-4h)

### Task 6.1: Crear Health Endpoint

📋 **Context:**
Endpoint `/api/health/guest-chat` para verificar estado del sistema.

🤖 **PROMPT TO @agent-infrastructure-monitor:**

```
TAREA 6.1: Crear health endpoint para guest chat.

Crea `src/app/api/health/guest-chat/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface HealthCheck {
  chunks_exist: boolean
  embeddings_correct: boolean
  mapping_works: boolean
  search_functional: boolean
}

export async function GET(request: NextRequest) {
  const checks: HealthCheck = {
    chunks_exist: false,
    embeddings_correct: false,
    mapping_works: false,
    search_functional: false
  }

  try {
    // CHECK 1: Chunks exist
    const { count } = await supabase
      .from('accommodation_units_manual_chunks')
      .select('*', { count: 'exact', head: true })
    checks.chunks_exist = (count || 0) > 200

    // CHECK 2: Embeddings correct model
    const { data: sampleChunk } = await supabase
      .from('accommodation_units_manual_chunks')
      .select('embedding_balanced')
      .limit(1)
      .single()

    if (sampleChunk?.embedding_balanced) {
      const embeddingSize = sampleChunk.embedding_balanced.length
      checks.embeddings_correct = embeddingSize === 1536
    }

    // CHECK 3: Mapping works
    const { data: mappingTest } = await supabase.rpc('map_hotel_to_public_accommodation_id', {
      p_hotel_unit_id: '14fc28a0-f6ac-4789-bc95-47c18bc4bf33', // Test UUID
      p_tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
    })
    checks.mapping_works = !!mappingTest

    // CHECK 4: Search functional
    if (sampleChunk?.embedding_balanced) {
      const { data: searchTest } = await supabase.rpc('match_unit_manual_chunks', {
        query_embedding: sampleChunk.embedding_balanced,
        p_accommodation_unit_id: 'test-uuid',
        match_threshold: 0.3,
        match_count: 5
      })
      checks.search_functional = (searchTest?.length || 0) > 0
    }

    const allPassed = Object.values(checks).every(v => v)

    return NextResponse.json({
      status: allPassed ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString()
    }, {
      status: allPassed ? 200 : 503
    })

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      checks,
      timestamp: new Date().toISOString()
    }, {
      status: 500
    })
  }
}
```

VALIDAR:
```bash
# Start dev server
./scripts/dev-with-keys.sh

# Test endpoint
curl http://localhost:3000/api/health/guest-chat

# Expected: {"status":"healthy","checks":{...},"timestamp":"..."}
```

Documenta en `fase-6/MONITORING_SETUP.md`
```

✅ **Expected Output:**

```
✅ File created: src/app/api/health/guest-chat/route.ts

Testing endpoint:
curl http://localhost:3000/api/health/guest-chat

Response:
{
  "status": "healthy",
  "checks": {
    "chunks_exist": true,
    "embeddings_correct": true,
    "mapping_works": true,
    "search_functional": true
  },
  "timestamp": "2025-10-24T..."
}

HTTP Status: 200 ✅

Documentation: fase-6/MONITORING_SETUP.md
```

🔍 **Validation:**
- [ ] Endpoint creado
- [ ] Returns 200 when healthy
- [ ] Returns 503 when degraded
- [ ] All 4 checks implemented

---

### Task 6.2-6.4: Cron Job, Post-Deploy, Configuration

📋 **Context:**
Automatizar health checks diarios + post-deploy verification.

🤖 **PROMPT TO @agent-infrastructure-monitor:**

```
TAREA 6.2-6.4: Crear scripts de monitoring automático.

1. Crear `scripts/health-check-cron.sh`:
```bash
#!/bin/bash
# Daily health check at 9 AM: 0 9 * * * /path/to/health-check-cron.sh

HEALTH_URL="https://muva.chat/api/health/guest-chat"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -ne 200 ]; then
  # Send Slack alert
  curl -X POST $SLACK_WEBHOOK \
    -H 'Content-Type: application/json' \
    -d '{
      "text": "🚨 Guest Chat Health Check FAILED",
      "attachments": [{
        "color": "danger",
        "text": "Status code: '$response'\nCheck: '$HEALTH_URL'"
      }]
    }'

  echo "❌ Health check failed: $response"
  exit 1
else
  echo "✅ Health check passed"
  exit 0
fi
```

2. Crear `scripts/post-deploy-verify.ts`:
```typescript
async function verifyGuestChat() {
  console.log('🏥 Running post-deploy verification...')

  // 1. Health endpoint
  const healthResponse = await fetch('https://muva.chat/api/health/guest-chat')
  const health = await healthResponse.json()

  if (health.status !== 'healthy') {
    console.error('❌ Health check failed:', health)
    process.exit(1)
  }

  // 2. E2E smoke test (subset)
  const { exec } = require('child_process')
  exec('npm run test:e2e -- --grep "WiFi"', (error, stdout) => {
    if (error) {
      console.error('❌ Smoke test failed:', error)
      process.exit(1)
    }
    console.log('✅ All verifications passed')
    process.exit(0)
  })
}

verifyGuestChat()
```

3. Configurar cron en servidor:
```bash
# SSH al VPS
ssh user@muva.chat

# Edit crontab
crontab -e

# Add line:
# 0 9 * * * /home/user/muva-chat/scripts/health-check-cron.sh >> /var/log/muva-health.log 2>&1
```

VALIDAR:
- Scripts ejecutables
- Cron job configurado
- Test manual ejecutado exitoso

Documenta COMPLETO en `fase-6/MONITORING_SETUP.md`
```

✅ **Expected Output:**

```
✅ Scripts created:
   - scripts/health-check-cron.sh
   - scripts/post-deploy-verify.ts

✅ Permissions set:
   chmod +x scripts/health-check-cron.sh

✅ Cron job configured on VPS

Test execution:
./scripts/health-check-cron.sh
# ✅ Health check passed

Manual Slack alert test (force failure):
# ✅ Slack message received

Documentation complete: fase-6/MONITORING_SETUP.md
```

🔍 **Validation:**
- [ ] Scripts creados y ejecutables
- [ ] Cron job configurado
- [ ] Slack alerts funcionando
- [ ] Post-deploy script funcional
- [ ] MONITORING_SETUP.md completo

---

## 🎉 PROYECTO COMPLETADO

Una vez TODAS las FASES (1-6) están completas, verificar:

### Final Checklist

**Funcionalidad:**
- [ ] Guest chat responde WiFi 100%
- [ ] Guest chat responde Policies 100%
- [ ] Guest chat responde Tourism 100%
- [ ] Multi-room support funciona

**Testing:**
- [ ] 7+ tests E2E automatizados
- [ ] Tests ejecutan en <15s
- [ ] Coverage >80% en módulos críticos

**Código:**
- [ ] Refactor completado (-30% duplicación)
- [ ] Embedding generation centralizado
- [ ] Vector search consolidado

**Documentación:**
- [ ] 4 ADRs creados
- [ ] 2 Runbooks operacionales
- [ ] Troubleshooting actualizado

**Monitoring:**
- [ ] Health endpoint funcional (200/503)
- [ ] Cron job ejecutándose diariamente
- [ ] Alertas Slack testeadas

### Post-Implementation

**Seguimiento 30 días:**
- Monitor health check logs
- Track incidents (esperado: 0 recurrentes)
- Gather developer feedback
- Update docs con learnings

**Success Metrics:**
- Zero guest chat incidents
- 100% E2E test pass rate
- Developer onboarding < 1 hora
- Mean time to resolution < 15 min

---

**End of Workflow Prompts - Part 2**
**Total FASES:** 3, 4, 5, 6 (completadas)
**Combined with Part 1:** FASES 1-6 (completas)
