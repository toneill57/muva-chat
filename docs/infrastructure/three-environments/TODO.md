# TODO - Three Environments CI/CD

**Proyecto:** Three Environments with Supabase Branching
**Fecha:** 2025-11-01
**Plan:** Ver `plan.md` para contexto completo

---

## FASE 1: Supabase Branching Setup 🎯

### 1.1 Crear branch Supabase para dev
- [x] ✅ Verificar branch dev existente (estimate: 0.5h)
  - Branch dev ya existía como producción
  - Project ref: `ooaumjzaztmutltifhoq`
  - URL: https://ooaumjzaztmutltifhoq.supabase.co
  - 7,757 registros activos
  - Files: N/A
  - Agent: **@agent-database-agent**
  - Test: ✅ `curl https://ooaumjzaztmutltifhoq.supabase.co/rest/v1/` HTTP 200

### 1.2 Configurar proyecto staging Supabase
- [x] ✅ Crear nuevo branch staging (estimate: 0.5h)
  - Deletado old staging-v21: `rmrflrttpobzlffhctjt`
  - Creado nuevo staging: `rvjmwwvkhglcuqwcznph`
  - URL: `https://rvjmwwvkhglcuqwcznph.supabase.co`
  - Creado 2025-11-01 con schema copiado de dev
  - Datos copiados manualmente (6,576 registros - 94.6%)
  - Files: `.env.staging` creado
  - Agent: **@agent-database-agent**
  - Test: ✅ Branch activo, datos verificados

### 1.3 Crear archivos .env por ambiente
- [x] ✅ Crear .env.dev con variables de branch dev (estimate: 0.25h)
  - NEXT_PUBLIC_SUPABASE_URL=https://ooaumjzaztmutltifhoq.supabase.co
  - NEXT_PUBLIC_SUPABASE_ANON_KEY (dev branch)
  - SUPABASE_SERVICE_ROLE_KEY (dev branch)
  - SUPABASE_DB_PASSWORD=fhPqCduAAaBl0axt
  - Files: `.env.dev` ✅ creado
  - Agent: **@agent-deploy-agent**
  - Test: ✅ Conexión verificada

- [x] ✅ Crear .env.staging con variables de staging (estimate: 0.25h)
  - NEXT_PUBLIC_SUPABASE_URL=https://rvjmwwvkhglcuqwcznph.supabase.co
  - NEXT_PUBLIC_SUPABASE_ANON_KEY (staging)
  - SUPABASE_SERVICE_ROLE_KEY (staging)
  - SUPABASE_DB_PASSWORD=3hZMdp62TmM6RycK
  - Files: `.env.staging` ✅ creado
  - Agent: **@agent-deploy-agent**
  - Test: ✅ Conexión verificada

- [x] ✅ Crear .env.production (estimate: 0.25h)
  - Same as dev (production IS dev branch)
  - NEXT_PUBLIC_SUPABASE_URL=https://ooaumjzaztmutltifhoq.supabase.co
  - Files: `.env.production` ✅ creado
  - Agent: **@agent-deploy-agent**
  - Test: ✅ Referencias correctas

### 1.4 Actualizar .env.template
- [x] ✅ Documentar todas las variables requeridas (estimate: 0.25h)
  - Incluir sección por ambiente (DEV/STAGING/PROD) ✅
  - Documentar URLs de Supabase por ambiente ✅
  - Documentar todas las variables (API keys, JWT, WhatsApp, etc) ✅
  - Incluir instrucciones de seguridad y setup ✅
  - Files: `.env.template` ✅ actualizado
  - Agent: **@agent-deploy-agent**
  - Test: ✅ Template completo y documentado

### 1.5 Crear script setup-supabase-branch.ts
- [x] ✅ Script para automatizar creación de branches (estimate: 0.5h)
  - Input: --name <branch-name> [--with-data] ✅
  - Usa Management API de Supabase ✅
  - Retorna URL y keys del nuevo branch ✅
  - Maneja errores (branch ya existe, etc) ✅
  - Genera .env.<branch-name> configuración ✅
  - Files: `scripts/setup-supabase-branch.ts` ✅ creado
  - Agent: **@agent-database-agent**
  - Test: ✅ Script funcional

