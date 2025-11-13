# TODO - My Stay Guest Chat Fix + SIRE Básico

**Proyecto:** My Stay Guest Chat - Restauración de Funcionalidad + SIRE Básico
**Fecha:** 2025-11-13
**Plan:** Ver `plan.md` para contexto completo de regresión y solución
**Cambios:** REALINEADO - Enfoque en arreglar My Stay (P0), SIRE básico (P2)

---

## ⚠️ LEER PRIMERO - ARQUITECTURA CRÍTICA

**IMPORTANTE:** Este plan trabaja con 2 sistemas de vector embeddings SEPARADOS:

1. **Accommodation Units Data** (`accommodation_units_public.embedding`)
   - Para: Chat público `/with-me`
   - ❌ **NO TOCAR en este plan** - ya funciona

2. **Accommodation Manuals** (`accommodation_units_manual_chunks.embedding`)
   - Para: Guest chat `/my-stay` (manuales de accommodation units)
   - ✅ **FASE 1 trabaja SOLO con esto**

**Nota:** Guest chat también usa OTROS embeddings (turismo, SIRE, etc.) fuera del alcance de este plan.

**Ver detalles:** `plan.md` líneas 43-128 (Arquitectura Crítica)

---

## FASE 0: Restaurar Reservation Sync + Mapeo SIRE Básico ⚠️ P0 BLOQUEANTE

### 0.1a: Limpiar Working Directory + Verificar Estado Roto
- [ ] Clean uncommitted changes and verify current broken state (estimate: 20-30 min)
  - Descartar cambios sin commitear (RPC fantasma `get_accommodation_unit_by_motopress_type_id`)
  - Verificar estado actual roto con SQL queries
  - Documentar baseline: phone_last_4 = NULL, reservation_code = NULL, accommodation_unit_id = NULL
  - Files: `src/lib/integrations/motopress/bookings-mapper.ts`
  - Agent: **@agent-backend-developer**
  - Test: ✅ Working directory limpio + SQL evidence de estado roto
  - **Prompt:** Ver `workflow.md` → Prompt 0.1a (con delimitadores 🔽 🔼)

### 0.1b: Restaurar Lógica Funcional de Oct 19
- [ ] Restore ONLY the 4 critical functions from commit `34c1a57` (estimate: 1-1.5h)
  - PREREQUISITO: 0.1a completado (working directory limpio)
  - Restaurar: Detección Airbnb (`isAirbnb = ical_description.includes('airbnb.com')`)
  - Restaurar: Phone parsing (`extractPhoneFromIcal()` function)
  - Restaurar: Reservation code extraction (`extractReservationCode()` function)
  - Restaurar: Accommodation lookup via RPC `get_accommodation_unit_by_motopress_id`
  - SIN campos SIRE (eso es 0.1c)
  - Files: `src/lib/integrations/motopress/bookings-mapper.ts`
  - Agent: **@agent-backend-developer**
  - Test: Verificación básica SQL - phone_last_4 ≠ '0000'
  - Commit: "fix: restore working sync logic from 34c1a57 (revert Nov 8 regression)"
  - **Prompt:** Ver `workflow.md` → Prompt 0.1b (con delimitadores 🔽 🔼)

### 0.1c: Agregar Campos SIRE + Testing Completo
- [ ] Add SIRE field mapping from MotoPress + full testing suite (estimate: 1-1.5h)
  - PREREQUISITO: 0.1b completado (sync working)
  - OBJETIVO: Capturar TODOS los datos que YA vienen de MotoPress sync
  - Agregar: `given_names` ← `booking.customer.first_name`
  - Agregar: `first_surname` ← `booking.customer.last_name`
  - Dejar NULL: `second_surname` (MotoPress solo tiene 1 campo "last_name")
  - Dejar NULL: Campos NO disponibles (document, birth_date, nationality, etc.)
  - Testing completo: phone_last_4, reservation_code, accommodation_unit_id, SIRE fields
  - Files: `src/lib/integrations/motopress/bookings-mapper.ts` (líneas 224-237)
  - Agent: **@agent-backend-developer**
  - Test: ✅ 100% reservas con phone_last_4, reservation_code, accommodation_unit_id, given_names, first_surname
  - Commit: "feat: add SIRE field mapping from MotoPress"
  - **Principio:** "Si viene de MotoPress, lo mapeamos ahora. Si no viene, lo obtenemos después."
  - **Prompt:** Ver `workflow.md` → Prompt 0.1c (con delimitadores 🔽 🔼)

