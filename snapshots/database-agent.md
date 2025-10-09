---
title: Database Agent Snapshot
agent: database-agent
last_updated: 2025-10-08
status: ✅ Production Ready - SIRE Extension Pending (FASE 10-12)
database_version: PostgreSQL 17.4.1.075 (Supabase)
total_size: 35.5 MB
total_tables: 37 (public + hotels schemas)
---

# 🗄️ Database Agent Snapshot - InnPilot

## 🚨 TEST-FIRST EXECUTION POLICY (MANDATORY)

**Reference:** `.claude/TEST_FIRST_POLICY.md`

**When invoked as @agent-database-agent:**
1. Execute ALL SQL validation queries before reporting completion
2. Show migration results, query outputs, index verification
3. Request user approval before marking [x]
4. Document evidence with actual SQL results

**PROHIBIDO:** Report ✅ without showing EXECUTE/VERIFY evidence
**If test fails:** Report SQL error immediately, propose fix, await approval

---

## 📊 Executive Summary

**Database Status:** Healthy with minor security advisories
**Schema Evolution:** Multi-tenant with vector embeddings (Matryoshka 3-tier)
**Active Extensions:** 4 critical (vector, pgcrypto, uuid-ossp, pg_stat_statements)
**Migration Status:** 272 migrations applied (Oct 2025)
**Next Major Project:** SIRE Compliance Extension (9 fields to guest_reservations)

---

## 🏗️ Schema Architecture

### Schema Overview

```
PostgreSQL Database (Supabase)
├── public/ (27 tables)
│   ├── Content Tables (3)
│   │   ├── sire_content (8 rows, 392 KB)
│   │   ├── muva_content (742 rows, 21 MB) ← Largest table
│   │   └── accommodation_units_manual_chunks (38 rows, 6.5 MB)
│   │
│   ├── Multi-Tenant Core (4)
│   │   ├── tenant_registry (2 tenants, 136 KB)
│   │   ├── user_tenant_permissions (1 row, RLS enabled)
│   │   ├── hotels (1 row, 160 KB)
│   │   └── accommodation_units (10 rows, 216 KB)
│   │
│   ├── Guest Management (5)
│   │   ├── guest_reservations (144 rows, 312 KB)
│   │   ├── guest_conversations (23 rows, 160 KB)
│   │   ├── chat_conversations (5 rows, 136 KB)
│   │   ├── chat_messages (52 rows, 384 KB)
│   │   └── conversation_memory (10 rows, 232 KB)
│   │
│   ├── Compliance & SIRE (3)
│   │   ├── compliance_submissions (0 rows)
│   │   ├── tenant_compliance_credentials (0 rows)
│   │   └── conversation_attachments (0 rows)
│   │
│   ├── Staff Operations (4)
│   │   ├── staff_users (3 rows)
│   │   ├── staff_conversations (31 rows)
│   │   ├── staff_messages (38 rows, 160 KB)
│   │   └── hotel_operations (10 rows, 1.7 MB)
│   │
│   ├── Integrations (2)
│   │   ├── integration_configs (1 row)
│   │   └── sync_history (30 rows)
│   │
│   └── Prospective/Marketing (2)
│       ├── prospective_sessions (187 rows, 808 KB)
│       └── accommodation_units_public (14 rows, 368 KB)
│
└── hotels/ (10 tables) - Tenant-specific data
    ├── client_info (0 rows)
    ├── properties (0 rows)
    ├── accommodation_units (8 rows, 1.5 MB)
    ├── accommodation_types (0 rows)
    ├── policies (9 rows, 344 KB)
    ├── guest_information (0 rows, 1.6 MB)
    ├── unit_amenities (0 rows)
    ├── pricing_rules (0 rows)
    └── content (0 rows, 1.2 MB)
```

---

## 🔧 PostgreSQL Extensions

### Active Extensions (4/70 available)

| Extension | Schema | Version | Purpose |
|-----------|--------|---------|---------|
| **vector** | public | 0.8.0 | pgvector - HNSW & IVFFlat indexes for embeddings |
| **pgcrypto** | extensions | 1.3 | Credential encryption (SIRE, MotoPress) |
| **uuid-ossp** | extensions | 1.1 | UUID generation for PKs |
| **pg_stat_statements** | extensions | 1.11 | Query performance monitoring |

