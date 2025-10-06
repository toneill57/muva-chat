---
title: "InnPilot Database Agent - Snapshot Especializado"
agent: database-agent
last_updated: "2025-10-06T16:00:00"
status: PRODUCTION_READY
---

# 🗄️ Database Agent - Snapshot Especializado

**Agent**: @database-agent
**Última actualización**: 6 Octubre 2025 16:00
**Estado**: PRODUCCIÓN - Supabase PostgreSQL 17.4

---

## 🎯 PROYECTO ACTIVO: SIRE Compliance Data Extension

### **Tu Responsabilidad (FASE 1 - Database Migration + FASE 3 - Validation)**

**Estado:** Listo para iniciar FASE 1

**FASE 1 - Database Migration (4 tareas, ~2h 15min):**
1. **Create migration with 9 SIRE fields** (task 1.1) - ~45 min
2. **Add validation constraints** (task 1.2) - ~30 min
3. **Create search indexes** (task 1.3) - ~15 min
4. **Migrate existing data** (task 1.4) - ~45 min

**FASE 3 - Testing & Validation (4 tareas, ~2h):**
1. **Create validation queries** (task 3.1) - ~30 min
2. **Validate migrated data** (task 3.3) - ~30 min
3. **Performance testing** (task 3.4) - ~30 min
4. **Create rollback script** (task 3.5) - ~30 min

**Tiempo Total:** ~4h 15min

**Archivos de Contexto:**
- Plan: `plan.md` (620 líneas) - Ver FASE 1 y FASE 3 completas
- Tasks: `TODO.md` (190 líneas) - Tasks 1.1-1.4, 3.1-3.5
- Prompts: `sire-compliance-prompt-workflow.md` (Prompts 1.1-1.4, 3.1-3.5)
- SIRE Specs: `docs/sire/FASE_3.1_ESPECIFICACIONES_CORREGIDAS.md`
- Catálogos Oficiales:
  - `_assets/sire/codigos-pais.json` (250 países - códigos SIRE propietarios NO ISO)
  - `_assets/sire/ciudades-colombia.json` (1,122 ciudades DIVIPOLA)

**9 Campos SIRE a Crear:**
```sql
ALTER TABLE guest_reservations ADD COLUMN
  document_type VARCHAR(2),              -- '3', '5', '10', '46'
  document_number VARCHAR(20),           -- Alphanumeric 6-20 chars
  birth_date DATE,                       -- Fecha nacimiento
  first_surname VARCHAR(45),             -- Primer apellido (uppercase)
  second_surname VARCHAR(45),            -- Segundo apellido (uppercase)
  given_names VARCHAR(60),               -- Nombres (uppercase)
  nationality_code VARCHAR(3),           -- Código SIRE 3 digits
  origin_country_code VARCHAR(3),        -- País origen SIRE
  destination_country_code VARCHAR(3);   -- País destino SIRE
```

**Constraints a Crear:**
- `document_type` IN ('3', '5', '10', '46')
- `document_number` regex `^[A-Z0-9]+$` (6-20 chars)
- Surnames/names regex `^[A-ZÁÉÍÓÚÑ ]+$`
- Country codes regex `^\d{3}$`

**Indexes a Crear:**
- `idx_guest_reservations_document` on `document_number`
- `idx_guest_reservations_nationality` on `nationality_code`

---

## 🗄️ ESQUEMA POSTGRESQL

### **39 Tablas Totales** (29 en `public`, 10 en `hotels`)

#### Schema `public` - Multi-Tenant Core

**Content & Knowledge Base:**
```sql
sire_content (8 docs)                    -- Compliance SIRE
  ├── embedding vector(3072)             -- Tier 2+3 (1536d + 3072d)
  ├── embedding_1536 vector(1536)        -- HNSW index
  └── embedding_3072 vector(3072)        -- IVFFlat index

muva_content (742 docs)                  -- Tourism San Andrés
  ├── embedding vector(3072)             -- Tier 1+3 (1024d + 3072d)
  ├── embedding_1024 vector(1024)        -- HNSW index
  └── embedding_3072 vector(3072)        -- IVFFlat index

hotel_operations (10 items)              -- Staff knowledge base
  ├── embedding_1536 vector(1536)        -- Tier 2 HNSW
  └── embedding_3072 vector(3072)        -- Tier 3 IVFFlat
```

