---
title: "InnPilot Project SNAPSHOT - Guest Portal Multi-Conversation"
description: "Estado actual del proyecto InnPilot - Octubre 2025. Desarrollo de Guest Portal multi-conversation con módulo de compliance integrado."
category: architecture-snapshot
status: FASE_0_PLANNING_COMPLETE
version: "2.0-GUEST-PORTAL"
last_updated: "2025-10-05"
tags: [guest_portal, multi_conversation, compliance_module, subdomain_architecture, sire_tra]
keywords: ["multi_conversation", "compliance", "sire", "tra", "subdomain", "puppeteer", "entity_extraction"]
---

# 🏗️ InnPilot Project SNAPSHOT - Guest Portal Multi-Conversation + Compliance

**Última actualización**: 5 Octubre 2025
**Estado**: FASE 0 Planning Complete → FASE 1 Ready (Subdomain Infrastructure)
**Agente Principal**: @backend-developer (60%), @ux-interface (30%), @database-agent (5%), @api-endpoints-mapper (5%)

---

## 📋 PROYECTO ACTUAL: Guest Portal Multi-Conversation + Compliance Module

### Objetivo General
Transformar el Guest Chat actual (single-conversation) en una experiencia revolucionaria multi-conversation estilo Claude AI / ChatGPT con módulo de compliance integrado (SIRE + TRA) conversacional.

### Timeline
**Duración total**: 36-45 horas (7 fases)
**Inicio**: 5 Octubre 2025
**Estado actual**: FASE 0 Planning Complete ✅

### Archivos de Planificación
- 📄 **plan.md** (1047 líneas) - Arquitectura completa, 7 fases
- 📋 **TODO.md** (680 líneas, 57 tareas) - Breakdown detallado por fase
- 🎯 **guest-portal-compliance-workflow.md** (1120 líneas, 15 prompts) - Prompts ejecutables

### Componentes Principales

#### 1. Subdomain Architecture (FASE 1)
- DNS Wildcard: `*.innpilot.io` → VPS 195.200.6.216
- SSL: Let's Encrypt wildcard certificate
- Nginx: Subdomain routing + `X-Tenant-Subdomain` header
- Next.js: Middleware detection + cookie persistence
- **Ejemplo**: `simmerdown.innpilot.io` → tenant_id resolution

#### 2. Multi-Conversation Foundation (FASE 2)
- Database: `guest_conversations` table (similar a `staff_conversations`)
- Backend APIs: POST/GET/PUT/DELETE `/api/guest/conversations`
- Frontend: Sidebar component (copiar de Staff Chat)
- Features mantenidos: Entity tracking ✅, Follow-up suggestions ✅

#### 2.5. Multi-Modal File Upload (FASE 2.5) - NEW
- **Subida de fotos + documentos**: Claude Vision API integration
- **Location Recognition PoC**: "¿Cómo llego a la playa desde aquí?" (Simmerdown)
- **Passport OCR**: Auto-fill compliance desde foto de pasaporte
- **Supabase Storage**: Bucket `guest-attachments` con RLS
- **Database**: `conversation_attachments` table

#### 2.6. Conversation Intelligence (FASE 2.6) - NEW
- **Compactación automática**: Umbral 20 mensajes → comprimir bloque
- **Favoritos**: Capturar sitios de interés en metadata
- **Sugerencias inteligentes**: 2+ menciones tema → sugerir nueva conversación
- **Auto-archiving**: 30 días → archived, 90 días → deleted
- **Memory Management**: `guest-conversation-memory.ts`

#### 3. Compliance Module (FASE 3)
- **SIRE**: Puppeteer automation (no API disponible)
- **TRA**: REST API (`https://pms.mincit.gov.co/token/`)
- Entity extraction: Pasaporte, país, fecha nacimiento, propósito viaje
- State machine: normal → compliance_active → compliance_confirm → compliance_processing → success/failed
- Pre-submit confirmation: Evitar errores en submission

#### 4. Staff Notifications (FASE 4)
- Email alerts para compliance submissions
- Dashboard compliance tab
- Status tracking (pending, processing, success, failed)

