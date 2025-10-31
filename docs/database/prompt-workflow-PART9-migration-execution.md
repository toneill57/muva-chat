# PROMPT WORKFLOW - PART9: MIGRATION EXECUTION

**Agente:** @agent-database-agent
**Plan de Referencia:** `migration-plan/PLAN_PART9_MIGRATION_EXECUTION.md`
**TODO:** `TODO.md` (FASE 9)
**Duración:** 3.5-4.5 horas (total con prep y validación)

---

## 📋 ARCHIVOS NECESARIOS (Leer ANTES de ejecutar)

**MUST READ:**
- ✅ `migration-plan/PLAN_PART9_MIGRATION_EXECUTION.md` (líneas 1-END) - Execution plan hora-por-hora
- ✅ `MIGRATION_SCRIPTS.md` - Scripts validados en PART8
- ✅ Scripts mejorados: 001_clean_staging.sql, 002_copy_data.ts, 003_validate.sql, 004_rollback.sql

**NO LEER (no necesarios para esta fase):**
- ❌ TABLES_*.md files - Documentación ya completa, no necesaria para ejecución
- ❌ RLS_POLICIES.md - Ya documentado

**INPUTS FROM PREVIOUS PHASES:**
- `_ROW_COUNTS.json` - Expected row counts para validación
- `_DEPENDENCY_TREE.json` - Migration order validado
- Scripts mejorados (001-004) - Ready to execute

---

## 🎯 CONTEXTO GENERAL

```
PROYECTO: Migración de Base de Datos Producción → Staging

OBJETIVO DE ESTA FASE:
Ejecutar la migración completa de producción → staging siguiendo el plan hora-por-hora, con validación completa.

DATABASES:
- Production: ooaumjzaztmutltifhoq (https://ooaumjzaztmutltifhoq.supabase.co)
- Staging: qlvkgniqcoisbnwwjfte (https://qlvkgniqcoisbnwwjfte.supabase.co)

ESTADO ACTUAL:
PART1-8 completados. Documentación completa, scripts validados, listo para execution.

TIMELINE:
- Hour 0: Pre-migration (backups, connections) - 1 hora
- Hour 1: Clean staging (001_clean_staging.sql) - 15 min
- Hour 1-3: Copy data (002_copy_data.ts) - 1-2 horas
- Hour 3: Validation (003_validate.sql) - 30 min
- Hour 3.5: Post-migration (advisors, docs) - 30 min

ROLLBACK:
- Si falla: Usar 004_rollback.sql
- Restore from backup: backups/YYYY-MM-DD/staging_before_migration_*.dump

NEXT STEPS:
Después de PART9, phase 4 (Advisor Remediation: fix code_embeddings RLS).
```

---

## 🚀 PROMPT COPY-PASTE (EJECUTAR AHORA)

**COPY DESDE AQUÍ:**