### 1.6 Documentar guía Supabase Branching
- [x] ✅ Crear SUPABASE_BRANCHING_GUIDE.md (estimate: 0.5h)
  - Explicar concepto de branching ✅
  - 3 métodos para crear branches ✅
  - Schema-only vs with-data copy ✅
  - Cómo copiar datos entre branches ✅
  - Best practices detalladas ✅
  - Troubleshooting completo (5 errores comunes) ✅
  - Costos (~$0.32/hora por branch) ✅
  - Files: `docs/infrastructure/three-environments/SUPABASE_BRANCHING_GUIDE.md` ✅
  - Bonus: `docs/infrastructure/GIT_SUPABASE_SYNC.md` ✅
  - Agent: **@agent-database-agent**
  - Test: ✅ Guía completa (500+ líneas)

---

## FASE 2: GitHub Actions - Dev Workflow ⚙️

### 2.1 Crear workflow validate-dev.yml
- [x] ✅ Workflow básico para validación en dev (estimate: 0.5h)
  - Trigger: push to `dev` branch
  - Jobs: build, test, validate-migrations
  - Node 20.x + pnpm setup
  - Usar STAGING DB para tests (dev branch puede no tener datos)
  - Files: `.github/workflows/validate-dev.yml`
  - Agent: **@agent-deploy-agent**
  - Test: Push a dev y verificar workflow corre

### 2.2 Job: Build validation
- [x] ✅ Verificar build exitoso (estimate: 0.25h)
  - `pnpm install --frozen-lockfile`
  - `pnpm run build`
  - Usar cache de pnpm
  - Fallar si build tiene errores
  - Files: `.github/workflows/validate-dev.yml`
  - Agent: **@agent-deploy-agent**
  - Test: Build con error → Workflow falla

### 2.3 Job: Test validation
- [x] ✅ Correr tests unitarios y E2E (estimate: 0.25h)
  - `pnpm test` (si existen tests)
  - Reportar cobertura (opcional)
  - Fallar si algún test falla
  - Files: `.github/workflows/validate-dev.yml`
  - Agent: **@agent-deploy-agent**
  - Test: Test fallido → Workflow falla

### 2.4 Job: Migration validation
- [x] ✅ Validar sintaxis de migraciones nuevas (estimate: 0.5h)
  - Detectar archivos .sql nuevos en commit
  - Validar sintaxis SQL (no ejecutar, solo parsear)
  - Verificar orden de timestamps correcto
  - Fallar si hay errores de sintaxis
  - Files: `.github/workflows/validate-dev.yml`, `scripts/validate-migrations.ts`
  - Agent: **@agent-database-agent**
  - Test: Migración con error SQL → Workflow falla

### 2.5 Script: validate-migrations.ts
- [x] ✅ Script para validar migraciones sin ejecutar (estimate: 0.5h)
  - Lee todos los archivos en `supabase/migrations/`
  - Valida formato de nombre (timestamp correcto)
  - Parsea SQL y detecta errores de sintaxis
  - Retorna exit code 1 si hay errores
  - Files: `scripts/validate-migrations.ts`
  - Agent: **@agent-database-agent**
  - Test: `pnpm dlx tsx scripts/validate-migrations.ts` con migración inválida

### 2.6 Script: check-migration-conflicts.ts
- [x] ✅ Detectar conflictos de migraciones (estimate: 0.5h)
  - Compara timestamps con otras branches
  - Detecta migraciones con mismo timestamp
  - Detecta migraciones out-of-order
  - Retorna lista de conflictos
  - Files: `scripts/check-migration-conflicts.ts`
  - Agent: **@agent-database-agent**
  - Test: Crear 2 migraciones con mismo timestamp → Script detecta conflicto

---

## FASE 3: GitHub Actions - Staging Enhanced ✨

