# TODO - Database Migration: Production → Staging

**Proyecto:** Migración Completa de Base de Datos + Documentación Profesional
**Fecha Inicio:** October 30, 2025
**Plan:** Ver `migration-plan/PLAN_PART{1-9}.md` para detalles de cada fase

---

## FASE 0: Baseline Migration Export 📦

**Objetivo:** Exportar DDL completo como baseline migration para disaster recovery
**Plan:** `migration-plan/PLAN_PART0_BASELINE_EXPORT.md`
**Workflow:** `prompt-workflow-PART0-baseline-export.md`
**Duración Estimada:** 4-5 horas

### 0.1 Export Extensions
- [ ] Query all installed extensions (estimate: 15min)
  - Execute: `SELECT * FROM pg_extension WHERE nspname NOT IN ('pg_catalog', 'information_schema')`
  - Output: 000_extensions.sql (CREATE EXTENSION statements)
  - Extensions: pgvector, uuid-ossp, pg_trgm
  - Agent: **@agent-database-agent**
  - Test: Extensions list complete

### 0.2 Export Table DDL
- [ ] Generate CREATE TABLE for all 41 tables (estimate: 1h)
  - Query: information_schema.columns for each table
  - Order: By dependency levels (0→4)
  - Output: 001_tables.sql (~800-1000 lines)
  - Agent: **@agent-database-agent**
  - Test: All 41 tables with complete schema

### 0.3 Export Constraints
- [ ] Generate PK and FK constraints (estimate: 30min)
  - Include: Primary keys, foreign keys, unique, check
  - Output: Inline in 001_tables.sql or separate file
  - Agent: **@agent-database-agent**
  - Test: All 40 FKs documented

### 0.4 Export Indexes
- [ ] Generate CREATE INDEX for all 225 indexes (estimate: 30min)
  - Include: B-tree, GIN, IVFFlat (vectors)
  - Special: Vector indexes with parameters (lists=100)
  - Output: 002_indexes.sql (~300-400 lines)
  - Agent: **@agent-database-agent**
  - Test: All 225 indexes including vectors

### 0.5 Export Functions
- [ ] Export all 207 functions (estimate: 30min)
  - Query: pg_get_functiondef(oid) for each function
  - Categories: RPC, Triggers, Utilities, Vector Search
  - Output: 003_functions.sql (~1500-2000 lines)
  - Agent: **@agent-database-agent**
  - Test: All 207 functions with complete bodies

### 0.6 Export Triggers
- [ ] Export all 14 triggers (estimate: 15min)
  - Link: To corresponding trigger functions
  - Output: 004_triggers.sql (~30-40 lines)
  - Agent: **@agent-database-agent**
  - Test: All 14 triggers documented

### 0.7 Export RLS Policies
- [ ] Export all 134 RLS policies (estimate: 30min)
  - Include: ALTER TABLE ENABLE ROW LEVEL SECURITY
  - Include: CREATE POLICY statements
  - Categorize: By pattern (tenant isolation, staff auth, etc.)
  - Output: 005_rls_policies.sql (~400-500 lines)
  - Agent: **@agent-database-agent**
  - Test: All 134 policies documented

### 0.8 Create Unified Baseline
- [ ] Combine all exports into one file (estimate: 15min)
  - Include: All 6 files above using \ir includes
  - Add: Progress echo statements
  - Add: Validation queries
  - Output: baseline_migration.sql (~60-80 lines)
  - Agent: **@agent-database-agent**
  - Test: File structure correct with includes

### 0.9 Test Baseline on Staging
- [ ] Execute baseline on empty staging database (estimate: 30min)
  - Command: Execute baseline_migration.sql via execute-ddl-via-api.ts
  - Verify: All 41 tables created
  - Verify: All 225 indexes created
  - Verify: All 207 functions created
  - Verify: All 134 RLS policies created
  - Agent: **@agent-database-agent**
  - Test: Zero errors, validation queries pass

---

## FASE 1: Verification & Statistics 🎯

**Objetivo:** Verificar todas las estadísticas de la base de datos contra producción
**Plan:** `migration-plan/PLAN_PART1_VERIFICATION.md`
**Workflow:** `prompt-workflow-PART1-verification.md`
**Duración Estimada:** 6-7 horas

