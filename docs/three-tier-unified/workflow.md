# WORKFLOW UNIFICADO - Three-Tier Migration

**Proyecto:** Migración a Modelo Three-Tier (dev/tst/prd)
**Archivos:** `plan.md` + `TODO.md` + este workflow
**Versión:** UNIFICADA - Sin ambigüedades

---

## 🎯 CONTEXTO (Usar al inicio de cada sesión)

```
PROYECTO: Three-Tier Migration de MUVA Chat

OBJETIVO: Migrar a modelo three-tier (dev/tst/prd)

🚨 FUENTES DE VERDAD (CRÍTICO):
1. CÓDIGO/MIGRATIONS: Rama Git 'staging' (18 migrations, commit 1875e09)
2. DATOS: Proyecto Supabase hoaiwcueleiemeplrurv (staging viejo)
   ⚠️ NO CONFUNDIR estas dos fuentes

ESTADO ACTUAL:
✅ GitHub: dev/tst/prd sincronizados (commit 1875e09, 18 migrations)
✅ Supabase dev/tst: 43 tablas, 0 datos, 18 migrations
❌ Supabase main: 0 tablas, 0 migrations
✅ Datos fuente: hoaiwcueleiemeplrurv (staging viejo)

ARQUITECTURA FINAL:
- dev → localhost + datos completos
- tst → staging.muva.chat + datos completos
- prd → muva.chat (schema sin datos)

FASES PENDIENTES:
- FASE 0: ✅ YA COMPLETADA Preparación (10 min)
- FASE 1: ✅ YA COMPLETADA - Saltar a FASE 2
- FASE 2-7: Ejecutar según workflow.md

Confirma que entiendes antes de continuar.
```

---

## FASE 0: Preparación (10 min)

### Prompt 0.1: Preparación Completa

**Agente:** Planner (manual) + **@agent-database-agent** (backup)

**PREREQUISITO:** Inicio del proyecto

---

🔽 **COPIAR DESDE AQUÍ (Prompt 0.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 0/32 (0%) - FASE 1 ya completada

FASE 0 - Preparación (Progreso: 0/3)
- [ ] 0.1: Commit pending changes ← ESTAMOS AQUÍ
- [ ] 0.2: Backup staging viejo
- [ ] 0.3: Verificar acceso MCP

**Estado Actual:**
- Rama staging con cambios pendientes
- Listo para preparación

---

**Tareas:**

1. **Commit pending changes** (3 min):
   - `git status`
   - `git add .`
   - `git commit -m "chore: preparar migración three-tier"`
   - Verificar: `git status` → "working tree clean"

2. **Backup staging viejo** (5 min):
   - Usar `mcp__supabase__execute_sql` para crear backup de hoaiwcueleiemeplrurv
   - Guardar en: `docs/three-tier-unified/backups/staging-20251116.sql`
   - Verificar tamaño > 1MB

3. **Verificar acceso MCP** (2 min):
   - `mcp__supabase__get_project` con kprqghwdnaykxhostivv
   - `mcp__supabase__list_branches`
   - Confirmar: 3 branches (main, dev, tst) ACTIVE_HEALTHY

**Entregables:**
- ✅ Working tree clean
- ✅ Backup SQL creado
- ✅ Acceso MCP confirmado

**Criterios de Éxito:**
- ✅ `git status` → "working tree clean"
- ✅ Backup SQL > 1MB
- ✅ MCP retorna 3 branches

---

**🔍 Verificación Post-Ejecución:**

"¿Consideras satisfactoria la ejecución del Prompt 0.1 (Preparación)?
- Working tree clean ✓
- Backup SQL creado ✓
- Acceso MCP confirmado ✓"

**Si "Sí":**

1. Actualizar TODO.md - Marcar 0.1, 0.2, 0.3 como [x]
2. Actualizar contador: **Completed:** 3/33 (9.1%)
3. Informar:

"✅ FASE 0 COMPLETADA

**Progreso:** 3/32 (9.4%)

**Siguiente paso:** FASE 2 - Migrar Datos (FASE 1 ya completada)
Prompt 2.1 (30 min)
Ver workflow.md línea 150"

**Si "No":**
- Preguntar qué ajustar
- NO marcar completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 0.1)**

