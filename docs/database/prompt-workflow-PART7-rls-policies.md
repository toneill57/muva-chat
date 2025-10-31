# PROMPT WORKFLOW - PART7: RLS POLICIES DOCUMENTATION

**Agente:** @agent-database-agent
**Plan de Referencia:** `migration-plan/PLAN_PART7_RLS_POLICIES.md`
**TODO:** `TODO.md` (FASE 7)
**Duración:** 3-4 horas

---

## 📋 ARCHIVOS NECESARIOS (Leer ANTES de ejecutar)

**MUST READ:**
- ✅ `migration-plan/PLAN_PART7_RLS_POLICIES.md` (líneas 1-END) - Plan completo para RLS documentation
- ✅ `migration-plan/_RLS_POLICIES.json` (from PART1) - 134 políticas exportadas

**NO LEER (no necesarios para esta fase):**
- ❌ `migration-plan/PLAN_PART8-9` - Fases futuras
- ❌ Migration scripts (001-004) - Se validan después

**INPUTS FROM PREVIOUS PHASES:**
- `_RLS_POLICIES.json` - 134 políticas RLS de producción
- TABLES_EMBEDDINGS.md - code_embeddings security issue ya documentado

---

## 🎯 CONTEXTO GENERAL

```
PROYECTO: Migración de Base de Datos Producción → Staging

OBJETIVO DE ESTA FASE:
Documentar todas las 134 políticas RLS agrupadas por patrón de seguridad (tenant isolation, staff auth, guest access, admin-only, public read) en RLS_POLICIES.md (~1500-2000 líneas).

DATABASES:
- Production: ooaumjzaztmutltifhoq (https://ooaumjzaztmutltifhoq.supabase.co)
- Staging: qlvkgniqcoisbnwwjfte (https://qlvkgniqcoisbnwwjfte.supabase.co)

ESTADO ACTUAL:
PART1-6 completados. Todas las tablas documentadas.

CRITICAL:
- 40/41 tablas con RLS
- code_embeddings NO RLS (security gap)
- 5 security patterns: tenant, staff, guest, admin, public

NEXT STEPS:
Después de PART7, validar migration scripts (PART8: Scripts).
```

---

## 🚀 PROMPT COPY-PASTE (EJECUTAR AHORA)

**COPY DESDE AQUÍ:**

```
@agent-database-agent

TAREA: Documentar las 134 políticas RLS agrupadas por patrón de seguridad (tenant isolation, staff, guest, admin, public).

CONTEXTO DEL PROYECTO:
Estoy ejecutando la migración completa de producción → staging para MUVA Chat.

**FASE ACTUAL:** PARTE 7 - Documentación de Políticas RLS

ARCHIVOS CLAVE:
- Plan detallado: docs/database/migration-plan/PLAN_PART7_RLS_POLICIES.md
- Input: docs/database/migration-plan/_RLS_POLICIES.json (134 políticas)
- Tareas: docs/database/TODO.md (FASE 7)

DATABASES:
- Production (source): ooaumjzaztmutltifhoq
- Staging (target): qlvkgniqcoisbnwwjfte

OBJETIVO:
Crear RLS_POLICIES.md (~1500-2000 líneas) documentando:
- 5 security patterns (tenant, staff, guest, admin, public)
- 134 policies agrupadas por tabla (40/41 tables)
- code_embeddings security gap (remediation SQL)
- Test cases para cada pattern

---

INSTRUCCIONES:

1. **LEE el plan completo:**
   - Archivo: docs/database/migration-plan/PLAN_PART7_RLS_POLICIES.md
   - Contiene: 5 security patterns, per-table documentation template, test suite

2. **EJECUTA las tareas del plan:**
   - Task 7.1: Extraer todas las políticas RLS (1 hora)
   - Task 7.2: Categorizar por pattern (tenant, staff, guest, admin, public) (45 min)
   - Task 7.3: Documentar 5 standard patterns (1 hora)
   - Task 7.4: Documentar policies de cada tabla (40 tables) (2 horas)
   - Task 7.5: Documentar code_embeddings missing RLS (30 min)
   - Task 7.6: Crear policy test suite (45 min)

3. **OUTPUTS REQUERIDOS:**
   - `docs/database/RLS_POLICIES.md` (~1500-2000 líneas)
   - 5 security patterns documentados con SQL templates
   - 134 policies documentadas (agrupadas por tabla)
   - code_embeddings security gap + remediation
   - Test suite (5+ test scenarios)

4. **SUCCESS CRITERIA:**
   - Todas las 134 políticas extraídas y documentadas
   - 5 patterns identificados y explicados (con templates SQL)
   - 40 tablas con RLS documentadas (promedio 3-4 policies/tabla)
   - code_embeddings security gap prominently featured
   - Test suite con tenant isolation, staff auth, guest access tests

---

HERRAMIENTAS A USAR:
- MCP Supabase: mcp__supabase__execute_sql (extraer policies: SELECT * FROM pg_policies)
- File Operations: Read (_RLS_POLICIES.json), Write (RLS_POLICIES.md), Edit (DOCUMENTATION_PROGRESS.md)

VALIDACIÓN:
Antes de marcar como completo en TODO.md, verifica:
- [ ] RLS_POLICIES.md creado (~1500-2000 líneas)
- [ ] 5 security patterns documentados con templates
- [ ] 134 políticas documentadas (40 tablas)
- [ ] code_embeddings security gap + remediation SQL
- [ ] Test suite creada (5+ scenarios)
- [ ] DOCUMENTATION_PROGRESS.md actualizado

---

SIGUIENTE PASO:
Después de completar esta fase, usar: docs/database/prompt-workflow-PART8-migration-scripts.md
```

---

## ✅ SUCCESS CRITERIA

Marca COMPLETE solo si:
- [ ] Todas las tareas del PLAN_PART7 ejecutadas
- [ ] RLS_POLICIES.md creado (~1500-2000 líneas)
- [ ] 134 políticas documentadas (40 tablas)
- [ ] code_embeddings remediation documentado
- [ ] TODO.md actualizado con [x] en FASE 7
- [ ] Listo para PARTE 8

---

**Última actualización:** October 30, 2025
