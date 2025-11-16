# Three-Tier Migration - Plan Unificado

**Proyecto:** Migración a Modelo Three-Tier (dev/tst/prd)
**Fecha:** 16 de Noviembre, 2025
**Versión:** UNIFICADA (sin ambigüedades)
**Estado:** 📋 Listo para Ejecución

---

## 🎯 OBJETIVO

Migrar de la configuración actual desordenada a un modelo limpio **three-tier** con correspondencia 1:1 entre ramas Git y proyectos/ramas Supabase.

### Arquitectura Final

```
┌─────────────────────────────────────────────────────────────┐
│              MUVA CHAT - THREE-TIER MODEL                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GIT BRANCH          SUPABASE BRANCH          DEPLOYMENT    │
│                                                             │
│  dev (GitHub)  ───→  dev                  ──→ localhost     │
│  18 migrations       azytxnyiizldljxrapoe     :3001         │
│  (ya existe ✅)      43 tablas + datos ✅                   │
│                                                             │
│  tst (GitHub)  ───→  tst                  ──→ VPS          │
│  18 migrations       bddcvjoeoiekzfetvxoe     staging.      │
│  (ya existe ✅)      43 tablas + datos ✅     muva.chat     │
│                                                             │
│  prd (GitHub)  ───→  main                 ──→ VPS          │
│  18 migrations       kprqghwdnaykxhostivv     muva.chat     │
│  (ya existe ✅)      43 tablas (sin datos)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚨 FUENTES DE VERDAD (CRÍTICO)

### ⚠️ DOS FUENTES DIFERENTES - NO CONFUNDIR

#### 1. CÓDIGO/MIGRATIONS → Rama Git `staging`
- **Fuente:** Rama `staging` (GitHub)
- **Qué contiene:** 18 migrations, código fuente, configuración
- **Estado:** Commit 1875e09 - ESTA ES LA FUENTE DE VERDAD PARA CÓDIGO
- **Uso:** Base para sincronizar dev/tst/prd

#### 2. DATOS → Proyecto Supabase `hoaiwcueleiemeplrurv`
- **Fuente:** Proyecto Supabase hoaiwcueleiemeplrurv (staging viejo)
- **Qué contiene:** Datos reales (tenants, accommodations, conversations, embeddings)
- **Estado:** ACTIVO - ESTA ES LA FUENTE DE VERDAD PARA DATOS
- **Uso:** Base para copiar datos a dev/tst en FASE 2

**REGLA CRÍTICA:**
- ✅ Código/migrations SIEMPRE desde rama `staging` (GitHub)
- ✅ Datos SIEMPRE desde proyecto `hoaiwcueleiemeplrurv` (Supabase)
- ❌ NUNCA confundir estas dos fuentes

---

## 📊 ESTADO ACTUAL VERIFICADO

### Supabase Projects (Nuevo - MUVA v1.0)

| Branch | Project Ref | Tablas | Datos | Migrations |
|--------|-------------|--------|-------|------------|
| **dev** | azytxnyiizldljxrapoe | 43 ✅ | 0 ❌ | 18 ✅ |
| **tst** | bddcvjoeoiekzfetvxoe | 43 ✅ | 0 ❌ | 18 ✅ |
| **main** | kprqghwdnaykxhostivv | 0 ❌ | 0 ❌ | 0 ❌ |

**Conclusión validada:** dev/tst tienen schema completo pero **SIN DATOS**.

### GitHub Branches

| Branch | Estado | Migrations | Existe Remotamente |
|--------|--------|------------|-------------------|
| **staging** | Fuente de verdad | 18 ✅ | ✅ origin/staging |
| **dev** | Sincronizado | 18 ✅ | ✅ origin/dev |
| **tst** | Sincronizado | 18 ✅ | ✅ origin/tst |
| **prd** | Sincronizado | 18 ✅ | ✅ origin/prd |

**Conclusión validada:** Todas las ramas existen y están sincronizadas con commit **1875e09**.

### Proyecto Viejo (Fuente de Datos)

| Ambiente | Project Ref | Estado |
|----------|-------------|--------|
| **staging** | hoaiwcueleiemeplrurv | **Datos completos** - Fuente |
| **production** | ooaumjzaztmutltifhoq | En uso - Se mantiene |

---

## 🚀 FASES DE EJECUCIÓN

### Resumen de Tiempos

| Fase | Descripción | Tiempo | Agente |
|------|-------------|--------|--------|
| FASE 0 | Preparación | 10 min | Planner + database-agent |
| FASE 1 | Verificar GitHub (SKIP) | 5 min | Planner |
| FASE 2 | Migrar Datos | 30 min | database-agent |
| FASE 3 | Aplicar Migrations a MAIN | 15 min | database-agent |
| FASE 4 | Config Local | 20 min | backend-developer |
| FASE 5 | GitHub Actions | 30 min | deploy-agent |
| FASE 6 | VPS Deployment | 30 min | deploy-agent |
| FASE 7 | Documentación | 20 min | Planner |

**TOTAL:** 2h 40min (FASE 1 opcional - ya completada)

---

## FASE 0: Preparación (10 min)

### Objetivo
Preparar entorno: commit pendientes, backup, verificación acceso.

### Tareas

1. **Commit pending changes** (3 min)
   - `git status` para ver cambios
   - `git add .`
   - `git commit -m "chore: preparar migración three-tier"`
   - Verificar: `git status` → "working tree clean"

2. **Backup staging viejo** (5 min)
   - Crear SQL backup de hoaiwcueleiemeplrurv
   - Guardar en: `docs/three-tier-unified/backups/staging-20251116.sql`
   - Verificar tamaño > 1MB

3. **Verificar acceso MCP** (2 min)
   - `mcp__supabase__get_project` con kprqghwdnaykxhostivv
   - `mcp__supabase__list_branches`
   - Confirmar: 3 branches (main, dev, tst)

### Entregables
- ✅ Working tree clean
- ✅ Backup SQL creado
- ✅ Acceso MCP verificado

### Criterios de Éxito
- `git status` → "working tree clean"
- Backup SQL > 1MB
- MCP retorna 3 branches ACTIVE_HEALTHY

---

## FASE 1: Verificar GitHub Branches ✅ (5 min) - OPCIONAL

### Objetivo
**ESTA FASE SE PUEDE SALTAR** - Las ramas ya existen y están sincronizadas.

### Estado Verificado
- ✅ **origin/dev**: commit 1875e09, 19 migrations
- ✅ **origin/tst**: commit 1875e09, 19 migrations
- ✅ **origin/prd**: commit 1875e09, 19 migrations
- ✅ Todas sincronizadas con staging

### Tareas (Solo si quieres re-verificar)

1. **Verificar ramas remotas** (2 min)
   - `git fetch --all`
   - `git branch -r | grep -E "(dev|tst|prd)"`
   - Confirmar: origin/dev, origin/tst, origin/prd existen

2. **Verificar commits** (2 min)
   - `git log origin/dev --oneline -1`
   - `git log origin/tst --oneline -1`
   - `git log origin/prd --oneline -1`
   - Confirmar: Todas muestran commit 1875e09

3. **Verificar migrations** (1 min)
   - `git ls-tree origin/tst -- supabase/migrations/ | wc -l`
   - `git ls-tree origin/prd -- supabase/migrations/ | wc -l`
   - Confirmar: Ambas muestran 19

### Entregables
- ✅ **YA COMPLETADO** - Ramas existen y están sincronizadas

### Criterios de Éxito
- ✅ **YA CUMPLIDOS** - Verificado el 16/Nov/2025
- ✅ 3 ramas remotas existen
- ✅ Todas en commit 1875e09
- ✅ 19 migrations en cada una

**RECOMENDACIÓN:** Saltar a FASE 2 directamente.

---

## FASE 2: Migrar Datos (30 min)

### Objetivo
Copiar datos completos desde hoaiwcueleiemeplrurv a dev y tst.

### Decisiones Tomadas (Sin Ambigüedad)

1. **Datos para DEV:** Copia completa de staging viejo
2. **Datos para TST:** Copia completa de staging viejo (mismo que dev)
3. **Datos para PRD:** Sin datos en esta migración (se agregan post-migración)

### Tareas

1. **Exportar datos de staging viejo** (10 min)
   - Método: pg_dump de hoaiwcueleiemeplrurv
   - Prioridad: TODAS las tablas
   - Guardar: `docs/three-tier-unified/backups/data-export.sql`

2. **Importar datos a dev** (10 min)
   - Restaurar dump en azytxnyiizldljxrapoe
   - Usar `mcp__supabase__execute_sql` con INSERT statements
   - Validar: `SELECT COUNT(*) FROM tenant_registry` > 0

3. **Importar datos a tst** (5 min)
   - Restaurar mismo dump en bddcvjoeoiekzfetvxoe
   - Verificar row counts ≈ dev

4. **Validar RPC/RLS** (5 min)
   - Ejecutar: `SELECT get_accommodation_units() LIMIT 5` en dev/tst
   - Ejecutar: `SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'`
   - Verificar: >= 10 policies activas
   - Ejecutar: `mcp__supabase__get_advisors` (security) en dev/tst