---

## FASE 1: Verificar GitHub ✅ (OPCIONAL - YA COMPLETADA)

**Estado:** ✅ YA COMPLETADO - Saltar a FASE 2

### Verificación Realizada (16/Nov/2025)

- ✅ origin/dev: commit 1875e09, 19 migrations
- ✅ origin/tst: commit 1875e09, 19 migrations
- ✅ origin/prd: commit 1875e09, 19 migrations

**Progreso:** 3/32 tareas completadas (9.4%)

---

**RECOMENDACIÓN:** Saltar directamente a FASE 2 (Prompt 2.1)

---

## FASE 2: Migrar Datos (30 min)

### Prompt 2.1: Data Migration Completa

**Agente:** **@agent-database-agent**

**PREREQUISITO:** Prompt 1.1 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 2.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 3/32 (9.4%)

FASE 0: ✅ COMPLETADA (3/3)
FASE 1: ✅ PRE-COMPLETADA (ramas ya sincronizadas)

FASE 2 - Data Migration (Progreso: 0/4)
- [ ] 2.1: Exportar datos ← ESTAMOS AQUÍ
- [ ] 2.2: Importar a dev
- [ ] 2.3: Importar a tst
- [ ] 2.4: Validar RPC/RLS

**Estado Actual:**
- dev/tst tienen 43 tablas ✓
- Datos: 0 en ambos
- Fuente: hoaiwcueleiemeplrurv

**DECISIÓN:** Copia COMPLETA a dev y tst (mismo dataset).

---

**Tareas:**

1. **Exportar datos** (10 min):
   - pg_dump de hoaiwcueleiemeplrurv (TODAS las tablas)
   - Guardar: `docs/three-tier-unified/backups/data-export.sql`
   - Test: Archivo > 5MB

2. **Importar a dev** (10 min):
   - Restaurar en azytxnyiizldljxrapoe
   - `mcp__supabase__execute_sql` con INSERT
   - Test: `SELECT COUNT(*) FROM tenant_registry` > 0

3. **Importar a tst** (5 min):
   - Restaurar en bddcvjoeoiekzfetvxoe
   - Test: Row counts tst ≈ dev (±5%)

4. **Validar RPC/RLS** (5 min):
   - Dev: `SELECT get_accommodation_units() LIMIT 5`
   - Tst: `SELECT get_accommodation_units() LIMIT 5`
   - `SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'` >= 10
   - `mcp__supabase__get_advisors` (security) en dev/tst

**Entregables:**
- ✅ Datos en dev
- ✅ Datos en tst
- ✅ RPC OK
- ✅ RLS OK

**Criterios de Éxito:**
- ✅ Row counts dev/tst ±5% fuente
- ✅ RPC sin error search_path
- ✅ >= 10 policies
- ✅ 0 advisors críticos

---

**🔍 Verificación:**

"¿Satisfactorio Prompt 2.1 (Data Migration)?
- Datos en dev ✓
- Datos en tst ✓
- RPC/RLS OK ✓"

**Si "Sí":**

Marcar 2.1-2.4 → **Completed:** 11/33 (33.3%)

"✅ FASE 2 COMPLETADA

**Progreso:** 11/33 (33.3%)

**Siguiente:** FASE 3 - Migrations Main
Prompt 3.1 (15 min)
Línea 500"

🔼 **COPIAR HASTA AQUÍ (Prompt 2.1)**

---

## FASE 3: Migrations a MAIN (15 min)

### Prompt 3.1: Aplicar Migrations a PRD

**Agente:** **@agent-database-agent**

