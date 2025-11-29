# CLAUDE.md

Guidance for Claude Code when working with this repository.

---

## 🚨🚨🚨 DEPLOYMENT & VPS - LEER PRIMERO 🚨🚨🚨

**NO HAY ACCESO SSH LOCAL AL VPS.** La clave SSH está en GitHub Secrets, NO en ~/.ssh/

### Workflow de Deploy (Ver sección "Merge Workflow" abajo para comandos completos)

**Proceso:**
1. Commit y push a `dev`
2. Crear PR `dev → tst` (auto-merge)
3. Esperar deployment TST
4. Crear PR `tst → prd` (requiere 1 approval)
5. Esperar deployment PRD
6. Verificar health: `curl -s https://muva.chat/api/health | jq`

**Si deploy falla:**
- Workflows incluyen `git stash` y `git reset --hard` automáticamente
- Revisar logs: `gh run view <run-id> --log-failed`
- **NUNCA** intentar SSH manual - no funciona desde local

### VPS Info (solo referencia, NO se puede acceder desde local):
| Ambiente | Directorio | PM2 Process |
|----------|------------|-------------|
| TST | /var/www/muva-chat-tst | muva-chat-tst |
| PRD | /var/www/muva-chat-prd | muva-chat-prd |

### 🔧 VPS Remote Command Executor - MÉTODO DE EMERGENCIA

**⚠️ POLÍTICA:** Ejecución de comandos en VPS SOLO con autorización explícita del usuario

**Workflow:** `.github/workflows/vps-exec.yml`

**Uso (vía GitHub Actions):**
```bash
# Listar workflows disponibles
gh workflow list

# Ejecutar comando en TST
gh workflow run vps-exec.yml -f environment=tst -f command="pm2 status" -f working_directory="/var/www/muva-chat-tst"

# Ejecutar comando en PRD (EXTREMA PRECAUCIÓN)
gh workflow run vps-exec.yml -f environment=prd -f command="pm2 logs --lines 50" -f working_directory="/var/www/muva-chat-prd"

# Ver logs del workflow
gh run list --workflow=vps-exec.yml --limit=1
gh run view <run-id> --log
```

**Comandos Bloqueados (Safety Check):**
- `rm -rf`, `mkfs`, `dd if=`, `format`, `fdisk`, `parted`
- `shutdown`, `reboot`, `init 0`, `init 6`, `halt`, `poweroff`
- Fork bombs y comandos destructivos

**Ejemplos de Uso Válido:**
```bash
# Verificar estado de PM2
gh workflow run vps-exec.yml -f environment=tst -f command="pm2 status"

# Ver logs de aplicación
gh workflow run vps-exec.yml -f environment=tst -f command="pm2 logs muva-chat-tst --lines 100 --nostream"

# Verificar espacio en disco
gh workflow run vps-exec.yml -f environment=tst -f command="df -h"

# Listar archivos de directorio
gh workflow run vps-exec.yml -f environment=tst -f command="ls -la .next" -f working_directory="/var/www/muva-chat-tst"
```

**⚠️ IMPORTANTE:**
- Este workflow es TEMPORAL para debugging
- Requiere aprobación de GitHub Environment (`production` para PRD, `staging` para TST)
- NO ejecutar comandos destructivos - el workflow los bloqueará
- Siempre verificar el `working_directory` antes de ejecutar

---

## Project Context

**MUVA Chat** - Multi-Tenant Tourism Platform
- AI-powered guest communication for hotels/tourism businesses
- Multi-tenant architecture (subdomain-based)
- Premium SIRE compliance (Colombian tourism regulatory reporting)
- Stack: Next.js 15, TypeScript, Supabase, Claude AI

**Chat Routes:**
- `/with-me` - Public chat (anonymous, pre-booking)
- `/my-stay` - Guest portal (authenticated: check-in date + phone last 4 digits)

---

## 🔧 Current Development Environment

**CRÍTICO:** Todo el desarrollo se realiza en:

- **Rama Git:** `dev`
- **Supabase Branch:** `dev` (Proyecto: MUVA 1.0)
- **Entorno:** Local (máquina del desarrollador)
- **Base de Datos:** Todas las consultas van DIRECTAMENTE a la rama `dev` de Supabase

**Implicaciones:**
- ✅ Usar MCP tools (`mcp__supabase__execute_sql`) para queries a rama `dev`
- ✅ Migraciones aplican sobre rama `dev` de Supabase
- ✅ Testing local contra rama `dev` de Supabase
- ⚠️ **X NUNCA** queries directas a `tst` o `prd` sin autorización explícita

### 🔑 Database Connection - MÉTODO DEFINITIVO

**IMPORTANTE:** Cuando necesites conectarte a la base de datos, SIEMPRE usa este método:

```bash
# Query directo a Supabase DEV
node .claude/db-query.js "SELECT * FROM v_tenant_stats LIMIT 3"

# Listar tablas
node .claude/db-query.js "SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 10"
```

