# Proceso Seguro para Recrear Accommodation Units

**CRÍTICO**: Leer completamente ANTES de borrar/recrear units
**Relacionado**: `docs/architecture/ACCOMMODATION_ID_MAPPING_ARCHITECTURE.md`
**Última actualización**: Octubre 23, 2025

---

## ⚠️ ADVERTENCIA

Borrar y recrear `hotels.accommodation_units` o `accommodation_units_public` **ROMPE** las siguientes relaciones:

- ❌ Manuales de alojamiento (`accommodation_units_manual`)
- ❌ Chunks de embeddings (`accommodation_units_manual_chunks`)
- ❌ Reservas activas (`guest_reservations`, `reservation_accommodations`)
- ❌ Búsqueda en guest chat (no encuentra información)
- ❌ Información turística asociada

**Síntoma principal**: Guest chat deja de ver los manuales y responde "no tengo información"

---

## 🔍 Pre-flight Checklist

### Antes de Borrar CUALQUIER Unit

```bash
# 1. Verificar qué se va a perder
npm run check:unit-dependencies -- --tenant simmerdown

# O manualmente:
npx tsx scripts/validate-before-unit-deletion.js
```

Debes ver:

```
🔍 Checking dependencies for tenant: simmerdown

📊 Results:
   - Manuals: 9 units
   - Manual chunks: 265 chunks
   - Active reservations: 12 reservations
   - Future check-ins: 8 guests

⚠️ WARNING: Deleting units will orphan this data!
✅ Safe to proceed ONLY if you have a remapping plan
```

### Verificar Embeddings Existen

```sql
SELECT
  aup.name,
  COUNT(aumc.id) as chunks_count,
  COUNT(DISTINCT aumc.chunk_index) as unique_chunks
FROM accommodation_units_public aup
LEFT JOIN accommodation_units_manual_chunks aumc ON aumc.accommodation_unit_id = aup.unit_id
WHERE aup.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND aup.name LIKE '% - Overview'
GROUP BY aup.name
ORDER BY aup.name;
```

Resultado esperado:

```
Dreamland - Overview     | 46 chunks | 46 unique
Groovin' - Overview      | 30 chunks | 30 unique
Jammin' - Overview       | 32 chunks | 32 unique
...
```

Si ves `0 chunks`, los manuales no están procesados correctamente.

---

## 🛠️ Proceso Seguro de Recreación

### Opción 1: NO Borrar, Solo Actualizar (RECOMENDADO)

```bash
# Sync que actualiza sin borrar
npm run sync:motopress -- --tenant simmerdown --update-only

# O con el script:
npx tsx scripts/sync-motopress-bookings.ts --update-only
```

**Ventajas**:
- ✅ Preserva UUIDs existentes
- ✅ No rompe relaciones
- ✅ Cero downtime

**Cuándo NO usar**:
- Schema cambió y necesitas fresh start
- Quieres limpiar datos corruptos

---

### Opción 2: Recrear con Remapping Automático

**IMPORTANTE**: Solo si ya implementaste el fix de `map_hotel_to_public_accommodation_id()`

#### Paso 1: Backup

```bash
# Backup de IDs actuales
npm run backup:accommodation-ids

# O manualmente:
psql -h <host> -d <db> -c "
  COPY (
    SELECT
      aup.unit_id,
      aup.name,
      aup.metadata->>'motopress_unit_id' as motopress_id,
      aup.metadata->>'original_accommodation' as original_name
    FROM accommodation_units_public aup
    WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  ) TO '/tmp/unit_ids_backup_$(date +%Y%m%d).csv' CSV HEADER;
"
```

#### Paso 2: Verificar Identificadores Estables

```sql
-- TODOS los units deben tener un identificador estable
SELECT
  name,
  metadata->>'motopress_unit_id' as motopress_id,
  metadata->>'original_accommodation' as original_name
FROM accommodation_units_public
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND (
    metadata->>'motopress_unit_id' IS NULL
    OR metadata->>'original_accommodation' IS NULL
  );
```

**Resultado esperado**: `0 rows`

Si hay rows, agregar manualmente antes de borrar:

```sql
UPDATE accommodation_units_public
SET metadata = jsonb_set(
  metadata,
  '{motopress_unit_id}',
  '"317"'  -- El unit_number de hotels table
)
WHERE unit_id = '7220b0fa-945c-4e53-bafe-a34fc5810b76';
```

#### Paso 3: Borrar Units (Solo hotels, NO public)

```sql
-- Borrar SOLO hotels.accommodation_units
-- accommodation_units_public se actualiza vía sync script
DELETE FROM hotels.accommodation_units
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
```

#### Paso 4: Resync desde MotoPress

```bash
npm run sync:motopress -- --tenant simmerdown
```

Esto crea:
- Nuevos UUIDs en `hotels.accommodation_units`
- Nuevos UUIDs en `accommodation_units_public`
- PERO mantiene `metadata->>'motopress_unit_id'` estable

#### Paso 5: Remap Manual IDs

```bash
npm run remap:manual-ids -- --tenant simmerdown

# O manualmente:
npx tsx scripts/remap-manual-ids-to-current.js
```