**PREREQUISITO:** Prompt 2.1 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 3.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 11/33 (33.3%)

FASE 0, 1, 2: ✅ COMPLETADAS (11/11)

FASE 3 - Migrations PRD (Progreso: 0/3)
- [ ] 3.1: Listar migrations ← ESTAMOS AQUÍ
- [ ] 3.2: Aplicar a main
- [ ] 3.3: Validar schema

**Estado Actual:**
- main tiene 0 migrations
- dev/tst tienen 18
- Listo para aplicar

---

**Tareas:**

1. **Listar migrations** (2 min):
   - Leer: `supabase/migrations/*.sql`
   - Ordenar por timestamp
   - Confirmar: 18 archivos

2. **Aplicar a main** (12 min):
   - Para cada migration:
     ```
     mcp__supabase__apply_migration
       project_id: kprqghwdnaykxhostivv
       name: <filename sin .sql>
       query: <contenido>
     ```
   - Documentar: `docs/three-tier-unified/logs/migrations-prd.md`

3. **Validar schema** (1 min):
   - `mcp__supabase__list_migrations` → 18
   - `mcp__supabase__list_tables` → 43 tablas
   - Comparar con dev/tst

**Entregables:**
- ✅ 18 migrations en main
- ✅ 43 tablas en main
- ✅ Schema idéntico

**Criterios de Éxito:**
- ✅ list_migrations → 18
- ✅ list_tables → 43
- ✅ tenant_registry existe
- ✅ 0 advisors críticos

---

**🔍 Verificación:**

"¿Satisfactorio Prompt 3.1 (Migrations PRD)?
- 18 migrations ✓
- 43 tablas ✓
- Schema idéntico ✓"

**Si "Sí":**

Marcar 3.1-3.3 → **Completed:** 14/33 (42.4%)

"✅ FASE 3 COMPLETADA

**Progreso:** 14/33 (42.4%)

**Siguiente:** FASE 4 - Config Local
Prompt 4.1 (20 min)
Línea 650"

🔼 **COPIAR HASTA AQUÍ (Prompt 3.1)**

---

## FASE 4: Config Local (20 min)

### Prompt 4.1: Archivos .env y Scripts

**Agente:** **@agent-backend-developer**

**PREREQUISITO:** Prompt 3.1 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 4.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 14/33 (42.4%)

FASE 0-3: ✅ COMPLETADAS (14/14)

FASE 4 - Config Local (Progreso: 0/6)
- [ ] 4.1: Obtener credentials ← AQUÍ
- [ ] 4.2: Crear .env.dev
- [ ] 4.3: Crear .env.tst
- [ ] 4.4: Crear .env.prd
- [ ] 4.5: Script dev-tst.sh
- [ ] 4.6: Script dev-prd.sh

---

**Tareas:**

1. **Obtener credentials** (5 min):
   - `mcp__supabase__get_publishable_keys` para:
     - azytxnyiizldljxrapoe
     - bddcvjoeoiekzfetvxoe
     - kprqghwdnaykxhostivv
   - Extraer: ANON_KEY, SERVICE_ROLE_KEY

2. **Crear .env.dev** (3 min):
   ```bash
   # DEV - localhost
   NEXT_PUBLIC_SUPABASE_URL=https://azytxnyiizldljxrapoe.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev_anon>
   SUPABASE_SERVICE_ROLE_KEY=<dev_service>
   SUPABASE_PROJECT_ID=azytxnyiizldljxrapoe
   ```

3. **Crear .env.tst** (3 min):
   - Project ID: bddcvjoeoiekzfetvxoe
   - Comentario: `# TST - staging.muva.chat`

4. **Crear .env.prd** (3 min):
   - Project ID: kprqghwdnaykxhostivv
   - Comentario: `# PRD - muva.chat`

5. **Script dev-tst.sh** (3 min):
   - Copiar: `scripts/deploy/dev-staging.sh` → `dev-tst.sh`
   - Cambiar: `source .env.staging` → `source .env.tst`