### Entregables
- ✅ Datos completos en dev (row counts > 0)
- ✅ Datos completos en tst (row counts ≈ dev)
- ✅ RPC functions ejecutan sin error
- ✅ >= 10 RLS policies activas
- ✅ 0 advisors críticos

### Criterios de Éxito
- Row counts dev/tst ±5% de fuente
- `tenant_registry`, `accommodation_units`, `chat_conversations` tienen datos
- RPC ejecuta sin error de search_path
- 0 advisors de seguridad críticos

---

## FASE 3: Aplicar Migrations a MAIN (15 min)

### Objetivo
Aplicar las 18 migrations a main (prd) que actualmente tiene 0.

### Tareas

1. **Leer migrations** (2 min)
   - Listar: `supabase/migrations/*.sql` (18 archivos)
   - Ordenar por timestamp

2. **Aplicar migrations a main** (12 min)
   - Para cada migration:
     ```
     mcp__supabase__apply_migration
       project_id: kprqghwdnaykxhostivv
       name: <filename sin .sql>
       query: <contenido archivo>
     ```
   - Documentar en: `docs/three-tier-unified/logs/migrations-prd.md`

3. **Validar schema main** (1 min)
   - `mcp__supabase__list_migrations` → confirmar 18
   - `mcp__supabase__list_tables` → confirmar 43 tablas
   - Comparar con dev/tst (debe ser idéntico)

