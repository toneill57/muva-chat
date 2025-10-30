# CLAUDE.md

Guidance for Claude Code when working with this repository.

---

## 📋 Project Context

**MUVA Chat** - Multi-Tenant Tourism Platform
- AI-powered guest communication for hotels/tourism businesses
- Multi-tenant architecture (subdomain-based)
- Premium SIRE compliance (Colombian tourism regulatory reporting)
- Stack: Next.js 15, TypeScript, Supabase, Claude AI

**Current Projects:** Ver `snapshots/general-snapshot.md` → CURRENT PROJECT

---

## 🚨 REGLAS CRÍTICAS

### 1. NO Modificar Performance Targets
- ❌ Cambiar umbrales para que tests pasen artificialmente
- ✅ Investigar causa REAL del problema
- ✅ Pedir aprobación EXPLÍCITA antes de cambiar targets

### 2. NO Work-arounds Facilistas
**NUNCA crear work-arounds sin investigar la RAÍZ del problema.**

Workflow: Investigar causa → Informar problema real → Proponer solución (si es necesario)

### 3. Autonomía de Ejecución
**NUNCA pedir al usuario hacer tareas que yo puedo hacer.**

Aplica a: scripts, bash, leer archivos, APIs, testing

**Único caso:** Decisiones de producto/negocio o cuando NO tengo acceso.

### 4. Git Workflow - SIEMPRE `staging`
**TODO el trabajo en rama `staging` - Branch `dev` CONGELADA temporalmente**

- ✅ SIEMPRE commits/push a `staging`
- ⚠️ Branch `dev` está congelada (no deployea actualmente)
- ❌ NUNCA `git merge staging → main`
- ❌ NUNCA mencionar deploy sin autorización explícita

**🚨 COMMITS Y PUSH - REQUIEREN AUTORIZACIÓN EXPLÍCITA:**
- ❌ NUNCA hacer `git commit` sin que el usuario lo pida
- ❌ NUNCA hacer `git push` sin que el usuario lo pida
- ✅ SOLO commitear cuando el usuario explícitamente diga: "commitea", "haz commit", "push", etc.
- ✅ Puedo PREPARAR el mensaje de commit, pero NO ejecutarlo
- ✅ Puedo usar `git status`, `git diff`, `git log` sin permiso

**CI/CD Setup:**
- `staging` → GitHub Actions → VPS staging (/var/www/muva-chat-staging)
- `dev` → NO deployea (workflow desactivado temporalmente)

### 5. Verificar `git status` Antes de 404s
**Archivos sin commitear = causa #1 de diferencias local vs producción**

- ✅ PRIMERO: `git status --short`
- ✅ SEGUNDO: Verificar si falta archivo
- ✅ TERCERO: Otros problemas (routing, etc.)

### 6. TypeScript Interface Changes
**VERIFICAR completeness ANTES de commitear**

- ✅ Buscar TODOS los archivos que usan la interface
- ✅ Identificar TODOS los accesos a campos (`object.field`)
- ✅ Agregar TODOS los campos faltantes A LA VEZ
- ✅ `pnpm run build` local ANTES de commit
- ❌ NUNCA commits iterativos por cada campo faltante

📚 **Guía:** `docs/troubleshooting/TYPESCRIPT_INTERFACE_COMPLETENESS.md`

### 7. Autenticación - NO Duplicar Validaciones
**Layouts ya protegen rutas - NO agregar validaciones adicionales**

**Arquitectura actual:**
- `/dashboard/layout.tsx` → Valida `staff_token` para `/dashboard/*`
- `/accommodations/layout.tsx` → Valida `staff_token` para `/accommodations/*`
- `/staff/page.tsx` → Validación interna con `verifyAuth()`

**REGLAS:**
- ❌ NUNCA agregar hooks de validación a páginas YA protegidas por layout
- ❌ NUNCA duplicar validaciones (causa logout inesperado)
- ✅ ANTES de agregar auth: verificar si existe `layout.tsx` protector
- ✅ Componentes reutilizables (como `ReservationsList`) NO deben validar

