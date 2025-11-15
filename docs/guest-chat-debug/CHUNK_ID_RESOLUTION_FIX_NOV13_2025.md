# Fix: Chunk ID Resolution en get_accommodation_unit_by_id RPC

**Status:** ✅ Resuelto
**Date:** November 13, 2025
**Environment:** Staging (`hoaiwcueleiemeplrurv`)
**Related Migrations:**
- `20251113000000_fix_get_accommodation_units_search_path.sql`
- `20251113000001_fix_get_accommodation_unit_by_id_search_path.sql`
- `20251113000002_fix_get_accommodation_unit_by_id_chunk_resolution.sql`

---

## 🔴 Problema

### Síntomas Observados

1. **My-stay header sin nombre de alojamiento**
   - Header mostraba solo "Alojamiento" sin el nombre del unit
   - Antes mostraba "Alojamiento Simmer Highs - Overview" (con sufijo incorrecto)

2. **Manual chunks no funcionan en guest chat**
   - Preguntas sobre WiFi, claves, check-in → respuesta genérica "no tengo información"
   - A pesar de tener 17 chunks de manual para Simmer Highs con embeddings válidos

3. **Logs muestran "Loaded 0 accommodations"**
   ```
   [guest-auth] ⚠️ Old JWT format detected, fetching data from DB...
   [guest-auth] ✅ Loaded 0 accommodations (fallback):
   [Chat Engine] No accommodation assigned to guest
   [Chat Engine] ⚠️ No accommodations assigned - skipping unit manual search
   ```

4. **Vector search no busca en domain_3_unit_manual**
   ```
   [Chat Engine] Search strategy (3 Domains): {
     domain_1_muva: true,
     domain_2_hotel_general: true,
     domain_3_unit_manual: false,  // ❌ SKIPPED
     accommodation_public: true,
     tenant: '918c134b-ad61-498b-957c-8cf11fd992cf',
     unit_id: 'not_assigned'
   }
   ```

---

## 🔍 Root Cause Analysis

### Arquitectura del Problema

El sistema tiene **dos niveles de datos de accommodation units**:

1. **`hotels.accommodation_units`** (Tabla Real)
   - Units completos sin chunking
   - Nombres limpios: "Simmer Highs", "Dreamland", etc.
   - IDs tipo: `7aaed98f-d30a-5135-bee7-e6c85bb717c2`

2. **`accommodation_units_public`** (Tabla de Chunks Semánticos)
   - Units divididos por secciones: "Overview", "Amenities", "Features", etc.
   - Nombres con sufijos: "Simmer Highs - Overview", "Simmer Highs - Amenities"
   - IDs tipo: `d8abb241-1586-458f-be0d-f2f9bf60fe32`
   - **Metadata incluye:** `motopress_unit_id` para resolver a unit real

### El Problema de Foreign Keys

```sql
-- guest_reservations tiene FK a accommodation_units_public (chunks)
guest_reservations.accommodation_unit_id
  → FK: accommodation_units_public.unit_id

-- Ejemplo de datos:
Reservation: f018831c-d8f2-4a57-be7f-cd743540bf27
  ├── guest_name: "Valentina Atenógena"
  ├── accommodation_unit_id: d8abb241-1586-458f-be0d-f2f9bf60fe32  ← CHUNK ID
  └── tenant_id: 918c134b-ad61-498b-957c-8cf11fd992cf

-- Pero el RPC busca en hotels.accommodation_units (units reales)
get_accommodation_unit_by_id(p_unit_id := 'd8abb241-1586-458f-be0d-f2f9bf60fe32')
  → SELECT FROM hotels.accommodation_units WHERE id = 'd8abb241...'
  → ❌ NOT FOUND (ese ID no existe en units reales)
  → Returns: []
```

### Cadena de Fallos

1. **Guest auth fetch** (`src/lib/guest-auth.ts` línea 128-148)
   ```typescript
   const { data: units } = await supabase.rpc('get_accommodation_unit_by_id', {
     p_unit_id: reservation.accommodation_unit_id,  // ← chunk ID
     p_tenant_id: tenant_id
   })
   // units = [] porque RPC no encuentra el chunk ID
   ```

2. **Session sin accommodation**
   ```typescript
   const session: GuestSession = {
     // ...
     accommodation_unit: undefined,  // ❌ No unit data
     accommodation_units: []          // ❌ Empty array
   }
   ```

3. **Chat engine sin contexto de accommodation**
   ```typescript
   // conversational-chat-engine.ts línea 85
   const accommodationContext = guestPermissions.accommodation
   // → undefined

   // Línea 117
   if (!accommodationContext) {
     console.log('[Chat Engine] No accommodation assigned to guest')
     // ❌ Skips unit manual search
   }
   ```

---

## ✅ Solución Implementada

### Fix #1: Agregar 'hotels' al search_path de RPCs