---

## FASE 1: Fix Manual Search RPC ⚠️ P0 BLOQUEANTE

**⚠️ RECORDATORIO CRÍTICO:**
- Este RPC trabaja SOLO con `accommodation_units_manual_chunks` (manuales de units)
- NO tocar `accommodation_units_public.embedding` (data general para /with-me)
- Nota: Guest chat usa OTROS embeddings (turismo, etc.) - NO son parte de este plan
- Ver arquitectura: `plan.md` líneas 43-128

### 1.1: Diagnóstico + Fix RPC match_unit_manual_chunks
- [ ] Diagnose and fix RPC search_path issue (estimate: 2-3h)
  - OBJETIVO: Confirmar o descartar hipótesis de search_path issue + fix si confirmado
  - View current RPC definition in migrations
  - Test direct SQL call to RPC with test embedding
  - Verify chunks exist in `accommodation_units_manual_chunks`
  - Check if RPC has `SET search_path = 'public, extensions'`
  - SI hipótesis confirmada: CREATE OR REPLACE FUNCTION with correct search_path
  - Add IMMUTABLE comment to prevent future modifications
  - Apply via migration: `supabase/migrations/YYYYMMDDHHMMSS_fix_manual_search_rpc.sql`
  - ⚠️ **Verificar que RPC busca en tabla CORRECTA** (`accommodation_units_manual_chunks`, NO `accommodation_units_public`)
  - Files: `supabase/migrations/*manual*.sql`
  - Agent: **@agent-database-agent**
  - Test: ✅ RPC call retorna total_found > 0
  - **Prompt:** Ver `workflow.md` → Prompt 1.1 (con delimitadores 🔽 🔼)

### 1.2: E2E Test Manual Search
- [ ] Test manual search end-to-end from guest chat (estimate: 1-1.5h)
  - PREREQUISITO: 1.1 completado - RPC funcionando
  - Test 1: Guest pregunta "WiFi password" → Bot encuentra manual
  - Test 2: Guest pregunta "Check-in instructions" → Bot responde
  - Test 3: Guest pregunta "House rules" → Bot encuentra reglas
  - Verify `total_found > 0` en todas las queries
  - Test con 5 accommodations diferentes
  - Verify performance <500ms
  - Files: Guest chat interface test
  - Agent: **@agent-backend-developer**
  - Test: ✅ Manual search funcional en 5 accommodations, performance <500ms
  - **Prompt:** Ver `workflow.md` → Prompt 1.2 (con delimitadores 🔽 🔼)

---

## FASE 2: Mostrar Nombre Correcto del Accommodation 📝 P1 UX

### 2.1: Análisis + JOIN Query
- [ ] Investigate data source and implement JOIN query (estimate: 1-1.5h)
  - PREREQUISITO: 1.2 completado - Manual search funcionando
  - OBJETIVO: Confirmar de dónde se lee actualmente el nombre + implementar JOIN
  - HIPÓTESIS: Se lee de `accommodation_units_public` (tabla incorrecta)
  - DEBE SER: Leer vía JOIN desde `guest_reservations.accommodation_unit_id`
  - Análisis: Grep "accommodation" en GuestChatInterface.tsx
  - Implementación: Modify query en `/my-stay` page
  - BEFORE: `select('*')`
  - AFTER: `select('*, accommodation:accommodation_units_public!accommodation_unit_id(id, name, metadata)')`
  - Usage: `reservation.accommodation.name || 'Guest'`
  - Files: `src/app/[tenant]/my-stay/page.tsx`, `src/components/GuestChatInterface.tsx`
  - Agent: **@agent-backend-developer**
  - Test: ✅ Query retorna accommodation name correctamente
  - **Prompt:** Ver `workflow.md` → Prompt 2.1 (con delimitadores 🔽 🔼)

### 2.2: Update UI + Testing
- [ ] Display accommodation name and test across accommodations (estimate: 1-1.5h)
  - PREREQUISITO: 2.1 completado - JOIN query funcionando
  - Add prop: `accommodationName?: string` to GuestChatInterface
  - Header: `{accommodationName ? 'Chat - ${accommodationName}' : 'Guest Chat'}`
  - Welcome message: `¡Bienvenido a ${accommodationName}!`
  - Fallback: "Guest Chat" si accommodation_unit_id NULL
  - Testing:
    - Test 1: Reserva directa MotoPress → muestra "Chat - Jammin'"
    - Test 2: Reserva Airbnb → muestra "Chat - Dreamland"
    - Test 3: Reservation sin unit_id → muestra "Guest Chat" (fallback)
    - Verify con 5 accommodations diferentes
  - Files: `src/components/GuestChatInterface.tsx`
  - Agent: **@agent-ux-interface**
  - Test: ✅ Nombre correcto en 5 accommodations, NO afecta /with-me
  - **Prompt:** Ver `workflow.md` → Prompt 2.2 (con delimitadores 🔽 🔼)

