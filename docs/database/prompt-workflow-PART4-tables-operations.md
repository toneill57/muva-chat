# PROMPT WORKFLOW - PART4: OPERATIONS TABLES DOCUMENTATION

**Agente:** @agent-database-agent
**Plan de Referencia:** `migration-plan/PLAN_PART4_TABLES_OPERATIONS.md`
**TODO:** `TODO.md` (FASE 4)
**Duración:** 3-4 horas

---

## 📋 ARCHIVOS NECESARIOS (Leer ANTES de ejecutar)

**MUST READ:**
- ✅ `migration-plan/PLAN_PART4_TABLES_OPERATIONS.md` (líneas 1-END) - Plan completo para operations tables
- ✅ `TABLES_BASE.md` (template reference) - Formato estándar

**NO LEER (no necesarios para esta fase):**
- ❌ `migration-plan/PLAN_PART5-9` - Fases futuras
- ❌ TABLES_INTEGRATIONS.md, TABLES_EMBEDDINGS.md - Aún no creados

**INPUTS FROM PREVIOUS PHASES:**
- `_DEPENDENCY_TREE.json` - Niveles de dependency (Level 2-4)
- `_ROW_COUNTS.json` - Row counts actuales
- TABLES_CATALOGS.md - Referencia de formato

---

## 🎯 CONTEXTO GENERAL

```
PROYECTO: Migración de Base de Datos Producción → Staging

OBJETIVO DE ESTA FASE:
Documentar 10-12 tablas operacionales core (bookings, conversations, calendar) en TABLES_OPERATIONS.md (~1200-1500 líneas).

DATABASES:
- Production: ooaumjzaztmutltifhoq (https://ooaumjzaztmutltifhoq.supabase.co)
- Staging: qlvkgniqcoisbnwwjfte (https://qlvkgniqcoisbnwwjfte.supabase.co)

ESTADO ACTUAL:
PART1-3 completados. Catálogos documentados, listo para operations.

NEXT STEPS:
Después de PART4, documentar tablas de integración (PART5: Integrations).
```

---

## 🚀 PROMPT COPY-PASTE (EJECUTAR AHORA)

**COPY DESDE AQUÍ:**

```
@agent-database-agent

TAREA: Documentar tablas operacionales core (accommodations, reservations, conversations, calendar) en TABLES_OPERATIONS.md.

CONTEXTO DEL PROYECTO:
Estoy ejecutando la migración completa de producción → staging para MUVA Chat.

**FASE ACTUAL:** PARTE 4 - Documentación de Tablas Operacionales

ARCHIVOS CLAVE:
- Plan detallado: docs/database/migration-plan/PLAN_PART4_TABLES_OPERATIONS.md
- Template: docs/database/TABLES_BASE.md (seguir formato)
- Reference: docs/database/TABLES_CATALOGS.md (ejemplo completado)
- Tareas: docs/database/TODO.md (FASE 4)

DATABASES:
- Production (source): ooaumjzaztmutltifhoq
- Staging (target): qlvkgniqcoisbnwwjfte

OBJETIVO:
Crear TABLES_OPERATIONS.md (~1200-1500 líneas) documentando:
- Booking System: accommodations, accommodation_units, guest_reservations, reservation_accommodations
- Communication: guest_conversations, chat_messages, prospective_sessions, prospective_messages
- Calendar: calendar_events, calendar_event_conflicts
- Legacy/Support: hotel_operations, hotels

---

INSTRUCCIONES:

1. **LEE el plan completo:**
   - Archivo: docs/database/migration-plan/PLAN_PART4_TABLES_OPERATIONS.md
   - Contiene: Template, queries SQL, ejemplos de query patterns con JOINs complejos

2. **EJECUTA las tareas del plan:**
   - Task 4.1: Identificar operations tables (medium vol, high activity) (30 min)
   - Task 4.2: Extraer schema completo para cada tabla (2 horas)
   - Task 4.3: Documentar query patterns (2-4 por tabla con JOINs) (1 hora)
   - Task 4.4: Performance y migration notes (45 min)

3. **OUTPUTS REQUERIDOS:**
   - `docs/database/TABLES_OPERATIONS.md` - Nuevo archivo (~1200-1500 líneas)
   - 10-12 tablas operations documentadas
   - Query patterns complejos (JOINs multi-tabla)
   - Performance notes (HIGH read/write, FAST growth)

4. **SUCCESS CRITERIA:**
   - 10-12 tablas operations identificadas
   - Cada tabla con schema completo, FKs, indexes, RLS
   - 2-4 query patterns por tabla (incluir complex JOINs)
   - Migration notes: FK integrity, date validation, batch sizes

---

HERRAMIENTAS A USAR:
- MCP Supabase: mcp__supabase__execute_sql (extraer schemas, sample data)
- File Operations: Write (TABLES_OPERATIONS.md), Edit (DOCUMENTATION_PROGRESS.md)
- Grep: Buscar query patterns en codebase (grep -r "guest_reservations" src/)

VALIDACIÓN:
Antes de marcar como completo en TODO.md, verifica:
- [ ] TABLES_OPERATIONS.md creado (~1200-1500 líneas)
- [ ] 10-12 tablas operations documentadas
- [ ] Query patterns incluyen complex JOINs
- [ ] Performance considerations documentadas
- [ ] Migration special handling (self-ref, nullable FKs)
- [ ] DOCUMENTATION_PROGRESS.md actualizado

---

SIGUIENTE PASO:
Después de completar esta fase, usar: docs/database/prompt-workflow-PART5-tables-integrations.md
```

---

## ✅ SUCCESS CRITERIA

Marca COMPLETE solo si:
- [ ] Todas las tareas del PLAN_PART4 ejecutadas
- [ ] TABLES_OPERATIONS.md creado (~1200-1500 líneas)
- [ ] 10-12 tablas documentadas con query patterns
- [ ] TODO.md actualizado con [x] en FASE 4
- [ ] Listo para PARTE 5

---

**Última actualización:** October 30, 2025
