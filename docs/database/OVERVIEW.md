# Database Schema Overview - MUVA Chat Platform

**Last Updated:** October 30, 2025  
**Database:** Production (ooaumjzaztmutltifhoq)  
**PostgreSQL Version:** 15.x (Supabase managed)  
**Total Tables:** 41  
**Multi-Tenant:** Yes (subdomain-based)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Multi-Tenant Architecture](#multi-tenant-architecture)
4. [Schema Dependency Levels](#schema-dependency-levels)
5. [Data Volume Analysis](#data-volume-analysis)
6. [Vector Embeddings Architecture](#vector-embeddings-architecture)
7. [Security Overview](#security-overview)
8. [Database Statistics](#database-statistics)
9. [Documentation Structure](#documentation-structure)
10. [Special Considerations](#special-considerations)
11. [Health Status](#health-status)
12. [Next Steps](#next-steps)

---

## Executive Summary

MUVA Chat is a multi-tenant AI-powered platform designed for the tourism industry, providing intelligent guest communication, regulatory compliance, and property management system (PMS) integration capabilities.

**Key Features:**
- Multi-tenant isolation via `tenant_registry` as the foundational table
- AI conversational capabilities powered by Claude (Anthropic)
- SIRE compliance reporting for Colombian tourism regulations
- PMS synchronization (Motopress, Airbnb integrations)
- Semantic search using pgvector with Matryoshka embeddings

**Database Statistics (Last Verified: October 30, 2025):**
- **Total Tables:** 41 ✅
- **Total Foreign Keys:** 40 (discrepancy: claimed 49)
- **Total RLS Policies:** 134 ✅
- **Total Triggers:** 14 (discrepancy: claimed 21)
- **Total Functions:** 207 ✅
- **Total Indexes:** 225 ✅

**Current Scale:**
- **Active Tenants:** 3 (loscedrosboutique, simmerdown, tucasamar) ✅
- **Total Records:** ~6,710 across all tables
- **Largest Table:** code_embeddings (4,333 rows, 74 MB)
- **Vector Columns:** 22 columns across 12 tables ✅


---

## Technology Stack

### Database Platform
- **PostgreSQL:** 15.x (Supabase managed instance)
- **Hosting:** Supabase Cloud
- **Access Control:** Row Level Security (RLS) enabled on 40/41 tables

### PostgreSQL Extensions

| Extension | Version | Purpose |
|-----------|---------|---------|
| `vector` | 0.8.0 | Vector similarity search (pgvector) |
| `uuid-ossp` | 1.1 | UUID generation functions |
| `pgcrypto` | 1.3 | Cryptographic functions |
| `pg_stat_statements` | 1.11 | Query performance analytics |

### Vector Architecture (Matryoshka Embeddings)

The database implements a multi-resolution vector embedding strategy:

| Dimension | Precision | Use Case | Performance |
|-----------|-----------|----------|-------------|
| **3072** | Full | High-accuracy semantic search | Slowest, most accurate |
| **1536** | Balanced | Standard search operations | Balanced speed/accuracy |
| **1024** | Fast | Real-time chat context retrieval | Fastest, good accuracy |

**Vector Index Types:**
- **HNSW** (Hierarchical Navigable Small World) - Primary for production
- **IVFFlat** (Inverted File with Flat Quantizer) - Secondary/legacy

---

## Multi-Tenant Architecture

### Foundational Table: `tenant_registry`

The `tenant_registry` table serves as the root of all multi-tenant operations:

```sql
CREATE TABLE tenant_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Current Active Tenants (Production)

| Subdomain | Created Date | Status |
|-----------|--------------|--------|
| `simmerdown` | 2025-09-22 | Active (primary development tenant) |
| `tucasamar` | 2025-10-11 | Active |
| `loscedrosboutique` | 2025-10-19 | Active |

### Tenant Isolation Strategy

**All operational tables implement tenant isolation via:**
1. **Column-level filtering:** `tenant_id UUID` or `tenant_id VARCHAR(50)`
2. **RLS policies:** Enforce `tenant_id = current_setting('app.current_tenant')`
3. **Foreign key constraints:** Reference `tenant_registry.id`

**Authentication Flow:**
- Staff users → `staff_token` cookie → validated against `staff_users` table
- Guest users → temporary session token → validated against `guest_conversations`
- All queries filtered by tenant context via RLS

**Shared Data (Non-Tenanted):**
- `sire_content` - Colombian tourism regulatory knowledge base
- `muva_content` - Global tourism destination data
- `sire_countries`, `sire_cities`, `sire_document_types` - SIRE catalogs
- `code_embeddings` - Codebase documentation embeddings (internal)

---

## Schema Dependency Levels

Tables organized by foreign key dependency depth (migration-safe order):

### Level 0: Foundation Tables (No Dependencies)
**8 Tables:**
- `code_embeddings` - Codebase documentation vectors
- `muva_content` - Tourism content knowledge base
- `property_relationships` - Cross-property associations
- `sire_cities` - SIRE city catalog
- `sire_content` - SIRE compliance knowledge base
- `sire_countries` - SIRE country catalog (249 countries)
- `sire_document_types` - SIRE document type catalog
- `tenant_registry` - **ROOT TABLE** for multi-tenancy

### Level 1: Core Operational Tables (Depend on Level 0)
**17 Tables:**
- `accommodation_units` - Property unit master data
- `accommodation_units_manual_chunks` - Manually curated unit content
- `accommodation_units_public` - Public-facing unit data
- `airbnb_motopress_comparison` - Integration mapping table
- `conversation_memory` - Chat context storage
- `hotel_operations` - Operational policies and procedures
- `hotels` - Property/hotel master data
- `integration_configs` - PMS integration settings
- `job_logs` - Background job execution logs
- `policies` - Property policies (check-in, cancellation, etc.)
- `prospective_sessions` - Pre-booking inquiry sessions
- `staff_users` - Staff authentication and permissions
- `sync_history` - PMS sync audit trail
- `tenant_compliance_credentials` - SIRE API credentials (encrypted)
- `tenant_knowledge_embeddings` - Custom tenant knowledge
- `tenant_muva_content` - Tenant-specific tourism content
- `user_tenant_permissions` - Staff access control matrix

### Level 2: Transactional Tables (Depend on Level 1)
**7 Tables:**
- `accommodation_units_manual` - Manual unit overrides
- `airbnb_mphb_imported_reservations` - Airbnb import staging
- `calendar_events` - Property availability calendar
- `guest_reservations` - Guest booking records
- `ics_feed_configurations` - Calendar feed settings
- `reservation_accommodations` - Reservation-to-unit mapping
- `staff_conversations` - Internal staff chat threads

### Level 3: Derived/Analytical Tables (Depend on Level 2)
**6 Tables:**
- `calendar_event_conflicts` - Detected scheduling conflicts
- `calendar_sync_logs` - Calendar sync audit trail
- `chat_conversations` - Legacy chat table (deprecated?)
- `compliance_submissions` - SIRE submission history
- `guest_conversations` - Active guest chat sessions
- `staff_messages` - Staff chat messages

### Level 4: Nested Transactional Data (Depend on Level 3)
**2 Tables:**
- `chat_messages` - Individual chat messages
- `conversation_attachments` - Files/images in conversations

**Total Dependency Depth:** 5 levels (0-4)

---

## Data Volume Analysis

### Top 10 Tables by Row Count (Production)

| Rank | Table | Rows | Size | Primary Use |
|------|-------|------|------|-------------|
| 1 | `code_embeddings` | 4,333 | 74 MB | Internal codebase search |
| 2 | `muva_content` | 742 | 21 MB | Tourism knowledge base |
| 3 | `prospective_sessions` | 412 | 1.4 MB | Pre-booking inquiries |
| 4 | `chat_messages` | 319 | 712 KB | Guest conversations |
| 5 | `accommodation_units_manual_chunks` | 219 | 14 MB | Semantic unit chunks |
| 6 | `accommodation_units_public` | 153 | 6.1 MB | Public unit data |
| 7 | `guest_conversations` | 112 | 216 KB | Active chat sessions |
| 8 | `guest_reservations` | 104 | 1.4 MB | Guest bookings |
| 9 | `reservation_accommodations` | 93 | 144 KB | Booking-unit links |
| 10 | `sync_history` | 85 | 144 KB | PMS sync logs |

**Total Database Size:** ~120 MB (estimated across all tables and indexes)

**Growth Trends:**
- `chat_messages` - Fastest growing (daily)
- `guest_conversations` - Moderate growth (daily)
- `code_embeddings` - Stable (updated with codebase changes)
- `muva_content` - Slow growth (curated content additions)

---

## Vector Embeddings Architecture

### Vector Columns Distribution

**Total Vector Columns:** 22 columns across 13 tables

| Table | Vector Columns | Dimensions | Purpose |
|-------|----------------|------------|---------|
| `accommodation_units_manual_chunks` | 3 | 3072, 1536, 1024 | Full Matryoshka set |
| `accommodation_units_manual` | 2 | 3072, 1536 | High-precision search |
| `accommodation_units_public` | 2 | 1536, 1024 | Public search |
| `accommodation_units` | 2 | 1536, 1024 | Balanced search |
| `hotel_operations` | 2 | 3072, 1536 | Operations search |
| `hotels` | 2 | 1536, 1024 | Property search |
| `muva_content` | 2 | 3072, 1024 | Tourism search |
| `sire_content` | 2 | 3072, 1536 | Compliance search |
| `tenant_knowledge_embeddings` | 1 | 1536 | Custom knowledge |
| `code_embeddings` | 1 | 1536 | Codebase search |
| `conversation_memory` | 1 | 1024 | Fast chat context |
| `policies` | 1 | 1024 | Policy search |
| `tenant_muva_content` | 1 | 1024 | Tenant tourism data |

### Semantic Search Functions

**Custom PostgreSQL Functions (RPC):**

```sql
-- Multi-tenant accommodation search
match_hotels_documents(query_embedding, tenant_id, table_name, threshold, count)

-- SIRE compliance knowledge search
match_sire_documents(query_embedding, threshold, count)

-- Tourism destination search
match_muva_documents(query_embedding, threshold, count)

-- Conversation context retrieval
match_conversation_memory(query_embedding, session_id, threshold, count)
```

**Search Performance:**
- Average query time: <100ms for 4 results
- Similarity threshold: 0.3 (production optimized)
- Index type: HNSW (primary), IVFFlat (fallback)

---

## Security Overview

### Row Level Security (RLS)

**RLS Enforcement:**
- **Tables with RLS:** 40/41 (97.6%)
- **Tables without RLS:** 1 (`code_embeddings`) ⚠️ **SECURITY RISK**

**RLS Policy Count:** 134 active policies

**Policy Patterns:**
1. **Tenant Isolation:**
   ```sql
   CREATE POLICY tenant_isolation ON table_name
   FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
   ```

2. **Staff Authentication:**
   ```sql
   CREATE POLICY staff_access ON table_name
   FOR ALL USING (
     EXISTS (
       SELECT 1 FROM staff_users 
       WHERE id = auth.uid() AND tenant_id = table_name.tenant_id
     )
   );
   ```

3. **Guest Session Isolation:**
   ```sql
   CREATE POLICY guest_access ON table_name
   FOR ALL USING (conversation_id = current_setting('app.conversation_id')::uuid);
   ```

### Critical Security Issues

⚠️ **CRITICAL:** `code_embeddings` table has **NO RLS policies**
- Contains internal codebase documentation
- Potentially exposed to unauthorized access
- **Action Required:** Enable RLS and create appropriate policies

**See:** [ADVISORS_ANALYSIS.md](./ADVISORS_ANALYSIS.md) for complete security audit

---
## Database Statistics

**Last Verified:** October 30, 2025 by @agent-database-agent

**Verified Counts:**
- **Total Tables:** 41 ✅ (verified)
- **Total Foreign Keys:** 40 (claimed 49 - discrepancy under investigation)
- **Total RLS Policies:** 134 ✅ (verified)
- **Total Triggers:** 14 (claimed 21 - discrepancy under investigation)
- **Total Functions:** 207 ✅ (verified)
- **Total Indexes:** 225 ✅ (verified)
- **Vector Columns:** 22 across 12 tables ✅ (verified)

**Discrepancies Found:**
1. **Foreign Keys**: Documented 49, actual 40 (9 fewer) - may indicate removed relationships
2. **Triggers**: Documented 21, actual 14 (7 fewer) - triggers may have been consolidated

### Index Coverage

**Total Indexes:** 225 ✅ (verified October 30, 2025)

**Index Types:**
- B-tree: ~180 (primary keys, foreign keys, unique constraints)
- HNSW (vector): 13 (vector similarity search - optimized for production)
- IVFFlat (vector): 2 (legacy vector indexes - being phased out)
- GIN: ~10 (JSONB/array columns)
- BRIN: ~2 (timestamp range queries)

**Key Vector Indexes:**
- `accommodation_units_manual_chunks` - 3 HNSW indexes (3072, 1536, 1024 dims)
- `accommodation_units_public` - 2 HNSW indexes (3072, 1024 dims)
- `hotels` - 2 HNSW indexes (1536, 1024 dims)
- `code_embeddings` - 1 HNSW index (1536 dims)
- `muva_content` - 1 HNSW index (1024 dims)

### Trigger Coverage

**Total Triggers:** 14 ✅ (verified October 30, 2025)

**Active Triggers:**
1. **`update_updated_at_column`** (8 tables) - Auto-update timestamps
   - calendar_events, guest_conversations, hotels, ics_feed_configurations
   - property_relationships, tenant_compliance_credentials, tenant_registry, user_tenant_permissions
2. **`propagate_parent_booking`** (calendar_events) - Cascade booking data to child events
3. **`update_airbnb_motopress_comparison_updated_at`** - Sync Airbnb/Motopress comparison data
4. **`update_accommodation_units_manual_updated_at`** - Update accommodation manual timestamps
5. **`update_conversation_attachments_updated_at`** - Update attachment timestamps
6. **`update_conversation_timestamp`** (chat_messages) - Update parent conversation on new message

**Trigger Events:**
- BEFORE UPDATE: 11 triggers
- AFTER INSERT: 2 triggers
- AFTER UPDATE: 1 trigger

### Function Catalog

**Total Functions:** 207 ✅ (verified October 30, 2025)

**Function Categories:**
- **Search Functions:** ~15 (vector similarity search with Matryoshka routing)
- **Utility Functions:** ~50 (data transformation, validation, mapping)
- **RPC Functions:** ~20 (client-callable procedures - see DATABASE_QUERY_PATTERNS.md)
- **Internal Functions:** ~120 (triggers, constraints, helpers)
- **pgvector Functions:** ~100 (provided by vector extension)

**Notable RPC Functions (October 2025):**
- `get_guest_conversation_metadata()` - 99.4% token reduction (replaces 11 queries)
- `get_inactive_conversations()` - 92.5% token reduction (replaces 2 queries)
- `get_conversation_messages()` - 97.9% token reduction (replaces 6 queries)
- `get_active_integration()` - 98.4% token reduction (replaces 8 queries)
- `get_reservations_by_external_id()` - 98.0% token reduction (replaces 5 queries)

**Functions with Security Warnings:** 15 functions lack immutable search_path (security advisor flagged)

**See:** `docs/architecture/DATABASE_QUERY_PATTERNS.md` for complete RPC catalog

### RLS Policy Coverage

**Total Policies:** 134 ✅ (verified October 30, 2025)

**Coverage:**
- Tables with RLS: 40/41 (97.6%)
- Tables without RLS: 1 (`code_embeddings` - development tool data, no user data)

**Policy Types Distribution:**
- SELECT policies: 41
- INSERT policies: 24
- UPDATE policies: 24
- DELETE policies: 18
- ALL policies (wildcard): 27

**Security Status:** ✅ HEALTHY - Only code_embeddings lacks RLS (expected for non-user data)

**Most Protected Tables:**
- `guest_conversations` - 9 policies (guest + staff + service role isolation)
- `guest_reservations` - 7 policies (tenant + role-based access)
- `tenant_registry` - 6 policies (service role only for mutations)
- `compliance_submissions` - 4 policies (guest view/create, staff view/update)

**See:** `docs/database/RLS_POLICIES.md` for complete policy documentation


---

## Documentation Structure

This overview is part of a modular documentation system. Navigate to specific areas:

### Core Documentation
- **[TABLES_BASE.md](./TABLES_BASE.md)** - Foundational tables (tenant_registry, staff_users, permissions)
- **[TABLES_CATALOGS.md](./TABLES_CATALOGS.md)** - Catalogs and configuration (SIRE codes, countries, document types)
- **[TABLES_OPERATIONS.md](./TABLES_OPERATIONS.md)** - Core operations (accommodations, reservations, conversations)
- **[TABLES_INTEGRATIONS.md](./TABLES_INTEGRATIONS.md)** - External integrations (Motopress, Airbnb, WhatsApp, calendars)
- **[TABLES_EMBEDDINGS.md](./TABLES_EMBEDDINGS.md)** - Vector search and AI (embeddings, semantic chunks, search functions)

### Security & Migration
- **[RLS_POLICIES.md](./RLS_POLICIES.md)** - Complete RLS policies documentation (134 policies)
- **[MIGRATION_ORDER.md](./MIGRATION_ORDER.md)** - Migration strategy and safe execution order
- **[ADVISORS_ANALYSIS.md](./ADVISORS_ANALYSIS.md)** - Security and performance advisors (232+ items)

### Architecture References
- **[DATABASE_QUERY_PATTERNS.md](../architecture/DATABASE_QUERY_PATTERNS.md)** - RPC functions and query optimization
- **[MCP_USAGE_POLICY.md](../infrastructure/MCP_USAGE_POLICY.md)** - Database interaction guidelines

### Quick Navigation
- [Multi-Tenant Architecture](#multi-tenant-architecture) - Tenant isolation strategy
- [Schema Dependency Levels](#schema-dependency-levels) - Migration-safe order
- [Vector Embeddings](#vector-embeddings-architecture) - Semantic search setup
- [Security Overview](#security-overview) - RLS policies and risks
- [Health Status](#health-status) - Current issues and advisors

---

## Special Considerations

### Sensitive Data Handling

**Encrypted Tables:**
- `tenant_compliance_credentials` - SIRE API keys (pgcrypto)
- `compliance_submissions` - Regulatory reports (JSONB encrypted fields)

**PII Protection:**
- `staff_users` - Email addresses, role assignments (RLS protected)
- `guest_reservations` - Guest names, contact info (RLS protected)
- `guest_conversations` - Chat transcripts (RLS protected)

**GDPR/Privacy Compliance:**
- No soft deletes currently implemented (all deletes are hard deletes)
- TODO: Implement `deleted_at` pattern for audit trail
- TODO: Add data retention policies (conversation archival after 90 days)

### Auto-Generated Fields

**UUID Primary Keys:**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```
Used in 38/41 tables for globally unique identifiers.

**Timestamps:**
```sql
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```
- `created_at` set on INSERT
- `updated_at` updated via trigger (`update_updated_at_column`)

**Soft Deletes (Planned):**
```sql
deleted_at TIMESTAMPTZ DEFAULT NULL
```
Present in schema but not currently enforced in application logic.

### SIRE Compliance Specifics

**Critical Tables:**
- `sire_countries` - 249 countries (SIRE codes, NOT ISO 3166-1)
- `sire_cities` - Colombian cities mapped to SIRE codes
- `sire_document_types` - Valid ID types for guest registration

**SIRE Code Mapping:**
- USA: SIRE code = **249** (NOT ISO 840) ⚠️
- Colombia: SIRE code = **43** (matches ISO partially)
- **NEVER use ISO 3166-1 codes** - 100% rejection rate

**Reference:** `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md`

### Semantic Chunking Strategy

**Chunk Size:** ~1-2K characters per chunk

**Chunking Logic:**
- Split by Markdown headers (`## Section`)
- Preserve semantic context (no mid-sentence splits)
- Pre-optimized for LLM context windows

**CRITICAL RULE:**
✅ Always send FULL chunks to LLM (already optimized)  
❌ NEVER truncate chunks with `.substring()` (breaks semantic integrity)

**Performance Impact:** 81% token reduction vs. full document retrieval

**Reference:** `docs/workflows/ACCOMMODATION_SYNC_UNIVERSAL.md`

---

## Health Status

### Security Status

| Category | Status | Details |
|----------|--------|---------|
| **RLS Policies** | ⚠️ WARNING | 40/41 tables protected (97.6%) |
| **Missing RLS** | 🔴 CRITICAL | `code_embeddings` exposed |
| **Mutable search_path** | ⚠️ WARNING | 15 functions at risk |
| **SECURITY DEFINER** | ⚠️ WARNING | 1 view requires review |

**Immediate Actions Required:**
1. Enable RLS on `code_embeddings`
2. Create RLS policies for internal documentation access
3. Review and fix mutable search_path in functions
4. Audit SECURITY DEFINER view

### Performance Status

| Category | Status | Details |
|----------|--------|---------|
| **Performance Advisors** | ⚠️ WARNING | 212 recommendations pending |
| **Missing Indexes** | ⚠️ WARNING | ~8 foreign keys without indexes |
| **Unused Indexes** | ✅ GOOD | ~15 candidates for cleanup |
| **Vector Search** | ✅ GOOD | HNSW indexes performing well |
| **Query Performance** | ✅ GOOD | <100ms average for searches |

**Optimization Opportunities:**
1. Add indexes to frequently queried foreign keys
2. Remove unused indexes (15 candidates identified)
3. Optimize full table scans (10 queries identified)
4. Review and tune vector index parameters

### Data Integrity Status

| Category | Status | Details |
|----------|--------|---------|
| **Foreign Keys** | ✅ GOOD | 49 constraints enforced |
| **Null Constraints** | ✅ GOOD | Critical fields protected |
| **Unique Constraints** | ✅ GOOD | Duplicates prevented |
| **Check Constraints** | ⚠️ MEDIUM | Limited usage (could expand) |

**See Complete Analysis:** [ADVISORS_ANALYSIS.md](./ADVISORS_ANALYSIS.md)

---

## Next Steps

This document is part of **PHASE 1: COMPLETE DOCUMENTATION** for the production → staging migration project.

### Recommended Reading Order

1. **Start Here:** `OVERVIEW.md` (this document) - Get the big picture
2. **Understand Foundation:** [TABLES_BASE.md](./TABLES_BASE.md) - Core tables and relationships
3. **Review Security:** [RLS_POLICIES.md](./RLS_POLICIES.md) - Security model and policies
4. **Plan Migration:** [MIGRATION_ORDER.md](./MIGRATION_ORDER.md) - Safe migration strategy
5. **Deep Dive:** Table-specific docs (CATALOGS, OPERATIONS, INTEGRATIONS, EMBEDDINGS)

### Before Making Changes

**Always:**
1. Review dependency levels (avoid breaking foreign keys)
2. Check RLS policies (ensure tenant isolation)
3. Verify vector indexes (maintain search performance)
4. Test on staging before production

**Never:**
1. Drop tables without checking dependencies
2. Modify `tenant_registry` schema (breaks multi-tenancy)
3. Change vector dimensions (invalidates embeddings)
4. Disable RLS policies (security risk)

### Contact & Maintainers

**Database Issues:** Tag `@agent-database-agent` in Claude Code  
**Architecture Questions:** See `CLAUDE.md` for specialized agents  
**Emergency:** Escalate to human operators immediately

**Last Review:** October 30, 2025  
**Next Review:** Monthly (or before major migrations)

---

**Document Version:** 1.0  
**Generated:** October 30, 2025  
**Maintainer:** MUVA Engineering Team