### 1.1 Verify Table Count
- [x] Query all tables in public schema (estimate: 30min)
  - Execute: `SELECT FROM pg_tables WHERE schemaname = 'public'`
  - Verify: 41 tables total
  - Output: Complete table list
  - Agent: **@agent-database-agent**
  - Test: Count matches claim (41)
  - **COMPLETADO:** Oct 30, 2025 - Verified ✅ 41 tables

### 1.2 Verify Foreign Key Count
- [x] Query all FK constraints (estimate: 30min)
  - Execute: `SELECT FROM information_schema.table_constraints`
  - Verify: FK count (claimed: 49, actual: 40)
  - Output: `_FK_RELATIONSHIPS.json` created
  - Agent: **@agent-database-agent**
  - Test: JSON file exists with 40 FKs
  - **COMPLETADO:** Oct 30, 2025 - Found 40 FKs (discrepancy documented) ✅

### 1.3 Verify RLS Policy Count
- [x] Query all RLS policies (estimate: 45min)
  - Execute: `SELECT FROM pg_policies WHERE schemaname = 'public'`
  - Verify: 134 policies, 40/41 tables protected
  - Output: `_RLS_POLICIES.json` created
  - Agent: **@agent-database-agent**
  - Test: code_embeddings is only table without RLS
  - **COMPLETADO:** Oct 30, 2025 - Verified ✅ 134 policies

### 1.4 Verify Index Count
- [x] Query all indexes (estimate: 30min)
  - Execute: `SELECT FROM pg_indexes WHERE schemaname = 'public'`
  - Verify: 225 indexes total
  - Agent: **@agent-database-agent**
  - Test: Count matches claim
  - **COMPLETADO:** Oct 30, 2025 - Verified ✅ 225 indexes

### 1.5 Verify Trigger Count
- [x] Query all triggers (estimate: 30min)
  - Execute: `SELECT FROM information_schema.triggers`
  - Verify: Trigger count (claimed: 21, actual: 14)
  - Agent: **@agent-database-agent**
  - Test: List all 14 active triggers
  - **COMPLETADO:** Oct 30, 2025 - Found 14 triggers (consolidation documented) ✅

### 1.6 Verify Function Count
- [x] Query all functions (estimate: 30min)
  - Execute: `SELECT FROM pg_proc WHERE prokind = 'f'`
  - Verify: 207 functions
  - Agent: **@agent-database-agent**
  - Test: Count matches claim
  - **COMPLETADO:** Oct 30, 2025 - Verified ✅ 207 functions

### 1.7 Verify Vector Column Count
- [x] Query vector columns (estimate: 45min)
  - Execute: `SELECT FROM information_schema.columns WHERE udt_name = 'vector'`
  - Verify: 22 columns across 12 tables
  - Output: List of Matryoshka embeddings (3072/1536/1024 dims)
  - Agent: **@agent-database-agent**
  - Test: Verify dimensions and table count
  - **COMPLETADO:** Oct 30, 2025 - Verified ✅ 22 vectors

### 1.8 Verify Active Tenants & Row Counts
- [x] Query tenants and row counts (estimate: 1h)
  - Execute: `SELECT FROM tenant_registry WHERE is_active = true`
  - Execute: `SELECT FROM pg_stat_user_tables`
  - Verify: 3 tenants (simmerdown, tucasamar, loscedrosboutique)
  - Output: `_ROW_COUNTS.json` created (6,710 total rows)
  - Agent: **@agent-database-agent**
  - Test: Verify top 10 tables match claims
  - **COMPLETADO:** Oct 30, 2025 - Verified ✅ 3 tenants, 6,710 rows

### 1.9 Verify Advisor Counts
- [x] Query advisors via MCP (estimate: 30min)
  - Execute: `mcp__supabase__get_advisors` (security + performance)
  - Verify: 20 security advisors, 212+ performance advisors
  - Output: Advisor summary in ADVISORS_ANALYSIS.md
  - Agent: **@agent-database-agent**
  - Test: Document top 20 critical advisors
  - **COMPLETADO:** Oct 30, 2025 - Verified ✅ 20 security, 212+ performance

### 1.10 Update Documentation
- [x] Update OVERVIEW.md with verified stats (estimate: 30min)
  - Files: `OVERVIEW.md`, `ADVISORS_ANALYSIS.md`, `DOCUMENTATION_PROGRESS.md`
  - Add: "Last Verified: October 30, 2025" timestamp
  - Document: All discrepancies with explanations
  - Agent: **@agent-database-agent**
  - Test: Files updated and committed
  - **COMPLETADO:** Oct 30, 2025 - All docs updated ✅

