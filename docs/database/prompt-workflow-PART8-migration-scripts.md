# PROMPT WORKFLOW - PART8: MIGRATION SCRIPTS VALIDATION

**Agente:** @agent-database-agent
**Plan de Referencia:** `migration-plan/PLAN_PART8_MIGRATION_SCRIPTS.md`
**TODO:** `TODO.md` (FASE 8)
**Duración:** 2-3 horas

---

## 📋 ARCHIVOS NECESARIOS (Leer ANTES de ejecutar)

**MUST READ:**
- ✅ `migration-plan/PLAN_PART8_MIGRATION_SCRIPTS.md` (líneas 1-END) - Plan para validation/improvement de scripts
- ✅ `migration-plan/_DEPENDENCY_TREE.json` (from PART2) - Validated dependency order
- ✅ `scripts/migrations/staging/001_clean_staging.sql` - Script actual a revisar
- ✅ `scripts/migrations/staging/002_copy_data.ts` - Script actual a revisar
- ✅ `scripts/migrations/staging/003_validate.sql` - Script actual a revisar

**NO LEER (no necesarios para esta fase):**
- ❌ `migration-plan/PLAN_PART9` - Execution plan (siguiente fase)
- ❌ TABLES_*.md files - Ya creados, no necesarios

**INPUTS FROM PREVIOUS PHASES:**
- `_DEPENDENCY_TREE.json` - Validated migration order (truncate: 4→0, insert: 0→4)
- `_ROW_COUNTS.json` - Expected row counts for validation

---

## 🎯 CONTEXTO GENERAL

```
PROYECTO: Migración de Base de Datos Producción → Staging

OBJETIVO DE ESTA FASE:
Validar y mejorar los 3 scripts existentes (001-003) contra el dependency tree validado, y crear nuevo script de rollback (004).

DATABASES:
- Production: ooaumjzaztmutltifhoq (https://ooaumjzaztmutltifhoq.supabase.co)
- Staging: qlvkgniqcoisbnwwjfte (https://qlvkgniqcoisbnwwjfte.supabase.co)

ESTADO ACTUAL:
PART1-7 completados. Toda la documentación ready. Scripts existentes listos para validation.

KEY IMPROVEMENTS:
- 001: Verify TRUNCATE order vs dependency tree
- 002: Add self-ref handling, progress tracking, error recovery
- 003: Add row count comparison, FK checks, RLS verification
- 004: CREATE new rollback script

NEXT STEPS:
Después de PART8, ejecutar migration (PART9: Execution).
```

---

## 🚀 PROMPT COPY-PASTE (EJECUTAR AHORA)

**COPY DESDE AQUÍ:**

```
@agent-database-agent

TAREA: Validar los 3 scripts de migración existentes contra el dependency tree validado y crear script de rollback.

CONTEXTO DEL PROYECTO:
Estoy ejecutando la migración completa de producción → staging para MUVA Chat.

**FASE ACTUAL:** PARTE 8 - Validación y Mejora de Scripts de Migración

ARCHIVOS CLAVE:
- Plan detallado: docs/database/migration-plan/PLAN_PART8_MIGRATION_SCRIPTS.md
- Dependency tree: docs/database/migration-plan/_DEPENDENCY_TREE.json
- Scripts: scripts/migrations/staging/001_clean_staging.sql, 002_copy_data.ts, 003_validate.sql
- Tareas: docs/database/TODO.md (FASE 8)

DATABASES:
- Production (source): ooaumjzaztmutltifhoq
- Staging (target): qlvkgniqcoisbnwwjfte

OBJETIVO:
1. Validar 001_clean_staging.sql (TRUNCATE order vs dependency tree)
2. Mejorar 002_copy_data.ts (self-ref handling, progress, resume)
3. Mejorar 003_validate.sql (row count comparison, FK checks, RLS)
4. Crear 004_rollback.sql (TRUNCATE all + restore options)
5. Documentar en MIGRATION_SCRIPTS.md (~500-700 líneas)

---

INSTRUCCIONES:

1. **LEE el plan completo:**
   - Archivo: docs/database/migration-plan/PLAN_PART8_MIGRATION_SCRIPTS.md
   - Contiene: Checklist de review para cada script, improvements detalladas

2. **EJECUTA las tareas del plan:**
   - Task 8.1: Review 001_clean_staging.sql (45 min)
     - Verificar TRUNCATE order (Level 4→0)
     - Documentar CASCADE usage
     - Agregar comments (level headers, dependencies)
   - Task 8.2: Review 002_copy_data.ts (1 hora)
     - Verificar INSERT order (Level 0→4)
     - Agregar self-ref handling (staff_users.manager_id)
     - Agregar progress tracking, error recovery (--resume)
   - Task 8.3: Review 003_validate.sql (30 min)
     - Agregar row count comparison (prod vs staging)
     - Agregar FK integrity checks
     - Agregar RLS verification, data sampling
   - Task 8.4: Crear 004_rollback.sql (45 min)
     - TRUNCATE all tables option
     - DROP/CREATE schema option
     - Restore from backup option

3. **OUTPUTS REQUERIDOS:**
   - Scripts mejorados: 001_clean_staging.sql, 002_copy_data.ts, 003_validate.sql
   - Nuevo script: 004_rollback.sql
   - `docs/database/MIGRATION_SCRIPTS.md` (~500-700 líneas)
   - DOCUMENTATION_PROGRESS.md actualizado

4. **SUCCESS CRITERIA:**
   - 001: TRUNCATE order matches dependency tree (Level 4→0)
   - 002: INSERT order matches dependency tree (Level 0→4), self-ref handled
   - 003: Row count comparison, FK checks, RLS verification added
   - 004: Rollback script created con 3 options (truncate, drop, restore)
   - MIGRATION_SCRIPTS.md documenta todos los improvements

---

HERRAMIENTAS A USAR:
- File Operations: Read (scripts 001-003, _DEPENDENCY_TREE.json), Edit (mejorar scripts), Write (004_rollback.sql, MIGRATION_SCRIPTS.md)
- Bash: Extractar table order de scripts (grep "TRUNCATE TABLE" 001_clean_staging.sql)

VALIDACIÓN:
Antes de marcar como completo en TODO.md, verifica:
- [ ] 001_clean_staging.sql reviewed (order matches tree)
- [ ] 002_copy_data.ts improved (self-ref, progress, resume)
- [ ] 003_validate.sql enhanced (FK checks, RLS, sampling)
- [ ] 004_rollback.sql created (3 rollback options)
- [ ] MIGRATION_SCRIPTS.md documenta improvements
- [ ] DOCUMENTATION_PROGRESS.md actualizado

---

SIGUIENTE PASO:
Después de completar esta fase, usar: docs/database/prompt-workflow-PART9-migration-execution.md
```

---

## ✅ SUCCESS CRITERIA

Marca COMPLETE solo si:
- [ ] Todas las tareas del PLAN_PART8 ejecutadas
- [ ] Scripts 001-003 validados/mejorados
- [ ] Script 004 creado (rollback)
- [ ] MIGRATION_SCRIPTS.md documentado
- [ ] TODO.md actualizado con [x] en FASE 8
- [ ] Listo para PARTE 9 (Execution)

---

**Última actualización:** October 30, 2025
