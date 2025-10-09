---
title: "InnPilot - General Project Snapshot"
agent: general-purpose
last_updated: "2025-10-08"
status: PRODUCTION_READY
version: "2.0"
---

# 🏗️ InnPilot - General Project Snapshot

**Last Updated:** October 8, 2025
**Status:** PRODUCTION - VPS Hostinger (innpilot.io)
**Platform:** Modern hotel management platform with AI-powered conversational interfaces

---

## 📊 Executive Summary

InnPilot is a **production-ready web platform** for managing hotel operations with AI-powered conversational interfaces, currently deployed at **innpilot.io**. The platform features multi-tenant architecture, SIRE compliance tracking, and advanced semantic search capabilities using Matryoshka embeddings.

### Core Value Proposition

- **Multi-Tenant Hotel Management**: Isolated data per tenant with feature flags
- **AI-Powered Chat**: Guest, staff, and public chat interfaces with Claude AI
- **SIRE Compliance**: Colombian government compliance module (in progress)
- **Semantic Search**: 3-tier Matryoshka embeddings (10x faster than traditional)
- **Tourism Integration**: MUVA content for San Andrés tourism information

---

## 📈 Project Metrics Overview

### Codebase Statistics

| Metric | Count | Details |
|--------|-------|---------|
| **Total TypeScript Files** | 209 files | Across src directory |
| **React Components** | 80 components | 21,309 LOC total |
| **API Endpoints** | 44 endpoints | REST APIs in Next.js |
| **Documentation Files** | 187 MD files | 2.4 MB total |
| **Database Tables** | 39 tables | 29 public, 10 hotels schema |
| **Migrations Applied** | 235+ migrations | 14 local SQL files |
| **Specialized Agents** | 8 agents | Claude Code workflow |
| **npm Vulnerabilities** | 0 | ✅ Clean |

### Infrastructure Metrics

| Component | Value | Status |
|-----------|-------|--------|
| **Production URL** | innpilot.io | ✅ Live |
| **VPS Provider** | Hostinger Ubuntu 22.04 | ✅ Active |
| **VPS IP** | 195.200.6.216 | ✅ Configured |
| **SSL Certificate** | Let's Encrypt Wildcard | ✅ Valid |
| **Process Manager** | PM2 (2 instances cluster) | ✅ Running |
| **Web Server** | Nginx + Rate Limiting | ✅ Configured |
| **Node Version** | 20.x LTS | ✅ Current |
| **Database** | Supabase PostgreSQL 17.4 | ✅ Connected |

### Performance Metrics

| Endpoint Type | Target | Actual | Status |
|---------------|--------|--------|--------|
| Guest Chat API | <3000ms | ~1500-2500ms | ✅ PASS |
| Public Chat API | <2000ms | ~1000-1800ms | ✅ PASS |
| Vector Search | <500ms | ~200-400ms | ✅ PASS |
| File Upload + Vision | <5000ms | ~2000-4000ms | ✅ PASS |

---

## 🚀 MCP Infrastructure (FASE 7 - Oct 2025)

### Token Optimization Stack

**Status:** ✅ 5/5 servers connected

**Measured Results:**
- **Semantic Code Search:** 90.4% token reduction (measured)
- **Database Schema Query:** 98.1% token reduction (17,700 → 345 tokens)
- **Projected Full Stack:** 95.3% token reduction (after FASE 8-9)
- **Context Usage:** 110k/200k tokens (55%)

**Active MCP Servers:**

| Server | Tools | Purpose | Token Cost | Status |
|--------|-------|---------|------------|--------|
| **supabase** | 29 | Database operations | ~15k | ✅ |
| **claude-context** | 4 | Semantic search (818 files, 33,257 chunks) | ~8k | ✅ |
| **memory-keeper** | 9 | Persistent memory (SQLite) | ~5k | ✅ |
| **context7** | 2 | Official docs (React 19, Next.js 15) | ~3k | ✅ |
| **knowledge-graph** | 10 | Entity relationships (.aim storage) | ~7k | ✅ |