**Problema:** RPCs tenían `search_path='public'` pero consultaban `hotels.accommodation_units`

**Solución:**
```sql
-- Migración: 20251113000000_fix_get_accommodation_units_search_path.sql
CREATE OR REPLACE FUNCTION "public"."get_accommodation_units"(...)
SET "search_path" TO 'public', 'hotels', 'pg_temp'  -- ✅ Added 'hotels'
AS $$
  SELECT ... FROM hotels.accommodation_units au  -- Ahora accesible
$$;

-- Migración: 20251113000001_fix_get_accommodation_unit_by_id_search_path.sql
CREATE OR REPLACE FUNCTION "public"."get_accommodation_unit_by_id"(...)
SET "search_path" TO 'public', 'hotels', 'pg_temp'  -- ✅ Added 'hotels'
AS $$
  SELECT ... FROM hotels.accommodation_units au  -- Ahora accesible
$$;
```

### Fix #2: Resolver Chunk IDs a Unit IDs Reales

**Problema:** Reservas con chunk IDs (`accommodation_units_public`) pero RPC solo buscaba unit IDs (`hotels.accommodation_units`)

**Solución:** Agregar lógica de fallback al RPC

```sql
-- Migración: 20251113000002_fix_get_accommodation_unit_by_id_chunk_resolution.sql
CREATE OR REPLACE FUNCTION "public"."get_accommodation_unit_by_id"(
  "p_unit_id" "uuid",
  "p_tenant_id" character varying
)
RETURNS TABLE(...)
AS $$
DECLARE
  v_motopress_unit_id INTEGER;
BEGIN
  -- 1️⃣ Intenta lookup directo en hotels.accommodation_units
  RETURN QUERY
  SELECT au.id, au.name, au.unit_number, au.view_type
  FROM hotels.accommodation_units au
  WHERE au.id = p_unit_id AND au.tenant_id = p_tenant_id;

  IF FOUND THEN RETURN; END IF;  -- ✅ Found real unit, done

  -- 2️⃣ No encontrado → verificar si es chunk ID
  SELECT (metadata->>'motopress_unit_id')::INTEGER
  INTO v_motopress_unit_id
  FROM accommodation_units_public
  WHERE unit_id = p_unit_id AND tenant_id = p_tenant_id::uuid;

  -- 3️⃣ Si encontró motopress_unit_id, resolver a unit real
  IF v_motopress_unit_id IS NOT NULL THEN
    RETURN QUERY
    SELECT au.id, au.name, au.unit_number, au.view_type
    FROM hotels.accommodation_units au
    WHERE au.motopress_unit_id = v_motopress_unit_id
      AND au.tenant_id = p_tenant_id;
  END IF;

  RETURN;
END;
$$;
```

### Flujo de Resolución

```
Input: chunk ID d8abb241-1586-458f-be0d-f2f9bf60fe32
  ↓
Step 1: Buscar en hotels.accommodation_units
  ❌ Not found
  ↓
Step 2: Buscar en accommodation_units_public
  ✅ Found chunk "Simmer Highs - Overview"
  metadata.motopress_unit_id = 335
  ↓
Step 3: Buscar unit real con motopress_unit_id = 335
  ✅ Found: 7aaed98f-d30a-5135-bee7-e6c85bb717c2
  name = "Simmer Highs" (clean, sin " - Overview")
  ↓
Output: { id: "7aaed98f...", name: "Simmer Highs", ... }
```

---

## 🧪 Testing & Validación

### Test 1: RPC con Chunk ID

```sql
-- Input: chunk ID (d8abb241... = "Simmer Highs - Overview")
SELECT id, name, unit_number, view_type
FROM get_accommodation_unit_by_id(
  p_unit_id := 'd8abb241-1586-458f-be0d-f2f9bf60fe32',
  p_tenant_id := '918c134b-ad61-498b-957c-8cf11fd992cf'
);

-- Output: ✅ Resuelve a unit real
-- id: 7aaed98f-d30a-5135-bee7-e6c85bb717c2
-- name: "Simmer Highs" (clean)
```

### Test 2: RPC con Unit ID Real

```sql
-- Input: unit ID real (7aaed98f... = "Simmer Highs")
SELECT id, name
FROM get_accommodation_unit_by_id(
  p_unit_id := '7aaed98f-d30a-5135-bee7-e6c85bb717c2',
  p_tenant_id := '918c134b-ad61-498b-957c-8cf11fd992cf'
);

-- Output: ✅ Direct lookup exitoso
-- id: 7aaed98f-d30a-5135-bee7-e6c85bb717c2
-- name: "Simmer Highs"
```

### Test 3: My-stay Login + Chat

**Pasos:**
1. Logout de My-stay (para forzar nuevo JWT)
2. Login: check-in `2025-11-14`, últimos 4 dígitos de teléfono
3. Verificar header: debe mostrar "Alojamiento Simmer Highs" ✅
4. Preguntar: "¿Cuál es la clave del WiFi?"
5. Verificar respuesta incluye info del manual ✅

