# TODO - Three-Tier Migration (UNIFICADO)

**Proyecto:** Migración a Modelo Three-Tier (dev/tst/prd)
**Fecha:** 16 de Noviembre, 2025
**Plan:** Ver `plan.md` para contexto completo
**Versión:** UNIFICADA - Sin ambigüedades

---

## FASE 0: Preparación (10 min)

### 0.1 Commit pending changes
- [ ] Commitear cambios pendientes en rama staging (3 min)
  - Comando: `git status`
  - Comando: `git add .`
  - Comando: `git commit -m "chore: preparar migración three-tier"`
  - Test: `git status` muestra "working tree clean"
  - Agent: **Planner (manual)**

### 0.2 Backup staging viejo
- [ ] Crear backup SQL de hoaiwcueleiemeplrurv (5 min)
  - Usar `mcp__supabase__execute_sql` para pg_dump
  - Guardar en: `docs/three-tier-unified/backups/staging-20251116.sql`
  - Verificar tamaño > 1MB
  - Agent: **@agent-database-agent**
  - Test: Archivo existe, contiene CREATE TABLE y INSERT

### 0.3 Verificar acceso nuevo proyecto
- [ ] Confirmar acceso MCP a kprqghwdnaykxhostivv (2 min)
  - Ejecutar: `mcp__supabase__get_project` con kprqghwdnaykxhostivv
  - Ejecutar: `mcp__supabase__list_branches`
  - Confirmar: 3 branches (main, dev, tst) con ACTIVE_HEALTHY
  - Agent: **@agent-database-agent**
  - Test: MCP retorna 3 branches

---

## FASE 1: Verificar GitHub Branches ✅ (5 min) - OPCIONAL/COMPLETADA

**Estado:** ✅ YA COMPLETADO - Ramas creadas previamente

### 1.1 Verificar ramas remotas ✅
- [x] Ramas dev/tst/prd existen (2 min) - COMPLETADO
  - `git fetch --all`
  - `git branch -r | grep -E "(dev|tst|prd)"`
  - Agent: **N/A - Ya verificado**
  - Test: ✅ origin/dev, origin/tst, origin/prd existen

### 1.2 Verificar commits ✅
- [x] Todas en commit 1875e09 (2 min) - COMPLETADO
  - Verificado: dev, tst, prd en commit 1875e09
  - Agent: **N/A - Ya verificado**
  - Test: ✅ Todas sincronizadas

### 1.3 Verificar migrations ✅
- [x] 19 migrations en cada rama (1 min) - COMPLETADO
  - Verificado: 19 migrations en dev/tst/prd
  - Agent: **N/A - Ya verificado**
  - Test: ✅ 19 archivos en cada rama

**RECOMENDACIÓN:** Saltar directamente a FASE 2

---

## FASE 2: Migrar Datos (30 min)

### 2.1 Exportar datos de staging viejo
- [ ] Crear dump de datos desde hoaiwcueleiemeplrurv (10 min)
  - Método: pg_dump completo (todas las tablas)
  - Guardar en: `docs/three-tier-unified/backups/data-export.sql`
  - Verificar: dump contiene INSERT statements
  - Agent: **@agent-database-agent**
  - Test: Archivo existe, tamaño > 5MB

### 2.2 Importar datos a dev
- [ ] Restaurar datos en azytxnyiizldljxrapoe (10 min)
  - Usar `mcp__supabase__execute_sql` con INSERT statements
  - Validar: `SELECT COUNT(*) FROM tenant_registry` > 0
  - Agent: **@agent-database-agent**
  - Test: Row count tenant_registry > 0

### 2.3 Importar datos a tst
- [ ] Restaurar datos en bddcvjoeoiekzfetvxoe (5 min)
  - Mismo proceso que dev (copia completa)
  - Agent: **@agent-database-agent**
  - Test: Row counts tst ≈ dev (±5%)

### 2.4 Validar RPC y RLS
- [ ] Verificar RPC functions y RLS policies (5 min)
  - Dev: `SELECT get_accommodation_units() LIMIT 5`
  - Tst: `SELECT get_accommodation_units() LIMIT 5`
  - Verificar: `SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'` >= 10
  - Ejecutar: `mcp__supabase__get_advisors` (security) en dev y tst
  - Agent: **@agent-database-agent**
  - Test: RPC ejecuta, >= 10 policies, 0 advisors críticos

---

## FASE 3: Aplicar Migrations a MAIN (15 min)