---

## FASE 3: SIRE Básico - Auto-Config Tenant 🏨 P2 COMPLIANCE

### 3.1: Migration SIRE Tenant Config
- [ ] Add hotel_sire_code and hotel_city_code to tenant_registry (estimate: 1h)
  - PREREQUISITO: 2.2 completado - Nombres correctos en UI
  - Migration: ALTER TABLE tenant_registry ADD COLUMN hotel_sire_code VARCHAR(20)
  - Migration: ALTER TABLE tenant_registry ADD COLUMN hotel_city_code VARCHAR(6)
  - Populate SimmerDown: hotel_sire_code = nit, hotel_city_code = '[SAN_ANDRES_CODE]' (San Andrés Isla)
  - TODO: Investigar código DIVIPOLA exacto de San Andrés Isla ANTES de ejecutar
  - Validate: SELECT tenant_id, hotel_sire_code, hotel_city_code FROM tenant_registry
  - Files: `supabase/migrations/YYYYMMDDHHMMSS_add_sire_tenant_config.sql`
  - Agent: **@agent-database-agent**
  - Test: ✅ tenant_registry tiene nuevos campos poblados
  - **Prompt:** Ver `workflow.md` → Prompt 3.1 (con delimitadores 🔽 🔼)

### 3.2: Update Bookings Mapper + Testing
- [ ] Auto-populate SIRE hotel fields and verify sync (estimate: 1-2h)
  - PREREQUISITO: 3.1 completado - Campos en tenant_registry
  - Create function: `getTenantSIREConfig(tenantId)` en bookings-mapper.ts
  - Query tenant_registry: SELECT hotel_sire_code, hotel_city_code
  - Populate in sync: hotel_sire_code = tenantConfig.hotelCode
  - Populate in sync: hotel_city_code = tenantConfig.cityCode
  - Testing:
    - Sync nueva reserva en staging
    - Query: SELECT hotel_sire_code, hotel_city_code FROM guest_reservations ORDER BY created_at DESC LIMIT 5
    - Verify UI: Tarjetas muestran "Hotel: [NIT]", "Ciudad: San Andrés Isla ([CODE])"
    - Verify: NO más "No configurado"
  - Files: `src/lib/integrations/motopress/bookings-mapper.ts`
  - Agent: **@agent-backend-developer**
  - Test: ✅ 100% reservas con hotel SIRE fields
  - **Prompt:** Ver `workflow.md` → Prompt 3.2 (con delimitadores 🔽 🔼)

---

## FASE 4: Documentation & Deployment 📚

### 4.1: Documentar Regresión
- [ ] Create regression documentation (estimate: 1h)
  - PREREQUISITO: 3.2 completado - SIRE básico funcionando
  - Fecha regresión: Nov 8, 2025
  - Commits culpables: `d251377` + `54401ba`
  - Qué se rompió: phone_last_4, reservation_code, accommodation_unit_id
  - Solución aplicada: Revert a commit `34c1a57` + fixes adicionales
  - Prevención futura: Git workflow, health checks, no modificar sync sin tests
  - Files: `docs/my-stay-guest-chat/REGRESSION_FIX_NOV_2025.md`
  - Agent: **@agent-backend-developer**
  - Test: ✅ Documentación completa y clara
  - **Prompt:** Ver `workflow.md` → Prompt 4.1 (con delimitadores 🔽 🔼)

