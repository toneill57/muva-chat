# Scripts Archivados - Noviembre 2025

Scripts temporales utilizados durante el desarrollo de funcionalidades del Super Admin (Fases 10-11) y migraciones de SIRE compliance.

Archivados el: 2025-11-28

## Estructura

### `/testing` (19 scripts)
Scripts one-off para testing de APIs y funcionalidades:
- `test-analytics-*.sh` - Testing de endpoints analytics
- `test-audit-*.mjs` - Testing de audit log
- `test-super-admin-*.js` - Testing de autenticación super admin
- `test-login-*.js` - Testing de login functions
- `test-metrics-*.sh` - Testing de métricas
- `test-compliance-api.ts` - Testing de SIRE compliance
- Otros scripts de testing específicos

**Estado**: Funcionalidad testeada e integrada. Scripts ya no necesarios.

### `/migrations` (10 scripts)
Scripts one-off para aplicación de migraciones:
- `apply-audit-migration*` - Aplicación de migrations de audit log
- `apply-sire-migration*` - Aplicación de migrations SIRE
- `apply-sire-submissions-*` - Creación de tabla sire_submissions
- `verify-*` - Verificación post-migración
- `create-sire-submissions-table.ts` - Script de creación DDL

**Estado**: Migraciones aplicadas exitosamente en DB dev. Scripts conservados para referencia histórica.

### `/verification` (6 scripts)
Scripts para verificación de estado de DB y datos:
- `check-conversations-debug.ts` - Debug de conversaciones
- `check-public-convs.ts` - Verificación de conversaciones públicas
- `check-simmerdown-tenant.ts` - Verificación de tenant específico
- `check-tenant-stats-view.ts` - Verificación de vistas de stats
- `check-tucasaenelmar.ts` - Verificación de tenant específico
- `check-migrations-nov2025.ts` - Estado de migraciones

**Estado**: Herramientas de debugging. Pueden ser útiles para troubleshooting futuro.

### `/utilities` (2 scripts)
Scripts de utilidades temporales:
- `get-analytics-examples.sh` - Ejemplos de queries analytics
- `reset-settings.sh` - Reset de configuraciones

**Estado**: Herramientas de desarrollo temporal.

## Notas

- Estos scripts fueron creados durante el desarrollo incremental de features
- No están diseñados para re-ejecución sin revisión
- Se conservan para referencia histórica y debugging
- Las migraciones oficiales están en `/migrations/*.sql`

## Scripts de Producción Activos

Los siguientes scripts SON necesarios y permanecen en `/scripts`:
- `scripts/database/populate-embeddings.js` - Script canónico de embeddings
- `scripts/database/execute-ddl-via-api.ts` - Ejecución de DDL migrations
- `scripts/init-super-admin.js` - Inicialización de super admin
- `scripts/get-super-admin-token.js` - Generación de tokens