### 3.1 Listar migrations
- [ ] Leer 18 archivos de migrations (2 min)
  - Listar: `supabase/migrations/*.sql`
  - Ordenar por timestamp (nombre de archivo)
  - Agent: **@agent-database-agent**
  - Test: Lista muestra 18 archivos ordenados

### 3.2 Aplicar migrations a main
- [ ] Aplicar 18 migrations a kprqghwdnaykxhostivv (12 min)
  - Para cada migration: `mcp__supabase__apply_migration`
  - project_id: kprqghwdnaykxhostivv
  - Documentar en: `docs/three-tier-unified/logs/migrations-prd.md`
  - Agent: **@agent-database-agent**
  - Test: `mcp__supabase__list_migrations` muestra 18

### 3.3 Validar schema main
- [ ] Verificar schema completo en main (1 min)
  - `mcp__supabase__list_tables` con schemas: ["public", "hotels"]
  - Comparar conteo con dev/tst (debe ser 43 tablas)
  - Verificar tablas clave: tenant_registry, accommodation_units_public
  - Agent: **@agent-database-agent**
  - Test: 43 tablas en main (igual que dev/tst)

---

## FASE 4: Configuración Local (20 min)

### 4.1 Obtener credenciales
- [ ] Obtener keys de Supabase para 3 ambientes (5 min)
  - `mcp__supabase__get_publishable_keys` para azytxnyiizldljxrapoe (dev)
  - `mcp__supabase__get_publishable_keys` para bddcvjoeoiekzfetvxoe (tst)
  - `mcp__supabase__get_publishable_keys` para kprqghwdnaykxhostivv (prd)
  - Extraer: ANON_KEY, SERVICE_ROLE_KEY
  - Agent: **@agent-backend-developer**
  - Test: Obtener keys para los 3 proyectos

### 4.2 Crear .env.dev
- [ ] Crear archivo .env.dev (3 min)
  - Archivo: `.env.dev` en raíz
  - Variables: URL, ANON_KEY, SERVICE_ROLE_KEY, PROJECT_ID
  - Project ID: azytxnyiizldljxrapoe
  - Agent: **@agent-backend-developer**
  - Test: Archivo existe, contiene project ID correcto

### 4.3 Crear .env.tst
- [ ] Crear archivo .env.tst (3 min)
  - Archivo: `.env.tst` en raíz
  - Project ID: bddcvjoeoiekzfetvxoe
  - Agent: **@agent-backend-developer**
  - Test: Archivo existe, contiene project ID correcto

### 4.4 Crear .env.prd
- [ ] Crear archivo .env.prd (3 min)
  - Archivo: `.env.prd` en raíz
  - Project ID: kprqghwdnaykxhostivv
  - Agent: **@agent-backend-developer**
  - Test: Archivo existe, contiene project ID correcto

### 4.5 Crear script dev-tst.sh
- [ ] Copiar y actualizar dev-staging.sh → dev-tst.sh (3 min)
  - Copiar: `scripts/deploy/dev-staging.sh` a `dev-tst.sh`
  - Cambiar: `source .env.staging` → `source .env.tst`
  - Agent: **@agent-backend-developer**
  - Test: Script ejecuta sin errores

### 4.6 Crear script dev-prd.sh
- [ ] Copiar y actualizar dev-production.sh → dev-prd.sh (3 min)
  - Copiar: `scripts/deploy/dev-production.sh` a `dev-prd.sh`
  - Cambiar: `source .env.production` → `source .env.prd`
  - Agent: **@agent-backend-developer**
  - Test: Script ejecuta sin errores

---

## FASE 5: GitHub Actions (30 min)

### 5.1 Crear deploy-tst.yml
- [ ] Workflow para tst (10 min)
  - Copiar: `.github/workflows/deploy-staging.yml` a `deploy-tst.yml`
  - Cambiar trigger: `push: branches: [tst]`
  - Cambiar secrets: `STAGING_*` → `TST_*`
  - Agent: **@agent-deploy-agent**
  - Test: Workflow syntax válido

### 5.2 Crear deploy-prd.yml
- [ ] Workflow para prd (5 min)
  - Copiar: `.github/workflows/deploy-production.yml` a `deploy-prd.yml`
  - Cambiar trigger: `push: branches: [prd]`
  - Cambiar secrets: `PROD_*` → `PRD_*`
  - Agent: **@agent-deploy-agent**
  - Test: Syntax OK

