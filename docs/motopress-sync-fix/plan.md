# MotoPress Multi-Tenant Sync Fix - Plan de Implementación

**Proyecto:** MotoPress Sync Fix
**Fecha Inicio:** November 19, 2025
**Estado:** 📋 Planificación
**Análisis Base:** Opus exhaustive analysis - Race condition identificada

---

## 🎯 OVERVIEW

### Objetivo Principal
Corregir el fallo de diseño en el flujo de sincronización MotoPress que causa que reservas se inserten con `accommodation_unit_id = NULL`, impidiendo que el guest chat funcione correctamente para responder sobre alojamientos.

### ¿Por qué?
- **Problema crítico:** INDO tiene 1 reserva con NULL (guest chat no funciona)
- **Fallo sistémico:** Cualquier tenant nuevo puede sufrir el mismo problema
- **Race condition identificada:** Reservas se sincronizan ANTES que accommodations
- **Impacto en UX:** Guests no pueden obtener información sobre sus alojamientos
- **Análisis completo:** Opus identificó causa raíz con evidencia de timestamps

### Alcance
- ✅ Fix temporal para INDO (restaurar funcionalidad inmediata)
- ✅ Fix sistémico en `/api/integrations/motopress/sync-all`
- ✅ Garantizar orden: accommodations → reservations (siempre)
- ✅ Testing multi-tenant exhaustivo
- ✅ Prevención futura con validaciones y monitoring
- ❌ NO modificar UI (usa mismo endpoint)
- ❌ NO crear nuevos endpoints (reutilizar sync-all)
- ❌ NO modificar branches de Supabase (testing en DEV)

---

## 📊 ESTADO ACTUAL

### Sistema Existente
- ✅ Endpoint `/api/integrations/motopress/sync` - Sincroniza accommodations correctamente
- ✅ Endpoint `/api/integrations/motopress/sync-all` - Sincroniza reservas (SSE)
- ✅ `MotoPresSyncManager` - Lógica de sync de accommodations ya implementada
- ✅ Auto-creación de units en `saveReservationAccommodations()` (líneas 537-571)
- ✅ Simmer Down: 101 reservas funcionando (pero con race condition en primeras 4)

### Limitaciones Actuales
- ❌ **Fallo de diseño:** sync-all NO sincroniza accommodations primero
- ❌ **Race condition:** Reserva se inserta con NULL antes de auto-crear unit
- ❌ **Junction table vacía:** Si reservation tiene NULL, no se llena reservation_accommodations
- ❌ **Guest chat roto:** No puede responder sobre alojamientos para INDO
- ❌ **Sin validación:** No falla si units no existen antes de sync reservas
- ❌ **Sin monitoring:** No hay alertas para detectar NULL reservations

### Evidencia del Problema

**Timestamps INDO:**
```
Reserva: 2025-11-19 22:19:09.984
Unit:    2025-11-19 22:19:10.311 (0.3s después)
Result:  accommodation_unit_id = NULL
```

**Flujo problemático:**
1. Usuario click "Sync All"
2. sync-all fetch bookings
3. mapBulkBookingsWithEmbed busca units → NO existen
4. INSERT reservation con accommodation_unit_id = NULL
5. saveReservationAccommodations auto-crea unit (muy tarde)
6. Reserva YA tiene NULL, junction table queda vacía

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia
Usuario ejecuta "Sync All" una sola vez y TODO se sincroniza correctamente, en el orden correcto, garantizando que TODAS las reservas tengan accommodation_unit_id válido y junction table completa.

### Características Clave
- **Orden garantizado:** Accommodations SIEMPRE antes que reservations
- **Un solo botón:** Usuario no necesita ejecutar dos sincronizaciones separadas
- **Multi-tenant:** Funciona para cualquier tenant automáticamente
- **Sin cambios UI:** Usa el mismo endpoint /sync-all
- **SSE mejorado:** Progress events muestran sync de accommodations + reservations
- **Validación robusta:** Falla explícitamente si accommodations sync falla
- **Monitoring:** Query para detectar NULL reservations proactivamente

---

## 📱 TECHNICAL STACK

