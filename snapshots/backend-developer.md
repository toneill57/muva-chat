---
title: "InnPilot Backend Developer - Snapshot Especializado"
agent: backend-developer
last_updated: "2025-10-06T16:00:00"
status: PRODUCTION_READY
---

# 🔧 Backend Developer - Snapshot Especializado

**Agent**: @backend-developer
**Última actualización**: 6 Octubre 2025 16:00
**Estado**: PRODUCCIÓN - VPS Hostinger

---

## 🎯 PROYECTO ACTIVO: SIRE Compliance Data Extension

### **Tu Responsabilidad (FASE 2 - Backend Integration)**

**Estado:** Esperando completar FASE 1 (Database Migration por @database-agent)

**Tareas Asignadas:**
1. **Update TypeScript types** (task 2.1) - ~45 min
2. **Create update function** (task 2.2) - ~60 min
3. **Integrate into compliance flow** (task 2.3) - ~30 min
4. **Update reservations API** (task 2.4) - ~30 min
5. **Create sync helper script** (task 2.5) - ~30 min
6. **Create end-to-end test** (task 3.2) - ~60 min

**Tiempo Total:** ~3h 45min

**Archivos de Contexto:**
- Plan: `plan.md` (620 líneas) - Ver FASE 2 completa
- Tasks: `TODO.md` (190 líneas) - Tasks 2.1-2.5, 3.2
- Prompts: `sire-compliance-prompt-workflow.md` (Prompts 2.1-2.5)
- SIRE Mappers: `src/lib/sire/field-mappers.ts`
- Catálogos Oficiales:
  - `_assets/sire/codigos-pais.json` (250 países - códigos SIRE propietarios)
  - `_assets/sire/ciudades-colombia.json` (1,122 ciudades DIVIPOLA)
  - `_assets/sire/codigos-sire.ts` (helper functions)

**9 Campos SIRE a Integrar:**
- `document_type` (VARCHAR 2) - Tipo documento ('3', '5', '10', '46')
- `document_number` (VARCHAR 20) - Número documento (alphanumeric)
- `birth_date` (DATE) - Fecha nacimiento
- `first_surname` (VARCHAR 45) - Primer apellido
- `second_surname` (VARCHAR 45) - Segundo apellido
- `given_names` (VARCHAR 60) - Nombres
- `nationality_code` (VARCHAR 3) - Código nacionalidad (numeric 3 digits)
- `origin_country_code` (VARCHAR 3) - País origen
- `destination_country_code` (VARCHAR 3) - País destino

---

## 🏗️ STACK TECNOLÓGICO

### Backend Framework
```
Next.js 15.5.3 (App Router)
TypeScript 5.x (strict mode)
Node.js 20.x LTS
```

### Database
```
Supabase PostgreSQL 17.4.1.075
pgvector 0.8.0 (Matryoshka embeddings)
Row Level Security (RLS) - 100% habilitado
```

### AI/LLM
```
Anthropic Claude 3.5 (Haiku - compression, Sonnet - chat)
OpenAI text-embedding-3-large (embeddings Matryoshka)
Claude Vision API (multi-modal)
```

### Integrations
```
Puppeteer 24.23.0 (SIRE automation - pendiente)
TRA MinCIT API (compliance - pendiente)
MotoPress API (hotel PMS - parcialmente integrado)
```

---

## 📊 APIS Y ENDPOINTS

### Inventario Completo: 44 Endpoints

**Por Estado:**
- ✅ **Completos:** 38 endpoints (86%)
- 🚧 **Work In Progress:** 4 endpoints (9%)
- ⚠️ **Legacy/Deprecated:** 2 endpoints (5%)

**Por Autenticación:**
- **JWT Guest:** 12 endpoints
- **JWT Staff:** 4 endpoints
- **Public (No Auth):** 8 endpoints
- **CRON Secret:** 1 endpoint
- **Admin (TODO):** 6 endpoints (MotoPress - sin auth) ⚠️

### Guest Portal (12 endpoints)