---

## FASE 2: Dependency Tree Validation ⚙️

**Objetivo:** Validar árbol de dependencias FK y determinar orden de migración
**Plan:** `migration-plan/PLAN_PART2_DEPENDENCY_TREE.md`
**Workflow:** `prompt-workflow-PART2-dependency-tree.md`
**Duración Estimada:** 4-5 horas
**Prerequisites:** ✅ FASE 1 complete, `_FK_RELATIONSHIPS.json` exists

### 2.1 Load FK Relationships
- [ ] Parse `_FK_RELATIONSHIPS.json` (estimate: 15min)
  - Input: 40 FK relationships from FASE 1
  - Build: Adjacency list (table → referenced_tables)
  - Build: Reverse adjacency list (table → referencing_tables)
  - Agent: **@agent-database-agent**
  - Test: Data structures populated correctly

### 2.2 Identify Root Tables (Level 0)
- [ ] Find tables with no FKs (estimate: 30min)
  - Execute: `SELECT FROM information_schema.tables WHERE NOT EXISTS FK`
  - Verify: tenant_registry, sire_countries, sire_document_types
  - Output: List of Level 0 tables
  - Agent: **@agent-database-agent**
  - Test: All root tables identified

### 2.3 Calculate Dependency Levels
- [ ] Run topological sort (estimate: 1h)
  - Algorithm: Assign levels based on max(dependency_levels) + 1
  - Detect: Circular dependencies (if any)
  - Output: All 41 tables assigned to levels 0-N
  - Agent: **@agent-database-agent**
  - Test: No circular dependencies, all tables categorized

### 2.4 Validate Level Assignments
- [ ] Compare calculated vs claimed levels (estimate: 45min)
  - Compare: MIGRATION_ORDER.md claims vs actual calculations
  - Verify: Each table's level matches max(dependency_levels) + 1
  - Output: Validation report table
  - Agent: **@agent-database-agent**
  - Test: Document mismatched levels (if any)

### 2.5 Verify Migration Order Safety
- [ ] Validate TRUNCATE and INSERT orders (estimate: 30min)
  - Verify: TRUNCATE order is reverse (Level N→0)
  - Verify: INSERT order is forward (Level 0→N)
  - Check: CASCADE usage is safe
  - Agent: **@agent-database-agent**
  - Test: No FK violations in proposed order

### 2.6 Check Special Cases
- [ ] Identify edge cases (estimate: 30min)
  - Find: Self-referencing tables (e.g., staff_users.manager_id)
  - Find: Nullable FK columns
  - Find: ON DELETE CASCADE constraints
  - Output: Special handling notes
  - Agent: **@agent-database-agent**
  - Test: All edge cases documented

### 2.7 Generate Dependency Visualization
- [ ] Create ASCII tree (estimate: 30min)
  - Output: Level-based tree showing all 41 tables
  - Include: FK counts and child counts per table
  - Format: ASCII art for easy reading
  - Agent: **@agent-database-agent**
  - Test: Tree matches calculated levels

### 2.8 Update Documentation
- [ ] Update MIGRATION_ORDER.md (estimate: 45min)
  - Add: Dependency Tree Validation section
  - Update: Level assignments if corrections needed
  - Create: `_DEPENDENCY_TREE.json` export
  - Files: `MIGRATION_ORDER.md`, `DOCUMENTATION_PROGRESS.md`
  - Agent: **@agent-database-agent**
  - Test: Documentation matches validated tree

---

## FASE 3: Tables Documentation (Catalogs) 📚

**Objetivo:** Documentar todas las tablas de catálogo/referencia (6-8 tablas)
**Plan:** `migration-plan/PLAN_PART3_TABLES_CATALOGS.md`
**Workflow:** `prompt-workflow-PART3-tables-catalogs.md`
**Duración Estimada:** 4-4.5 horas
**Prerequisites:** ✅ FASE 1-2 complete

### 3.1 Identify Catalog Tables
- [ ] Find catalog/reference tables (estimate: 30min)
  - Criteria: Low row count (<1000), high reference count (>2 FKs pointing to it)
  - Tables: sire_content, sire_cities, muva_content, meal_plans, room_types, accommodation_types
  - Agent: **@agent-database-agent**
  - Test: 6-8 catalog tables identified

