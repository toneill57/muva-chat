# Three Environments CI/CD - Plan de Implementación

**Proyecto:** Three Environments with Supabase Branching
**Fecha Inicio:** 2025-11-01
**Estado:** 📋 Planificación Completa

---

## 🎯 OVERVIEW

### Objetivo Principal

Implementar un sistema de tres ambientes (dev, staging, production) con despliegue automático y sincronización de base de datos usando Supabase Branching. Cada ambiente tendrá su propia rama Git, rama Supabase, y servidor VPS correspondiente.

### ¿Por qué?

- **Seguridad**: Evitar deploys accidentales a producción
- **Testing**: Validar cambios en staging antes de producción
- **Database Safety**: Migraciones testeadas en cada ambiente
- **Rollback**: Capacidad de revertir cambios por ambiente
- **Isolation**: Datos aislados entre ambientes (dev/staging/prod)

### Alcance

**Git Branches:**
- `dev` → Local development + branch Supabase dev
- `staging` → VPS staging + branch Supabase staging
- `main` → VPS production + proyecto Supabase principal

**CI/CD Automation:**
- Merge `dev → staging` → Auto-deploy + DB migration
- Merge `staging → main` → Auto-deploy + DB migration + health checks

**Supabase Branching:**
- Cada rama Git conecta a su rama Supabase correspondiente
- Migraciones se aplican automáticamente al hacer merge
- Posibilidad de preview branches para features

**VPS Infrastructure:**
- `/var/www/muva-chat-dev` (local - opcional)
- `/var/www/muva-chat-staging` → `staging.muva.chat`
- `/var/www/muva-chat` → `muva.chat`

---

## 📊 ESTADO ACTUAL

### Sistema Existente

✅ **Git Branches:**
- `dev` - Existe pero NO deployea actualmente
- `staging` - Deployea a VPS staging (`staging.muva.chat`)
- `main` - Rama principal de producción

✅ **GitHub Actions:**
- `.github/workflows/deploy-staging.yml` - Deployea rama `staging`
- Falta: workflow para `dev` y `main`

✅ **VPS Setup:**
- Hostinger Ubuntu 22.04
- PM2 process manager
- Nginx reverse proxy
- SSH access configurado

✅ **Supabase Projects:**
- DEV/Production: `iyeueszchbvlutlcmvcb` → `muva.chat` (branch: dev)
- Staging: `rvjmwwvkhglcuqwcznph` → `staging.muva.chat` (branch: staging)
- Supabase CLI disponible (via npx)

### Limitaciones Actuales

❌ **No Database Sync:**
- Migraciones NO se aplican automáticamente
- Cambios de schema requieren intervención manual
- Riesgo de desincronización entre ambientes

❌ **No Dev Workflow:**
- Rama `dev` no tiene workflow de deploy
- No hay branch Supabase para dev
- Testing local usa DB de staging (no ideal)

❌ **No Production Workflow:**
- Rama `main` no tiene workflow automatizado
- Deploy a producción es manual
- No health checks post-deploy

❌ **No Branch Protection:**
- No hay reglas de merge (staging → main)
- No hay validaciones pre-merge
- No hay checks obligatorios

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

**Developer Workflow:**
```bash
# Local development
git checkout dev
./scripts/dev-with-keys.sh  # Conecta a Supabase dev branch
# Hacer cambios + crear migraciones
git add . && git commit -m "feat: nueva feature"
git push origin dev

# Desplegar a staging
git checkout staging
git merge dev
git push origin staging
# → GitHub Actions auto-deploya + aplica migraciones
# → Verificar en staging.muva.chat

# Desplegar a production
git checkout main
git merge staging
git push origin main
# → GitHub Actions solicita aprobación
# → Usuario aprueba
# → Auto-deploya + aplica migraciones + health checks
# → Verificar en muva.chat
```

### Características Clave

**Automatización Completa:**
- Push to `dev` → NO deploya (local only)
- Push to `staging` → Auto-deploy + DB sync
- Push to `main` → Deploy con aprobación + DB sync + health checks

**Database Safety:**
- Cada ambiente tiene su rama/proyecto Supabase
- Migraciones se testean en dev → staging → production
- Rollback automático si migraciones fallan
- Schema drift detection

**Protection Rules:**
- Staging: requiere PR desde dev
- Main: requiere PR desde staging + 1 approval
- Status checks obligatorios (build, tests, migrations)

**Monitoring:**
- Health checks post-deploy
- Database migration logs
- Rollback automático en caso de fallo

---

## 📱 TECHNICAL STACK