**Credenciales (ya configuradas en `.env.local` línea 48):**
- **SUPABASE_ACCESS_TOKEN**: `sbp_32b777f1b90ca669a789023b6b0c0ba2e92974fa`
- **Proyecto DEV**: `zpyxgkvonrxbhvmkuzlt`
- **URL**: `https://zpyxgkvonrxbhvmkuzlt.supabase.co`

**Script Helper:** `.claude/db-query.js` (creado Nov 29, 2025)

### 🚨 Database Queries TST/PRD - REQUIERE AUTORIZACIÓN

**⚠️ POLÍTICA:** Queries a TST/PRD SOLO con autorización explícita del usuario

**USO DE EMERGENCIA:**

```bash
# TST (Testing/Staging)
node .claude/db-query.js tst "SELECT * FROM tabla LIMIT 10"

# PRD (Production) - EXTREMA PRECAUCIÓN
node .claude/db-query.js prd "SELECT * FROM tabla LIMIT 5"
```

**Credenciales:**
- **TST**: Proyecto `bddcvjoeoiekzfetvxoe` → staging.muva.chat
- **PRD**: Proyecto `kprqghwdnaykxhostivv` → muva.chat
- **ACCESS_TOKEN**: Compartido (mismo que DEV, línea 48 `.env.local`)

**Restricciones Automáticas:**
- ✅ Solo queries SELECT (read-only)
- ❌ DELETE/UPDATE/DROP/TRUNCATE/ALTER/CREATE bloqueadas por código
- ⚠️ Warnings visuales antes de ejecutar (colores amarillo/rojo)
- ⏱️ Muestra duración de ejecución

**⚠️ IMPORTANTE:**
- Siempre pedir autorización explícita al usuario antes de queries TST/PRD
- Usar LIMIT en queries para evitar sobrecarga
- TST es para testing/debugging, PRD solo en emergencias críticas

---

## Behavioral Guidelines

### 1. PRIORIZAR Sugerencias del Usuario
Cuando el usuario sugiere una causa, INVESTIGARLA PRIMERO antes de proponer alternativas.

### 2. NO Modificar Performance Targets
Investigar causa REAL, pedir aprobación antes de cambiar umbrales.

### 3. NO Work-arounds Facilistas
Investigar causa → Informar problema real → Proponer solución

### 4. Autonomía de Ejecución
NUNCA pedir al usuario hacer tareas que yo puedo hacer (scripts, bash, APIs, testing)

**COMMITS/PUSH - REQUIEREN AUTORIZACIÓN EXPLÍCITA**
- X NUNCA commitear sin que usuario lo pida explícitamente

### 5. Verificar `git status` Antes de 404s
Archivos sin commitear = causa #1 de diferencias local vs producción

### 6. TypeScript Interface Changes
- Buscar TODOS los archivos que usan la interface
- Agregar TODOS los campos A LA VEZ
- `pnpm run build` local ANTES de commit
- X NUNCA commits iterativos por campo

### 7. Autenticación - NO Duplicar Validaciones
Layouts ya protegen rutas - NO agregar validaciones adicionales
- X NUNCA duplicar validaciones (causa logout inesperado)

### 8. Monitoring First
- DESPUÉS de deploy: Verificar health endpoints

### 9. RPC Functions Validation (CRÍTICO - Guest Chat)
**Problema:** Funciones RPC pierden `search_path` → Guest chat NO responde sobre alojamientos

### 10. Limpieza de Referencias Obsoletas
**IMPORTANTE:** Si encuentras alguna referencia al proyecto anterior `ooaumjzaztmutltifhoq`,
notifica inmediatamente al usuario para análisis y posible eliminación.
Este ID corresponde al proyecto MUVA original pre-migración (obsoleto desde Nov 16, 2025).

**Proyectos Actuales (Three-Tier):**
- **DEV:** `zpyxgkvonrxbhvmkuzlt` (rama dev)
- **TST:** `bddcvjoeoiekzfetvxoe` (rama tst/staging)
- **PRD:** `kprqghwdnaykxhostivv` (rama prd/production)

---

## Development Setup

### MUVA Tourism Content - Embeddings

**Script canónico:** `scripts/database/populate-embeddings.js`

**⚠️ NUNCA crear scripts alternativos para MUVA content** - el script de producción ya existe (2,692 líneas).

**Uso:**
```bash
# Archivo individual
node scripts/database/populate-embeddings.js _assets/muva/listings/actividades/archivo.md

# Directorio completo
node scripts/database/populate-embeddings.js _assets/muva/listings/

# Todos los archivos
node scripts/database/populate-embeddings.js --all

# Via package.json
pnpm run populate-embeddings [archivo/directorio]

# ⚠️ IMPORTANTE: Usar ruta ABSOLUTA si el script falla con rutas relativas
node scripts/database/populate-embeddings.js /Users/oneill/Sites/apps/muva-chat/_assets/muva/listings/actividades/archivo.md
```

**Características:**
- ✅ Extrae metadata completa (pricing, contact, location, features)
- ✅ Batch processing de directorios
- ✅ Routing dinámico según YAML frontmatter
- ✅ Matryoshka embeddings (1024, 1536, 3072)
- ✅ Pre-creación de accommodation units
- ✅ 12+ funciones de extracción de templates

