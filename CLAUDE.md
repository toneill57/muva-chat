# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 📋 Project Context

**MUVA Chat** - Multi-Tenant Tourism Platform
- AI-powered guest communication platform for hotels and tourism businesses
- Multi-tenant architecture with subdomain-based isolation
- Premium SIRE compliance features for Colombian tourism regulatory reporting
- Built with Next.js 15, TypeScript, Supabase, and Claude AI

---

## 🚨 REGLAS CRÍTICAS

### 1. NO Modificar Targets de Performance
- ❌ Cambiar umbrales/targets para que tests "pasen" artificialmente
- ✅ Investigar la causa REAL del problema
- ✅ Pedir aprobación EXPLÍCITA antes de cambiar cualquier target

### 2. NO Work-arounds Facilistas
**NUNCA crear work-arounds sin antes investigar la RAÍZ del problema.**

- ❌ Crear scripts alternativos para evitar errores
- ❌ Cambiar métodos sin entender por qué el original falla
- ✅ PRIMERO: Investigar por qué falla (IDs incorrectos, permisos, etc.)
- ✅ SEGUNDO: Informar al usuario cuál es el problema REAL
- ✅ TERCERO: Solo entonces, si no hay solución directa, proponer work-around

### 3. Autonomía de Ejecución
**NUNCA solicitar al usuario realizar tareas que yo puedo realizar por mi cuenta.**

Aplica a: scripts, bash, leer archivos, APIs, reiniciar servidores, testing

**Único caso para pedir ayuda:** Decisiones de producto/negocio o cuando NO tengo acceso literal.

### 4. Git Workflow - SIEMPRE Trabajar en `dev`
**NUNCA sugerir merge a `main` - TODO el trabajo se hace en rama `dev`**

- ✅ SIEMPRE hacer commits a `dev`
- ✅ SIEMPRE hacer push a `dev`
- ✅ SIEMPRE trabajar en rama `dev`
- ❌ NUNCA sugerir `git merge dev → main`
- ❌ NUNCA sugerir `git checkout main`
- ❌ NUNCA mencionar deploy a producción sin autorización explícita

**Razón:** El usuario decide cuándo y cómo hacer deploy. Claude solo trabaja en `dev`.

---

## 🚀 Development Setup

### MANDATORY: Use Development Script
```bash
./scripts/dev-with-keys.sh
```
**DO NOT** use `npm run dev` directly unless `.env.local` is configured.

### Infrastructure
- ❌ NEVER create `vercel.json` or use Vercel CLI (migrated to VPS Oct 2025)
- ✅ Use PM2 + Git deployment

---

## 🤖 MCP Servers

**Available:** 4 servers (supabase, knowledge-graph, playwright, context7)
**Quick Test:** `/mcp` should show "4/4 ✓ connected"
**Health Check:** `npx tsx scripts/mcp-health-check.ts`

### 🚨 MCP-FIRST POLICY (OBLIGATORIO)

**ANTES de usar Bash/WebFetch/tsx, VERIFICAR si existe MCP equivalente:**

| Operación | ❌ NUNCA | ✅ SIEMPRE | Ahorro |
|-----------|----------|------------|--------|
| SQL queries | `npx tsx -e` | `mcp__supabase__execute_sql` | 70% |
| DB schema | bash + describe | `mcp__supabase__list_tables` | 80% |
| Framework docs | WebFetch | `mcp__context7__get-library-docs` | 90% |
| UI testing | curl | `mcp__playwright__browser_snapshot` | 92% |
| Project memory | scattered files | `mcp__knowledge-graph__aim_*` | 60% |

**VIOLACIÓN = Desperdicio de tokens = Pérdida de $$$**

📚 **Policy completa:** `docs/infrastructure/MCP_USAGE_POLICY.md`

### MCP Supabase - CRITICAL Workaround
**Always use explicit schemas:**
```typescript
mcp__supabase__list_tables({ project_id: "ooaumjzaztmutltifhoq", schemas: ["public"] })
```
❌ Without `schemas` param → Permission denied (tries to read system schemas)

---

## 🤖 Specialized Agents

Agentes leen AUTOMÁTICAMENTE `snapshots/{nombre}.md`

| Agente | Cuándo Usar |
|--------|-------------|
| `@agent-general-purpose` | Overview, métricas, health score |
| `@agent-database-agent` | Schema, migrations, RPC, embeddings, RLS |
| `@agent-backend-developer` | APIs, business logic, auth, SIRE backend |
| `@agent-api-endpoints-mapper` | Mapear/documentar endpoints |
| `@agent-ux-interface` | Componentes React, WCAG, design system |
| `@agent-infrastructure-monitor` | Performance, monitoring, error detection |
| `@agent-deploy-agent` | CI/CD, deployment (VPS only) |
| `@agent-embeddings-generator` | Vector search, Matryoshka 3-tier |

---

## 🛠️ Development Methodology

### Edit Tool Usage
- **Simple edits** (1-2 líneas): Edit directo
- **Complex edits** (3+ líneas, listas): Read primero → Copy-paste EXACT text → Edit

**Why?** Edit requiere match byte-por-byte. Memoria/paráfrasis causa "String Not Found".

