# Script Ejecutable - Validación Express Post-Arquitectura

**Proyecto:** Chat Core Stabilization - Validation Express
**Fecha:** Octubre 24, 2025
**Tipo:** Script Copy-Paste (Single Session)
**Estrategia:** SQL Validation + Testing Incremental
**Tiempo Estimado:** 30-45min

---

## 🎯 OBJETIVO

Validar que la **nueva arquitectura** (FK constraint apuntando a `hotels.accommodation_units`) cumple con TODOS los criterios de éxito de FASE 1 + FASE 2 (hasta tarea 2B.3).

**Problema Actual:**
- Implementamos cambio arquitectural significativo (FK constraint a schema privado)
- No hemos re-validado que el flujo completo de diagnosis/fix sigue funcionando
- Necesitamos confirmar que no rompimos nada con la nueva arquitectura

**Estado Deseado:**
- ✅ Todas las queries de FASE 1 (diagnosis) pasan con nueva arquitectura
- ✅ Todas las validaciones de FASE 2A (embeddings) siguen pasando
- ✅ Todas las validaciones de FASE 2B (UUID mapping) pasan
- ✅ FK constraint correctamente configurado y funcional
- ✅ Documentación de validación actualizada

---

## 📊 ESTRATEGIA

**Hybrid Approach:**
- ✅ Single session (validación rápida, sin overhead)
- ✅ TodoList tracking (visibilidad de progreso)
- ✅ SQL queries incrementales (seguridad)
- ✅ NO modifica código (solo validación)
- ⚠️ Reporta inmediatamente si alguna validación falla

**Por qué Script Copy-Paste:**
- Validación bien definida (re-ejecutar queries existentes)
- No requiere cambios de código
- Single-agent (database-agent puede ejecutar todo)
- Ejecución inmediata <45min
- Context usage manejable

---

## 🚀 PROMPT EJECUTABLE (COPY-PASTE)

**Instrucciones:**
1. Haz `/clear` en nueva conversación
2. Copy-paste el siguiente prompt COMPLETO
3. Sigue las instrucciones del asistente

---

### PROMPT COMIENZA AQUÍ ⬇️

```
PROYECTO: Chat Core Stabilization - Validation Express

OBJETIVO:
Validar que la nueva arquitectura (FK → hotels.accommodation_units) cumple TODOS los criterios de FASE 1 + FASE 2 (hasta 2B.3)

CONTEXTO:
- Repo: /Users/oneill/Sites/apps/muva-chat
- Tenant: Simmerdown (b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf)
- Cambio reciente: FK constraint ahora apunta a hotels.accommodation_units (schema privado)
- Expected chunks: 219
- Expected embeddings: text-embedding-3-large (3072d, 1536d, 1024d)
- Expected orphaned chunks: 0
- NO hacer cambios en DB, SOLO validación

---

TASKS (Ejecutar en orden, reportar cada resultado):

## TASK 1: Validación FASE 1 - Diagnosis SQL (10min) 🔴

**Objetivo:** Re-ejecutar todas las queries de diagnosis para confirmar que siguen pasando

**Queries SQL a ejecutar:**

### Query 1.1: Verificar chunks existen
```sql
SELECT COUNT(*) as total_chunks
FROM accommodation_units_manual_chunks
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
```
**EXPECTED:** `total_chunks = 219`

### Query 1.2: Verificar dimensiones embeddings
```sql
SELECT
  vector_dims(embedding) as full_dims,
  vector_dims(embedding_balanced) as balanced_dims,
  vector_dims(embedding_fast) as fast_dims,
  COUNT(*) as chunks
FROM accommodation_units_manual_chunks
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
GROUP BY full_dims, balanced_dims, fast_dims;
```
**EXPECTED:** `full_dims=3072, balanced_dims=1536, fast_dims=1024, chunks=219`

### Query 1.3: Verificar NO hay chunks huérfanos (NUEVA ARQUITECTURA)
```sql
SELECT
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN ha.id IS NULL THEN 1 END) as orphaned_chunks,
  COUNT(CASE WHEN ha.id IS NOT NULL THEN 1 END) as valid_chunks
FROM accommodation_units_manual_chunks aumc
LEFT JOIN hotels.accommodation_units ha ON ha.id = aumc.accommodation_unit_id
WHERE aumc.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
```
**EXPECTED:** `total_chunks=219, orphaned_chunks=0, valid_chunks=219`

### Query 1.4: Test vector search funciona
```sql
SELECT
  section_title,
  chunk_content,
  1 - (embedding <=> '[0.1, -0.2, ...]'::vector) as similarity