**Note:** `supabase_vault` and `pg_graphql` also installed but managed by Supabase.

---

## 🛠️ Supabase MCP Tools (29 tools)

### Direct Database Access via MCP

**MCP Server:** `supabase` (connected ✅)
**Token Benefit:** 98%+ reduction vs reading schema files directly
**Use Case:** Development, debugging, ad-hoc queries (NOT for regular application code)

**Key Tools Available:**

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `list_tables(schemas)` | Schema inspection | Avoid 15k token schema dumps |
| `execute_sql(query)` | Ad-hoc queries | Development/debugging only |
| `apply_migration(name, query)` | DDL operations | Create migrations |
| `get_logs(service)` | Last 24h logs | Debug api, postgres, auth, storage |
| `list_migrations()` | Migration status | Track applied migrations |
| `list_extensions()` | Extension inventory | Verify pgvector, pgcrypto installed |
| `get_advisors(type)` | Security/performance | Check RLS, index usage |
| `generate_typescript_types()` | Type generation | Update database.types.ts |

**Database Operations Tools (14):**
- `list_organizations()` - Org membership
- `list_projects()` - Project discovery
- `get_project(id)` - Project details
- `create_project()` - New project setup
- `pause_project()` - Pause database
- `restore_project()` - Resume database
- `create_branch()` - Dev branch creation
- `list_branches()` - Branch status
- `delete_branch()` - Cleanup branches
- `merge_branch()` - Production deployment
- `reset_branch()` - Rollback changes
- `rebase_branch()` - Sync with production
- `get_project_url()` - API endpoint
- `get_anon_key()` - Public API key

**Edge Functions Tools (3):**
- `list_edge_functions()` - Function inventory
- `get_edge_function(slug)` - Function source
- `deploy_edge_function()` - Deploy/update function

**IMPORTANT Query Hierarchy:**
```
1. RPC Functions (PRIMARY)       ← Use ALWAYS (98.1% token reduction)
2. MCP execute_sql (SECONDARY)   ← Ad-hoc analysis only
3. execute_sql() RPC (EMERGENCY) ← Migrations only
```

**Example Usage:**
```typescript
// ✅ PREFERRED - Use RPC function (345 tokens)
const { data } = await supabase
  .rpc('get_accommodation_unit_by_id', {
    p_unit_id: unit_id,
    p_tenant_id: tenant_id
  })

// ⚠️ SECONDARY - MCP tool for debugging (1,200 tokens)
mcp__supabase__execute_sql({
  project_id: 'ooaumjzaztmutltifhoq',
  query: 'SELECT COUNT(*) FROM guest_reservations WHERE tenant_id = $1'
})

// ❌ AVOID - Direct SQL in code (17,700 tokens)
const { data } = await supabase
  .from('accommodation_units')
  .select('*, amenities(*), policies(*)')
  .eq('id', unit_id)
```

### Extension Security Advisory

⚠️ **WARN**: `vector` extension installed in `public` schema (should be in dedicated schema for security)
- Impact: Low (Supabase managed)
- Remediation: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public

---

## 🧬 Matryoshka Embeddings System

### 3-Tier Architecture

**Philosophy:** Flexible dimension truncation for speed/accuracy tradeoff

| Tier | Dimensions | Use Case | Index Type | Tables Using |
|------|-----------|----------|------------|--------------|
| **Tier 1 (Fast)** | 1024d | Ultra-fast searches | HNSW | muva_content, accommodation_units_manual_chunks, conversation_memory, accommodation_units_public |
| **Tier 2 (Balanced)** | 1536d | Balanced performance | HNSW | sire_content, hotels.guest_information, hotels.content, accommodation_units_manual_chunks, hotel_operations |
| **Tier 3 (Full)** | 3072d | Maximum precision | No index (>2000d limit) | accommodation_units_manual_chunks (primary), hotels.accommodation_units |

**Embedding Model:** OpenAI text-embedding-3-large
**Index Algorithm:** HNSW (Hierarchical Navigable Small World) for dimensions ≤2000
**Index Parameters:** `m=16, ef_construction=64` (standard Supabase config)

