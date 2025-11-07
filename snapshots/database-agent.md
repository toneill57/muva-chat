---
title: Database Agent Snapshot
agent: database-agent
last_updated: 2025-11-01
status: ✅ Production Ready
database_version: PostgreSQL 17.6 on aarch64-unknown-linux-gnu
project_id: ooaumjzaztmutltifhoq
branches: 2 (dev, staging-v21)
total_tables: 50 (41 public + 9 hotels)
total_records: 6,641 (dev branch)
sire_validation: 5/5 SQL queries passed (100%)
---

# 🗄️ Database Agent Snapshot - MUVA Chat

## 🎯 CURRENT PROJECT: Supabase Branching Analysis Complete (November 1, 2025)

**Status:** ✅ Analysis Complete - Action Items Identified
**Priority:** 🔴 CRITICAL - Branch Architecture Issues Detected
**Your Role:** Database maintenance and branching architecture

### Project Overview

Análisis exhaustivo de arquitectura de branching Supabase completado. Detectados 4 problemas críticos que requieren atención.

**My Analysis Delivered:**
- Complete branching architecture report (1,200+ lines)
- 2 branches analyzed (dev, staging-v21)
- Security comparison (0 vs 17 issues)
- Function comparison (90 vs 204 functions)
- Data status (6,641 vs 0 records)
- Migration status verification

**Key Documents Created:**
- `docs/database/SUPABASE_BRANCHING_ANALYSIS_COMPLETE.md` - Full analysis report
- `docs/database/BRANCHING_SUMMARY.md` - Quick reference guide

---

## 🏗️ Supabase Branching Architecture

### Current State (2025-11-01)

```
Proyecto Supabase: ooaumjzaztmutltifhoq
├── Branch "dev" (DEFAULT)
│   ├── Status: MIGRATIONS_FAILED ⚠️
│   ├── Project Ref: ooaumjzaztmutltifhoq
│   ├── URL: https://ooaumjzaztmutltifhoq.supabase.co
│   ├── Datos: 6,641 registros ✅
│   ├── Funciones: 90 ✅
│   ├── Security: 0 issues ✅
│   └── Git: Three Environments (dev/staging/main active)
│
└── Branch "staging-v21" (NUEVO)
    ├── Status: FUNCTIONS_DEPLOYED ✅
    ├── Project Ref: rmrflrttpobzlffhctjt
    ├── URL: https://rmrflrttpobzlffhctjt.supabase.co
    ├── Datos: 0 registros ❌
    ├── Funciones: 204 ✅
    ├── Security: 17 issues ⚠️
    └── Git: rama "staging" (ACTIVA)
```

### Critical Finding

**NO existe "proyecto base" separado.** El project_id `ooaumjzaztmutltifhoq` es SIMULTÁNEAMENTE el proyecto padre Y el branch "dev" (DEFAULT). Esto es comportamiento NORMAL de Supabase Branching.

---

## 🚨 PROBLEMAS DETECTADOS

### Problema 1: MIGRATIONS_FAILED en dev ⚠️

**Síntomas:**
- Status: `MIGRATIONS_FAILED`
- Última actualización: 2025-10-31 19:08:51 UTC
- Funcionalidad NO afectada (90 funciones operativas)

**Solución:**
```bash
supabase migration repair --project-ref ooaumjzaztmutltifhoq
```

### Problema 2: staging-v21 VACÍO ❌

**Síntomas:**
- 0 registros en TODAS las tablas
- No se puede probar funcionalidad
- Auth fallará (no hay tenant_registry)

**Solución (Opción A - Recrear):**
```bash
supabase branches delete staging-v21 --project-ref ooaumjzaztmutltifhoq
supabase branches create staging-v21 \
  --project-ref ooaumjzaztmutltifhoq \
  --with-data=true \
  --git-branch=staging
```