### 4.2: Deploy Staging + Production
- [ ] Deploy to staging, validate, then production after 24h (estimate: 1h + 24h waiting)
  - PREREQUISITO: 4.1 completado - Documentación lista
  - Deploy Staging:
    - Build: `pnpm run build`
    - Health check: `pnpm dlx tsx scripts/monitoring-dashboard.ts`
    - Deploy: `./scripts/deploy-staging.sh`
    - Post-deploy: curl -I https://simmerdown.staging.muva.chat/my-stay
  - Smoke Testing (staging):
    - Test: Sync reservas → phone_last_4 OK
    - Test: Guest login → autenticación funciona
    - Test: Manual search → retorna chunks
    - Test: Chat muestra nombre correcto
    - Monitor 24h sin P0 errors
  - Production Deployment (after 24h staging validation):
    - Pre-deploy: Health check staging (24h monitoring pass)
    - Deploy: `./scripts/deploy-production.sh`
    - Post-deploy: curl -I https://simmerdown.muva.chat/my-stay
    - Monitor 48h
  - Files: Staging + Production deployments
  - Agent: **@agent-deploy-agent**
  - Test: ✅ Staging + Production funcionales, zero P0 errors en 48h
  - **Prompt:** Ver `workflow.md` → Prompt 4.2 (con delimitadores 🔽 🔼)

---

## 📊 PROGRESO

**Total Tasks:** 11 (consolidadas para mejor manejo de contexto)
**Completed:** 0/11 (0%)

**Por Fase:**
- FASE 0: 0/3 tareas (Restaurar Reservation Sync - P0 BLOQUEANTE)
  - 0.1a: Limpiar + Verificar (20-30 min)
  - 0.1b: Restaurar Lógica (1-1.5h)
  - 0.1c: SIRE + Testing (1-1.5h)
- FASE 1: 0/2 tareas (Fix Manual Search - P0 BLOQUEANTE)
  - 1.1: Diagnóstico + Fix RPC (2-3h)
  - 1.2: E2E Test Manual Search (1-1.5h)
- FASE 2: 0/2 tareas (Nombre Correcto - P1 UX)
  - 2.1: Análisis + JOIN Query (1-1.5h)
  - 2.2: Update UI + Testing (1-1.5h)
- FASE 3: 0/2 tareas (SIRE Básico - P2 COMPLIANCE)
  - 3.1: Migration SIRE Config (1h)
  - 3.2: Update Mapper + Testing (1-2h)
- FASE 4: 0/2 tareas (Documentation & Deployment)
  - 4.1: Documentar Regresión (1h)
  - 4.2: Deploy Staging + Production (1h + 24h waiting)

**Tiempo Total Estimado:** 11.5-16h (incluye mapeo SIRE MotoPress)

**Crítico (P0):** FASE 0-1 = 5.5-7.5h (guests pueden usar chat + datos SIRE básicos)
**Recomendado:** FASE 0-3 = 9.5-13.5h (My Stay funcional + SIRE básico completo)
**Completo:** FASE 0-4 = 11.5-16h (Production ready)

---

## 🎯 PRÓXIMOS PASOS

### Iniciar FASE 0 (Restaurar Reservation Sync):
```bash
# 1. Leer plan completo (regresión + solución)
cat docs/sire-compliance/plan.md

# 2. Ver código a restaurar
git show 34c1a57:src/lib/integrations/motopress/bookings-mapper.ts | grep -A 30 "extractPhoneFromIcal"

# 3. Ver cambios sin commitear (RPC fantasma)
git diff src/lib/integrations/motopress/bookings-mapper.ts

# 4. Ejecutar FASE 0.1 (Revertir Regresión)
# Agent: @agent-backend-developer
```

### Después de FASE 0:
- [ ] Marcar tareas 0.1 y 0.2 como `[x]` en este archivo
- [ ] Commit fix con mensaje apropiado
- [ ] Proceder con FASE 1 (Fix Manual Search)

---

## 🔍 CAMBIOS vs TODO ORIGINAL

**Eliminado (POSPUESTO):**
- ❌ FASE 1 original: Diagnóstico extenso sync MotoPress (ya identificamos regresión)
- ❌ FASE 3 original: Document OCR para SIRE (no prioritario)
- ❌ FASE 4 original: Chat extraction híbrido (no prioritario)
- ❌ FASE 5 original: Name parser + nationality mapper (no prioritario)
- ❌ FASE 6 original: PUT endpoint SIRE (no prioritario)
- ❌ FASE 7 original: E2E tests SIRE completo (no prioritario)

**Agregado (NUEVO ENFOQUE):**
- ✅ FASE 0 nueva: Restaurar reservation sync (revert regresión Nov 8)
- ✅ FASE 1 nueva: Fix manual search RPC (P0 bloqueante)
- ✅ FASE 2 nueva: Mostrar nombre correcto accommodation (P1 UX)
- ✅ FASE 3 nueva: SIRE básico (solo tenant config, P2)

