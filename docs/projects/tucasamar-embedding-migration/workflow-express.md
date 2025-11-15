# Script Ejecutable - Migración Tucasamar Embeddings

**Proyecto:** Migración Tucasamar Embeddings - Tabla Correcta
**Fecha:** 2025-01-11
**Tipo:** Script Copy-Paste (Single Session)
**Estrategia:** TodoList + Testing Incremental
**Tiempo Estimado:** 65 minutos

---

## 🎯 OBJETIVO

Migrar 6 accommodation units de Tu Casa en el Mar desde `hotels.accommodation_units` (donde están ahora con embeddings) hacia `accommodation_units_public` (donde el chat busca) para que aparezcan en resultados de búsqueda.

**Problema Actual:**
- tucasamar tiene 6 units con embeddings en `hotels.accommodation_units`
- El chat busca en `accommodation_units_public` (tabla diferente)
- Resultado: 0 resultados de búsqueda para tucasamar
- Chat RPC `match_accommodations_public()` no encuentra las unidades

**Estado Deseado:**
- ✅ 6 units de tucasamar en `accommodation_units_public`
- ✅ Embeddings preservados (`embedding_fast` 1024d)
- ✅ Chat retorna resultados para tucasamar
- ✅ Mismo patrón que Simmerdown (datos en ambas tablas)

---

## 📊 ESTRATEGIA

**Hybrid Approach:**
- ✅ Single session (rápido, menos overhead)
- ✅ TodoList tracking (visibilidad de progreso)
- ✅ Testing incremental (seguridad)
- ✅ Commits por categoría (rollback fácil)
- ⚠️ Escalate a Plan Formal si se complica

**Por qué Script Copy-Paste:**
- Tarea bien definida: migración de datos con transformación de schema
- Investigación completa ya realizada (arquitectura de 2 tablas identificada)
- Mapeo de campos documentado
- No requiere múltiples agentes
- Context usage manejable
- Ejecución inmediata con un copy-paste

**Patrón Identificado:**
- Simmerdown funciona porque tiene datos en AMBAS tablas
- `hotels.accommodation_units`: 8 units (source of truth)
- `accommodation_units_public`: 13 units (search index)
- Replicar mismo patrón para tucasamar (NO tocar Simmerdown)

---

## 🚀 PROMPT EJECUTABLE (COPY-PASTE)

**Instrucciones:**
1. Haz `/clear` en nueva conversación
2. Copy-paste el siguiente prompt COMPLETO
3. Sigue las instrucciones del asistente

---

### PROMPT COMIENZA AQUÍ ⬇️