6. **Script dev-prd.sh** (3 min):
   - Copiar: `scripts/deploy/dev-production.sh` → `dev-prd.sh`
   - Cambiar: `source .env.production` → `source .env.prd`

**Entregables:**
- ✅ 3 archivos .env
- ✅ 2 scripts
- ✅ localhost funcional

**Criterios de Éxito:**
- ✅ .env files con project IDs correctos
- ✅ Scripts ejecutan sin errores
- ✅ `curl http://localhost:3001/api/health` → 200

---

**🔍 Verificación:**

"¿Satisfactorio Prompt 4.1 (Config Local)?
- 3 .env creados ✓
- 2 scripts creados ✓
- localhost OK ✓"

**Si "Sí":**

Marcar 4.1-4.6 → **Completed:** 20/33 (60.6%)

"✅ FASE 4 COMPLETADA

**Progreso:** 20/33 (60.6%)

**Siguiente:** FASE 5 - GitHub Actions
Prompt 5.1 (30 min)
Línea 830"

🔼 **COPIAR HASTA AQUÍ (Prompt 4.1)**

---

## FASE 5: GitHub Actions (30 min)

### Prompt 5.1: Workflows y Secrets

**Agente:** **@agent-deploy-agent**

**PREREQUISITO:** Prompt 4.1 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 5.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 20/33 (60.6%)

FASE 0-4: ✅ COMPLETADAS (20/20)

FASE 5 - GitHub Actions (Progreso: 0/6)
- [ ] 5.1: deploy-tst.yml ← AQUÍ
- [ ] 5.2: deploy-prd.yml
- [ ] 5.3: validate-dev.yml
- [ ] 5.4-5.6: Secrets

---

**Tareas:**

1. **Crear deploy-tst.yml** (10 min):
   - Copiar: `.github/workflows/deploy-staging.yml` → `deploy-tst.yml`
   - Cambiar trigger: `push: branches: [tst]`
   - Cambiar secrets: `STAGING_*` → `TST_*`

2. **Crear deploy-prd.yml** (5 min):
   - Copiar: `deploy-production.yml` → `deploy-prd.yml`
   - Trigger: `push: branches: [prd]`
   - Secrets: `PROD_*` → `PRD_*`

3. **Update validate-dev.yml** (3 min):
   - Cambiar project ID: azytxnyiizldljxrapoe

4. **Secrets DEV** (4 min):
   - DEV_SUPABASE_URL, DEV_SUPABASE_ANON_KEY
   - DEV_SUPABASE_SERVICE_ROLE_KEY, DEV_SUPABASE_PROJECT_ID
   - DEV_SUPABASE_DB_PASSWORD

5. **Secrets TST** (4 min):
   - TST_* (mismo formato)

6. **Secrets PRD** (4 min):
   - PRD_* (mismo formato)

**Entregables:**
- ✅ 3 workflows
- ✅ 15 secrets

**Criterios de Éxito:**
- ✅ Syntax válido
- ✅ 15 secrets visibles
- ✅ validate-dev ejecuta

---

**🔍 Verificación:**

"¿Satisfactorio Prompt 5.1 (GitHub Actions)?
- Workflows creados ✓
- 15 secrets ✓"

**Si "Sí":**

Marcar 5.1-5.6 → **Completed:** 26/33 (78.8%)

"✅ FASE 5 COMPLETADA

**Progreso:** 26/33 (78.8%)

**Siguiente:** FASE 6 - VPS
Prompt 6.1 (30 min)
Línea 1000"

🔼 **COPIAR HASTA AQUÍ (Prompt 5.1)**

---

## FASE 6: VPS Deployment (30 min)

### Prompt 6.1: VPS Configuration

**Agente:** **@agent-deploy-agent**

**PREREQUISITO:** Prompt 5.1 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 26/33 (78.8%)

FASE 0-5: ✅ COMPLETADAS (26/26)

