# Plan de Ejecución: Fix MyStay Accommodation Header (Multi-Tenant)

**Fecha de Creación:** 2025-11-17
**Autor:** Claude Code Investigation
**Estado:** READY TO EXECUTE
**Prioridad:** ALTA
**Scope:** 1,000+ tenants (escalable)

---

## 📋 RESUMEN EJECUTIVO

### Problema
MyStay chat header no muestra el nombre del alojamiento para algunos tenants (tucasaenelmar, casaboutiqueloscedros), mientras que funciona correctamente para simmerdown.

### Causa Raíz Identificada
Las reservations (`guest_reservations`) tienen `accommodation_unit_id = NULL` (0% poblado) en tenants afectados vs. 100% poblado en simmerdown. Esto ocurrió porque las reservations fueron sincronizadas ANTES de que la migración `20251117171052` corrigiera el RPC para consultar la tabla correcta.

### Solución
Re-sincronizar reservations usando el endpoint existente `/api/integrations/motopress/sync-all` que ahora usa el RPC corregido para mapear automáticamente `accommodation_unit_id` de forma dinámica (UUID determinístico).

### Impacto
- **Tenants afectados actuales:** 2 (tucasaenelmar: 230 reservations, casaboutiqueloscedros: 10 reservations)
- **Solución escalable:** Para 1,000+ tenants futuros (sistema de UUIDs determinísticos garantiza 0 hardcodeo)
- **Tiempo estimado:** ~10 min por tenant (re-sync automático)

---

## 🔍 INVESTIGACIÓN COMPLETA

### Datos Confirmados (Query Results)

**Estado Actual de Reservations:**
```sql
SELECT slug, total_reservations, with_accommodation_id, percent_populated
FROM [audit query]

RESULTS:
| Tenant                | Total | With ID | % Poblado |
|-----------------------|-------|---------|-----------|
| simmerdown            | 102   | 102     | 100% ✅   |
| tucasaenelmar         | 230   | 0       | 0% ❌     |
| casaboutiqueloscedros | 10    | 0       | 0% ❌     |
```

**Accommodations en hotels.accommodation_units:**
```sql
| Tenant                | Real Units | Notes                           |
|-----------------------|------------|---------------------------------|
| simmerdown            | 14         | Nombres limpios (ej: "Dreamland") |
| tucasaenelmar         | 15         | Nombres con sufijos (ej: "Serrana Cay DOBLE") |
| casaboutiqueloscedros | 1          | "La casa boutique los cedros"   |
```

**RPC Test (Confirmed Working):**
```sql
SELECT * FROM get_accommodation_unit_by_motopress_id(
  (SELECT tenant_id FROM tenant_registry WHERE slug = 'tucasaenelmar'),
  12419  -- motopress_type_id from logs
);

RESULT:
{
  "id": "5ead190d-ac75-42f2-81a1-d084aa449c76",
  "name": "Serrana Cay DOBLE",
  "motopress_type_id": 12419
}
✅ RPC funciona correctamente
```

### Timeline de Migraciones (Nov 8-17, 2025)

**Phase 1: Nov 8 - Initial Fix (BROKEN)**
- Migration: `20251108044300_fix_get_accommodation_unit_by_motopress_id.sql`
- RPC consultaba: `accommodation_units_public` (tabla de chunks para embeddings)
- Problema: Retornaba chunk UUIDs en vez de accommodation UUIDs

**Phase 2: Nov 17 - THE FIX (WORKING) ✅**
- Migration: `20251117171052_fix_accommodation_lookup_use_hotels_schema.sql`
- RPC consultaba: `hotels.accommodation_units` (Single Source of Truth)
- Resultado: Retorna UUIDs reales de accommodations

**Confirmación:**
```bash
mcp__supabase__list_migrations --project_id iyeueszchbvlutlcmvcb

CONFIRMED: Migration 20251117171052 aplicada en DEV ✅
```

### Por Qué Simmerdown Funciona

1. Reservations sincronizadas **DESPUÉS** de Nov 17
2. RPC ya corregido → retorna UUID real de `hotels.accommodation_units`
3. `guest_reservations.accommodation_unit_id` poblado correctamente
4. Guest login → RPC `get_accommodation_unit_by_id()` → `session.accommodation_unit`
5. Header muestra: "Alojamiento Misty Morning" ✅

### Por Qué Otros Fallan