#### 5. Testing & Performance (FASE 5)
- E2E test suite completo
- Performance benchmarks: Entity extraction <200ms, SIRE <30s, TRA <10s
- No regressions en Guest Chat existente

#### 6. SEO + Analytics (FASE 6)
- Metadata optimization
- Structured data JSON-LD
- Plausible analytics integration

#### 7. Documentation & Deployment (FASE 7)
- README updates
- API documentation
- Deployment guides
- Training materials

### Stack Técnico

**Frontend:**
- React 19 + TypeScript
- Next.js 15.5.3 (App Router)
- Tailwind CSS 4
- lucide-react icons

**Backend:**
- Node.js 20.x
- Supabase PostgreSQL + pgvector
- Anthropic Claude (conversational AI)
- OpenAI text-embedding-3-large (Matryoshka Tier 1+2)

**Compliance:**
- Puppeteer (SIRE automation)
- REST API (TRA MinCIT)
- Entity extraction (regex + NER)
- Validation strict (passport format, age, required fields)

**Infrastructure:**
- VPS Hostinger (195.200.6.216)
- Nginx (subdomain routing)
- Let's Encrypt SSL (wildcard)
- PM2 cluster mode

### Decisiones Críticas

**✅ APROBADAS:**
1. Matryoshka embeddings: Dejar TODO as-is (Guest Chat Tier 1+2, Staff Chat Tier 2, Mobile Dev Tier 1)
2. Compliance: NO mandatory (recordatorio suave, opcional)
3. SIRE + TRA: Capturar simultáneamente en un solo flujo
4. UI: Single chat conversacional (NO formularios standalone)
5. Subdominios: Implementar early (FASE 1)
6. Staff notifications: Sí, claramente necesarias

**❌ RECHAZADAS:**
1. Compliance como requisito obligatorio
2. Flujos separados para SIRE y TRA
3. Formularios standalone (debe ser conversacional)
4. Cambiar configuración Matryoshka existente

### Agentes y Responsabilidades

#### @backend-developer (60% - Principal)
- FASE 1: Nginx routing, middleware subdomain detection
- FASE 2: APIs CRUD conversations
- FASE 3: Compliance engine, SIRE Puppeteer, TRA API, intent detection
- FASE 4: Staff notifications
- FASE 5: Testing & benchmarks

#### @ux-interface (30% - Principal UI)
- FASE 2: ConversationList component, GuestChatInterface refactor
- FASE 3: Compliance UI components
- FASE 6: SEO + Analytics

#### @database-agent (5% - Soporte)
- FASE 2: Migrations (guest_conversations, compliance_submissions, tenant_compliance_credentials)

#### @api-endpoints-mapper (5% - Soporte)
- FASE 3: TRA API investigation (si necesario)

---

## 🔧 TRABAJO REALIZADO - FASE 0 Planning (5 Oct 2025)

### Duración: ~2 horas
### Commits: 3 archivos creados + 4 agent configs actualizados

#### ✅ Archivos Creados

**1. plan.md** (1570 líneas)
- Secciones: Overview, estado actual vs deseado, 7 fases detalladas
- Arquitectura: Subdomain, multi-conversation, compliance, multi-modal, conversation intelligence
- Timeline: 36-45 horas total
- Tech stack: Next.js 15, Supabase, Anthropic, Puppeteer, Claude Vision API
- Success criteria por fase
- **NEW**: FASE 2.5 (Multi-Modal), FASE 2.6 (Conversation Intelligence)

**2. TODO.md** (750 líneas, 72 tareas)
- Organización: FASE 0-7
- Formato por tarea: Checkbox, descripción, estimate, archivos, agente, testing
- Tracking: 1/72 completadas (1%)
- Distribución: Backend 60%, UX 30%, DB 5%, API mapper 5%
- **NEW**: 15 tareas agregadas (2.5.1-2.5.8, 2.6.1-2.6.8)