### Backend
- Next.js 15 API Routes (SSE - Server-Sent Events)
- TypeScript
- MotoPress REST API
- MotoPresSyncManager (existente)

### Database
- Supabase PostgreSQL
- Schema: `hotels.accommodation_units`
- Schema: `public.guest_reservations`
- Junction: `public.reservation_accommodations`
- RPC: `get_accommodation_unit_by_motopress_id`

### Integration
- MotoPress WordPress Plugin
- OAuth authentication
- Batch sync con _embed parameter

---

## 🔧 DESARROLLO - FASES

### FASE 0: Preparación y Análisis (30min)
**Objetivo:** Entender completamente el código actual antes de modificar

**Entregables:**
- Análisis completo de `sync-all/route.ts` (líneas clave identificadas)
- Verificación de que `MotoPresSyncManager` está disponible
- Identificación de punto exacto de inserción (línea ~150-176)
- Confirmación de que SSE events funcionan correctamente

**Archivos a leer:**
- `src/app/api/integrations/motopress/sync-all/route.ts`
- `src/lib/integrations/motopress/sync-manager.ts`
- `src/lib/integrations/motopress/bookings-mapper.ts`

**Testing:**
- N/A (solo análisis)

**Estimado:** 30min

---

### FASE 1: Fix Temporal INDO (30min)
**Objetivo:** Restaurar funcionalidad de guest chat para INDO mientras desarrollamos fix sistémico

**Entregables:**
- Reserva de INDO actualizada con accommodation_unit_id correcto
- Junction table `reservation_accommodations` poblada para INDO
- Guest chat funcionando para INDO
- Documentación before/after con screenshots de queries

**Archivos a crear/modificar:**
- N/A (solo queries SQL)

**Testing:**
```sql
-- Verificar reserva corregida
SELECT
  gr.external_booking_id,
  gr.guest_name,
  gr.accommodation_unit_id,
  au.name as unit_name
FROM guest_reservations gr
LEFT JOIN hotels.accommodation_units au ON au.id = gr.accommodation_unit_id
WHERE gr.tenant_id = '76785d81-292b-4386-8a97-d6a54abb081d'
  AND gr.external_booking_id = '2432';

-- Verificar junction table
SELECT * FROM reservation_accommodations ra
JOIN guest_reservations gr ON gr.id = ra.reservation_id
WHERE gr.tenant_id = '76785d81-292b-4386-8a97-d6a54abb081d';

-- Test guest chat
-- Manual: Ir a /my-stay de INDO y preguntar sobre alojamientos
```

**Estimado:** 30min

---

### FASE 2: Implementación Fix Sistémico (2-3h)
**Objetivo:** Modificar sync-all para sincronizar accommodations ANTES de reservations, garantizando orden correcto

**Entregables:**
- `sync-all/route.ts` modificado con coordinación de sync
- Import de `MotoPresSyncManager` agregado
- SSE events actualizados para mostrar progreso de ambas fases
- Error handling robusto si accommodations sync falla
- Código documentado con comentarios explicativos

**Archivos a crear/modificar:**
- `src/app/api/integrations/motopress/sync-all/route.ts` (líneas ~2, ~150-176)

**Implementación detallada:**

```typescript
// LÍNEA 2: Agregar import
import { MotoPresSyncManager } from '@/lib/integrations/motopress/sync-manager'

// LÍNEA ~150-176: ANTES de "// 3. Fetch ALL bookings with _embed"
// Agregar esta sección:

// 2.5. SYNC ACCOMMODATIONS FIRST (Fix: Race condition)
// This prevents reservations from being inserted with accommodation_unit_id = NULL
// See: docs/troubleshooting/2025-11-19_MOTOPRESS_MULTI_TENANT_SYNC_FIX.md
await sendEvent({
  type: 'progress',
  message: 'Step 1/2: Syncing accommodations first...'
})

const syncManager = new MotoPresSyncManager()
const accommodationResult = await syncManager.syncAccommodations(tenant_id, false) // forceEmbeddings = false

if (!accommodationResult.success) {
  console.error('[sync-all] ❌ Accommodations sync failed:', accommodationResult.message)
  await sendEvent({
    type: 'error',
    message: `Failed to sync accommodations: ${accommodationResult.message}. Cannot proceed with reservations sync.`
  })
  await writer.close()
  return
}

const totalAccommodations = accommodationResult.created + accommodationResult.updated
console.log(`[sync-all] ✅ Accommodations synced: ${accommodationResult.created} created, ${accommodationResult.updated} updated`)

await sendEvent({
  type: 'progress',
  message: `Step 1/2 Complete: ${totalAccommodations} accommodations synced. Now fetching reservations...`
})

// CONTINUAR con el código existente: "// 3. Fetch ALL bookings with _embed"
```