```
POST   /api/guest/login                      # Auth (JWT + cookie 7 días)
POST   /api/guest/logout                     # Session cleanup
POST   /api/guest/verify-token               # JWT verification
POST   /api/guest/chat                       # Chat conversacional
GET    /api/guest/chat/history               # Message history
GET    /api/guest/conversations              # List conversations
POST   /api/guest/conversations              # Create conversation
PUT    /api/guest/conversations/[id]         # Update conversation
DELETE /api/guest/conversations/[id]         # Delete conversation
POST   /api/guest/conversations/[id]/attachments  # File upload + Vision
GET    /api/guest/conversations/[id]/favorites    # List favorites
POST   /api/guest/conversations/[id]/favorites    # Add favorite
```

### Staff Portal (4 endpoints)

```
POST   /api/staff/login                      # Staff authentication
POST   /api/staff/verify-token               # JWT verification
POST   /api/staff/chat                       # Staff chat engine
GET    /api/reservations/list                # Reservations (multi-tenant)
```

### Compliance (2 endpoints)

```
POST   /api/compliance/submit                # SIRE/TRA submission (MOCK)
PATCH  /api/compliance/status/[id]           # Update status
```

### MotoPress Integration (6 endpoints) - ⚠️ NO AUTH

```
POST   /api/integrations/motopress/configure       # Config (⚠️ Security TODO)
POST   /api/integrations/motopress/test-connection
POST   /api/integrations/motopress/sync
GET    /api/integrations/motopress/sync/progress
GET    /api/integrations/motopress/accommodations
```

**🔴 CRÍTICO:** MotoPress endpoints sin autenticación admin - Security gap

### Public & Dev (4 endpoints)

```
POST   /api/public/chat                      # Public chat (rate-limited)
POST   /api/public/reset-session             # Session reset
POST   /api/dev/chat                         # Dev chat (experimental)
POST   /api/dev/reset-session                # Dev session reset
```

### System & Utilities (7 endpoints)

```
GET    /api/health                           # Health check (multi-tenant)
GET    /api/status                           # System status
POST   /api/validate                         # File validation (SIRE)
POST   /api/upload                           # File upload (multi-purpose)
GET    /api/tenant/resolve                   # Slug/UUID → tenant_id
GET    /api/tenant/list                      # List tenants
POST   /api/cron/archive-conversations       # Auto-archive (CRON_SECRET)
```

### Legacy (6 endpoints) - Still Active

```
POST   /api/chat                             # Pre-multi-tenant chat
POST   /api/chat/muva                        # Tourism-specific (active)
POST   /api/chat/listings                    # Multi-tenant listings
POST   /api/premium-chat                     # Premium semantic
POST   /api/premium-chat-dev                 # Dev environment
```

---

## 🎯 CARACTERÍSTICAS PRINCIPALES

### 1. Sistema de Chat Multi-Conversación ✅ COMPLETO

**Backend Implementado:**
- ✅ JWT authentication (7 días, HttpOnly cookies)
- ✅ Multi-conversation CRUD operations
- ✅ Message persistence (`chat_messages` table)
- ✅ Entity tracking system
- ✅ Follow-up suggestions generation
- ✅ Conversation intelligence
- ✅ Auto-compactación (100 msgs → compress 50)
- ✅ Auto-archiving scheduler (CRON)

**Archivos Clave:**
```
src/lib/conversational-chat-engine.ts    # Core chat logic
src/lib/conversation-compressor.ts       # Memory compression
src/lib/guest-auth.ts                    # JWT authentication
src/app/api/guest/conversations/route.ts # CRUD endpoints
src/app/api/guest/chat/route.ts          # Chat endpoint
```

### 2. Módulo de Compliance SIRE/TRA ⏳ MOCK

**Estado:** Implementado en modo MOCK (no ejecuta SIRE/TRA real)

**Backend Implementado:**
- ✅ Entity extraction conversacional
- ✅ Mapeo a 13 campos oficiales SIRE
- ✅ Database storage (`compliance_submissions`)
- ✅ Conversational flow integration
- ⏳ **PENDIENTE:** Puppeteer automation (FASE 3.2)
- ⏳ **PENDIENTE:** TRA API integration (FASE 3.3)