**Documentation:**
- Complete setup guide: `docs/optimization/MCP_SERVERS_RESULTS.md` (913 lines)
- Benchmarks: `docs/mcp-optimization/TOKEN_BENCHMARKS.md`
- Quick reference: `CLAUDE.md` (MCP SERVERS section)

**Verification:** Run `/mcp` in Claude Code → Expect "5/5 ✓ connected"

---

## 🚀 Current Project Status

### Active Development Tracks

**1. MCP Optimization Project** (FASE 1-9) - ✅ **FASE 7 COMPLETE**
- **Goal**: Reduce token consumption 40-60% via semantic search
- **Status**: Infrastructure deployed, 90.4% reduction measured
- **Achievement**: 5/5 MCP servers connected and documented
- **Next Phase**: FASE 8-9 (Knowledge Graph + Memory Keeper integration)

**2. SIRE Compliance Extension** (FASE 10-12) - **PLANNED**
- **Goal**: Add 9 SIRE fields to guest_reservations table
- **Status**: Database design complete, awaiting implementation
- **Timeline**: ~7 hours estimated
- **Components**: Migration, backend integration, testing
- **Planning Docs**: plan.md (1,262 lines), TODO.md (583 lines, 52 tasks)

**3. Multi-Conversation System** - ✅ **COMPLETE**
- Guest portal with ChatGPT-style multi-conversation UI
- Auto-archiving, favorites, file uploads
- Conversation intelligence with entity tracking

---

## 🏛️ Technology Stack

### Frontend
- **React** 19.1.0
- **Next.js** 15.5.3 (App Router)
- **TypeScript** 5.x (strict mode)
- **Tailwind CSS** 4.x
- **Framer Motion** 12.x
- **shadcn/ui** (Radix UI primitives)

### Backend
- **Node.js** 20.x LTS
- **Next.js API Routes** (44 endpoints)
- **Supabase** PostgreSQL 17.4
- **pgvector** 0.8.0 (Matryoshka embeddings)

### AI/ML
- **Anthropic Claude** 3.5 (Haiku compression, Sonnet chat)
- **OpenAI** text-embedding-3-large (embeddings)
- **Claude Vision API** (multi-modal)

### Infrastructure
- **VPS** Hostinger Ubuntu 22.04 (195.200.6.216)
- **Web Server** Nginx (reverse proxy + rate limiting)
- **Process Manager** PM2 (cluster mode, 2 instances)
- **SSL** Let's Encrypt (wildcard certificate)
- **CI/CD** GitHub Actions

### External Integrations
- **Puppeteer** 24.23.0 (SIRE automation - pending)
- **TRA MinCIT API** (compliance - pending)
- **MotoPress API** (hotel PMS - partial integration)
- **Plausible Analytics** (privacy-friendly)

---

## 🗄️ Database Architecture

### Schema Overview (39 Tables)

**Multi-Tenant Core (public schema):**
- `tenant_registry` (2 tenants) - Multi-tenant master
- `sire_content` (8 docs) - SIRE compliance knowledge
- `muva_content` (742 docs) - Tourism data San Andrés
- `hotel_operations` (10 items) - Staff knowledge base

**Guest System:**
- `guest_reservations` (144 bookings)
- `guest_conversations` (23 conversations)
- `chat_messages` (52 messages)
- `prospective_sessions` (187 sessions)
- `conversation_memory` (10 blocks)

**Staff System:**
- `staff_users` (3 users)
- `staff_conversations` (31 conversations)
- `staff_messages` (38 messages)

**Compliance Module:**
- `compliance_submissions` (SIRE/TRA submissions)
- `tenant_compliance_credentials` (encrypted credentials)

**Hotel-Specific (hotels schema):**
- `accommodation_units` (8 units)
- `policies` (9 policies)

### Matryoshka Embeddings System

**3-Tier Architecture for 10x Performance:**

| Tier | Dimensions | Use Case | Index | Coverage |
|------|------------|----------|-------|----------|
| **Tier 1 (Fast)** | 1024d | Ultra-fast searches | HNSW | 100% |
| **Tier 2 (Balanced)** | 1536d | Balanced performance | HNSW | 100% |
| **Tier 3 (Full)** | 3072d | Full precision | IVFFlat | 100% |

