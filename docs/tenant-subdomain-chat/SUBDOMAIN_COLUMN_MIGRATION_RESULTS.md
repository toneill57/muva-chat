# Subdomain Column Migration Results

**Date:** October 9, 2025  
**Migration File:** `supabase/migrations/20251009140100_add_subdomain_to_tenants.sql`  
**Status:** ✅ SUCCESS

---

## Overview

Added `subdomain` column to `tenant_registry` table to enable tenant lookup by subdomain for the Multi-Tenant Subdomain Chat feature.

---

## Migration Details

### DDL Executed

```sql
-- Step 1: Add subdomain column as nullable first (since we have existing data)
ALTER TABLE tenant_registry
ADD COLUMN subdomain text;

-- Step 2: Populate subdomain from existing slug values for current tenants
UPDATE tenant_registry
SET subdomain = slug
WHERE subdomain IS NULL;

-- Step 3: Add NOT NULL constraint now that all rows have values
ALTER TABLE tenant_registry
ALTER COLUMN subdomain SET NOT NULL;

-- Step 4: Add unique constraint to prevent duplicate subdomains
ALTER TABLE tenant_registry
ADD CONSTRAINT tenant_registry_subdomain_key UNIQUE (subdomain);

-- Step 5: Add format validation constraint (lowercase alphanumeric + hyphens only)
ALTER TABLE tenant_registry
ADD CONSTRAINT subdomain_format CHECK (subdomain ~ '^[a-z0-9-]+$');

-- Step 6: Create index for fast subdomain lookup (critical for routing performance)
CREATE INDEX tenant_registry_subdomain_idx ON tenant_registry(subdomain);

-- Step 7: Add helpful comment explaining the column's purpose
COMMENT ON COLUMN tenant_registry.subdomain IS 'Subdomain identifier for tenant routing (e.g., "simmerdown" for simmerdown.innpilot.com). Must be lowercase alphanumeric with hyphens only.';
```

### Execution Method

Used Management API via helper script (as per CLAUDE.md requirements):
```bash
set -a && source .env.local && set +a && \
npx tsx scripts/execute-ddl-via-api.ts supabase/migrations/20251009140100_add_subdomain_to_tenants.sql
```

---

## Validation Results

### 1. Column Creation ✅

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tenant_registry' AND column_name = 'subdomain';
```

**Result:**
```json
{
  "column_name": "subdomain",
  "data_type": "text",
  "is_nullable": "NO",
  "column_default": null
}
```

### 2. Constraints ✅

```sql
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'tenant_registry'::regclass 
AND conname LIKE '%subdomain%';
```

**Result:**
- `subdomain_format` (CHECK constraint) ✅
- `tenant_registry_subdomain_key` (UNIQUE constraint) ✅

### 3. Indexes ✅

```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'tenant_registry' 
AND indexname LIKE '%subdomain%';
```

**Result:**
- `tenant_registry_subdomain_key` (UNIQUE INDEX via btree) ✅
- `tenant_registry_subdomain_idx` (INDEX via btree) ✅

### 4. Data Population ✅

Existing tenants were successfully migrated:

| tenant_id | nombre_comercial | slug | subdomain | is_active |
|-----------|------------------|------|-----------|-----------|
| b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf | SimmerDown Guest House | simmerdown | simmerdown | true |
| 11111111-2222-3333-4444-555555555555 | Free Hotel Test | free-hotel-test | free-hotel-test | true |

### 5. Constraint Testing ✅

**Test 1: Duplicate subdomain (SHOULD FAIL)**
```sql
INSERT INTO tenant_registry (...) VALUES (..., 'simmerdown', ...);
```
**Result:** ❌ ERROR - `duplicate key value violates unique constraint "tenant_registry_subdomain_key"` ✅

**Test 2: Uppercase subdomain (SHOULD FAIL)**
```sql
INSERT INTO tenant_registry (...) VALUES (..., 'TestUpper', ...);
```
**Result:** ❌ ERROR - `violates check constraint "subdomain_format"` ✅

**Test 3: Underscore character (SHOULD FAIL)**
```sql
INSERT INTO tenant_registry (...) VALUES (..., 'test_underscore', ...);
```
**Result:** ❌ ERROR - `violates check constraint "subdomain_format"` ✅

**Test 4: Valid subdomain (SHOULD SUCCEED)**
```sql
INSERT INTO tenant_registry (...) VALUES (..., 'valid-subdomain-123', ...);
```
**Result:** ✅ SUCCESS - Record inserted and then deleted during cleanup

### 6. Query Performance ✅

Tested subdomain lookup query (simulates routing):
```sql
EXPLAIN ANALYZE
SELECT tenant_id, nombre_comercial, is_active
FROM tenant_registry
WHERE subdomain = 'simmerdown';
```

**Result:**
- Planning Time: 0.629 ms
- Execution Time: 0.102 ms
- Total: **0.731 ms** ✅ (excellent performance for routing)

**Note:** Currently using Sequential Scan (only 2 rows). Index will be utilized automatically when table grows.

---

## Database State After Migration

### Schema
```
tenant_registry:
├── tenant_id (UUID, PK)
├── nit (VARCHAR, UNIQUE)
├── razon_social (VARCHAR)
├── nombre_comercial (VARCHAR)
├── schema_name (VARCHAR, UNIQUE)
├── slug (VARCHAR, UNIQUE, NULLABLE)
├── subdomain (TEXT, UNIQUE, NOT NULL) ← NEW
│   ├── CHECK: subdomain ~ '^[a-z0-9-]+$'
│   ├── INDEX: tenant_registry_subdomain_idx (btree)
│   └── UNIQUE INDEX: tenant_registry_subdomain_key (btree)
├── tenant_type (VARCHAR)
├── is_active (BOOLEAN)
├── subscription_tier (VARCHAR)
├── features (JSONB)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

