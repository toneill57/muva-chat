# Database Sync Staging - Plan de Implementación

**Proyecto:** Sincronización Completa Dev → Staging Database
**Fecha Inicio:** November 6, 2025
**Estado:** 📋 Planificación

---

## 🎯 OVERVIEW

### Objetivo Principal
Crear una copia EXACTA y FUNCIONAL de la base de datos de desarrollo en el ambiente staging de Supabase, garantizando que todas las tablas, datos, relaciones, políticas RLS, triggers, y funciones estén sincronizadas correctamente.

### ¿Por qué?
- **Bloqueo crítico:** staging no funciona (simmerdown.staging.muva.chat/login falla)
- **Inconsistencias detectadas:** 8 tablas faltantes, 4 tablas inexistentes en scripts
- **Pérdida de productividad:** 2 semanas sin poder avanzar
- **Riesgo de producción:** No se puede validar cambios antes de producción

### Alcance
- Análisis completo de base de datos dev (schemas: public, hotels, auth, storage)
- Backup completo de dev con verificación de integridad
- Sincronización automática y repetible hacia staging
- Validación exhaustiva post-sincronización
- Scripts reutilizables para futuros syncs

---

## 📊 ESTADO ACTUAL

### Sistema Existente
- ✅ Dev funciona perfectamente (simmerdown.localhost:3000)
- ✅ Production funciona (simmerdown.muva.chat)
- ✅ Script de sync parcial existe pero incompleto
- ✅ MCP Supabase tools disponibles
- ✅ Acceso SSH a VPS configurado

### Limitaciones Actuales (ACTUALIZADO Nov 6, 2025)
- ❌ Script anterior solo sincronizaba 31 de 50 tablas
- ❌ **19 tablas NO se estaban sincronizando:**
  - Schema hotels: 7 tablas faltantes (accommodation_types, client_info, content, etc.)
  - Schema public: 12 tablas faltantes (chat_conversations, compliance_submissions, etc.)
- ❌ **Tabla crítica con datos no sincronizada:**
  - chat_conversations: 2 registros NO se estaban copiando
- ❌ **11 tablas con datos parciales (ya resuelto pero debe verificarse):**
  - prospective_sessions: ahora 413 registros
  - chat_messages: ahora 349 registros
  - guest_conversations: ahora 114 registros
  - reservation_accommodations: ahora 93 registros
  - sync_history: ahora 85 registros
  - staff_messages: ahora 60 registros
  - staff_conversations: ahora 45 registros
  - job_logs: ahora 39 registros
  - hotel_operations: ahora 10 registros
  - conversation_memory: ahora 10 registros
  - user_tenant_permissions: ahora 1 registro
- ❌ No hay rollback automático si falla

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia
Sistema de sincronización 100% confiable que garantice que staging sea una réplica exacta de dev, permitiendo pruebas confiables antes de pasar a producción.

### Características Clave
- **Análisis completo:** Detecta TODAS las tablas, vistas, funciones, triggers
- **Backup verificado:** Confirma integridad antes de proceder
- **Sincronización atómica:** Todo o nada, sin estados parciales
- **Validación exhaustiva:** Compara schemas, counts, relaciones
- **Documentación automática:** Genera reporte de cada sync
- **Rollback automático:** Si algo falla, restaura estado anterior
- **Reutilizable:** Un comando para futuros syncs

---

## 📱 TECHNICAL STACK

### Frontend/Backend/Infrastructure
- **Database:** Supabase (PostgreSQL)
- **MCP Tools:** mcp__supabase__* para operaciones
- **Scripts:** TypeScript con tsx
- **Backup:** pg_dump con verificación SHA256
- **Sync:** Combinación de DDL migrations + DML bulk inserts
- **Monitoring:** Scripts de health check y validación

---

## 🔧 DESARROLLO - FASES

### FASE 1: Análisis Exhaustivo de Dev (2h)
**Objetivo:** Documentar COMPLETAMENTE el estado actual de dev

**Entregables:**
- Lista completa de tablas por schema (public, hotels, auth, storage)
- Conteo de registros por tabla
- Mapa de relaciones (foreign keys)
- Lista de funciones, triggers, vistas
- Lista de políticas RLS
- Extensiones PostgreSQL activas