FROM accommodation_units_manual_chunks
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
ORDER BY embedding <=> '[0.1, -0.2, ...]'::vector
LIMIT 3;
```
**EXPECTED:** Devuelve 3 results con similarity scores

**VALIDATION:**
- ✅ Todas las queries ejecutan sin error
- ✅ Todos los valores coinciden con EXPECTED
- ❌ Si alguna falla → STOP y reportar

---

## TASK 2: Validación FASE 2A - Embeddings (10min) 🔴

**Objetivo:** Confirmar que embeddings siguen correctos después del cambio de arquitectura

**Queries SQL a ejecutar:**

### Query 2A.1: Completeness de embeddings
```sql
SELECT
  COUNT(*) as total_chunks,
  COUNT(embedding) as has_full,
  COUNT(embedding_balanced) as has_balanced,
  COUNT(embedding_fast) as has_fast
FROM accommodation_units_manual_chunks
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
```
**EXPECTED:** `total_chunks=219, has_full=219, has_balanced=219, has_fast=219`

### Query 2A.2: Sample embedding verification
```sql
SELECT
  id,
  section_title,
  vector_dims(embedding) as full_dim,
  vector_dims(embedding_balanced) as balanced_dim,
  vector_dims(embedding_fast) as fast_dim,
  updated_at
FROM accommodation_units_manual_chunks
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
ORDER BY updated_at DESC
LIMIT 5;
```
**EXPECTED:** Todas las filas tienen `full_dim=3072, balanced_dim=1536, fast_dim=1024`

**VALIDATION:**
- ✅ 100% de chunks tienen los 3 embeddings
- ✅ Todas las dimensiones correctas
- ❌ Si alguna falla → STOP y reportar

---

## TASK 3: Validación FASE 2B - UUID Mapping (15min) 🔴

**Objetivo:** Confirmar que el remap por manual_id funcionó correctamente con nueva arquitectura

**Queries SQL a ejecutar:**

### Query 2B.1: FK Constraint Configuration
```sql
SELECT
  conname AS constraint_name,
  confrelid::regclass AS foreign_table,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'accommodation_units_manual_chunks'::regclass
  AND contype = 'f'
  AND conname LIKE '%accommodation_unit_id%';
```
**EXPECTED:** `foreign_table = hotels.accommodation_units`, `ON DELETE CASCADE`

### Query 2B.2: Distribución de chunks por unit
```sql
SELECT
  ha.name as unit_name,
  COUNT(*) as chunks
FROM accommodation_units_manual_chunks aumc
JOIN hotels.accommodation_units ha ON ha.id = aumc.accommodation_unit_id
WHERE aumc.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
GROUP BY ha.name
ORDER BY chunks DESC;
```
**EXPECTED:**
- Debería devolver ~8 unidades (Jammin', Natural Mystic, Misty Morning, etc.)
- Total de chunks sumados = 219
- Ninguna unidad con 0 chunks

### Query 2B.3: Verificar manual_ids mapeados
```sql
SELECT
  aumc.manual_id,
  ha.name as hotel_unit,
  COUNT(*) as chunks
FROM accommodation_units_manual_chunks aumc
JOIN hotels.accommodation_units ha ON ha.id = aumc.accommodation_unit_id
WHERE aumc.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
GROUP BY aumc.manual_id, ha.name
ORDER BY chunks DESC;
```
**EXPECTED:**
- 8 manual_ids únicos
- Cada manual_id apunta a UNA sola hotel unit
- No hay manual_ids sin unit asignado

**VALIDATION:**
- ✅ FK constraint apunta a hotels.accommodation_units con CASCADE
- ✅ Todas las unidades tienen chunks asignados
- ✅ Todos los manual_ids están correctamente mapeados
- ❌ Si alguna falla → STOP y reportar

---

## TASK 4: Verificación Final Integrada (10min) 🟢

**Objetivo:** Confirmar que todo el sistema funciona end-to-end con nueva arquitectura

**Queries SQL a ejecutar:**

### Query 4.1: Health Check Completo
```sql
SELECT
  'Total Chunks' as metric,
  COUNT(*)::text as value,
  CASE WHEN COUNT(*) = 219 THEN '✅' ELSE '❌' END as status
FROM accommodation_units_manual_chunks
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'

UNION ALL

SELECT
  'Embeddings Complete' as metric,
  COUNT(*)::text as value,
  CASE WHEN COUNT(*) = 219 THEN '✅' ELSE '❌' END as status
FROM accommodation_units_manual_chunks
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND embedding IS NOT NULL
  AND embedding_balanced IS NOT NULL
  AND embedding_fast IS NOT NULL

UNION ALL

SELECT
  'Orphaned Chunks' as metric,
  COUNT(CASE WHEN ha.id IS NULL THEN 1 END)::text as value,
  CASE WHEN COUNT(CASE WHEN ha.id IS NULL THEN 1 END) = 0 THEN '✅' ELSE '❌' END as status
