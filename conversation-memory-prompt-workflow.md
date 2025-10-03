# PROMPTS WORKFLOW - Sistema de Memoria de Conversaciones con Embeddings

**Proyecto:** Conversation Memory System
**Archivos de referencia:** `plan.md` + `TODO.md`

---

## 🎯 Contexto General (Usar SIEMPRE primero en nuevas conversaciones)

```
CONTEXTO DEL PROYECTO: Sistema de Memoria de Conversaciones con Embeddings

Estoy trabajando en el proyecto "Conversation Memory System" para superar el limite actual de 20 mensajes en conversaciones de chat usando compresion inteligente con embeddings.

ARCHIVOS CLAVE:
- plan.md → Plan completo del proyecto (417 lineas) - Arquitectura y 6 fases (0-5)
- TODO.md → Tareas organizadas por fases (261 lineas, 22 tareas)
- conversation-memory-prompt-workflow.md → Este archivo con prompts ejecutables

OBJETIVO:
Implementar compresion automatica de conversaciones que al llegar a 20 mensajes, comprime los primeros 10 en un resumen embedizado, permitiendo busqueda semantica del contexto historico.

STACK:
- PostgreSQL + pgvector (almacenamiento)
- OpenAI text-embedding-3-large (embeddings 1024d)
- Anthropic Claude Haiku (compresion ~$0.001)
- Anthropic Claude Sonnet 4.5 (respuestas al usuario)
- Supabase RPC functions (busqueda semantica)

ESTADO ACTUAL:
- ✅ Sistema guarda 20 mensajes (10 intercambios) con FIFO
- ✅ Infraestructura Matryoshka embeddings (3 tiers) operacional
- ❌ BUG CRITICO: Sesiones no persisten en dispositivos moviles (FASE 0)
- ❌ No hay busqueda semantica de historial
- ❌ Conversaciones largas pierden contexto

ALCANCE:
- FASE 0 (CRITICO): Fix mobile session cookie reading
- Aplicar a dev-chat + public-chat
- Compresion automatica cada 10 mensajes
- Busqueda semantica con threshold >0.3
- Costo: ~$0.33/mes para 100 sesiones activas

Por favor, confirma que entiendes el contexto antes de continuar.
```

---

## FASE 0: Mobile Session Fix (30min) 🔧 CRITICO

### Prompt 0.1: Fix public-chat API cookie reading

```
quiero que @backend-developer

TAREA: Modificar src/app/api/public/chat/route.ts para leer session_id de cookies (ademas de body y headers)

CONTEXTO:
- BUG CRITICO: Sesiones no persisten en moviles
- Root cause: Backend crea HttpOnly cookies pero nunca las lee
- Frontend usa localStorage (falla en algunos moviles)
- Impacto: Cada mensaje tratado como primera vez

PROBLEMA ACTUAL (lineas 165-168):
```typescript
// Get session ID from header if not in body
const headerSessionId = request.headers.get('x-session-id')
const effectiveSessionId = session_id || headerSessionId || undefined
```

SOLUCION REQUERIDA (lineas 165-169):
```typescript
// Get session ID from multiple sources (priority: body → cookie → header)
const cookieSessionId = request.cookies.get('session_id')?.value
const headerSessionId = request.headers.get('x-session-id')
const effectiveSessionId = session_id || cookieSessionId || headerSessionId || undefined
```

ARCHIVOS:
- Modificar: `src/app/api/public/chat/route.ts` (lineas 165-168)
- Cambio: Agregar lectura de cookie session_id
- Prioridad: body → cookie → header → undefined

CODIGO ESPERADO:
- +1 linea: Leer cookie session_id
- Modificar 1 linea: Actualizar effectiveSessionId con cookieSessionId

TEST:
- Probar en computador (Chrome/Safari): Sesion debe persistir
- Probar en movil (iOS Safari): Sesion debe persistir
- Test de 20+ mensajes: Contexto se mantiene
- Verificar en Vercel logs: session_id consistente

SIGUIENTE: Prompt 0.2 para dev-chat API
```

---

### Prompt 0.2: Fix dev-chat API cookie reading

```
también @backend-developer

TAREA: Aplicar mismo fix de cookie reading en dev-chat API (mantener consistencia)

CONTEXTO:
- Mismo bug que public-chat
- Referencia: src/app/api/public/chat/route.ts (Prompt 0.1)
- Objetivo: Consistencia total entre ambos endpoints

ARCHIVOS:
- Referencia: `src/app/api/public/chat/route.ts` (lineas 165-169) - Fix ya aplicado
- Modificar: `src/app/api/dev/chat/route.ts` (lineas 166-169)

ESPECIFICACIONES:
- Aplicar EXACTAMENTE el mismo cambio que en Prompt 0.1
- Mantener misma prioridad: body → cookie → header
- Mantener mismos logs y error handling

CODIGO ESPERADO:
```typescript
// Get session ID from multiple sources (priority: body → cookie → header)
const cookieSessionId = request.cookies.get('session_id')?.value
const headerSessionId = request.headers.get('x-session-id')
const effectiveSessionId = session_id || cookieSessionId || headerSessionId || undefined
```

TEST:
- Mismo test plan que Prompt 0.1
- Verificar consistencia entre dev-chat y public-chat

SIGUIENTE: Prompt 0.3 para Testing Mobile
```

