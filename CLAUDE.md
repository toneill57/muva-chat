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

**Ejemplos de errores comunes a investigar PRIMERO:**
- IDs inventados en lugar de usar los correctos del .env.local
- Permisos de MCP que requieren parámetros específicos
- Env vars no cargadas correctamente

### 3. Autonomía de Ejecución
**NUNCA solicitar al usuario realizar tareas que yo puedo realizar por mi cuenta.**

Aplica a: scripts, bash, leer archivos, APIs, reiniciar servidores, testing

**Único caso para pedir ayuda:** Decisiones de producto/negocio o cuando NO tengo acceso literal.

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

**Available:** 4 servers (supabase, knowledge-graph, memory-keeper, context7)
**Quick Test:** `/mcp` should show "4/4 ✓ connected"

### MCP Supabase - CRITICAL Workaround
**Always use explicit schemas:**
```typescript
mcp__supabase__list_tables({ project_id: "ooaumjzaztmutltifhoq", schemas: ["public"] })
```
❌ Without `schemas` param → Permission denied (tries to read system schemas)
📚 Docs: `docs/troubleshooting/MCP_SUPABASE_LIST_TABLES_WORKAROUND.md`

### Semantic Code Search (pgvector)
- **Search:** `npx tsx scripts/semantic-search-pgvector.ts "query"`
- **Re-index:** `npx tsx scripts/generate-embeddings.ts`
- **Table:** `code_embeddings` (4,333 embeddings, OpenAI text-embedding-3-small)

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

#### For DML (Data Queries: SELECT/INSERT/UPDATE/DELETE)
1. **Supabase Client (PRIMARY)** - Use `npx tsx -e` with createClient() for day-to-day queries. Use `|| ''` instead of `!` operator.
2. **RPC Functions (SECONDARY)** - `get_accommodation_unit_by_id()`, `get_sire_statistics()`
3. **Direct SQL via MCP (LAST RESORT)** - Emergency only with `mcp__supabase__execute_sql`

#### For DDL (Schema Changes: CREATE/ALTER/DROP)
**CRITICAL:** MCP Supabase tools (`mcp__supabase__apply_migration`, `mcp__supabase__execute_sql`) **DO NOT WORK** for DDL due to permission issues.

**✅ CORRECT METHOD** - Supabase Management API:
```bash
curl -X POST "https://api.supabase.com/v1/projects/{PROJECT_ID}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query":"CREATE OR REPLACE FUNCTION..."}'
```

**Use helper script**: `scripts/execute-ddl-via-api.ts`
```bash
set -a && source .env.local && set +a && npx tsx scripts/execute-ddl-via-api.ts path/to/migration.sql
```

**❌ NEVER USE**:
- `mcp__supabase__apply_migration` - Permission denied
- `mcp__supabase__execute_sql` for DDL - Permission denied
- `execute_sql()` RPC - Fails silently, returns success but doesn't execute DDL
- Manual user execution - Violates autonomy principle

**Why Management API?** It's the ONLY method that works programmatically for DDL without manual intervention.

### Supabase Best Practices

**Project ID:** `ooaumjzaztmutltifhoq` (from `.env.local`)
- ❌ NEVER invent IDs
- ✅ ALWAYS use explicit `schemas: ["public"]` in MCP calls

**Database Hierarchy:**
- **Schema inspection:** MCP `list_tables` (must use `schemas` param)
- **DML queries:** RPC functions > Direct SQL via MCP
- **DDL changes:** Management API ONLY (`scripts/execute-ddl-via-api.ts`)

**Quick Commands:**
```bash
# List tables: mcp__supabase__list_tables({ project_id: "...", schemas: ["public"] })
# DDL: set -a && source .env.local && set +a && npx tsx scripts/execute-ddl-via-api.ts migration.sql
```

📚 Docs: `docs/troubleshooting/SUPABASE_INTERACTION_GUIDE.md`

### TypeScript Scripts (tsx)
Para scripts que necesitan env vars:
```bash
set -a && source .env.local && set +a && npx tsx script.ts
```