```
PROYECTO: Migración Tucasamar Embeddings - Tabla Correcta

OBJETIVO:
Migrar 6 accommodation units de Tu Casa en el Mar desde hotels.accommodation_units (donde están ahora) hacia accommodation_units_public (donde el chat busca) para que aparezcan en resultados de búsqueda.

CONTEXTO CRÍTICO:
- Repo: /Users/oneill/Sites/apps/muva-chat
- PROBLEMA ENCONTRADO: tucasamar tiene 6 units con embeddings en hotels.accommodation_units
- El chat busca en accommodation_units_public (tabla diferente!)
- Simmerdown funciona porque tiene datos en AMBAS tablas
- NO tocar flujo de Simmerdown (funciona perfecto)
- Solo replicar el patrón de Simmerdown para tucasamar

DESCUBRIMIENTOS DE INVESTIGACIÓN:
1. ✅ tucasamar hotel existe: ID = 3737a3d1-2197-4297-a326-86454db072ec
2. ✅ 6 units con embeddings en hotels.accommodation_units (Haines Cay, Serrana Cay, Queena Reef, Cotton Cay, Crab Cay, Rose Cay)
3. ❌ 0 units en accommodation_units_public → NO aparece en chat
4. ✅ Simmerdown: 8 units en hotels.accommodation_units + 13 en accommodation_units_public
5. ✅ Chat RPC function: match_accommodations_public() busca en accommodation_units_public
6. ✅ Embeddings ya existen (embedding_fast, embedding_balanced) en hotels schema

---

TASKS (Ejecutar en orden, con testing entre cada una):

## TASK 1: Crear Script de Migración (25min) 🔴

**Archivo:**
1. /Users/oneill/Sites/apps/muva-chat/scripts/migrate-tucasamar-to-public.ts
   - Crear desde cero
   - Query 6 units desde hotels.accommodation_units WHERE tenant_id = '2263efba-b62b-417b-a422-a84638bc632f'
   - Transform data structure (mapeo de schemas)
   - Insert into accommodation_units_public

**Mapeo de Campos Críticos:**
```typescript
// hotels.accommodation_units → accommodation_units_public
{
  unit_id: source.id,  // UUID mapping
  tenant_id: '2263efba-b62b-417b-a422-a84638bc632f',  // VARCHAR → UUID conversion
  name: source.name,
  unit_number: source.unit_number,
  unit_type: source.unit_type || 'room',
  description: source.description,
  short_description: source.short_description,

  // CRÍTICO: Preservar embeddings
  embedding_fast: source.embedding_fast,  // Vector 1024d
  embedding: null,  // Optional full embedding

  // Transform JSONB structures
  photos: source.images,  // images → photos
  pricing: {  // Build from base_price fields
    base_price_low: source.base_price_low_season,
    base_price_high: source.base_price_high_season,
    currency: 'COP'
  },
  amenities: source.amenities_list,  // Direct copy JSONB
  highlights: source.unique_features,  // unique_features → highlights

  // Boolean flags
  is_active: true,  // Parse from status field
  is_bookable: true,

  // Metadata
  metadata: {
    hotel_id: source.hotel_id,
    motopress_type_id: source.motopress_type_id,
    floor_number: source.floor_number,
    capacity: source.capacity
  },

  // Timestamps
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}
```

**TEST:**
```bash
set -a && source .env.local && set +a && npx tsx scripts/migrate-tucasamar-to-public.ts
# Should output: "✅ Migrated 6 units to accommodation_units_public"
```

**COMMIT:** "feat(embeddings): migrate tucasamar units to accommodation_units_public"

---

## TASK 2: Ejecutar Migración y Verificar (15min) 🔴

**Verificación en Base de Datos:**
```typescript
// Usar MCP Supabase o script de verificación
const query = `
SELECT
  COUNT(*) as total,
  COUNT(embedding_fast) as with_embedding,
  array_agg(name ORDER BY name) as unit_names
FROM accommodation_units_public
WHERE tenant_id = '2263efba-b62b-417b-a422-a84638bc632f'
`
```

**Resultado Esperado:**
```
total: 6
with_embedding: 6
unit_names: ["Cotton Cay", "Crab Cay", "Haines Cay", "Queena Reef", "Rose Cay", "Serrana Cay"]
```

**TEST:**
```bash
# Verificar con query directo
mcp__supabase__execute_sql con el query de arriba
```

**COMMIT:** No commit (solo verificación)

---

## TASK 3: Probar Búsqueda del Chat (10min) 🟡

**Verificación de RPC Function:**
```typescript
// Test match_accommodations_public() con tucasamar
const testQuery = `
SELECT match_accommodations_public(
  query_embedding := (SELECT embedding_fast FROM accommodation_units_public WHERE name = 'Haines Cay' LIMIT 1),
  p_tenant_id := '2263efba-b62b-417b-a422-a84638bc632f'::uuid,
  match_threshold := 0.5,
  match_count := 10
)
`
```

**Resultado Esperado:**
- Al menos 1 resultado retornado
- similarity > 0.5
- name campo poblado

**TEST:**
```bash
# Ejecutar RPC test query via MCP
# O usar script test-search.ts
```

**COMMIT:** No commit (solo testing)

---

## TASK 4: Documentar Solución (15min) 🟢

**Archivos:**
1. /Users/oneill/Sites/apps/muva-chat/docs/troubleshooting/TUCASAMAR_EMBEDDING_MIGRATION.md
   - Crear documentación del problema
   - Explicar arquitectura de 2 tablas
   - Documentar mapeo de schemas
   - Incluir queries de verificación

**Contenido Mínimo:**
```markdown
# Tucasamar Embedding Migration