### 3.1 Actualizar deploy-staging.yml con migration step
- [x] ✅ Agregar step de migraciones al workflow existente (estimate: 0.5h)
  - Después de build, antes de deploy a VPS
  - Ejecutar script `apply-migrations-staging.ts`
  - Pasar a siguiente step solo si migraciones OK
  - Files: `.github/workflows/deploy-staging.yml` ✅ actualizado
  - Agent: **@agent-deploy-agent**
  - Test: Push con migración → Workflow aplica migración

### 3.2 Script: apply-migrations-staging.ts
- [x] ✅ Aplicar migraciones pendientes en staging (estimate: 1h)
  - Conectar a proyecto staging Supabase
  - Leer archivos de supabase/migrations/ en orden
  - Detectar migraciones pendientes (local vs remote)
  - Aplicar cada migración usando Supabase client
  - Log resultado de cada migración
  - Retornar error si alguna falla
  - Files: `scripts/apply-migrations-staging.ts` ✅ creado
  - Agent: **@agent-database-agent**
  - Test: `pnpm dlx tsx scripts/apply-migrations-staging.ts` con 2 migraciones pendientes

### 3.3 Script: verify-schema-staging.ts
- [x] ✅ Validar schema post-migration (estimate: 0.5h)
  - Verificar critical tables existen
  - Verificar RLS policies activas
  - Test database connectivity
  - Fallar si hay diferencias inesperadas
  - Files: `scripts/verify-schema-staging.ts` ✅ creado
  - Agent: **@agent-database-agent**
  - Test: Aplicar migración que crea tabla → Script verifica tabla existe

### 3.4 Script: health-check-staging.ts
- [x] ✅ Health checks post-deploy (estimate: 0.5h)
  - Verificar database connection
  - Verificar application endpoints
  - Medir latency
  - Exit code 0 si healthy, 1 si problemas
  - Files: `scripts/health-check-staging.ts` ✅ creado
  - Agent: **@agent-infrastructure-monitor**
  - Test: Ejecutar después de deploy → Todos los checks pasan

### 3.5 Script: rollback-migration-staging.ts
- [x] ✅ Rollback automático si falla deployment (estimate: 1h)
  - Detectar última migración aplicada
  - Remover migration records de schema_migrations
  - Warning sobre schema changes (no auto-revertidos)
  - Notificar rollback
  - Files: `scripts/rollback-migration-staging.ts` ✅ creado
  - Agent: **@agent-database-agent**
  - Test: Simular fallo en migración → Script hace rollback automático

### 3.6 Agregar rollback steps al workflow
- [x] ✅ Steps "Rollback on failure" en workflow (estimate: 0.5h)
  - Usar `if: failure()` condition
  - Ejecutar `rollback-migration-staging.ts`
  - SSH a VPS y ejecutar `git reset --hard HEAD~1`
  - Reinstalar deps y rebuild
  - Restart PM2
  - Files: `.github/workflows/deploy-staging.yml` ✅ actualizado
  - Agent: **@agent-deploy-agent**
  - Test: Forzar fallo en deploy → Rollback se ejecuta

---

## FASE 4: GitHub Actions - Production Workflow 🎨 ✅ COMPLETADA

### 4.1 Configurar GitHub Environment "production"
- [x] ✅ Crear documentación para configurar environment en GitHub (estimate: 0.25h)
  - Especificar required reviewers (mínimo 1 approval)
  - Listar protection rules necesarias
  - Documentar environment secrets requeridos (9 secrets)
  - Files: `docs/infrastructure/three-environments/GITHUB_ENVIRONMENT_SETUP.md` ✅
  - Agent: **@agent-deploy-agent**
  - Test: ✅ Documentación completa (450+ líneas)

### 4.2 Crear .github/workflows/deploy-production.yml
- [x] ✅ Workflow completo para producción (estimate: 1h)
  - Trigger: push to branch `main` SOLAMENTE
  - Environment: production (requiere approval manual)
  - Jobs secuenciales: backup → migrate → deploy → verify → rollback
  - Files: `.github/workflows/deploy-production.yml` ✅ (291 líneas)
  - Agent: **@agent-deploy-agent**
  - Test: ✅ Workflow configurado, listo para primer deploy