**3. guest-portal-compliance-workflow.md** (1310 líneas, 17 prompts)
- Estructura: Contexto general + 17 prompts copy-paste ready
- Organización: Por fase (1.1-1.3, 2.1-2.6, 3.1-3.4, 4.1-4.2, etc.)
- Contenido: Especificaciones técnicas completas, código esperado, testing steps
- Uso: Copy-paste directo en nuevas conversaciones para cada fase
- **NEW**: Prompts 2.5 (Multi-Modal) y 2.6 (Conversation Intelligence)
- **FIX CRÍTICO**: Formato `@agent` FUERA de code blocks en TODOS los prompts

**4. Agent Configurations Updated**
- `.claude/agents/backend-developer.md` - Added "PROYECTO ACTUAL" section (250 líneas nuevas)
  - **NEW**: FASE 2.5 (Claude Vision API, Supabase Storage, OCR)
  - **NEW**: FASE 2.6 (Conversation memory, favoritos, cron jobs)
- `.claude/agents/ux-interface.md` - Added "PROYECTO ACTUAL" section (270 líneas nuevas)
  - **NEW**: FASE 2.5 (File upload UI, image preview modal)
  - **NEW**: FASE 2.6 (Topic suggestions banner, Favorites sidebar)
- `.claude/agents/database-agent.md` - Added "PROYECTO ACTUAL" section (140 líneas nuevas)
  - **NEW**: FASE 2.5 migration (conversation_attachments table)
- `.claude/agents/api-endpoints-mapper.md` - Added "PROYECTO ACTUAL" section (30 líneas nuevas)

#### Decisiones Técnicas Tomadas

**Subdomain Architecture:**
- Pattern: `{tenant}.innpilot.io` (e.g., `simmerdown.innpilot.io`)
- DNS: Wildcard A record `*.innpilot.io`
- SSL: Let's Encrypt wildcard certificate
- Nginx: Extract subdomain, pass via `X-Tenant-Subdomain` header
- Next.js: Middleware detects subdomain, sets cookie, resolves tenant_id

**Multi-Conversation Database:**
```sql
guest_conversations (
  id UUID,
  guest_id UUID FK guest_reservations,
  tenant_id UUID FK tenant_registry,
  title VARCHAR(255),
  last_message TEXT,
  created_at, updated_at
)
```

**Compliance Database:**
```sql
compliance_submissions (
  id UUID,
  guest_id UUID,
  tenant_id UUID,
  type VARCHAR(20) CHECK IN ('sire', 'tra', 'both'),
  status VARCHAR(20) CHECK IN ('pending', 'processing', 'success', 'failed'),
  data JSONB,  -- {pasaporte, país, fecha_nacimiento, propósito}
  sire_response JSONB,
  tra_response JSONB,
  error_message TEXT
)

tenant_compliance_credentials (
  tenant_id UUID UNIQUE,
  sire_username VARCHAR(255),
  sire_password_encrypted TEXT,
  tra_rnt_token VARCHAR(255)
)

conversation_attachments (  -- NEW - FASE 2.5
  id UUID,
  conversation_id UUID FK guest_conversations,
  file_type VARCHAR(50) CHECK IN ('image', 'document', 'pdf'),
  file_url TEXT,
  file_size_bytes INTEGER,
  ocr_text TEXT,  -- Passport OCR data
  vision_analysis JSONB  -- Claude Vision API response
)
```

**Compliance Entity Extraction:**
- Pasaporte: Regex `[A-Z]{2}[0-9]{6,9}`
- País: NER + keyword matching + validation lista oficial
- Fecha nacimiento: Date parsing (DD/MM/YYYY, DD-MM-YYYY)
- Propósito viaje: Enum matching ['turismo', 'negocios', 'estudio', 'familiar', 'otro']
- Confidence threshold: >0.7 para auto-fill

---

## 🔧 TRABAJO REALIZADO - Sesión 3 Oct 2025 (PROYECTO ANTERIOR)

### FASE 0: Session Management & Bug Fixes ✅ COMPLETADO

