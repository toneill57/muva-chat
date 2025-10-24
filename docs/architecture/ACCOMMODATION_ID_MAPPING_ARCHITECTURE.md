# Arquitectura de Mapeo de IDs - Sistema de Alojamientos

**Estado**: Crítico - Requiere atención antes de modificar units
**Última actualización**: Octubre 23, 2025
**Problema raíz**: UUIDs volátiles rompen relaciones al recrear units

---

## 🎯 Resumen Ejecutivo

El sistema MUVA utiliza una arquitectura **dual-table** para alojamientos:
- `hotels.accommodation_units`: Datos operacionales (reservas, pricing, MotoPress sync)
- `accommodation_units_public`: Datos de AI/embeddings (búsqueda semántica, guest chat)

**PROBLEMA CRÍTICO**: Cuando se borran y recrean las units, se generan **nuevos UUIDs**, rompiendo:
- ❌ Conexión entre manuales y units
- ❌ Conexión entre chunks de embeddings y units
- ❌ Conexión entre reservas y units (si se recrean antes de check-in)
- ❌ Búsqueda en guest chat (no encuentra manuales)

**SOLUCIÓN ACTUAL**: Mapping dinámico vía `map_hotel_to_public_accommodation_id()` usando **nombre** como identificador estable.

**PROBLEMA CON SOLUCIÓN ACTUAL**: No funciona para manuales que ya están insertados con UUIDs viejos.

---

## 📊 Arquitectura Actual

### Tablas Principales

```
┌─────────────────────────────────┐
│ hotels.accommodation_units      │  ← Source of Truth Operacional
├─────────────────────────────────┤
│ id (UUID) ← VOLÁTIL             │
│ tenant_id                       │
│ name (TEXT) ← ESTABLE           │
│ unit_number (TEXT) ← ESTABLE*   │
│ motopress_id (INT)              │
│ created_at                      │
└─────────────────────────────────┘
         │
         │ Sync Script
         │ (crea nuevos UUIDs)
         ↓
┌─────────────────────────────────┐
│ accommodation_units_public      │  ← Source of Truth AI/Embeddings
├─────────────────────────────────┤
│ unit_id (UUID) ← VOLÁTIL        │
│ tenant_id                       │
│ name (TEXT)                     │
│ metadata->>'original_accommodation' ← ESTABLE
│ metadata->>'motopress_unit_id'  ← ESTABLE*
│ embedding (vector 1024)         │
│ embedding_balanced (vector 1536)│
│ created_at                      │
└─────────────────────────────────┘
         │
         │ Manual Processing
         │ (usa UUID actual)
         ↓
┌─────────────────────────────────┐
│ accommodation_units_manual      │  ← Manuales Completos
├─────────────────────────────────┤
│ unit_id (UUID) FK → public      │  ← PROBLEMA: UUID volátil
│ manual_content (TEXT)           │
│ wifi_password (TEXT)            │
│ embedding (vector 3072)         │
│ embedding_balanced (vector 1536)│
└─────────────────────────────────┘
         │
         │ Chunking Script
         │ (copia unit_id)
         ↓
┌─────────────────────────────────┐
│ accommodation_units_manual_chunks│ ← Chunks para Búsqueda
├─────────────────────────────────┤
│ accommodation_unit_id FK → public│ ← PROBLEMA: UUID volátil
│ chunk_content (TEXT)            │
│ chunk_index (INT)               │
│ section_title (TEXT)            │
│ embedding (vector 3072)         │
│ embedding_balanced (vector 1536)│
│ embedding_fast (vector 1024)    │
└─────────────────────────────────┘
```

\* **CAMPO ESTABLE**: `unit_number` en hotels, `motopress_unit_id` en metadata de public

---

## 🔄 Flujo de Datos Completo

### 1. Sincronización de Units desde MotoPress

```typescript
// scripts/sync-motopress-bookings.ts
const motopressData = await fetchFromMotoPress()

// Crea o actualiza en hotels.accommodation_units
const { data: hotelUnit } = await supabase
  .from('hotels.accommodation_units')
  .upsert({
    // GENERA NUEVO UUID si no existe
    tenant_id: TENANT_ID,
    name: 'Dreamland',          // ← ESTABLE
    unit_number: '317',         // ← ESTABLE (MotoPress ID)
    motopress_id: 317
  })
  .select()

// ID generado: 14fc28a0-f6ac-4789-bc95-47c18bc4bf33 (VOLÁTIL)
```