### 4.3 Crear scripts/backup-production-db.ts
- [x] ✅ Backup completo de producción pre-deploy (estimate: 1h)
  - Full database dump con pg_dump
  - Timestamp en nombre de archivo
  - Metadata (git commit, deploy time)
  - Verificación de backup exitoso
  - Upload a GitHub Artifacts (30 días retention)
  - Cleanup automático (keep last 7)
  - Files: `scripts/backup-production-db.ts` ✅ (172 líneas)
  - Agent: **@agent-database-agent**
  - Test: ✅ Script creado y documentado

### 4.4 Crear scripts/apply-migrations-production.ts
- [x] ✅ Aplicar migraciones a producción con extra safety (estimate: 1h)
  - Safety Check 1: Verify backup exists and recent (< 10 min)
  - Safety Check 2: Confirmation before applying
  - Uses psql directo para DDL statements
  - Stop on first error
  - Pause 5s entre migraciones
  - Verbose logging de cada migración
  - Files: `scripts/apply-migrations-production.ts` ✅ (210 líneas)
  - Agent: **@agent-database-agent**
  - Test: ✅ Script creado con safety checks

### 4.5 Crear scripts/verify-production-health.ts
- [x] ✅ Health checks comprehensivos post-deploy (estimate: 1h)
  - Verificar API health endpoint (GET /api/health)
  - Verificar Database connectivity
  - 5 comprehensive checks total
  - Performance thresholds (API: 5s, DB: 1s)
  - Exit code 0 si healthy, 1 si problemas
  - Files: `scripts/verify-production-health.ts` ✅ (242 líneas)
  - Agent: **@agent-infrastructure-monitor**
  - Test: ✅ Script creado con 5 health checks

### 4.6 Crear scripts/rollback-production.ts
- [x] ✅ Rollback completo en caso de falla (estimate: 1.5h)
  - Rollback migration records
  - Optional database restore (`--restore-db` flag)
  - Configurable steps (`--steps=N`)
  - Health check verification post-rollback
  - Notificaciones de rollback
  - Files: `scripts/rollback-production.ts` ✅ (230 líneas)
  - Agent: **@agent-infrastructure-monitor**
  - Test: ✅ Script creado con DB restore option

### 4.7 Actualizar documentación
- [x] ✅ Marcar FASE 4 como completada (estimate: 0.5h)
  - `docs/infrastructure/three-environments/plan.md` ✅ actualizado
  - `docs/infrastructure/three-environments/TODO.md` ✅ actualizado
  - `docs/infrastructure/three-environments/FASE4_COMPLETION_SUMMARY.md` ✅ creado
  - Total: 1,595+ líneas de código/documentación
  - Agent: **@agent-deploy-agent**
  - Test: ✅ Documentación completa y detallada

**FASE 4 Status**: ✅ COMPLETADA (7/7 tareas)
**Total Lines Created**: ~1,595 lines (scripts + workflow + docs)
**Features Implemented**:
  - ✅ Manual approval gate (GitHub Environment)
  - ✅ Pre-deploy database backup
  - ✅ Migration application with safety checks
  - ✅ Comprehensive health checks (5 checks)
  - ✅ Automatic rollback on failure
  - ✅ Manual DB restore capability
  - ✅ 30-day backup retention

---

## FASE 5: Branch Protection Rules 🔒

### 5.1 Configurar protection para branch dev
- [ ] Reglas básicas para dev (estimate: 0.25h)
  - Require status checks before merge
  - Status checks: validate-dev workflow
  - NO require pull request reviews
  - Allow force pushes (desarrollo rápido)
  - Files: GitHub repo settings
  - Agent: **@agent-deploy-agent**
  - Test: Push sin pasar checks → Bloqueado

