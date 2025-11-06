# TODO - Database Sync Staging

**Proyecto:** Sincronización Completa Dev → Staging Database
**Fecha:** November 6, 2025
**Plan:** Ver `database-sync-plan.md` para contexto completo

---

## FASE 1: Análisis Exhaustivo de Dev 🎯

### 1.1 Configurar herramientas de análisis
- [ ] Crear script base para análisis con MCP tools (estimate: 0.5h)
  - Setup conexión a dev database
  - Configurar logging detallado
  - Files: `scripts/analyze-dev-database.ts`
  - Agent: **@agent-database-agent**
  - Test: pnpm dlx tsx scripts/analyze-dev-database.ts --test

### 1.2 Inventario completo de tablas
- [ ] Listar TODAS las tablas en schema public (estimate: 0.5h)
  - Detectar las 30 tablas conocidas
  - Incluir counts de registros
  - Verificar tablas faltantes en script actual
  - Files: `docs/database-sync/fase-1/TABLES_INVENTORY.json`
  - Agent: **@agent-database-agent**
  - Test: mcp__supabase__list_tables({project_id: "dev", schemas: ["public"]})

### 1.3 Inventario schema hotels
- [ ] Listar tablas en schema hotels (estimate: 0.25h)
  - Detectar hotels.accommodation_units (26 rows)
  - Detectar hotels.policies (9 rows)
  - Files: `docs/database-sync/fase-1/TABLES_INVENTORY.json`
  - Agent: **@agent-database-agent**
  - Test: mcp__supabase__list_tables({project_id: "dev", schemas: ["hotels"]})

### 1.4 Mapeo de relaciones y constraints
- [ ] Documentar todas las foreign keys (estimate: 0.5h)
  - Identificar dependencias entre tablas
  - Definir orden correcto de sync
  - Files: `docs/database-sync/fase-1/DATABASE_ANALYSIS.md`
  - Agent: **@agent-database-agent**
  - Test: Query information_schema.key_column_usage

### 1.5 Inventario de funciones, triggers y vistas
- [ ] Listar objetos de database (estimate: 0.25h)
  - Funciones RPC
  - Triggers activos
  - Vistas materializadas
  - Files: `docs/database-sync/fase-1/DATABASE_ANALYSIS.md`
  - Agent: **@agent-database-agent**
  - Test: Query pg_proc, pg_trigger, pg_views

---

## FASE 2: Backup Completo con Verificación ⚙️

### 2.1 Script de backup automatizado
- [ ] Crear script robusto de backup (estimate: 0.5h)
  - Usar pg_dump con opciones correctas
  - Incluir schemas: public, hotels
  - Generar timestamp automático
  - Files: `scripts/backup-dev-complete.ts`
  - Agent: **@agent-database-agent**
  - Test: pnpm dlx tsx scripts/backup-dev-complete.ts --dry-run

### 2.2 Ejecutar backup de schema
- [ ] Generar backup DDL completo (estimate: 0.5h)
  - Solo estructura, sin datos
  - Incluir constraints y indices
  - Files: `backups/dev-schema-{timestamp}.sql`
  - Agent: **@agent-database-agent**
  - Test: Verificar archivo > 100KB

### 2.3 Ejecutar backup de datos
- [ ] Generar backup DML completo (estimate: 0.5h)
  - Solo datos, sin estructura
  - Formato COPY para performance
  - Files: `backups/dev-data-{timestamp}.sql`
  - Agent: **@agent-database-agent**
  - Test: Verificar todas las tablas presentes