### Current Data
- 2 active tenants
- All tenants have valid subdomains populated from existing `slug` values
- Zero NULL values in subdomain column
- All constraints enforced and tested

---

## Next Steps for Subdomain Routing Implementation

### 1. Create RPC Function for Tenant Lookup
```sql
CREATE OR REPLACE FUNCTION get_tenant_by_subdomain(p_subdomain TEXT)
RETURNS TABLE (
  tenant_id UUID,
  nombre_comercial VARCHAR,
  is_active BOOLEAN,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.tenant_id,
    tr.nombre_comercial,
    tr.is_active,
    tr.features
  FROM tenant_registry tr
  WHERE tr.subdomain = p_subdomain
  AND tr.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Add Middleware for Subdomain Detection
In Next.js middleware, extract subdomain and fetch tenant config:
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];
  
  if (subdomain && subdomain !== 'www') {
    const { data: tenant } = await supabase
      .rpc('get_tenant_by_subdomain', { p_subdomain: subdomain });
    
    if (tenant) {
      // Store tenant_id in request context
      request.headers.set('x-tenant-id', tenant.tenant_id);
    }
  }
  
  return NextResponse.next();
}
```

### 3. Update API Routes
Use tenant_id from request headers for all database queries.

### 4. Test Subdomains Locally
```bash
# Add to /etc/hosts
127.0.0.1 simmerdown.localhost
127.0.0.1 free-hotel-test.localhost

# Test
curl http://simmerdown.localhost:3000/api/tenant
```

---

## Performance Considerations

- **Index Coverage:** Both UNIQUE and regular btree indexes created for optimal performance
- **Query Time:** <1ms for subdomain lookup (0.102ms execution + 0.629ms planning)
- **Constraint Validation:** Regex check constraint is efficient for small text values
- **Scalability:** Design supports unlimited tenants without performance degradation

---

## Rollback Procedure (if needed)

```sql
-- Remove subdomain column and all associated constraints/indexes
ALTER TABLE tenant_registry DROP COLUMN subdomain CASCADE;
```

**Warning:** This will also drop:
- `tenant_registry_subdomain_key` (UNIQUE constraint)
- `subdomain_format` (CHECK constraint)
- `tenant_registry_subdomain_idx` (INDEX)

---

## References

- Migration file: `/supabase/migrations/20251009140100_add_subdomain_to_tenants.sql`
- Project documentation: `CLAUDE.md` (Database Operations Hierarchy)
- Troubleshooting: `docs/troubleshooting/SUPABASE_INTERACTION_GUIDE.md`

---

**Migration completed successfully on October 9, 2025**  
**Executed by:** @database-agent  
**Validated by:** Automated constraint tests + manual verification