Este script:
1. Lee `accommodation_units_manual` con UUIDs viejos
2. Busca el UUID nuevo usando `metadata->>'original_accommodation'`
3. Actualiza `accommodation_units_manual.unit_id`
4. Actualiza `accommodation_units_manual_chunks.accommodation_unit_id`

#### Paso 6: Verificar Remapping

```sql
-- Verificar que TODOS los manuales tienen unit_id válido
SELECT
  aum.unit_id,
  aup.name,
  aup.metadata->>'original_accommodation',
  COUNT(aumc.id) as chunks_count
FROM accommodation_units_manual aum
LEFT JOIN accommodation_units_public aup ON aup.unit_id = aum.unit_id
LEFT JOIN accommodation_units_manual_chunks aumc ON aumc.accommodation_unit_id = aum.unit_id
GROUP BY aum.unit_id, aup.name, aup.metadata
ORDER BY aup.name;
```

**Resultado esperado**: TODOS tienen `name` (no NULL) y `chunks_count > 0`

#### Paso 7: Test Guest Chat

```bash
# 1. Crear guest login token de prueba
npm run test:guest-login -- --unit "Dreamland"

# 2. Abrir guest chat en browser
open http://simmerdown.localhost:3000/guest/login?token=<token>

# 3. Preguntar algo sobre WiFi
# Debe responder con información del manual

# 4. Verificar logs muestran chunks encontrados
tail -f /tmp/muva-dev.log | grep "Unit manual chunks results"
```

Debe mostrar:

```
[Chat Engine] Unit manual chunks results: {
  total_found: 5,
  unit_id: '88888888-NEW-UUID-NEW-NEW-NEWNEWNEWNEW',
  unit_name: 'Dreamland',
  chunks: [
    { chunk_index: 9, similarity: '0.294', section: 'Conectividad' },
    ...
  ]
}
```

---

### Opción 3: Nuclear Option (Fresh Start Completo)

**SOLO usar si**:
- Corrupción masiva de datos
- Cambio estructural en schema
- Testing en ambiente NO producción

#### Pasos

```bash
# 1. BACKUP COMPLETO
pg_dump -h <host> -d <db> > backup_full_$(date +%Y%m%d).sql

# 2. Borrar TODO
npm run nuke:accommodations -- --tenant simmerdown --confirm

# Esto borra:
# - hotels.accommodation_units
# - accommodation_units_public
# - accommodation_units_manual
# - accommodation_units_manual_chunks

# 3. Resync desde MotoPress
npm run sync:motopress -- --tenant simmerdown

# 4. Reprocesar manuales desde markdown
npm run process:manuals -- --tenant simmerdown

# 5. Recrear chunks
npm run migrate:manual-to-chunks

# 6. Verificar TODOS los embeddings
npm run verify:embeddings -- --tenant simmerdown
```

**Tiempo estimado**: 30-45 minutos

---

## 🚨 Troubleshooting

### Problema: Guest Chat No Ve Manuales

**Síntoma**:
```
[Chat Engine] Unit manual chunks results: { total_found: 0 }
```

**Diagnóstico**:

```sql
-- 1. Verificar que guest tiene accommodation_unit_id correcto
SELECT
  gr.guest_name,
  gr.accommodation_unit_id,
  hu.name as hotel_unit_name,
  aup.name as public_unit_name
FROM guest_reservations gr
LEFT JOIN hotels.accommodation_units hu ON hu.id = gr.accommodation_unit_id
LEFT JOIN accommodation_units_public aup ON aup.unit_id = gr.accommodation_unit_id
WHERE gr.id = '<reservation_id>';
```

**Casos**:

1. **hotel_unit_name tiene valor, public_unit_name es NULL**
   - Guest tiene hotel UUID
   - `match_unit_manual_chunks` debe mapear automáticamente
   - Verificar función RPC funciona

2. **Ambos NULL**
   - UUID inválido en reservation
   - Recrear reservation con UUID correcto

3. **public_unit_name tiene valor**
   - Guest tiene public UUID (correcto)
   - Verificar chunks existen

```sql
-- 2. Verificar chunks existen para ese UUID
SELECT COUNT(*)
FROM accommodation_units_manual_chunks
WHERE accommodation_unit_id = '<uuid_from_above>';
```

**Fix**:

Si count = 0:
```bash
npm run remap:manual-ids -- --tenant simmerdown
```

### Problema: Mapping No Funciona

**Síntoma**: `map_hotel_to_public_accommodation_id()` devuelve NULL o UUID incorrecto

**Diagnóstico**:

```sql
-- Test manual de la función
SELECT
  map_hotel_to_public_accommodation_id(
    '14fc28a0-f6ac-4789-bc95-47c18bc4bf33'::uuid,  -- hotel UUID
    'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'         -- tenant_id
  ) as mapped_id,
  (
    SELECT name FROM accommodation_units_public
    WHERE unit_id = map_hotel_to_public_accommodation_id(
      '14fc28a0-f6ac-4789-bc95-47c18bc4bf33'::uuid,
      'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
    )
  ) as unit_name;
```