**Duración**: ~4 horas
**Commits**: 12+ commits (ver lista abajo)
**Objetivo**: Resolver bugs críticos de persistencia de sesión antes de iniciar FASE 1

#### Bugs Críticos Solucionados

##### 1. 🚨 CRÍTICO: Streaming API No Persistía Sesiones
**Problema**: Cada mensaje creaba una nueva sesión, sin memoria conversacional
**Root Cause**: `/api/dev/chat/route.ts` streaming path no configuraba cookie `Set-Cookie`
**Impacto**: Conversación sin contexto, experiencia rota

**Solución** (`src/app/api/dev/chat/route.ts:177-240`):
```typescript
// ANTES (broken):
if (wantsStream) {
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
    // ❌ NO Set-Cookie header
  })
}

// DESPUÉS (fixed):
if (wantsStream) {
  // Get or create session BEFORE streaming
  const { getOrCreateDevSession } = await import('@/lib/dev-chat-session')
  const session = await getOrCreateDevSession(effectiveSessionId, tenant_id)
  const sessionId = session.session_id

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generateDevChatResponseStream(...)) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
      }
      // ✅ Send session_id in 'done' event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'done',
        session_id: sessionId
      })}\n\n`))
    }
  })

  // ✅ Add Set-Cookie header to streaming response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Set-Cookie': `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7*24*60*60}`
    }
  })
}
```

**Resultado**: ✅ Session cookie ahora se crea en primer mensaje y persiste

##### 2. Reset Functionality Sin Implementar
**Problema**: HttpOnly cookies no se pueden eliminar desde JavaScript
**User Feedback**: "Cuando hago clic en reset, el Session ID permanece igual siempre"

**Solución**: Crear endpoints backend para expirar cookies

**Archivos Creados**:
- `src/app/api/dev/reset-session/route.ts` (NEW)
- `src/app/api/public/reset-session/route.ts` (NEW)

```typescript
export async function POST() {
  const response = NextResponse.json({ success: true })

  // Expire cookie with Max-Age=0
  const cookieOptions = [
    'session_id=',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=0'  // ← Expires immediately
  ]

  response.headers.set('Set-Cookie', cookieOptions.join('; '))
  return response
}
```

**Componentes Actualizados**:
- `src/components/Dev/DevChatMobileDev.tsx` - Reset button + API call
- `src/components/Dev/DevChatInterface.tsx` - Reset button + API call
- `src/components/Public/PublicChatInterface.tsx` - Reset button + API call

```typescript
const handleNewConversation = async () => {
  // Clear localStorage
  localStorage.removeItem('dev_chat_session_id')

  // Call backend to expire HttpOnly cookie
  await fetch('/api/dev/reset-session', { method: 'POST' })

  // Reset React state
  setSessionId(null)
  setMessages([])
  setCurrentIntent({})
}
```

**Resultado**: ✅ Reset button ahora limpia sesión completamente

##### 3. Compression Threshold Demasiado Agresivo
**Problema**: 20 mensajes (10 pares) muy corto, perdía contexto rápido
**User Request**: "Prefiero que sea a los 100 mensajes, 50 es muy poco"

**Archivos Modificados**:
- `src/lib/dev-chat-session.ts:207-217`
- `src/lib/public-chat-session.ts:205-220`

```typescript
// ANTES: >= 20 mensajes → comprimir primeros 10
if (history.length >= 20) {
  const toCompress = history.slice(0, 10)
  const toKeep = history.slice(10)
}

// DESPUÉS: >= 100 mensajes → comprimir primeros 50
if (history.length >= 100) {
  const toCompress = history.slice(0, 50)
  const toKeep = history.slice(50)
}
```

**Resultado**: ✅ Mejor retención de contexto en conversaciones largas

##### 4. DEV Badge Bloqueaba UI Elements
**Problema**: Badge overlay `fixed top-4 right-4` tapaba reset button y título
**User Feedback**: "Se ve detrás del dev mode"

**Solución** (`src/components/Dev/DevChatMobileDev.tsx`):
```typescript
// ANTES: Fixed overlay (bloqueaba UI)
<div className="fixed top-4 left-4 z-50 bg-purple-600 ...">
  DEV MODE
