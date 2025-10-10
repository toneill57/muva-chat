# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
1. **RPC Functions (PRIMARY)** - `get_accommodation_unit_by_id()`, `get_sire_statistics()`
2. **Direct SQL via MCP (SECONDARY)** - Ad-hoc analysis only with `mcp__supabase__execute_sql`

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
- 📚 Ref: `docs/sire/CODIGOS_SIRE_VS_ISO.md`

---

## 📚 Documentation References

- **MCP Setup:** `docs/optimization/MCP_SERVERS_RESULTS.md`
- **Database Patterns:** `docs/architecture/DATABASE_QUERY_PATTERNS.md`
- **SIRE Compliance:** `docs/sire/CODIGOS_OFICIALES.md`
- **SIRE vs ISO:** `docs/sire/CODIGOS_SIRE_VS_ISO.md` (códigos oficiales)
- **Agent Snapshots:** `snapshots/{agent-name}.md`

---

**Last Updated:** October 2025
