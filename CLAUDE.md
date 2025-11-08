# CLAUDE.md

Guidance for Claude Code when working with this repository.

---

## Project Context

**MUVA Chat** - Multi-Tenant Tourism Platform
- AI-powered guest communication for hotels/tourism businesses
- Multi-tenant architecture (subdomain-based)
- Premium SIRE compliance (Colombian tourism regulatory reporting)
- Stack: Next.js 15, TypeScript, Supabase, Claude AI

**Current Projects:** Ver `snapshots/general-snapshot.md` → CURRENT PROJECT

---

## REGLAS CRÍTICAS

### 0. PRIORIZAR Sugerencias del Usuario
Cuando el usuario sugiere una causa, INVESTIGARLA PRIMERO antes de proponer alternativas.

- Usar herramientas (SSH, logs, MCP) para verificar inmediatamente
- X NUNCA ignorar sugerencias del usuario por teorías propias
- **Razón:** Usuario tiene contexto del sistema real

### 1. NO Modificar Performance Targets
- X Cambiar umbrales para que tests pasen artificialmente
- Investigar causa REAL, pedir aprobación antes de cambiar

### 2. NO Work-arounds Facilistas
Investigar causa → Informar problema real → Proponer solución

### 3. Autonomía de Ejecución
NUNCA pedir al usuario hacer tareas que yo puedo hacer (scripts, bash, APIs, testing)

### 4. Git Workflow - Three Environments
**Workflow:** `dev` (auto) → `staging` (auto) → `main` (manual approval)

**COMMITS/PUSH - REQUIEREN AUTORIZACIÓN EXPLÍCITA**
- X NUNCA commitear sin que usuario lo pida explícitamente
- Puedo usar `git status`, `git diff`, `git log` sin permiso
- Verificar health antes de merge: `pnpm dlx tsx scripts/monitoring-dashboard.ts`

Ver: `snapshots/general-snapshot.md` → Three Environments section

### 5. Verificar `git status` Antes de 404s
Archivos sin commitear = causa #1 de diferencias local vs producción

### 6. TypeScript Interface Changes
- Buscar TODOS los archivos que usan la interface
- Agregar TODOS los campos A LA VEZ
- `pnpm run build` local ANTES de commit
- X NUNCA commits iterativos por campo

### 7. Autenticación - NO Duplicar Validaciones
Layouts ya protegen rutas - NO agregar validaciones adicionales
- `/dashboard/layout.tsx` → Protege `/dashboard/*`
- `/accommodations/layout.tsx` → Protege `/accommodations/*`
- X NUNCA duplicar validaciones (causa logout inesperado)

### 8. Monitoring First
- ANTES de deploy: `pnpm dlx tsx scripts/monitoring-dashboard.ts`
- DESPUÉS de deploy: Verificar health endpoints
- X NUNCA deployear si staging está DOWN

### 9. RPC Functions Validation (CRÍTICO - Guest Chat)
**Problema recurrente:** Funciones RPC pierden `search_path` → Operador pgvector `<=>` inaccesible → Guest chat NO responde sobre alojamientos

**SIEMPRE validar ANTES de deploy:**
```bash
pnpm run validate:rpc -- --env=staging
```

**Si falla → Auto-fix:**
```bash
pnpm run validate:rpc:fix -- --env=staging
```

**CI/CD:** GitHub Actions automáticamente valida + auto-repara antes de build
**Monitoring:** Cron job ejecuta validación cada hora en VPS
**Tests:** `pnpm run test:rpc` falla si funciones incorrectas

Ver: `docs/guest-chat-debug/PREVENTION_SYSTEM.md` (sistema completo de 4 capas)
Ver: `docs/monitoring/AUTOMATED_MONITORING_SETUP.md` (setup de cron + alertas)

---

## Development Setup

### Dual Environment (RECOMMENDED)
Run production and staging **simultaneously** for safe development:

```bash
# Terminal 1: Production (port 3000)
pnpm run dev:production

# Terminal 2: Staging (port 3001)
pnpm run dev:staging
```

**Benefits:**
- ✅ Compare environments side-by-side
- ✅ Test changes in staging without risk
- ✅ Zero chance of mixing environments (different ports)

**Documentation:** `QUICK_START_DUAL_ENV.md`