FASE 6 - VPS (Progreso: 0/7)
- [ ] 6.1: Backup .env ← AQUÍ
- [ ] 6.2-6.4: Staging
- [ ] 6.5-6.7: Production

---

**Tareas:**

1. **Backup** (3 min):
   - SSH: `ssh -i ~/.ssh/muva_deploy root@195.200.6.216`
   - `cp /var/www/muva-chat-staging/.env.local /var/www/muva-chat-staging/.env.local.backup`
   - `cp /var/www/muva-chat/.env.local /var/www/muva-chat/.env.local.backup`

2. **Update staging → tst** (10 min):
   - Editar: `/var/www/muva-chat-staging/.env.local`
   - Usar valores .env.tst
   - URL: https://bddcvjoeoiekzfetvxoe.supabase.co

3. **Restart staging** (2 min):
   - `pm2 restart muva-staging`
   - `pm2 logs muva-staging --lines 50`

4. **Test staging** (5 min):
   - `curl https://staging.muva.chat/api/health`
   - Browser: login, chat

5. **Update production → prd** (5 min):
   - Editar: `/var/www/muva-chat/.env.local`
   - Usar valores .env.prd
   - URL: https://kprqghwdnaykxhostivv.supabase.co

6. **Restart production** (2 min):
   - `pm2 restart muva-production`
   - `pm2 logs muva-production --lines 50`

7. **Test production** (3 min):
   - `curl https://muva.chat/api/health`
   - Browser: login (sin datos OK)

**Entregables:**
- ✅ Backups
- ✅ staging en tst
- ✅ production en prd
- ✅ Health OK

**Criterios:**
- ✅ PM2 online
- ✅ Health 200
- ✅ Login funcional

---

**🔍 Verificación:**

"¿Satisfactorio Prompt 6.1 (VPS)?
- Backups ✓
- staging en tst ✓
- production en prd ✓
- Health OK ✓"

**Si "Sí":**

Marcar 6.1-6.7 → **Completed:** 33/33 (100%)

"✅ FASE 6 COMPLETADA

**Progreso:** 33/33 (100%)

🎉 MIGRACIÓN COMPLETADA

**Siguiente:** Documentación (opcional)
FASE 7 si deseas actualizar docs"

🔼 **COPIAR HASTA AQUÍ (Prompt 6.1)**

---

## FASE 7: Documentación (OPCIONAL - 20 min)

### Prompt 7.1: Actualizar Docs

**Agente:** Planner (manual)

**PREREQUISITO:** Prompt 6.1 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 7.1)**

**Tareas:**

1. **CLAUDE.md** (5 min):
   - Sección "Ambiente de Desarrollo"
   - Reemplazar IDs viejos

2. **QUICK_REFERENCE.md** (3 min):
   - Tabla Supabase Project IDs

3. **README.md** (3 min):
   - Diagrama y tabla

4. **Buscar IDs viejos** (5 min):
   - `grep -r "iyeueszchbvlutlcmvcb" docs/`
   - Reemplazar

5. **MIGRATION_NOTES.md** (2 min):
   - Crear log completo

6. **ROLLBACK_PLAN.md** (2 min):
   - Procedimientos rollback

🔼 **COPIAR HASTA AQUÍ (Prompt 7.1)**

---

## 📋 RESUMEN

**Prompts Totales:** 7 (FASE 1 opcional)
**Tareas Totales:** 32 (FASE 1 pre-completada)
**Tiempo Total:** 2h 40min

**Agentes:**
- @agent-database-agent: FASE 2, 3 (45min)
- @agent-backend-developer: FASE 4 (20min)
- @agent-deploy-agent: FASE 5, 6 (60min)
- Planner: FASE 0, 1, 7 (50min)

---

**Última Actualización:** 16 de Noviembre, 2025
**Status:** ✅ Workflow unificado sin ambigüedades
**Listo para:** Ejecución inmediata