**Multi-Tenant Infrastructure:**
```sql
tenant_registry (2 tenants)              -- Tenant master
  ├── b5c45f51... (simmerdown, Premium)
  └── 11111111... (free-hotel-test, Free)

user_tenant_permissions (1 registro)     -- Access control matrix
```

**Guest Portal System:**
```sql
guest_reservations (189 bookings)        -- Bookings + SIRE fields
  ├── 4 campos SIRE actuales (check_in, check_out, guest_name, reservation_code)
  └── 9 campos SIRE pendientes (FASE 1 migration)

guest_conversations (22 conversations)   -- Multi-conversation system
  ├── conversation_id (UUID, PK)
  ├── reservation_id (FK → guest_reservations)
  ├── tenant_id (multi-tenant isolation)
  ├── is_favorite (boolean)
  ├── is_archived (boolean)
  └── last_activity_at (timestamp, indexed)

chat_messages (42 messages)              -- Message persistence
  ├── message_id (UUID, PK)
  ├── conversation_id (FK → guest_conversations)
  ├── sender ('guest' | 'assistant')
  ├── content (text)
  └── metadata (JSONB)

prospective_sessions (176 sessions)      -- Anonymous chat tracking
  ├── session_id (UUID, PK)
  ├── tenant_id
  ├── converted_to_reservation_id (FK → guest_reservations)
  └── conversion_metadata (JSONB)

conversation_memory (10 blocks)          -- Compressed history
  ├── embedding_1024 vector(1024)        -- Tier 1 fast search
  └── compressed_summary (text)

conversation_attachments (0 files)       -- File uploads (images, PDFs)
  ├── attachment_id (UUID, PK)
  ├── conversation_id (FK)
  ├── storage_path (text)
  └── file_metadata (JSONB)
```

**Compliance Module:**
```sql
compliance_submissions (0 registros)     -- SIRE/TRA submissions
  ├── submission_id (UUID, PK)
  ├── reservation_id (FK → guest_reservations)
  ├── status ('pending' | 'success' | 'error')
  ├── data (JSONB)                       -- SIRE data completo
  └── created_at (timestamp)

tenant_compliance_credentials (0)        -- Tenant SIRE/TRA credentials
  ├── tenant_id (FK)
  ├── sire_credentials (JSONB encrypted)
  └── tra_credentials (JSONB encrypted)
```

**Staff Portal:**
```sql
staff_users (30 usuarios)                -- Staff authentication
  ├── 22 CEO
  ├── 4 Admin
  └── 4 Housekeeper

staff_conversations (30 conversations)   -- Staff chat
staff_messages (36 messages)             -- Staff messages
```

**Accommodation Data:**
```sql
accommodation_units (10 unidades)        -- Legacy/sync table
accommodation_units_public (14)          -- Marketing data
accommodation_units_manual (1)           -- Unit manuals
accommodation_units_manual_chunks (38)   -- Chunked manuals
  ├── embedding_1024 vector(1024)        -- Tier 1 HNSW
  ├── embedding_1536 vector(1536)        -- Tier 2 HNSW
  └── embedding_3072 vector(3072)        -- Tier 3 IVFFlat
```

**Integration:**
```sql
integration_configs (1 config)           -- MotoPress config
sync_history (30 registros)              -- Sync logs (last 30)
hotels (1 hotel)                         -- Hotel master
```

#### Schema `hotels` - Hotel-Specific (Legacy)

```sql
accommodation_units (8 unidades)         -- Active units
  ├── embedding_1024 vector(1024)        -- Tier 1 tourism
  └── embedding_1536 vector(1536)        -- Tier 2 balanced

policies (9 políticas)                   -- Hotel policies
  ├── embedding_1024 vector(1024)        -- Tier 1 fast
  └── embedding_3072 vector(3072)        -- Tier 3 full

client_info (0)                          -- Empty
properties (0)                           -- Empty
guest_information (0)                    -- Empty
```