**Archivos a crear/modificar:**
- `scripts/analyze-dev-database.ts`
- `docs/database-sync/fase-1/DATABASE_ANALYSIS.md`
- `docs/database-sync/fase-1/TABLES_INVENTORY.json`

**Testing:**
- Verificar que el análisis detecta TODAS las 32 tablas conocidas
- Confirmar schemas adicionales (hotels, auth, storage)
- Validar foreign keys y constraints

---

### FASE 2: Backup Completo con Verificación (2h)
**Objetivo:** Crear backup completo y verificado de dev

**Entregables:**
- Script de backup automatizado
- Archivo SQL con schema completo
- Archivo SQL con datos completos
- Checksums SHA256 para verificación
- Log de backup con timestamps

**Archivos a crear/modificar:**
- `scripts/backup-dev-complete.ts`
- `backups/dev-backup-{timestamp}.sql`
- `backups/dev-backup-{timestamp}.sha256`
- `docs/database-sync/fase-2/BACKUP_REPORT.md`

**Testing:**
- Verificar tamaño de archivo (debe ser > 0)
- Validar checksum SHA256
- Confirmar presencia de todas las tablas
- Test de restauración en ambiente de prueba

---

### FASE 3: Preparación de Staging (1h)
**Objetivo:** Limpiar y preparar staging para recibir datos nuevos

**Entregables:**
- Snapshot del estado actual de staging (para rollback)
- Limpieza de datos existentes
- Desactivación temporal de triggers/constraints
- Preparación de schemas

**Archivos a crear/modificar:**
- `scripts/prepare-staging.ts`
- `backups/staging-snapshot-{timestamp}.sql`
- `docs/database-sync/fase-3/STAGING_PREPARATION.md`

**Testing:**
- Verificar snapshot creado correctamente
- Confirmar staging está limpio
- Validar que constraints están desactivados

---

### FASE 4: Sincronización Completa (3h)
**Objetivo:** Ejecutar la sincronización completa dev → staging

**Entregables:**
- Script de sincronización robusto con retry logic
- Migración de schema (DDL)
- Migración de datos (DML) en orden correcto
- Reactivación de constraints y triggers
- Log detallado de operaciones

**Archivos a crear/modificar:**
- `scripts/sync-dev-to-staging.ts`
- `scripts/sync-schema.ts`
- `scripts/sync-data.ts`
- `logs/sync-{timestamp}.log`
- `docs/database-sync/fase-4/SYNC_EXECUTION.md`

**Testing:**
- Verificar cada tabla sincronizada
- Validar conteos de registros
- Confirmar foreign keys funcionando
- Test de queries complejas

---

### FASE 5: Validación Exhaustiva (2h)
**Objetivo:** Verificar que staging es réplica exacta de dev

**Entregables:**
- Script de validación completa
- Comparación tabla por tabla
- Verificación de relaciones
- Test de funcionalidades críticas
- Reporte de validación

**Archivos a crear/modificar:**
- `scripts/validate-staging.ts`
- `scripts/compare-databases.ts`
- `docs/database-sync/fase-5/VALIDATION_REPORT.md`
- `docs/database-sync/fase-5/DISCREPANCIES.md` (si hay)

**Testing:**
- Comparar counts de todas las tablas
- Verificar login funciona en staging
- Validar queries de negocio críticas
- Test de permisos RLS

---

### FASE 6: Automatización y Documentación (1h)
**Objetivo:** Dejar sistema listo para futuros syncs

**Entregables:**
- Script maestro one-command sync
- Documentación de uso
- Troubleshooting guide
- Checklist de validación

**Archivos a crear/modificar:**
- `scripts/sync-database-master.ts`
- `docs/database-sync/README.md`
- `docs/database-sync/TROUBLESHOOTING.md`
- `docs/database-sync/VALIDATION_CHECKLIST.md`

**Testing:**
- Ejecutar sync completo con script maestro
- Verificar documentación es clara
- Test de rollback si falla

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] simmerdown.staging.muva.chat/login funciona correctamente
- [ ] Todas las 32 tablas están presentes y con datos
- [ ] Schemas public y hotels completamente sincronizados
- [ ] Foreign keys y constraints funcionando
- [ ] Políticas RLS activas y funcionando
- [ ] Triggers y funciones operativos