### Infrastructure
- **Git**: GitHub (branches + protection rules)
- **CI/CD**: GitHub Actions (3 workflows)
- **VPS**: Hostinger Ubuntu 22.04
- **Process Manager**: PM2 (3 instances)
- **Web Server**: Nginx (3 virtual hosts)

### Database
- **Supabase**: PostgreSQL 17.4
- **Branching**: Supabase CLI (preview branches)
- **Migrations**: SQL files in `supabase/migrations/`

### Deployment
- **SSH**: Automated via `appleboy/ssh-action`
- **Secrets**: GitHub Secrets por ambiente
- **Build**: pnpm + Next.js 15

---

## 🔧 DESARROLLO - FASES

### FASE 1: Supabase Branching Setup (2-3h) ✅ COMPLETADA

**Objetivo:** Crear branches Supabase para dev y staging, configurar proyectos.

**Entregables:**
- Branch Supabase `dev` creado (ya existía como producción)
- Branch Supabase `staging` creado: `rvjmwwvkhglcuqwcznph`
- Variables de entorno actualizadas
- Documentación de conexión
- Scripts para copiar datos entre ambientes

**⚠️ IMPORTANTE - Supabase Branching Schema-Only:**
- Supabase Branching copia **SOLO el schema (DDL)**, NO los datos (DML)
- Después de crear un branch, necesitas copiar datos manualmente
- Usa `scripts/copy-dev-to-staging.ts` para sincronizar datos
- Cada ambiente tiene su propia database password independiente

**Archivos creados:**
- `.env.template` - Template completo con todas las variables documentadas
- `.env.dev` - Variables para ambiente dev (`iyeueszchbvlutlcmvcb`)
- `.env.staging` - Variables para ambiente staging (`rvjmwwvkhglcuqwcznph`)
- `.env.production` - Variables para ambiente production (mismo que dev)
- `scripts/setup-supabase-branch.ts` - Script automatizado para crear branches
- `scripts/copy-dev-to-staging.ts` - Script para copiar datos principales
- `scripts/copy-missing-tables.ts` - Script para tablas especiales (PKs diferentes)
- `docs/infrastructure/three-environments/SUPABASE_BRANCHING_GUIDE.md` - Guía completa
- `docs/infrastructure/GIT_SUPABASE_SYNC.md` - Mapeo Git ↔ Supabase

**Testing:**
- ✅ Conectar local a branch dev
- ✅ Branch staging creado y accesible
- ✅ Datos copiados de dev a staging (6,576/6,951 registros - 94.6%)
- ✅ Verificar aislamiento (dev y staging independientes)

---

### FASE 2: GitHub Actions - Dev Workflow (2-3h) ✅ COMPLETADA

**Objetivo:** Crear workflow para rama `dev` (local development sin deploy).

**Entregables:**
- Workflow `.github/workflows/validate-dev.yml`
- Build check en cada push
- Test check en cada push
- Migration validation check
- Branch protection rules para `dev`

**Archivos a crear/modificar:**
- `.github/workflows/validate-dev.yml`
- `scripts/validate-migrations.ts` - Validar sintaxis SQL
- `scripts/check-migration-conflicts.ts` - Detectar conflictos
- `.github/CODEOWNERS` - Require reviews

**Testing:**
- Push a `dev` → Trigger workflow
- Validación de build exitosa
- Validación de migraciones exitosa
- PR a staging requiere checks pasados

---

### FASE 3: GitHub Actions - Staging Workflow Enhanced (2-3h) ✅ COMPLETADA

**Objetivo:** Mejorar workflow de staging para aplicar migraciones automáticamente.

**Entregables:**
- Workflow actualizado con migration step
- Rollback automático si falla migración
- Logs de migraciones en GitHub Actions
- Health check post-migration

**Archivos a crear/modificar:**
- `.github/workflows/deploy-staging.yml` (actualizar)
- `scripts/apply-migrations-staging.ts` - Aplicar migraciones
- `scripts/verify-schema-staging.ts` - Validar schema post-migration
- `scripts/rollback-migration-staging.ts` - Rollback automático

**Testing:**
- Crear migración test en `dev`
- Merge `dev → staging`
- Verificar migración se aplica automáticamente
- Verificar rollback si falla

---

### FASE 4: GitHub Actions - Production Workflow (3-4h) ✅ COMPLETADA

**Objetivo:** Crear workflow de producción con aprobación manual y safety checks.

**Entregables:**
- Workflow `.github/workflows/deploy-production.yml`
- Manual approval step (GitHub Environments)
- Database backup pre-deploy
- Migration application
- Health checks post-deploy
- Rollback automático si falla