**Solución (Opción B - Copiar datos):**
```bash
pg_dump -h db.ooaumjzaztmutltifhoq.supabase.co \
  --data-only --no-owner --no-acl \
  -t 'public.*' -t 'hotels.*' > staging_seed.sql
psql -h db.rmrflrttpobzlffhctjt.supabase.co < staging_seed.sql
```

### Problema 3: Security Warnings en staging-v21 ⚠️

**Síntomas:**
- 17 warnings de seguridad (vs 0 en dev)
- Extension `vector` en schema `public` (debería estar en `extensions`)
- 15 funciones sin `search_path` fijo
- Tabla `code_embeddings` sin RLS

**Solución:**
Aplicar fixes de seguridad documentados en:
- `docs/database/COMPLETE_REMEDIATION_REPORT_2025-11-01.md`

### Problema 4: Diferencia de 114 Funciones 🤔

**Síntomas:**
- dev: 90 funciones
- staging-v21: 204 funciones
- Causa desconocida

**Investigación Requerida:**
```sql
-- Listar funciones SOLO en staging-v21
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('public', 'hotels') AND p.prokind = 'f';
```

---

## 📊 COMPARACIÓN dev vs staging-v21

| Métrica | dev | staging-v21 | Diferencia |
|---------|-----|-------------|------------|
| **Status** | MIGRATIONS_FAILED | FUNCTIONS_DEPLOYED | staging mejor |
| **Tablas** | 50 | 50 | ✅ Idéntico |
| **Registros** | 6,641 | 0 | dev tiene TODOS |
| **Funciones** | 90 | 204 | +114 en staging |
| **Security Issues** | 0 | 17 | dev optimizado |
| **Vector Extension** | extensions | public | dev correcto |
| **PostgreSQL** | 17.6 | 17.6 | ✅ Idéntico |

---

## ✅ ACCIONES INMEDIATAS

### CRÍTICO (Hacer HOY)

- [ ] Investigar MIGRATIONS_FAILED en dev
- [ ] Decidir: ¿Poblar o recrear staging-v21?

### IMPORTANTE (Esta Semana)

- [ ] Resolver 17 security warnings en staging-v21
- [ ] Documentar función de cada branch en CLAUDE.md
- [ ] Investigar 114 funciones extra

### SEGUIMIENTO (2 Semanas)

- [ ] Implementar seeding script automatizado
- [ ] Normalizar estado de ambos branches
- [ ] Planear arquitectura 3-tier (dev → staging → prod)

---

## 📋 MAPEO GIT ↔ SUPABASE

| Git Branch | Infrastructure | Project Ref | Auto-Deploy | Status |
|------------|----------------|-------------|-------------|--------|
| dev | Supabase branch | rvjmwwvkhglcuqwcznph | ✅ Yes | ACTIVE |
| staging | VPS + Supabase | ztfslsrkemlfjqpzksir | ✅ Yes | ACTIVE |
| main | VPS + Supabase | ooaumjzaztmutltifhoq | ⚠️ Manual | ACTIVE |

---

## 🗄️ Database Schema (Current State - dev branch)

### Schemas
- **public**: 41 tables (6,641 registros totales)
- **hotels**: 9 tables (0 registros - vacías)

### Top 15 Tables by Record Count

| # | Schema | Table | Records |
|---|--------|-------|---------|
| 1 | public | code_embeddings | 4,333 |
| 2 | public | muva_content | 742 |
| 3 | public | prospective_sessions | 412 |
| 4 | public | chat_messages | 324 |
| 5 | public | accommodation_units_manual_chunks | 219 |
| 6 | public | accommodation_units_public | 151 |
| 7 | public | guest_conversations | 113 |
| 8 | public | guest_reservations | 104 |
| 9 | public | reservation_accommodations | 93 |
| 10 | public | sync_history | 85 |
| 11 | public | calendar_events | 74 |
| 12 | public | staff_messages | 59 |
| 13 | public | sire_countries | 45 |
| 14 | public | staff_conversations | 44 |
| 15 | public | sire_cities | 42 |

### Functions (dev branch)

