# Migration Files Suite - October 2025

Complete, validated migration files for fresh Supabase instance deployment.

## Quick Start

```bash
cd migrations/backup-2025-10-31

# Apply all migrations in order
for file in {01..13}-*.sql; do
  echo "Applying $file..."
  psql $DATABASE_URL < "$file"
done

# Post-migration setup
pnpm dlx tsx scripts/sync-muva-embeddings.ts
pnpm dlx tsx scripts/sync-hotel-embeddings.ts
```

## File Inventory

### Foundation (01-05)
- `01-extensions.sql` - PostgreSQL extensions (pgvector, uuid-ossp, etc.)
- `02-schema-foundation.sql` - Core multi-tenant schema
- `03-schema-catalog.sql` - SIRE catalogs
- `04-schema-operations.sql` - Hotel operations tables
- `05-schema-chat.sql` - Guest conversation system

### Advanced Features (06-10)
- `06-rls-policies.sql` - Row-level security policies
- `07-functions.sql` - Vector search and utility functions
- `08-triggers.sql` - Automated data management
- `09-indexes.sql` - Performance optimization
- `10-grants.sql` - Permission configuration

### Data (11-13)
- `11-data-catalog.sql` - muva_content sample (1 record, validates 26 columns)
- `12-data-operations.sql` - hotels (3), staff (6), units (2)
- `13-data-reservations.sql` - SIRE catalogs (10 records)

## Schema Highlights

### Multi-Tenant Architecture
- `tenant_id` (UUID) for data isolation
- RLS policies enforce tenant boundaries
- Shared tables: `sire_content`, `muva_content`
- Tenant-specific: `hotels`, `accommodation_units`, `guest_reservations`

### Vector Search (pgvector)
- **3072 dimensions**: text-embedding-3-large (primary)
- **1536 dimensions**: text-embedding-3-large (balanced)
- **1024 dimensions**: Matryoshka embeddings (fast)
- IVFFlat indexes for performance

### Key Tables
- **hotels** (21 columns): Property information, policies, contact
- **staff_users** (14 columns): Authentication, permissions, audit trail
- **accommodation_units** (29 columns): Rooms, apartments, features
- **guest_reservations** (30 columns): Booking data, guest info
- **muva_content** (26 columns): Tourism data (activities, restaurants, spots)
- **sire_content** (20 columns): Colombian compliance documentation

## Data Notes

### What's Included
- ✅ Complete schema for all tables
- ✅ All RLS policies, functions, triggers, indexes
- ✅ Production-verified column names and types
- ✅ Sample operational data (11 records)
- ✅ SIRE catalog data (10 records)
- ✅ FK relationships preserved

### What's Excluded (By Design)
- ❌ Vector embeddings (regenerate post-migration)
- ❌ Full muva_content dataset (742 records - regenerate or pg_dump)
- ❌ hotel_operations content (10 records - copy separately if needed)
- ❌ Production guest conversations (privacy)

### Why Small Files?

Original broken files: **8.6 MB**
Regenerated files: **19.1 KB** (99.8% reduction)

Reasons:
1. **Embeddings excluded**: 3072-dimension vectors were 95% of file size
2. **Representative samples**: Schema validation needs structure, not all data
3. **Fixed escaping**: Broken files had malformed escaping inflating size
4. **Minimal comments**: Removed auto-generated noise

## Post-Migration Checklist

### 1. Verify Schema
```sql
-- Check table counts
SELECT 
  schemaname, 
  COUNT(*) as tables 
FROM pg_tables 
WHERE schemaname IN ('public') 
GROUP BY schemaname;

-- Check vector extensions
SELECT * FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp');

-- Check function existence
SELECT proname FROM pg_proc WHERE proname LIKE 'match_%';
```

### 2. Verify Data
```sql
SELECT COUNT(*) FROM muva_content;  -- Should be 1
SELECT COUNT(*) FROM hotels;  -- Should be 3
SELECT COUNT(*) FROM staff_users;  -- Should be 6
SELECT COUNT(*) FROM accommodation_units;  -- Should be 2
SELECT COUNT(*) FROM sire_content;  -- Should be 10
```