**Archivos a crear/modificar:**
- `.github/workflows/deploy-production.yml`
- `scripts/backup-production-db.ts` - Backup pre-deploy
- `scripts/apply-migrations-production.ts` - Aplicar migraciones
- `scripts/verify-production-health.ts` - Health checks
- `scripts/rollback-production.ts` - Rollback completo

**Testing:**
- Crear PR staging → main
- Verificar requiere aprobación
- Aprobar y verificar backup se crea
- Verificar migraciones se aplican
- Verificar health checks pasan
- Simular fallo y verificar rollback

---

### FASE 5: Branch Protection Rules (1-2h)

**Objetivo:** Configurar reglas de protección en GitHub para forzar workflow.

**Entregables:**
- Protection rules para `dev`
- Protection rules para `staging`
- Protection rules para `main`
- GitHub Environment `production` con reviewers

**Configuración:**

**Branch `dev`:**
- Require status checks (build, tests)
- NO require pull request reviews (desarrollo rápido)

**Branch `staging`:**
- Require pull request from `dev`
- Require status checks (build, tests, migrations)
- NO require reviews (auto-merge OK)

**Branch `main`:**
- Require pull request from `staging`
- Require 1 approval (CEO/CTO)
- Require status checks (build, tests, migrations, staging-health)
- Require linear history (no merge commits)
- Require deployment to succeed (GitHub Environment)

**Archivos a crear/modificar:**
- `docs/infrastructure/three-environments/BRANCH_PROTECTION_GUIDE.md`

**Testing:**
- Intentar push directo a `main` → Bloqueado
- Intentar merge staging → main sin PR → Bloqueado
- Crear PR staging → main → Requiere approval
- Aprobar y verificar deploy

---

### FASE 6: Migration Management System (2-3h)

**Objetivo:** Sistema robusto para manejar migraciones entre ambientes.

**Entregables:**
- Script para generar migraciones
- Validación de orden de migraciones
- Detection de schema drift
- Migration history tracking

**Archivos a crear/modificar:**
- `scripts/create-migration.ts` - Generar migración
- `scripts/migration-status.ts` - Ver estado por ambiente
- `scripts/detect-schema-drift.ts` - Comparar schemas
- `scripts/sync-migrations.ts` - Sincronizar manualmente
- `docs/infrastructure/three-environments/MIGRATION_GUIDE.md`

**Testing:**
- Crear migración en dev
- Verificar orden correcto (timestamp)
- Aplicar en staging
- Detectar drift si hay diferencias
- Aplicar en production

---

### FASE 7: Environment Variables Management (1-2h)

**Objetivo:** Gestión segura de variables de entorno por ambiente.

**Entregables:**
- GitHub Secrets organizados por ambiente
- Script para validar env vars
- Documentación de secretos requeridos

**Archivos a crear/modificar:**
- `scripts/validate-env-vars.ts` - Validar completitud
- `scripts/rotate-secrets.ts` - Rotar secretos
- `.env.template` - Template completo
- `docs/infrastructure/three-environments/SECRETS_GUIDE.md`

**GitHub Secrets Structure:**
```
DEV_SUPABASE_URL
DEV_SUPABASE_ANON_KEY
DEV_SUPABASE_SERVICE_ROLE_KEY

STAGING_SUPABASE_URL
STAGING_SUPABASE_ANON_KEY
STAGING_SUPABASE_SERVICE_ROLE_KEY

PROD_SUPABASE_URL
PROD_SUPABASE_ANON_KEY
PROD_SUPABASE_SERVICE_ROLE_KEY

VPS_HOST
VPS_USER
VPS_SSH_KEY
```

**Testing:**
- Validar todos los secretos existen
- Deploy a staging con vars correctas
- Verificar no hay leakage entre ambientes

---

### FASE 8: Monitoring & Alerting (2-3h)

**Objetivo:** Sistema de monitoreo para detectar problemas post-deploy.

**Entregables:**
- Health check endpoints
- Slack/Discord notifications
- Migration failure alerts
- Performance monitoring

**Archivos a crear/modificar:**
- `src/app/api/health/route.ts` - Health check endpoint
- `src/app/api/health/db/route.ts` - DB health check
- `scripts/notify-deploy-success.ts` - Notificación éxito
- `scripts/notify-deploy-failure.ts` - Notificación fallo
- `docs/infrastructure/three-environments/MONITORING_GUIDE.md`

**Testing:**
- Deploy exitoso → Notificación verde
- Deploy fallido → Notificación roja
- Health check retorna 200
- DB health check valida conexión

---

### FASE 9: Documentation & Training (2-3h)

**Objetivo:** Documentación completa del sistema para todo el equipo.