### Vector Indexes Inventory

**Total Vector Indexes:** 19 HNSW indexes across schemas

**Public Schema (10):**
- `idx_muva_content_embedding_fast` (1024d)
- `idx_sire_content_embedding_balanced` (1536d)
- `idx_manual_chunks_embedding_fast` (1024d)
- `idx_manual_chunks_embedding_balanced` (1536d)
- `idx_conversation_memory_embedding_fast` (1024d)
- `idx_accommodation_public_embedding_fast_hnsw` (1024d)
- `idx_accommodation_manual_embedding_balanced_hnsw` (1536d)
- `idx_hotel_operations_embedding_balanced` (IVFFlat - legacy)
- `idx_hotel_operations_embedding_balanced_hnsw` (1536d)
- `idx_hotels_embedding_fast` (1024d)
- `idx_hotels_embedding_balanced` (1536d)

**Hotels Schema (9):**
- `idx_hotels_accommodation_units_embedding_fast` (1024d)
- `idx_hotels_accommodation_units_embedding_balanced` (1536d)
- `idx_content_embedding_balanced` (1536d)
- `idx_guest_information_embedding_balanced` (1536d)
- `idx_policies_embedding_fast` (1024d)

**Note:** 3072d embeddings (Tier 3) have NO indexes due to HNSW 2000d limit - uses sequential scan for max precision searches.

---

## 🔐 Security Layer

### Row Level Security (RLS) Status

**RLS Enabled Tables:** 31/37 tables

**Multi-Tenant Isolation (hotels schema - 7 tables):**
```sql
-- Pattern: All hotels.* tables enforce tenant_id filtering
-- Policy: tenant_id = current_setting('app.current_tenant_id')
-- Roles: anon, authenticated
```

Tables with RLS:
- ✅ hotels.client_info
- ✅ hotels.properties
- ✅ hotels.accommodation_units (RLS disabled - controlled via public wrapper)
- ✅ hotels.policies
- ✅ hotels.guest_information
- ✅ hotels.unit_amenities
- ✅ hotels.pricing_rules
- ✅ hotels.content

**Public Schema RLS (24 tables):**
- ✅ sire_content (public read, service_role modify)
- ✅ muva_content (public read, service_role modify)
- ✅ tenant_registry (service_role only CRUD, users read via permissions)
- ✅ user_tenant_permissions (tenant admins manage, users view own)
- ✅ guest_reservations (staff view tenant-filtered)
- ✅ guest_conversations (guests own, staff view tenant)
- ✅ chat_messages (linked to conversations)
- ✅ accommodation_units (tenant-filtered, service_role bypass)
- ✅ accommodation_units_manual (guests view their unit)
- ✅ accommodation_units_manual_chunks (tenant-filtered)
- ✅ accommodation_units_public (public read for active/bookable)
- ✅ prospective_sessions (public active, staff view tenant)
- ✅ conversation_memory (users view own session)
- ✅ conversation_attachments (guests CRUD own)
- ✅ compliance_submissions (guests own, staff view/update tenant)
- ✅ tenant_compliance_credentials (admins only)
- ✅ staff_users (self + admin view)
- ✅ staff_conversations (tenant-filtered)
- ✅ staff_messages (via conversation tenant)
- ✅ hotel_operations (role-based access: all_staff, admin_only, ceo_only)
- ✅ hotels (tenant isolation via user_tenant_permissions)
- ✅ integration_configs (tenant-filtered)
- ✅ sync_history (tenant-filtered)

**Tables WITHOUT RLS (0):**
- None (all tables secured)

### Security Advisories (5 warnings)

**🔴 ERROR (1):**
1. **Security Definer View:** `public.guest_chat_performance_monitor` 
   - Risk: View enforces creator's permissions, not querying user
   - Impact: Medium (monitoring view, limited exposure)
   - Remediation: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

**⚠️ WARN (4):**
1. **Extension in Public Schema:** `vector` extension in public schema
2. **Auth Leaked Password Protection:** Disabled (HaveIBeenPwned integration)
3. **Insufficient MFA Options:** Too few MFA methods enabled
4. **Vulnerable Postgres Version:** 17.4.1.075 has security patches available
   - Recommended: Upgrade to latest minor version
   - Remediation: https://supabase.com/docs/guides/platform/upgrading