### 2. Sync a accommodation_units_public

```typescript
// scripts/sync-accommodations-to-public.ts
const { data: publicUnit } = await supabase
  .from('accommodation_units_public')
  .insert({
    // GENERA NUEVO UUID también
    tenant_id: TENANT_ID,
    name: 'Dreamland - Overview',
    metadata: {
      original_accommodation: 'Dreamland',  // ← ESTABLE
      motopress_unit_id: '317'              // ← ESTABLE
    }
  })
  .select()

// ID generado: 7220b0fa-945c-4e53-bafe-a34fc5810b76 (VOLÁTIL)
```

### 3. Procesamiento de Manuales

```typescript
// scripts/process-accommodation-manuals.js
const unitName = 'Dreamland'  // Del frontmatter del manual

// Busca por NOMBRE (estable)
const { data: unitId } = await supabase
  .rpc('get_accommodation_unit_by_name', {
    p_unit_name: unitName,
    p_tenant_id: TENANT_ID
  })
// Devuelve: 14fc28a0-... (hotel UUID VOLÁTIL)

// Inserta en accommodation_units_manual
await supabase
  .from('accommodation_units_manual')
  .upsert({
    unit_id: unitId,  // ← PROBLEMA: UUID volátil guardado
    manual_content: content
  })
```

### 4. Chunking de Manuales

```typescript
// scripts/migrate-manual-to-chunks.js
const { data: manuals } = await supabase
  .from('accommodation_units_manual')
  .select('unit_id, manual_content')

for (const manual of manuals) {
  // Genera chunks
  const chunks = chunkDocument(manual.manual_content)

  await supabase
    .from('accommodation_units_manual_chunks')
    .insert({
      accommodation_unit_id: manual.unit_id,  // ← COPIA UUID volátil
      chunk_content: chunks[0]
    })
}
```

### 5. Guest Chat - Búsqueda de Manuales

```typescript
// src/lib/guest-auth.ts
const { data: units } = await supabase
  .rpc('get_accommodation_unit_by_id', {
    p_unit_id: unitId,  // Del reservation_accommodations
    p_tenant_id: TENANT_ID
  })
// Devuelve: { id: '14fc28a0-...', name: 'Dreamland' }

// src/lib/conversational-chat-engine.ts
const unitManualSearches = accommodationUnits.map(unit =>
  searchUnitManual(queryEmbedding, unit.id, unit.name)
)
// Pasa: '14fc28a0-...' (hotel UUID)

// Dentro de searchUnitManual:
const { data } = await supabase.rpc('match_unit_manual_chunks', {
  query_embedding: embedding,
  p_accommodation_unit_id: unitId  // '14fc28a0-...'
})
```

### 6. Mapping Automático en match_unit_manual_chunks

```sql
-- Función RPC: match_unit_manual_chunks
CREATE OR REPLACE FUNCTION match_unit_manual_chunks(
  query_embedding vector,
  p_accommodation_unit_id uuid,
  match_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 3
) RETURNS TABLE(...) AS $$
DECLARE
  v_public_unit_id uuid;
  v_tenant_id text;
BEGIN
  -- Intenta buscar directamente en accommodation_units_public
  SELECT aup.unit_id INTO v_public_unit_id
  FROM accommodation_units_public aup
  WHERE aup.unit_id = p_accommodation_unit_id
  LIMIT 1;

  -- Si no existe, asume que es hotel ID y mapea
  IF v_public_unit_id IS NULL THEN
    -- Obtiene tenant_id del hotel
    SELECT hu.tenant_id INTO v_tenant_id
    FROM hotels.accommodation_units hu
    WHERE hu.id = p_accommodation_unit_id
    LIMIT 1;

    -- Mapea usando nombre
    IF v_tenant_id IS NOT NULL THEN
      v_public_unit_id := map_hotel_to_public_accommodation_id(
        p_accommodation_unit_id,
        v_tenant_id
      );
    END IF;
  END IF;

  -- Busca chunks con el ID mapeado
  RETURN QUERY
  SELECT * FROM accommodation_units_manual_chunks
  WHERE accommodation_unit_id = v_public_unit_id
  ...
END;
$$;
```

---

## ⚠️ Escenario de Ruptura