```
@agent-database-agent

TAREA: Ejecutar la migración completa de producción → staging siguiendo el execution plan hora-por-hora.

CONTEXTO DEL PROYECTO:
Estoy ejecutando la migración completa de producción → staging para MUVA Chat.

**FASE ACTUAL:** PARTE 9 - Ejecución de Migración

ARCHIVOS CLAVE:
- Plan detallado: docs/database/migration-plan/PLAN_PART9_MIGRATION_EXECUTION.md
- Scripts: scripts/migrations/staging/001-004 (clean, copy, validate, rollback)
- Tareas: docs/database/TODO.md (FASE 9)

DATABASES:
- Production (source): ooaumjzaztmutltifhoq
- Staging (target): qlvkgniqcoisbnwwjfte

OBJETIVO:
Ejecutar migración completa en 4 phases:
1. Pre-Migration: Backups, connections, environment (1 hora)
2. Clean Staging: TRUNCATE tables (15 min)
3. Copy Data: Production → Staging (1-2 horas)
4. Validation: Row counts, FK integrity, RLS, sampling (30 min)
5. Post-Migration: Advisors, documentation (30 min)

---

INSTRUCCIONES:

1. **LEE el plan completo:**
   - Archivo: docs/database/migration-plan/PLAN_PART9_MIGRATION_EXECUTION.md
   - Contiene: Hour-by-hour checklist, success criteria, rollback procedure

2. **EJECUTA las fases del plan:**

   **HOUR 0: Pre-Migration (1 hora)**
   - Task 0.1: Verify prerequisites (PART1-8 complete)
   - Task 0.2: Backup databases (prod + staging)
   - Task 0.3: Test connections (prod + staging)
   - Task 0.4: Load .env.local
   - Task 0.5: Test MCP tools
   - Task 0.6: Alert team (migration starting)

   **HOUR 1: Clean Staging (15 min)**
   - Step 1.1: Run 001_clean_staging.sql
   - Step 1.2: Verify all tables = 0 rows

   **HOUR 1-3: Copy Data (1-2 horas)**
   - Step 2.1: Start 002_copy_data.ts
   - Step 2.2: Monitor by level (checkpoints every 15-30 min)
   - Step 2.3: Handle errors (--resume if needed)

   **HOUR 3: Validation (30 min)**
   - Step 3.1: Run 003_validate.sql
   - Step 3.2: Review results (row counts, FK, RLS, sampling)

   **HOUR 3.5: Post-Migration (30 min)**
   - Step 4.1: Run advisor checks (security + performance)
   - Step 4.2: Verify staging errors fixed
   - Step 4.3: Update DOCUMENTATION_PROGRESS.md
   - Step 4.4: Alert team (migration complete)

3. **OUTPUTS REQUERIDOS:**
   - Migration logs: migration_log_YYYYMMDD_HHMMSS.txt
   - Validation log: validation_log_YYYYMMDD_HHMMSS.txt
   - DOCUMENTATION_PROGRESS.md actualizado con summary
   - Team notification (success/rollback)

4. **SUCCESS CRITERIA:**
   - All 41 tables migrated (100%)
   - Row counts match production (41/41 tables)
   - Zero FK violations (49/49 constraints valid)
   - RLS enabled (40/41 tables, code_embeddings known issue)
   - Data sampling passed (8/10 minimum)
   - Vector search working
   - Duration <4.5 hours

---

HERRAMIENTAS A USAR:
- Bash: Ejecutar scripts (001-003), logging con tee
- MCP Supabase: Advisor checks, verify row counts
- File Operations: Edit (DOCUMENTATION_PROGRESS.md)

VALIDACIÓN:
Antes de marcar como completo en TODO.md, verifica:
- [ ] Pre-migration backups completados
- [ ] Clean staging ejecutado exitosamente
- [ ] Copy data completado (41/41 tables)
- [ ] Validation passed (row counts, FK, RLS)
- [ ] Post-migration checks completados
- [ ] DOCUMENTATION_PROGRESS.md actualizado
- [ ] Team notified

ROLLBACK (si necesario):
- [ ] Ejecutar 004_rollback.sql
- [ ] O restore from backup: pg_restore backups/.../staging_before_migration_*.dump
- [ ] Investigar root cause
- [ ] Schedule retry

---

SIGUIENTE PASO:
Después de completar migration exitosamente: Phase 4 (Advisor Remediation) - Fix code_embeddings RLS
```

---

## ✅ SUCCESS CRITERIA

Marca COMPLETE solo si:
- [ ] Todas las fases del PLAN_PART9 ejecutadas
- [ ] Migration successful: 41/41 tables, row counts match
- [ ] Validation passed: FK integrity, RLS, sampling
- [ ] DOCUMENTATION_PROGRESS.md updated con summary
- [ ] Team notified of success
- [ ] TODO.md actualizado con [x] en FASE 9
- [ ] Ready for Phase 4 (Advisor Remediation)

---

**Última actualización:** October 30, 2025
**NOTA:** Esta es la fase FINAL de la migración. Ejecutar con supervisión humana.
