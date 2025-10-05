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

InnPilot is a modern web platform for managing hotel operations with AI-powered conversational interfaces. Currently focused on **Guest Portal Multi-Conversation Architecture with Integrated Compliance Module**.

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

## 🚫 OBSOLETE INFRASTRUCTURE (DO NOT USE)

### Vercel (Migrated to VPS - Oct 4, 2025)

**⚠️ CRITICAL:** InnPilot has been **fully migrated** from Vercel to VPS Hostinger.

**NEVER create or reference:**
- ❌ `vercel.json` - **DELETED**, use VPS cron instead
- ❌ Vercel Edge Functions - Use Next.js API routes
- ❌ Vercel Cron - Use VPS crontab (see `VPS_CRON_SETUP.md`)
- ❌ Vercel CLI commands (`vercel deploy`, etc.) - Use PM2 + Git deployment
- ❌ Vercel Environment Variables - Use VPS `.env.local`

**✅ CURRENT INFRASTRUCTURE (VPS Hostinger):**

| Component | Technology | Location/Command |
|-----------|------------|------------------|
| **Hosting** | VPS Hostinger | 195.200.6.216 |
| **Domain** | innpilot.io | DNS managed in Hostinger |
| **SSL** | Let's Encrypt wildcard | `*.innpilot.io` + `innpilot.io` |
| **Web Server** | Nginx | Reverse proxy to localhost:3000 |
| **Process Manager** | PM2 | `ecosystem.config.cjs` |
| **Deployment** | Git + PM2 | `git push` → `pm2 reload innpilot` |
| **Cron Jobs** | VPS crontab | `scripts/cron/setup-*.sh` |
| **Logs** | System logs | `/var/log/innpilot/` |
| **Environment** | .env.local | `/var/www/innpilot/.env.local` |

**📖 Documentation:**
- VPS Setup: `docs/deployment/VPS_SETUP_GUIDE.md`
- Cron Jobs: `docs/deployment/VPS_CRON_SETUP.md`
- Subdomain Setup: `docs/deployment/SUBDOMAIN_SETUP_GUIDE.md`
- Environment Variables: `docs/deployment/env.example.vps`
- Migration Complete: VPS Deployment project completed Oct 4, 2025

**⚠️ If you see references to Vercel:**
1. Check if it's historical documentation (acceptable)
2. If in active code, update to VPS equivalent
3. Never create new Vercel-specific files

---

## 🎯 CURRENT PROJECT: Guest Portal Multi-Conversation + Compliance Module (Oct 5, 2025)

### Objective
Transformar el Guest Chat actual (single-conversation) en una experiencia multi-conversation moderna estilo Claude AI / ChatGPT con módulo de compliance integrado (SIRE + TRA) conversacional.

### Project Files
- 📄 **Plan**: `plan.md` (1570 líneas) - Arquitectura completa, 7 fases
- 📋 **Tasks**: `TODO.md` (750 líneas) - 72 tareas organizadas
- 🎯 **Prompts**: `guest-portal-compliance-workflow.md` (1310 líneas) - 17 prompts ejecutables

### Status
- **FASE 0 Planning**: ✅ Complete
- **FASE 1**: 🔜 Ready (Subdomain Infrastructure - 3-4h)
- **FASE 2**: 🚧 In Progress (Multi-Conversation Foundation - 10-14h)
  - 2.1: ✅ Database migrations (`guest_conversations`, `compliance_submissions`)
  - 2.2: ✅ Backend APIs (`/api/guest/conversations`, `/api/compliance/submit`)
  - 2.3: 🚧 UI Components (GuestChatInterface with compliance modal)
  - 2.5: Pending - Multi-Modal file upload (4-5h) 🆕
  - 2.6: Pending - Conversation Intelligence (3-4h) 🆕
- **FASE 3**: 🚧 In Progress (Compliance Module - 10-12h)
  - 3.4: 🚧 UI Two-Layer Architecture (compliance modal implemented, testing needed)
