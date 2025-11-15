# Fix: Error 404 en API de Manuales - ID Mapping Issue

**Fecha:** November 9, 2025
**Severity:** High (bloqueaba funcionalidad completa)
**Status:** ✅ RESUELTO

---

## Problema Reportado

Usuario reportaba errores 404 constantes al intentar cargar manuales:

```
GET /api/accommodation-manuals/7d9f480d-cd8d-44a5-b0e4-2e27b4889ec0 404
GET /api/accommodation-manuals/ebd3aaeb-9a47-4184-9b09-3d1a4dc2627d 404
GET /api/accommodation-manuals/41e7b26b-addf-46fc-86e9-7536cc56cae4 404
```

Error en consola: `Failed to fetch manuals`

---

## Causa Raíz Identificada

**Inconsistencia de IDs entre dos tablas:**

### Tabla 1: `accommodation_units_public` (Chunks para AI/embeddings)
- **Propósito:** Vector search, guest chat
- **ID Format:** UUID v4 (gen_random_uuid())
- **Ejemplo:** `7d9f480d-cd8d-44a5-b0e4-2e27b4889ec0`
- **Acceso:** PostgREST (schema `public`)

### Tabla 2: `hotels.accommodation_units` (Source of truth)
- **Propósito:** Manuals FK, reservations FK, operaciones
- **ID Format:** UUID v5 (deterministic)
- **Ejemplo:** `dfe8772e-93ee-5949-8768-b45ec1b04f8a`
- **Acceso:** SQL directo / RPC (schema `hotels`)

### El Problema

```typescript
// AccommodationUnitsGrid.tsx (ANTES del fix)
<AccommodationManualsSection
  unitId={unit.id}  // ❌ ID de accommodation_units_public
  ...
/>

// API fetch
fetch(`/api/accommodation-manuals/${unitId}`)
// → /api/accommodation-manuals/7d9f480d-cd8d-...

// FK Constraint en accommodation_manuals
accommodation_unit_id REFERENCES hotels.accommodation_units(id)
//                     Espera: dfe8772e-93ee-... (hotels)
//                     Recibe: 7d9f480d-cd8d-... (public) ❌ NO EXISTE
```

**Resultado:** 404 Not Found (FK no existe en tabla hotels)

---

## Solución Implementada

### 1. Agregar campo `original_unit_id` al API response

**Archivo:** `src/app/api/accommodations/units/route.ts`

**Cambio 1:** Crear mapping name → hotels ID

```typescript
// Get mapping from unit name to hotels.accommodation_units.id
const uniqueNames = [...new Set(
  fallbackData
    .map(chunk => chunk.metadata?.original_accommodation || chunk.name.split(' - ')[0])
    .filter(Boolean)
)]

const { data: hotelsUnits } = await supabase.rpc('get_accommodation_units', {
  p_hotel_id: null,
  p_tenant_id: tenantId
})

const nameToHotelsId = new Map(
  (hotelsUnits || [])
    .filter(u => u.name && uniqueNames.includes(u.name))
    .map(u => [u.name, u.id])
)

console.log(`[Accommodations Units API] ✅ Mapped ${nameToHotelsId.size} unit names to hotels IDs`)
```

**Cambio 2:** Agregar `original_unit_id` al response

```typescript
if (!acc[baseName]) {
  const originalUnitId = nameToHotelsId.get(baseName) || null

  acc[baseName] = {
    ...chunk,
    id: chunk.unit_id,  // Mantener para vector search
    original_unit_id: originalUnitId,  // NUEVO: Para manuals FK
    name: baseName,
    // ...
  }
}
```

**IMPORTANTE:** Se aplicó en AMBOS paths del API:
- Path 1: Cuando RPC `get_accommodation_units_by_tenant` falla (fallback)
- Path 2: Cuando RPC tiene éxito (línea 265+)

### 2. Usar `original_unit_id` en componente

**Archivo:** `src/components/Accommodation/AccommodationUnitsGrid.tsx`

**TypeScript Interface:**
```typescript
interface AccommodationUnit {
  id: string
  original_unit_id?: string  // NUEVO: ID from hotels.accommodation_units
  name: string
  // ...
}
```

