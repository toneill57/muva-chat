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

## 🎯 CURRENT PROJECT: VPS Deployment Migration (Oct 4, 2025)

### Objective
Migrar deployment de InnPilot de Vercel a VPS Hostinger (innpilot.io) con CI/CD automático via GitHub Actions.

### Project Files
- 📄 **Plan**: `plan.md` (610 líneas) - Arquitectura completa, 5 fases
- 📋 **Tasks**: `TODO.md` (208 líneas) - 28 tareas organizadas
- 🎯 **Prompts**: `vps-deployment-workflow.md` (650 líneas) - Prompts ejecutables por fase

### Status
- **Planning**: ✅ Complete
- **FASE 1**: 🔜 Ready to start (Limpieza Vercel - 1h)
- **FASE 2**: Pending (GitHub Actions Workflow - 2h)
- **FASE 3**: Pending (VPS Setup Guide - 3h)
- **FASE 4**: Pending (Deploy Agent Refactor - 1h)
- **FASE 5**: Pending (Testing & Documentation - 1h)

### Key Specs
- **VPS Provider**: Hostinger (Ubuntu 22.04 LTS)
- **Domain**: innpilot.io (already configured)
- **CI/CD**: GitHub Actions (push to main = auto-deploy)
- **Infrastructure**: Nginx + PM2 cluster mode + Let's Encrypt SSL
- **Timeline**: 8 horas total

### Success Criteria
- Push to main auto-deploys to VPS in < 5min
- Application accessible at https://innpilot.io
- All API endpoints working
- SSL certificate valid (A+ rating)
- PM2 process stable
- Response time ≤ 0.500s (comparable to Vercel)

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
├── plan.md                                # 🎯 VPS migration plan (610 líneas)
├── TODO.md                                # 📋 28 tareas (208 líneas)
├── vps-deployment-workflow.md             # 🚀 Prompts ejecutables (650 líneas)
├── .github/
│   └── workflows/
│       └── deploy.yml                    # [TO CREATE] GitHub Actions
├── docs/
│   └── deployment/                       # [TO CREATE] VPS guides
│       ├── VPS_SETUP_GUIDE.md
│       ├── GITHUB_SECRETS.md
│       ├── ecosystem.config.js
│       └── nginx-innpilot.conf
├── scripts/
│   └── vps-setup.sh                      # [TO CREATE] Automated VPS setup
├── vercel.json                            # [TO DELETE]
└── .claude/
    └── agents/
        ├── backend-developer.md          # [TO UPDATE]
        └── deploy-agent.md               # [TO REFACTOR]
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
3. Use prompts from `vps-deployment-workflow.md`
4. Invoke `@backend-developer` for deployment tasks

### Quick Start FASE 1
```bash
# Context prompt (copy-paste to new conversation)
CONTEXTO: VPS Deployment Migration

Estoy en el proyecto "VPS Deployment Migration".
- Plan: plan.md (610 líneas)
- Tareas: TODO.md (28 tareas)
- Prompts: vps-deployment-workflow.md (650 líneas)

Próxima fase: FASE 1 (Limpieza de Vercel)
Agente: @backend-developer

Por favor lee los archivos y ejecuta Prompt 1.1
```

---

**Last Updated**: Oct 4, 2025
**Current Focus**: Fixed Layout Migration - FASE 1 Ready