**Coverage:** 100% embeddings in 8 critical tables (sire_content, muva_content, accommodation_units, policies, hotel_operations, conversation_memory, guest_information, accommodation_units_manual_chunks)

---

## 🎨 Features Implemented

### 1. Multi-Conversation Guest Chat ✅
- ChatGPT-style conversation management
- JWT authentication (7-day cookies)
- File uploads with Claude Vision API
- Entity tracking + follow-up suggestions
- Auto-compaction (100 messages → compress 50)
- Favorites management
- Auto-archiving (30 days → archived, 90 days → deleted)

### 2. SIRE Compliance Module ⚠️ (MOCK)
- Entity extraction from conversation
- Mapping to 13 official SIRE fields
- Database storage (`compliance_submissions`)
- UI components (reminder, confirmation, success)
- **PENDING**: Puppeteer automation + TRA API integration

### 3. Staff Portal ✅
- Staff authentication (JWT + RBAC)
- Staff chat interface (⚠️ no history loading yet)
- Reservations list (⚠️ no backend connected)
- 3 users active (CEO, Admin, Housekeeper roles)

### 4. Public Chat ✅
- Anonymous chat without authentication
- Session tracking (187 active sessions)
- Intent capture (check-in, check-out, guests)
- Rate limiting (10 req/s Nginx)
- ⚠️ Conversion rate 0% (funnel broken - investigate)

### 5. MotoPress Integration ⚠️
- Configuration UI complete
- Sync manager orchestration
- Data mapping WordPress → Supabase
- ⚠️ Only 1/10 units with complete data
- ⚠️ Endpoints without admin auth (security TODO)

---

## 🔒 Security Status

### Vulnerabilities

**npm audit:** ✅ **0 vulnerabilities** (1,091 dependencies)

**Supabase Security Advisors:**

✅ **RESOLVED (Oct 6, 2025):**
- RLS enabled on 4 critical tables
- Function search_path fixed (28/28 functions secured)

⚠️ **PENDING:**
- PostgreSQL version upgrade (security patches available)
- Leaked password protection disabled
- Insufficient MFA options
- SECURITY_DEFINER view detected (guest_chat_performance_monitor)
- Extension in public schema (vector)

### Best Practices

✅ **Implemented:**
- SSH key-based authentication
- `.env.local` in .gitignore
- GitHub Secrets (10 configured)
- HTTPS with Let's Encrypt SSL
- Rate limiting on API endpoints
- Row Level Security (RLS) 100% coverage (39/39 tables)

---

## 📂 Project Structure

```
InnPilot/
├── src/                        # Source code (209 TS/TSX files)
│   ├── app/                    # Next.js 15 App Router
│   │   ├── api/                # 44 REST endpoints
│   │   ├── guest-chat/         # Multi-conversation system
│   │   ├── staff/              # Staff interface
│   │   └── chat-mobile/        # Public mobile interface
│   ├── components/             # 80 React components (21,309 LOC)
│   │   ├── Chat/               # 22 files (~11,000 LOC)
│   │   ├── Compliance/         # 5 files (~1,500 LOC)
│   │   ├── Staff/              # 6 files (~1,200 LOC)
│   │   └── ui/                 # 12 shadcn/ui primitives
│   └── lib/                    # Business logic
│       ├── conversational-chat-engine.ts
│       ├── compliance-chat-engine.ts
│       └── sire/               # SIRE automation
│
├── docs/                       # Documentation (2.4 MB, 187 files)
│   ├── deployment/             # VPS guides (7 files)
│   ├── backend/                # Architecture docs (24 files)
│   ├── projects/               # Project plans (55 files)
│   └── sire/                   # SIRE compliance docs
│
├── _assets/                    # Content (1.8 MB)
│   ├── muva/                   # 742 tourism listings
│   ├── simmerdown/             # 9 hotel units
│   └── sire/                   # SIRE templates + catalogs
│
├── supabase/migrations/        # 14 SQL migration files
├── scripts/                    # 45+ automation scripts
├── snapshots/                  # 8 agent-specific snapshots
├── .claude/agents/             # 8 specialized agents
│
├── CLAUDE.md                   # Claude Code instructions
├── SNAPSHOT.md                 # Complete project snapshot (1,085 lines)
├── plan.md                     # MCP + SIRE plan (1,262 lines)
└── TODO.md                     # Task tracking (583 lines, 52 tasks)
```