### 5.3 Actualizar validate-dev.yml
- [ ] Update project IDs en validation workflow (3 min)
  - Modificar: `.github/workflows/validate-dev.yml`
  - Cambiar project ID a: azytxnyiizldljxrapoe
  - Agent: **@agent-deploy-agent**
  - Test: Workflow ejecuta en push a dev

### 5.4 Configurar secrets DEV
- [ ] Agregar 5 secrets DEV_* a GitHub (4 min)
  - DEV_SUPABASE_URL, DEV_SUPABASE_ANON_KEY
  - DEV_SUPABASE_SERVICE_ROLE_KEY, DEV_SUPABASE_PROJECT_ID
  - DEV_SUPABASE_DB_PASSWORD
  - Agent: **@agent-deploy-agent**
  - Test: Secrets visibles en Settings > Secrets

### 5.5 Configurar secrets TST
- [ ] Agregar 5 secrets TST_* (4 min)
  - Mismo formato que DEV
  - Valores de .env.tst
  - Agent: **@agent-deploy-agent**
  - Test: Secrets visibles

### 5.6 Configurar secrets PRD
- [ ] Agregar 5 secrets PRD_* (4 min)
  - Mismo formato que DEV
  - Valores de .env.prd
  - Agent: **@agent-deploy-agent**
  - Test: Secrets visibles

---

## FASE 6: VPS Deployment (30 min)

### 6.1 Backup .env actual en VPS
- [ ] Crear backups de configuración (3 min)
  - SSH: `ssh -i ~/.ssh/muva_deploy root@195.200.6.216`
  - Backup staging: `cp /var/www/muva-chat-staging/.env.local /var/www/muva-chat-staging/.env.local.backup`
  - Backup production: `cp /var/www/muva-chat/.env.local /var/www/muva-chat/.env.local.backup`
  - Agent: **@agent-deploy-agent**
  - Test: Archivos .backup existen

### 6.2 Actualizar .env staging (tst)
- [ ] Reemplazar credenciales en VPS staging (10 min)
  - Editar: `/var/www/muva-chat-staging/.env.local`
  - Usar valores de .env.tst local
  - Verificar URL: https://bddcvjoeoiekzfetvxoe.supabase.co
  - Agent: **@agent-deploy-agent**
  - Test: cat .env.local muestra project ID tst

### 6.3 Restart PM2 staging
- [ ] Reiniciar proceso staging (2 min)
  - `pm2 restart muva-staging`
  - `pm2 logs muva-staging --lines 50`
  - Agent: **@agent-deploy-agent**
  - Test: PM2 status "online", logs sin errores

### 6.4 Test health staging
- [ ] Verificar staging.muva.chat (5 min)
  - `curl https://staging.muva.chat/api/health`
  - Browser: login, chat guest
  - Agent: **@agent-deploy-agent**
  - Test: Health 200, login OK, chat funciona

### 6.5 Actualizar .env production (prd)
- [ ] Reemplazar credenciales en VPS production (5 min)
  - Editar: `/var/www/muva-chat/.env.local`
  - Usar valores de .env.prd local
  - Verificar URL: https://kprqghwdnaykxhostivv.supabase.co
  - Agent: **@agent-deploy-agent**
  - Test: cat .env.local muestra project ID prd

### 6.6 Restart PM2 production
- [ ] Reiniciar proceso production (2 min)
  - `pm2 restart muva-production`
  - `pm2 logs muva-production --lines 50`
  - Agent: **@agent-deploy-agent**
  - Test: PM2 status "online"

### 6.7 Test health production
- [ ] Verificar muva.chat (3 min)
  - `curl https://muva.chat/api/health`
  - Browser: login (nota: sin datos aún es esperado)
  - Agent: **@agent-deploy-agent**
  - Test: Health 200, login funcional

---

## FASE 7: Documentación (20 min)

### 7.1 Actualizar CLAUDE.md
- [ ] Update project IDs y comandos (5 min)
  - Sección "Ambiente de Desarrollo"
  - Cambiar: hoaiwcueleiemeplrurv → bddcvjoeoiekzfetvxoe
  - Cambiar: ooaumjzaztmutltifhoq → kprqghwdnaykxhostivv
  - Actualizar comandos: `dev:staging` → `dev:tst`
  - Agent: **Planner (manual)**
  - Test: grep no muestra IDs viejos en CLAUDE.md

### 7.2 Actualizar QUICK_REFERENCE.md
- [ ] Tabla de Supabase Project IDs (3 min)
  - Archivo: `docs/infrastructure/three-environments/QUICK_REFERENCE.md`
  - Líneas 190-196: actualizar tabla con nuevos IDs
  - Agent: **Planner (manual)**
  - Test: Tabla muestra IDs correctos

