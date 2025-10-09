# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🚨 REGLA CRÍTICA: NO Modificar Targets de Performance

**PROHIBIDO:**
- ❌ Cambiar umbrales/targets para que tests "pasen" artificialmente
- ❌ Modificar definiciones de éxito sin consultar al usuario
- ❌ Justificar bajo performance cambiando expectativas

**CORRECTO:**
- ✅ Investigar la causa REAL del problema
- ✅ Proponer soluciones técnicas REALES
- ✅ Pedir aprobación EXPLÍCITA antes de cambiar cualquier target

---

## Project Overview

InnPilot is a modern web platform for managing hotel operations with AI-powered conversational interfaces.

---

## 🚀 MCP SERVERS - Token Optimization Infrastructure

**Status:** ✅ 5/5 Connected (claude-context, knowledge-graph, memory-keeper, context7, supabase)

**Benefit:** ~40-60% token reduction via semantic code search + persistent memory

**Active Servers:**
- **claude-context**: Semantic code search (818 files indexed, 33,257 chunks)
- **knowledge-graph**: Entity relationships (local storage)
- **memory-keeper**: Architectural decisions (SQLite)
- **context7**: Official docs (React 19, Next.js 15, TypeScript)
- **supabase**: Database operations (20+ tools)

**Verification:** Run `/mcp` in Claude Code → Expect "5/5 ✓ connected"

## 🚀 Development Setup

### MANDATORY: Use Development Script
```bash
./scripts/dev-with-keys.sh
```

**Benefits:**
- Auto-cleanup (kills orphaned processes, frees port 3000)
- Exports API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY)
- Graceful shutdown (Ctrl+C cleans up properly)

**DO NOT use `npm run dev` directly** unless `.env.local` is configured.

---

## 🚫 OBSOLETE: Vercel Infrastructure

**⚠️ CRITICAL:** InnPilot migrated from Vercel to VPS Hostinger (Oct 4, 2025).

**NEVER create:**
- ❌ `vercel.json` - Use VPS cron instead
- ❌ Vercel CLI commands - Use PM2 + Git deployment

**Current Infrastructure:** VPS Hostinger + Nginx + PM2 + Let's Encrypt SSL

---

## 🤖 Specialized Agents

**Workflow:** Agente lee AUTOMÁTICAMENTE `snapshots/{nombre}.md` cuando es invocado (~88% token savings: 35K → 2-4K).

| Agente | Snapshot | Cuándo Usar |
|--------|----------|-------------|
| `@agent-general-purpose` | `general-snapshot.md` | Overview general, métricas proyecto, health score |
| `@agent-database-agent` | `database-agent.md` | Schema, migrations, RPC functions, embeddings, RLS |
| `@agent-backend-developer` | `backend-developer.md` | APIs, business logic, auth, integrations, SIRE backend |
| `@agent-api-endpoints-mapper` | `api-endpoints-mapper.md` | Mapear/documentar endpoints, auth patterns |
| `@agent-ux-interface` | `ux-interface.md` | Componentes React, accesibilidad WCAG, design system |
| `@agent-infrastructure-monitor` | `infrastructure-monitor.md` | Performance, monitoring, VPS, error detection (auto-invoca) |
| `@agent-deploy-agent` | `deploy-agent.md` | CI/CD, deployment, secrets, rollbacks (⚠️ VPS solo, NO Vercel) |
| `@agent-embeddings-generator` | `embeddings-generator.md` | Vector search, Matryoshka 3-tier, embeddings generation |

**Actualización:** Agentes actualizan su snapshot después de cambios importantes (no SNAPSHOT.md - solo milestones)

---

### ⚠️ CRITICAL: Verify Hooks Are Active

**Status Check:**
```bash
# Test if hooks are working
ls /nonexistent_directory_12345  # Intentional error
ls -la .claude/errors.jsonl      # Should exist if hooks active

# ✅ If file exists → Hooks working
# ❌ If file doesn't exist → Hooks NOT enabled
```

**If hooks NOT working:**
- See complete guide: `docs/development/CLAUDE_HOOKS_SETUP.md`
- Enable in Claude Code settings (post-tool-use hook)
- Test again with intentional error

**Discovered:** October 6, 2025 during health check - hooks existed but weren't enabled in Claude Code settings.

---

## 🧹 Context Management Policy

**Resumen acumulado después de /clear:**
- Primera conversación: Inicia limpia
- Cada /clear: Agrega ~5-10K tokens de resumen
- **LÍMITE: 10-15 /clear máximo** (~100-150K tokens acumulados)

**Cuando llegues a 10-15 /clear (señales):**
- Claude menciona cosas muy antiguas irrelevantes
- Respuestas se vuelven lentas
- Claude "confunde" contexto de diferentes fases del proyecto

**Hard Reset Workflow:**
1. Actualiza SNAPSHOT.md con estado actual del proyecto
2. Cierra Claude Code completamente
3. Abre nueva sesión en el proyecto (conversación limpia)
4. Claude lee SNAPSHOT.md como contexto fresco (sin resúmenes acumulados)

**Best Practice:** Usa SNAPSHOT.md como "external memory" - actualízalo después de cada milestone importante en lugar de depender de resúmenes acumulados.

---

## Development Methodology

**🛠️ Tool Usage: Edit Tool**

**Rule:** Use workflow híbrido según complejidad

- **Simple edits** (títulos, 1-2 líneas únicas): Edit directo
- **Complex edits** (listas 3+ líneas, sub-bullets): Read JUSTO antes → Copy-paste EXACT text → Edit

**Why?** Edit requiere match byte-por-byte. Usar memoria/paráfrasis causa "String Not Found".

**Trade-off:** Read previo +500 tokens pero 100% éxito vs edit directo 280 tokens promedio (70% éxito, 30% retry).

---

**Database Operations (CRITICAL):**
1. **RPC Functions (PRIMARY)** - Use dedicated functions like `get_accommodation_unit_by_id()`
   - Type-safe, documented, tested
   - Pre-compiled in database (faster)
   - Single source of truth for business logic
2. **Direct SQL via MCP (SECONDARY)** - For ad-hoc analysis and reporting only
   - `mcp__supabase__execute_sql("SELECT COUNT(*) FROM table")`
   - Acceptable for one-time queries during development
3. **execute_sql() RPC (EMERGENCY ONLY)** - Only for migrations and one-time fixes
   - `supabase.rpc('execute_sql', { query: '...' })`
   - DO NOT use in regular scripts, API endpoints, or scheduled jobs

**Why this hierarchy?**
- RPC functions reduce context window by 90-98% (October 2025: 98.1% measured - 17,700→345 tokens)
- Better error handling and type safety
- Easier schema evolution (change in 1 place vs N places)
- Production-ready performance optimization
- 📖 Complete documentation: `docs/architecture/DATABASE_QUERY_PATTERNS.md`

**NEVER use execute_sql() in:**
- Regular application code
- Scheduled scripts (sync, cron jobs)
- API endpoints
- Any code that runs more than once

---

**Last Updated:** October 2025