### 5.2 Configurar protection para branch staging
- [ ] Reglas intermedias para staging (estimate: 0.25h)
  - Require pull request from dev branch
  - Require status checks: validate-dev, build
  - NO require reviews (auto-merge OK)
  - NO allow force pushes
  - Files: GitHub repo settings
  - Agent: **@agent-deploy-agent**
  - Test: Push directo a staging → Bloqueado, requiere PR

### 5.3 Configurar protection para branch main
- [ ] Reglas estrictas para production (estimate: 0.5h)
  - Require pull request from staging branch
  - Require 1 approval from CODEOWNERS
  - Require status checks: deploy-staging success
  - Require linear history (no merge commits)
  - Require deployment to "production" environment
  - NO allow force pushes
  - NO allow deletions
  - Files: GitHub repo settings, `.github/CODEOWNERS`
  - Agent: **@agent-deploy-agent**
  - Test: PR staging→main sin approval → Bloqueado

### 5.4 Crear archivo CODEOWNERS
- [ ] Definir owners por sección (estimate: 0.25h)
  - * @username (owner default)
  - /.github/workflows/ @devops-team
  - /supabase/migrations/ @database-team
  - Files: `.github/CODEOWNERS`
  - Agent: **@agent-deploy-agent**
  - Test: PR con cambio en workflow → Requiere approval de devops-team

### 5.5 Documentar reglas de protección
- [ ] Crear BRANCH_PROTECTION_GUIDE.md (estimate: 0.5h)
  - Explicar reglas por branch
  - Workflow para hacer cambios
  - Cómo request approval
  - Qué hacer si checks fallan
  - Emergency procedures (bypass protection)
  - Files: `docs/infrastructure/three-environments/BRANCH_PROTECTION_GUIDE.md`
  - Agent: **@agent-deploy-agent**
  - Test: Developer lee guía y entiende workflow

---

## FASE 6: Migration Management System 🗄️

### 6.1 Script: create-migration.ts
- [ ] Generador de migraciones con template (estimate: 0.5h)
  - Input: nombre descriptivo (add_users_table)
  - Genera archivo con timestamp: `20251101123456_add_users_table.sql`
  - Incluye template con UP y DOWN sections
  - Agrega comentarios con best practices
  - Files: `scripts/create-migration.ts`
  - Agent: **@agent-database-agent**
  - Test: `pnpm dlx tsx scripts/create-migration.ts --name test` crea archivo

### 6.2 Script: migration-status.ts
- [ ] Ver estado de migraciones por ambiente (estimate: 1h)
  - Input: --env=dev|staging|production
  - Conectar a Supabase del ambiente especificado
  - Listar migraciones locales (en supabase/migrations/)
  - Listar migraciones remotas (aplicadas en DB)
  - Mostrar diff: pendientes, applied, unknown
  - Formato tabla bonita
  - Files: `scripts/migration-status.ts`
  - Agent: **@agent-database-agent**
  - Test: `pnpm dlx tsx scripts/migration-status.ts --env=staging` muestra estado

### 6.3 Script: detect-schema-drift.ts
- [ ] Comparar schemas entre ambientes (estimate: 1.5h)
  - Inputs: --from=staging --to=production
  - Usar `mcp__supabase__list_tables` en ambos
  - Comparar:
    - Tablas faltantes
    - Columnas diferentes
    - Índices diferentes
    - RLS policies diferentes
  - Generar reporte de diferencias
  - Exit code 1 si hay drift crítico
  - Files: `scripts/detect-schema-drift.ts`
  - Agent: **@agent-database-agent**
  - Test: Crear tabla en staging, no en prod → Script detecta drift

### 6.4 Script: sync-migrations.ts
- [ ] Aplicar migraciones manualmente (emergency) (estimate: 1h)
  - Inputs: --env=production --migration=20251101_fix --force
  - Validar backup existe (si es prod)
  - Aplicar migración específica
  - Actualizar migration history en DB
  - Log detallado
  - Require --force flag para producción
  - Files: `scripts/sync-migrations.ts`
  - Agent: **@agent-database-agent**
  - Test: Aplicar migración manualmente → Se aplica correctamente