1. Reservations sincronizadas **ANTES** de Nov 17
2. RPC roto → retornaba chunk UUID de `accommodation_units_public`
3. `guest_reservations.accommodation_unit_id` = NULL o chunk UUID incorrecto
4. Guest login → skip RPC (NULL) → `session.accommodation_unit` undefined
5. Header vacío ❌

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### UUID Determinístico (Garantía de Escalabilidad)

**Función:** `hotels.generate_deterministic_uuid(tenant_id, motopress_unit_id)`

**Implementación:**
```sql
-- supabase/migrations/20250101000000_create_core_schema.sql:84-99
CREATE OR REPLACE FUNCTION hotels.generate_deterministic_uuid(
  p_tenant_id varchar,
  p_motopress_unit_id integer
) RETURNS uuid
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN extensions.uuid_generate_v5(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,  -- Namespace fijo
    p_tenant_id || ':motopress:' || p_motopress_unit_id::text
  );
END;
$$;
```

**Garantías:**
- ✅ Mismo `tenant_id` + `motopress_unit_id` → SIEMPRE mismo UUID
- ✅ NO hardcodeo de UUIDs
- ✅ Re-sync seguro (idempotente)
- ✅ Funciona para tenant 1 o tenant 1,000

### Flujo Completo (Tenant Creation → Guest Login)

```
1. CREATE TENANT
   ↓
   INSERT INTO tenant_registry (tenant_id, slug, ...)

2. SYNC ACCOMMODATIONS
   ↓
   MotoPresClient.getAccommodations()
   ↓
   FOR EACH accommodation:
     uuid = hotels.generate_deterministic_uuid(tenant_id, motopress_unit_id)
     INSERT INTO hotels.accommodation_units (id, name, motopress_type_id, ...)
   ↓
   Result: 14 units in hotels.accommodation_units (simmerdown)

3. SYNC RESERVATIONS ⭐ CRITICAL STEP
   ↓
   MotoPresClient.getAllBookingsWithEmbed()
   ↓
   MotoPresBookingsMapper.mapBulkBookingsWithEmbed()
   ↓
   FOR EACH booking:
     motopress_type_id = booking.reserved_accommodations[0].accommodation_type
     ↓
     RPC: get_accommodation_unit_by_motopress_id(tenant_id, motopress_type_id)
     ↓
     accommodation_unit_id = RPC_result.id  ⭐ MAPPED HERE
     ↓
     INSERT INTO guest_reservations (accommodation_unit_id, ...)
   ↓
   Result: accommodation_unit_id populated ✅

4. GUEST LOGIN (MyStay)
   ↓
   User enters: check_in_date + phone_last_4
   ↓
   SELECT * FROM guest_reservations WHERE ...
   ↓
   IF accommodation_unit_id IS NOT NULL:
     ↓
     RPC: get_accommodation_unit_by_id(accommodation_unit_id)
     ↓
     session.accommodation_unit = {id, name, unit_number, view_type}
   ↓
   GuestChatInterface.tsx:1193
   ↓
   {session.accommodation_unit && (
     <h1>Alojamiento {session.accommodation_unit.name}</h1>
   )}
```

### Endpoints de Sync Disponibles

**1. POST /api/integrations/motopress/sync-reservations**
- Sync rápido (~300 bookings recientes)
- Timeout: 60s
- Uso: Updates frecuentes

**2. GET /api/integrations/motopress/sync-all** ⭐ RECOMENDADO
- Sync completo con SSE (Server-Sent Events)
- No timeout (streaming)
- Usa `_embed` para data completa
- Proceso:
  1. Test connection (warmup)
  2. Fetch ALL bookings con progress updates
  3. Map via `MotoPresBookingsMapper.mapBulkBookingsWithEmbed()`
  4. Upsert guest_reservations + reservation_accommodations
  5. Log sync_history

**Mapping Automático (No Manual Work):**
```typescript
// src/lib/integrations/motopress/bookings-mapper.ts:166-186
const motopressTypeId = booking.reserved_accommodations[0]?.accommodation_type

const { data: units } = await supabase.rpc('get_accommodation_unit_by_motopress_id', {
  p_tenant_id: tenantId,
  p_motopress_type_id: motopressTypeId  // ⭐ Dynamic mapping
})

if (units && units.length > 0) {
  accommodationUnitId = units[0].id  // ⭐ UUID from hotels.accommodation_units
}

// Line 214: Insert with mapped ID
INSERT INTO guest_reservations (accommodation_unit_id, ...)
```

---

## ✅ SOLUCIÓN PROPUESTA

### Approach: Re-Sync Automático (No Data Migration)