### 7.3 Actualizar README.md
- [ ] Diagrama y tabla environments (3 min)
  - Archivo: `docs/infrastructure/three-environments/README.md`
  - Actualizar ASCII diagram y tabla
  - Agent: **Planner (manual)**
  - Test: Diagrama correcto

### 7.4 Buscar y reemplazar IDs viejos
- [ ] Actualizar archivos de docs (5 min)
  - `grep -r "ooaumjzaztmutltifhoq" docs/ CLAUDE.md`
  - `grep -r "hoaiwcueleiemeplrurv" docs/ CLAUDE.md`
  - Reemplazar según contexto
  - Agent: **Planner (manual)**
  - Test: grep no retorna matches

### 7.5 Crear MIGRATION_NOTES.md
- [ ] Documentar proceso completo (2 min)
  - Crear: `docs/three-tier-unified/MIGRATION_NOTES.md`
  - Fecha, duración, problemas, soluciones
  - Archivos creados/modificados
  - Agent: **Planner (manual)**
  - Test: Archivo existe, log completo

### 7.6 Crear ROLLBACK_PLAN.md
- [ ] Procedimientos de rollback (2 min)
  - Crear: `docs/three-tier-unified/ROLLBACK_PLAN.md`
  - Pasos para revertir a config vieja
  - Comandos VPS, Git, etc.
  - Agent: **Planner (manual)**
  - Test: Procedimiento claro

---

## 📊 PROGRESO

**Total Tasks:** 32 (FASE 1 pre-completada)
**Completed:** 3/32 (9.4%)

**Por Fase:**
- FASE 0: 0/3 tareas (Preparación)
- FASE 1: 3/3 tareas ✅ COMPLETADA (GitHub ya sincronizado)
- FASE 2: 0/4 tareas (Data Migration)
- FASE 3: 0/3 tareas (Migrations a PRD)
- FASE 4: 0/6 tareas (Config Local)
- FASE 5: 0/6 tareas (GitHub Actions)
- FASE 6: 0/7 tareas (VPS Deployment)
- FASE 7: 0/6 tareas (Documentación)

---

## 📋 CHECKLIST VALIDACIÓN

### FASE 0 ✅
- [ ] Git working tree clean
- [ ] Backup SQL > 1MB creado
- [ ] MCP acceso a kprqghwdnaykxhostivv OK
- [ ] 3 branches visibles (main, dev, tst)

### FASE 1 ✅
- [ ] Rama dev sincronizada con staging
- [ ] Rama tst CREADA desde staging
- [ ] Rama prd CREADA desde staging
- [ ] 18 migrations en GitHub dev/tst/prd

### FASE 2 ✅
- [ ] Datos migrados a dev (row counts > 0)
- [ ] Datos migrados a tst (row counts ≈ dev)
- [ ] RPC functions ejecutan sin error
- [ ] 0 advisors críticos en dev/tst

### FASE 3 ✅
- [ ] 18 migrations aplicadas a main
- [ ] 43 tablas en main (igual que dev/tst)
- [ ] Tablas clave existen en main
- [ ] 0 advisors críticos en prd

### FASE 4 ✅
- [ ] .env.dev/tst/prd creados
- [ ] Scripts dev-tst.sh y dev-prd.sh creados
- [ ] localhost funciona con dev
- [ ] Health check localhost 200

### FASE 5 ✅
- [ ] deploy-tst.yml creado
- [ ] deploy-prd.yml creado
- [ ] validate-dev.yml actualizado
- [ ] 15 GitHub Secrets configurados

### FASE 6 ✅
- [ ] .env.local backups en VPS
- [ ] staging.muva.chat usa tst
- [ ] muva.chat usa prd
- [ ] PM2 online en ambos
- [ ] Health checks OK

### FASE 7 ✅
- [ ] CLAUDE.md sin IDs viejos
- [ ] QUICK_REFERENCE.md actualizado
- [ ] README.md actualizado
- [ ] 0 referencias a IDs viejos en docs
- [ ] MIGRATION_NOTES.md creado
- [ ] ROLLBACK_PLAN.md creado

---

**Última actualización:** 16 de Noviembre, 2025
**Próximo paso:** Ejecutar FASE 0 con workflow.md
**Status:** ✅ TODO sin ambigüedades - Listo para ejecución