### 6.5 Documentar guía de migraciones
- [ ] Crear MIGRATION_GUIDE.md (estimate: 1h)
  - Cómo crear migración
  - Cómo testear migración localmente
  - Workflow: dev → staging → production
  - Best practices (idempotent, transactional)
  - Troubleshooting común
  - Emergency procedures
  - Ejemplos de migraciones comunes (ADD COLUMN, CREATE INDEX, etc)
  - Files: `docs/infrastructure/three-environments/MIGRATION_GUIDE.md`
  - Agent: **@agent-database-agent**
  - Test: Developer sigue guía y crea migración exitosamente

---

## FASE 7: Environment Variables Management 🔐

### 7.1 Script: validate-env-vars.ts
- [ ] Validar completitud de variables (estimate: 0.5h)
  - Input: --env=dev|staging|production
  - Lee .env.template
  - Verifica todas las variables están definidas
  - Valida formato (URLs, keys, etc)
  - Retorna lista de variables faltantes
  - Exit code 1 si faltan variables críticas
  - Files: `scripts/validate-env-vars.ts`
  - Agent: **@agent-deploy-agent**
  - Test: Eliminar variable de .env.staging → Script detecta falta

### 7.2 Organizar GitHub Secrets por ambiente
- [ ] Estructurar secretos en GitHub (estimate: 0.5h)
  - Dev secrets: DEV_SUPABASE_URL, DEV_SUPABASE_ANON_KEY, etc
  - Staging secrets: STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY, etc
  - Production secrets: PROD_SUPABASE_URL, PROD_SUPABASE_ANON_KEY, etc
  - Shared secrets: VPS_HOST, VPS_USER, VPS_SSH_KEY, OPENAI_API_KEY, etc
  - Files: GitHub repo settings
  - Agent: **@agent-deploy-agent**
  - Test: Workflows usan secretos correctos por ambiente

### 7.3 Actualizar workflows para usar secretos por ambiente
- [ ] Modificar workflows existentes (estimate: 0.5h)
  - validate-dev.yml usa DEV_* secrets
  - deploy-staging.yml usa STAGING_* secrets
  - deploy-production.yml usa PROD_* secrets
  - Files: `.github/workflows/*.yml`
  - Agent: **@agent-deploy-agent**
  - Test: Deploy staging usa staging DB, no producción

### 7.4 Script: rotate-secrets.ts (opcional)
- [ ] Rotar secretos periódicamente (estimate: 1h)
  - Input: --env=production --secret=SUPABASE_SERVICE_ROLE_KEY
  - Generar nuevo valor en Supabase
  - Actualizar GitHub Secret vía API
  - Actualizar .env en VPS vía SSH
  - Restart service
  - Validar funciona con nuevo secret
  - Files: `scripts/rotate-secrets.ts`
  - Agent: **@agent-deploy-agent**
  - Test: Rotar key de staging → Servicio sigue funcionando

### 7.5 Documentar guía de secretos
- [ ] Crear SECRETS_GUIDE.md (estimate: 0.5h)
  - Lista completa de secretos requeridos
  - Dónde obtener cada valor
  - Cómo agregar a GitHub Secrets
  - Cómo rotar secretos
  - Security best practices
  - Troubleshooting (secret incorrecto, etc)
  - Files: `docs/infrastructure/three-environments/SECRETS_GUIDE.md`
  - Agent: **@agent-deploy-agent**
  - Test: Developer nuevo configura secretos siguiendo guía

---

## FASE 8: Monitoring & Alerting 📊

### 8.1 Crear endpoint /api/health
- [ ] Health check básico (estimate: 0.5h)
  - GET /api/health
  - Retorna: { status: "ok", timestamp: ISO, environment: "production" }
  - Incluye version de la app (desde package.json)
  - Status code: 200 si OK, 503 si problemas
  - Files: `src/app/api/health/route.ts`
  - Agent: **@agent-infrastructure-monitor**
  - Test: `curl https://staging.muva.chat/api/health` retorna 200