### Alternative: Single Environment
```bash
./scripts/dev-with-keys.sh  # Port 3000 with .env.local
```

X NO usar `pnpm run dev` directo (falta .env.local)
X NO crear `vercel.json` (migrado a VPS Oct 2025)

### SSH Access to VPS

**Staging VPS:**
```bash
ssh -i ~/.ssh/muva_deploy root@195.200.6.216
```

**Production VPS:** (when needed)
```bash
ssh -i ~/.ssh/muva_deploy root@195.200.6.216
```

**CRITICAL:** ALWAYS use `-i ~/.ssh/muva_deploy` flag (keys from FASE 7)
X NUNCA: `ssh root@195.200.6.216` (will fail with "Permission denied")

---

## Specialized Agents

Agentes leen automáticamente `snapshots/{nombre}.md`

- `@agent-api-endpoints-mapper` - API route analysis and documentation
- `@agent-backend-developer` - APIs, business logic, SIRE
- `@agent-database-agent` - Schema, migrations, RPC, RLS
- `@agent-deploy-agent` - CI/CD, VPS deployment
- `@agent-documentation-template-applier` - Documentation templates and formatting
- `@agent-embeddings-generator` - Vector search, Matryoshka
- `@agent-infrastructure-monitor` - Monitoring, alerting, metrics, error detection
- `@agent-ux-interface` - React components, WCAG

---

## Key Development Patterns

### MCP-FIRST POLICY

| Operación | X NUNCA | SIEMPRE |
|-----------|---------|---------|
| SQL queries | `pnpm dlx tsx -e` | `mcp__supabase__execute_sql` |
| DB schema | bash + describe | `mcp__supabase__list_tables` |
| Project memory | Inline docs | `mcp__knowledge-graph__aim_search_nodes` |

**MCP Supabase Workaround:**
```typescript
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public"] // REQUIRED
})
```

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

Ref: `docs/workflows/ACCOMMODATION_SYNC_UNIVERSAL.md`

### SIRE Compliance
- USAR: `src/lib/sire/sire-catalogs.ts` (USA=249, NOT 840)
- X NUNCA ISO 3166-1 → 100% RECHAZADO

Ref: `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md`

---

## Documentation

Ver: `snapshots/general-snapshot.md` (estado completo del proyecto)
Ver: `docs/infrastructure/three-environments/README.md` (16 docs)
Ver: `docs/infrastructure/three-environments/QUICK_REFERENCE.md` (1 página)

---

## Package Manager (pnpm)

**Current:** pnpm v10.20.0 (migrated from npm Oct 30, 2025)

**Key Commands:**
- `pnpm install` - Install dependencies
- `pnpm install --frozen-lockfile` - CI/CD installs
- `pnpm dlx tsx` - Run TypeScript scripts
- `pnpm run X` - Run package.json scripts

**Validation Commands:**
- `pnpm run validate:rpc` - Validate RPC functions search_path
- `pnpm run validate:rpc:fix` - Auto-fix RPC functions
- `pnpm run test:rpc` - Run RPC function tests
- `pnpm dlx tsx scripts/pre-deploy-check.sh [env]` - Full pre-deploy validation

Ref: `project-stabilization/PNPM_MIGRATION_COMPLETE.md`

---

## Guest Chat Prevention System

**Sistema de 4 Capas** para prevenir rotura de guest chat por funciones RPC incorrectas:

1. **CLI Validation** - `pnpm run validate:rpc` (desarrollo)
2. **Health Endpoint** - `GET /api/health/database` (runtime)
3. **Monitoring Dashboard** - Visual status de todos los ambientes
4. **Automated Tests** - `pnpm run test:rpc` (CI/CD gate)

**Workflow antes de deploy:**
```bash
./scripts/pre-deploy-check.sh staging  # Valida TODO
./scripts/deploy-staging.sh            # Deploy si pasa ✅
```

**Documentación completa:**
- `docs/guest-chat-debug/README.md` - Guía rápida
- `docs/guest-chat-debug/PREVENTION_SYSTEM.md` - Sistema completo
- `docs/monitoring/AUTOMATED_MONITORING_SETUP.md` - Cron + alertas

---

**Last Updated:** November 6, 2025 (Post-Prevention System)