### 2.4 Generar checksums y validación
- [ ] Crear SHA256 para verificación (estimate: 0.25h)
  - Checksum de cada archivo
  - Script de verificación
  - Files: `backups/*.sha256`
  - Agent: **@agent-backend-developer**
  - Test: sha256sum -c backups/*.sha256

### 2.5 Documentar backup
- [ ] Crear reporte de backup (estimate: 0.25h)
  - Timestamp, tamaño, tablas incluidas
  - Comando exacto usado
  - Files: `docs/database-sync/fase-2/BACKUP_REPORT.md`
  - Agent: **@agent-database-agent**
  - Test: Verificar documentación completa

---

## FASE 3: Preparación de Staging ✨

### 3.1 Snapshot de staging actual
- [ ] Backup staging antes de modificar (estimate: 0.5h)
  - Para rollback si algo falla
  - Incluir schema y datos actuales
  - Files: `backups/staging-snapshot-{timestamp}.sql`
  - Agent: **@agent-database-agent**
  - Test: Verificar archivo creado

### 3.2 Script de limpieza segura
- [ ] Crear script para limpiar staging (estimate: 0.25h)
  - Desactivar triggers temporalmente
  - Orden correcto respetando FK
  - Files: `scripts/prepare-staging.ts`
  - Agent: **@agent-database-agent**
  - Test: pnpm dlx tsx scripts/prepare-staging.ts --dry-run

### 3.3 Ejecutar limpieza de datos
- [ ] Limpiar todas las tablas en staging (estimate: 0.25h)
  - TRUNCATE CASCADE con cuidado
  - Preservar estructura
  - Agent: **@agent-database-agent**
  - Test: Verificar counts = 0

---

## FASE 4: Sincronización Completa 🎨

### 4.1 Script de sincronización de schema
- [ ] Crear script para DDL sync (estimate: 1h)
  - Detectar diferencias de schema
  - Generar ALTER statements
  - Manejo de errores robusto
  - Files: `scripts/sync-schema.ts`
  - Agent: **@agent-backend-developer**
  - Test: pnpm dlx tsx scripts/sync-schema.ts --validate

### 4.2 Script de sincronización de datos
- [ ] Crear script para DML sync (estimate: 1h)
  - Orden correcto por FK dependencies
  - Batch inserts para performance
  - Retry logic en caso de error
  - Files: `scripts/sync-data.ts`
  - Agent: **@agent-backend-developer**
  - Test: pnpm dlx tsx scripts/sync-data.ts --validate

### 4.3 Ejecutar sync de schema
- [ ] Aplicar cambios DDL en staging (estimate: 0.5h)
  - Crear tablas faltantes
  - Actualizar estructura
  - Files: `logs/sync-schema-{timestamp}.log`
  - Agent: **@agent-database-agent**
  - Test: Comparar schemas dev vs staging

### 4.4 Ejecutar sync de datos
- [ ] Copiar todos los datos a staging (estimate: 0.5h)
  - Ejecutar en orden de dependencias
  - Verificar cada tabla
  - Files: `logs/sync-data-{timestamp}.log`
  - Agent: **@agent-backend-developer**
  - Test: Comparar row counts

---

## FASE 5: Validación Exhaustiva 🔍

### 5.1 Script de validación completa
- [ ] Crear validador exhaustivo (estimate: 0.5h)
  - Comparar schemas
  - Comparar counts
  - Verificar constraints
  - Files: `scripts/validate-staging.ts`
  - Agent: **@agent-backend-developer**
  - Test: pnpm dlx tsx scripts/validate-staging.ts

### 5.2 Comparación tabla por tabla
- [ ] Ejecutar comparación detallada (estimate: 0.5h)
  - Count de registros
  - Sample data comparison
  - Files: `scripts/compare-databases.ts`
  - Agent: **@agent-backend-developer**
  - Test: No discrepancias encontradas

### 5.3 Test funcional de login
- [ ] Verificar login en staging (estimate: 0.25h)
  - simmerdown.staging.muva.chat/login
  - Test con usuario real
  - Agent: **@agent-infrastructure-monitor**
  - Test: curl -I https://simmerdown.staging.muva.chat/login

### 5.4 Health check completo
- [ ] Ejecutar todos los health checks (estimate: 0.5h)
  - API endpoints
  - Database queries
  - RLS policies
  - Files: `scripts/health-check-staging.ts`
  - Agent: **@agent-infrastructure-monitor**
  - Test: pnpm dlx tsx scripts/health-check-staging.ts

### 5.5 Documentar validación
- [ ] Crear reporte de validación (estimate: 0.25h)
  - Resultados de cada test
  - Discrepancias si las hay
  - Files: `docs/database-sync/fase-5/VALIDATION_REPORT.md`
  - Agent: **@agent-infrastructure-monitor**
  - Test: Documento completo

---

## FASE 6: Automatización y Documentación 🚀

### 6.1 Script maestro de sincronización
- [ ] Crear one-command sync script (estimate: 0.5h)
  - Orquesta todas las fases
  - Manejo de errores
  - Rollback automático
  - Files: `scripts/sync-database-master.ts`
  - Agent: **@agent-backend-developer**
  - Test: pnpm dlx tsx scripts/sync-database-master.ts --dry-run

### 6.2 Documentación de uso
- [ ] Crear README completo (estimate: 0.25h)
  - Cómo usar los scripts
  - Requisitos previos
  - Files: `docs/database-sync/README.md`
  - Agent: **@agent-backend-developer**
  - Test: Documentación clara

### 6.3 Guía de troubleshooting
- [ ] Documentar problemas comunes (estimate: 0.25h)
  - Errores frecuentes y soluciones
  - Cómo hacer rollback
  - Files: `docs/database-sync/TROUBLESHOOTING.md`
  - Agent: **@agent-backend-developer**
  - Test: Casos cubiertos

---

## 📊 PROGRESO

**Total Tasks:** 29
**Completed:** 0/29 (0%)

**Por Fase:**
- FASE 1: 0/5 tareas (Análisis)
- FASE 2: 0/5 tareas (Backup)
- FASE 3: 0/3 tareas (Preparación)
- FASE 4: 0/4 tareas (Sincronización)
- FASE 5: 0/5 tareas (Validación)
- FASE 6: 0/3 tareas (Automatización)

---

## 🔴 TABLAS CRÍTICAS QUE DEBEN EXISTIR

**VERIFICAR SIEMPRE:**
1. ✅ `tenant_registry` (NO "tenants")
2. ✅ `accommodation_units_manual` (8 rows)
3. ✅ `chat_conversations` (2 rows)
4. ✅ `ics_feed_configurations` (9 rows)
5. ✅ `property_relationships` (1 row)
6. ✅ `sire_content` (8 rows)
7. ✅ `hotels.accommodation_units` (26 rows - schema hotels!)
8. ✅ `hotels.policies` (9 rows - schema hotels!)

---

## ⚠️ VALIDACIONES OBLIGATORIAS

Antes de marcar FASE 5 completa:
- [ ] Login funciona en simmerdown.staging.muva.chat
- [ ] Todas las 32 tablas tienen datos
- [ ] Foreign keys sin errores
- [ ] RLS policies activas
- [ ] No hay tablas huérfanas
- [ ] Schemas public y hotels sincronizados

---

**Última actualización:** November 6, 2025