## Problem
- tucasamar had 6 units in hotels.accommodation_units
- Chat searches accommodation_units_public
- Result: 0 search results for tucasamar

## Solution
Migrated data from hotels.accommodation_units → accommodation_units_public

## Architecture
- hotels.accommodation_units: Source of truth (write)
- accommodation_units_public: Search index (read)
- Simmerdown pattern: Data in BOTH tables
- Applied same pattern to tucasamar

## Verification
{Include queries used for verification}
```

**TEST:**
```bash
# Verificar que markdown se ve bien
cat docs/troubleshooting/TUCASAMAR_EMBEDDING_MIGRATION.md
```

**COMMIT:** "docs(tucasamar): document embedding migration to public table"

---

INSTRUCCIONES PARA CLAUDE:

1. **TodoWrite**: Crear todo list con estas 4 tasks
2. **Ejecutar en orden**: Task 1 → Test → Commit → Task 2 → ...
3. **NO avanzar** a siguiente task sin testing exitoso
4. **Mostrar evidencia** de cada test al usuario (outputs de queries)
5. **Preservar embeddings**: CRÍTICO que embedding_fast se copie correctamente
6. **No tocar Simmerdown**: Solo trabajar con tucasamar tenant_id

**SAFETY CHECKS:**
- Verificar tenant_id correcto antes de migrar: '2263efba-b62b-417b-a422-a84638bc632f'
- Confirmar 6 units antes de ejecutar INSERT
- Verificar embeddings no son NULL después de migración
- No eliminar datos de hotels.accommodation_units (solo copiar, no mover)

**VERIFICACIÓN FINAL:**
Después de completar todas las tasks:
```bash
# Query final de verificación
mcp__supabase__execute_sql:
SELECT
  CASE
    WHEN tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf' THEN 'simmerdown'
    WHEN tenant_id = '2263efba-b62b-417b-a422-a84638bc632f' THEN 'tucasamar'
  END as tenant,
  COUNT(*) as units_in_public,
  COUNT(embedding_fast) as with_embeddings
FROM accommodation_units_public
WHERE tenant_id IN ('b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf', '2263efba-b62b-417b-a422-a84638bc632f')
GROUP BY tenant_id
ORDER BY tenant

# Resultado esperado:
# simmerdown: 13 units, 12-13 with embeddings
# tucasamar: 6 units, 6 with embeddings ✅
```

¿Listo para empezar con TASK 1?
```

### PROMPT TERMINA AQUÍ ⬆️

---

## 🛡️ SAFETY PROTOCOL

### Testing Obligatorio

**Después de cada TASK:**
```bash
# Verificación de datos
mcp__supabase__execute_sql con queries de validación

# Query ejemplo para TASK 2
SELECT COUNT(*), array_agg(name)
FROM accommodation_units_public
WHERE tenant_id = '2263efba-b62b-417b-a422-a84638bc632f'
```

### Commits Incrementales

**Mensaje format:**
```
feat(embeddings): migrate tucasamar units to accommodation_units_public

TASK 1: Create migration script
Files changed: 1 (migrate-tucasamar-to-public.ts)

- Query 6 units from hotels.accommodation_units
- Transform schema: hotels → public
- Preserve embedding_fast vectors
- Insert into accommodation_units_public

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Context Monitoring

**Thresholds:**
- 85% → Warning (considerar compactar)
- 90% → STOP, hacer `/clear` + resumen
- 95% → Force stop

---

## ✅ TODO LIST (Para tracking durante ejecución)

```markdown
# TODO - Tucasamar Embedding Migration

- [ ] TASK 1: Crear Script de Migración (25min)
  - [ ] scripts/migrate-tucasamar-to-public.ts
  - [ ] Query 6 units desde hotels.accommodation_units
  - [ ] Implementar mapeo de schemas
  - [ ] Preservar embedding_fast (CRÍTICO)
  - [ ] TEST: Ejecutar script
  - [ ] COMMIT: feat(embeddings)

