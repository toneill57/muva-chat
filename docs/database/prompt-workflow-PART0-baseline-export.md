# PROMPT WORKFLOW - PART0: Baseline Migration Export

**Agente:** @agent-database-agent
**Plan de Referencia:** `migration-plan/PLAN_PART0_BASELINE_EXPORT.md`
**TODO:** `TODO.md` (FASE 0)
**Duración:** 4-5 horas

---

## 📋 ARCHIVOS NECESARIOS (Leer ANTES de ejecutar)

**MUST READ:**
- ✅ `migration-plan/PLAN_PART0_BASELINE_EXPORT.md` (complete plan)

**NO LEER (no necesarios para esta fase):**
- ❌ `migration-plan/PLAN_PART1-9` - Future phases

**INPUTS FROM PREVIOUS PHASES:**
- None (this is FASE 0 - first phase before verification)

---

## 🎯 CONTEXTO GENERAL

```
PROYECTO: Migración de Base de Datos Producción → Staging

OBJETIVO DE ESTA FASE:
Export complete DDL (Data Definition Language) from production database to create baseline migration files that can recreate entire schema from scratch.

DATABASES:
- Production: ooaumjzaztmutltifhoq (https://ooaumjzaztmutltifhoq.supabase.co) - SOURCE
- Staging: qlvkgniqcoisbnwwjfte (https://qlvkgniqcoisbnwwjfte.supabase.co) - TEST TARGET

ESTADO ACTUAL:
- Schema exists in production (41 tables, 40 FKs, 134 RLS policies)
- Need baseline SQL files for disaster recovery and new environments

NEXT STEPS:
After baseline export, proceed to FASE 1 verification (already executed) or use baseline to setup new environments.
```

---

## 🚀 PROMPT COPY-PASTE (EJECUTAR AHORA)

**COPY DESDE AQUÍ:**

```
@agent-database-agent

TAREA: Export complete DDL from production as baseline migration

CONTEXTO DEL PROYECTO:
Estoy creando el **paquete completo de migración** para MUVA Chat database.

**FASE ACTUAL:** PARTE 0 - Baseline Migration Export

ARCHIVOS CLAVE:
- Plan detallado: docs/database/migration-plan/PLAN_PART0_BASELINE_EXPORT.md
- Tareas: docs/database/TODO.md (FASE 0)

DATABASES:
- Production (source): ooaumjzaztmutltifhoq

OBJETIVO:
Generate 7 SQL files that contain ALL DDL needed to recreate MUVA Chat database from empty PostgreSQL instance.

**Why this is critical:**
- ✅ Disaster recovery (recreate DB if production crashes)
- ✅ New environments (dev/staging/prod from baseline)
- ✅ CI/CD (automated testing with clean DB)
- ✅ Documentation (executable SQL always up-to-date)

---

INSTRUCCIONES:

1. **LEE el plan completo:**
   - Archivo: docs/database/migration-plan/PLAN_PART0_BASELINE_EXPORT.md
   - Contiene: 9 tasks (0.1 through 0.9) with exact SQL queries

2. **EJECUTA las 9 tareas:**
   - Task 0.1: Export extensions (pgvector, uuid-ossp, etc.)
   - Task 0.2: Export all 41 tables DDL (in dependency order)
   - Task 0.3: Export primary keys and foreign keys
   - Task 0.4: Export all 225 indexes (including IVFFlat for vectors)
   - Task 0.5: Export all 207 functions
   - Task 0.6: Export all 14 triggers
   - Task 0.7: Export all 134 RLS policies
   - Task 0.8: Create unified baseline_migration.sql (includes all above)
   - Task 0.9: Test baseline on staging database (verify it works)

3. **OUTPUTS REQUERIDOS:**
   Create in: `docs/database/migrations/baseline/`
   - 000_extensions.sql (~20 lines)
   - 001_tables.sql (~800-1000 lines, 41 tables)
   - 002_indexes.sql (~300-400 lines, 225 indexes)
   - 003_functions.sql (~1500-2000 lines, 207 functions)
   - 004_triggers.sql (~30-40 lines, 14 triggers)
   - 005_rls_policies.sql (~400-500 lines, 134 policies)
   - baseline_migration.sql (~60-80 lines, includes all)

4. **SUCCESS CRITERIA:**
   - [ ] All 7 SQL files generated
   - [ ] baseline_migration.sql tested on staging (clean execution)
   - [ ] Validation queries confirm: 41 tables, 40 FKs, 225 indexes, 207 functions, 14 triggers, 134 policies
   - [ ] No errors or warnings during execution

---

HERRAMIENTAS A USAR:
- MCP Supabase: mcp__supabase__execute_sql (for querying DDL from production)
- File Operations: Write (for creating 7 SQL files)

VALIDACIÓN:
Antes de marcar como completo en TODO.md, verifica:
- [ ] Executed baseline_migration.sql on staging
- [ ] All tables created (41)
- [ ] All indexes created (225)
- [ ] All functions created (207)
- [ ] All RLS policies created (134)
- [ ] Zero errors during execution

---

SIGUIENTE PASO:
Después de completar esta fase, tienes el **paquete completo**:
- ✅ Baseline DDL (recreate schema from scratch)
- 🔜 Data migration scripts (FASE 8-9)
- 🔜 Documentation (FASE 1-7)

You can now:
1. Setup new environments instantly (run baseline_migration.sql)
2. Disaster recovery (recreate DB structure)
3. Continue with FASE 1 verification (already executed)
```

---

## ✅ SUCCESS CRITERIA

Marca COMPLETE solo si:
- [ ] Todas las 9 tareas del PLAN_PART0 ejecutadas
- [ ] 7 archivos SQL creados en migrations/baseline/
- [ ] baseline_migration.sql tested on staging successfully
- [ ] TODO.md actualizado con [x] en tareas completadas
- [ ] Baseline can recreate entire DB schema

---

**Última actualización:** October 30, 2025
