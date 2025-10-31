# PROMPT WORKFLOW - PART5: INTEGRATION TABLES DOCUMENTATION

**Agente:** @agent-database-agent
**Plan de Referencia:** `migration-plan/PLAN_PART5_TABLES_INTEGRATIONS.md`
**TODO:** `TODO.md` (FASE 5)
**Duración:** 3-4 horas

---

## 📋 ARCHIVOS NECESARIOS (Leer ANTES de ejecutar)

**MUST READ:**
- ✅ `migration-plan/PLAN_PART5_TABLES_INTEGRATIONS.md` (líneas 1-END) - Plan completo para integrations
- ✅ `TABLES_BASE.md` (template reference)

**NO LEER (no necesarios para esta fase):**
- ❌ `migration-plan/PLAN_PART6-9` - Fases futuras
- ❌ TABLES_EMBEDDINGS.md - Aún no creado

**INPUTS FROM PREVIOUS PHASES:**
- `_DEPENDENCY_TREE.json` - Niveles de integration tables
- TABLES_OPERATIONS.md - Referencia de formato

---

## 🎯 CONTEXTO GENERAL

```
PROYECTO: Migración de Base de Datos Producción → Staging

OBJETIVO DE ESTA FASE:
Documentar 9-11 tablas de integración externa (Motopress, Airbnb, WhatsApp) en TABLES_INTEGRATIONS.md (~1000-1200 líneas).

DATABASES:
- Production: ooaumjzaztmutltifhoq (https://ooaumjzaztmutltifhoq.supabase.co)
- Staging: qlvkgniqcoisbnwwjfte (https://qlvkgniqcoisbnwwjfte.supabase.co)

ESTADO ACTUAL:
PART1-4 completados. Catalogs y operations documentados.

NEXT STEPS:
Después de PART5, documentar tablas de embeddings (PART6: Embeddings).
```

---

## 🚀 PROMPT COPY-PASTE (EJECUTAR AHORA)

**COPY DESDE AQUÍ:**

```
@agent-database-agent

TAREA: Documentar tablas de integración externa (Motopress, Airbnb, WhatsApp) agrupadas por plataforma en TABLES_INTEGRATIONS.md.

CONTEXTO DEL PROYECTO:
Estoy ejecutando la migración completa de producción → staging para MUVA Chat.

**FASE ACTUAL:** PARTE 5 - Documentación de Tablas de Integración

ARCHIVOS CLAVE:
- Plan detallado: docs/database/migration-plan/PLAN_PART5_TABLES_INTEGRATIONS.md
- Workflow reference: docs/workflows/ACCOMMODATION_SYNC_UNIVERSAL.md (sync flows)
- Tareas: docs/database/TODO.md (FASE 5)

DATABASES:
- Production (source): ooaumjzaztmutltifhoq
- Staging (target): qlvkgniqcoisbnwwjfte

OBJETIVO:
Crear TABLES_INTEGRATIONS.md (~1000-1200 líneas) documentando:
- Motopress (PMS): motopress_accommodations, motopress_accommodation_units, motopress_room_types, motopress_sync_log
- Airbnb (Calendar): airbnb_accommodations, airbnb_calendar_sync_status, airbnb_sync_log
- WhatsApp Business: whatsapp_business_accounts, whatsapp_phone_numbers, whatsapp_messages, whatsapp_message_templates
- Generic Support: integration_configs, ics_feed_configurations, sync_history

---

INSTRUCCIONES:

1. **LEE el plan completo:**
   - Archivo: docs/database/migration-plan/PLAN_PART5_TABLES_INTEGRATIONS.md
   - Contiene: Integration-specific details, API endpoints, sync frequencies, external ID mapping

2. **EJECUTA las tareas del plan:**
   - Task 5.1: Identificar integration tables (prefix: motopress_*, airbnb_*, whatsapp_*) (30 min)
   - Task 5.2: Extraer schema con atención a external_id fields (2 horas)
   - Task 5.3: Documentar integration-specific details (API, sync flow, frequency) (1 hora)
   - Task 5.4: Query patterns (find stale syncs, mapping queries) (45 min)
   - Task 5.5: Migration notes (preserve external IDs!) (30 min)

3. **OUTPUTS REQUERIDOS:**
   - `docs/database/TABLES_INTEGRATIONS.md` (~1000-1200 líneas)
   - 9-11 tablas agrupadas por plataforma
   - Integration-specific section: API endpoints, sync direction, frequency
   - Migration critical: PRESERVE external IDs (breaking change si modifican)

4. **SUCCESS CRITERIA:**
   - 9-11 integration tables documentadas, agrupadas por plataforma
   - Integration-specific details: API, sync flow, external ID mapping
   - Query patterns: sync status, mapping queries, error logs
   - Migration warnings: NEVER modify external_ids

---

HERRAMIENTAS A USAR:
- MCP Supabase: mcp__supabase__execute_sql (schemas, external_id columns)
- File Operations: Write (TABLES_INTEGRATIONS.md), Edit (DOCUMENTATION_PROGRESS.md)
- Grep: Buscar integration code (grep -r "motopress_accommodations" src/)

VALIDACIÓN:
Antes de marcar como completo en TODO.md, verifica:
- [ ] TABLES_INTEGRATIONS.md creado (~1000-1200 líneas)
- [ ] 9-11 tablas agrupadas por plataforma (Motopress, Airbnb, WhatsApp)
- [ ] Integration-specific details documentados (API, sync)
- [ ] External ID preservation destacado en migration notes
- [ ] Query patterns para sync status y mapping
- [ ] DOCUMENTATION_PROGRESS.md actualizado

---

SIGUIENTE PASO:
Después de completar esta fase, usar: docs/database/prompt-workflow-PART6-tables-embeddings.md
```

---

## ✅ SUCCESS CRITERIA

Marca COMPLETE solo si:
- [ ] Todas las tareas del PLAN_PART5 ejecutadas
- [ ] TABLES_INTEGRATIONS.md creado (~1000-1200 líneas)
- [ ] 9-11 tablas documentadas, agrupadas por plataforma
- [ ] TODO.md actualizado con [x] en FASE 5
- [ ] Listo para PARTE 6

---

**Última actualización:** October 30, 2025