**Entregables:**
- README actualizado
- Guías por rol (developer, DevOps, CEO)
- Troubleshooting guide
- Video walkthrough (opcional)

**Archivos a crear/modificar:**
- `docs/infrastructure/three-environments/README.md` - Hub
- `docs/infrastructure/three-environments/DEVELOPER_GUIDE.md`
- `docs/infrastructure/three-environments/DEVOPS_GUIDE.md`
- `docs/infrastructure/three-environments/TROUBLESHOOTING.md`
- `docs/infrastructure/three-environments/FAQ.md`
- `README.md` - Actualizar sección deployment

**Testing:**
- Developer sigue guía y hace deploy exitoso
- CEO aprueba PR sin asistencia
- Troubleshooting guide resuelve problema común

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad

- [ ] 3 branches Supabase funcionando (dev, staging, prod)
- [ ] Push to staging → Auto-deploy + DB sync
- [ ] Push to main → Deploy con approval + DB sync
- [ ] Migraciones se aplican en orden correcto
- [ ] Rollback automático funciona
- [ ] Health checks detectan problemas
- [ ] Notificaciones funcionan

### Performance

- [ ] Deploy completo staging < 5 minutos
- [ ] Deploy completo production < 7 minutos (backup incluido)
- [ ] Migrations apply < 2 minutos
- [ ] Health checks < 30 segundos

### Seguridad

- [ ] NO push directo a main (bloqueado)
- [ ] Aprobación requerida para production
- [ ] Secretos NO expuestos en logs
- [ ] DB credentials rotables
- [ ] Backup pre-deploy funciona

### Confiabilidad

- [ ] 0 failed deployments sin rollback
- [ ] 100% migrations aplicadas correctamente
- [ ] Health checks 95%+ uptime
- [ ] Schema drift detection funciona

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-deploy-agent** (Principal)

**Responsabilidad:** CI/CD pipelines, GitHub Actions, deployment automation

**Tareas:**
- FASE 2: Crear workflow dev validation
- FASE 3: Mejorar workflow staging con migrations
- FASE 4: Crear workflow production con approval
- FASE 5: Documentar branch protection rules
- FASE 8: Implementar monitoring y alerting
- FASE 9: Crear guías de deployment

**Archivos:**
- `.github/workflows/*.yml`
- `scripts/deploy-*.ts`
- `scripts/notify-*.ts`

---

### 2. **@agent-database-agent** (Crítico)

**Responsabilidad:** Supabase branching, migrations, schema management

**Tareas:**
- FASE 1: Setup Supabase branches
- FASE 3: Scripts de migración staging
- FASE 4: Scripts de migración production
- FASE 6: Migration management system
- FASE 8: DB health checks

**Archivos:**
- `scripts/setup-supabase-branch.ts`
- `scripts/apply-migrations-*.ts`
- `scripts/detect-schema-drift.ts`
- `src/app/api/health/db/route.ts`

---

### 3. **@agent-infrastructure-monitor** (Soporte)

**Responsabilidad:** Monitoring, health checks, rollback verification

**Tareas:**
- FASE 4: Production health checks
- FASE 8: Monitoring system completo
- FASE 9: Troubleshooting documentation

**Archivos:**
- `scripts/verify-*-health.ts`
- `scripts/rollback-*.ts`
- `docs/infrastructure/three-environments/MONITORING_GUIDE.md`
- `docs/infrastructure/three-environments/TROUBLESHOOTING.md`

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/muva-chat/
├── .github/
│   └── workflows/
│       ├── validate-dev.yml              # FASE 2 (NEW)
│       ├── deploy-staging.yml            # FASE 3 (UPDATE)
│       └── deploy-production.yml         # FASE 4 (NEW)
│
├── scripts/
│   ├── setup-supabase-branch.ts          # FASE 1 ✅
│   ├── copy-dev-to-staging.ts            # FASE 1 ✅
│   ├── copy-missing-tables.ts            # FASE 1 ✅
│   ├── validate-migrations.ts            # FASE 2
│   ├── apply-migrations-staging.ts       # FASE 3
│   ├── apply-migrations-production.ts    # FASE 4
│   ├── backup-production-db.ts           # FASE 4
│   ├── rollback-production.ts            # FASE 4
│   ├── create-migration.ts               # FASE 6
│   ├── detect-schema-drift.ts            # FASE 6
│   ├── validate-env-vars.ts              # FASE 7
│   ├── notify-deploy-success.ts          # FASE 8
│   └── notify-deploy-failure.ts          # FASE 8
│
├── src/app/api/
│   └── health/
│       ├── route.ts                      # FASE 8
│       └── db/route.ts                   # FASE 8
│
├── docs/infrastructure/
│   ├── GIT_SUPABASE_SYNC.md              # FASE 1 ✅
│   └── three-environments/
│       ├── README.md                     # FASE 9
│       ├── plan.md                       # THIS FILE
│       ├── TODO.md                       # NEXT
│       ├── three-environments-prompt-workflow.md  # NEXT
│       ├── SUPABASE_BRANCHING_GUIDE.md   # FASE 1 ✅
│       ├── BRANCH_PROTECTION_GUIDE.md    # FASE 5
│       ├── MIGRATION_GUIDE.md            # FASE 6
│       ├── SECRETS_GUIDE.md              # FASE 7
│       ├── MONITORING_GUIDE.md           # FASE 8
│       ├── DEVELOPER_GUIDE.md            # FASE 9
│       ├── DEVOPS_GUIDE.md               # FASE 9
│       ├── TROUBLESHOOTING.md            # FASE 9
│       └── FAQ.md                        # FASE 9
│
├── .env.template                         # FASE 1 ✅
├── .env.dev                              # FASE 1 ✅
├── .env.staging                          # FASE 1 ✅
└── .env.production                       # FASE 1 ✅
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