### 3.2 Document Each Catalog Table
- [ ] Create TABLES_CATALOGS.md (estimate: 2h)
  - Per table: Schema, PKs, FKs, Indexes, RLS, Triggers, Sample data, Query patterns
  - Template: Follow TABLES_BASE.md structure
  - Output: `TABLES_CATALOGS.md` (~800-1000 lines)
  - Files: Extract schema via information_schema queries
  - Agent: **@agent-database-agent**
  - Test: All 6-8 tables documented completely

### 3.3 Add Query Patterns
- [ ] Document 2-3 common queries per table (estimate: 45min)
  - Search: Codebase for usage (`grep -r "table_name" src/`)
  - Include: SQL + performance notes
  - Agent: **@agent-database-agent**
  - Test: Query patterns executable and accurate

### 3.4 Add Performance & Migration Notes
- [ ] Document performance and migration considerations (estimate: 30min)
  - Performance: Read/write frequency, growth rate, indexing strategy
  - Migration: DO/DON'T rules, special handling
  - Files: `TABLES_CATALOGS.md`
  - Agent: **@agent-database-agent**
  - Test: All sections complete per template

---

## FASE 4: Tables Documentation (Operations) 📊

**Objetivo:** Documentar tablas operacionales core (10-12 tablas)
**Plan:** `migration-plan/PLAN_PART4_TABLES_OPERATIONS.md`
**Workflow:** `prompt-workflow-PART4-tables-operations.md`
**Duración Estimada:** 3-4 horas
**Prerequisites:** ✅ FASE 1-3 complete

### 4.1 Identify Operations Tables
- [ ] Find core business operations tables (estimate: 30min)
  - Tables: accommodations, accommodation_units, guest_reservations, reservation_accommodations, guest_conversations, chat_messages, prospective_sessions, prospective_messages, calendar_events, calendar_event_conflicts
  - Agent: **@agent-database-agent**
  - Test: 10-12 operations tables identified

### 4.2 Document Each Operations Table
- [ ] Create TABLES_OPERATIONS.md (estimate: 2h)
  - Per table: Complete schema, relationships, query patterns
  - Focus: Business logic, transaction patterns, high-volume operations
  - Output: `TABLES_OPERATIONS.md` (~1200-1500 lines)
  - Agent: **@agent-database-agent**
  - Test: All operations tables documented

### 4.3 Document Business Logic Patterns
- [ ] Add business rules and workflows (estimate: 1h)
  - Document: Reservation flow, conversation flow, calendar sync logic
  - Include: State machines, validation rules, triggers
  - Agent: **@agent-database-agent**
  - Test: Business logic patterns clear and accurate

---

## FASE 5: Tables Documentation (Integrations) 🔌

**Objetivo:** Documentar tablas de integraciones externas (9-11 tablas)
**Plan:** `migration-plan/PLAN_PART5_TABLES_INTEGRATIONS.md`
**Workflow:** `prompt-workflow-PART5-tables-integrations.md`
**Duración Estimada:** 3-4 horas
**Prerequisites:** ✅ FASE 1-4 complete

### 5.1 Identify Integration Tables
- [ ] Find external integration tables (estimate: 30min)
  - Motopress: 4 tables (accommodations, units, room_types, sync_log)
  - Airbnb: 3 tables (accommodations, calendar_sync_status, sync_log)
  - WhatsApp: 4 tables (business_accounts, phone_numbers, messages, templates)
  - Agent: **@agent-database-agent**
  - Test: 9-11 integration tables identified

### 5.2 Document Each Integration
- [ ] Create TABLES_INTEGRATIONS.md (estimate: 2h)
  - Group by: Platform (Motopress, Airbnb, WhatsApp)
  - Focus: External ID mapping, sync patterns, webhook handling
  - Output: `TABLES_INTEGRATIONS.md` (~1000-1200 lines)
  - Agent: **@agent-database-agent**
  - Test: All integration tables documented

### 5.3 Document Sync Patterns
- [ ] Add sync workflow documentation (estimate: 1h)
  - Document: Sync frequency, conflict resolution, error handling
  - Include: External API contracts, rate limits
  - Agent: **@agent-database-agent**
  - Test: Sync patterns clear and actionable

---

## FASE 6: Tables Documentation (Embeddings) 🤖

**Objetivo:** Documentar tablas de embeddings y búsqueda vectorial (4-5 tablas)
**Plan:** `migration-plan/PLAN_PART6_TABLES_EMBEDDINGS.md`
**Workflow:** `prompt-workflow-PART6-tables-embeddings.md`
**Duración Estimada:** 2-3 horas
**Prerequisites:** ✅ FASE 1-5 complete