**Ventajas:**
- ✅ 100% automático (NO hardcodeo de UUIDs)
- ✅ Usa sistema existente de UUID determinístico
- ✅ Escalable a 1,000+ tenants
- ✅ Idempotente (safe to re-run)
- ✅ No modifica schema
- ✅ Future-proof (nuevas reservations auto-mapean)

**Por qué NO usar data migration manual:**
- ❌ Requeriría mapeo manual por tenant
- ❌ No escalable a 1,000 tenants
- ❌ Hardcodeo de UUIDs
- ❌ No resuelve root cause
- ❌ Futuras reservations seguirían fallando

---

## 📝 PLAN DE EJECUCIÓN

### Pre-requisitos

**Verificar:**
1. ✅ Migration `20251117171052` aplicada en DEV, TST, PRD
2. ✅ RPC `get_accommodation_unit_by_motopress_id` consulta `hotels.accommodation_units`
3. ✅ Accommodations existen en `hotels.accommodation_units` para cada tenant
4. ✅ MotoPress integration configurada y activa

**Comandos de Verificación:**
```bash
# 1. Check migration
mcp__supabase__list_migrations --project_id <project_id>
# Buscar: 20251117171052_fix_accommodation_lookup_use_hotels_schema

# 2. Test RPC
SELECT * FROM get_accommodation_unit_by_motopress_id(
  (SELECT tenant_id FROM tenant_registry WHERE slug = 'tucasaenelmar'),
  12419
);
# Debe retornar: {id, name, motopress_type_id}

# 3. Check accommodations
SELECT COUNT(*) FROM hotels.accommodation_units
WHERE tenant_id = (SELECT tenant_id::varchar FROM tenant_registry WHERE slug = 'tucasaenelmar');
# Debe retornar: > 0

# 4. Check integration active
SELECT is_active FROM integration_configs
WHERE tenant_id = (SELECT tenant_id FROM tenant_registry WHERE slug = 'tucasaenelmar')
  AND integration_type = 'motopress';
# Debe retornar: true
```

### Paso 1: Re-Sync Tucasaenelmar (230 reservations)

**Método:** Via Admin UI + SSE endpoint

**Comandos:**
```bash
# Option A: Via Browser (RECOMMENDED)
# 1. Login to admin: https://tucasaenelmar.muva.chat/admin
# 2. Navigate to: Integrations → MotoPress
# 3. Click: "Actualizar TODO" (sync-all button)
# 4. Monitor progress in real-time (SSE stream)
# 5. Wait for completion message

# Option B: Via API (if UI unavailable)
# Get staff token first:
# curl https://tucasaenelmar.muva.chat/api/staff/auth/login \
#   -d '{"email":"admin@email.com","password":"xxx"}'
# Then:
curl "https://tucasaenelmar.muva.chat/api/integrations/motopress/sync-all?tenant_id=<tenant_id>&token=<staff_token>"
# Watch SSE stream for progress
```

**Expected Console Logs:**
```
[sync-all] Starting complete sync for tenant: 2263efba-b62b-417b-a422-a84638bc632f
[sync-all] Connection test successful: 15 accommodations found
[sync-all] Fetching bookings with complete data...
[sync-all] Fetched 230 bookings from MotoPress
[sync-all] Mapped 230 reservations
[sync-all] ✅ Complete sync finished: {
  total: 230,
  created: 0,
  updated: 230,  ⭐ All updated with accommodation_unit_id
  errors: 0
}
```

**Verification:**
```sql
-- Check accommodation_unit_id now populated
SELECT
  COUNT(*) as total,
  COUNT(accommodation_unit_id) as with_id,
  ROUND(100.0 * COUNT(accommodation_unit_id) / COUNT(*), 2) as percent
FROM guest_reservations
WHERE tenant_id = '2263efba-b62b-417b-a422-a84638bc632f';

-- Expected: percent = 100.00
```

### Paso 2: Re-Sync Casaboutiqueloscedros (10 reservations)

**Repeat same process as Paso 1** but for casaboutiqueloscedros tenant.

**URL:** `https://casaboutiqueloscedros.muva.chat/admin`

**Expected:**
```
updated: 10
percent_populated: 100.00
```

### Paso 3: Test MyStay Headers

**Tucasaenelmar:**
```bash
# Visit: http://tucasaenelmar.localhost:3000/my-stay
# Enter reservation: check_in_date + phone_last_4
# Expected header: "Alojamiento Serrana Cay DOBLE" (or other unit name)
# Compare with Screenshot #2 (should NOW show accommodation name)
```