### Entregables
- ✅ 18 migrations aplicadas a main
- ✅ 43 tablas en main (mismo que dev/tst)
- ✅ Schema idéntico en dev/tst/prd

### Criterios de Éxito
- `list_migrations` muestra 18 en kprqghwdnaykxhostivv
- `list_tables` muestra 43 tablas
- Tablas clave existen: tenant_registry, accommodation_units_public
- 0 advisors críticos

---

## FASE 4: Configuración Local (20 min)

### Objetivo
Crear archivos .env y actualizar scripts de deploy.

### Tareas

1. **Obtener credenciales** (5 min)
   - `mcp__supabase__get_publishable_keys` para:
     - azytxnyiizldljxrapoe (dev)
     - bddcvjoeoiekzfetvxoe (tst)
     - kprqghwdnaykxhostivv (prd)
   - Extraer: ANON_KEY, SERVICE_ROLE_KEY

2. **Crear .env.dev** (3 min)
   ```bash
   # DEV Environment - Local Development
   NEXT_PUBLIC_SUPABASE_URL=https://azytxnyiizldljxrapoe.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev_anon>
   SUPABASE_SERVICE_ROLE_KEY=<dev_service>
   SUPABASE_PROJECT_ID=azytxnyiizldljxrapoe
   ```

3. **Crear .env.tst** (3 min)
   - Mismo formato, project ID: bddcvjoeoiekzfetvxoe
   - Comentario: `# TST Environment - staging.muva.chat`

4. **Crear .env.prd** (3 min)
   - Mismo formato, project ID: kprqghwdnaykxhostivv
   - Comentario: `# PRD Environment - muva.chat`

5. **Crear script dev-tst.sh** (3 min)
   - Copiar `scripts/deploy/dev-staging.sh` → `dev-tst.sh`
   - Cambiar: `source .env.staging` → `source .env.tst`

6. **Crear script dev-prd.sh** (3 min)
   - Copiar `scripts/deploy/dev-production.sh` → `dev-prd.sh`
   - Cambiar: `source .env.production` → `source .env.prd`

