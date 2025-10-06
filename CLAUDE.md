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

## 🎯 CURRENT PROJECT: SIRE Compliance Data Extension

**Status:** Planning Complete - Ready for FASE 1
**Date:** October 6, 2025
**Objective:** Extend `guest_reservations` table with 9 missing SIRE compliance fields

### Quick Context

**Problem Identified:**
- `guest_reservations` has only 4/13 SIRE-required fields
- Missing: `document_type`, `document_number`, `birth_date`, `first_surname`, `second_surname`, `given_names`, `nationality_code`, `origin_country_code`, `destination_country_code`
- Compliance chat extracts data but has nowhere to persist it in the reservation

**Solution:** 3-phase implementation (7 hours estimated)

### Project Files

**Planning Documents:**
- `plan.md` (620 lines) - Complete project plan with technical specs
- `TODO.md` (190 lines) - 15 tasks with agent assignments and time estimates
- `sire-compliance-prompt-workflow.md` (950 lines) - 16 copy-paste ready prompts

**Reference Documents:**
- `docs/sire/FASE_3.1_ESPECIFICACIONES_CORREGIDAS.md` - SIRE field specifications
- `docs/sire/CODIGOS_OFICIALES.md` - Official SIRE codes (document types, countries)
- `src/lib/sire/field-mappers.ts` - Conversational → SIRE data mappers

### Phase Overview

**FASE 1 - Database Migration** (~2h 15min) - `@agent-database-agent`
- Create migration with 9 SIRE fields (all nullable)
- Add validation constraints (document types, formats)
- Create search indexes (document_number, nationality_code)
- Migrate existing data from `compliance_submissions.data` (JSONB)

**FASE 2 - Backend Integration** (~3h 15min) - `@agent-backend-developer`
- Update TypeScript types (`GuestReservation` interface)
- Create `updateReservationWithComplianceData()` function
- Integrate into compliance chat flow
- Update `/api/reservations/list` to return SIRE fields
- Create sync helper script (`scripts/sync-compliance-to-reservations.ts`)

**FASE 3 - Testing & Validation** (~2h 45min) - Both agents
- SQL validation queries
- End-to-end test (8 steps)
- Data migration validation
- Performance testing (< 50ms target)
- Rollback script
- Document results

### How to Start

**For Database Agent:**
```bash
# Use Prompt 1.1 from sire-compliance-prompt-workflow.md
@agent-database-agent create the SIRE fields migration following plan.md FASE 1.1
```

**For Backend Developer:**
```bash
# Wait for FASE 1 complete, then use Prompt 2.1
@agent-backend-developer update TypeScript types with SIRE fields following plan.md FASE 2.1
```

### Success Criteria
- ✅ Migration applied on dev branch
- ✅ All constraints enforcing valid SIRE data
- ✅ Existing data migrated from `compliance_submissions`
- ✅ API returns SIRE fields
- ✅ End-to-end test passes (8/8 steps)
- ✅ Performance baseline maintained (< 50ms queries)

---

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

**Agentes disponibles:** Ver `.claude/agents/` para lista completa, capacidades y cuándo usar cada uno.

**🚨 Infrastructure Monitor Proactivo:**
- Se invoca AUTOMÁTICAMENTE cuando `.claude/errors.jsonl` existe (creado por hooks)
- Presenta diagnóstico de errores + soluciones al finalizar tareas
- No necesitas invocarlo manualmente (Claude lo detecta y delega)

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