FROM accommodation_units_manual_chunks aumc
LEFT JOIN hotels.accommodation_units ha ON ha.id = aumc.accommodation_unit_id
WHERE aumc.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'

UNION ALL

SELECT
  'FK to Hotels Schema' as metric,
  (SELECT confrelid::regclass::text FROM pg_constraint WHERE conrelid = 'accommodation_units_manual_chunks'::regclass AND contype = 'f' AND conname LIKE '%accommodation_unit_id%') as value,
  CASE WHEN (SELECT confrelid::regclass::text FROM pg_constraint WHERE conrelid = 'accommodation_units_manual_chunks'::regclass AND contype = 'f' AND conname LIKE '%accommodation_unit_id%') = 'hotels.accommodation_units' THEN '✅' ELSE '❌' END as status;
```
**EXPECTED:** Todas las filas con `status = '✅'`

### Query 4.2: Sample Vector Search (Simulación)
```sql
-- Simulación de búsqueda: "¿Cuál es la contraseña del WiFi?"
SELECT
  ha.name as unit,
  aumc.section_title,
  LEFT(aumc.chunk_content, 100) as preview
FROM accommodation_units_manual_chunks aumc
JOIN hotels.accommodation_units ha ON ha.id = aumc.accommodation_unit_id
WHERE aumc.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND (
    aumc.section_title ILIKE '%WiFi%' OR
    aumc.section_title ILIKE '%Contraseña%' OR
    aumc.chunk_content ILIKE '%WiFi%' OR
    aumc.chunk_content ILIKE '%password%'
  )
LIMIT 5;
```
**EXPECTED:** Devuelve 5+ results relacionados con WiFi/passwords

**VALIDATION:**
- ✅ Health check muestra todos ✅
- ✅ Vector search devuelve resultados relevantes
- ✅ Join entre chunks y hotels.accommodation_units funciona
- ❌ Si alguna falla → STOP y reportar

---

INSTRUCCIONES PARA CLAUDE:

1. **Agente:** Usar @agent-database-agent para todas las queries SQL
2. **TodoWrite**: Crear todo list con estas 4 tasks
3. **Ejecutar en orden**: TASK 1 → TASK 2 → TASK 3 → TASK 4
4. **NO avanzar** a siguiente task si alguna query falla
5. **Mostrar resultados** de CADA query al usuario en formato tabla
6. **Comparar** cada resultado con EXPECTED value
7. **Reportar inmediatamente** si algo no coincide
8. **NO hacer cambios** en DB, solo queries SELECT

**FORMATO DE REPORTE:**

Después de cada TASK, mostrar:
```
TASK X: [PASSED ✅ | FAILED ❌]

Query X.Y: [Nombre de query]
Expected: [valor esperado]
Actual: [valor obtenido]
Status: [✅ | ❌]

[Repetir para cada query...]

Summary: X/Y queries passed
```

**VERIFICACIÓN FINAL:**

Al completar TASK 4, generar reporte final:

```markdown
# Validation Express - Final Report

**Fecha:** [Timestamp]
**Tenant:** Simmerdown
**Nueva Arquitectura:** FK → hotels.accommodation_units

## Resultados por Fase

### FASE 1 - Diagnosis
- Total queries: 4
- Passed: X/4
- Status: [✅ PASS | ❌ FAIL]

### FASE 2A - Embeddings
- Total queries: 2
- Passed: X/2
- Status: [✅ PASS | ❌ FAIL]

### FASE 2B - UUID Mapping
- Total queries: 3
- Passed: X/3
- Status: [✅ PASS | ❌ FAIL]

### FASE Final - Integración
- Total queries: 2
- Passed: X/2
- Status: [✅ PASS | ❌ FAIL]

## Summary

**Total Queries:** 11
**Passed:** X/11
**Failed:** Y/11

**Overall Status:** [✅ ALL PASSED | ❌ VALIDATION FAILED]

## Next Steps

[Si todo pasó]
✅ La nueva arquitectura es estable
✅ Todas las fases validadas correctamente
✅ Listo para continuar con FASE 2.8 (testing E2E)

[Si algo falló]
❌ Investigar query que falló
❌ Revisar cambios de arquitectura
❌ Posible rollback necesario
```

¿Listo para empezar con TASK 1?
```

### PROMPT TERMINA AQUÍ ⬆️

---

## 🛡️ SAFETY PROTOCOL

### Queries Read-Only

**TODAS las queries DEBEN ser SELECT:**
```sql
-- ✅ PERMITIDO
SELECT ... FROM ...
SELECT COUNT(*) ...

-- ❌ PROHIBIDO
UPDATE ...
DELETE ...
INSERT ...
ALTER ...
DROP ...
```