**Archivos Clave:**
```
src/lib/compliance-chat-engine.ts        # Compliance logic (MOCK)
src/lib/sire/field-mappers.ts            # Conversational → SIRE mappers
src/app/api/compliance/submit/route.ts   # Submission endpoint (MOCK)
_assets/sire/codigos-pais.json           # 250 países SIRE
_assets/sire/ciudades-colombia.json      # 1,122 ciudades DIVIPOLA
_assets/sire/codigos-sire.ts             # Helper functions
```

### 3. Multi-Tenant Architecture ✅ COMPLETO

**Backend Features:**
- ✅ Tenant registry con feature flags
- ✅ RLS policies (100% coverage - fix Oct 6, 2025)
- ✅ Tenant-specific content routing
- ✅ Per-tenant authentication flows
- ✅ Cross-tenant data isolation

**Tenants Activos:**
- `simmerdown` (Premium tier) - 900222791
- `free-hotel-test` (Free tier) - 900000000-0

**Archivos Clave:**
```
src/lib/tenant-utils.ts                  # Tenant resolution
src/app/api/tenant/resolve/route.ts      # Slug → tenant_id
```

### 4. Integración MotoPress ⚠️ PARCIALMENTE IMPLEMENTADO

**Backend Features:**
- ✅ Configuration storage
- ✅ Sync manager orchestration
- ✅ Data mapping WordPress → Supabase
- ✅ Sync history tracking (30 logs)
- ⚠️ Solo 1/10 unidades con datos MotoPress completos
- 🔴 **CRÍTICO:** Endpoints sin autenticación admin

**Archivos Clave:**
```
src/app/api/integrations/motopress/configure/route.ts
src/app/api/integrations/motopress/sync/route.ts
scripts/sync-motopress-bookings.ts       # Sync automation
```

---

## 🗄️ DATABASE OPERATIONS

### RPC Functions (PRIMARY - Use First)

**Objetivo:** Reducir context window 90-98% usando funciones PostgreSQL pre-compiladas

**7 RPC Functions Disponibles:**

```sql
-- Guest Conversations
get_guest_conversation_metadata(p_conversation_id UUID)
  → Reemplaza 11 queries, 99.4% reducción tokens

get_inactive_conversations(p_tenant_id TEXT, p_days_inactive INT)
  → Reemplaza 2 queries, 92.5% reducción

get_archived_conversations_to_delete(p_tenant_id TEXT, p_days_archived INT)
  → Reemplaza 1 query, 82.0% reducción

-- Chat Messages
get_conversation_messages(p_conversation_id UUID, p_limit INT, p_offset INT)
  → Reemplaza 6 queries, 97.9% reducción

-- Integrations
get_active_integration(p_tenant_id UUID, p_integration_type TEXT)
  → Reemplaza 8 queries, 98.4% reducción

-- Reservations
get_reservations_by_external_id(p_external_booking_id TEXT, p_tenant_id TEXT)
  → Reemplaza 5 queries, 98.0% reducción

-- Accommodation Units
get_accommodation_units_needing_type_id(p_tenant_id TEXT)
  → Reemplaza script logic, 92.5% reducción
```

**Impacto Medido (Octubre 2025):**
- **98.1% reducción** en context window (17,700 → 345 tokens)
- **34 queries inline** reemplazados en 41 archivos
- **Ahorro promedio:** 17,355 tokens por conversación

**Documentación Completa:** `docs/architecture/DATABASE_QUERY_PATTERNS.md`

### Query Hierarchy (CRITICAL)

**🎯 ALWAYS prefer this order:**

1. **RPC Functions (PRIMARY)** - Use dedicated PostgreSQL functions
2. **Direct SQL via MCP (SECONDARY)** - For ad-hoc analysis only
3. **execute_sql() RPC (EMERGENCY ONLY)** - Migrations and one-time fixes

**❌ NEVER use execute_sql() in:**
- API endpoints (`src/app/api/**`)
- Scheduled scripts (`scripts/sync-*.ts`)
- Regular application code
- Anything that runs more than once

---

## ⚡ PERFORMANCE TARGETS