**Logs esperados:**
```
[guest-auth] ✅ Loaded 1 accommodations:  // ← Ya NO es 0
[guest-auth] Loaded accommodation: Simmer Highs
[Chat Engine] Search strategy (3 Domains): {
  domain_3_unit_manual: true,  // ✅ Now enabled
  unit_id: '7aaed98f-d30a-5135-bee7-e6c85bb717c2'
}
[Chat Engine] Vector search completed { unit_manual: 3 }  // ✅ Found chunks
```

---

## 🎯 Prevention & Lessons Learned

### DO ✅

1. **Validar search_path en RPCs después de migraciones**
   ```sql
   SELECT proname, array_to_string(proconfig, ',') AS config
   FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public'
     AND p.proname LIKE '%accommodation%';
   ```

2. **Validar chunk ID resolution**
   ```bash
   pnpm run validate:rpc -- --env=staging
   ```

3. **Testing después de sincronización de units**
   - Cuando sincronizas units desde cero, los IDs cambian
   - Las reservas existentes pueden quedar con chunk IDs huérfanos
   - Siempre probar guest auth después de sync

4. **Verificar FK architecture**
   ```sql
   -- Check FK constraints
   SELECT tc.constraint_name, ccu.table_name AS foreign_table
   FROM information_schema.table_constraints tc
   JOIN information_schema.constraint_column_usage ccu
     ON tc.constraint_name = ccu.constraint_name
   WHERE tc.table_name = 'guest_reservations';
   ```

### DON'T ❌

1. **NO asumir que `execute_sql` RPC aplica DDL correctamente**
   - CREATE OR REPLACE FUNCTION no siempre se ejecuta correctamente vía RPC
   - Usar `mcp__supabase__apply_migration` para migraciones

2. **NO ignorar "Loaded 0 accommodations" en logs**
   - Es señal clara de problema en RPC resolution
   - Verificar inmediatamente el RPC

3. **NO modificar FK constraints sin actualizar RPCs**
   - Si `guest_reservations.accommodation_unit_id` apunta a `accommodation_units_public`
   - Entonces RPC debe saber resolver chunk IDs

### Archivos Críticos

| Archivo | Propósito | Impacto si se modifica |
|---------|-----------|------------------------|
| `src/lib/guest-auth.ts` | Fetch accommodation data durante login | Si falla → 0 accommodations |
| `supabase/migrations/2025111300000*.sql` | RPC search_path y chunk resolution | Si revierte → manual chunks broken |
| `guest_reservations.accommodation_unit_id` | FK a accommodation_units_public | Si cambia → actualizar RPC |

---

## 📚 Referencias

### Migrations Aplicadas
- `supabase/migrations/20251113000000_fix_get_accommodation_units_search_path.sql`
- `supabase/migrations/20251113000001_fix_get_accommodation_unit_by_id_search_path.sql`
- `supabase/migrations/20251113000002_fix_get_accommodation_unit_by_id_chunk_resolution.sql`

### Documentación Relacionada
- [PREVENTION_SYSTEM.md](./PREVENTION_SYSTEM.md) - 4-layer prevention system para RPC validation
- [FIX_APPLIED_NOV6_2025.md](./FIX_APPLIED_NOV6_2025.md) - Fix anterior de search_path (mismo root cause)
- [../troubleshooting/RESERVATION_ACCOMMODATION_NAMES_FIX.md](../troubleshooting/RESERVATION_ACCOMMODATION_NAMES_FIX.md) - Fix de "Sin nombre" en reservation cards

### Código Fuente
- `src/lib/guest-auth.ts` (líneas 128-192) - Accommodation fetch logic
- `src/lib/conversational-chat-engine.ts` (líneas 85-120) - Accommodation context usage
- `src/components/Chat/GuestChatInterface.tsx` (línea 1195) - Header display

### Database Schema
- `hotels.accommodation_units` - Units reales
- `accommodation_units_public` - Chunks semánticos
- `guest_reservations` - FK a accommodation_units_public

---

## 🔄 Status Timeline

| Date | Event | Status |
|------|-------|--------|
| Nov 13, 2025 | Issue reported: "Loaded 0 accommodations" | 🔴 Broken |
| Nov 13, 2025 | Root cause identified: chunk ID vs unit ID mismatch | 🔍 Investigating |
| Nov 13, 2025 | Fix #1: search_path migration applied | 🟡 Partial fix |
| Nov 13, 2025 | Fix #2: chunk resolution migration applied | ✅ Resolved |
| Nov 13, 2025 | Testing: My-stay header + manual chunks working | ✅ Verified |

---

**Última actualización:** November 13, 2025
**Verificado en:** Staging (`hoaiwcueleiemeplrurv`)
**Status:** ✅ Resuelto y documentado