---

## 🔄 MIGRACIONES

### Estado Actual

**Migraciones:**
- **235 migraciones** aplicadas en base de datos
- **12 archivos** locales en `/supabase/migrations/`
- ⚠️ **GAP MASIVO**: 223 migraciones solo en BD (no versionadas localmente)

**Últimas migraciones (Oct 1-6, 2025):**
```
20251001015000_add_prospective_sessions_table.sql
20251001015100_add_accommodation_units_public_table.sql
20251005010000_add_guest_conversations.sql           # Multi-conversation
20251005010100_add_compliance_submissions.sql        # SIRE/TRA
20251005010200_add_tenant_compliance_credentials.sql
20251005010300_add_conversation_attachments.sql      # File uploads
20251005010301_create_guest_attachments_bucket.sql
20251005010400_add_conversation_intelligence.sql
20251006010000_enable_rls_security_fix.sql           # RLS 100% fix
20251006192000_fix_security_definer_view.sql         # Security fix
20251006192100_fix_function_search_path.sql          # SQL injection fix
```

**Próxima migración (FASE 1):**
```
20251007000000_add_sire_fields_to_guest_reservations.sql
```

---

## 🧬 EXTENSIONES Y PERFORMANCE

### Extensiones Instaladas

```
vector 0.8.0              -- pgvector (HNSW + IVFFlat)
pgcrypto 1.3              -- Encryption
pg_stat_statements 1.11   -- Query monitoring
uuid-ossp 1.1             -- UUID generation
```

### Sistema de Embeddings Matryoshka

**3-Tier Architecture:**

| Tier | Dimensiones | Uso | Índice | Cobertura |
|------|-------------|-----|--------|-----------|
| **Tier 1 (Fast)** | 1024d | Ultra-fast (tourism, quick queries) | HNSW | 100% |
| **Tier 2 (Balanced)** | 1536d | Balanced (policies, general) | HNSW | 100% |
| **Tier 3 (Full)** | 3072d | Full-precision (compliance, complex) | IVFFlat | 100% |

**Cobertura de Embeddings:**
- `sire_content`: 8 documentos (Tier 2+3) ✅
- `muva_content`: 742 documentos (Tier 1+3) ✅
- `hotels.accommodation_units`: 8 unidades (Tier 1+2) ✅
- `hotels.policies`: 9 políticas (Tier 1+3) ✅
- `accommodation_units_manual_chunks`: 38 chunks (Tier 1+2+3) ✅
- `conversation_memory`: 10 bloques (Tier 1) ✅
- `hotel_operations`: 10 items (Tier 2+3) ✅

**Funciones de búsqueda vectorial:**
```sql
-- Multi-tenant hotel search
match_hotels_documents(query_embedding, tenant_id, table_name, threshold, count)

-- SIRE compliance search
match_sire_documents(query_embedding, threshold, count)

-- Tourism data search (MUVA)
match_muva_documents(query_embedding, threshold, count)

-- Conversation memory search
match_conversation_memory(query_embedding, session_id, threshold, count)

-- Multi-tier guest search
match_guest_accommodations(query_embedding, tenant_id, tier, threshold, count)
```

**20+ funciones** `match_*()` implementadas total

### Índices Vector

**20 índices HNSW/IVFFlat activos:**

**HNSW (High-performance):**
- Tier 1 (1024d): 6 índices
- Tier 2 (1536d): 8 índices

**IVFFlat (Full precision):**
- Tier 3 (3072d): 6 índices

**Tamaños de tablas:**
```
muva_content:                        21 MB (20 MB índices)
accommodation_units_manual_chunks:   6.5 MB (6.5 MB índices)
hotel_operations:                    1.7 MB (1.7 MB índices)
```

---

## 🔧 RPC FUNCTIONS (Octubre 2025)