**Total:** 90 funciones

**Vector Search Functions (31):**
- `match_hotels_documents`
- `match_sire_documents`
- `match_muva_documents`
- `match_conversation_memory`
- `match_accommodation_units_balanced`
- `match_policies`
- ... (26 more)

**RPC Optimized Functions (October 2025):**
- `get_guest_conversation_metadata` (98.4% token reduction)
- `get_inactive_conversations` (92.5% token reduction)
- `get_conversation_messages` (97.9% token reduction)
- `get_active_integration` (98.4% token reduction)
- `get_reservations_by_external_id` (98.0% token reduction)

### Extensions

**Installed (dev branch):**
- vector (v0.8.0) - Schema: `extensions` ✅
- pg_stat_statements (v1.11)
- uuid-ossp (v1.1)
- pgcrypto (v1.3)
- pg_net (v0.19.5)
- pg_graphql (v1.5.11)
- supabase_vault (v0.3.1)
- plpgsql (v1.0)

**Installed (staging-v21):**
- vector (v0.8.0) - Schema: `public` ⚠️ (INCORRECTO)
- ... (resto idéntico)

### Vector Indexes (Both Branches - Identical)

**Top 10:**
- `accommodation_units_public_embedding_idx` (HNSW, m=16, ef=64)
- `code_embeddings_embedding_idx` (HNSW, m=16, ef=64)
- `idx_accommodation_manual_embedding_balanced_hnsw` (HNSW)
- `idx_content_embedding_balanced` (HNSW, m=16, ef=64)
- `idx_conversation_memory_embedding_fast` (HNSW, m=16, ef=64)
- `idx_guest_information_embedding_balanced` (HNSW, m=16, ef=64)
- `idx_hotel_operations_embedding_balanced` (IVFFLAT, lists=100)
- `idx_hotel_operations_embedding_balanced_hnsw` (HNSW)
- `idx_hotels_accommodation_units_embedding_balanced` (HNSW)
- ... (más)

### Migrations Applied

**Both Branches:**
```
1. 20250101000000 - create_core_schema
2. 20251101063746 - fix_auth_rls_initplan_batch1
```

### RLS Policies

**dev branch:**
- Top table: guest_reservations (5 policies)
- Total policies: ~100+ across all tables

**staging-v21:**
- Top table: guest_conversations (13 policies)
- Total policies: ~100+ (MÁS que dev)

---

## 🔒 Security Status

### dev branch (ooaumjzaztmutltifhoq)
- ✅ **0 security warnings**
- ✅ **0 security errors**
- Status: **CLEAN** (optimizado octubre 2025)

### staging-v21 (rmrflrttpobzlffhctjt)
- ⚠️ **17 security warnings/errors**

**Desglose:**
- 1 ERROR: `security_definer_view` (guest_chat_performance_monitor)
- 15 WARN: `function_search_path_mutable`
- 1 ERROR: `rls_disabled_in_public` (code_embeddings)
- 1 WARN: `extension_in_public` (vector)

---

## 📦 Recent Completed Work

### November 1, 2025 - Supabase Branching Analysis

**Deliverables:**
1. Complete architecture analysis (2 branches)
2. Security comparison (0 vs 17 issues)
3. Function comparison (90 vs 204 functions)
4. Data status verification (6,641 vs 0 records)
5. Migration status check (both at same version)
6. Problem identification (4 critical issues)
7. Action plan with priorities
8. Quick reference guide

**Time Invested:** ~2 hours
**Documentation Generated:** 2 files (1,200+ lines total)

### October 2025 - Database Optimization Complete

**Achievements:**
- ✅ 100% security warnings eliminated (dev branch)
- ✅ RLS policies consolidated and optimized
- ✅ Function search_path fixed
- ✅ Auth RLS InitPlan optimization applied
- ✅ Vector extension moved to correct schema
- ✅ Missing FK indexes added (Phase 3)
- ✅ 5 RPC functions deployed (98%+ token savings)