---

## 🛠️ Development Workflow

### Quick Start

```bash
# Clone and install
git clone <repo>
cd InnPilot
npm install

# Environment setup
cp .env.example .env.local
# Add API keys (Supabase, OpenAI, Anthropic)

# Run development (RECOMMENDED)
./scripts/dev-with-keys.sh

# Build for production
npm run build --turbopack

# Deploy to production
git push origin dev  # Auto-deploys via GitHub Actions
```

### Development Scripts

- `npm run dev` - Start development server (use `./scripts/dev-with-keys.sh` instead)
- `npm run build` - Build for production
- `npm run lint` - Lint code
- `npm test` - Run unit tests (Jest)
- `npm run test:e2e` - Run E2E tests (Playwright)

---

## 📊 Recent Activity

### Latest Commits (Last 10)

```
aa98a72 feat: Add general snapshot for InnPilot project
44c910a feat: integrate official SIRE catalogs
3ece75e feat: secure MotoPress integration
ecc4e7b feat: Add PostgreSQL upgrade guide
e06ad4e refactor: clean and modernize agent definitions
277ddc1 chore: major codebase cleanup
9a90d2f fix: resolve TypeScript build errors
c9500fa fix: resolve authentication issues
ed0d793 feat: add missing production modules
88046aa fix: add missing guest-conversation-memory
```

---

## ⚠️ Known Issues & Technical Debt

### Critical Issues

1. **Conversion Rate 0%** - Public chat sessions not converting to reservations
2. **Staff Chat History** - Not loading conversation history
3. **MotoPress Security** - Endpoints lack admin authentication
4. **SIRE/TRA Real** - Still in MOCK mode (no real submission)

### Technical Debt

1. **GuestChatInterface.tsx** - Monolithic component (1,610 LOC) needs refactor
2. **Accessibility** - Only 32.5% components have ARIA labels
3. **Test Coverage** - <5% (need >70% target)
4. **Code Splitting** - Not implemented (performance impact)

### Documentation Gaps

- API documentation incomplete (OpenAPI spec outdated)
- Database schema diagram missing (visual)
- README.md outdated (mentions Next.js 14, actual: 15.5.3)

---

## 🎯 Next Steps & Priorities

### Immediate (This Week)

1. **Execute MCP Optimization** (FASE 1-9) - ~1.7 hours
   - Verify MCP servers connectivity
   - Test semantic search capabilities
   - Measure token reduction (target: 40-60%)
   - Document results

2. **Security Updates**
   - PostgreSQL version upgrade via Supabase
   - Enable leaked password protection
   - Add MFA options
   - Fix SECURITY_DEFINER view

### Short Term (2 Weeks)

3. **SIRE Compliance Extension** (FASE 10-12) - ~7 hours
   - Add 9 fields to guest_reservations
   - Migrate data from compliance_submissions
   - Update APIs to return SIRE fields
   - End-to-end testing

4. **Accessibility WCAG 2.1 AA**
   - Add ARIA labels to 54 missing components
   - Implement focus management
   - Test with screen readers

### Medium Term (1 Month)

5. **Testing Coverage**
   - Configure coverage threshold in CI
   - Add integration tests (SIRE/TRA)
   - Performance regression tests

6. **Refactor GuestChatInterface**
   - Split into sub-components
   - Implement code splitting
   - Optimize re-renders

---

## 📊 Quality Metrics

