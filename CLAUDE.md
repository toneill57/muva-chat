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

## 🎯 CURRENT PROJECT: Mobile-First Chat Interface (Oct 2025)

### Objective
Create a **fullscreen mobile-first chat interface** optimized for iPhone 15/14, Google Pixel 8, Samsung Galaxy S24. Clean UX, no marketing clutter, 100% focused on conversation.

### Project Files
- 📄 **Plan**: `plan.md` (412 lines) - Complete architecture & phases
- 📋 **Tasks**: `TODO.md` (300+ lines) - Organized by FASE 1-4
- 🎯 **Prompts**: `mobile-first-prompt-workflow.md` - Ready-to-use prompts per phase

### Status
- **Planning**: ✅ Complete
- **FASE 1**: 🔜 Ready to start (Structure base)
- **FASE 2**: Pending (Mobile optimizations)
- **FASE 3**: Pending (Feature parity)
- **FASE 4**: Pending (Polish & performance)

### Key Specs
- **Layout**: Header (60px) + Messages (flex-1) + Input (80px)
- **Safe Areas**: `env(safe-area-inset-top/bottom)` for notch/home bar
- **Viewports**: 360px - 430px width support
- **Features**: Streaming SSE, markdown, typing dots, photo carousel
- **Performance**: Lighthouse ≥90, 60fps animations

---

## 🤖 Specialized Agents

### ux-interface (PRIMARY)
**Responsible for:** All UI/UX implementation of Mobile-First Chat
- Creates: `src/app/chat-mobile/page.tsx`, `src/components/Dev/DevChatMobile.tsx`
- Handles: Layout, animations, safe areas, responsive design, a11y
- See: `.claude/agents/ux-interface.md` for complete instructions

### Other Agents
- **deploy-agent**: Automated commits → deploy → verification
- **embeddings-generator**: SIRE embeddings processing
- **backend-developer**: API/database support (minimal for this project)

---

## 📂 Project Structure

```
/Users/oneill/Sites/apps/InnPilot/
├── plan.md                           # 🎯 Project plan (read first)
├── TODO.md                           # 📋 Tasks by phase
├── mobile-first-prompt-workflow.md   # 🚀 Execution prompts
├── src/
│   ├── app/
│   │   └── chat-mobile/              # [TO CREATE] Mobile chat page
│   └── components/
│       └── Dev/
│           ├── DevChatInterface.tsx  # [REFERENCE] Base code
│           └── DevChatMobile.tsx     # [TO CREATE] Mobile version
└── .claude/
    └── agents/
        └── ux-interface.md           # Agent instructions
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
3. Use prompts from `mobile-first-prompt-workflow.md`
4. Invoke `@ux-interface` for UI work

### Quick Start FASE 1
```bash
# Context prompt (copy-paste to new conversation)
CONTEXTO: Mobile-First Chat Interface

Estoy en el proyecto "Mobile-First Chat Interface".
- Plan: plan.md
- Tareas: TODO.md
- Prompts: mobile-first-prompt-workflow.md

Próxima fase: FASE 1 (Estructura Base)
Agente: @ux-interface

Por favor lee los archivos y ejecuta Prompt 1.1
```

---

**Last Updated**: Oct 3, 2025
**Current Focus**: Mobile-First Chat Interface - FASE 1 Ready
