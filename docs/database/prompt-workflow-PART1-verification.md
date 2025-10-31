# PROMPT WORKFLOW - PART1: DATABASE STATISTICS VERIFICATION

**Agente:** @agent-database-agent
**Plan de Referencia:** `migration-plan/PLAN_PART1_VERIFICATION.md`
**TODO:** `TODO.md` (FASE 1)
**Duración:** 6-7 horas
**Status:** ✅ ALREADY COMPLETED (Oct 30, 2025)

---

## 📋 ARCHIVOS NECESARIOS (Leer ANTES de ejecutar)

**MUST READ:**
- ✅ `migration-plan/PLAN_PART1_VERIFICATION.md` (líneas 1-END) - Plan completo de verificación

**NO LEER (no necesarios para esta fase):**
- ❌ `migration-plan/PLAN_PART2-9` - Fases futuras
- ❌ Migration scripts (001-004) - Se usan en PART8-9

**INPUTS FROM PREVIOUS PHASES:**
- None (esta es la primera fase)

---

## 🎯 CONTEXTO GENERAL

```
PROYECTO: Migración de Base de Datos Producción → Staging

OBJETIVO DE ESTA FASE:
Verificar todas las estadísticas en OVERVIEW.md contra la base de datos real de producción.

DATABASES:
- Production: ooaumjzaztmutltifhoq (https://ooaumjzaztmutltifhoq.supabase.co)
- Staging: qlvkgniqcoisbnwwjfte (https://qlvkgniqcoisbnwwjfte.supabase.co)

ESTADO ACTUAL:
Esta fase ya fue completada el 30 de octubre de 2025. Este workflow es para referencia o re-ejecución si es necesario.

NEXT STEPS:
Después de PART1, proceder a PART2 (validación del árbol de dependencias).
```

---

## 🚀 PROMPT COPY-PASTE (EJECUTAR AHORA)

**COPY DESDE AQUÍ:**

```
@agent-database-agent

TAREA: Verificar todas las estadísticas de la base de datos de producción contra las afirmaciones en OVERVIEW.md.

CONTEXTO DEL PROYECTO:
Estoy ejecutando la migración completa de producción → staging para MUVA Chat.

**FASE ACTUAL:** PARTE 1 - Verificación de Estadísticas de Base de Datos

ARCHIVOS CLAVE:
- Plan detallado: docs/database/migration-plan/PLAN_PART1_VERIFICATION.md
- Tareas: docs/database/TODO.md (FASE 1)
- Documentación a actualizar: docs/database/OVERVIEW.md, ADVISORS_ANALYSIS.md

DATABASES:
- Production (source): ooaumjzaztmutltifhoq
- Staging (target): qlvkgniqcoisbnwwjfte

OBJETIVO:
Ejecutar 9 queries de verificación contra producción para validar:
- Total de tablas (claimed: 41)
- Foreign keys (claimed: 49)
- RLS policies (claimed: 134)
- Índices (claimed: 225)
- Triggers (claimed: 21)
- Funciones (claimed: 207)
- Columnas vector (claimed: 22 across 13 tables)
- Tenants activos (claimed: 3)
- Advisors (claimed: 232 total)

---

INSTRUCCIONES:

1. **LEE el plan completo:**
   - Archivo: docs/database/migration-plan/PLAN_PART1_VERIFICATION.md
   - Contiene: 9 queries SQL de verificación con resultados esperados

2. **EJECUTA las tareas del plan:**
   - Task 1.1: Verificar conteo de tablas (30 min)
   - Task 1.2: Verificar conteo de FKs (30 min)
   - Task 1.3: Verificar políticas RLS (45 min)
   - Task 1.4: Verificar índices (30 min)
   - Task 1.5: Verificar triggers (30 min)
   - Task 1.6: Verificar funciones (30 min)
   - Task 1.7: Verificar columnas vector (45 min)
   - Task 1.8: Verificar tenants y row counts (1 hora)
   - Task 1.9: Verificar advisors con MCP tools (30 min)

3. **OUTPUTS REQUERIDOS:**
   - `migration-plan/_FK_RELATIONSHIPS.json` - Relaciones FK para PART2
   - `migration-plan/_ROW_COUNTS.json` - Conteo de filas para validación
   - `migration-plan/_RLS_POLICIES.json` - Políticas RLS para PART7
   - OVERVIEW.md actualizado con estadísticas verificadas
   - ADVISORS_ANALYSIS.md actualizado con conteos reales

4. **SUCCESS CRITERIA:**
   - Todas las 9 queries ejecutadas exitosamente
   - Discrepancias documentadas (>10% diferencia = crítico)
   - 3 archivos JSON exportados
   - OVERVIEW.md tiene timestamp "Last Verified: [DATE]"

---

HERRAMIENTAS A USAR:
- MCP Supabase: mcp__supabase__execute_sql, mcp__supabase__list_tables, mcp__supabase__get_advisors
- File Operations: Read (OVERVIEW.md), Edit (actualizar stats), Write (JSON exports)

VALIDACIÓN:
Antes de marcar como completo en TODO.md, verifica:
- [ ] Los 9 queries ejecutados contra producción
- [ ] Discrepancias <10% o explicadas
- [ ] 3 archivos JSON creados en migration-plan/
- [ ] OVERVIEW.md actualizado con "Last Verified"
- [ ] No tablas sin RLS (excepto code_embeddings)

---

SIGUIENTE PASO:
Después de completar esta fase, usar: docs/database/prompt-workflow-PART2-dependency-tree.md
```

---

## ✅ SUCCESS CRITERIA

Marca COMPLETE solo si:
- [ ] Todas las tareas del PLAN_PART1 ejecutadas
- [ ] Todos los outputs generados (_FK_RELATIONSHIPS.json, _ROW_COUNTS.json, _RLS_POLICIES.json)
- [ ] Validaciones pasadas (discrepancias explicadas)
- [ ] TODO.md actualizado con [x] en FASE 1
- [ ] Listo para PARTE 2

---

**Última actualización:** October 30, 2025
**Nota:** Esta fase ya fue completada. Este workflow es para re-ejecución si es necesario.