### Antes de Borrar Units

```
hotels.accommodation_units
├─ id: 14fc28a0-f6ac-4789-bc95-47c18bc4bf33
├─ name: "Dreamland"
└─ unit_number: "317"

accommodation_units_public
├─ unit_id: 7220b0fa-945c-4e53-bafe-a34fc5810b76
├─ name: "Dreamland - Overview"
└─ metadata: { original_accommodation: "Dreamland", motopress_unit_id: "317" }

accommodation_units_manual
├─ unit_id: 7220b0fa-945c-4e53-bafe-a34fc5810b76  ← Apunta a public UUID
└─ manual_content: "..."

accommodation_units_manual_chunks (265 chunks)
├─ accommodation_unit_id: 7220b0fa-945c-4e53-bafe-a34fc5810b76
└─ chunk_content: "..."

guest_reservations
├─ accommodation_unit_id: 14fc28a0-f6ac-4789-bc95-47c18bc4bf33  ← Hotel UUID
└─ guest_name: "Test Guest"

reservation_accommodations
├─ accommodation_unit_id: 14fc28a0-f6ac-4789-bc95-47c18bc4bf33
└─ reservation_id: ...
```

### Después de Borrar y Recrear Units

```
hotels.accommodation_units
├─ id: 99999999-NEW-UUID-NEW-NEW-NEWNEWNEWNEW  ← NUEVO UUID
├─ name: "Dreamland"  ← MISMO NOMBRE
└─ unit_number: "317"  ← MISMO NÚMERO

accommodation_units_public
├─ unit_id: 88888888-NEW-UUID-NEW-NEW-NEWNEWNEWNEW  ← NUEVO UUID
├─ name: "Dreamland - Overview"
└─ metadata: { original_accommodation: "Dreamland", motopress_unit_id: "317" }

accommodation_units_manual
├─ unit_id: 7220b0fa-945c-4e53-bafe-a34fc5810b76  ← UUID VIEJO (huérfano)
└─ manual_content: "..."  ← FK ROTO

accommodation_units_manual_chunks (265 chunks)
├─ accommodation_unit_id: 7220b0fa-945c-4e53-bafe-a34fc5810b76  ← FK ROTO
└─ chunk_content: "..."  ← NO SE ENCUENTRA

guest_reservations (si se recrearon antes de borrar)
├─ accommodation_unit_id: 99999999-NEW-UUID-NEW-NEW-NEWNEWNEWNEW
└─ guest_name: "Test Guest"

reservation_accommodations
├─ accommodation_unit_id: 99999999-NEW-UUID-NEW-NEW-NEWNEWNEWNEW
└─ reservation_id: ...
```

### Resultado del Flujo de Guest Chat

```typescript
// 1. Guest login
const unitId = '99999999-NEW-UUID-NEW-NEW-NEWNEWNEWNEW'  // Nuevo hotel UUID

// 2. Búsqueda de chunks
match_unit_manual_chunks(embedding, unitId)
  → Mapea usando nombre: "Dreamland"
  → Encuentra: 88888888-NEW-UUID-NEW-NEW-NEWNEWNEWNEW (nuevo public UUID)
  → Busca chunks con ese ID
  → ❌ NO ENCUENTRA (chunks tienen UUID viejo: 7220b0fa-...)
  → Devuelve: []

// 3. Guest chat NO ve los manuales
```

---

## 🔍 Puntos de Falla Identificados

### 1. `process-accommodation-manuals.js:81-94`

**Problema**: Usa `get_accommodation_unit_by_name()` que devuelve hotel UUID volátil

```javascript
async function findUnitIdByName(unitName, tenantId) {
  const { data: unitId } = await supabase.rpc('get_accommodation_unit_by_name', {
    p_unit_name: unitName,
    p_tenant_id: tenantId
  })
  return unitId  // ← UUID de hotels.accommodation_units (volátil)
}
```

**Fix potencial**: Buscar en `accommodation_units_public` por `metadata->>'original_accommodation'`

### 2. `migrate-manual-to-chunks.js:329`

**Problema**: Copia `unit_id` de `accommodation_units_manual` que ya tiene UUID viejo

```javascript
await supabase
  .from('accommodation_units_manual_chunks')
  .insert({
    accommodation_unit_id: manual.unit_id,  // ← Copia UUID viejo
    ...
  })
```