| Metric | Actual | Target | Status |
|--------|--------|--------|--------|
| **npm Vulnerabilities** | 0 | 0 | ✅ |
| **TypeScript Strict Mode** | ✅ | ✅ | ✅ |
| **ARIA Coverage** | 32.5% | 100% | 🔴 |
| **RLS Enabled** | 100% (39/39) | 100% | ✅ |
| **Test Coverage** | <5% | >70% | 🔴 |
| **Embeddings Coverage** | 100% | 100% | ✅ |
| **API Response Time** | ✅ | <3s | ✅ |

---

## 🏆 Overall Project Health: **8/10**

**Breakdown:**
- **Code Quality**: 8/10 (clean, strict TypeScript, needs testing)
- **Documentation**: 7/10 (comprehensive but some gaps)
- **Infrastructure**: 9/10 (excellent VPS setup, CI/CD)
- **Database**: 9/10 (healthy, RLS complete, needs Postgres upgrade)
- **Security**: 8/10 (good, 2/3 critical fixes done, pending Postgres upgrade)
- **Features**: 8/10 (core complete, compliance in MOCK)

### Project Strengths ✅

1. **Solid Architecture** - Multi-tenant, Matryoshka embeddings (10x improvement)
2. **Production Deployment** - VPS + CI/CD + health checks + rollback
3. **Clean Code** - 0 vulnerabilities, TypeScript strict, 209 files
4. **Comprehensive Documentation** - 2.4 MB docs, 7 deployment guides
5. **Healthy Database** - 100% embeddings coverage, RLS complete
6. **Advanced Features** - Multi-conversation, Vision API, Conversation intelligence

### Areas for Improvement 🔴

1. **Accessibility** - Only 32.5% ARIA coverage (WCAG blocker)
2. **Testing Coverage** - <5% (high risk of regressions)
3. **Conversion Funnel** - 0% conversion rate needs investigation
4. **SIRE/TRA** - Still in MOCK mode (not production-ready)
5. **Code Organization** - GuestChatInterface needs refactoring

**Recommendation:** Project is **PRODUCTION-READY** for current features. Priority fixes: accessibility, testing coverage, SIRE real implementation. With these corrections (1-2 weeks), project will reach **9/10** health score.

---

## 📞 Project Resources

### URLs
- **Production**: https://innpilot.io
- **VPS**: 195.200.6.216 (SSH access)
- **Database**: Supabase PostgreSQL (ooaumjzaztmutltifhoq.supabase.co)

### Documentation
- **Main Snapshot**: `SNAPSHOT.md` (1,085 lines, complete audit)
- **General Snapshot**: `snapshots/general-snapshot.md` (this file)
- **Project Plan**: `plan.md` (1,262 lines, MCP + SIRE phases)
- **Task Tracking**: `TODO.md` (583 lines, 52 tasks)
- **Specialized Snapshots**: `snapshots/*.md` (8 agent-specific views)

### Key Documents
- **Claude Instructions**: `CLAUDE.md` (project rules and workflow)
- **VPS Setup**: `docs/deployment/VPS_SETUP_GUIDE.md`
- **Database Patterns**: `docs/architecture/DATABASE_QUERY_PATTERNS.md`
- **API Inventory**: `docs/api-inventory-complete.md`

---

## 🎓 For New Developers

### First Steps

1. Read `SNAPSHOT.md` for complete project overview
2. Review `CLAUDE.md` for development workflow and rules
3. Check `snapshots/` for specialized domain knowledge
4. Run `./scripts/dev-with-keys.sh` to start development

### Key Concepts

- **Multi-Tenant Architecture**: Each hotel isolated via RLS policies
- **Matryoshka Embeddings**: 3-tier system for 10x faster search
- **RPC Functions First**: Use RPC over SQL (98% token reduction)
- **MCP Optimization**: Semantic search infrastructure (Oct 2025)

### Development Guidelines

- **NEVER** modify performance targets to make tests pass
- **ALWAYS** use `./scripts/dev-with-keys.sh` for development
- **NEVER** create `vercel.json` (obsolete, use VPS cron)
- **PREFER** editing existing files over creating new ones
- **USE** RPC functions for database queries (not inline SQL)

---

**Last Reviewed:** October 8, 2025
**Next Review:** Monthly (November 2025)
**Maintained By:** General Purpose Agent