**Resultado esperado**: `Dreamland - Overview`

Si devuelve NULL:

```sql
-- Verificar nombre exacto en ambas tablas
SELECT 'hotel' as source, name FROM hotels.accommodation_units
WHERE id = '14fc28a0-f6ac-4789-bc95-47c18bc4bf33'
UNION ALL
SELECT 'public' as source, metadata->>'original_accommodation'
FROM accommodation_units_public
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
```

Buscar discrepancias:
- Espacios extra
- Caracteres especiales diferentes
- Case sensitivity

**Fix**:

```sql
-- Corregir nombre en public
UPDATE accommodation_units_public
SET metadata = jsonb_set(
  metadata,
  '{original_accommodation}',
  '"Dreamland"'  -- Nombre EXACTO de hotels table
)
WHERE unit_id = '<public_uuid>';
```

### Problema: Reservas Tienen UUID Viejo

**Síntoma**: Guest login falla o muestra unit desconocida

**Diagnóstico**:

```sql
SELECT
  gr.guest_name,
  gr.accommodation_unit_id,
  CASE
    WHEN hu.id IS NOT NULL THEN 'hotel_id (correct)'
    WHEN aup.unit_id IS NOT NULL THEN 'public_id (incorrect for reservations)'
    ELSE 'invalid_id (broken)'
  END as id_type
FROM guest_reservations gr
LEFT JOIN hotels.accommodation_units hu ON hu.id = gr.accommodation_unit_id
LEFT JOIN accommodation_units_public aup ON aup.unit_id = gr.accommodation_unit_id
WHERE gr.check_in_date >= CURRENT_DATE;
```

**Fix para reservas con UUID inválido**:

```bash
npm run fix:reservation-unit-ids -- --tenant simmerdown
```

O manualmente:

```sql
-- Para cada reserva con UUID viejo
UPDATE guest_reservations gr
SET accommodation_unit_id = (
  SELECT hu.id
  FROM hotels.accommodation_units hu
  JOIN accommodation_units_public aup_old ON aup_old.metadata->>'original_accommodation' = hu.name
  WHERE aup_old.unit_id = gr.accommodation_unit_id
  LIMIT 1
)
WHERE accommodation_unit_id NOT IN (
  SELECT id FROM hotels.accommodation_units
);
```

---

## 📊 Monitoring Post-Recreación

### Dashboard de Salud

```sql
-- Health check completo
WITH health_check AS (
  SELECT
    'units' as component,
    COUNT(*) as total,
    COUNT(DISTINCT name) as unique_names
  FROM hotels.accommodation_units
  WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'

  UNION ALL

  SELECT
    'public_units',
    COUNT(*),
    COUNT(DISTINCT metadata->>'original_accommodation')
  FROM accommodation_units_public
  WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'

  UNION ALL

  SELECT
    'manuals',
    COUNT(*),
    COUNT(DISTINCT unit_id)
  FROM accommodation_units_manual

  UNION ALL

  SELECT
    'chunks',
    COUNT(*),
    COUNT(DISTINCT accommodation_unit_id)
  FROM accommodation_units_manual_chunks
)
SELECT * FROM health_check;
```

**Resultado esperado (Simmerdown)**:

```
Component      | Total | Unique
---------------|-------|-------
units          | 10    | 10
public_units   | 30    | 10     (3 chunks per unit)
manuals        | 9     | 9
chunks         | 265   | 9
```

### Alertas Automáticas

```bash
# Cron job para monitoreo diario
0 9 * * * /path/to/scripts/monitor-accommodation-health.sh
```

Script:

```bash
#!/bin/bash
# monitor-accommodation-health.sh

BROKEN_MANUALS=$(psql -t -c "
  SELECT COUNT(*)
  FROM accommodation_units_manual aum
  LEFT JOIN accommodation_units_public aup ON aup.unit_id = aum.unit_id
  WHERE aup.unit_id IS NULL
")

if [ "$BROKEN_MANUALS" -gt 0 ]; then
  echo "⚠️ ALERT: $BROKEN_MANUALS manuals have broken unit_id references"
  # Send notification (Slack, email, etc.)
fi
```

---

## 📚 Referencias

- **Arquitectura completa**: `docs/architecture/ACCOMMODATION_ID_MAPPING_ARCHITECTURE.md`
- **Incidente Octubre 2025**: `docs/troubleshooting/INCIDENT_20251023_MANUAL_EMBEDDINGS_LOST.md`
- **Scripts relacionados**:
  - `scripts/remap-manual-ids-to-current.js`
  - `scripts/validate-before-unit-deletion.js`
  - `scripts/fix-reservation-unit-ids.js`

---

## ✅ Success Criteria

Después de recrear units, TODOS deben pasar:

- [ ] `npm run verify:embeddings` muestra 265 chunks
- [ ] Guest chat responde preguntas sobre WiFi/manual
- [ ] Reservas activas muestran nombre de alojamiento correcto
- [ ] No hay warnings en health check dashboard
- [ ] Logs muestran `Unit manual chunks results: { total_found: 5+ }`

Si alguno falla, ejecutar troubleshooting correspondiente ANTES de continuar.