**Fix potencial**: Resolver UUID actual usando nombre o motopress_unit_id

### 3. `map_hotel_to_public_accommodation_id()` - Mapping por Nombre

**Problema**: Solo funciona si el nombre es exactamente igual

```sql
SELECT unit_id INTO v_public_unit_id
FROM accommodation_units_public
WHERE tenant_id::text = p_tenant_id
  AND metadata->>'original_accommodation' = v_hotel_name  -- ← Match exacto
  AND name LIKE v_hotel_name || ' - Overview'
LIMIT 1;
```

**Casos de falla**:
- Variaciones en espacios: "Dreamland " vs "Dreamland"
- Caracteres especiales: "Jammin'" vs "Jammin'"
- Case sensitivity (aunque Postgres lo maneja bien)

### 4. Foreign Key Constraints

**Problema actual**: FKs apuntan a UUIDs volátiles

```sql
-- accommodation_units_manual
ALTER TABLE accommodation_units_manual
  ADD CONSTRAINT fk_unit_id
  FOREIGN KEY (unit_id)
  REFERENCES accommodation_units_public(unit_id);

-- accommodation_units_manual_chunks
ALTER TABLE accommodation_units_manual_chunks
  ADD CONSTRAINT fk_accommodation_unit_id
  FOREIGN KEY (accommodation_unit_id)
  REFERENCES accommodation_units_public(unit_id);
```

**Efecto**: Si se borra `accommodation_units_public`, se borran en cascada manuales y chunks (o falla si ON DELETE RESTRICT)

---

## 💡 Soluciones Propuestas

### Opción A: Identificador Estable con `motopress_unit_id` (RECOMENDADO CORTO PLAZO)

**Concepto**: Usar `metadata->>'motopress_unit_id'` como identificador estable natural

**Implementación**:

1. **Modificar `process-accommodation-manuals.js`**:

```javascript
async function findPublicUnitIdByName(unitName, tenantId) {
  // Buscar directamente en accommodation_units_public
  const { data: publicUnit } = await supabase
    .from('accommodation_units_public')
    .select('unit_id')
    .eq('tenant_id', tenantId)
    .eq('metadata->>original_accommodation', unitName)
    .like('name', `${unitName} - Overview`)
    .single()

  return publicUnit?.unit_id || null
}
```

2. **Modificar `map_hotel_to_public_accommodation_id()`**:

```sql
CREATE OR REPLACE FUNCTION map_hotel_to_public_accommodation_id(
  p_hotel_unit_id uuid,
  p_tenant_id text
) RETURNS uuid AS $$
DECLARE
  v_motopress_id text;
  v_hotel_name text;
  v_public_unit_id uuid;
BEGIN
  -- Obtener motopress_id y nombre
  SELECT unit_number, name INTO v_motopress_id, v_hotel_name
  FROM hotels.accommodation_units
  WHERE id = p_hotel_unit_id AND tenant_id = p_tenant_id;

  -- Priorizar match por motopress_id
  IF v_motopress_id IS NOT NULL THEN
    SELECT unit_id INTO v_public_unit_id
    FROM accommodation_units_public
    WHERE tenant_id::text = p_tenant_id
      AND metadata->>'motopress_unit_id' = v_motopress_id
    LIMIT 1;

    IF v_public_unit_id IS NOT NULL THEN
      RETURN v_public_unit_id;
    END IF;
  END IF;

  -- Fallback: match por nombre
  SELECT unit_id INTO v_public_unit_id
  FROM accommodation_units_public
  WHERE tenant_id::text = p_tenant_id
    AND metadata->>'original_accommodation' = v_hotel_name
    AND name LIKE v_hotel_name || ' - Overview'
  LIMIT 1;

  RETURN COALESCE(v_public_unit_id, p_hotel_unit_id);
END;
$$ LANGUAGE plpgsql;
```

3. **Script de remapping de manuales existentes**:

```javascript
// scripts/remap-manual-ids-to-current.js
const { data: manuals } = await supabase
  .from('accommodation_units_manual')
  .select('unit_id')

for (const manual of manuals) {
  // Obtener nombre de la old unit_id
  const { data: oldUnit } = await supabase
    .from('accommodation_units_public')
    .select('metadata->original_accommodation as name')
    .eq('unit_id', manual.unit_id)
    .single()

  if (!oldUnit) continue

  // Buscar current unit_id por nombre
  const { data: currentUnit } = await supabase
    .from('accommodation_units_public')
    .select('unit_id')
    .eq('metadata->>original_accommodation', oldUnit.name)
    .like('name', `${oldUnit.name} - Overview`)
    .single()

  if (!currentUnit) continue

  // Actualizar manual
  await supabase
    .from('accommodation_units_manual')
    .update({ unit_id: currentUnit.unit_id })
    .eq('unit_id', manual.unit_id)

  // Actualizar chunks
  await supabase
    .from('accommodation_units_manual_chunks')
    .update({ accommodation_unit_id: currentUnit.unit_id })
    .eq('accommodation_unit_id', manual.unit_id)
}
```

**Ventajas**:
- ✅ Fix inmediato sin cambios de schema
- ✅ Usa identificador que ya existe
- ✅ Compatible con MotoPress como source of truth

**Desventajas**:
- ⚠️ Requiere que TODAS las units tengan `motopress_unit_id`
- ⚠️ No funciona para units creadas manualmente (sin MotoPress)

---

### Opción B: Columna `stable_identifier` (RECOMENDADO LARGO PLAZO)

**Concepto**: Agregar columna dedicada para identificador estable

**Implementación**:

1. **Migration**:

```sql
-- Migration: 20251023_add_stable_identifiers.sql

-- Agregar stable_identifier a ambas tablas
ALTER TABLE hotels.accommodation_units
  ADD COLUMN stable_identifier VARCHAR(100) UNIQUE;

ALTER TABLE accommodation_units_public
  ADD COLUMN stable_identifier VARCHAR(100) UNIQUE;

-- Poblar con motopress_unit_id existente
UPDATE hotels.accommodation_units
SET stable_identifier = CONCAT('mp-', unit_number)
WHERE unit_number IS NOT NULL;

UPDATE accommodation_units_public
SET stable_identifier = CONCAT('mp-', metadata->>'motopress_unit_id')
WHERE metadata->>'motopress_unit_id' IS NOT NULL;

-- Crear índices
CREATE INDEX idx_hotels_units_stable_id ON hotels.accommodation_units(stable_identifier);
CREATE INDEX idx_public_units_stable_id ON accommodation_units_public(stable_identifier);

-- Agregar constraint NOT NULL después de poblar
ALTER TABLE hotels.accommodation_units
  ALTER COLUMN stable_identifier SET NOT NULL;

ALTER TABLE accommodation_units_public
  ALTER COLUMN stable_identifier SET NOT NULL;
```

2. **Actualizar Foreign Keys**:

```sql
-- Agregar stable_identifier a tablas dependientes
ALTER TABLE accommodation_units_manual
  ADD COLUMN unit_stable_id VARCHAR(100);

ALTER TABLE accommodation_units_manual_chunks
  ADD COLUMN unit_stable_id VARCHAR(100);

-- Poblar
UPDATE accommodation_units_manual aum
SET unit_stable_id = aup.stable_identifier
FROM accommodation_units_public aup
WHERE aum.unit_id = aup.unit_id;

UPDATE accommodation_units_manual_chunks aumc
SET unit_stable_id = aup.stable_identifier
FROM accommodation_units_public aup
WHERE aumc.accommodation_unit_id = aup.unit_id;

-- Crear FKs
ALTER TABLE accommodation_units_manual
  ADD CONSTRAINT fk_unit_stable_id
  FOREIGN KEY (unit_stable_id)
  REFERENCES accommodation_units_public(stable_identifier);

ALTER TABLE accommodation_units_manual_chunks
  ADD CONSTRAINT fk_unit_stable_id
  FOREIGN KEY (unit_stable_id)
  REFERENCES accommodation_units_public(stable_identifier);
```

3. **Modificar scripts**:

```javascript
// Sync mantiene stable_identifier entre recreaciones
const { data: hotelUnit } = await supabase
  .from('hotels.accommodation_units')
  .upsert({
    tenant_id: TENANT_ID,
    name: 'Dreamland',
    unit_number: '317',
    stable_identifier: 'mp-317'  // ← PERSISTE
  }, {
    onConflict: 'stable_identifier'  // ← Upsert por stable_id
  })
```

**Ventajas**:
- ✅ Solución definitiva
- ✅ Funciona para TODAS las units (MotoPress + manual)
- ✅ FK tradicional, queries más eficientes
- ✅ Más claro conceptualmente