### 6.1 Identify Embeddings Tables
- [ ] Find vector search tables (estimate: 30min)
  - Tables: code_embeddings (⚠️ NO RLS), accommodation_units_manual_chunks, tenant_knowledge_embeddings, muva_content (with vectors)
  - Agent: **@agent-database-agent**
  - Test: 4-5 embeddings tables identified

### 6.2 Document Vector Architecture
- [ ] Create TABLES_EMBEDDINGS.md (estimate: 1.5h)
  - Focus: Matryoshka architecture (3072/1536/1024 dims), pgvector extension, IVFFlat indexes
  - Critical: Document code_embeddings security issue (missing RLS)
  - Output: `TABLES_EMBEDDINGS.md` (~600-800 lines)
  - Agent: **@agent-database-agent**
  - Test: Vector architecture documented completely

### 6.3 Document Search Functions
- [ ] Document semantic search RPC functions (estimate: 30min)
  - Functions: All vector search functions using pgvector
  - Include: Performance characteristics, token reduction (81%)
  - Agent: **@agent-database-agent**
  - Test: Search functions documented with examples

---

## FASE 7: RLS Policies Documentation 🔒

**Objetivo:** Documentar todas las 134 RLS policies
**Plan:** `migration-plan/PLAN_PART7_RLS_POLICIES.md`
**Workflow:** `prompt-workflow-PART7-rls-policies.md`
**Duración Estimada:** 3-4 horas
**Prerequisites:** ✅ FASE 1-6 complete, `_RLS_POLICIES.json` exists

### 7.1 Load RLS Policies
- [ ] Parse `_RLS_POLICIES.json` (estimate: 15min)
  - Input: 134 policies from FASE 1
  - Group by: Table and policy type (SELECT/INSERT/UPDATE/DELETE)
  - Agent: **@agent-database-agent**
  - Test: All 134 policies loaded

### 7.2 Categorize Policy Patterns
- [ ] Identify security patterns (estimate: 1h)
  - Patterns: Tenant Isolation, Staff Authentication, Guest Access, Admin-Only, Public Read
  - Distribution: ~80% tenant isolation, ~10% staff auth, ~5% guest, ~5% admin/public
  - Agent: **@agent-database-agent**
  - Test: All policies categorized by pattern

### 7.3 Document Each Policy
- [ ] Create RLS_POLICIES.md (estimate: 2h)
  - Per policy: SQL definition, purpose, security level, test case
  - Group by: Table and category
  - Output: `RLS_POLICIES.md` (~1500-2000 lines)
  - Agent: **@agent-database-agent**
  - Test: All 134 policies documented

### 7.4 Document Security Gap
- [ ] Document code_embeddings RLS issue (estimate: 30min)
  - Issue: code_embeddings has NO RLS (only table missing protection)
  - Include: Recommended policies, remediation plan
  - Agent: **@agent-database-agent**
  - Test: Security gap documented with solution

---

## FASE 8: Migration Scripts Validation ✅

**Objetivo:** Validar y mejorar scripts de migración existentes
**Plan:** `migration-plan/PLAN_PART8_MIGRATION_SCRIPTS.md`
**Workflow:** `prompt-workflow-PART8-migration-scripts.md`
**Duración Estimada:** 2-3 horas
**Prerequisites:** ✅ FASE 1-7 complete, dependency tree validated

### 8.1 Review 001_clean_staging.sql
- [ ] Validate TRUNCATE order (estimate: 30min)
  - Verify: Order matches validated dependency tree (Level 4→0)
  - Check: CASCADE usage is safe and intentional
  - Update: Add comments explaining FK dependencies
  - Files: `scripts/migrations/staging/001_clean_staging.sql`
  - Agent: **@agent-database-agent**
  - Test: Script runs without FK violations

### 8.2 Review 002_copy_data.ts
- [ ] Validate INSERT order and add features (estimate: 1h)
  - Verify: Order matches dependency tree (Level 0→4)
  - Add: Special handling for self-referencing tables (staff_users.manager_id)
  - Add: Progress reporting (X/Y rows copied)
  - Add: Error recovery (resume from failure point)
  - Files: `scripts/migrations/staging/002_copy_data.ts`
  - Agent: **@agent-database-agent**
  - Test: Script copies data preserving UUIDs