### Entregables
- ✅ .env.dev, .env.tst, .env.prd creados
- ✅ dev-tst.sh, dev-prd.sh creados
- ✅ localhost funcional con .env.dev

### Criterios de Éxito
- 3 archivos .env existen con project IDs correctos
- Scripts ejecutan sin errores
- `curl http://localhost:3001/api/health` retorna 200

---

## FASE 5: GitHub Actions (30 min)

### Objetivo
Actualizar workflows para three-tier y configurar secrets.

### Tareas

1. **Crear deploy-tst.yml** (10 min)
   - Leer: `.github/workflows/deploy-staging.yml`
   - Copiar a: `.github/workflows/deploy-tst.yml`
   - Cambiar trigger: `push: branches: [tst]`
   - Cambiar secrets: `STAGING_*` → `TST_*`

2. **Crear deploy-prd.yml** (5 min)
   - Leer: `.github/workflows/deploy-production.yml`
   - Copiar a: `.github/workflows/deploy-prd.yml`
   - Cambiar trigger: `push: branches: [prd]`
   - Cambiar secrets: `PROD_*` → `PRD_*`

3. **Actualizar validate-dev.yml** (3 min)
   - Modificar: `.github/workflows/validate-dev.yml`
   - Cambiar project ID a: azytxnyiizldljxrapoe

4. **Configurar 15 GitHub Secrets** (12 min)
   - **DEV_*** (5 secrets): URL, ANON_KEY, SERVICE_ROLE_KEY, PROJECT_ID, DB_PASSWORD
   - **TST_*** (5 secrets): Same structure
   - **PRD_*** (5 secrets): Same structure
   - Valores desde .env.dev, .env.tst, .env.prd

### Entregables
- ✅ deploy-tst.yml, deploy-prd.yml creados
- ✅ validate-dev.yml actualizado
- ✅ 15 GitHub Secrets configurados

### Criterios de Éxito
- Workflows syntax válido (sin errores en Actions)
- 15 secrets visibles en Settings > Secrets
- Push a dev → validate-dev.yml ejecuta

---

## FASE 6: VPS Deployment (30 min)

### Objetivo
Configurar VPS para usar tst y prd.

### Tareas

1. **Backup .env actual** (3 min)
   - SSH: `ssh -i ~/.ssh/muva_deploy root@195.200.6.216`
   - `cp /var/www/muva-chat-staging/.env.local /var/www/muva-chat-staging/.env.local.backup`
   - `cp /var/www/muva-chat/.env.local /var/www/muva-chat/.env.local.backup`

2. **Actualizar staging → tst** (10 min)
   - Editar: `/var/www/muva-chat-staging/.env.local`
   - Reemplazar con contenido de .env.tst
   - Verificar URL: https://bddcvjoeoiekzfetvxoe.supabase.co

3. **Restart PM2 staging** (2 min)
   - `pm2 restart muva-staging`
   - `pm2 logs muva-staging --lines 50`

4. **Test staging** (5 min)
   - `curl https://staging.muva.chat/api/health`
   - Browser: login, chat guest

5. **Actualizar production → prd** (5 min)
   - Editar: `/var/www/muva-chat/.env.local`
   - Reemplazar con contenido de .env.prd
   - Verificar URL: https://kprqghwdnaykxhostivv.supabase.co

6. **Restart PM2 production** (2 min)
   - `pm2 restart muva-production`
   - `pm2 logs muva-production --lines 50`

7. **Test production** (3 min)
   - `curl https://muva.chat/api/health`
   - Browser: login (nota: sin datos aún)

### Entregables
- ✅ Backups creados
- ✅ staging.muva.chat usando tst
- ✅ muva.chat usando prd
- ✅ Health checks OK

### Criterios de Éxito
- PM2 status "online" para ambos
- Health check 200 en staging y production
- staging.muva.chat: login y chat funcional
- muva.chat: login funcional (sin datos es esperado)

---

## FASE 7: Documentación (20 min)

### Objetivo
Actualizar documentación y validar sistema.

### Tareas

