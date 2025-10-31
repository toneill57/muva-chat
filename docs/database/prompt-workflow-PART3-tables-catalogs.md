# PROMPT WORKFLOW - PART3: CATALOG TABLES DOCUMENTATION

**Agente:** @agent-database-agent
**Plan de Referencia:** `migration-plan/PLAN_PART3_TABLES_CATALOGS.md`
**TODO:** `TODO.md` (FASE 3)
**Duración:** 4-4.5 horas

---

## 📋 ARCHIVOS NECESARIOS (Leer ANTES de ejecutar)

**MUST READ:**
- ✅ `migration-plan/PLAN_PART3_TABLES_CATALOGS.md` (líneas 1-END) - Plan completo de documentación de catálogos
- ✅ `TABLES_BASE.md` (template reference) - Formato estándar para documentación

**NO LEER (no necesarios para esta fase):**
- ❌ `migration-plan/PLAN_PART4-9` - Fases futuras
- ❌ TABLES_OPERATIONS.md, TABLES_INTEGRATIONS.md - Se crean después

**INPUTS FROM PREVIOUS PHASES:**
- `_DEPENDENCY_TREE.json` - Para identificar niveles de tablas catálogo (Level 0-1)
- `_ROW_COUNTS.json` - Para verificar row counts de catálogos

---

## 🎯 CONTEXTO GENERAL

```
PROYECTO: Migración de Base de Datos Producción → Staging

OBJETIVO DE ESTA FASE:
Documentar 6-8 tablas catálogo/referencia (SIRE compliance + system catalogs) siguiendo el template de TABLES_BASE.md.

DATABASES:
- Production: ooaumjzaztmutltifhoq (https://ooaumjzaztmutltifhoq.supabase.co)
- Staging: qlvkgniqcoisbnwwjfte (https://qlvkgniqcoisbnwwjfte.supabase.co)

ESTADO ACTUAL:
PART1-2 completados. Dependency tree validado, listo para documentar catálogos.

NEXT STEPS:
Después de PART3, documentar tablas operacionales (PART4: Operations).
```

---

## 🚀 PROMPT COPY-PASTE (EJECUTAR AHORA)

**COPY DESDE AQUÍ:**

```
@agent-database-agent

TAREA: Documentar todas las tablas catálogo/referencia (SIRE + system catalogs) en un nuevo archivo TABLES_CATALOGS.md.

CONTEXTO DEL PROYECTO:
Estoy ejecutando la migración completa de producción → staging para MUVA Chat.

**FASE ACTUAL:** PARTE 3 - Documentación de Tablas Catálogo

ARCHIVOS CLAVE:
- Plan detallado: docs/database/migration-plan/PLAN_PART3_TABLES_CATALOGS.md
- Template: docs/database/TABLES_BASE.md (seguir este formato)
- Tareas: docs/database/TODO.md (FASE 3)

DATABASES:
- Production (source): ooaumjzaztmutltifhoq
- Staging (target): qlvkgniqcoisbnwwjfte

OBJETIVO:
Crear TABLES_CATALOGS.md (~800-1000 líneas) documentando:
- sire_content, sire_cities (SIRE compliance)
- muva_content (tourism content con embeddings)
- meal_plans, room_types, accommodation_types (system catalogs)
- Cualquier otra tabla catálogo identificada

---

INSTRUCCIONES:

1. **LEE el plan completo:**
   - Archivo: docs/database/migration-plan/PLAN_PART3_TABLES_CATALOGS.md
   - Contiene: Template per-table, queries SQL para extraer schemas, query patterns

2. **EJECUTA las tareas del plan:**
   - Task 3.1: Identificar tablas catálogo (small, high-ref, low-write) (30 min)
   - Task 3.2: Extraer schema completo para cada tabla (2 horas)
     - Columnas, PKs, FKs (in/out), Indexes, RLS, Triggers, Sample data
   - Task 3.3: Documentar query patterns comunes (45 min)
   - Task 3.4: Agregar performance y migration notes (30 min)

3. **OUTPUTS REQUERIDOS:**
   - `docs/database/TABLES_CATALOGS.md` - Nuevo archivo (~800-1000 líneas)
   - Documentación de 6-8 tablas catálogo
   - Cada tabla con: schema, FKs, indexes, RLS, query patterns
   - DOCUMENTATION_PROGRESS.md actualizado

4. **SUCCESS CRITERIA:**
   - 6-8 tablas catálogo identificadas y documentadas
   - Cada tabla sigue template de TABLES_BASE.md
   - 2-3 query patterns documentados por tabla
   - Performance notes (read: HIGH, write: LOW, growth: STATIC)
   - Migration notes (DO/DON'T) incluidos

---

HERRAMIENTAS A USAR:
- MCP Supabase: mcp__supabase__execute_sql (queries para schemas), mcp__supabase__list_tables
- File Operations: Read (TABLES_BASE.md template), Write (TABLES_CATALOGS.md), Edit (DOCUMENTATION_PROGRESS.md)
- Grep: Para buscar query patterns en codebase (grep -r "sire_cities" src/)

VALIDACIÓN:
Antes de marcar como completo en TODO.md, verifica:
- [ ] TABLES_CATALOGS.md creado con 800-1000 líneas
- [ ] 6-8 tablas catálogo documentadas
- [ ] Cada tabla tiene schema completo, FKs, indexes, RLS, sample data
- [ ] Query patterns documentados (2-3 por tabla)
- [ ] Performance y migration notes incluidos
- [ ] DOCUMENTATION_PROGRESS.md actualizado

---

SIGUIENTE PASO:
Después de completar esta fase, usar: docs/database/prompt-workflow-PART4-tables-operations.md
```

---

## ✅ SUCCESS CRITERIA

Marca COMPLETE solo si:
- [ ] Todas las tareas del PLAN_PART3 ejecutadas
- [ ] TABLES_CATALOGS.md creado (~800-1000 líneas)
- [ ] 6-8 tablas documentadas completamente
- [ ] TODO.md actualizado con [x] en FASE 3
- [ ] Listo para PARTE 4

---

**Última actualización:** October 30, 2025