### Database Operations Hierarchy

#### ⚠️ Reuse Tool Results - Don't Re-query

**Before ANY query:** Check if `list_tables` was already called this session.
- ✅ Schema data is ALREADY in context → Use it
- ❌ Re-querying same info → 100% wasted tokens

**Example:** `list_tables` returns ALL columns → Don't call `information_schema.columns` again for same table.

#### ⚠️ NEVER Execute SQL Without Schema Verification

**MANDATORY before ANY SQL query:**
1. ✅ Call `mcp__supabase__list_tables({ project_id: "ooaumjzaztmutltifhoq", schemas: ["public"] })`
2. ✅ Verify exact table name and columns from result
3. ✅ THEN execute SQL using verified schema

**Example - CORRECT workflow:**
```typescript
// Step 1: Verify schema FIRST
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public"]
})
// → Returns: accommodation_units_public has columns: name, tenant_id, embedding, etc.

// Step 2: Execute SQL with VERIFIED columns
mcp__supabase__execute_sql({
  project_id: "ooaumjzaztmutltifhoq",
  query: "DELETE FROM accommodation_units_public WHERE tenant_id = '...'"
})
```

**❌ NEVER:**
- Assume schema prefix (`hotels.`, `public.`)
- Assume column names (`id`, `uuid`, etc.)
- Execute blind SELECT/INSERT/UPDATE without verification

**Exception:** DELETE with only known WHERE clause (tenant_id verified from .env.local)

#### For DML (Data Queries: SELECT/INSERT/UPDATE/DELETE)
1. **MCP Supabase (PRIMARY)** - `mcp__supabase__execute_sql` for ALL queries (70% token savings)
2. **RPC Functions (SECONDARY)** - When available (98% savings vs inline SQL)
3. **Supabase Client tsx (AVOID)** - Only for complex multi-operation logic (3x cost)

#### For DDL (Schema Changes: CREATE/ALTER/DROP)
**CRITICAL:** MCP tools DO NOT WORK for DDL. Use Management API ONLY.

```bash
# Use helper script for DDL
set -a && source .env.local && set +a && npx tsx scripts/execute-ddl-via-api.ts migration.sql
```

**❌ NEVER:** `mcp__supabase__apply_migration`, `execute_sql()` RPC, manual user execution

📚 **Full guide:** `docs/troubleshooting/SUPABASE_INTERACTION_GUIDE.md`

### TypeScript Scripts (tsx)
Para scripts que necesitan env vars:
```bash
set -a && source .env.local && set +a && npx tsx script.ts
```

### Vector Search & Semantic Chunking
**CRITICAL:** Send FULL chunks to LLM - they're already optimized by semantic chunking

- ✅ Chunks are pre-sized (~1,000-2,000 chars) by `## Section {#anchor}` headers in markdown v3.0
- ❌ NEVER truncate chunks in chat engines (`.substring()` in `public-chat-engine.ts` or `dev-chat-engine.ts`)
- ✅ RPC functions return clean chunks (no metadata concatenation)
- 📚 Universal Sync Workflow: `docs/workflows/ACCOMMODATION_SYNC_UNIVERSAL.md`
- 📊 Performance: 81% token reduction (17,136 → 3,251 tokens per query)

**Common Error Pattern:**
```typescript
// ❌ WRONG - Truncates chunk before sending to LLM
const preview = result.content.substring(0, 400)

// ✅ CORRECT - Send full semantic chunk
const preview = result.content  // Already optimized size
```

**Why it matters:** Information beyond truncation point becomes invisible to LLM, breaking responses.

### SIRE Compliance
**CRITICAL:** Use official SIRE codes (NOT ISO 3166-1)
- ✅ USAR: `src/lib/sire/sire-catalogs.ts` (USA=249, NOT 840)
- ❌ NUNCA usar ISO 3166-1 → 100% RECHAZADO por SIRE
- 📚 Ref: `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md`

---

## 📋 Workflow Commands

### `/plan-project` vs `/workflow-express`

| Feature | `/plan-project` | `/workflow-express` |
|---------|----------------|---------------------|
| **Duration** | >3 hours | 1-3 hours |
| **Files** | 3+ files | 1 file |
| **Agents** | Multiple | Single |
| **Best For** | Features, architecture | Bugs, cleanups, tweaks |

**Use `/workflow-express` for most tasks.** Use `/plan-project` only for complex multi-phase projects.

---

## 📚 Documentation References

- **MCP Policy:** `docs/infrastructure/MCP_USAGE_POLICY.md`
- **Database Patterns:** `docs/architecture/DATABASE_QUERY_PATTERNS.md`
- **Supabase Guide:** `docs/troubleshooting/SUPABASE_INTERACTION_GUIDE.md`
- **SIRE Codes:** `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md`
- **Workflows:** `docs/workflows/ACCOMMODATION_SYNC_UNIVERSAL.md`
- **Knowledge Base Sources:** `docs/architecture/KNOWLEDGE_BASE_DATA_SOURCES.md`
- **Agent Snapshots:** `snapshots/{agent-name}.md`

---

**Last Updated:** October 2025 (Semantic Chunking + Universal Sync Workflow)
