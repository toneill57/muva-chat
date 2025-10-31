# PROMPT WORKFLOW - PART2: DEPENDENCY TREE VALIDATION

**Agente:** @agent-database-agent
**Plan de Referencia:** `migration-plan/PLAN_PART2_DEPENDENCY_TREE.md`
**TODO:** `TODO.md` (FASE 2)
**Duración:** 4-5 horas

---

## 📋 ARCHIVOS NECESARIOS (Leer ANTES de ejecutar)

**MUST READ:**
- ✅ `migration-plan/PLAN_PART2_DEPENDENCY_TREE.md` (líneas 1-END) - Plan completo de validación de dependencias
- ✅ `migration-plan/_FK_RELATIONSHIPS.json` (output de PART1) - Relaciones FK a validar

**NO LEER (no necesarios para esta fase):**
- ❌ `migration-plan/PLAN_PART3-9` - Fases futuras
- ❌ TABLES_*.md files - Se crean en fases posteriores

**INPUTS FROM PREVIOUS PHASES:**
- `_FK_RELATIONSHIPS.json` - Lista de las 49 relaciones FK de producción

---

## 🎯 CONTEXTO GENERAL

```
PROYECTO: Migración de Base de Datos Producción → Staging

OBJETIVO DE ESTA FASE:
Validar el árbol de dependencias en MIGRATION_ORDER.md usando topological sort de las relaciones FK reales.

DATABASES:
- Production: ooaumjzaztmutltifhoq (https://ooaumjzaztmutltifhoq.supabase.co)
- Staging: qlvkgniqcoisbnwwjfte (https://qlvkgniqcoisbnwwjfte.supabase.co)

ESTADO ACTUAL:
PART1 completado. Tenemos 49 FKs verificados y listos para análisis de dependencias.

NEXT STEPS:
Después de PART2, comenzar documentación de tablas (PART3: Catalogs).
```

---

## 🚀 PROMPT COPY-PASTE (EJECUTAR AHORA)

**COPY DESDE AQUÍ:**

```
@agent-database-agent

TAREA: Validar el árbol de dependencias FK usando topological sort contra el orden claimed en MIGRATION_ORDER.md.

CONTEXTO DEL PROYECTO:
Estoy ejecutando la migración completa de producción → staging para MUVA Chat.

**FASE ACTUAL:** PARTE 2 - Validación del Árbol de Dependencias

ARCHIVOS CLAVE:
- Plan detallado: docs/database/migration-plan/PLAN_PART2_DEPENDENCY_TREE.md
- Input: docs/database/migration-plan/_FK_RELATIONSHIPS.json (49 FKs de PART1)
- Tareas: docs/database/TODO.md (FASE 2)
- A actualizar: docs/database/MIGRATION_ORDER.md

DATABASES:
- Production (source): ooaumjzaztmutltifhoq
- Staging (target): qlvkgniqcoisbnwwjfte

OBJETIVO:
Validar la estructura de 5 niveles de dependencias:
- Level 0 (Root): tablas sin FKs
- Level 1-4: tablas con dependencias, asignadas por max(dependencies) + 1

---

INSTRUCCIONES:

1. **LEE el plan completo:**
   - Archivo: docs/database/migration-plan/PLAN_PART2_DEPENDENCY_TREE.md
   - Contiene: Algoritmo de topological sort, validación de niveles, casos especiales

2. **EJECUTA las tareas del plan:**
   - Task 2.1: Cargar _FK_RELATIONSHIPS.json (15 min)
   - Task 2.2: Identificar tablas Level 0 (sin FKs) (30 min)
   - Task 2.3: Calcular niveles con topological sort (1 hora)
   - Task 2.4: Validar asignaciones de niveles (45 min)
   - Task 2.5: Verificar orden seguro (TRUNCATE y INSERT) (30 min)
   - Task 2.6: Revisar casos especiales (self-ref, nullable, CASCADE) (30 min)
   - Task 2.7: Generar visualización ASCII tree (30 min)

3. **OUTPUTS REQUERIDOS:**
   - `migration-plan/_DEPENDENCY_TREE.json` - Árbol validado con niveles correctos
   - MIGRATION_ORDER.md actualizado con niveles corregidos
   - ASCII tree visualization del árbol de dependencias
   - DOCUMENTATION_PROGRESS.md actualizado con correcciones

4. **SUCCESS CRITERIA:**
   - Topological sort completo sin circular dependencies
   - Todos 41 tablas asignadas a niveles correctos
   - Orden TRUNCATE validado (Level 4→0)
   - Orden INSERT validado (Level 0→4)
   - Casos especiales documentados (self-ref: staff_users)

---

HERRAMIENTAS A USAR:
- MCP Supabase: mcp__supabase__execute_sql (queries para verificar FKs, CASCADE rules)
- File Operations: Read (_FK_RELATIONSHIPS.json, MIGRATION_ORDER.md), Edit (actualizar niveles), Write (_DEPENDENCY_TREE.json)

VALIDACIÓN:
Antes de marcar como completo en TODO.md, verifica:
- [ ] Topological sort ejecutado exitosamente
- [ ] No hay circular dependencies
- [ ] Todas las 41 tablas tienen nivel asignado
- [ ] _DEPENDENCY_TREE.json exportado
- [ ] MIGRATION_ORDER.md actualizado con validaciones
- [ ] Self-referencing tables documentadas

---

SIGUIENTE PASO:
Después de completar esta fase, usar: docs/database/prompt-workflow-PART3-tables-catalogs.md
```

---

## ✅ SUCCESS CRITERIA

Marca COMPLETE solo si:
- [ ] Todas las tareas del PLAN_PART2 ejecutadas
- [ ] _DEPENDENCY_TREE.json generado con niveles validados
- [ ] MIGRATION_ORDER.md actualizado
- [ ] No circular dependencies detectadas
- [ ] TODO.md actualizado con [x] en FASE 2
- [ ] Listo para PARTE 3

---

**Última actualización:** October 30, 2025