---

### Prompt 0.3: Validacion Mobile Testing

```
también @backend-developer

TAREA: Ejecutar tests de validacion en dispositivos moviles reales y documentar resultados

CONTEXTO:
- Fix aplicado en Prompts 0.1 y 0.2
- Objetivo: Confirmar que sesiones persisten en todos los dispositivos

TEST PLAN:

1. Test en Computador:
   - Browser: Chrome + Safari
   - Accion: Enviar 5 mensajes
   - Verificar: session_id consistente en Network tab
   - Verificar: Contexto se mantiene

2. Test en iPhone:
   - Browser: Safari + Chrome iOS
   - Accion: Enviar 10 mensajes
   - Verificar: No se pierde contexto
   - Verificar: Cookies presentes en DevTools

3. Test en Android:
   - Browser: Chrome + Samsung Internet
   - Accion: Enviar 10 mensajes
   - Verificar: Session persiste

4. Test de Conversacion Larga (Mobile):
   - Device: iPhone 15
   - Accion: Enviar 25 mensajes
   - Verificar: Contexto de mensajes 1-10 recordado en mensaje 25
   - Verificar: No hay "Hola! Como puedo ayudarte?" cada mensaje

5. Test en Modo Incognito:
   - Browser: Safari Private + Chrome Incognito
   - Accion: Enviar 5 mensajes en misma sesion
   - Verificar: Cookies funcionan (no localStorage)

DOCUMENTACION:
- Crear: `docs/conversation-memory/fase-0/MOBILE_TESTING.md`
- Incluir: Screenshots, session_ids, resultados por dispositivo
- Formato: Tabla con Device | Browser | Status | Notes

CRITERIOS DE EXITO:
- ✅ Sesiones persisten en 100% de dispositivos
- ✅ No mas "primer mensaje" en cada mensaje
- ✅ Contexto mantenido 20+ mensajes
- ✅ Cookies leidas correctamente

SIGUIENTE: Prompt 1.1 para Database Schema (FASE 1)
```

---

## FASE 1: Database Schema (2-3h)

### Prompt 1.1: Crear Migracion SQL

