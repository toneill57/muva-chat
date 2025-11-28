# CLAUDE.md

Guidance for Claude Code when working with this repository.

---

## Project Context

**MUVA Chat** - Multi-Tenant Tourism Platform
- AI-powered guest communication for hotels/tourism businesses
- Multi-tenant architecture (subdomain-based)
- Premium SIRE compliance (Colombian tourism regulatory reporting)
- Stack: Next.js 15, TypeScript, Supabase, Claude AI

**Current Projects:** Multi-tenant tourism platform with SIRE compliance

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

---

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

### SSH Access to VPS
```bash
ssh -i ~/.ssh/muva_deploy root@195.200.6.216
```

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

- Si estuvieras accediendo a un VPS por SSH nunca modifiques código ya que se rompe el patrón de trabajar con tres ambientes
- El ambiente tst a veces puede ser referido como staging pero debes tener en cuenta que las ramas de supabase y de github se llaman tst
- IMPORTANTE: Cualquier solicitud de modificar la base de datos tst o producción debe ser consultada al usuario para su confirmación
**Last Updated:** November 16, 2025 (Three-Tier Migration Completed)
