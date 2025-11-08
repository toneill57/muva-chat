# Guía de Debugging: "Sin nombre" en Tarjetas de Reservas

**CRÍTICO:** Este documento previene un error recurrente de confundir dos tablas completamente diferentes durante el debugging.

---

## ❌ EL ERROR MORTAL

Cuando las tarjetas de reservas muestran "Sin nombre", el error más común es investigar la tabla **EQUIVOCADA**:

```
❌ INCORRECTO: Verificar accommodation_units_public
✅ CORRECTO: Verificar hotels.accommodation_units
```

### ¿Por qué es tan fácil confundirse?

Ambas tablas tienen nombres similares y almacenan información de alojamientos, pero sirven propósitos COMPLETAMENTE DIFERENTES:

| Tabla | Propósito | Usado Por | Registros |
|-------|-----------|-----------|-----------|
| `hotels.accommodation_units` | **Metadata de alojamientos** (nombre, precio, capacidad) | Dashboard staff, vinculación de reservas | 10 (uno por alojamiento) |
| `accommodation_units_public` | **Embeddings para chat público** (fragmentos semánticos) | Chat AI en `http://simmerdown.localhost:3001/` | 49 chunks (5-7 por alojamiento) |

---

## 🏗️ Arquitectura de Tablas

```
┌─────────────────────────────────────────────────────────────┐
│ METADATA SYSTEM (Para Staff/Admin)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  hotels.accommodation_units (SOURCE OF TRUTH)               │
│  ├─ id: UUID (PK)                                          │
│  ├─ tenant_id: UUID                                        │
│  ├─ name: "Sunshine", "Simmer Highs", etc.                │
│  ├─ motopress_type_id: 89, 335, etc.                      │
│  ├─ price, capacity, amenities, etc.                      │
│  └─ USADO POR: Reservas, dashboard staff                  │
│                                                             │
│  guest_reservations                                         │
│  ├─ id: UUID (PK)                                          │
│  ├─ guest_name: "John Doe"                                │
│  ├─ accommodation_unit_id: UUID (FK → hotels.accommodation_units.id) │
│  └─ check_in_date, check_out_date, etc.                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PUBLIC CHAT SYSTEM (Para Visitantes Anónimos)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  accommodation_units_public (EMBEDDINGS)                    │
│  ├─ id: UUID (PK)                                          │
│  ├─ tenant_id: UUID                                        │
│  ├─ accommodation_unit_id: UUID (FK → hotels.accommodation_units.id) │
│  ├─ chunk_index: 1, 2, 3, 4, 5...                         │
│  ├─ content: "## Overview\nSunshine is a..."              │
│  ├─ embedding_1024: vector(1024) - Matryoshka Tier 1      │
│  ├─ embedding_256: vector(256) - Matryoshka Tier 2        │
│  └─ metadata: { original_accommodation: "Sunshine" }      │
│                                                             │
│  USADO POR: Chat público en homepage del tenant            │
│  URL: http://simmerdown.localhost:3001/                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Flujo Correcto de Debugging

### Problema: Tarjeta de Reserva muestra "Sin nombre"

```
1. Verificar vinculación de reserva
   ↓
   SELECT
     gr.id,
     gr.guest_name,
     gr.accommodation_unit_id,
     au.name as accommodation_name
   FROM guest_reservations gr
   LEFT JOIN hotels.accommodation_units au ON gr.accommodation_unit_id = au.id
   WHERE gr.tenant_id = 'TENANT_ID'
   LIMIT 10;

   RESULTADO ESPERADO:
   ├─ accommodation_unit_id: UUID válido
   └─ accommodation_name: "Sunshine", "Simmer Highs", etc.

   PROBLEMA SI:
   ├─ accommodation_unit_id: NULL ❌
   └─ accommodation_name: NULL ❌