**Desventajas**:
- ⚠️ Requiere migration de schema
- ⚠️ Más cambios en código base
- ⚠️ Requiere tiempo de desarrollo/testing

---

### Opción C: Warning System (PREVENCIÓN)

**Concepto**: No eliminar el problema, solo prevenirlo

**Implementación**:

1. **Script de validación pre-delete**:

```javascript
// scripts/validate-before-unit-deletion.js
async function validateBeforeDeletion(tenantId) {
  // Check for manuals
  const { data: manuals } = await supabase
    .from('accommodation_units_manual')
    .select('unit_id')

  // Check for chunks
  const { data: chunks } = await supabase
    .from('accommodation_units_manual_chunks')
    .select('accommodation_unit_id')

  // Check for active reservations
  const { data: reservations } = await supabase
    .from('guest_reservations')
    .select('accommodation_unit_id')
    .gte('check_in_date', new Date().toISOString())

  if (manuals.length > 0 || chunks.length > 0 || reservations.length > 0) {
    console.error('⚠️ CANNOT DELETE UNITS:')
    console.error(`   - ${manuals.length} manuals will be orphaned`)
    console.error(`   - ${chunks.length} chunks will be orphaned`)
    console.error(`   - ${reservations.length} active reservations`)
    console.error('\nRun migration script first to remap IDs')
    process.exit(1)
  }
}
```

2. **UI Warning**:

```typescript
// src/app/[tenant]/accommodations/page.tsx
const handleDeleteUnit = async (unitId: string) => {
  const confirmation = confirm(
    '⚠️ WARNING: Deleting this unit will break:\n' +
    '- Guest manuals\n' +
    '- Embedding search\n' +
    '- Active reservations\n\n' +
    'Are you ABSOLUTELY sure?'
  )

  if (!confirmation) return

  // Proceder con delete
}
```

**Ventajas**:
- ✅ Mínimos cambios
- ✅ Implementación rápida

**Desventajas**:
- ⚠️ No elimina el problema
- ⚠️ Requiere disciplina manual

---

## 📋 Checklist de Implementación

### Fase 1: Documentación (ACTUAL)
- [x] Crear este documento
- [ ] Crear guía de troubleshooting
- [ ] Documentar incidente de Octubre 23, 2025

### Fase 2: Fix Inmediato (Opción A)
- [ ] Modificar `process-accommodation-manuals.js`
- [ ] Actualizar `map_hotel_to_public_accommodation_id()`
- [ ] Crear script de remapping de IDs existentes
- [ ] Ejecutar remapping en producción
- [ ] Verificar guest chat funciona

### Fase 3: Solución Definitiva (Opción B) - FUTURO
- [ ] Diseñar schema de `stable_identifier`
- [ ] Crear migration
- [ ] Actualizar scripts de sync
- [ ] Testing exhaustivo
- [ ] Deploy gradual

---

## 🧪 Testing del Fix

### Test 1: Recrear Units y Verificar Mapping

```bash
# 1. Backup actual
pg_dump -h ... -d ... -t accommodation_units_manual > backup_manual.sql
pg_dump -h ... -d ... -t accommodation_units_manual_chunks > backup_chunks.sql

# 2. Borrar y recrear units
npm run sync:motopress -- --tenant simmerdown

# 3. Verificar mapping funciona
npm run test:manual-mapping

# 4. Verificar guest chat
# Login como guest → Preguntar por WiFi → Debe ver manual
```

### Test 2: Verificar Preservación de Manuales

```sql
-- Antes de recrear
SELECT
  aum.unit_id as old_id,
  aup.name,
  COUNT(aumc.id) as chunks_count
FROM accommodation_units_manual aum
JOIN accommodation_units_public aup ON aup.unit_id = aum.unit_id
LEFT JOIN accommodation_units_manual_chunks aumc ON aumc.accommodation_unit_id = aum.unit_id
GROUP BY aum.unit_id, aup.name;

-- Después de recrear + remapping
-- Debe tener MISMOS chunks_count
```

---

## 📞 Contacto y Soporte

**Problema reportado por**: Usuario (Octubre 23, 2025)
**Documentado por**: Claude Code
**Estado**: En investigación / Fix propuesto

**Próximos pasos**: Aprobar opción de solución e implementar