**Testing:**
```bash
# Build check
pnpm run build

# Type check
pnpm exec tsc --noEmit
```

**Estimado:** 2-3h

---

### FASE 3: Testing Multi-Tenant (1.5-2h)
**Objetivo:** Validar que la solución funciona para CUALQUIER tenant, no solo INDO

**Entregables:**
- Tenant de prueba "TestHotel" creado y sincronizado
- Verificación: 0 reservas con NULL accommodation_unit_id
- Simmer Down re-validado (no se rompió)
- INDO re-sincronizado con nuevo código (validación doble)
- Documentación de resultados con queries y screenshots

**Archivos a crear/modificar:**
- `docs/motopress-sync-fix/fase-3/TESTING_RESULTS.md`

**Testing plan:**

**Test 1: Crear tenant de prueba**
```sql
-- Crear tenant "TestHotel" en tenant_registry
-- Configurar integración MotoPress para TestHotel
-- Ejecutar sync-all
```

**Test 2: Validar TestHotel**
```sql
-- QUERY: Verificar que TODAS las reservas tienen accommodation_unit_id
SELECT
  COUNT(*) as total_reservations,
  COUNT(accommodation_unit_id) as reservations_with_unit,
  COUNT(*) - COUNT(accommodation_unit_id) as reservations_with_null
FROM guest_reservations
WHERE tenant_id = '{test_tenant_id}';
-- Esperado: reservations_with_null = 0

-- QUERY: Verificar junction table completa
SELECT COUNT(*) FROM reservation_accommodations ra
JOIN guest_reservations gr ON gr.id = ra.reservation_id
WHERE gr.tenant_id = '{test_tenant_id}';
-- Esperado: COUNT = total_reservations (o más si multi-room)
```

**Test 3: Re-validar Simmer Down**
```sql
-- QUERY: Verificar que Simmer Down no se rompió
SELECT
  COUNT(*) as total,
  COUNT(accommodation_unit_id) as with_unit
FROM guest_reservations
WHERE tenant_id = 'b13c8fae-4309-4983-8952-75c58cf10023';
-- Esperado: total = with_unit = 101
```

**Test 4: Re-sync INDO con nuevo código**
```sql
-- MANUAL: Ejecutar sync-all para INDO desde UI
-- QUERY: Verificar que TODO sigue correcto
SELECT
  gr.external_booking_id,
  gr.guest_name,
  gr.accommodation_unit_id,
  au.name as unit_name
FROM guest_reservations gr
JOIN hotels.accommodation_units au ON au.id = gr.accommodation_unit_id
WHERE gr.tenant_id = '76785d81-292b-4386-8a97-d6a54abb081d';
-- Esperado: Todas las reservas con unit_name válido
```

**Test 5: Guest Chat manual**
```bash
# Manual testing:
# 1. Ir a /my-stay de TestHotel
# 2. Autenticarse con reserva válida
# 3. Preguntar: "¿Qué tipo de habitación tengo?"
# 4. Verificar que responde correctamente con nombre de accommodation
```

**Estimado:** 1.5-2h

---

### FASE 4: Mejoras Futuras Opcionales (1-2h)
**Objetivo:** Prevenir que el problema vuelva a ocurrir y mejorar visibilidad

**Entregables:**
- Validación preventiva en bookings-mapper (fallar early si no hay units)
- Query de monitoring para detectar NULL reservations
- Documentación de orden correcto en código
- (Opcional) UI mejorada con indicador de progreso por etapas