### Performance
- [ ] Sync completo en < 10 minutos
- [ ] Queries en staging con performance similar a dev
- [ ] No timeouts durante sync

### Confiabilidad
- [ ] Rollback automático si hay errores
- [ ] Logs detallados de cada operación
- [ ] Verificación de integridad post-sync
- [ ] Script reutilizable sin modificaciones

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-database-agent** (Principal)
**Responsabilidad:** Análisis, backup, y operaciones DDL

**Tareas:**
- FASE 1: Análisis completo de dev database
- FASE 2: Crear backups con pg_dump
- FASE 3: Preparar staging environment
- FASE 4: Ejecutar migraciones DDL

**Archivos:**
- `scripts/analyze-dev-database.ts`
- `scripts/backup-dev-complete.ts`
- `scripts/prepare-staging.ts`

### 2. **@agent-backend-developer** (Soporte)
**Responsabilidad:** Scripts de sincronización y validación

**Tareas:**
- FASE 4: Desarrollar lógica de sync
- FASE 5: Crear validadores
- FASE 6: Automatización final

**Archivos:**
- `scripts/sync-dev-to-staging.ts`
- `scripts/validate-staging.ts`
- `scripts/sync-database-master.ts`

### 3. **@agent-infrastructure-monitor** (Validación)
**Responsabilidad:** Monitoreo y health checks

**Tareas:**
- FASE 5: Validar health de staging
- FASE 6: Setup monitoring continuo

**Archivos:**
- `scripts/health-check-staging.ts`
- `docs/database-sync/fase-5/VALIDATION_REPORT.md`

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/muva-chat/
├── scripts/
│   ├── analyze-dev-database.ts
│   ├── backup-dev-complete.ts
│   ├── prepare-staging.ts
│   ├── sync-dev-to-staging.ts
│   ├── sync-schema.ts
│   ├── sync-data.ts
│   ├── validate-staging.ts
│   ├── compare-databases.ts
│   ├── health-check-staging.ts
│   └── sync-database-master.ts
├── backups/
│   ├── dev-backup-{timestamp}.sql
│   ├── dev-backup-{timestamp}.sha256
│   └── staging-snapshot-{timestamp}.sql
├── logs/
│   └── sync-{timestamp}.log
└── docs/
    └── database-sync/
        ├── README.md
        ├── TROUBLESHOOTING.md
        ├── VALIDATION_CHECKLIST.md
        ├── fase-1/
        │   ├── DATABASE_ANALYSIS.md
        │   └── TABLES_INVENTORY.json
        ├── fase-2/
        │   └── BACKUP_REPORT.md
        ├── fase-3/
        │   └── STAGING_PREPARATION.md
        ├── fase-4/
        │   └── SYNC_EXECUTION.md
        ├── fase-5/
        │   ├── VALIDATION_REPORT.md
        │   └── DISCREPANCIES.md
        └── fase-6/
            └── AUTOMATION_GUIDE.md
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas
- **MCP Tools:** Usar mcp__supabase__execute_sql para DML, scripts tsx para DDL
- **Orden de sync:** Respetar foreign keys (padres antes que hijos)
- **Transacciones:** Usar BEGIN/COMMIT para atomicidad
- **Schemas:** No olvidar schema hotels (2 tablas críticas)
- **Auth:** Preservar usuarios y permisos del schema auth
- **Storage:** Sincronizar políticas de storage buckets
- **Rollback:** Siempre tener snapshot antes de modificar

### Tablas Críticas que NO DEBEN FALTAR
1. `tenant_registry` (NO "tenants")
2. `accommodation_units_manual`
3. `chat_conversations`
4. `ics_feed_configurations`
5. `property_relationships`
6. `sire_content`
7. `hotels.accommodation_units`
8. `hotels.policies`

### Validaciones Obligatorias
- Count de registros por tabla
- Foreign keys integrity
- RLS policies activas
- Login funcional en subdominios
- Queries de negocio críticas

---

**Última actualización:** November 6, 2025
**Próximo paso:** Actualizar TODO.md con tareas específicas