2. Si accommodation_unit_id es NULL → Verificar tabla source
   ↓
   SELECT COUNT(*) FROM hotels.accommodation_units WHERE tenant_id = 'TENANT_ID';

   ESPERADO: 10 (número de alojamientos)
   PROBLEMA SI: 0 ← accommodations no se sincronizaron

3. Si hotels.accommodation_units está vacío → Verificar sync
   ↓
   - Revisar logs de /api/integrations/motopress/sync
   - Buscar errores durante INSERT INTO hotels.accommodation_units
   - Verificar que exec_sql RPC tiene search_path correcto

4. Si hay errores en exec_sql → Verificar RPC function
   ↓
   SELECT proname, prosrc
   FROM pg_proc
   WHERE proname = 'exec_sql';

   VERIFICAR:
   └─ search_path incluye 'hotels' schema
```

---

## ⚠️ ERRORES COMUNES

### Error #1: Verificar accommodation_units_public en vez de hotels.accommodation_units

```sql
-- ❌ INCORRECTO - Esta tabla es para chat público, no para reservas
SELECT COUNT(*) FROM accommodation_units_public WHERE tenant_id = 'TENANT_ID';
-- Resultado: 49 chunks ← ESTO NO SIGNIFICA QUE HAY ACCOMMODATIONS

-- ✅ CORRECTO - Esta es la tabla que vincula reservas
SELECT COUNT(*) FROM hotels.accommodation_units WHERE tenant_id = 'TENANT_ID';
-- Resultado esperado: 10 alojamientos
```

**Por qué es confuso:**
- `accommodation_units_public` siempre tiene ~49 registros (chunks semánticos)
- Ver "49 units" en logs NO significa que accommodations se sincronizaron
- Los chunks son 5-7 fragmentos POR alojamiento para búsqueda semántica

### Error #2: Confiar en logs sin verificar la base de datos

```
❌ Log dice: "Created accommodation: Sunshine" ✅
❌ Asumir: La accommodation se creó correctamente
❌ NO VERIFICAR: SELECT en hotels.accommodation_units

✅ SIEMPRE verificar con query después de ver logs:
SELECT * FROM hotels.accommodation_units WHERE name = 'Sunshine';
```

### Error #3: Modificar error handling sin entender formato de respuesta

```typescript
// ❌ INCORRECTO - exec_sql NO retorna {success: boolean}
const { data, error } = await supabase.rpc('exec_sql', { sql: insertSql })
if (!data?.success) {  // ← data es un array, no tiene .success
  errors.push('Failed')
}

// ✅ CORRECTO - exec_sql retorna rows en data, errores en error
const { data, error } = await supabase.rpc('exec_sql', { sql: insertSql })
if (error) {  // ← Verificar el campo error del RPC
  errors.push(`Failed: ${error.message}`)
}
```

---

## 📊 Queries de Verificación Rápida

### 1. Estado General del Tenant

```sql
SELECT
  'hotels.accommodation_units' as table_name,
  COUNT(*) as count
FROM hotels.accommodation_units
WHERE tenant_id = 'TENANT_ID'

UNION ALL

SELECT
  'accommodation_units_public' as table_name,
  COUNT(*) as count
FROM accommodation_units_public
WHERE tenant_id = 'TENANT_ID'

UNION ALL

SELECT
  'guest_reservations' as table_name,
  COUNT(*) as count
FROM guest_reservations
WHERE tenant_id = 'TENANT_ID';

-- ESPERADO:
-- hotels.accommodation_units: 10
-- accommodation_units_public: 49 (5-7 chunks × 10 accommodations)
-- guest_reservations: N (número de reservas)
```

### 2. Reservas con Nombres Faltantes

```sql
SELECT
  gr.id,
  gr.guest_name,
  gr.check_in_date,
  gr.accommodation_unit_id,
  CASE
    WHEN gr.accommodation_unit_id IS NULL THEN '❌ NULL (no vinculada)'
    WHEN au.name IS NULL THEN '❌ ID inválido (accommodation no existe)'
    ELSE au.name
  END as accommodation_status