**Archivos a crear/modificar:**
- `src/lib/integrations/motopress/bookings-mapper.ts` (líneas 166-188)
- `scripts/monitor-null-reservations.ts` (nuevo)
- `docs/motopress-sync-fix/PREVENTION_GUIDE.md` (nuevo)

**Mejora 1: Validación preventiva en mapper**
```typescript
// En bookings-mapper.ts línea ~166-188
// ANTES de asignar NULL, verificar si esto es aceptable:

if (!accommodationUnitId && motopressTypeId) {
  console.warn(`[mapper] ⚠️ VALIDATION: No unit found for motopress_type_id=${motopressTypeId}`)
  console.warn(`[mapper] This reservation will be created with NULL accommodation_unit_id`)
  console.warn(`[mapper] Ensure accommodations were synced BEFORE reservations`)
  // NO cambiar comportamiento (sigue siendo NULL), solo advertencia
}
```

**Mejora 2: Monitoring query**
```typescript
// scripts/monitor-null-reservations.ts
// Query para ejecutar periódicamente (cron/monitoring)
const nullReservations = await supabase
  .from('guest_reservations')
  .select('tenant_id, external_booking_id, guest_name, created_at')
  .is('accommodation_unit_id', null)

if (nullReservations.data && nullReservations.data.length > 0) {
  console.error(`🚨 ALERT: ${nullReservations.data.length} reservations with NULL accommodation_unit_id`)
  // Enviar alerta a admin
}
```

**Mejora 3: Documentación en código**
```typescript
// En sync-all/route.ts al inicio del archivo:
/**
 * MotoPress Complete Sync API Endpoint with Server-Sent Events (SSE)
 *
 * IMPORTANT: Sync order is CRITICAL to avoid race conditions
 *
 * Correct order:
 * 1. Sync accommodations FIRST (via MotoPresSyncManager)
 * 2. Sync reservations SECOND (current endpoint logic)
 *
 * Why? Reservations reference accommodations via FK (accommodation_unit_id).
 * If accommodations don't exist when mapping reservations, they get NULL FK.
 *
 * See: docs/troubleshooting/2025-11-19_MOTOPRESS_MULTI_TENANT_SYNC_FIX.md
 */
```

**Mejora 4: UI Progress (Opcional)**
```typescript
// Mejorar SSE events para mostrar progreso por etapas:
await sendEvent({
  type: 'progress',
  message: 'Step 1/2: Syncing accommodations...',
  current: 0,
  total: 2,
  stage: 'accommodations'
})

// ... después de accommodations sync

await sendEvent({
  type: 'progress',
  message: 'Step 2/2: Syncing reservations...',
  current: 1,
  total: 2,
  stage: 'reservations'
})
```

**Testing:**
```bash
# Test monitoring script
pnpm dlx tsx scripts/monitor-null-reservations.ts

# Verificar warnings en logs durante sync
# (ejecutar sync y verificar console.warn aparece)
```

**Estimado:** 1-2h

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] INDO: Reserva corregida, accommodation_unit_id válido
- [ ] INDO: Junction table poblada correctamente
- [ ] INDO: Guest chat responde sobre alojamientos
- [ ] sync-all: Sincroniza accommodations ANTES de reservations
- [ ] TestHotel: 0 reservas con NULL accommodation_unit_id
- [ ] Simmer Down: Sigue funcionando (101 reservas OK)
- [ ] Build exitoso sin errores TypeScript

### Performance
- [ ] Sync no se vuelve significativamente más lento (aceptable: +10-20s por sync de accommodations)
- [ ] SSE events fluyen correctamente (no timeouts)
- [ ] No hay memory leaks en proceso de sync

### Multi-Tenant
- [ ] Solución funciona para CUALQUIER tenant (no hardcoded)
- [ ] No rompe tenants existentes (Simmer Down validado)
- [ ] Nuevos tenants no sufren race condition

### Prevención
- [ ] Warnings claros en logs si se detecta problema potencial
- [ ] Documentación en código explica orden correcto
- [ ] Monitoring query disponible para detectar NULL reservations

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-backend-developer** (Principal)
**Responsabilidad:** Modificar sync-all para coordinar orden de sincronización

**Tareas:**
- FASE 0: Leer y analizar código existente
- FASE 2: Implementar fix sistémico en sync-all/route.ts
- FASE 4: Agregar validaciones y monitoring