**Casaboutiqueloscedros:**
```bash
# Visit: http://casaboutiqueloscedros.localhost:3000/my-stay
# Enter reservation details
# Expected header: "Alojamiento La casa boutique los cedros"
# Compare with Screenshot #1 (simmerdown pattern)
```

**Simmerdown (Regression Test):**
```bash
# Visit: http://simmerdown.localhost:3000/my-stay
# Verify still works (no regression)
# Expected: "Alojamiento Misty Morning" (or other)
```

### Paso 4: Documentar Resultados

**Create:** `docs/troubleshooting/2025-11-17_SYNC_EXECUTION_RESULTS.md`

**Template:**
```markdown
# Sync Execution Results - Nov 17, 2025

## Tucasaenelmar
- Before: 0/230 (0% populated)
- After: 230/230 (100% populated) ✅
- Sync duration: X minutes
- Errors: 0
- Header test: ✅ Shows "Alojamiento [name]"

## Casaboutiqueloscedros
- Before: 0/10 (0% populated)
- After: 10/10 (100% populated) ✅
- Sync duration: X minutes
- Errors: 0
- Header test: ✅ Shows "Alojamiento La casa boutique los cedros"

## Simmerdown (Regression)
- Status: ✅ No changes, still works
- Header test: ✅ Shows "Alojamiento Misty Morning"

## Conclusion
✅ Systematic solution applied successfully
✅ No hardcoded UUIDs
✅ Scalable to 1,000+ tenants
```

---

## ⚠️ RESTRICCIONES Y CONSIDERACIONES

### CRÍTICO: NO Hardcodear UUIDs

**Razón:** Sistema debe escalar a 1,000+ tenants

**Garantías del Sistema Actual:**
- ✅ UUID determinístico: `hotels.generate_deterministic_uuid(tenant_id, motopress_unit_id)`
- ✅ RPC mapping automático: `get_accommodation_unit_by_motopress_id(tenant_id, type_id)`
- ✅ Re-sync idempotente: mismo UUID siempre

**Ejemplos de LO QUE NO HACER:**
```sql
-- ❌ NUNCA HACER ESTO:
UPDATE guest_reservations
SET accommodation_unit_id = '5ead190d-ac75-42f2-81a1-d084aa449c76'
WHERE tenant_id = 'xxx';

-- ✅ SIEMPRE USAR RE-SYNC AUTOMÁTICO:
-- Trigger sync via endpoint → mapper usa RPC → UUID mapeado dinámicamente
```

### Tabla accommodation_units_public NO es Deprecated

**Aclaración Importante:**
- `accommodation_units_public` contiene **chunks para vector search** (embeddings)
- Es **CRÍTICA** para búsqueda semántica en chat
- Los 51 chunks de tucasaenelmar SON NECESARIOS
- ❌ NUNCA eliminar chunks de esta tabla

**Arquitectura Correcta:**
- `hotels.accommodation_units` → Real units (para FKs, header display)
- `accommodation_units_public` → Vector chunks (para AI search)

### Multi-Tenant Isolation

**Garantías:**
- ✅ RPC valida `tenant_id` en WHERE clause
- ✅ UUID namespace incluye `tenant_id`
- ✅ No cross-tenant data leakage

### Performance Considerations

**Sync Duration:**
- ~300 bookings: ~2 minutos
- ~1,000 bookings: ~10 minutos
- SSE stream previene timeouts

**Database Load:**
- Upserts (no deletes)
- Indexed columns (tenant_id, external_booking_id)
- Low impact on production

---

## 🎯 CRITERIOS DE ÉXITO

### Requirement 1: Data Integrity
```sql
-- ALL tenants have 100% accommodation_unit_id populated
SELECT slug,
  ROUND(100.0 * COUNT(accommodation_unit_id) / COUNT(*), 2) as percent
FROM guest_reservations gr
JOIN tenant_registry tr ON tr.tenant_id::varchar = gr.tenant_id
GROUP BY slug;

-- Expected: ALL = 100.00
```

### Requirement 2: Header Display
- ✅ Tucasaenelmar: Header shows "Alojamiento [unit name]"
- ✅ Casaboutiqueloscedros: Header shows "Alojamiento La casa boutique los cedros"
- ✅ Simmerdown: Header still works (regression test)
- ✅ NO "- Overview" suffixes
- ✅ Clean accommodation names