**URLs correctas (subdomain en hostname, NO en path):**
- ✅ `simmerdown.localhost:3000/staff/login`
- ❌ `simmerdown.localhost:3000/simmerdown/staff/login`

---

## 🚀 Development Setup

### Dev Script (MANDATORY)
```bash
./scripts/dev-with-keys.sh
```
❌ NO usar `pnpm run dev` directo (falta .env.local)

**Note:** ❌ NO crear `vercel.json` (migrado a VPS Oct 2025)

---

## 🤖 Specialized Agents

Agentes leen automáticamente `snapshots/{nombre}.md`

- `@agent-database-agent` - Schema, migrations, RPC, RLS
- `@agent-backend-developer` - APIs, business logic, SIRE
- `@agent-ux-interface` - React components, WCAG
- `@agent-deploy-agent` - CI/CD, VPS deployment
- `@agent-embeddings-generator` - Vector search, Matryoshka

---

## 🛠️ Key Development Patterns

### MCP-FIRST POLICY

| Operación | ❌ NUNCA | ✅ SIEMPRE |
|-----------|----------|------------|
| SQL queries | `pnpm dlx tsx -e` | `mcp__supabase__execute_sql` |
| DB schema | bash + describe | `mcp__supabase__list_tables` |
| Project memory | Inline docs | `mcp__knowledge-graph__aim_search_nodes` |
| Framework docs | WebFetch | WebSearch + docs URLs |

**MCP Supabase Workaround:**
```typescript
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public"] // REQUIRED
})
```

📚 **Full policy:** `docs/infrastructure/MCP_USAGE_POLICY.md`

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
❌ MCP tools NO funcionan para DDL

📚 **Full guide:** `docs/troubleshooting/SUPABASE_INTERACTION_GUIDE.md`

### Vector Search
**CRITICAL:** Send FULL chunks to LLM (already optimized by semantic chunking)

- ✅ Chunks pre-sized (~1-2K chars) por headers `## Section`
- ❌ NUNCA truncar chunks (`.substring()`)
- 📊 Performance: 81% token reduction

📚 **Workflow:** `docs/workflows/ACCOMMODATION_SYNC_UNIVERSAL.md`

### SIRE Compliance
- ✅ USAR: `src/lib/sire/sire-catalogs.ts` (USA=249, NOT 840)
- ❌ NUNCA ISO 3166-1 → 100% RECHAZADO

📚 **Ref:** `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md`

---

## 📚 Documentation Index

- **MCP Usage:** `docs/infrastructure/MCP_USAGE_POLICY.md`
- **Database Patterns:** `docs/architecture/DATABASE_QUERY_PATTERNS.md`
- **Supabase Guide:** `docs/troubleshooting/SUPABASE_INTERACTION_GUIDE.md`
- **TypeScript Interfaces:** `docs/troubleshooting/TYPESCRIPT_INTERFACE_COMPLETENESS.md`
- **SIRE Codes:** `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md`
- **Workflows:** `docs/workflows/ACCOMMODATION_SYNC_UNIVERSAL.md`
- **Agent Snapshots:** `snapshots/{agent-name}.md`
- **pnpm Migration:** `project-stabilization/PNPM_MIGRATION_COMPLETE.md`

---

## 🔄 Package Manager (pnpm)

**Current:** pnpm v10.20.0 (migrated from npm Oct 30, 2025)

**Key Commands:**
- `pnpm install` - Install dependencies
- `pnpm install --frozen-lockfile` - CI/CD installs (replaces `npm ci`)
- `pnpm dlx tsx` - Run TypeScript scripts (replaces `npx tsx`)
- `pnpm run X` - Run package.json scripts

**Migration:** Zero deprecation warnings, zero peer dependency conflicts, 90%+ faster cached installs.

📚 **Full details:** `project-stabilization/PNPM_MIGRATION_COMPLETE.md`

---

**Last Updated:** October 30, 2025