- **FASE 4**: Pending (Staff Notifications - 4-5h)
- **FASE 5**: Pending (Testing & Performance - 3-4h)
- **FASE 6**: Pending (SEO + Analytics - 2-3h)
- **FASE 7**: Pending (Documentation & Deployment - 1-2h)

### Key Specs
- **Subdomain Architecture**: `simmerdown.innpilot.io` → tenant resolution
- **Multi-Conversation**: Sidebar UI pattern from Staff Chat
- **Multi-Modal**: Photo/document upload with Claude Vision API 🆕
- **Conversation Intelligence**: Auto-compactación, favoritos, smart suggestions 🆕
- **Compliance**: SIRE (Puppeteer) + TRA (REST API) conversational flow
- **Entity Extraction**: Passport, country, birthdate, travel purpose
- **Stack**: Next.js 15, Supabase, Anthropic Claude, Puppeteer, Claude Vision
- **Timeline**: 36-45 horas total

### Critical Decisions
- ✅ Matryoshka embeddings: Leave as-is (Guest Chat Tier 1+2)
- ✅ Compliance: NOT mandatory (soft reminder, optional)
- ✅ SIRE + TRA: Simultaneous capture in one flow
- ✅ UI: Conversational (NO standalone forms)

---

## 🤖 Specialized Agents

### backend-developer (PRIMARY - 60%)
**Responsible for:** Guest Portal Multi-Conversation (Backend)
- FASE 1: Nginx routing, middleware subdomain detection
- FASE 2: APIs CRUD conversations
- FASE 3: Compliance engine, SIRE Puppeteer, TRA API, intent detection
- FASE 4: Staff notifications
- FASE 5: Testing & benchmarks
- See: `.claude/agents/backend-developer.md` for complete instructions

### ux-interface (PRIMARY UI - 30%)
**Responsible for:** Guest Portal Multi-Conversation (Frontend)
- FASE 2: ConversationList component, GuestChatInterface refactor
- FASE 3: Compliance UI components
- FASE 6: SEO + Analytics
- See: `.claude/agents/ux-interface.md` for complete instructions

### database-agent (SUPPORT - 5%)
**Responsible for:** Guest Portal Multi-Conversation (Database)
- FASE 2: Migrations (guest_conversations, compliance_submissions, tenant_compliance_credentials)
- See: `.claude/agents/database-agent.md` for complete instructions

### Other Agents
- **api-endpoints-mapper**: TRA API investigation (if needed)
- **embeddings-generator**: SIRE embeddings processing
- **deploy-agent**: Automated deployment workflow

---

## 📂 Project Structure