### Requirement 3: Scalability
- ✅ NO hardcoded UUIDs in solution
- ✅ UUID deterministic function works for all tenants
- ✅ Re-sync process automated (no manual mapping)
- ✅ Can be repeated for tenant 1,001, 1,002, etc.

### Requirement 4: Future-Proof
- ✅ New reservations auto-populate accommodation_unit_id
- ✅ Sync process works for future tenants
- ✅ No tenant-specific code or hacks

---

## 🔧 ROLLBACK PLAN

**Si algo falla durante re-sync:**

### Rollback Step 1: Verificar Estado
```sql
-- Check what changed
SELECT COUNT(*) as before_null,
  (SELECT COUNT(*) FROM guest_reservations WHERE accommodation_unit_id IS NOT NULL) as after_populated
FROM guest_reservations
WHERE tenant_id = '<tenant_id>';
```

### Rollback Step 2: Re-Sync Otra Vez
```bash
# Re-sync is idempotent, safe to re-run
# Just trigger sync again via UI or API
```

### Rollback Step 3: Si Persistem Errores
```sql
-- Check sync_history for error details
SELECT * FROM sync_history
WHERE tenant_id = '<tenant_id>'
  AND integration_type = 'motopress'
ORDER BY completed_at DESC
LIMIT 5;

-- Check integration_configs
SELECT is_active, config_data FROM integration_configs
WHERE tenant_id = '<tenant_id>'
  AND integration_type = 'motopress';
```

**Nota:** Re-sync NO borra datos, solo UPDATE. Rollback no requiere restore desde backup.

---

## 📚 REFERENCIAS

### Archivos Clave

**Migrations:**
- `supabase/migrations/20251117171052_fix_accommodation_lookup_use_hotels_schema.sql` - RPC fix
- `supabase/migrations/20250101000000_create_core_schema.sql:84-99` - UUID determinístico

**Code:**
- `src/lib/integrations/motopress/bookings-mapper.ts:166-186` - Accommodation mapping
- `src/lib/integrations/motopress/sync-manager.ts:291-320` - Accommodation sync
- `src/app/api/integrations/motopress/sync-all/route.ts` - Complete sync endpoint
- `src/components/Chat/GuestChatInterface.tsx:1193` - Header display

**RPCs:**
- `get_accommodation_unit_by_motopress_id(tenant_id, type_id)` - Maps type → UUID
- `get_accommodation_unit_by_id(unit_id, tenant_id)` - Fetches unit details
- `hotels.generate_deterministic_uuid(tenant_id, unit_id)` - UUID generation

### Documentos de Investigación

- `docs/troubleshooting/2025-11-17_MANUAL_UPLOAD_FIXES_COMPLETE_REPORT.md` - Migration history
- `docs/troubleshooting/2025-11-17_MULTI_TENANT_ACCOMMODATION_DATA_INVESTIGATION.md` - Data distribution analysis
- Este documento - Plan de ejecución

### Query Results (Data Evidence)

**Audit Query:**
```sql
SELECT slug, total_reservations, percent_populated
FROM [...]

simmerdown:            102 / 102 (100%)
tucasaenelmar:         0 / 230 (0%)
casaboutiqueloscedros: 0 / 10 (0%)
```

**RPC Test:**
```sql
get_accommodation_unit_by_motopress_id(..., 12419)
→ {id: "5ead190d...", name: "Serrana Cay DOBLE"} ✅
```

---

## 🚀 RESUMEN PARA EJECUCIÓN

### TL;DR

**Problema:** MyStay header vacío porque `guest_reservations.accommodation_unit_id = NULL`

**Causa:** Reservations synced antes de que RPC se corrigiera (Nov 17)

**Solución:** Re-sync reservations via `/api/integrations/motopress/sync-all`

**Garantías:**
- ✅ 100% automático (UUID determinístico)
- ✅ NO hardcodeo
- ✅ Escalable a 1,000+ tenants
- ✅ 10 min por tenant

**Comandos:**
1. Admin UI → Integrations → MotoPress → "Actualizar TODO"
2. Verificar: `SELECT COUNT(accommodation_unit_id) / COUNT(*) FROM guest_reservations`
3. Test: Login MyStay → Header muestra nombre

**Success:** Header displays "Alojamiento [name]" para todos los tenants

---

**FIN DEL PLAN**

**Versión:** 1.0
**Última actualización:** 2025-11-17
**Status:** READY TO EXECUTE
**Next:** Ejecutar en nueva conversación siguiendo pasos 1-4