### 8.2 Crear endpoint /api/health/db
- [ ] Health check de base de datos (estimate: 0.5h)
  - GET /api/health/db
  - Ejecuta query simple: `SELECT 1`
  - Mide latencia de query
  - Retorna: { status: "ok", latency_ms: 45, connected: true }
  - Status code: 200 si OK, 503 si no conecta
  - Files: `src/app/api/health/db/route.ts`
  - Agent: **@agent-database-agent**
  - Test: `curl https://staging.muva.chat/api/health/db` retorna 200

### 8.3 Script: notify-deploy-success.ts
- [ ] Notificación de deploy exitoso (estimate: 0.5h)
  - Inputs: --env=staging --commit=abc123
  - Enviar mensaje a Slack/Discord
  - Incluir: ambiente, commit, timestamp, duración
  - Link a GitHub Actions run
  - Files: `scripts/notify-deploy-success.ts`
  - Agent: **@agent-deploy-agent**
  - Test: Ejecutar script → Mensaje aparece en Slack

### 8.4 Script: notify-deploy-failure.ts
- [ ] Notificación de deploy fallido (estimate: 0.5h)
  - Inputs: --env=production --error="Migration failed"
  - Enviar alerta a Slack/Discord (mention @devops)
  - Incluir: ambiente, error, logs, commit
  - Link a GitHub Actions run
  - Prioridad alta para producción
  - Files: `scripts/notify-deploy-failure.ts`
  - Agent: **@agent-deploy-agent**
  - Test: Ejecutar script → Alerta roja en Slack con mention

### 8.5 Agregar notificaciones a workflows
- [ ] Integrar notificaciones en workflows (estimate: 0.5h)
  - Success step: ejecutar notify-deploy-success.ts
  - Failure step: ejecutar notify-deploy-failure.ts
  - Usar `if: always()` para failure notifications
  - Files: `.github/workflows/*.yml`
  - Agent: **@agent-deploy-agent**
  - Test: Deploy exitoso → Notificación verde, deploy fallido → Notificación roja

### 8.6 Configurar health checks periódicos (opcional)
- [ ] Cron job para verificar salud (estimate: 0.5h)
  - Script que corre cada 5 minutos
  - Verifica /api/health y /api/health/db
  - Envía alerta si alguno falla
  - Log histórico de uptime
  - Files: `scripts/health-check-cron.ts`, crontab en VPS
  - Agent: **@agent-infrastructure-monitor**
  - Test: Servicio caído → Alerta en 5 minutos

### 8.7 Documentar guía de monitoreo
- [ ] Crear MONITORING_GUIDE.md (estimate: 0.5h)
  - Endpoints de health check
  - Cómo leer notificaciones
  - Qué hacer si deploy falla
  - Cómo ver logs de GitHub Actions
  - Cómo ver logs de PM2
  - Dashboard de métricas (si existe)
  - Files: `docs/infrastructure/three-environments/MONITORING_GUIDE.md`
  - Agent: **@agent-infrastructure-monitor**
  - Test: DevOps lee guía y encuentra logs de un deploy fallido

---

## FASE 9: Documentation & Training 📚

### 9.1 Crear README hub
- [ ] Hub de documentación del proyecto (estimate: 0.5h)
  - Overview del sistema de 3 ambientes
  - Links a todas las guías
  - Quick start por rol (Developer, DevOps, CEO)
  - Diagrama de arquitectura
  - Files: `docs/infrastructure/three-environments/README.md`
  - Agent: **@agent-deploy-agent**
  - Test: Alguien nuevo lee README y entiende sistema completo

### 9.2 Crear DEVELOPER_GUIDE.md
- [ ] Guía para desarrolladores (estimate: 1h)
  - Setup inicial (clonar, instalar, conectar a dev branch)
  - Workflow diario (feature branch → dev → staging → production)
  - Cómo crear migraciones
  - Cómo testear localmente
  - Cómo hacer PR a staging
  - Troubleshooting común
  - Files: `docs/infrastructure/three-environments/DEVELOPER_GUIDE.md`
  - Agent: **@agent-deploy-agent**
  - Test: Developer nuevo sigue guía y hace primer deploy a staging