---

## 🚀 RPC Functions Inventory

### Total Functions: 40+ RPC functions

**Category Breakdown:**

**1. Vector Search Functions (15):**
- `match_sire_documents()` - SIRE compliance docs (3072d)
- `match_muva_documents()` - Tourism content (1024d fast)
- `match_muva_documents_public()` - Public chat tourism (1024d)
- `match_hotels_documents()` - Multi-tenant hotel search (tier routing)
- `match_conversation_memory()` - Compressed conversation search (1024d)
- `match_accommodation_units_fast()` - Fast unit search (1024d)
- `match_accommodation_units_balanced()` - Balanced unit search (1536d)
- `match_accommodations_public()` - Public marketing chat
- `match_guest_accommodations()` - Guest portal (dual tier)
- `match_guest_information_balanced()` - Guest info (1536d)
- `match_hotel_operations_balanced()` - Staff operations (1536d, role-filtered)
- `match_policies()` - Hotel policies (1536d)
- `match_policies_public()` - Public policies (1024d)
- `match_unit_manual_chunks()` - Manual chunks (1536d)
- `match_optimized_documents()` - Universal search with tier routing

**2. Data Retrieval RPCs (12) - October 2025 Optimization:**

**Guest Conversations (3):**
- `get_guest_conversation_metadata(conversation_id)` - Replaces 11 queries (99.4% reduction)
- `get_inactive_conversations(tenant_id, days_inactive)` - Archiving helper (92.5% reduction)
- `get_archived_conversations_to_delete(tenant_id, days_archived)` - Cleanup helper (82.0% reduction)

**Chat Messages (1):**
- `get_conversation_messages(conversation_id, limit, offset)` - Pagination (97.9% reduction)

**Integrations (1):**
- `get_active_integration(tenant_id, integration_type)` - Config lookup (98.4% reduction)

**Reservations (1):**
- `get_reservations_by_external_id(external_booking_id, tenant_id)` - Multi-unit bookings (98.0% reduction)

**Accommodation Units (6):**
- `get_accommodation_unit_by_id(unit_id, tenant_id)` - Schema bypass helper
- `get_accommodation_unit_by_motopress_id(tenant_id, motopress_unit_id)` - MotoPress sync
- `get_accommodation_unit_by_name(unit_name, tenant_id)` - ILIKE search
- `get_accommodation_units_by_ids(unit_ids[])` - Batch retrieval
- `get_accommodation_units_needing_type_id(tenant_id)` - Script helper (92.5% reduction)
- `get_accommodation_tenant_id(unit_id)` - Tenant lookup

**3. Utility Functions (5):**
- `get_tenant_schema(tenant_nit)` - Schema name lookup
- `get_full_document(source_file, table_name)` - Aggregate chunks
- `execute_sql(query)` - Dynamic SQL (EMERGENCY USE ONLY)
- Helper functions for UUID generation

**Performance Impact:** RPC functions reduce token consumption by 90-98% compared to inline SQL (measured Oct 2025: 17,700→345 tokens = 98.1% reduction).

**Documentation:** See `docs/architecture/DATABASE_QUERY_PATTERNS.md` for usage hierarchy.

---

## 📈 Migration History

### Migration Statistics

**Total Migrations:** 272 migrations applied
**Latest Migration:** `20251006081115_fix_execute_sql_for_ddl.sql` (Oct 6, 2025)
**Migration Span:** Jan 2025 → Oct 2025

**Recent Major Migrations (Oct 2025):**

**Oct 6, 2025 - Security Hardening:**
- `20251006010000_enable_rls_security_fix.sql` - Fixed RLS bypass vulnerabilities
- `20251006010100_add_execute_sql_helper.sql` - Added controlled SQL execution
- `20251006192000_fix_security_definer_view.sql` - Fixed view permissions
- `20251006192100_fix_function_search_path.sql` - Fixed search_path for functions

**Oct 5, 2025 - Guest Portal Features:**
- `20251005010000_add_guest_conversations.sql` - Multi-conversation support
- `20251005010100_add_compliance_submissions.sql` - SIRE tracking
- `20251005010200_add_tenant_compliance_credentials.sql` - Encrypted credentials
- `20251005010300_add_conversation_attachments.sql` - Image/doc uploads
- `20251005010400_add_conversation_intelligence.sql` - Compressed history