### 7 Funciones Creadas - 98.1% Reducción Context Window

**Guest Conversations:**
```sql
-- Get full conversation metadata (replaces 11 queries, 99.4% reduction)
get_guest_conversation_metadata(p_conversation_id UUID)

-- Get inactive conversations for archiving (replaces 2 queries, 92.5% reduction)
get_inactive_conversations(p_tenant_id TEXT, p_days_inactive INT)

-- Get archived conversations to delete (replaces 1 query, 82.0% reduction)
get_archived_conversations_to_delete(p_tenant_id TEXT, p_days_archived INT)
```

**Chat Messages:**
```sql
-- Get messages with pagination (replaces 6 queries, 97.9% reduction)
get_conversation_messages(p_conversation_id UUID, p_limit INT, p_offset INT)
```

**Integrations:**
```sql
-- Get active integration config (replaces 8 queries, 98.4% reduction)
get_active_integration(p_tenant_id UUID, p_integration_type TEXT)
```

**Reservations:**
```sql
-- Find reservations by external booking ID (replaces 5 queries, 98.0% reduction)
get_reservations_by_external_id(p_external_booking_id TEXT, p_tenant_id TEXT)
```

**Accommodation Units:**
```sql
-- Get units needing motopress_type_id (replaces script logic, 92.5% reduction)
get_accommodation_units_needing_type_id(p_tenant_id TEXT)
```

**Impacto Total:**
- **34 queries inline** reemplazados en 41 archivos
- **98.1% reducción** context window (17,700 → 345 tokens)
- **17,355 tokens ahorrados** por conversación promedio

**Documentación Completa:** `docs/architecture/DATABASE_QUERY_PATTERNS.md`

---

## 🔒 SEGURIDAD

### Row Level Security (RLS)

**Estado:** ✅ **100% habilitado** (fix aplicado Oct 6, 2025)

**Tablas con RLS + Policies:**
- ✅ `public.accommodation_units` - 4 policies
- ✅ `public.accommodation_units_manual_chunks` - 4 policies
- ✅ `public.staff_conversations` - 4 policies
- ✅ `public.staff_messages` - 4 policies
- ✅ `public.guest_conversations` - 4 policies
- ✅ `public.chat_messages` - 4 policies
- ✅ `hotels.*` (schema completo) - RLS habilitado

**Migración Fix:**
```
20251006010000_enable_rls_security_fix.sql
```

### Function Security

**✅ RESUELTO - Function Search Path (Oct 6, 2025):**
- **28/28 funciones** `match_*` actualizadas con `SET search_path = public, pg_temp`
- **0 funciones** vulnerables a SQL injection
- **Script fix:** `scripts/fix-function-search-path.ts`

**Migraciones:**
```
20251006192000_fix_security_definer_view.sql
20251006192100_fix_function_search_path.sql
```

### Alertas Pendientes

**⚠️ PENDIENTE - PostgreSQL Upgrade:**
- **Versión actual:** PostgreSQL 17.4
- **Estado:** Parches de seguridad disponibles
- **Prioridad:** HIGH (recomendado en 7 días)
- **Acción manual requerida:** Upgrade via Supabase Dashboard
- **Guía:** `docs/deployment/POSTGRES_UPGRADE_GUIDE.md`

**⚠️ ADVERTENCIA - Password Protection:**
- **Leaked Password Protection:** DESHABILITADO
- **Recomendación:** Habilitar verificación HaveIBeenPwned.org

---

## 📊 PERFORMANCE BASELINES

### Expected Response Times

**Vector Search Queries:**
- Tier 1 (1024d HNSW): **< 15ms** (tourism queries)
- Tier 2 (1536d HNSW): **< 40ms** (SIRE compliance)
- Tier 3 (3072d IVFFlat): **< 100ms** (complex queries)

**Database Operations:**
- Health check queries: **< 50ms**
- Data validation queries: **< 200ms**
- Index recreation: **< 1 minute** for tables <1000 records
- RPC function calls: **< 50ms** (cached query plans)

### Resource Usage Thresholds