### SIRE Compliance Helpers
**CRITICAL:** Use official SIRE codes (NOT ISO 3166-1)
- ✅ USAR: `src/lib/sire/sire-catalogs.ts` (códigos SIRE oficiales)
  - `getSIRECountryCode()` - Fuzzy search en 250 países (USA=249, NOT 840)
  - `getDIVIPOLACityCode()` - Fuzzy search en 1,122 ciudades colombianas
  - `formatDateToSIRE()` - DB format (YYYY-MM-DD) → SIRE (dd/mm/yyyy)
- ❌ NUNCA usar ISO 3166-1 (USA=840❌, usar USA=249✅)
- ⚠️ 100% de archivos TXT con ISO codes serán RECHAZADOS por SIRE
- 📚 Ref: `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md`

---

## 📋 Workflow Commands

### `/plan-project` - Traditional Multi-Phase Planning

**Use when:**
- Project requires >3 hours of work
- Needs multi-phase execution (FASE 1, 2, 3...)
- Requires multiple specialized agents
- Complex architecture or coordination needed

**Generates:**
- `docs/projects/{name}/plan.md` - Complete project plan
- `docs/projects/{name}/TODO.md` - Tasks organized by phases
- `docs/projects/{name}/{name}-prompt-workflow.md` - Ready-to-use prompts
- Updates `snapshots/{agent}.md` with CURRENT PROJECT section

**Characteristics:**
- Comprehensive planning (100-500+ lines per file)
- Agent coordination via snapshots
- Phase-based execution
- Detailed documentation per phase
- Higher context usage (~100k tokens)

**Examples:**
- Mobile-first chat interface (6 phases, 25 tasks)
- SIRE compliance system (4 phases, 18 tasks)
- Multi-tenant architecture refactor

### `/workflow-express` - Rapid Task Execution

**Use when:**
- Task is focused and specific (1-3 hours max)
- Well-defined scope (2-5 tasks)
- Single-agent execution
- No complex coordination needed

**Generates:**
- `docs/projects/{name}/workflow-express.md` - Single-file workflow
- Includes copy-paste ready prompt with delimiters
- Self-contained execution plan

**Characteristics:**
- Compact single file (~500 lines)
- Immediate execution (no multi-file planning)
- TodoList-driven tracking
- Testing + commits per task
- Lower context usage (~20k tokens)

**Examples:**
- Fix health check endpoint (3 tasks, 1.5h)
- Cleanup legacy references (5 tasks, 2h)
- Add rate limiting (4 tasks, 2.5h)

### Comparison Matrix

| Feature | `/plan-project` | `/workflow-express` |
|---------|----------------|---------------------|
| **Duration** | >3 hours | 1-3 hours |
| **Files Generated** | 3+ files | 1 file |
| **Agents** | Multiple | Single |
| **Context Usage** | High (~100k) | Low (~20k) |
| **Planning Depth** | Comprehensive | Focused |
| **Best For** | Features, architecture | Bugs, cleanups, tweaks |
| **Execution** | Multi-session phases | Single session |
| **Documentation** | Per-phase docs | Inline docs |

### Usage Workflow

**For Express Tasks (Recommended for most):**
```bash
1. /workflow-express
2. Fill in project details
3. Review generated workflow
4. /clear
5. Copy-paste PROMPT (between ⬇️ and ⬆️)
6. Execute with TodoList tracking
```

**For Complex Projects:**
```bash
1. /plan-project
2. Answer planning questions
3. Review plan.md + TODO.md + workflow.md
4. Start FASE 1 using workflow prompts
5. Execute phase by phase
6. Document each phase completion
```

---

## 📚 Documentation References

- **MCP Setup:** `docs/optimization/MCP_SERVERS_RESULTS.md`
- **Database Patterns:** `docs/architecture/DATABASE_QUERY_PATTERNS.md`
- **SIRE Compliance:** `docs/features/sire-compliance/CODIGOS_OFICIALES.md`
- **SIRE vs ISO:** `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md` (códigos oficiales)
- **Agent Snapshots:** `snapshots/{agent-name}.md`

---

**Last Updated:** October 2025