**Oct 1-3, 2025 - RPC Optimization:**
- Multiple `create_rpc_*_functions.sql` - Token reduction helpers
- `get_guest_conversation_metadata`, `get_inactive_conversations`, etc.
- Measured: 90-98% token reduction vs inline queries

**Sep 2025 - Matryoshka Embeddings:**
- `20250923113238_add_matryoshka_embedding_columns_tier1.sql` - 1024d fast
- `20250923113244_add_matryoshka_embedding_columns_tier2.sql` - 1536d balanced
- `20250923113457_create_optimized_search_functions.sql` - Tier routing
- `20250923113531_create_matryoshka_vector_indexes_fixed.sql` - HNSW indexes

**Migration File Pattern:**
```
supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql
```

---

## 💾 Storage & Performance

### Database Size Analysis

**Total Database Size:** ~35.5 MB (Oct 2025)

**Top 10 Tables by Size:**

| Table | Total Size | Table Size | Indexes Size | Rows |
|-------|-----------|------------|--------------|------|
| muva_content | 21 MB | 1.3 MB | 20 MB | 742 |
| accommodation_units_manual_chunks | 6.5 MB | 40 KB | 6.5 MB | 38 |
| hotel_operations | 1.7 MB | 16 KB | 1.7 MB | 10 |
| hotels.guest_information | 1.6 MB | 144 KB | 1.4 MB | 0 |
| hotels.accommodation_units | 1.5 MB | 56 KB | 1.4 MB | 8 |
| hotels.content | 1.2 MB | 0 bytes | 1.2 MB | 0 |
| prospective_sessions | 808 KB | 232 KB | 576 KB | 187 |
| accommodation_units_manual | 616 KB | 48 KB | 568 KB | 1 |
| sire_content | 392 KB | 16 KB | 376 KB | 8 |
| chat_messages | 384 KB | 64 KB | 320 KB | 52 |

**Observations:**
- Vector indexes are 90-95% of total table size (expected for HNSW)
- `muva_content` largest table (tourism data) with 742 POIs
- Manual chunks heavily indexed (3 tiers: 1024d, 1536d, 3072d)
- Empty tables have index overhead (hotels.content, hotels.guest_information)

### Performance Baselines

**Expected Query Times:**
- Vector search (4 results): < 100ms
- RPC function calls: < 50ms
- Simple CRUD: < 10ms
- Complex joins: < 200ms

**Index Usage:**
- Vector searches: HNSW index scan (fast)
- Text searches: GIN index on tsvector (Spanish config)
- Foreign keys: B-tree indexes (automatic)

---

## 🔄 SIRE Compliance Extension - Status

### Current State (Oct 8, 2025)

**Phase:** Planning Complete ✅ | Ready for FASE 10-12 execution

**Missing Fields in `guest_reservations` (9 fields):**

```sql
-- Identity Fields (3)
document_type VARCHAR(2)              -- '3'=Pasaporte, '5'=Cédula, '10'=PEP, '46'=Permiso
document_number VARCHAR(15)           -- Alphanumeric 6-15 chars (no dashes)
birth_date DATE                       -- YYYY-MM-DD format

-- Name Fields (3) - Separated for SIRE compliance
first_surname VARCHAR(50)             -- UPPERCASE, with accents (GARCÍA)
second_surname VARCHAR(50)            -- UPPERCASE, optional
given_names VARCHAR(50)               -- UPPERCASE, with accents (MARÍA JOSÉ)

-- Country Codes (3) - Numeric codes (SIRE proprietary, not ISO 3166-1)
nationality_code VARCHAR(3)           -- 1-3 digits (e.g., "840" for USA)
origin_country_code VARCHAR(6)        -- 1-6 digits (supports DIVIPOLA cities)
destination_country_code VARCHAR(6)   -- 1-6 digits
```

**Data Source for Migration:**
- Existing: `compliance_submissions.data` (JSONB) with status='success'
- Catalogs: `_assets/sire/codigos-pais.json` (250 countries, SIRE codes)
- Catalogs: `_assets/sire/ciudades-colombia.json` (1,122 cities, DIVIPOLA)