</div>

// DESPUÉS: Integrado en header flex layout
<div className="flex items-center justify-between px-4 gap-2">
  {/* Left: Icon + Title */}
  <div className="flex items-center gap-3 flex-1 min-w-0">
    <Bot />
    <h1 className="truncate">Simmer Down Chat</h1>
  </div>

  {/* Center: Badge */}
  <div className="bg-purple-600/90 px-2.5 py-1 rounded-full flex-shrink-0">
    <p className="text-xs font-bold">🚧 DEV</p>
  </div>

  {/* Right: Reset Button */}
  <button className="flex-shrink-0">
    <RotateCcw />
  </button>
</div>
```

**Resultado**: ✅ Todo visible y accesible, layout limpio

##### 5. API Key Security - Git Push Protection
**Problema**: GitHub secret scanning bloqueó push por keys expuestos
**User Feedback**: "Como así que remover? De pronto se puede hacer workaround"

**Archivos Afectados**:
- `scripts/run-benchmarks.sh` - Hardcoded ANTHROPIC_API_KEY
- `docs/conversation-memory/fase-5/VALIDATION.md` - API key en ejemplo

**Solución**:
```bash
# ANTES: Hardcoded key
ANTHROPIC_API_KEY="sk-ant-api03-..." npm run test

# DESPUÉS: Environment variable
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌ Error: ANTHROPIC_API_KEY not set"
  exit 1
fi

ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" npm run test
```

**Documentación Maskeada**:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-****** (from .env.local)
```

**Resultado**: ✅ Push exitoso sin exponer credenciales

##### 6. TypeScript Build Error - embedding-cache.ts
**Error**: `Type 'string | undefined' not assignable to 'string'`

**Fix** (`src/lib/embedding-cache.ts:91-96`):
```typescript
// ANTES:
const oldestKey = this.cache.keys().next().value
this.cache.delete(oldestKey)

// DESPUÉS:
const oldestKey = this.cache.keys().next().value as string | undefined
if (oldestKey) {
  this.cache.delete(oldestKey)
}
```

**Resultado**: ✅ Build limpio sin errores

#### Arquitectura de Session Management

**Multi-Layer Session Persistence**:
```
┌─────────────────────────────────────┐
│ CLIENT (React State)                │
│ - sessionId: string | null          │
│ - messages: Message[]               │
│ - currentIntent: TravelIntent       │
└──────────────┬──────────────────────┘
               │
               ├─── localStorage (client-side persistence)
               │    - 'dev_chat_session_id'
               │    - Survives page refresh
               │    - Can be cleared by JS
               │
               └─── Cookie (server-side persistence)
                    - session_id (HttpOnly, Secure)
                    - Set by streaming API
                    - Cannot be cleared by JS
                    - Expires via backend API
```

**Reset Flow**:
```
1. User clicks Reset button
   ↓
2. localStorage.removeItem('dev_chat_session_id')
   ↓
3. fetch('/api/dev/reset-session', { method: 'POST' })
   ↓
4. Backend: Set-Cookie with Max-Age=0
   ↓
5. React state: setSessionId(null), setMessages([])
   ↓
6. Next message creates new session
```

#### Commits de Esta Sesión

```bash
# Security & Setup
1. fix: mask API keys in docs and use env vars in scripts
2. chore: update git status with new untracked files

# Compression Optimization
3. feat: increase compression threshold to 100 messages (50 pairs)

# Reset Functionality
4. feat: add reset conversation button to DevChatInterface
5. feat: add reset conversation button to PublicChatInterface
6. feat: add reset conversation button to DevChatMobileDev

# UI Fixes
7. fix: move DEV badge to top-left to avoid blocking reset button
8. fix: integrate DEV badge into header layout (no overlay)

# CRITICAL: Session Persistence
9. fix: add session cookie to streaming API response
10. feat: create reset-session API endpoints for HttpOnly cookie expiration
11. feat: integrate reset-session API into all chat components

# Type Safety
12. fix: add type assertion for Map iterator in embedding-cache.ts
```

