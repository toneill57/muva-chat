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

**Docs:** `docs/deployment/VPS_SETUP_GUIDE.md`

---

## 🚨 BLOCKER CRÍTICO: Sistema Dual de Conversaciones

**Problema:** Dos tablas de conversaciones activas simultáneamente:
- `chat_conversations` (legacy): 5 conv, 64 mensajes
- `guest_conversations` (nuevo): 2 conv, 0 mensajes

**ROOT CAUSE:**
- `src/lib/guest-auth.ts:193-246` - Función `getOrCreateConversation()`
- Busca/crea en tabla legacy en lugar de nueva tabla
- Mensajes se guardan en legacy, conversaciones nuevas quedan vacías

**Próximo Paso: FASE 2.4.4** (⚠️ EJECUTAR PRIMERO)
- Modificar `guest-auth.ts` para usar `guest_conversations`
- Eliminar `conversation_id` de `GuestSession` interface
- Ver `plan.md` FASE 2.4 para plan completo

**Referencias:**
- 📄 Investigación: `side-todo.md` (1,150 líneas)
- 📋 Tareas: `TODO.md` sección FASE 2.4
- 📖 Plan: `plan.md` FASE 2.4
- 🎯 Prompts: `guest-portal-compliance-workflow.md`

---

## 🎯 CURRENT PROJECT

**Proyecto:** Guest Portal Multi-Conversation + Compliance Module

**Archivos Clave:**
- `plan.md` (1,720+ líneas) - Arquitectura completa, 7 fases
- `TODO.md` (850+ líneas) - Tareas organizadas
- `guest-portal-compliance-workflow.md` (1,310 líneas) - Prompts ejecutables
- `side-todo.md` (1,150 líneas) - Investigación BLOCKER

**Status Fases:**
- ✅ FASE 1: Subdomain Infrastructure
- ✅ FASE 2.1-2.3: Multi-Conversation Foundation (migrations, APIs, UI)
- ⚠️ **FASE 2.4: Database Migration (BLOCKER CRÍTICO)**
- ✅ FASE 2.5: Multi-Modal file upload
- ✅ FASE 2.6: Conversation Intelligence
- ✅ FASE 3.1: Compliance Chat Engine
- ✅ FASE 3.4: Compliance UI Two-Layer Architecture
- ⏳ FASE 3.5: Integration End-to-End (bloqueado por 2.4)
- 📅 FASE 4-7: Pending

**Stack:**
- Next.js 15, Supabase PostgreSQL + pgvector
- Anthropic Claude (chat), OpenAI (embeddings Matryoshka)
- Puppeteer (SIRE), REST API (TRA MinCIT)

---

## 🤖 Specialized Agents

**Primary Agents:**
- `@backend-developer` (60%) - APIs, Backend logic, Compliance engine
- `@ux-interface` (30%) - UI Components, Frontend
- `@database-agent` (5%) - Migrations, DB operations

**Support Agents:**
- `@embeddings-generator` - SIRE embeddings
- `@deploy-agent` - Deployment workflow

Ver `.claude/agents/` para instrucciones completas.

---

## 🚦 Getting Started

### For New Conversations
1. Read `plan.md` for project context
2. Read `TODO.md` for current tasks
3. Use prompts from `guest-portal-compliance-workflow.md`
4. Invoke appropriate agent

### Development Methodology

**API Testing (CRITICAL):**
1. **MCP tools (PRIMARY)** - Database operations and SQL queries
2. **fetch() (SECONDARY)** - API endpoint testing
3. **curl (EMERGENCY ONLY)** - Only when other methods fail

**VSCode Sync:**
- Auto-save enabled (`files.autoSave: "afterDelay"`)
- Auto-refresh for external changes

---

**Last Updated:** Oct 5, 2025
**Current Focus:** FASE 2.4 Database Migration (BLOCKER)
**Next Step:** Ejecutar FASE 2.4.4 (modificar `guest-auth.ts`)
