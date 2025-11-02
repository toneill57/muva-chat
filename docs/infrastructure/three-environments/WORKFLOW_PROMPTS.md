# WORKFLOW PROMPTS - Three Environments CI/CD

**Proyecto:** Three Environments with Supabase Branching
**Última Actualización:** November 1, 2025
**Estado Actual:** FASE 1 Completada (6/62 tareas, 9.7%)

---

## 📚 ARCHIVOS DE REFERENCIA

**Documentación Principal:**
- `plan.md` - Plan completo del proyecto (21KB, 9 fases)
- `TODO.md` - 62 tareas detalladas con progreso tracking (27KB)
- `README.md` - Índice y overview del proyecto
- `CREDENTIALS_GUIDE.md` - Guía de 4 tipos de credenciales Supabase
- `SUPABASE_BRANCHING_GUIDE.md` - Guía completa de branching workflow

**Archivos de Infraestructura:**
- `.env.dev` - Credenciales ambiente dev (ooaumjzaztmutltifhoq)
- `.env.staging` - Credenciales ambiente staging (rvjmwwvkhglcuqwcznph)
- `.env.production` - Credenciales ambiente production
- `.github/workflows/deploy-staging.yml` - Workflow actual de staging

**Scripts Creados:**
- `scripts/setup-supabase-branch.ts` - Automatizar creación de branches
- `scripts/copy-dev-to-staging.ts` - Copiar datos entre ambientes
- `scripts/copy-missing-tables.ts` - Sincronizar tablas faltantes

---

## 🎯 CONTEXTO GENERAL (Usar en NUEVAS conversaciones)

```
CONTEXTO: Three Environments CI/CD - FASE 1 COMPLETADA

Estoy trabajando en el proyecto "Three Environments CI/CD" para implementar un sistema automatizado dev → staging → production con Supabase Branching.

📊 PROGRESO ACTUAL:
- ✅ FASE 1 COMPLETADA (6/6 tareas - 100%)
- 🔜 Siguiente: FASE 2 - GitHub Actions Dev Workflow
- Total: 6/62 tareas completadas (9.7%)

🗂️ ARCHIVOS CLAVE:
- docs/infrastructure/three-environments/plan.md
- docs/infrastructure/three-environments/TODO.md
- docs/infrastructure/three-environments/CREDENTIALS_GUIDE.md
- docs/infrastructure/three-environments/SUPABASE_BRANCHING_GUIDE.md

✅ COMPLETADO EN FASE 1:
- 3 ambientes Supabase configurados (dev, staging, production)
- Credenciales documentadas (4 tipos: ACCESS_TOKEN, SERVICE_ROLE_KEY, ANON_KEY, DB_PASSWORD)
- 6,576 registros copiados de dev a staging (94.6%)
- Scripts de setup y sincronización creados
- Documentación completa de branching workflow

🎯 OBJETIVO FASE 2:
Crear workflow de validación para rama dev:
- Build check automático
- Test validation
- Migration syntax validation
- Branch protection rules

STACK:
- Git: dev, staging, main branches
- Supabase Branching (3 proyectos independientes)
- GitHub Actions
- VPS Hostinger (PM2 + Nginx)
- Next.js 15 + TypeScript + pnpm

Por favor, confirma que entiendes el contexto antes de continuar.
```

---

## ✅ FASE 1: Supabase Branching Setup (COMPLETADA)

**Status:** ✅ 100% COMPLETADA (6/6 tareas)
**Fecha:** November 1, 2025

### Tareas Completadas:

1. ✅ Verificar branch dev existente (ooaumjzaztmutltifhoq)
2. ✅ Crear nuevo branch staging (rvjmwwvkhglcuqwcznph)
3. ✅ Configurar archivos .env para 3 ambientes
4. ✅ Actualizar .env.template con documentación
5. ✅ Crear script setup-supabase-branch.ts
6. ✅ Crear documentación completa (SUPABASE_BRANCHING_GUIDE.md, CREDENTIALS_GUIDE.md)

### Entregables Completados:

- `.env.dev` - Credenciales dev/production
- `.env.staging` - Credenciales staging
- `.env.production` - Credenciales production (same as dev)
- `.env.template` - Template documentado
- `scripts/setup-supabase-branch.ts` - Automatización
- `scripts/copy-dev-to-staging.ts` - Sincronización de datos
- `docs/infrastructure/three-environments/SUPABASE_BRANCHING_GUIDE.md` (18KB)
- `docs/infrastructure/three-environments/CREDENTIALS_GUIDE.md` (8.2KB)
- `docs/infrastructure/GIT_SUPABASE_SYNC.md` - Mapeo Git ↔ Supabase

---

## 🔜 FASE 2: GitHub Actions - Dev Workflow (PENDIENTE)

**Objetivo:** Crear workflow de validación para rama `dev` (sin deploy).

**Status:** 🔜 Pendiente (0/5 tareas)
**Estimado:** 2-3 horas
**Owner:** @agent-deploy-agent

### Prompt para Iniciar FASE 2:

```
INICIAR FASE 2: GitHub Actions Dev Workflow

Contexto:
- FASE 1 completada (Supabase Branching configurado)
- Necesitamos validación automática en rama dev ANTES de merge a staging

Objetivo FASE 2:
Crear workflow `.github/workflows/validate-dev.yml` que ejecute en cada push a rama dev:
1. Build validation (pnpm run build)
2. Test validation (pnpm run test)
3. Migration syntax validation
4. TypeScript type checking

Archivos a crear:
- .github/workflows/validate-dev.yml
- scripts/validate-migrations.ts
- scripts/check-migration-conflicts.ts

NO deployear - solo validar.

Referencias:
- docs/infrastructure/three-environments/plan.md (FASE 2)
- docs/infrastructure/three-environments/TODO.md (sección FASE 2)
- .github/workflows/deploy-staging.yml (workflow existente como referencia)

¿Listos para comenzar FASE 2?
```

### Tareas FASE 2:

**2.1 Crear workflow validate-dev.yml**
- Trigger: push to dev branch
- Jobs: build, test, validate-migrations
- No deploy (solo validación)

**2.2 Crear script validate-migrations.ts**
- Validar sintaxis SQL de archivos .sql
- Detectar migraciones malformadas
- Report de errores

**2.3 Crear script check-migration-conflicts.ts**
- Detectar conflictos entre migraciones
- Verificar orden de ejecución
- Detectar duplicados

**2.4 Configurar status checks**
- Require checks to pass before merge
- Block merge si falla build/tests

**2.5 Testing del workflow**
- Push a dev → verificar workflow trigger
- Simular build failure → verificar bloqueo
- Simular migration error → verificar detección

### Entregables Esperados FASE 2:

- `.github/workflows/validate-dev.yml`
- `scripts/validate-migrations.ts`
- `scripts/check-migration-conflicts.ts`
- Documentation update en plan.md y TODO.md

---

## 🔜 FASE 3: Staging Workflow Enhanced (PENDIENTE)

**Objetivo:** Mejorar workflow de staging para aplicar migraciones automáticamente.

**Status:** 🔜 Pendiente (0/5 tareas)
**Estimado:** 2-3 horas
**Owner:** @agent-deploy-agent

### Prompt para Iniciar FASE 3:

```
INICIAR FASE 3: Staging Workflow Enhanced

Contexto:
- FASE 1 completada (Supabase Branching)
- FASE 2 completada (Dev validation)
- Workflow actual de staging NO aplica migraciones automáticamente

Objetivo FASE 3:
Mejorar `.github/workflows/deploy-staging.yml` para:
1. Aplicar migraciones automáticamente post-deploy
2. Rollback automático si migración falla
3. Health check post-migration
4. Logs de migraciones en GitHub Actions

Workflow:
1. Build + Deploy (existente)
2. Apply migrations (NUEVO)
3. Verify schema (NUEVO)
4. Health check (NUEVO)
5. Rollback si falla (NUEVO)

Referencias:
- docs/infrastructure/three-environments/plan.md (FASE 3)
- docs/infrastructure/three-environments/TODO.md (sección FASE 3)
- .github/workflows/deploy-staging.yml (workflow actual)

¿Listos para mejorar staging workflow?
```

### Tareas FASE 3:

**3.1 Actualizar deploy-staging.yml**
- Agregar step de apply migrations
- Agregar rollback automático
- Agregar health checks

**3.2 Crear script apply-migrations-staging.ts**
- Aplicar migraciones pendientes
- Log de progreso
- Error handling

**3.3 Crear script verify-schema-staging.ts**
- Verificar schema post-migration
- Comparar con expected state
- Report de diferencias

**3.4 Crear script rollback-migration-staging.ts**
- Revertir última migración
- Restaurar estado anterior
- Notificación de rollback

**3.5 Testing del workflow enhanced**
- Crear migración test
- Merge dev → staging
- Verificar aplicación automática
- Simular fallo → verificar rollback

### Entregables Esperados FASE 3:

- `.github/workflows/deploy-staging.yml` (actualizado)
- `scripts/apply-migrations-staging.ts`
- `scripts/verify-schema-staging.ts`
- `scripts/rollback-migration-staging.ts`
- Documentation update en plan.md y TODO.md

---

## 🔜 FASE 4: Production Workflow (PENDIENTE)

**Objetivo:** Crear workflow de producción con aprobación manual y safety checks.

**Status:** 🔜 Pendiente (0/6 tareas)
**Estimado:** 3-4 horas
**Owner:** @agent-deploy-agent

### Prompt para Iniciar FASE 4:

```
INICIAR FASE 4: Production Workflow

Contexto:
- FASE 1, 2, 3 completadas
- Staging workflow validado
- Necesitamos máxima seguridad para production

Objetivo FASE 4:
Crear `.github/workflows/deploy-production.yml` con:
1. Manual approval obligatoria (GitHub Environments)
2. Database backup pre-deploy
3. Migration application con rollback
4. Health checks comprehensivos
5. Notificaciones de deploy

Safety features:
- Require 1 approval antes de deploy
- Backup automático pre-deploy
- Rollback completo si falla
- Health check multi-point

Referencias:
- docs/infrastructure/three-environments/plan.md (FASE 4)
- docs/infrastructure/three-environments/TODO.md (sección FASE 4)

¿Listos para configurar production workflow?
```