**Enfoque:**
- My Stay guest chat funcional PRIMERO (P0)
- SIRE compliance básico DESPUÉS (P2)
- SIRE completo pospuesto a futuro sprint

**Resultado:**
- De 28 tareas → 11 tareas (60% reducción)
- De 36-46h → 11.5-16h (65% reducción en tiempo)
- De 8 fases → 4 fases + deploy
- Prompts consolidados para mejor manejo de contexto (evita 40-45% context usage)
- Scope enfocado en restaurar funcionalidad crítica

---

## 📝 FASES SIRE POSPUESTAS (Futuro Sprint - Módulo Compliance)

Las siguientes fases se posponen para el **módulo de compliance del guest chat** (My Stay):

### PRINCIPIO ADOPTADO: "MotoPress Sync First"
**MAPEAR AHORA (FASE 0):**
- ✅ Todos los campos SIRE que **YA vienen** de MotoPress API
- Ejemplo: `given_names`, `first_surname`, `guest_email`, `guest_country`, etc.

**POSPONER (Futuro):**
- ❌ Solo campos que **NO vienen** de MotoPress
- Ejemplo: `second_surname`, `document_number`, `birth_date`, `nationality_code`, etc.

### POSPUESTO: Campos SIRE NO Disponibles en MotoPress
**Campos que requieren chat extraction / OCR / lógica:**
- `second_surname` - Name parser (MotoPress solo tiene `last_name`)
- `document_type`, `document_number` - OCR pasaporte o chat
- `birth_date` - Chat extraction
- `nationality_code` - Mapper `guest_country` → código SIRE
- `origin_city_code`, `destination_city_code` - Chat extraction
- `movement_type`, `movement_date` - Lógica de cálculo

### POSPUESTO: Document OCR para SIRE (6-8h)
- Upload pasaporte/ID con Claude Vision
- Extracción automática de 6-7 campos SIRE
- Integration en guest chat

### POSPUESTO: Chat Extraction Híbrido (10-12h)
- Extracción pasiva de conversación natural
- Preguntas guiadas para campos faltantes
- ComplianceReminder banner implementado

### POSPUESTO: Name Parser + Nationality Mapper (6-8h)
- Parser de nombres latinos (2 apellidos)
- Mapper country → SIRE code con fuzzy search
- Auto-población desde MotoPress para reservas directas

### POSPUESTO: PUT Endpoint SIRE (4-6h)
- API endpoint para actualizar campos SIRE
- Zod validation schema
- Integration con guest chat

### POSPUESTO: Testing & E2E SIRE (4-6h)
- E2E tests de flujo SIRE completo
- Coverage >85%
- Staging validation

**Razón:** My Stay funcional es P0, SIRE completo es P2 (puede esperar hasta que chat esté operativo)

---

**Última actualización:** 2025-11-13 18:45
**Estado:** ✅ TODO alineado con workflow.md - 11 prompts con verificación post-ejecución

**Cambios Nov 13 18:45:**
- ✅ TODO.md alineado completamente con workflow.md
- ✅ Total tasks: 17 → 11 (consolidadas para mejor manejo de contexto)
- ✅ FASE 1: 3 tareas → 2 tareas (1.1 consolida diagnóstico + fix)
- ✅ FASE 2: 4 tareas → 2 tareas (2.1 consolida análisis + JOIN, 2.2 consolida UI + testing)
- ✅ FASE 3: 3 tareas → 2 tareas (3.2 consolida mapper + testing)
- ✅ FASE 4: 4 tareas → 2 tareas (4.2 consolida staging + production)
- ✅ Todas las tareas con referencia a workflow.md (delimitadores 🔽 🔼)
- ✅ Todas las tareas con sistema de verificación post-ejecución
- ✅ Numeración exacta: 0.1a, 0.1b, 0.1c, 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2

**Cambios Nov 13 16:30:**
- ✅ FASE 0 subdividida en 3 tareas (0.1a: Clean, 0.1b: Restore, 0.1c: SIRE + Testing)
- ✅ Cada subtarea con referencia a prompt en workflow.md (delimitadores 🔽 🔼)
- ✅ Prompts con copy delimiters para fácil ejecución

**Cambios Nov 13 14:45:**
- ✅ Agregada arquitectura crítica sobre 2 sistemas de embeddings (líneas 10-24)
- ✅ FASE 1 actualizada con recordatorios sobre NO tocar units data embeddings
- ✅ Clarificado alcance: Plan SOLO arregla manuales, NO otros embeddings de guest chat
