# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🚨 REGLA CRÍTICA: NO Modificar Targets de Performance

**PROHIBIDO ABSOLUTAMENTE:**
- ❌ Cambiar umbrales/targets para que tests "pasen" artificialmente
- ❌ Modificar definiciones de éxito sin consultar al usuario
- ❌ Usar "targets realistas/aceptables" cuando hay un target específico definido
- ❌ Justificar bajo performance cambiando expectativas

**CORRECTO:**
- ✅ Si un test falla, investigar la causa REAL del problema
- ✅ Proponer soluciones técnicas REALES para mejorar performance
- ✅ Comunicar honestamente cuando algo no cumple target
- ✅ Pedir aprobación EXPLÍCITA antes de cambiar cualquier target

**Ejemplo de ERROR cometido (Oct 2025):**
```
Target original: <100ms búsqueda vectorial
Performance real: 586ms
❌ MAL: Cambiar target a 750ms para que "pase"
✅ BIEN: Implementar cache de embeddings para reducir a <100ms
```

**Si un target es técnicamente inalcanzable:**
1. Explicar POR QUÉ no se puede alcanzar (con datos/mediciones)
2. Mostrar análisis técnico detallado
3. Proponer target alternativo CON JUSTIFICACIÓN
4. Esperar aprobación EXPLÍCITA del usuario antes de cambiar

---

## Project Overview

InnPilot is a modern web platform for managing hotel operations with AI-powered conversational interfaces. Currently focused on **Mobile-First Chat Interface** development.

---

## 🚀 Development Setup

### MANDATORY: Use Development Script
```bash
./scripts/dev-with-keys.sh
```

**Why this script:**
- ✅ Auto-cleanup (kills orphaned processes, frees port 3000)
- ✅ Exports API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY)
- ✅ Graceful shutdown (Ctrl+C cleans up properly)
- ✅ Error handling (verifies port availability)

**DO NOT use `npm run dev` directly** unless `.env.local` is configured and you handle cleanup manually.

### Common Commands
```bash
# Development
./scripts/dev-with-keys.sh          # Start dev server
npm run build                       # Build for production
npm start                           # Run production build

# Testing
npm test                            # Run all tests
npm run lint                        # Lint code
```

---

## 🎯 CURRENT PROJECT: Fixed Layout Migration (Oct 4, 2025)

### Objective
Migrate chat mobile architecture from **flexbox (`flex-1`)** to **`position: fixed`** to prepare for header expansible (date fields, photo cards, templates) without breaking scroll behavior.

### Project Files
- 📄 **Plan**: `plan.md` (415 lines) - Complete architecture & 4 phases
- 📋 **Tasks**: `TODO.md` (280 lines) - 28 tasks organized by FASE
- 🎯 **Prompts**: `fixed-layout-migration-prompt-workflow.md` (650 lines) - Ready-to-use prompts per phase

### Status
- **Planning**: ✅ Complete
- **FASE 1**: 🔜 Ready to start (Migración DevChatMobileDev.tsx - 2h)
- **FASE 2**: Pending (Testing Exhaustivo Dev - 1h)
- **FASE 3**: Pending (Migración ChatMobile.tsx - 1h)
- **FASE 4**: Pending (Testing Final + Validación - 1h)

### Key Changes
- **Wrapper**: Remove `flex flex-col h-screen` → Simple `<div>`
- **Messages**: Change `flex-1` → `fixed` with explicit `top/bottom`
- **Header/Input**: No changes (already `fixed`, correct)
- **Goal**: Header can grow dynamically (date fields, cards) without breaking messages scroll

### Success Criteria
- Zero breaking changes in functionality
- Scroll behavior identical to before
- Pull-to-refresh works
- Safe areas correct (iPhone/Android)
- Lighthouse ≥90, 60fps scroll

---

## 🤖 Specialized Agents

### ux-interface (PRIMARY)
**Responsible for:** Fixed Layout Migration (all 4 phases)
- Modifies: `src/components/Dev/DevChatMobileDev.tsx`, `src/components/Public/ChatMobile.tsx`
- Handles: Layout migration (flexbox → fixed), testing exhaustivo, documentación
- See: `.claude/agents/ux-interface.md` for complete instructions

### Other Agents
- **deploy-agent**: Automated commits → deploy → verification
- **embeddings-generator**: SIRE embeddings processing
- **backend-developer**: API/database support (minimal for this project)

---

## 📂 Project Structure

```
/Users/oneill/Sites/apps/InnPilot/
├── plan.md                                # 🎯 Project plan (415 lines)
├── TODO.md                                # 📋 Tasks (28 tasks, 280 lines)
├── fixed-layout-migration-prompt-workflow.md  # 🚀 Execution prompts (650 lines)
├── src/
│   └── components/
│       ├── Dev/
│       │   └── DevChatMobileDev.tsx       # [TO MODIFY] FASE 1
│       └── Public/
│           └── ChatMobile.tsx             # [TO MODIFY] FASE 3
├── docs/
│   └── fixed-layout-migration/            # Documentation by fase
│       ├── fase-1/ fase-2/ fase-3/ fase-4/
│       └── README.md
└── .claude/
    └── agents/
        └── ux-interface.md                # Agent instructions (updated)
```

---

## 🔧 Development Methodology

### API Testing (CRITICAL)
**NEVER use curl** - system has curl pre-approved but project requires:
1. **MCP tools (PRIMARY)** - For database operations and SQL queries
2. **fetch() (SECONDARY)** - For API endpoint testing
3. **curl (EMERGENCY ONLY)** - Only when other methods fail

### VSCode Sync
- Auto-save enabled (`files.autoSave: "afterDelay"`)
- Auto-refresh for external changes
- Git auto-refresh configured

---

## 🚦 Getting Started

### For New Conversations
1. Read `plan.md` for project context
2. Read `TODO.md` for current tasks
3. Use prompts from `fixed-layout-migration-prompt-workflow.md`
4. Invoke `@ux-interface` for layout migration

### Quick Start FASE 1
```bash
# Context prompt (copy-paste to new conversation)
CONTEXTO: Fixed Layout Migration

Estoy en el proyecto "Fixed Layout Migration".
- Plan: plan.md (415 líneas)
- Tareas: TODO.md (28 tareas)
- Prompts: fixed-layout-migration-prompt-workflow.md (650 líneas)

Próxima fase: FASE 1 (Migración DevChatMobileDev.tsx)
Agente: @ux-interface

Por favor lee los archivos y ejecuta Prompt 1.1
```

---

**Last Updated**: Oct 4, 2025
**Current Focus**: Fixed Layout Migration - FASE 1 Ready