**Constraints to Add:**
- Document type validation: IN ('3', '5', '10', '46')
- Document number format: `^[A-Z0-9]{6,15}$`
- Name fields format: `^[A-ZÁÉÍÓÚÑ ]{1,50}$` (uppercase with accents)
- Country codes format: `^\d{1,6}$` (numeric)

**Indexes to Create:**
- `idx_guest_reservations_document` ON document_number (WHERE NOT NULL)
- `idx_guest_reservations_nationality` ON nationality_code (WHERE NOT NULL)

**Estimated Work:**
- **FASE 10** (Database Migration): 2h 15min - @database-agent
- **FASE 11** (Backend Integration): 3h 15min - @backend-developer
- **FASE 12** (Testing & Validation): 2h 45min - Both agents
- **Total:** ~8 hours across 3 phases

**Planning Docs:**
- `plan.md` (FASE 10-12 detailed)
- `TODO.md` (51 tasks with estimates)
- `docs/sire/FASE_3.1_ESPECIFICACIONES_CORREGIDAS.md` (SIRE specs)
- `docs/sire/CODIGOS_OFICIALES.md` (Official code catalogs)

---

## 🔑 Key Architectural Decisions

### 1. Multi-Tenant Isolation Strategy

**Approach:** Row Level Security (RLS) policies + tenant_id filtering

**Implementation:**
```sql
-- Pattern used across all tenant-specific tables
CREATE POLICY "tenant_isolation_policy" ON table_name
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  );
```

**Bypass:** Service role for migrations and admin operations

**Tables Enforcing:** 31/37 tables with RLS enabled

### 2. Vector Search Optimization

**Matryoshka Embeddings:** 3-tier system for speed/accuracy tradeoff

**Tier Selection Logic:**
- **Fast queries** (chat, tourism): 1024d with HNSW index (~3x faster)
- **Balanced queries** (policies, manuals): 1536d with HNSW index
- **Precision queries** (compliance, full docs): 3072d no index (max accuracy)

**Measured Impact:** 3x speed improvement (Tier 1 vs Tier 3) with <2% accuracy loss

### 3. Database Query Hierarchy (Oct 2025)

**Token Optimization Policy:**

1. **RPC Functions (PRIMARY)** - 90-98% token reduction
   - Example: `get_guest_conversation_metadata()` replaces 11 queries
   - Type-safe, pre-compiled, cached query plans

2. **Direct SQL via MCP (SECONDARY)** - Ad-hoc analysis only
   - `mcp__supabase__execute_sql()` for one-time queries
   - Development and debugging

3. **execute_sql() RPC (EMERGENCY)** - Migrations only
   - Never in regular application code
   - Never in scheduled scripts or API endpoints

**Documentation:** `docs/architecture/DATABASE_QUERY_PATTERNS.md`

### 4. Embedding Generation Strategy

**Provider:** OpenAI text-embedding-3-large
**Dimensions:** 3072 (full precision)
**Truncation:** Dynamic to 1024d or 1536d via Matryoshka
**Storage:** All 3 tiers stored for flexibility

**Use Cases:**
- Premium chat: 1024d truncated for real-time search
- Compliance: 3072d full precision for legal accuracy
- Policies: 1536d balanced for guest queries

---

## 🐛 Known Issues & Limitations

### 1. HNSW Index Dimension Limit

**Issue:** HNSW indexes support max 2000 dimensions
**Impact:** 3072d embeddings (Tier 3) use sequential scan
**Workaround:** Store 3072d but search using 1536d index when speed matters
**Status:** Acceptable (precision use cases tolerate slower queries)

### 2. Security Definer View

**Issue:** `guest_chat_performance_monitor` uses SECURITY DEFINER
**Risk:** View enforces creator permissions, not querying user
**Impact:** Medium (monitoring view, limited data exposure)
**Remediation:** Redefine view without SECURITY DEFINER or use RLS policies

### 3. Vector Extension in Public Schema

**Issue:** `vector` extension installed in public schema
**Best Practice:** Dedicated schema (e.g., `extensions`)
**Impact:** Low (Supabase managed, minimal security risk)
**Status:** Defer to Supabase platform updates