### Tareas FASE 4:

**4.1 Configurar GitHub Environment "production"**
- Required reviewers
- Protection rules
- Environment secrets

**4.2 Crear deploy-production.yml**
- Trigger: push to main
- Environment: production (con approval)
- Jobs: backup, deploy, migrate, verify, rollback

**4.3 Crear script backup-production-db.ts**
- Backup completo pre-deploy
- Timestamp + metadata
- Verificación de backup

**4.4 Crear script apply-migrations-production.ts**
- Aplicar migraciones con extra safety
- Verbose logging
- Dry-run option

**4.5 Crear script verify-production-health.ts**
- Health check de API
- Health check de DB
- Health check de features críticas

**4.6 Crear script rollback-production.ts**
- Rollback completo (code + DB)
- Restaurar desde backup
- Notificaciones

### Entregables Esperados FASE 4:

- `.github/workflows/deploy-production.yml`
- GitHub Environment "production" configurado
- `scripts/backup-production-db.ts`
- `scripts/apply-migrations-production.ts`
- `scripts/verify-production-health.ts`
- `scripts/rollback-production.ts`
- Documentation update en plan.md y TODO.md

---

## 🔜 FASE 5: Branch Protection Rules (PENDIENTE)

**Objetivo:** Configurar reglas de protección en GitHub para forzar workflow.

**Status:** 🔜 Pendiente (0/3 tareas)
**Estimado:** 1-2 horas
**Owner:** Usuario (configuración manual en GitHub)

### Prompt para Iniciar FASE 5:

```
INICIAR FASE 5: Branch Protection Rules

Contexto:
- FASE 1-4 completadas
- Workflows funcionando
- Necesitamos forzar el flujo correcto

Objetivo FASE 5:
Configurar branch protection rules en GitHub para:
- dev: require status checks (build, test)
- staging: require PR from dev + checks
- main: require PR from staging + approval + checks

Te guiaré paso a paso en la configuración manual de GitHub.

Referencias:
- docs/infrastructure/three-environments/plan.md (FASE 5)
- docs/infrastructure/three-environments/TODO.md (sección FASE 5)

¿Listos para configurar branch protection?
```

### Tareas FASE 5:

**5.1 Configurar protection para rama dev**
- Require status checks to pass
- Require checks: build, test, validate-migrations

**5.2 Configurar protection para rama staging**
- Require pull request before merging
- Require base branch: dev
- Require status checks: build, test, deploy

**5.3 Configurar protection para rama main**
- Require pull request before merging
- Require base branch: staging
- Require 1 approval
- Require status checks: all
- Require environment: production

---

## 📋 NOTAS IMPORTANTES

### Estado Actual del Proyecto:

**✅ Completado:**
- FASE 1: Supabase Branching Setup (100%)
- 3 ambientes funcionando (dev, staging, production)
- 6,576 registros en staging
- Documentación completa de credenciales

**🔜 Pendiente:**
- FASE 2: Dev Workflow (0%)
- FASE 3: Staging Enhanced (0%)
- FASE 4: Production Workflow (0%)
- FASE 5: Branch Protection (0%)
- FASE 6: Documentation (0%)
- FASE 7: Monitoring (0%)
- FASE 8: Testing E2E (0%)
- FASE 9: Training (0%)

### Progreso Total:

- **Completado:** 6/62 tareas (9.7%)
- **Tiempo invertido:** ~3 horas
- **Tiempo restante estimado:** 14-23 horas

### Decisiones Técnicas Tomadas:

1. **Service Role Keys funcionan** para copiar datos (Database Passwords NO)
2. **Dev branch IS production** (mismo project_id que main)
3. **Staging es independiente** (project_id diferente)
4. **Manual data sync required** (Supabase no copia datos automáticamente)

### Lecciones Aprendidas:

1. ❌ `PGPASSWORD` + pg_dump → NO funcionó (tenant not found)
2. ✅ `Service Role Key` + Supabase client → SÍ funcionó (6,576 registros)
3. ⚠️ Supabase Branching copia SOLO schema, NO datos
4. ✅ Cada ambiente necesita sus propias credenciales independientes

---

## 🔗 LINKS ÚTILES

**Documentación Supabase:**
- Branching Guide: https://supabase.com/docs/guides/platform/branching
- Management API: https://supabase.com/docs/reference/api/introduction

**GitHub Actions:**
- Environments: https://docs.github.com/en/actions/deployment/targeting-different-environments
- Branch Protection: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches

**Proyecto Actual:**
- GitHub Repo: (tu repo)
- Supabase Dashboard: https://supabase.com/dashboard
- VPS Staging: https://staging.muva.chat
- VPS Production: https://muva.chat

---

**Última Actualización:** November 1, 2025
**Autor:** Database Agent
**Próximo Paso:** FASE 2 - GitHub Actions Dev Workflow