### Failure Handling

**Si alguna query falla:**
1. STOP inmediatamente
2. Reportar query exacta que falló
3. Mostrar expected vs actual
4. NO continuar a siguiente TASK
5. Avisar al usuario para investigación

### Success Criteria

**Para considerar validación exitosa:**
- ✅ 11/11 queries pasan
- ✅ Todos los valores coinciden con EXPECTED
- ✅ No hay warnings en logs
- ✅ No hay errores SQL

---

## ✅ TODO LIST (Para tracking durante ejecución)

```markdown
# TODO - Validation Express

- [ ] TASK 1: Validación FASE 1 - Diagnosis SQL (10min)
  - [ ] Query 1.1: Total chunks = 219
  - [ ] Query 1.2: Embedding dims correctas
  - [ ] Query 1.3: 0 chunks huérfanos
  - [ ] Query 1.4: Vector search funciona
  - [ ] REPORT: TASK 1 status

- [ ] TASK 2: Validación FASE 2A - Embeddings (10min)
  - [ ] Query 2A.1: 100% completeness
  - [ ] Query 2A.2: Sample verification
  - [ ] REPORT: TASK 2 status

- [ ] TASK 3: Validación FASE 2B - UUID Mapping (15min)
  - [ ] Query 2B.1: FK constraint correcto
  - [ ] Query 2B.2: Distribución por unit
  - [ ] Query 2B.3: manual_ids mapeados
  - [ ] REPORT: TASK 3 status

- [ ] TASK 4: Verificación Final Integrada (10min)
  - [ ] Query 4.1: Health check completo
  - [ ] Query 4.2: Sample vector search
  - [ ] REPORT: TASK 4 status

- [ ] VERIFICACIÓN FINAL
  - [ ] Generar reporte final markdown
  - [ ] Confirmar 11/11 queries passed
  - [ ] Documentar any failures or warnings
  - [ ] Confirmar ready para FASE 2.8

**Total:** 4 tasks, ~45min, 11 queries SQL, 0 commits (validation only)
```

---

## 📋 EXPECTED RESULTS REFERENCE

### Quick Reference Table

| Query | Metric | Expected Value |
|-------|--------|----------------|
| 1.1 | total_chunks | 219 |
| 1.2 | full_dims | 3072 |
| 1.2 | balanced_dims | 1536 |
| 1.2 | fast_dims | 1024 |
| 1.3 | orphaned_chunks | 0 |
| 1.3 | valid_chunks | 219 |
| 2A.1 | has_full | 219 |
| 2A.1 | has_balanced | 219 |
| 2A.1 | has_fast | 219 |
| 2B.1 | foreign_table | hotels.accommodation_units |
| 2B.2 | total_units | ~8 |
| 2B.3 | unique_manual_ids | 8 |
| 4.1 | all_status | ✅ |
| 4.2 | results_count | ≥5 |

---

## 🔄 PLAN B (Si validación falla)

**Triggers para investigación profunda:**

1. **Query falla por error SQL:**
   - Verificar que migrations se aplicaron correctamente
   - Revisar si FK constraint está activo
   - Confirmar que schema `hotels` existe

2. **Valores no coinciden con EXPECTED:**
   - Investigar qué cambió vs documentación
   - Verificar si hubo data corruption
   - Considerar rollback de migrations

3. **FK constraint issues:**
   - Verificar que hotels.accommodation_units tiene los 10 records esperados
   - Confirmar que manual_ids están correctamente mapeados
   - Revisar logs de migrations

**Acción:**
Si >2 queries fallan → Considerar rollback a estado pre-cambio de arquitectura

---

## 📚 REFERENCES

**Documentación relacionada:**
- `docs/chat-core-stabilization/TODO.md` - Estado actual del proyecto
- `docs/chat-core-stabilization/fase-2/VALIDATION.md` - Validación FASE 2A
- `docs/chat-core-stabilization/fase-2/FASE-2B-VALIDATION.md` - Validación FASE 2B
- `docs/chat-core-stabilization/fase-2/ADR-001-MANUAL-CHUNKS-FK-CONSTRAINT.md` - Decisión de arquitectura

**Migrations aplicadas:**
- `20251024030000_fix_manual_chunks_fk_to_hotels.sql` - Drop FK inicial
- `20251024050000_remap_chunks_by_manual_id.sql` - Remap por manual_id
- `20251024040000_add_fk_manual_chunks_to_hotels.sql` - Add FK a hotels

---

**Última actualización:** Octubre 24, 2025
**Próximo paso:** Ejecutar PROMPT en nueva conversación con `/clear`
**Estimated execution time:** 30-45 minutos
**No commits required:** Validation only