### 8.3 Review 003_validate.sql
- [ ] Enhance validation queries (estimate: 30min)
  - Add: Row count comparisons (prod vs staging)
  - Add: FK integrity checks
  - Add: RLS verification (40/41 tables enabled)
  - Add: Data sampling comparisons
  - Files: `scripts/migrations/staging/003_validate.sql`
  - Agent: **@agent-database-agent**
  - Test: Validation queries catch discrepancies

### 8.4 Create 004_rollback.sql
- [ ] Create rollback script (estimate: 30min)
  - Options: Truncate staging, Drop staging, Restore backup
  - Include: Safety checks, confirmation prompts
  - Files: `scripts/migrations/staging/004_rollback.sql` (NEW)
  - Agent: **@agent-database-agent**
  - Test: Rollback script tested on staging copy

---

## FASE 9: Migration Execution 🚀

**Objetivo:** Ejecutar migración producción → staging con validación completa
**Plan:** `migration-plan/PLAN_PART9_MIGRATION_EXECUTION.md`
**Workflow:** `prompt-workflow-PART9-migration-execution.md`
**Duración Estimada:** 3.5-4.5 horas
**Prerequisites:** ✅ FASE 1-8 complete, all scripts validated

### 9.1 Pre-Migration Checklist
- [ ] Prepare for migration (estimate: 1h)
  - Backup: Production database snapshot
  - Verify: Staging is clean and ready
  - Test: Database connections (prod + staging)
  - Load: Environment variables (.env.local)
  - Verify: MCP Supabase tools working
  - Alert: Team "Migration starting"
  - Agent: **@agent-database-agent**
  - Test: All pre-checks pass ✅

### 9.2 Clean Staging Database
- [ ] Execute 001_clean_staging.sql (estimate: 15min)
  - Command: `pnpm dlx tsx scripts/execute-ddl-via-api.ts scripts/migrations/staging/001_clean_staging.sql`
  - Verify: All 41 tables empty
  - Verify: No FK violations
  - Agent: **@agent-database-agent**
  - Test: Staging database clean

### 9.3 Copy Data by Levels
- [ ] Execute 002_copy_data.ts (estimate: 1.5-2h)
  - Command: `pnpm dlx tsx scripts/migrations/staging/002_copy_data.ts`
  - Monitor: Progress (Level 0→4, ~6,710 total rows)
  - Verify: Row counts per level match expectations
  - Agent: **@agent-database-agent**
  - Test: All data copied with UUIDs preserved

### 9.4 Validate Migration
- [ ] Execute 003_validate.sql (estimate: 30min)
  - Command: `pnpm dlx tsx scripts/execute-ddl-via-api.ts scripts/migrations/staging/003_validate.sql`
  - Verify: Row counts match production
  - Verify: Zero FK constraint violations
  - Verify: RLS enabled on 40/41 tables
  - Verify: Sample data spot checks pass
  - Agent: **@agent-database-agent**
  - Test: All validation queries pass

### 9.5 Post-Migration Checks
- [ ] Final verification (estimate: 30min)
  - Run: Advisor checks (security + performance)
  - Verify: 3 staging errors auto-corrected (tenant_registry RLS, etc.)
  - Update: DOCUMENTATION_PROGRESS.md with migration results
  - Alert: Team "Migration complete ✅"
  - Agent: **@agent-database-agent**
  - Test: Migration successful, ready for FASE 10 (Remediation)

---

## 📊 PROGRESO

**Total Tasks:** 68
**Completed:** 10/68 (14.7%)

**Por Fase:**
- 🔜 FASE 0: 0/9 tareas (0%) - NEXT (Baseline Export)
- ✅ FASE 1: 10/10 tareas (100%) - COMPLETE (Verification)
- 🔜 FASE 2: 0/8 tareas (0%)
- 🔜 FASE 3: 0/4 tareas (0%)
- 🔜 FASE 4: 0/3 tareas (0%)
- 🔜 FASE 5: 0/3 tareas (0%)
- 🔜 FASE 6: 0/3 tareas (0%)
- 🔜 FASE 7: 0/4 tareas (0%)
- 🔜 FASE 8: 0/4 tareas (0%)
- 🔜 FASE 9: 0/5 tareas (0%)

**Tiempo Estimado Restante:** 29-34 horas

---

**Última actualización:** October 30, 2025 - Added FASE 0 (Baseline Export)
**Próximo paso:** Ejecutar FASE 0 usando `prompt-workflow-PART0-baseline-export.md`
