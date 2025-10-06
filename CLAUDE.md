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

**Current Focus:** Guest Portal Multi-Conversation + Compliance Module (SIRE + TRA)

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

## 🎯 CURRENT PROJECT

**Project Status:** We are making an analysis to determine where to go next.

**Stack:**
- Next.js 15, Supabase PostgreSQL + pgvector
- Anthropic Claude (chat), OpenAI (embeddings Matryoshka)
- Puppeteer (SIRE), REST API (TRA MinCIT)

---

## 🤖 Specialized Agents

**Primary Agents:**
- `@backend-developer` - APIs, Backend logic, Compliance engine
- `@ux-interface` - UI Components, Frontend
- `@database-agent` - Migrations, DB operations

**Support Agents:**
- `@embeddings-generator` - SIRE embeddings
- `@deploy-agent` - Deployment workflow

Ver `.claude/agents/` para instrucciones completas.

---

## 🚦 Getting Started

### Workflow for New Conversations

**Step 1: Understand Context**
- Read `plan.md` - Overall project architecture and roadmap
- Read `TODO.md` - Current tasks and priorities
- Check `docs/projects/` - Specific project documentation

**Step 2: Choose Approach**
- For backend work → Invoke `@backend-developer` agent
- For UI/UX work → Invoke `@ux-interface` agent
- For database changes → Invoke `@database-agent` agent
- For general tasks → Work directly or use `@general-purpose` agent

**Step 3: Execute**
- Follow existing code patterns in the codebase
- Test thoroughly using MCP tools (see Development Methodology below)
- Document changes in appropriate `docs/projects/` directory

### Development Methodology

**API Testing (CRITICAL):**
1. **MCP tools (PRIMARY)** - Database operations and SQL queries
2. **fetch() (SECONDARY)** - API endpoint testing
3. **curl (EMERGENCY ONLY)** - Only when other methods fail

**VSCode Sync:**
- Auto-save enabled (`files.autoSave: "afterDelay"`)
- Auto-refresh for external changes

---

**Last Updated:** Oct 6, 2025
**Status:** Analysis phase - determining next steps