**Archivos:**
- `src/app/api/integrations/motopress/sync-all/route.ts`
- `src/lib/integrations/motopress/bookings-mapper.ts`
- `scripts/monitor-null-reservations.ts`

---

### 2. **@agent-database-agent** (Secundario)
**Responsabilidad:** Ejecutar fix temporal SQL y validaciones de testing

**Tareas:**
- FASE 1: Ejecutar SQL para corregir INDO
- FASE 3: Ejecutar queries de validación multi-tenant

**Archivos:**
- N/A (solo queries SQL via MCP tools)

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/muva-chat/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── integrations/
│   │           └── motopress/
│   │               └── sync-all/
│   │                   └── route.ts (MODIFICAR)
│   └── lib/
│       └── integrations/
│           └── motopress/
│               ├── sync-manager.ts (LEER - ya existe)
│               └── bookings-mapper.ts (MODIFICAR - FASE 4)
├── scripts/
│   └── monitor-null-reservations.ts (CREAR - FASE 4)
└── docs/
    ├── troubleshooting/
    │   └── 2025-11-19_MOTOPRESS_MULTI_TENANT_SYNC_FIX.md (YA EXISTE)
    └── motopress-sync-fix/
        ├── plan.md (ESTE ARCHIVO)
        ├── TODO.md
        ├── motopress-sync-fix-prompt-workflow.md
        ├── fase-0/
        │   └── ANALYSIS.md
        ├── fase-1/
        │   ├── IMPLEMENTATION.md
        │   └── INDO_FIX_RESULTS.md
        ├── fase-2/
        │   ├── IMPLEMENTATION.md
        │   ├── CHANGES.md
        │   └── CODE_DIFF.md
        ├── fase-3/
        │   ├── TESTING_RESULTS.md
        │   └── VALIDATION_QUERIES.sql
        └── fase-4/
            ├── PREVENTION_GUIDE.md
            └── MONITORING_SETUP.md
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

**1. Race Condition Root Cause**
- NO es solo timing (0.3s)
- Es un fallo de DISEÑO: orden incorrecto de operaciones
- Auto-creación en saveReservationAccommodations es "demasiado tarde"
- Reserva ya se insertó con NULL antes de auto-crear unit

**2. Por qué Simmer Down funcionó (mayormente)**
- Usuario probablemente ejecutó sync de accommodations primero (manualmente)
- Primeras 4 reservas tienen race condition pero fueron recuperadas
- Resto de reservas encontraron units ya existentes

**3. SSE (Server-Sent Events)**
- sync-all usa SSE para evitar timeouts en sync largos
- Debemos mantener writer.write() para progress events
- NO cerrar writer antes de tiempo (causa broken pipe)

**4. MotoPresSyncManager**
- Ya existe y funciona correctamente
- syncAccommodations() retorna SyncResult con created/updated/errors
- forceEmbeddings = false (no regenerar embeddings en este fix)

**5. Testing Strategy**
- NO crear branch de Supabase (testing directo en DEV)
- Crear tenant dedicado "TestHotel" para testing
- Re-validar Simmer Down (no romper lo que funciona)
- Re-sync INDO con nuevo código (doble validación)

**6. FASE 4 es Opcional**
- Si time budget es limitado, se puede posponer
- FASE 1-3 son suficientes para resolver el problema
- FASE 4 mejora prevención pero no es crítica

### Análisis de Opus (Base de este plan)

El análisis exhaustivo de Opus identificó:
- ✅ Causa raíz: Race condition por diseño
- ✅ Evidencia: Timestamps muestran reserva ANTES de unit
- ✅ Solución: Coordinar en sync-all (Opción A)
- ✅ Fix temporal: SQL para INDO mientras desarrollamos
- ✅ Testing: Multi-tenant con tenant de prueba

Este plan implementa TODAS las recomendaciones de Opus.

---

**Última actualización:** November 19, 2025
**Próximo paso:** Crear TODO.md con tareas específicas por fase
**Estimado total:** 5.5-8h (FASE 0-3: 4.5-6h | FASE 4 opcional: 1-2h)