- [ ] TASK 2: Ejecutar y Verificar (15min)
  - [ ] Ejecutar migración
  - [ ] Query COUNT(*) en accommodation_units_public
  - [ ] Verificar 6 units con embeddings
  - [ ] Verificar nombres correctos
  - [ ] TEST: Query de verificación
  - [ ] No commit (solo verificación)

- [ ] TASK 3: Probar Búsqueda Chat (10min)
  - [ ] Test match_accommodations_public() RPC
  - [ ] Verificar similarity > 0.5
  - [ ] Confirmar resultados retornados
  - [ ] TEST: RPC query
  - [ ] No commit (solo testing)

- [ ] TASK 4: Documentar Solución (15min)
  - [ ] docs/troubleshooting/TUCASAMAR_EMBEDDING_MIGRATION.md
  - [ ] Documentar problema
  - [ ] Explicar arquitectura 2 tablas
  - [ ] Incluir queries verificación
  - [ ] TEST: cat docs file
  - [ ] COMMIT: docs(tucasamar)

- [ ] VERIFICACIÓN FINAL
  - [ ] Query comparativo simmerdown vs tucasamar
  - [ ] Confirmar 6 units en accommodation_units_public
  - [ ] Confirmar 6 embeddings preservados
  - [ ] Chat search funcional

**Total:** 4 tasks, ~65min, 2 commits
```

---

## 🔄 PLAN B (Escalation)

**Triggers para cambiar a Plan Formal:**

1. **Problemas Técnicos:**
   - Embeddings se pierden durante migración
   - Schema incompatibilidades no documentadas
   - RPC function falla después de migración

2. **Context Issues:**
   - Usage llega a 90%
   - Necesitas `/clear` antes de terminar

3. **Scope Creep:**
   - Se descubren más de 6 units a migrar
   - Requiere modificar RPC functions
   - Necesita coordinar con otros tenants

**Acción:**
Usar `/plan-project` para crear plan formal completo

---

## 📋 SCHEMA REFERENCE

### hotels.accommodation_units (SOURCE)
```sql
id: uuid (PK)
hotel_id: uuid
tenant_id: varchar  -- ⚠️ VARCHAR en source
name: varchar
description: text
short_description: text
unit_number: varchar
unit_type: varchar
embedding_fast: vector(1024)  -- CRÍTICO
embedding_balanced: vector(1536)
images: jsonb
amenities_list: jsonb
unique_features: jsonb
base_price_low_season: integer
base_price_high_season: integer
capacity: jsonb
```

### accommodation_units_public (TARGET)
```sql
unit_id: uuid (PK)  -- ⚠️ Diferente nombre
tenant_id: uuid  -- ⚠️ UUID en target
name: text
description: text
short_description: text
unit_number: text
unit_type: varchar
embedding_fast: vector(1024)  -- CRÍTICO
embedding: vector(3072)  -- Optional
photos: jsonb  -- ⚠️ Diferente nombre
amenities: jsonb
highlights: jsonb  -- ⚠️ Diferente nombre
pricing: jsonb  -- ⚠️ Estructura diferente
metadata: jsonb  -- Nuevo campo
is_active: boolean
is_bookable: boolean
```

---

**Última actualización:** 2025-01-11
**Próximo paso:** Ejecutar PROMPT en nueva conversación con `/clear`

---

## 🎯 RESULTADO ESPERADO

Después de ejecutar este script:

✅ **Base de Datos:**
- 6 units en `accommodation_units_public` para tucasamar
- Todos con `embedding_fast` preservado
- Mismo patrón que Simmerdown

✅ **Chat Funcional:**
- `match_accommodations_public()` retorna resultados para tucasamar
- Búsquedas de "habitación San Andrés" incluyen Tu Casa en el Mar
- Similarity scores > 0.5

✅ **Documentación:**
- Problema y solución documentados
- Arquitectura de 2 tablas explicada
- Queries de verificación disponibles