#### Lecciones Aprendidas

1. **HttpOnly Cookies**: Requieren backend para expirarse (Max-Age=0)
2. **Streaming Responses**: Headers diferentes a regular HTTP responses
3. **Session Management**: Multi-layer approach (cookie + localStorage + state)
4. **Git Security**: GitHub push protection detecta API keys automáticamente
5. **UI Overlays**: `fixed` position puede bloquear interactive elements
6. **TypeScript Strictness**: Map iterators retornan `| undefined`

#### Estado Post-FASE 0

✅ **Session Persistence**: Working
✅ **Reset Functionality**: Working
✅ **Compression Threshold**: Optimizado (100 mensajes)
✅ **UI Layout**: Clean, sin overlays bloqueantes
✅ **Security**: API keys protegidos
✅ **Build**: Sin errores TypeScript

**Próximo Paso**: Ejecutar FASE 1 (Estructura Base) con confianza en session management

---

## 🔧 TRABAJO RECIENTE: LCP Optimization (5 Oct 2025) ✅ COMPLETADO

### Duración: ~2 horas
### Commits: 2 (implementation + bug fix + documentation)

#### Contexto
**Problema Inicial:**
- Lighthouse Performance: 73/100
- LCP (Largest Contentful Paint): 7.1 segundos
- Causa: ReactMarkdown (50KB bundle) loading eagerly para welcome message
- Ruta afectada: `/chat-mobile-dev` (DevChatMobileDev.tsx)

**Solución Implementada:**
- Opción 3: Static Extraction + Lazy Loading
- Documentación: `/docs/fixed-layout-migration/OPCION-3-STATIC-EXTRACTION.md`

#### Implementación

**Paso 1: Build Script (Pre-existing)**
- Script: `scripts/build-welcome-message.ts`
- Output: `src/lib/welcome-message-static.ts` (670 bytes static HTML)
- Execution: `npm run prebuild` (antes de production build)
- ReactDOMServer.renderToString() → Pre-rendered HTML

**Paso 2: Component Refactor (DevChatMobileDev.tsx)**

Cambios aplicados:

1. **Import added** (line 6):
```typescript
import { WELCOME_MESSAGE_HTML } from '@/lib/welcome-message-static'
```

2. **Welcome message content emptied** (line 108):
```typescript
const welcomeMessage: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '', // Empty - will use static HTML instead
  timestamp: new Date()
}
```

3. **Conditional rendering updated** (lines 391-421):
```typescript
{!message.content && loading && message.id !== 'welcome' ? (
  // Loading dots (only for dynamic messages)
  <div className="flex gap-1">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
) : message.id === 'welcome' ? (
  /* Welcome message: Static HTML (optimal LCP) */
  <div
    className="text-base leading-[1.6]"
    dangerouslySetInnerHTML={{ __html: WELCOME_MESSAGE_HTML }}
  />
) : (
  /* Dynamic messages: Lazy-loaded ReactMarkdown */
  <div className="text-base leading-[1.6]">
    <Suspense fallback={<div className="text-base text-gray-600">{message.content}</div>}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{...}}
      >
        {message.content}
      </ReactMarkdown>
    </Suspense>
  </div>
)}
```

**Paso 3: Production Build**
```bash
npm run prebuild  # Generate static HTML (670 bytes)
npm run build     # Production build
```

#### Resultados

**Performance Metrics:**
- ✅ Lighthouse Performance: **95/100** (from 73/100) - +30% improvement
- ✅ LCP: **<1.5s** (from 7.1s) - 79% reduction
- ✅ FCP: <1.0s
- ✅ TBT: <200ms
- ✅ CLS: <0.1

**Bundle Size Reduction:**
- ReactMarkdown bundle: 50KB → NOT loaded initially
- Welcome message: 670 bytes static HTML
- Lazy loading: Only after user interaction

#### Bug Fix: Welcome Message Loading Dots Glitch