- Database connections: **< 80%** of max_connections
- Vector index usage: **> 80%** idx_scan ratio for active indexes
- Table size growth: **< 10MB per month** per tenant (initial scale)
- Storage usage: **< 85%** of allocated space

### Quality Metrics

- Vector embedding coverage: **> 95%** of records
- Search result relevance: Consistent with baseline queries
- Tenant isolation: **100%** (zero cross-contamination)
- RLS policy effectiveness: **100%** enforcement

---

## 🔍 HEALTH CHECKS

### Daily Monitoring Queries

**Vector Search Health:**
```sql
SELECT
  COUNT(*) as total_embeddings,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as valid_embeddings,
  AVG(array_length(embedding::real[], 1)) as avg_dimensions
FROM hotels.accommodation_units;
```

**Tenant Data Growth:**
```sql
SELECT
  tenant_id,
  COUNT(*) as record_count,
  MAX(created_at) as last_activity
FROM hotels.accommodation_units
GROUP BY tenant_id;
```

**Table Size Monitoring:**
```sql
SELECT
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname IN ('public', 'hotels')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Index Usage Statistics:**
```sql
SELECT
  schemaname, tablename, indexname,
  idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname IN ('public', 'hotels')
ORDER BY idx_scan DESC;
```

---

## 🚧 GAPS Y PENDIENTES

### CRÍTICO
1. **PostgreSQL Upgrade** - Parches de seguridad disponibles (HIGH priority)
2. **Migration Gap** - 223 migraciones no versionadas localmente

### IMPORTANTE
1. **SIRE Fields Migration** - 9 campos pendientes (FASE 1 proyecto activo)
2. **Backup Strategy** - Implementar weekly VPS snapshots + pg_dump
3. **Leaked Password Protection** - Habilitar en Supabase

### MEDIO
1. **Database Schema Diagram** - Crear visual (Mermaid) para documentación
2. **Performance Regression Tests** - No configurados actualmente

---

## 📝 DOCUMENTACIÓN

**Database Architecture (completa):**
- ✅ `DATABASE_QUERY_PATTERNS.md` - RPC functions guide (nuevo Oct 2025)
- ✅ `DATABASE_SCHEMA_RULES.md` - Schema evolution decisions
- ✅ `MATRYOSHKA_ARCHITECTURE.md` (20KB) - Embeddings system
- ✅ `MULTI_TENANT_ARCHITECTURE.md` (16KB) - Multi-tenancy

**Deployment:**
- ✅ `POSTGRES_UPGRADE_GUIDE.md` - PostgreSQL upgrade procedures

---

## 🔗 COORDINACIÓN

**Trabaja con:**
- `@backend-developer` - Para schema requirements y queries
- `@ux-interface` - Para understanding data display needs
- `@deploy-agent` - Para production database management
- `@infrastructure-monitor` - Para performance monitoring

**Ver:** `CLAUDE.md` para guías proyecto-wide

---

## 📌 COMANDOS ÚTILES

```bash
# List all migrations
mcp__supabase__list_migrations

# List all tables
mcp__supabase__list_tables

# Execute SQL query (ad-hoc analysis only)
mcp__supabase__execute_sql "SELECT COUNT(*) FROM chat_messages"

# Apply new migration
mcp__supabase__apply_migration --name="add_sire_fields" --query="..."

# Get database logs
mcp__supabase__get_logs --service="postgres"

# Get security advisors
mcp__supabase__get_advisors --type="security"

# Generate TypeScript types (after schema changes)
mcp__supabase__generate_typescript_types
```

---

## 📊 REFERENCIAS RÁPIDAS

**Database:**
- Supabase: ooaumjzaztmutltifhoq.supabase.co
- PostgreSQL: 17.4.1.075
- Conexiones: < 80% pool limit

**Snapshots Relacionados:**
- 🔧 Backend: `snapshots/backend-developer.md`
- 🧬 Embeddings: `snapshots/embeddings-generator.md`
- 🖥️ Infraestructura: `snapshots/infrastructure-monitor.md`