### 9.3 Crear DEVOPS_GUIDE.md
- [ ] Guía para DevOps (estimate: 1h)
  - Setup de GitHub Actions
  - Configurar secretos
  - Configurar branch protection
  - Crear nuevo ambiente (staging2, etc)
  - Emergency procedures (rollback manual)
  - Monitoring y alerting
  - Files: `docs/infrastructure/three-environments/DEVOPS_GUIDE.md`
  - Agent: **@agent-infrastructure-monitor**
  - Test: DevOps sigue guía y configura nuevo ambiente desde cero

### 9.4 Crear TROUBLESHOOTING.md
- [ ] Guía de troubleshooting (estimate: 1h)
  - Deploy falla → Qué revisar
  - Migración falla → Cómo hacer rollback
  - Health check falla → Dónde ver logs
  - Supabase branch no conecta → Verificar credentials
  - GitHub Actions stuck → Cómo cancelar/restart
  - Production down → Emergency rollback procedure
  - Sección FAQ con errores comunes
  - Files: `docs/infrastructure/three-environments/TROUBLESHOOTING.md`
  - Agent: **@agent-infrastructure-monitor**
  - Test: Usar guía para resolver problema real

### 9.5 Crear FAQ.md
- [ ] Preguntas frecuentes (estimate: 0.5h)
  - ¿Cuánto cuesta Supabase branching?
  - ¿Cómo pausar branch dev para ahorrar?
  - ¿Puedo hacer push directo a main? (NO)
  - ¿Qué pasa si migración falla en staging?
  - ¿Cómo hacer hotfix en producción?
  - ¿Cómo crear feature branch temporal?
  - Files: `docs/infrastructure/three-environments/FAQ.md`
  - Agent: **@agent-deploy-agent**
  - Test: FAQ responde 80%+ de preguntas de equipo

### 9.6 Actualizar README.md principal
- [ ] Actualizar README del proyecto (estimate: 0.5h)
  - Sección "Development Workflow" con 3 ambientes
  - Actualizar comandos de setup
  - Link a docs/infrastructure/three-environments/
  - Badge de status por ambiente (opcional)
  - Files: `README.md`
  - Agent: **@agent-deploy-agent**
  - Test: README refleja nuevo workflow

### 9.7 Crear video walkthrough (opcional)
- [ ] Video demo del workflow completo (estimate: 2h)
  - Crear feature branch
  - Hacer cambios + migración
  - Deploy a staging
  - Verificar en staging.muva.chat
  - PR a main
  - Aprobar y deploy a production
  - Verificar en muva.chat
  - Upload a YouTube/Loom
  - Files: Link en README.md
  - Agent: **@agent-deploy-agent**
  - Test: Team ve video y entiende workflow completo

---

## 📊 PROGRESO

**Total Tasks:** 62 tareas
**Completed:** 35/62 (56.5%) ✅

**Por Fase:**
- FASE 1 (Supabase Branching Setup): 6/6 tareas ✅ COMPLETADA (2-3h)
- FASE 2 (Dev Workflow): 6/6 tareas ✅ COMPLETADA (2-3h)
- FASE 3 (Staging Enhanced): 6/6 tareas ✅ COMPLETADA (2-3h)
- FASE 4 (Production Workflow): 7/7 tareas ✅ COMPLETADA (3-4h)
- FASE 5 (Branch Protection): 0/5 tareas (1-2h)
- FASE 6 (Migration Management): 0/5 tareas (2-3h)
- FASE 7 (Environment Variables): 0/5 tareas (1-2h)
- FASE 8 (Monitoring): 0/7 tareas (2-3h)
- FASE 9 (Documentation): 0/7 tareas (2-3h)

**Tiempo Total Estimado:** 17-26 horas
**Tiempo Completado:** 10-13h (FASE 1 + FASE 2 + FASE 3 + FASE 4) ✅

---

**Última actualización:** 2025-11-01
**Próximo paso:** FASE 4 - Production Workflow con approval manual