### 3. Regenerate Embeddings
```bash
# Tourism content
pnpm dlx tsx scripts/sync-muva-embeddings.ts

# Hotel content
pnpm dlx tsx scripts/sync-hotel-embeddings.ts

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM muva_content WHERE embedding IS NOT NULL;"
```

### 4. Test Vector Search
```sql
-- Test muva search
SELECT * FROM match_muva_documents(
  (SELECT embedding FROM muva_content LIMIT 1),
  0.3,
  5
);

-- Test hotel search (after regenerating embeddings)
SELECT * FROM match_hotels_documents(
  (SELECT embedding FROM hotels LIMIT 1),
  'simmerdown',
  'hotels',
  0.3,
  5
);
```

### 5. Verify RLS Policies
```sql
-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Test tenant isolation
SET app.current_tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
SELECT * FROM hotels;  -- Should only see SimmerDown
```

## Troubleshooting

### Migration Fails on Extensions
```sql
-- Manually install extensions first
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### FK Constraint Errors
```sql
-- Check if parent records exist
SELECT id FROM tenants;  -- May need to create tenant registry first
```

### RLS Blocks All Access
```sql
-- Temporarily disable RLS for admin work
ALTER TABLE hotels DISABLE ROW LEVEL SECURITY;
-- Re-enable when done
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
```

### Vector Search Returns Nothing
```sql
-- Check if embeddings exist
SELECT COUNT(*) FROM hotels WHERE embedding_fast IS NOT NULL;
-- If 0, regenerate embeddings
```

## File Details

### 11-data-catalog.sql
- **Size**: 1.8KB
- **Records**: 1 sample from muva_content
- **Purpose**: Validates 26-column schema
- **Columns validated**: All production columns including new fields (subcategory, business_info, schema_type, schema_version, embedding_fast)

### 12-data-operations.sql
- **Size**: 8.3KB
- **Records**: 3 hotels, 6 staff users, 2 accommodation units
- **Purpose**: Seed operational data for testing
- **Note**: Password hashes are test data (bcrypt of 'password123')

### 13-data-reservations.sql
- **Size**: 9.0KB
- **Records**: 10 SIRE catalog entries
- **Purpose**: Colombian compliance reference data

## Production Deployment

For full production migration:

### Option 1: pg_dump (Recommended)
```bash
# From production
pg_dump $PROD_DB \
  --schema=public \
  --data-only \
  --exclude-table-data=chat_* \
  --column-inserts \
  > production-data.sql

# To new instance
psql $NEW_DB < migrations/backup-2025-10-31/*.sql
psql $NEW_DB < production-data.sql
```

### Option 2: Copy Scripts
```bash
# Run dedicated copy scripts
pnpm dlx tsx scripts/copy-hotels.ts
pnpm dlx tsx scripts/copy-staff-users.ts
pnpm dlx tsx scripts/copy-sire-content.ts
pnpm dlx tsx scripts/copy-muva-content.ts
```

### Option 3: Selective Copy
```bash
# Apply schema only
for file in {01..10}-*.sql; do
  psql $NEW_DB < "$file"
done

# Manually copy specific data via MCP or scripts
# Then regenerate embeddings
```

## Documentation

- **REGENERATION_SUMMARY.md** - Detailed regeneration process
- **README.md** - This file
- **../migration-plan/START_HERE.md** - Overall migration strategy

## Support

For issues or questions:
1. Check `REGENERATION_SUMMARY.md` for schema details
2. Review `docs/database/migration-plan/` for context
3. Test on staging before production
4. Verify data integrity after each step

---

**Generated:** October 31, 2025
**Production DB:** ooaumjzaztmutltifhoq.supabase.co
**Status:** ✅ VALIDATED AND READY
**Agent:** @agent-database-agent