**Documentación:**
- `docs/content/MUVA_LISTINGS_GUIDE.md` - guía oficial de uso
- `docs/content/MUVA_TEMPLATE_GUIDE.md` - estructura de templates
- `docs/patterns/METADATA_EXTRACTION_FIX_PATTERN.md` - sistema de extracción

**Tabla destino:** `public.muva_content`
**Archivos fuente:** `_assets/muva/listings/`
**Total archivos:** 40+ markdown files con YAML frontmatter v3.0

**Proceso de búsqueda correcto (lección aprendida Nov 26, 2025):**
1. ✅ Revisar `package.json` scripts primero
2. ✅ Buscar en TODOS los subdirectorios (`scripts/**/*`)
3. ✅ Incluir `.js` Y `.ts` en búsquedas (NO solo TypeScript)
4. ✅ Verificar git history: `git log --all --full-history -- "*populate*"`
5. ✅ Validar con usuario antes de crear scripts nuevos

---

### Merge Workflow - GitHub API Only

**CRÍTICO:** Cuando usuario solicite merge entre ramas, USAR GitHub API (NO git local)

**Ventajas:**
- ✅ No contamina workspace local
- ✅ Triggerea GitHub Actions automáticamente
- ✅ Mantiene historial limpio
- ✅ Funciona sin importar rama local actual

**Proceso:**

| Flujo | Comando | Notas |
|-------|---------|-------|
| **dev → tst** | `gh pr create --base tst --head dev --fill && gh pr merge --merge --auto` | Auto-merge (0 approvals) |
| **tst → prd** | `gh pr create --base prd --head tst --fill` | Requiere 1 approval |

**tst → prd - Pasos completos:**
```bash
# 1. Crear PR
gh pr create --base prd --head tst --title "Deploy to Production" --body "
## Changes
- [Auto-generated from tst branch]

## Checklist
- [ ] TST deployment successful
- [ ] Health checks passing
- [ ] Ready for production

Generated via GitHub API
"

# 2. Informar al usuario
# "PR creado. Requiere 1 approval. URL: [mostrar URL del PR]"

# 3. Tras approval del usuario:
gh pr merge --merge
```

**X NUNCA usar:**
- `git checkout <branch>`
- `git merge <branch>`
- `git push origin <branch>`

---

## Key Development Patterns

### MCP-FIRST POLICY

| Operación | X NUNCA | ✅ SIEMPRE |
|-----------|---------|---------|
| SQL queries | `pnpm dlx tsx -e` | `mcp__supabase__execute_sql` |
| DB schema | bash + describe | `mcp__supabase__list_tables` |

**Note:** `mcp__supabase__list_tables` requires `schemas: ["public"]` parameter

Ref: `docs/infrastructure/MCP_USAGE_POLICY.md`

### Database Operations

**DML (SELECT/INSERT/UPDATE/DELETE):**
1. `mcp__supabase__execute_sql` (PRIMARY - 70% token savings)
2. RPC functions (SECONDARY - 98% savings)
3. tsx scripts (AVOID - 3x cost)

**DDL (CREATE/ALTER/DROP):**
```bash
set -a && source .env.local && set +a && \
pnpm dlx tsx scripts/execute-ddl-via-api.ts migration.sql
```
X MCP tools NO funcionan para DDL

Ref: `docs/troubleshooting/SUPABASE_INTERACTION_GUIDE.md`

### Vector Search
**CRITICAL:** Send FULL chunks to LLM (already optimized by semantic chunking)

- Chunks pre-sized (~1-2K chars) por headers `## Section`
- X NUNCA truncar chunks (`.substring()`)
- Performance: 81% token reduction

### SIRE Compliance
- USAR: `src/lib/sire/sire-catalogs.ts` (USA=249, NOT 840)
- X NUNCA ISO 3166-1 → 100% RECHAZADO

Ref: `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md`

---

## Documentation

- `docs/three-tier-unified/README.md` - Arquitectura three-tier (dev/tst/prd)
- `docs/three-tier-unified/workflow.md` - Workflow de migración
- `docs/three-tier-unified/ROLLBACK_PLAN.md` - Procedimientos de rollback
- `docs/architecture/DATA_POPULATION_TIMELINE.md` - Flujo completo de población de datos


---

## Important Reminders

### VPS Access
- **NUNCA modifiques código** si estuvieras accediendo al VPS por SSH - rompe el patrón three-tier
- Usa el workflow `.github/workflows/vps-exec.yml` para comandos de emergencia

### Nomenclatura
- El ambiente **tst** puede ser referido como "staging" en conversaciones
- Las ramas de Supabase y GitHub se llaman **tst** (NO staging)

### Modificaciones a TST/PRD
- **SIEMPRE** consultar al usuario antes de modificar bases de datos TST/PRD
- Requiere autorización explícita (políticas de seguridad)

---

**Last Updated:** November 29, 2025 (Database & VPS Access Tools Added)