```
/Users/oneill/Sites/apps/InnPilot/
├── plan.md                                           # 🎯 Guest Portal plan (1047 líneas)
├── TODO.md                                           # 📋 57 tareas (680 líneas)
├── guest-portal-compliance-workflow.md               # 🚀 Prompts ejecutables (1120 líneas)
├── SNAPSHOT.md                                       # 📸 Project snapshot (updated)
├── CLAUDE.md                                         # 📖 This file (updated)
├── src/
│   ├── middleware.ts                                # [TO MODIFY] Subdomain detection
│   ├── lib/
│   │   ├── tenant-resolver.ts                       # [TO MODIFY] Add resolveSubdomainToTenantId
│   │   ├── compliance-chat-engine.ts                # [TO CREATE] Entity extraction + state machine
│   │   ├── sire-automation.ts                       # [TO CREATE] Puppeteer automation
│   │   └── tra-api.ts                               # [TO CREATE] TRA REST API integration
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── ConversationList.tsx                 # [TO CREATE] Sidebar multi-conversation
│   │   │   └── GuestChatInterface.tsx               # ✅ Modified - Added compliance modal states
│   │   └── Compliance/
│   │       ├── ComplianceFlow.tsx                   # [TO CREATE] Conversational compliance UI
│   │       ├── ComplianceConfirmation.tsx           # [TO CREATE] Pre-submit modal
│   │       └── ComplianceSuccess.tsx                # [TO CREATE] Success feedback
│   └── app/
│       └── api/
│           ├── guest/
│           │   ├── conversations/route.ts           # ✅ Created - POST, GET
│           │   └── conversations/[id]/route.ts      # [TO CREATE] PUT, DELETE
│           ├── compliance/
│           │   └── submit/route.ts                  # ✅ Created - SIRE + TRA submission (MOCK mode)
│           └── staff/
│               └── compliance/route.ts              # [TO CREATE] Staff compliance dashboard
├── supabase/
│   └── migrations/
│       ├── 20251005010000_add_guest_conversations.sql           # ✅ Created
│       ├── 20251005010100_add_compliance_submissions.sql        # ✅ Created
│       ├── 20251005010300_add_conversation_attachments.sql      # ✅ Created (FASE 2.5)
│       ├── 20251005010301_create_guest_attachments_bucket.sql   # ✅ Created (FASE 2.5)
│       ├── 20251005010400_add_conversation_intelligence.sql     # ✅ Created (FASE 2.6)
│       └── 20251005010200_add_tenant_compliance_credentials.sql # [TO CREATE]
├── docs/
│   └── deployment/
│       ├── nginx-subdomain.conf                     # [TO CREATE] Nginx wildcard config
│       └── SUBDOMAIN_SETUP_GUIDE.md                 # [TO CREATE] Complete setup guide
└── .claude/
    └── agents/
        ├── backend-developer.md                     # ✅ Updated
        ├── ux-interface.md                          # ✅ Updated
        ├── database-agent.md                        # ✅ Updated
        └── api-endpoints-mapper.md                  # ✅ Updated
```

---

## 🚦 Getting Started

### For New Conversations
1. Read `plan.md` for project context
2. Read `TODO.md` for current tasks
3. Use prompts from `guest-portal-compliance-workflow.md`
4. Invoke appropriate agent: `@backend-developer`, `@ux-interface`, `@database-agent`

### Quick Start FASE 1 (Subdomain Infrastructure)
```bash
# Context prompt (copy-paste to new conversation)
CONTEXTO: Guest Portal Multi-Conversation + Compliance Module

Estoy en el proyecto "Guest Portal Multi-Conversation Architecture with Integrated Compliance".
- Plan: plan.md (1047 líneas, 7 fases)
- Tareas: TODO.md (57 tareas, 680 líneas)
- Prompts: guest-portal-compliance-workflow.md (1120 líneas)

Próxima fase: FASE 1 (Subdomain Infrastructure)
Agente: @backend-developer

Por favor lee los archivos de planificación y ejecuta Prompt 1.1
```

### Quick Start FASE 2 (Multi-Conversation)
```bash
# Context prompt (copy-paste to new conversation)
CONTEXTO: Guest Portal Multi-Conversation - FASE 2

Estoy en FASE 2: Multi-Conversation Foundation
- Database migrations listas ✅ (FASE 2.1)
- Próxima tarea: Backend APIs (FASE 2.2) o UI Components (FASE 2.3)

Agente: @backend-developer (APIs) o @ux-interface (UI)

Lee plan.md, TODO.md y ejecuta el prompt correspondiente de guest-portal-compliance-workflow.md
```

### Quick Start FASE 3 (Compliance)
```bash
# Context prompt (copy-paste to new conversation)
CONTEXTO: Guest Portal Compliance Module - FASE 3

Estoy en FASE 3: Compliance Module Integration
- Multi-conversation listo ✅ (FASE 2)
- Próxima tarea: Compliance Chat Engine (FASE 3.1)

Agente: @backend-developer

Lee plan.md sección FASE 3, TODO.md tareas 3.1-3.4 y ejecuta Prompt 3.1 de workflow.md
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

**Last Updated**: Oct 5, 2025
**Current Focus**: Guest Portal Multi-Conversation + Compliance Module - FASE 2-3 in progress