1. **Actualizar CLAUDE.md** (5 min)
   - Sección "Ambiente de Desarrollo"
   - Cambiar:
     - `localhost:3001 → DEV (azytxnyiizldljxrapoe)`
     - `hoaiwcueleiemeplrurv → TST (bddcvjoeoiekzfetvxoe)`
     - `ooaumjzaztmutltifhoq → PRD (kprqghwdnaykxhostivv)`
   - Actualizar comandos: `dev:staging → dev:tst`, `dev:production → dev:prd`

2. **Actualizar QUICK_REFERENCE.md** (3 min)
   - Archivo: `docs/infrastructure/three-environments/QUICK_REFERENCE.md`
   - Tabla Supabase Project IDs (líneas 190-196)

3. **Actualizar README.md** (3 min)
   - Archivo: `docs/infrastructure/three-environments/README.md`
   - Diagrama ASCII y tabla environments

4. **Buscar/reemplazar IDs viejos** (5 min)
   - `grep -r "ooaumjzaztmutltifhoq" docs/ CLAUDE.md`
   - `grep -r "hoaiwcueleiemeplrurv" docs/ CLAUDE.md`
   - Reemplazar según contexto

5. **Crear MIGRATION_NOTES.md** (2 min)
   - Crear: `docs/three-tier-unified/MIGRATION_NOTES.md`
   - Fecha, duración, problemas, soluciones

6. **Crear ROLLBACK_PLAN.md** (2 min)
   - Crear: `docs/three-tier-unified/ROLLBACK_PLAN.md`
   - Procedimientos de rollback (VPS, Git, Secrets)

### Entregables
- ✅ CLAUDE.md sin IDs viejos
- ✅ 36+ archivos docs actualizados
- ✅ MIGRATION_NOTES.md creado
- ✅ ROLLBACK_PLAN.md creado

### Criterios de Éxito
- `grep -r "ooaumjzaztmutltifhoq" docs/` → 0 matches
- CLAUDE.md refleja arquitectura three-tier
- Testing E2E completo:
  - dev (localhost): chat funcional
  - tst (staging.muva.chat): login + chat
  - prd (muva.chat): login OK (sin datos esperado)

---

## ✅ CRITERIOS DE ÉXITO GLOBAL

### Funcionalidad
- ✅ GitHub: dev/tst/prd con 18 migrations
- ✅ Supabase dev/tst con datos completos
- ✅ Supabase prd con schema (sin datos)
- ✅ Schema idéntico en dev/tst/prd (43 tablas)
- ✅ RPC functions validadas
- ✅ VPS operativo en staging y production

### Performance
- ✅ Sync GitHub < 20 min
- ✅ Data migration < 30 min
- ✅ Zero downtime (proyecto viejo disponible)
- ✅ Health checks < 500ms

### Documentación
- ✅ 0 IDs viejos en documentación
- ✅ Scripts actualizados
- ✅ Migration log completo
- ✅ Rollback plan documentado

---

## 📌 DECISIONES TOMADAS (Sin Ambigüedad)

### 1. Ramas GitHub tst/prd
**Decisión:** ✅ YA EXISTEN - Creadas previamente y sincronizadas con staging (commit 1875e09).

### 2. Datos en TST
**Decisión:** Copia completa de staging viejo (mismo que dev).

### 3. Datos en PRD
**Decisión:** Sin datos en esta migración. Se copiarán manualmente post-migración en operación separada.

### 4. Proyecto Viejo
**Decisión:** Se mantiene indefinidamente como backup. NO se elimina.

### 5. Método de Migración de Datos
**Decisión:** pg_dump + restore vía `mcp__supabase__execute_sql`.

---

## 🚨 NOTAS IMPORTANTES

### Estado de Producción
⚠️ **PRD lanzará SIN DATOS inicialmente**. La migración de datos de producción desde `ooaumjzaztmutltifhoq` se hará en operación separada post-migración para minimizar downtime.

### Proyecto Viejo (Backup Permanente)
✅ Proyectos `hoaiwcueleiemeplrurv` y `ooaumjzaztmutltifhoq` se mantienen como backup permanente. NO eliminar.

### Rollback
✅ Rollback completo disponible restaurando .env.local backups en VPS y apuntando a proyectos viejos.

---

**Última Actualización:** 16 de Noviembre, 2025
**Próximo Paso:** Ejecutar FASE 0 con workflow.md
**Status:** ✅ Plan sin ambigüedades - Listo para ejecución