```
@database-agent

TAREA: Crear migracion SQL completa para tabla conversation_memory con embeddings Matryoshka Tier 1

CONTEXTO:
- Proyecto: Conversation Memory System (ver plan.md)
- Arquitectura: Matryoshka embeddings Tier 1 (1024d) para velocidad
- Multi-tenant: Debe respetar tenant_id y session_id
- Objetivo: Almacenar resumenes embedizados de conversaciones comprimidas

ESPECIFICACIONES:

1. Crear migracion en:
   - Ruta: `supabase/migrations/YYYYMMDDHHMMSS_create_conversation_memory.sql`
   - Formato fecha: `20251003HHMMSS` (usar timestamp actual)

2. Tabla conversation_memory:
   ```sql
   CREATE TABLE conversation_memory (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     session_id UUID REFERENCES prospective_sessions(session_id) ON DELETE CASCADE,
     tenant_id UUID REFERENCES tenant_registry(tenant_id),

     -- Resumen compactado
     summary_text TEXT NOT NULL,
     message_range TEXT NOT NULL, -- "messages 1-10", "messages 11-20"
     message_count INTEGER NOT NULL DEFAULT 10,

     -- Embeddings Matryoshka Tier 1 (fast)
     embedding_fast vector(1024),

     -- Entidades extraidas (JSON)
     key_entities JSONB DEFAULT '{}'::jsonb,

     -- Metadata
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. Indice HNSW para busqueda rapida:
   ```sql
   CREATE INDEX idx_conversation_memory_embedding_fast
   ON conversation_memory
   USING hnsw (embedding_fast vector_cosine_ops)
   WITH (m = 16, ef_construction = 64);

   CREATE INDEX idx_conversation_memory_session
   ON conversation_memory(session_id);
   ```

4. Funcion RPC para busqueda semantica:
   ```sql
   CREATE OR REPLACE FUNCTION match_conversation_memory(
     query_embedding vector(1024),
     p_session_id UUID,
     match_threshold FLOAT DEFAULT 0.3,
     match_count INT DEFAULT 2
   )
   RETURNS TABLE (
     id UUID,
     summary_text TEXT,
     key_entities JSONB,
     message_range TEXT,
     similarity FLOAT
   )
   LANGUAGE plpgsql
   AS $$
   BEGIN
     RETURN QUERY
     SELECT
       cm.id,
       cm.summary_text,
       cm.key_entities,
       cm.message_range,
       1 - (cm.embedding_fast <=> query_embedding) AS similarity
     FROM conversation_memory cm
     WHERE
       cm.session_id = p_session_id
       AND 1 - (cm.embedding_fast <=> query_embedding) > match_threshold
     ORDER BY cm.embedding_fast <=> query_embedding
     LIMIT match_count;
   END;
   $$;
   ```

5. RLS Policies:
   ```sql
   ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

   -- Policy para SELECT (solo own session)
   CREATE POLICY "Users can view own session memories"
     ON conversation_memory FOR SELECT
     USING (session_id IN (
       SELECT session_id FROM prospective_sessions
       WHERE cookie_id = current_setting('request.cookie_id', true)
     ));

   -- Policy para INSERT (solo own tenant)
   CREATE POLICY "Service can insert memories"
     ON conversation_memory FOR INSERT
     WITH CHECK (true); -- Service role only
   ```

TEST:
- Aplicar migracion: `npx supabase migration up`
- Verificar tabla: `\d conversation_memory` en psql
- Verificar indice HNSW: `\di idx_conversation_memory_embedding_fast`
- Probar RPC con embedding dummy
- Verificar RLS: Intentar acceder con otro tenant (debe fallar)

SIGUIENTE: Prompt 2.1 para Compression Service
```

---

## FASE 2: Compression Service (3-4h)

### Prompt 2.1: Crear conversation-compressor.ts

```
@backend-developer

TAREA: Crear servicio de compresion que genera resumenes inteligentes usando Claude Haiku con extraccion de entidades

CONTEXTO:
- Proyecto: Conversation Memory System
- Base de referencia: `src/lib/dev-chat-engine.ts` (lineas 20-34) para lazy init de Anthropic
- Base de referencia: `src/lib/dev-chat-search.ts` (lineas 98-120) para generacion de embeddings
- Objetivo: Comprimir 10 mensajes en resumen de 200 palabras + entities

ESPECIFICACIONES:

1. Crear archivo: `src/lib/conversation-compressor.ts`

2. Interfaces:
   ```typescript
   export interface ConversationSummary {
     summary: string
     entities: {
       travel_intent: {
         dates?: string
         guests?: number
         preferences: string[]
       }
       topics_discussed: string[]
       key_questions: string[]
     }
   }
   ```

3. Lazy initialization para Anthropic (copiar patron existente):
   ```typescript
   let anthropic: Anthropic | null = null

   function getAnthropicClient(): Anthropic {
     if (!anthropic) {
       anthropic = new Anthropic({
         apiKey: process.env.ANTHROPIC_API_KEY!,
       })
     }
     return anthropic
   }
   ```

4. Funcion principal de compresion:
   ```typescript
   export async function compressConversationSegment(
     messages: Array<{role: string, content: string}>,
     sessionId: string
   ): Promise<ConversationSummary> {
     const client = getAnthropicClient()

     const conversationText = messages
       .map(m => `${m.role}: ${m.content}`)
       .join('\n\n')

     try {
       const response = await client.messages.create({
         model: 'claude-haiku-4-20250514', // Barato: $0.001
         max_tokens: 500,
         temperature: 0.1,
         messages: [{
           role: 'user',
           content: `Analiza esta conversacion de chat de hotel y extrae:

CONVERSACION:
${conversationText}

Genera un JSON con:
{
  "summary": "Resumen narrativo de 200 palabras",
  "travel_intent": {
    "dates": "check-in a check-out o null",
    "guests": "numero o null",
    "preferences": ["playa", "cocina", ...]
  },
  "topics_discussed": ["playa", "precio", ...],
  "key_questions": ["politica cancelacion", ...]
}

Solo JSON, sin explicaciones.`
         }]
       })

       const content = response.content[0]
       if (content.type !== 'text') {
         throw new Error('Invalid response from Claude')
       }

       const result = JSON.parse(content.text)
       return result
     } catch (error) {
       console.error('[compressor] Error:', error)
       // Fallback
       return {
         summary: 'Error comprimiendo conversacion',
         entities: {
           travel_intent: { preferences: [] },
           topics_discussed: [],
           key_questions: []
         }
       }
     }
   }
   ```

5. Funcion de generacion de embeddings (copiar de dev-chat-search.ts):
   ```typescript
   let openai: OpenAI | null = null

   function getOpenAIClient(): OpenAI {
     if (!openai) {
       openai = new OpenAI({
         apiKey: process.env.OPENAI_API_KEY!,
       })
     }
     return openai
   }

   export async function generateEmbeddingForSummary(
     summaryText: string
   ): Promise<number[]> {
     try {
       const client = getOpenAIClient()

       const response = await client.embeddings.create({
         model: 'text-embedding-3-large',
         input: summaryText,
         dimensions: 1024, // Matryoshka Tier 1
         encoding_format: 'float',
       })

       return response.data[0].embedding
     } catch (error) {
       console.error('[compressor] Embedding error:', error)
       // Dummy fallback
       return Array(1024).fill(0.1)
     }
   }
   ```

CODIGO ESPERADO:
- ~150 lineas total
- Imports: Anthropic, OpenAI
- 2 lazy init functions
- 2 export functions principales
- Error handling en ambas funciones

TEST:
- Unit test: 10 mensajes mock → verificar summary + entities
- Unit test: Embedding generado → verificar length === 1024
- Performance: <500ms
- Error handling: Claude API failure

SIGUIENTE: Prompt 2.2 para Tests Unitarios
```

---

### Prompt 2.2: Tests Unitarios Compression Service

```
@backend-developer

TAREA: Crear test suite completo para conversation-compressor.ts

CONTEXTO:
- Archivo a testear: `src/lib/conversation-compressor.ts`
- Base de referencia: `src/lib/__tests__/staff-chat-engine.test.ts` para estructura de tests
- Objetivo: Validar compresion, embeddings, y manejo de errores

ESPECIFICACIONES:

1. Crear archivo: `src/lib/__tests__/conversation-compressor.test.ts`

2. Setup de mocks:
   ```typescript
   import { describe, test, expect, jest } from '@jest/globals'
   import { compressConversationSegment, generateEmbeddingForSummary } from '../conversation-compressor'

   const mockMessages = [
     { role: 'user', content: 'Hola, busco apartamento para 4 personas' },
     { role: 'assistant', content: 'Claro! Tenemos opciones con cocina completa...' },
     // ... 8 mensajes mas para total de 10
   ]
   ```

3. Tests de compresion:
   ```typescript
   describe('compressConversationSegment', () => {
     test('genera resumen de ~200 palabras', async () => {
       const result = await compressConversationSegment(mockMessages, 'session-123')

       expect(result.summary).toBeDefined()
       const wordCount = result.summary.split(' ').length
       expect(wordCount).toBeGreaterThan(100)
       expect(wordCount).toBeLessThan(300)
     })

     test('extrae travel_intent correctamente', async () => {
       const result = await compressConversationSegment(mockMessages, 'session-123')

       expect(result.entities.travel_intent).toBeDefined()
       expect(result.entities.travel_intent.preferences).toBeInstanceOf(Array)
     })

     test('maneja errores de Claude gracefully', async () => {
       // Mock error de API
       jest.spyOn(console, 'error').mockImplementation(() => {})

       const result = await compressConversationSegment([], 'session-456')

       expect(result.summary).toBeDefined() // Fallback
       expect(result.entities).toBeDefined()
     })
   })
   ```

4. Tests de embeddings:
   ```typescript
   describe('generateEmbeddingForSummary', () => {
     test('genera embedding de 1024 dimensiones', async () => {
       const embedding = await generateEmbeddingForSummary('test summary text')

       expect(embedding).toBeInstanceOf(Array)
       expect(embedding.length).toBe(1024)
     })

     test('retorna dummy embedding en error', async () => {
       // Mock error de OpenAI
       const embedding = await generateEmbeddingForSummary('')

       expect(embedding.length).toBe(1024)
       expect(embedding.every(v => v === 0.1)).toBe(true) // Dummy
     })
   })
   ```

5. Performance test:
   ```typescript
   describe('performance', () => {
     test('compresion completa en <500ms', async () => {
       const start = Date.now()
       await compressConversationSegment(mockMessages, 'session-789')
       const duration = Date.now() - start

       expect(duration).toBeLessThan(500)
     })
   })
   ```

TEST:
- Ejecutar: `npm test conversation-compressor`
- Verificar: Todos los tests pasan
- Coverage: >80% lineas cubiertas

SIGUIENTE: Prompt 3.1 para Auto-compression en dev-chat
```

---

## FASE 3: Auto-compression Trigger (2-3h)

### Prompt 3.1: Modificar dev-chat-session.ts

```
@backend-developer

TAREA: Agregar logica de auto-compresion en updateDevSession que se activa al llegar a 20 mensajes

CONTEXTO:
- Archivo a modificar: `src/lib/dev-chat-session.ts` (lineas 172-214)
- Funcion existente: `updateDevSession(sessionId, userMessage, assistantResponse)`
- Objetivo: Comprimir primeros 10 mensajes cuando llegue a 20 total

ARCHIVOS:
- Leer: `src/lib/dev-chat-session.ts` (lineas 172-214) - Funcion actual
- Modificar: Misma funcion agregando compresion automatica
- Usar: `src/lib/conversation-compressor.ts` (compressConversationSegment, generateEmbeddingForSummary)

ESPECIFICACIONES:

1. Importar funciones de compresion:
   ```typescript
   import {
     compressConversationSegment,
     generateEmbeddingForSummary
   } from './conversation-compressor'
   ```

2. Modificar updateDevSession (lineas 172-214):
   ```typescript
   export async function updateDevSession(
     sessionId: string,
     userMessage: string,
     assistantResponse: string
   ): Promise<void> {
     const supabase = createServerClient()

     console.log('[dev-session] Updating session:', sessionId)

     // 1. Get current session
     const { data: session, error: fetchError } = await supabase
       .from('prospective_sessions')
       .select('conversation_history, tenant_id')
       .eq('session_id', sessionId)
       .single()

     if (fetchError || !session) {
       console.error('[dev-session] Error fetching session:', fetchError)
       return
     }

     // 2. Build new history
     const history = session.conversation_history || []
     history.push(
       { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
       { role: 'assistant', content: assistantResponse, timestamp: new Date().toISOString() }
     )

     // 3. CHECK: Llegamos al limite de compresion?
     if (history.length >= 20) {
       console.log('[compression] Triggering auto-compression...')

       try {
         // 4. Comprimir primeros 10 mensajes
         const toCompress = history.slice(0, 10)
         const toKeep = history.slice(10)

         console.log('[compression] Compressing messages 1-10...')

         // 5. Generar resumen + embedding
         const compressed = await compressConversationSegment(toCompress, sessionId)
         const embedding = await generateEmbeddingForSummary(compressed.summary)

         // 6. Guardar en conversation_memory
         const { error: insertError } = await supabase
           .from('conversation_memory')
           .insert({
             session_id: sessionId,
             tenant_id: session.tenant_id,
             summary_text: compressed.summary,
             message_range: `messages 1-10`,
             message_count: 10,
             embedding_fast: embedding,
             key_entities: compressed.entities
           })

         if (insertError) {
           console.error('[compression] Error saving:', insertError)
           // Fallback: no comprimir, mantener todos los mensajes
           await supabase
             .from('prospective_sessions')
             .update({
               conversation_history: history.slice(-20),
               last_activity_at: new Date().toISOString()
             })
             .eq('session_id', sessionId)
           return
         }

         // 7. Actualizar session con historial reducido
         const { error: updateError } = await supabase
           .from('prospective_sessions')
           .update({
             conversation_history: toKeep, // Solo ultimos 10-12 mensajes
             last_activity_at: new Date().toISOString()
           })
           .eq('session_id', sessionId)

         if (updateError) {
           console.error('[compression] Error updating session:', updateError)
         }

         console.log('[compression] ✅ Compressed 10 messages successfully')
       } catch (error) {
         console.error('[compression] Fatal error:', error)
         // Fallback: mantener ultimos 20 sin comprimir
         await supabase
           .from('prospective_sessions')
           .update({
             conversation_history: history.slice(-20),
             last_activity_at: new Date().toISOString()
           })
           .eq('session_id', sessionId)
       }
     } else {
       // Normal update (no compression needed)
       const { error: updateError } = await supabase
         .from('prospective_sessions')
         .update({
           conversation_history: history.slice(-20), // Keep last 20
           last_activity_at: new Date().toISOString()
         })
         .eq('session_id', sessionId)

       if (updateError) {
         console.error('[dev-session] Error updating session:', updateError)
       }
     }
   }
   ```

CODIGO ESPERADO:
- Modificar funcion existente (lineas 172-214 → ~250 lineas)
- Agregar imports de conversation-compressor
- Logica de compresion dentro de if (history.length >= 20)
- Error handling robusto con fallbacks

TEST:
- Unit test: 18 mensajes → no comprime
- Unit test: 20 mensajes → comprime primeros 10
- Integration test: Verificar insercion en conversation_memory
- E2E test: Conversacion de 30 mensajes

SIGUIENTE: Prompt 3.2 para public-chat-session.ts
```

---

### Prompt 3.2: Modificar public-chat-session.ts

```
@backend-developer

TAREA: Agregar misma logica de auto-compresion en updatePublicSession (mantener consistencia con dev-chat)

CONTEXTO:
- Archivo a modificar: `src/lib/public-chat-session.ts` (lineas 166-228)
- Referencia: `src/lib/dev-chat-session.ts` (implementacion ya hecha en Prompt 3.1)
- Objetivo: Aplicar mismo flujo de compresion

ARCHIVOS:
- Leer: `src/lib/dev-chat-session.ts` (lineas 172-250) - Implementacion de referencia
- Modificar: `src/lib/public-chat-session.ts` (lineas 166-228)
- Copiar logica de compresion 1:1

ESPECIFICACIONES:

1. Importar funciones:
   ```typescript
   import {
     compressConversationSegment,
     generateEmbeddingForSummary
   } from './conversation-compressor'
   ```

2. Modificar updatePublicSession:
   - Copiar EXACTAMENTE la logica de updateDevSession
   - Cambiar logs de '[dev-session]' a '[public-session]'
   - Mantener toda la logica de compresion igual
   - Mantener mismo error handling

3. Diferencias a respetar:
   - Nombre de funcion: `updatePublicSession` (no cambiar)
   - Logs: Usar prefijo '[public-session]' y '[compression]'
   - NADA MAS (el resto es identico)

TEST:
- Unit test: 20 mensajes → comprime
- Integration test: Verificar insercion en conversation_memory
- Comparar con dev-chat: Mismo comportamiento

SIGUIENTE: Prompt 3.3 para Tests E2E
```

---

### Prompt 3.3: Tests E2E Auto-compression

```
@backend-developer

TAREA: Crear tests end-to-end para validar compresion automatica en conversaciones largas

CONTEXTO:
- Implementacion: `src/lib/dev-chat-session.ts` + `src/lib/public-chat-session.ts`
- Objetivo: Validar que 20 mensajes trigger compresion, 30 mensajes → 2 compresiones

ESPECIFICACIONES:

1. Crear archivo: `e2e/conversation-memory.spec.ts`

2. Setup test helpers:
   ```typescript
   import { test, expect } from '@playwright/test'

   async function createTestSession() {
     // Helper para crear sesion de prueba
   }

   async function sendMessage(sessionId: string, message: string) {
     // Helper para enviar mensaje
   }

   async function getConversationMemories(sessionId: string) {
     // Helper para obtener resumenes guardados
   }
   ```

3. Test cases:
   ```typescript
   test.describe('auto-compression', () => {
     test('no comprime con 18 mensajes', async ({ page }) => {
       const sessionId = await createTestSession()

       // Enviar 18 mensajes (9 intercambios)
       for (let i = 0; i < 18; i += 2) {
         await sendMessage(sessionId, `mensaje ${i}`)
       }

       const memories = await getConversationMemories(sessionId)
       expect(memories.length).toBe(0) // No compression yet
     })

     test('comprime primeros 10 al llegar a 20', async ({ page }) => {
       const sessionId = await createTestSession()

       // Enviar 20 mensajes
       for (let i = 0; i < 20; i += 2) {
         await sendMessage(sessionId, `mensaje ${i}`)
       }

       const memories = await getConversationMemories(sessionId)
       expect(memories.length).toBe(1)
       expect(memories[0].message_count).toBe(10)
       expect(memories[0].message_range).toBe('messages 1-10')
     })

     test('30 mensajes genera 2 compresiones', async ({ page }) => {
       const sessionId = await createTestSession()

       for (let i = 0; i < 30; i += 2) {
         await sendMessage(sessionId, `mensaje ${i}`)
       }

       const memories = await getConversationMemories(sessionId)
       expect(memories.length).toBe(2)
     })
   })
   ```

TEST:
- Ejecutar: `npx playwright test conversation-memory`
- Verificar: Todos los tests pasan

SIGUIENTE: Prompt 4.1 para Search Integration
```

---

## FASE 4: Search Integration (3-4h)

### Prompt 4.1: Crear conversation-memory-search.ts

```
@backend-developer

TAREA: Crear servicio de busqueda semantica que encuentra resumenes relevantes de conversaciones pasadas

CONTEXTO:
- Proyecto: Conversation Memory System
- Base de referencia: `src/lib/dev-chat-search.ts` (lineas 60-93) para patron de busqueda
- Objetivo: Buscar en conversation_memory usando RPC match_conversation_memory

ESPECIFICACIONES:

1. Crear archivo: `src/lib/conversation-memory-search.ts`

2. Interface de resultado:
   ```typescript
   export interface ConversationMemoryResult {
     id: string
     summary_text: string
     key_entities: any
     message_range: string
     similarity: number
   }
   ```

3. Funcion principal de busqueda:
   ```typescript
   import { createServerClient } from '@/lib/supabase'
   import { generateEmbeddingForSummary } from './conversation-compressor'

   export async function searchConversationMemory(
     query: string,
     sessionId: string
   ): Promise<ConversationMemoryResult[]> {
     console.log('[memory-search] Searching for:', query.substring(0, 50))

     try {
       const supabase = createServerClient()

       // 1. Generar embedding del query
       const queryEmbedding = await generateEmbeddingForSummary(query)

       // 2. Buscar resumenes relevantes usando RPC
       const { data, error } = await supabase.rpc('match_conversation_memory', {
         query_embedding: queryEmbedding,
         p_session_id: sessionId,
         match_threshold: 0.3,
         match_count: 2 // Top 2 resumenes mas relevantes
       })

       if (error) {
         console.warn('[memory-search] RPC error:', error)
         return []
       }

       if (!data || data.length === 0) {
         console.log('[memory-search] No memories found')
         return []
       }

       console.log(`[memory-search] Found ${data.length} relevant memories`)
       return data as ConversationMemoryResult[]

     } catch (error) {
       console.error('[memory-search] Error:', error)
       return []
     }
   }
   ```

CODIGO ESPERADO:
- ~60-80 lineas
- 1 interface exportada
- 1 funcion principal exportada
- Error handling con retorno []
- Logs informativos

TEST:
- Unit test: Sesion sin resumenes → []
- Unit test: Sesion con 1 resumen → 1 resultado si similarity >0.3
- Unit test: Sesion con 3 resumenes → top 2
- Performance: <100ms

SIGUIENTE: Prompt 4.2 para dev-chat-engine.ts
```

---

### Prompt 4.2: Modificar dev-chat-engine.ts

```
@backend-developer

TAREA: Integrar busqueda de contexto historico en generacion de respuestas de dev-chat

CONTEXTO:
- Archivo a modificar: `src/lib/dev-chat-engine.ts`
- Funcion a modificar: `buildMarketingSystemPrompt` (linea 160)
- Funcion a modificar: `generateDevChatResponse` (linea 71)
- Objetivo: Inyectar resumenes de conversaciones pasadas en system prompt

ARCHIVOS:
- Leer: `src/lib/dev-chat-engine.ts` (lineas 71-151, 160-213)
- Modificar: Funcion buildMarketingSystemPrompt + generateDevChatResponse
- Usar: `src/lib/conversation-memory-search.ts` (searchConversationMemory)

ESPECIFICACIONES:

1. Importar busqueda:
   ```typescript
   import { searchConversationMemory, type ConversationMemoryResult } from './conversation-memory-search'
   ```

2. Modificar firma de buildMarketingSystemPrompt (linea 160):
   ```typescript
   function buildMarketingSystemPrompt(
     session: DevSession,
     searchResults: VectorSearchResult[],
     conversationMemories: ConversationMemoryResult[] // NUEVO parametro
   ): string {
     // ... codigo existente de searchContext ...

     // AGREGAR contexto historico
     const historicalContext = conversationMemories.length > 0
       ? `
CONTEXTO DE CONVERSACIONES PASADAS:
${conversationMemories.map(m => `
Resumen: ${m.summary_text}
Intencion de viaje: ${JSON.stringify(m.key_entities.travel_intent || {})}
Temas discutidos: ${m.key_entities.topics_discussed?.join(', ') || 'N/A'}
Preguntas clave: ${m.key_entities.key_questions?.join(', ') || 'N/A'}
(${m.message_range})
`).join('\n---\n')}

`
       : ''

     // MODIFICAR return para incluir historicalContext
     return `Eres un asistente virtual de ventas para un hotel en San Andres, Colombia...

${historicalContext}

RESULTADOS DE BUSQUEDA:
${searchContext}

Responde considerando el contexto historico de la conversacion para personalizar mejor tu respuesta.`
   }
   ```

3. Modificar generateDevChatResponse (linea 71):
   ```typescript
   export async function generateDevChatResponse(
     message: string,
     sessionId: string | undefined,
     tenantId: string
   ): Promise<DevChatResponse> {
     // ... codigo existente hasta STEP 2 ...

     // STEP 2.5: NUEVO - Buscar contexto historico
     const memoryStartTime = Date.now()
     const conversationMemories = await searchConversationMemory(message, session.session_id)
     const memoryTime = Date.now() - memoryStartTime
     console.log(`[dev-chat-engine] Memory search: ${conversationMemories.length} results in ${memoryTime}ms`)

     // STEP 3: Build system prompt (MODIFICAR llamada)
     const promptStartTime = Date.now()
     const systemPrompt = buildMarketingSystemPrompt(
       session,
       searchResults,
       conversationMemories // NUEVO parametro
     )
     // ... resto del codigo sin cambios ...
   }
   ```

CODIGO ESPERADO:
- Modificar 2 funciones existentes
- Agregar ~30 lineas de codigo
- Mantener toda la logica existente
- Solo AGREGAR contexto historico

TEST:
- Integration test: Respuesta con memoria usa contexto historico
- E2E test: Conversacion larga, mensaje 25 menciona contexto de mensaje 5

SIGUIENTE: Prompt 4.3 para public-chat-engine.ts
```

---

### Prompt 4.3: Modificar public-chat-engine.ts

```
@backend-developer

TAREA: Aplicar misma integracion de contexto historico en public-chat

CONTEXTO:
- Archivo a modificar: `src/lib/public-chat-engine.ts`
- Referencia: `src/lib/dev-chat-engine.ts` (implementacion de Prompt 4.2)
- Objetivo: Mismo flujo pero respetando diferencias de public-chat

ARCHIVOS:
- Leer: `src/lib/dev-chat-engine.ts` (modificaciones de Prompt 4.2)
- Modificar: `src/lib/public-chat-engine.ts` (funcion buildSystemPrompt linea 215, generatePublicChatResponse)

ESPECIFICACIONES:

1. Importar:
   ```typescript
   import { searchConversationMemory, type ConversationMemoryResult } from './conversation-memory-search'
   ```

2. Modificar buildSystemPrompt (diferente nombre que dev-chat):
   - Agregar parametro conversationMemories
   - Inyectar historicalContext igual que dev-chat
   - Respetar estructura existente de public-chat

3. Modificar generatePublicChatResponse:
   - Buscar memories antes de system prompt
   - Pasar memories a buildSystemPrompt

NOTA: public-chat puede tener diferentes nombres de funciones. Adaptar segun estructura real.

TEST:
- Integration test: Mismo que dev-chat
- Verificar consistencia entre dev-chat y public-chat

SIGUIENTE: Prompt 4.4 para Tests de busqueda
```

---

### Prompt 4.4: Tests Busqueda Semantica

```
@backend-developer

TAREA: Crear test suite para conversation-memory-search.ts

CONTEXTO:
- Archivo a testear: `src/lib/conversation-memory-search.ts`
- Objetivo: Validar busqueda semantica, threshold, performance

ESPECIFICACIONES:

1. Crear archivo: `src/lib/__tests__/conversation-memory-search.test.ts`

2. Tests principales:
   ```typescript
   describe('searchConversationMemory', () => {
     test('retorna [] si sesion no tiene resumenes', async () => {
       const results = await searchConversationMemory('playa', 'new-session-123')
       expect(results).toEqual([])
     })

     test('retorna resultados con similarity >0.3', async () => {
       // Setup: crear sesion con resumen en DB
       const sessionId = await createTestSessionWithMemory()

       const results = await searchConversationMemory('playa hermosa', sessionId)

       expect(results.length).toBeGreaterThan(0)
       expect(results.every(r => r.similarity > 0.3)).toBe(true)
     })

     test('retorna maximo 2 resultados', async () => {
       // Setup: sesion con 5 resumenes
       const sessionId = await createSessionWith5Memories()

       const results = await searchConversationMemory('hotel', sessionId)

       expect(results.length).toBeLessThanOrEqual(2)
     })

     test('similaridad promedio >0.5 para queries relevantes', async () => {
       const sessionId = await createTestSessionWithMemory()

       const results = await searchConversationMemory('apartamento playa', sessionId)

       if (results.length > 0) {
         const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length
         expect(avgSimilarity).toBeGreaterThan(0.5)
       }
     })

     test('performance <100ms', async () => {
       const sessionId = await createTestSessionWithMemory()

       const start = Date.now()
       await searchConversationMemory('test query', sessionId)
       const duration = Date.now() - start

       expect(duration).toBeLessThan(100)
     })
   })
   ```

TEST:
- Ejecutar: `npm test conversation-memory-search`
- Coverage: >90%

SIGUIENTE: Prompt 5.1 para Performance Benchmarks
```

---

## FASE 5: Testing & Validation (2-3h)

### Prompt 5.1: Performance Benchmarks

```
@backend-developer

TAREA: Ejecutar benchmarks de performance y documentar resultados

CONTEXTO:
- Sistema completo implementado
- Objetivo: Validar <500ms compresion, <100ms busqueda, calidad resumenes

ESPECIFICACIONES:

1. Benchmark de compresion:
   - Comprimir 10 mensajes reales 100 veces
   - Calcular tiempo promedio, min, max
   - Target: <500ms promedio

2. Benchmark de busqueda:
   - Buscar en sesion con 5 resumenes, 100 queries
   - Calcular tiempo promedio
   - Target: <100ms promedio

3. Benchmark de calidad:
   - Comprimir 10 conversaciones reales
   - Verificar manualmente:
     - Resumenes coherentes (si/no)
     - Entities extraidas correctamente (precision %)
     - Travel intent preservado (si/no)

4. Documentar en:
   - Archivo: `docs/conversation-memory/fase-5/PERFORMANCE.md`
   - Incluir: Resultados, graficos, conclusiones

TEST:
- Ejecutar benchmarks
- Documentar resultados
- Verificar que cumple targets

SIGUIENTE: Prompt 5.2 para E2E conversaciones largas
```

---

### Prompt 5.2: Validacion Final

```
@backend-developer

TAREA: Validar todos los criterios de exito del plan.md

CONTEXTO:
- Sistema completo implementado
- Objetivo: Checklist final antes de produccion

ESPECIFICACIONES:

Validar estos criterios (de plan.md):

**Funcionalidad:**
- [ ] Sistema comprime automaticamente cada 10 mensajes al llegar a 20
- [ ] Resumenes contienen travel_intent, topics, questions
- [ ] Busqueda retorna resultados con similarity >0.3
- [ ] Contexto historico en system prompt
- [ ] Funciona en dev-chat y public-chat
- [ ] Conversaciones 30+ mensajes mantienen contexto

**Performance:**
- [ ] Compresion <500ms promedio
- [ ] Busqueda <100ms promedio
- [ ] Sin impacto en tiempo de respuesta
- [ ] Embeddings 1024d correctos

**Costo:**
- [ ] $0.001 por compresion (Claude Haiku)
- [ ] ~$0.33/mes para 100 sesiones

**Calidad:**
- [ ] Resumenes coherentes (manual)
- [ ] Entities >90% precision
- [ ] Similarity promedio >0.5

**Seguridad:**
- [ ] RLS policies correctas
- [ ] Multi-tenant isolation
- [ ] No expone otras sesiones

Documentar en: `docs/conversation-memory/fase-5/VALIDATION.md`

TEST:
- Completar checklist
- Documentar resultados
- Aprobar para produccion

FIN DEL PROYECTO ✅
```

---

**Ultima actualizacion:** 3 de Octubre, 2025