**Problema Detectado:**
- User enviaba primer mensaje → Welcome message temporalmente mostraba loading dots
- Después de streaming completo → Welcome message reaparecía correctamente

**Root Cause:**
- Line 391 condition: `{!message.content && loading ? (`
- Welcome message tiene `content: ''` (empty by design para static extraction)
- Cuando `loading=true`, condition matched welcome message → showed dots

**Fix Aplicado** (DevChatMobileDev.tsx:391):
```typescript
// BEFORE (buggy):
{!message.content && loading ? (

// AFTER (fixed):
{!message.content && loading && message.id !== 'welcome' ? (
```

**User Feedback:** "perfecto. quedó arreglado" ✅

#### Archivos Modificados

1. **src/components/Dev/DevChatMobileDev.tsx**
   - Added import: `WELCOME_MESSAGE_HTML`
   - Changed welcome message content to empty string
   - Updated rendering logic con conditional static HTML
   - Fixed loading dots glitch con exclusion check

2. **docs/fixed-layout-migration/fase-4/REGRESSION_TESTS.md**
   - Added test G5: "Welcome message NO muestra typing dots durante loading"
   - Added "BUG FIXES DURANTE TESTING" section
   - Updated test counts: 120 → 121 tests total
   - Documented complete bug fix workflow

#### Documentación

**Regression Test G5 Added:**
```markdown
- [ ] **G5.** Welcome message NO muestra typing dots durante loading ⚠️ CRITICAL
  - **Cómo:** Enviar primer mensaje "hola", observar welcome message durante respuesta
  - **Esperado:** Welcome message permanece visible (HTML estático), NO se convierte en dots
  - **Actual (ANTES DEL FIX):** Welcome message flickeaba a dots temporalmente
  - **Fix:** Condición `message.id !== 'welcome'` agregada en línea 391
  - **Dispositivos:** Todos
  - **Nota:** Bug introducido por static extraction (welcome.content=''), fix crítico para UX
```

**Bug Fix Documentation:**
- Symptom: Welcome message flicker durante streaming
- Root cause: Conditional rendering matched empty content
- Sequence: User sends message → loading=true → welcome matched → dots shown → response complete → welcome reappeared
- Solution: Add `&& message.id !== 'welcome'` exclusion
- Testing: Manual validation, no flicker observed
- Impact: CRITICAL UX fix

#### Commits

1. **feat: implement Opción 3 (Static Extraction + Lazy Loading) for LCP optimization**
   - DevChatMobileDev.tsx: Add static HTML for welcome message
   - Conditional rendering: Static HTML (welcome) vs Lazy ReactMarkdown (dynamic)
   - Production build: 670 bytes static HTML generated
   - Results: Lighthouse 95/100, LCP <1.5s

2. **fix: prevent welcome message from showing loading dots during streaming**
   - DevChatMobileDev.tsx:391 - Add `message.id !== 'welcome'` exclusion
   - REGRESSION_TESTS.md: Add test G5 + bug fix documentation
   - User confirmed: "perfecto. quedó arreglado"

#### Lecciones Aprendidas

1. **Static Extraction**: Pre-rendering React components a HTML estático reduce bundle size dramáticamente
2. **Lazy Loading**: Usar `Suspense` + dynamic imports para cargar componentes solo cuando se necesitan
3. **LCP Optimization**: First paint debe usar minimal JavaScript, render estático cuando sea posible
4. **Edge Cases**: Empty content strings pueden causar conditional rendering bugs - always check IDs
5. **Build-time Generation**: npm prebuild hooks son perfectos para static asset generation

#### Estado Post-LCP Optimization

✅ **Performance**: Lighthouse 95/100 (target achieved)
✅ **LCP**: <1.5s (target achieved)
✅ **Bundle Size**: 50KB ReactMarkdown NOT loaded initially
✅ **UX**: No flickering, smooth experience
✅ **Testing**: Regression test added, bug documented

**Próximo Paso**: Continuar con Guest Portal Multi-Conversation (FASE 1)

---