**Supabase Branching Costs:**
- Preview branches: ~$0.32/hora por branch
- Dev branch: ~$230/mes si está 24/7 activo
- **Recomendación**: Usar branch dev solo cuando se desarrolla (pausar al terminar día)

**Migration Safety:**
- NUNCA skip migrations en staging
- SIEMPRE testear en dev → staging antes de prod
- Backup automático antes de migration en prod
- Rollback automático si falla (máximo 1 step back)

**Environment Isolation:**
- Dev: datos fake/sintéticos (OK para experimentar)
- Staging: copia de prod (actualizada semanalmente)
- Production: datos reales (NUNCA tocar manualmente)

**GitHub Actions Limits:**
- Free tier: 2,000 minutos/mes
- Deploy staging: ~5 min → 400 deploys/mes
- Deploy production: ~7 min → 285 deploys/mes
- **Recomendación**: Limitar deploys automáticos a staging, prod manual

**VPS Resources:**
- 3 instances PM2 → Verificar RAM suficiente
- Nginx virtual hosts → Configurar DNS
- SSL certificates → Wildcard Let's Encrypt OK

### Decisiones de Diseño

**¿Por qué Supabase Branching en lugar de proyectos separados?**
- Migraciones automáticas al merge
- Schema sync más fácil
- Menor costo (~$0.32/h vs $25/mes por proyecto)
- Menos complejidad de configuración

**¿Por qué approval manual en production?**
- Evitar deploys accidentales
- Permite verificar staging antes
- CEO/CTO tiene control final
- Compliance requirement (audit trail)

**¿Por qué NO deploy automático en dev?**
- Dev es local (./scripts/dev-with-keys.sh)
- No hay servidor dev público (opcional)
- Economiza GitHub Actions minutos
- Fuerza testing local antes de push

---

## 🔄 Workflow de Trabajo Diario

### Desarrollador - Nueva Feature

```bash
# Día 1: Desarrollo local
git checkout dev
git pull origin dev
./scripts/dev-with-keys.sh  # Conecta a Supabase dev branch

# Hacer cambios
# Crear migración si es necesario
pnpm dlx supabase migration new add_feature_x

# Commit
git add .
git commit -m "feat: nueva feature X"
git push origin dev
# → GitHub Actions valida build + tests

# Día 2: Deploy a staging
git checkout staging
git pull origin staging
git merge dev  # Crea PR automático
git push origin staging
# → GitHub Actions deploya + aplica migraciones
# → Verificar en staging.muva.chat

# Día 3: Deploy a production (si todo OK)
git checkout main
git pull origin main
# Crear PR: staging → main
# Esperar aprobación CEO/CTO
# → GitHub Actions deploya + backup + migraciones
# → Health checks
# → Verificar en muva.chat
```

### DevOps - Migration Troubleshooting

```bash
# Ver estado de migraciones por ambiente
pnpm dlx tsx scripts/migration-status.ts

# Detectar schema drift
pnpm dlx tsx scripts/detect-schema-drift.ts

# Aplicar migración manualmente (emergency)
pnpm dlx tsx scripts/sync-migrations.ts --env=production --migration=20251101_fix_critical

# Rollback última migración
pnpm dlx tsx scripts/rollback-migration-staging.ts --steps=1
```

---

**Última actualización:** 2025-11-01
**Próximo paso:** Crear TODO.md con tareas granulares por fase
