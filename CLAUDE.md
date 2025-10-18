# CLAUDE.md

Guidance for Claude Code when working with this repository.

---

## 📋 Project Context

**MUVA Chat** - Multi-Tenant Tourism Platform
- AI-powered guest communication for hotels/tourism businesses
- Multi-tenant architecture (subdomain-based)
- Premium SIRE compliance (Colombian tourism regulatory reporting)
- Stack: Next.js 15, TypeScript, Supabase, Claude AI

---

## 🚨 REGLAS CRÍTICAS

### 1. NO Modificar Performance Targets
- ❌ Cambiar umbrales para que tests pasen artificialmente
- ✅ Investigar causa REAL del problema
- ✅ Pedir aprobación EXPLÍCITA antes de cambiar targets

### 2. NO Work-arounds Facilistas
**NUNCA crear work-arounds sin investigar la RAÍZ del problema.**

- ✅ PRIMERO: Investigar por qué falla
- ✅ SEGUNDO: Informar al usuario el problema REAL
- ✅ TERCERO: Solo entonces proponer work-around (si es necesario)

### 3. Autonomía de Ejecución
**NUNCA pedir al usuario hacer tareas que yo puedo hacer.**

Aplica a: scripts, bash, leer archivos, APIs, testing

**Único caso:** Decisiones de producto/negocio o cuando NO tengo acceso.

### 4. Git Workflow - SIEMPRE `dev`
**TODO el trabajo en rama `dev` - NUNCA sugerir merge a `main`**

- ✅ SIEMPRE commits/push a `dev`
- ❌ NUNCA `git merge dev → main`
- ❌ NUNCA mencionar deploy sin autorización explícita

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
- ✅ `npm run build` local ANTES de commit
- ❌ NUNCA commits iterativos por cada campo faltante

📚 **Guía:** `docs/troubleshooting/TYPESCRIPT_INTERFACE_COMPLETENESS.md`

---

## 🚀 Development Setup

### Dev Script (MANDATORY)
```bash
./scripts/dev-with-keys.sh
```
❌ NO usar `npm run dev` directo (falta .env.local)

### Infrastructure
- ❌ NO crear `vercel.json` (migrado a VPS Oct 2025)
- ✅ Usar PM2 + Git deployment

---

## 🤖 MCP Servers

**Available:** 4 servers (supabase, knowledge-graph, playwright, context7)

### MCP-FIRST POLICY

| Operación | ❌ NUNCA | ✅ SIEMPRE |
|-----------|----------|------------|
| SQL queries | `npx tsx -e` | `mcp__supabase__execute_sql` |
| DB schema | bash + describe | `mcp__supabase__list_tables` |
| Framework docs | WebFetch | `mcp__context7__get-library-docs` |
| UI testing | curl | `mcp__playwright__browser_snapshot` |

**MCP Supabase Workaround:**
```typescript
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public"] // REQUIRED
})
```

📚 **Policy:** `docs/infrastructure/MCP_USAGE_POLICY.md`

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

### Database Operations

**DML (SELECT/INSERT/UPDATE/DELETE):**
1. `mcp__supabase__execute_sql` (PRIMARY - 70% token savings)
2. RPC functions (SECONDARY - 98% savings)
3. tsx scripts (AVOID - 3x cost)

**DDL (CREATE/ALTER/DROP):**
```bash
set -a && source .env.local && set +a && \
npx tsx scripts/execute-ddl-via-api.ts migration.sql
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

---

**Last Updated:** October 2025