**Documentation:**
- `docs/database/COMPLETE_REMEDIATION_REPORT_2025-11-01.md`
- `docs/database/SECURITY_FINAL_STATUS_2025-11-01.md`
- `docs/database/PHASE3_FK_INDEXES_COMPLETE.md`
- `docs/architecture/DATABASE_QUERY_PATTERNS.md`

---

## 🔧 Key Tools & Commands

### Supabase CLI

```bash
# List branches
supabase branches list --project-ref ooaumjzaztmutltifhoq

# Get branch details
supabase branches get dev --project-ref ooaumjzaztmutltifhoq
supabase branches get staging-v21 --project-ref ooaumjzaztmutltifhoq

# Create branch WITH data
supabase branches create <name> \
  --project-ref ooaumjzaztmutltifhoq \
  --with-data=true \
  --git-branch=<git-branch>

# Delete branch
supabase branches delete <name> --project-ref ooaumjzaztmutltifhoq

# Migration management
supabase migration list --project-ref <project-ref>
supabase migration repair --project-ref <project-ref>

# Security advisors
supabase advisors --project-ref <project-ref> --type=security
supabase advisors --project-ref <project-ref> --type=performance
```

### MCP Tools (Preferred)

```typescript
// Execute SQL queries
mcp__supabase__execute_sql({
  project_id: "ooaumjzaztmutltifhoq",
  query: "SELECT COUNT(*) FROM chat_messages"
})

// List tables
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public", "hotels"]
})

// List migrations
mcp__supabase__list_migrations({
  project_id: "ooaumjzaztmutltifhoq"
})

// Get security advisors
mcp__supabase__get_advisors({
  project_id: "ooaumjzaztmutltifhoq",
  type: "security"
})

// List extensions
mcp__supabase__list_extensions({
  project_id: "ooaumjzaztmutltifhoq"
})
```

---

## 📚 Key Documentation

### Architecture
- `docs/architecture/DATABASE_QUERY_PATTERNS.md` - RPC functions usage
- `docs/database/SUPABASE_BRANCHING_ANALYSIS_COMPLETE.md` - Full analysis
- `docs/database/BRANCHING_SUMMARY.md` - Quick reference

### Security & Performance
- `docs/database/COMPLETE_REMEDIATION_REPORT_2025-11-01.md`
- `docs/database/SECURITY_FINAL_STATUS_2025-11-01.md`
- `docs/database/PHASE3_FK_INDEXES_COMPLETE.md`

### Operations
- `CLAUDE.md` - Database section with MCP-FIRST policy
- Agent snapshot: `snapshots/database-agent.md` (this file)

---

## 🎯 Next Steps

### Immediate (Today)

1. **User Decision Required:** ¿Poblar staging-v21 o recrearlo con datos?
2. **Investigate:** MIGRATIONS_FAILED status en dev
3. **Document:** Actualizar CLAUDE.md con branch mapping

### Short Term (This Week)

4. **Fix:** 17 security warnings en staging-v21
5. **Investigate:** 114 extra functions en staging-v21
6. **Implement:** Seeding script para staging branches

### Medium Term (2 Weeks)

7. **Normalize:** Ambos branches a estado idéntico
8. **Plan:** Arquitectura 3-tier (dev → staging → prod)
9. **Automate:** Branch creation con datos

---

## 🤝 Coordination

**Primary Agents:**
- `@agent-database-agent` (me) - Database operations, migrations, branching
- `@agent-deploy-agent` - CI/CD, VPS deployment, environment config
- `@agent-backend-developer` - API endpoints, business logic

**Key Handoffs:**
- Database Agent → Deploy Agent: Branch URLs para .env files
- Deploy Agent → Database Agent: Migration failures en deployment
- Backend → Database: New RPC functions needed

---

**Last Updated:** 2025-11-01 21:30 UTC  
**Next Review:** After user decision on staging-v21 data  
**Owner:** Database Agent (@agent-database-agent)