**Uso:**
```typescript
<AccommodationManualsSection
  unitId={unit.original_unit_id || unit.id}  // Preferir original_unit_id
  tenantId={tenant?.tenant_id || ''}
  onViewContent={(manualId) => {
    setManualModalId(manualId)
    setManualModalUnitId(unit.original_unit_id || unit.id)  // Idem
  }}
/>
```

---

## Validación

### Antes del Fix
```bash
curl http://localhost:3001/api/accommodations/units | jq '.data[0]'
{
  "name": "Sunshine",
  "id": "52e27bf8-79fc-48e5-a3d0-ffb859ce043c",  # ← accommodation_units_public
  # ❌ No original_unit_id
}

# Resultado: 404 al buscar manuals con ese ID
```

### Después del Fix
```bash
curl http://localhost:3001/api/accommodations/units | jq '.data[0]'
{
  "name": "Sunshine",
  "id": "52e27bf8-79fc-48e5-a3d0-ffb859ce043c",  # ← Para vector search
  "original_unit_id": "dfe8772e-93ee-5949-8768-b45ec1b04f8a"  # ✅ Para manuals FK
}

# Resultado: ✅ 200 OK al buscar manuals
```

### Verificación en DB
```sql
-- Confirmar que el ID correcto tiene manuals
SELECT
  am.accommodation_unit_id,
  am.filename,
  au.name
FROM accommodation_manuals am
JOIN hotels.accommodation_units au ON au.id = am.accommodation_unit_id
WHERE am.tenant_id = '7ecdd0cc-a3f6-4a45-94a9-a4fc73390920';

-- Resultado:
-- accommodation_unit_id: dfe8772e-93ee-5949-8768-b45ec1b04f8a (✅ Correcto)
-- filename: test-manual.md
-- name: Sunshine
```

---

## Archivos Modificados

1. **src/app/api/accommodations/units/route.ts**
   - Agregado mapping name → hotels ID
   - Agregado campo `original_unit_id` en response
   - Aplicado en ambos code paths (RPC success + fallback)

2. **src/components/Accommodation/AccommodationUnitsGrid.tsx**
   - Agregado `original_unit_id?` al interface `AccommodationUnit`
   - Cambiado `unitId={unit.id}` → `unitId={unit.original_unit_id || unit.id}`
   - Aplicado en prop y en modal state

---

## Comportamiento Esperado

### Unidades CON manuals
- **Sunshine**: Muestra lista de manuals, botón "Ver" abre modal → ✅ 200 OK

### Unidades SIN manuals
- **Dreamland, Kaya, etc.**: Muestra empty state (dropzone) → ✅ 200 OK (lista vacía)

**NINGUNA** tarjeta debe mostrar error 404.

---

## Lecciones Aprendidas

1. **Dos tablas, dos propósitos:**
   - `accommodation_units_public`: Optimizada para AI (chunks, embeddings)
   - `hotels.accommodation_units`: Source of truth para operaciones (manuals, reservations)

2. **FK constraints requieren IDs consistentes:**
   - Manuals FK → `hotels.accommodation_units.id`
   - No se puede usar ID de tabla pública para FK de tabla hotels

3. **Mapping por nombre es suficiente:**
   - RPC function `get_accommodation_units` no devuelve `motopress_unit_id`
   - Mapping por `name` funciona perfectamente (nombres son únicos por tenant)

4. **Code duplication en API routes:**
   - Cuando hay múltiples code paths, aplicar cambios en TODOS
   - En este caso: RPC success path + RPC fallback path

---

## Próximos Pasos

1. ✅ **Testing completo** en `localhost:3001/accommodations/units`
2. ✅ **Verificar manuals list** carga sin errores
3. ✅ **Probar upload** de nuevo manual
4. ✅ **Probar modal** de contenido con chunks
5. ⏳ **Deploy a staging** cuando esté aprobado

---

**Status Final:** ✅ ERROR RESUELTO - Sistema funcional

**Autor:** Claude Code (ux-interface + investigación)
**Reviewer Pendiente:** Usuario (oneill)
