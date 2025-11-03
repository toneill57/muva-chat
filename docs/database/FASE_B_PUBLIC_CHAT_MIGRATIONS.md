# Public Chat System Migrations (FASE B)

## Overview
Database migrations for the Public Chat System, enabling anonymous prospective guests to chat with AI about accommodations before booking.

## Created: 2025-10-01

## Migrations

### 1. `20251001015000_add_prospective_sessions_table.sql`
**Purpose**: Create sessions table for anonymous chat tracking

**Tables**:
- `prospective_sessions` - Anonymous chat sessions with travel intent tracking

**Features**:
- Cookie-based session management (7-day expiry)
- Conversation history (last 20 messages in JSONB)
- Travel intent extraction (dates, guests, preferences)
- UTM tracking for marketing attribution
- Conversion tracking to guest_reservations
- RLS policies for public access + staff management

**Indexes**:
- `idx_prospective_sessions_cookie` - Fast session lookup by cookie
- `idx_prospective_sessions_tenant` - Tenant filtering
- `idx_prospective_sessions_expires` - Cleanup query optimization
- `idx_prospective_sessions_intent_gin` - Travel intent search

---

### 2. `20251001015100_add_accommodation_units_public_table.sql`
**Purpose**: Marketing-focused accommodation data for public consumption

**Tables**:
- `accommodation_units_public` - Public accommodation data with pricing & photos

**Features**:
- Marketing descriptions (not internal operational data)
- Public pricing transparency
- Photo galleries and virtual tours
- Matryoshka embeddings (Tier 1: 1024d, Tier 3: 3072d)
- Highlights array for quick feature display
- RLS: Public read access, staff write access

**Indexes**:
- `idx_accommodation_public_tenant` - Tenant filtering
- `idx_accommodation_public_type` - Unit type filtering
- `idx_accommodation_public_embedding_fast_hnsw` - HNSW vector search (ultra-fast)

**Trigger**:
- Auto-update `updated_at` timestamp on modifications

---

### 3. `20251001015200_add_match_accommodations_public_function.sql`
**Purpose**: Vector search RPC function for accommodation discovery

**Function**: `match_accommodations_public()`

**Parameters**:
- `query_embedding` - vector(1024) - Query embedding (Tier 1)
- `p_tenant_id` - UUID - Tenant filter
- `match_threshold` - FLOAT - Similarity threshold (default 0.3)
- `match_count` - INT - Results limit (default 4)

**Returns**:
- `id` - Unit ID
- `content` - Rich text for LLM context
- `similarity` - Cosine similarity score
- `source_file` - Source identifier
- `pricing` - JSONB pricing data
- `photos` - JSONB photo array
- `metadata` - Full unit metadata

**Performance**: Uses HNSW index for <50ms typical response time

**Permissions**: Granted to `authenticated` and `anon` roles

---

## Supporting Files

### `scripts/cleanup-expired-sessions.sql`
**Purpose**: Daily cron job to remove expired sessions

**Schedule**: Daily at 3:00 AM

**Setup Options**:
1. **pg_cron** (requires extension)
2. **External scheduler** (crontab, GitHub Actions)
3. **Supabase Edge Functions** (scheduled function)

### `scripts/migrate-accommodation-units-public.ts`
**Purpose**: Populate accommodation_units_public from existing data

**Features**:
- Reads from `accommodation_units` table
- Transforms to marketing-focused format
- Generates Matryoshka embeddings (3072d + 1024d)
- Rate-limited API calls
- Progress logging

**Usage**:
```bash
npx tsx scripts/migrate-accommodation-units-public.ts
```

---

## Migration Order

1. Apply `20251001015000_add_prospective_sessions_table.sql`
2. Apply `20251001015100_add_accommodation_units_public_table.sql`
3. Apply `20251001015200_add_match_accommodations_public_function.sql`
4. Run `scripts/migrate-accommodation-units-public.ts` to populate data
5. Schedule `scripts/cleanup-expired-sessions.sql` as daily cron job

---

## Validation Queries

### Check prospective_sessions
```sql
SELECT 
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired
FROM prospective_sessions;
```

### Check accommodation_units_public
```sql
SELECT 
  tenant_id,
  COUNT(*) as units,
  COUNT(CASE WHEN embedding_fast IS NOT NULL THEN 1 END) as with_embeddings,
  COUNT(CASE WHEN is_bookable THEN 1 END) as bookable
FROM accommodation_units_public
GROUP BY tenant_id;
```

### Test vector search
```sql
SELECT 
  id, 
  substring(content, 1, 100) as preview,
  similarity,
  pricing->>'base_price_night' as price
FROM match_accommodations_public(
  (SELECT embedding_fast FROM accommodation_units_public LIMIT 1),
  (SELECT tenant_id FROM tenant_registry WHERE slug = 'simmerdown'),
  0.3,
  4
);
```

### Index usage validation
```sql
SELECT 
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE tablename IN ('prospective_sessions', 'accommodation_units_public')
ORDER BY idx_scan DESC;
```

---

## Performance Expectations

- **Session lookup**: <10ms (cookie index)
- **Vector search**: <50ms (HNSW index on 1024d)
- **Session creation**: <20ms
- **Data migration**: ~500ms per unit (rate-limited)

---

## Security Notes

### RLS Policies
- ✅ `prospective_sessions` - Public can create/read active sessions
- ✅ `accommodation_units_public` - Public read-only for bookable units
- ✅ Staff access filtered by tenant_id via JWT

### Data Isolation
- All queries filtered by `tenant_id`
- Anonymous sessions cannot access other tenants' data
- Staff access validated via JWT claims

### Privacy
- Cookie-based tracking (no PII required)
- Sessions expire after 7 days
- Conversion tracking for analytics only

---

## Rollback Procedures

### Rollback migration 3
```sql
DROP FUNCTION IF EXISTS match_accommodations_public;
```

### Rollback migration 2
```sql
DROP TRIGGER IF EXISTS trigger_accommodation_units_public_updated_at ON accommodation_units_public;
DROP FUNCTION IF EXISTS update_accommodation_units_public_updated_at;
DROP TABLE IF EXISTS accommodation_units_public CASCADE;
```

### Rollback migration 1
```sql
DROP TABLE IF EXISTS prospective_sessions CASCADE;
```

---

## Next Steps

1. Apply migrations to development environment
2. Test vector search performance
3. Run data migration script
4. Validate RLS policies
5. Schedule cleanup cron job
6. Monitor index usage and query performance
7. Apply to staging environment
8. Final production deployment

---

## Related Documentation

- `plan.md` lines 1238-1372 - FASE B specification
- `docs/backend/MATRYOSHKA_ARCHITECTURE.md` - Embedding system
- `docs/backend/MULTI_TENANT_ARCHITECTURE.md` - Tenant isolation
- `CLAUDE.md` - Project guidelines

---

**Status**: ✅ Migrations created, ready for review and testing

**Author**: Database Agent (Claude Code)

**Date**: 2025-10-01