FROM guest_reservations gr
LEFT JOIN hotels.accommodation_units au ON gr.accommodation_unit_id = au.id
WHERE gr.tenant_id = 'TENANT_ID'
ORDER BY gr.check_in_date DESC
LIMIT 20;

-- Si ves ❌ → Problema de vinculación
```

### 3. Accommodations vs Chunks

```sql
-- Listar accommodations con su cantidad de chunks
SELECT
  au.name as accommodation_name,
  au.motopress_type_id,
  COUNT(aup.id) as chunks_count
FROM hotels.accommodation_units au
LEFT JOIN accommodation_units_public aup
  ON aup.accommodation_unit_id = au.id
WHERE au.tenant_id = 'TENANT_ID'
GROUP BY au.id, au.name, au.motopress_type_id
ORDER BY au.name;

-- ESPERADO: Cada accommodation tiene 5-7 chunks
-- PROBLEMA SI: chunks_count = 0 para algún accommodation
```

---

## 🚨 Debugging Checklist

Cuando veas "Sin nombre" en tarjetas de reservas:

- [ ] 1. Verificar `guest_reservations.accommodation_unit_id` no es NULL
- [ ] 2. Verificar `hotels.accommodation_units` tiene 10 registros
- [ ] 3. Verificar FK constraint entre reservations ↔ accommodations
- [ ] 4. Revisar logs de sync de accommodations (no de reservations)
- [ ] 5. Verificar `exec_sql` RPC tiene search_path correcto
- [ ] 6. **NO** verificar `accommodation_units_public` (tabla equivocada)

---

## 📝 Notas Importantes

### Sobre accommodation_units_public

- **NO es para dashboard staff** - es para chat público
- **NO vincula reservas** - solo para búsqueda semántica
- **Tiene 49 registros normalmente** - esto NO indica problemas ni éxito de sync
- **Es independiente de hotels.accommodation_units** - pueden estar sincronizadas o no

### Sobre el Sync de Accommodations

El sync de accommodations crea AMBAS tablas:
1. `hotels.accommodation_units` ← metadata (INSERT con exec_sql)
2. `accommodation_units_public` ← embeddings (INSERT directo)

Si sync falla en paso 1 pero funciona paso 2:
- ✅ accommodation_units_public tendrá 49 chunks
- ❌ hotels.accommodation_units estará vacío
- ❌ Reservas mostrarán "Sin nombre"

**SIEMPRE verificar hotels.accommodation_units primero.**

---

## 🔧 Solución Rápida

Si encuentras que `hotels.accommodation_units` está vacío:

```bash
# 1. Verificar que exec_sql tiene search_path correcto
SELECT prosrc FROM pg_proc WHERE proname = 'exec_sql';
# Debe incluir: SET search_path TO 'public', 'hotels', 'pg_temp'

# 2. Re-sincronizar accommodations
POST http://localhost:3001/api/integrations/motopress/sync-accommodations
{
  "tenant_id": "TENANT_ID"
}

# 3. Verificar sync exitoso
SELECT COUNT(*) FROM hotels.accommodation_units WHERE tenant_id = 'TENANT_ID';
# Esperado: 10

# 4. Re-sincronizar reservations (para vincular correctamente)
POST http://localhost:3001/api/integrations/motopress/sync-reservations
{
  "tenant_id": "TENANT_ID"
}

# 5. Verificar vinculación
SELECT
  COUNT(*) as total,
  COUNT(accommodation_unit_id) as linked
FROM guest_reservations
WHERE tenant_id = 'TENANT_ID';
# total debe ser igual a linked
```

---

**Última actualización:** 2025-11-08
**Razón:** Documentar error de confundir accommodation_units_public (embeddings) con hotels.accommodation_units (metadata) durante debugging de "Sin nombre".