### API Response Times

| Endpoint | Target | Actual | Status |
|----------|--------|--------|--------|
| `/api/guest/chat` | <3000ms | ~1500-2500ms | ✅ PASS |
| `/api/public/chat` | <2000ms | ~1000-1800ms | ✅ PASS |
| `/api/staff/chat` | <3000ms | ~1500-2500ms | ✅ PASS |
| Vector search | <500ms | ~200-400ms | ✅ PASS |
| File upload + Vision | <5000ms | ~2000-4000ms | ✅ PASS |
| Compliance submit | <1000ms | ~300-800ms | ✅ PASS (MOCK) |

### Database Operations

| Operation | Target | Critical |
|-----------|--------|----------|
| Database query | < 100ms | < 200ms |
| Authentication | < 50ms | < 100ms |
| Vector search | < 200ms | < 500ms |
| RPC function call | < 50ms | < 100ms |

---

## 🔒 SEGURIDAD

### Estado Actual

**✅ RESUELTO:**
- RLS habilitado en 100% tablas (fix Oct 6, 2025)
- Function search_path seguro (28/28 funciones)
- 0 vulnerabilidades npm detectadas

**⚠️ PENDIENTE:**
- PostgreSQL upgrade (17.4 → parches disponibles)
- MotoPress endpoints sin autenticación admin
- Leaked password protection deshabilitado

### Secrets Management

**GitHub Secrets (10 configurados):**
```
VPS_HOST, VPS_USER, VPS_SSH_KEY, VPS_APP_PATH
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY, ANTHROPIC_API_KEY
JWT_SECRET_KEY
```

**✅ Buenas prácticas:**
- `.env.local` en `.gitignore`
- SSH key-based authentication
- Secrets rotation documented (90-day cycle)

---

## 🚧 GAPS Y PENDIENTES

### CRÍTICO
1. **MotoPress Security** - Implementar autenticación admin en 6 endpoints
2. **Conversion Rate 0%** - Investigar funnel público roto (176 sesiones → 0 conversiones)

### IMPORTANTE
1. **SIRE/TRA Real** - Completar Puppeteer automation (FASE 3.2-3.3)
2. **Testing Coverage** - <5% actual, target >70%
3. **StaffChatInterface** - No carga historial (TODO en código)

### MEDIO
1. **ReservationsList** - Backend no conectado completamente
2. **OpenAPI spec** - Desactualizado (no refleja endpoints recientes)

---

## 📝 DOCUMENTACIÓN

**Backend Specs (312KB - 22 archivos):**
- ✅ `MATRYOSHKA_ARCHITECTURE.md` (20KB) - Embeddings system
- ✅ `MULTI_TENANT_ARCHITECTURE.md` (16KB) - Multi-tenancy
- ✅ `PREMIUM_CHAT_ARCHITECTURE.md` (28KB) - Chat premium
- ✅ `DATABASE_QUERY_PATTERNS.md` (nuevo) - RPC functions guide
- ✅ `LLM_INTENT_DETECTION.md` (20KB) - Intent detection

---

## 🔗 COORDINACIÓN

**Trabaja con:**
- `@database-agent` - Para schema changes y migrations
- `@ux-interface` - Para API contracts y frontend integration
- `@deploy-agent` - Para deployment configuration
- `@infrastructure-monitor` - Para performance monitoring

**Ver:** `CLAUDE.md` para guías proyecto-wide

---

## 📌 REFERENCIAS RÁPIDAS

**URLs:**
- Production: https://innpilot.io
- VPS: 195.200.6.216
- Database: Supabase (ooaumjzaztmutltifhoq.supabase.co)

**Comandos Dev:**
```bash
# Start dev server (MANDATORY - exports API keys)
./scripts/dev-with-keys.sh

# Type checking
npm run type-check

# Tests
npm test -- src/lib/__tests__/

# Build
npm run build
```

**Snapshot Relacionados:**
- 🗄️ Database: `snapshots/database-agent.md`
- 🎨 UI/UX: `snapshots/ux-interface.md`
- 🗺️ API Mapping: `snapshots/api-endpoints-mapper.md`