### 4. Empty Tables with Index Overhead

**Tables:** hotels.content, hotels.guest_information, hotels.client_info, hotels.properties
**Issue:** Vector indexes created but 0 rows
**Overhead:** ~1-2 MB per table in index storage
**Impact:** Minimal (future data will use indexes)
**Action:** Monitor if tables remain unused after 6 months

---

## 📋 Maintenance Checklist

### Daily (Automated)

- [ ] Monitor query performance via `pg_stat_statements`
- [ ] Check for long-running queries (> 5 seconds)
- [ ] Verify RLS policies enforcing (zero unauthorized access)

### Weekly (Manual)

- [ ] Review top 20 tables by size (ensure expected growth)
- [ ] Check vector index usage (EXPLAIN ANALYZE on search queries)
- [ ] Validate embedding coverage (≥95% of records with embeddings)

### Monthly (Maintenance Window)

- [ ] VACUUM ANALYZE on large tables (muva_content, guest_reservations)
- [ ] Review and archive old prospective_sessions (>7 days expired)
- [ ] Update statistics on vector columns
- [ ] Review security advisories (Supabase dashboard)

### Quarterly (Schema Evolution)

- [ ] Audit unused indexes (idx_scan = 0 after 3 months → consider DROP)
- [ ] Review RPC function usage (identify optimization opportunities)
- [ ] Plan migration consolidation (squash old migrations if needed)
- [ ] Postgres version upgrade (apply security patches)

---

## 🚨 Emergency Procedures

### Vector Index Corruption

**Symptoms:** Search returns no results or incorrect results

**Diagnostic:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'affected_table' AND indexdef LIKE '%vector%';
```

**Fix:**
```sql
-- Recreate affected index
DROP INDEX IF EXISTS idx_table_embedding_tier;
CREATE INDEX idx_table_embedding_tier
  ON schema.table USING hnsw (embedding_tier vector_cosine_ops)
  WITH (m=16, ef_construction=64);

-- Refresh statistics
ANALYZE schema.table;
```

### RLS Policy Bypass Detected

**Symptoms:** Unauthorized cross-tenant data access

**Immediate Action:**
```sql
-- Verify policies are enabled
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname IN ('public', 'hotels')
  AND tablename = 'affected_table';

-- If missing, recreate policy
CREATE POLICY "tenant_isolation" ON affected_table
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### Performance Degradation

**Symptoms:** Queries taking >500ms (baseline <100ms)

**Diagnostic:**
```sql
-- Check for missing ANALYZE
SELECT schemaname, tablename, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname IN ('public', 'hotels')
ORDER BY last_analyze NULLS FIRST;

-- Identify slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 500
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Fix:**
```sql
-- Update statistics
ANALYZE schema.table;

-- Consider adding index if query pattern identified
```

---

## 📞 Coordination

### Works With

**@backend-developer** - Schema requirements, API queries, TypeScript types
**@infrastructure-monitor** - Production database health, backup strategy
**@ux-interface** - Data display needs, query optimization for UI

### Escalation

**Database corruption or data loss:** Immediate human intervention
**Cross-tenant data breach:** Security team + human review
**Migration failures:** Rollback + review before retry

---

## 📚 Reference Documentation

**Internal Docs:**
- `docs/architecture/DATABASE_QUERY_PATTERNS.md` - RPC hierarchy and usage
- `docs/sire/FASE_3.1_ESPECIFICACIONES_CORREGIDAS.md` - SIRE field specs
- `docs/sire/CODIGOS_OFICIALES.md` - Country/city code catalogs
- `plan.md` - SIRE extension planning (FASE 10-12)
- `TODO.md` - Database migration tasks

**External Resources:**
- Supabase RLS Guide: https://supabase.com/docs/guides/auth/row-level-security
- pgvector Documentation: https://github.com/pgvector/pgvector
- HNSW Index Tuning: https://github.com/pgvector/pgvector#hnsw
- Supabase Security Linter: https://supabase.com/docs/guides/database/database-linter

---

**Next Action:** Execute SIRE Compliance Extension (FASE 10) - Database Migration

**Timestamp:** 2025-10-08 20:15 UTC
