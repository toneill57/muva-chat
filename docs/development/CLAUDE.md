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

**Chat Routes:**
- `/with-me` - Public chat (anonymous, pre-booking)
- `/my-stay` - Guest portal (authenticated: check-in date + phone last 4 digits)

---

## REGLAS CRÍTICAS

### 0. AMBIENTE DE DESARROLLO - STAGING FIRST

**SIEMPRE trabajar en STAGING primero. NUNCA en producción.**

**Environment Setup:**
- `localhost:3001` → **STAGING** (`hoaiwcueleiemeplrurv`)
- `localhost:3000` → **PRODUCTION** (`iyeueszchbvlutlcmvcb`) - solo lectura

**Comandos:**
```bash
pnpm run dev:staging   # Port 3001
pnpm run dev:production # Port 3000
```

Ver: `QUICK_START_DUAL_ENV.md` para setup completo

---

### 1. PRIORIZAR Sugerencias del Usuario
Cuando el usuario sugiere una causa, INVESTIGARLA PRIMERO antes de proponer alternativas.

### 2. NO Modificar Performance Targets
Investigar causa REAL, pedir aprobación antes de cambiar umbrales.

### 3. NO Work-arounds Facilistas
Investigar causa → Informar problema real → Proponer solución

### 4. Autonomía de Ejecución
NUNCA pedir al usuario hacer tareas que yo puedo hacer (scripts, bash, APIs, testing)

### 5. Git Workflow
**Workflow:** `dev` (auto) → `staging` (auto) → `main` (manual approval)

**COMMITS/PUSH - REQUIEREN AUTORIZACIÓN EXPLÍCITA**
- X NUNCA commitear sin que usuario lo pida explícitamente
- Verificar health antes de merge: `pnpm dlx tsx scripts/monitoring-dashboard.ts`

### 6. Verificar `git status` Antes de 404s
Archivos sin commitear = causa #1 de diferencias local vs producción

### 7. TypeScript Interface Changes
- Buscar TODOS los archivos que usan la interface
- Agregar TODOS los campos A LA VEZ
- `pnpm run build` local ANTES de commit
- X NUNCA commits iterativos por campo

### 8. Autenticación - NO Duplicar Validaciones
Layouts ya protegen rutas - NO agregar validaciones adicionales
- X NUNCA duplicar validaciones (causa logout inesperado)

### 9. Monitoring First
- ANTES de deploy: `pnpm dlx tsx scripts/monitoring-dashboard.ts`
- DESPUÉS de deploy: Verificar health endpoints
- X NUNCA deployear si staging está DOWN

### 10. RPC Functions Validation (CRÍTICO - Guest Chat)
**Problema:** Funciones RPC pierden `search_path` → Guest chat NO responde sobre alojamientos

**Validar antes de deploy:**
```bash
pnpm run validate:rpc -- --env=staging
pnpm run validate:rpc:fix -- --env=staging  # Auto-fix si falla
```

Ver: `docs/guest-chat-debug/PREVENTION_SYSTEM.md`

---

## Development Setup

### SSH Access to VPS
```bash
ssh -i ~/.ssh/muva_deploy root@195.200.6.216
```

**CRITICAL:** ALWAYS use `-i ~/.ssh/muva_deploy` flag

X NO usar `pnpm run dev` directo (falta .env.local)
X NO crear `vercel.json` (migrado a VPS Oct 2025)

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

- `snapshots/general-snapshot.md` - Estado completo del proyecto
- `docs/infrastructure/three-environments/README.md` - Arquitectura de 3 ambientes
- `docs/infrastructure/three-environments/QUICK_REFERENCE.md` - Referencia rápida (1 página)

---

## Validation Commands

**Pre-deploy checks:**
```bash
pnpm run validate:rpc          # Validate RPC functions
pnpm run validate:rpc:fix      # Auto-fix RPC functions
pnpm run test:rpc              # Run RPC tests
./scripts/pre-deploy-check.sh staging  # Full validation
```

---

**Last Updated:** November 8, 2025
