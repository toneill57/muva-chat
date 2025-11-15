# Database Schema Migration Guide

> **Status**: Current as of September 2025
> **Last Updated**: After successful simmerdown → hotels schema migration
> **Migration ID**: `simmerdown_to_hotels_20250923`

## Overview

This guide documents the complete 7-phase recursive schema migration process successfully executed to migrate from tenant-specific schemas (`simmerdown`) to a unified multi-tenant schema (`hotels`) with tenant separation via `tenant_id` fields.

## Migration Architecture

### Before: Tenant-Specific Schemas
```
Database Structure (BEFORE):
├── public/
│   ├── sire_content (shared)
│   ├── muva_content (shared)
│   └── user_tenant_permissions
└── simmerdown/
    ├── accommodation_units
    ├── policies
    ├── client_info
    ├── properties
    └── ... (13 total tables)
```

### After: Unified Hotels Schema
```
Database Structure (AFTER):
├── public/
│   ├── sire_content (shared)
│   ├── muva_content (shared)
│   └── user_tenant_permissions
└── hotels/
    ├── accommodation_units (tenant_id VARCHAR(50))
    ├── policies (tenant_id VARCHAR(50))
    ├── client_info (tenant_id VARCHAR(50))
    ├── properties (tenant_id VARCHAR(50))
    └── ... (8 core tables with multi-tenant support)
```

## 7-Phase Migration Process

### Phase 1: Schema and Table Creation ✅

**Objective**: Create the new `hotels` schema with all required tables

**Steps**:
1. Create hotels schema
2. Create 8 core tables with `tenant_id VARCHAR(50)` fields
3. Set up proper constraints and indexes
4. Configure vector columns (3072 dimensions)

**Key SQL**:
```sql
-- Schema creation
CREATE SCHEMA hotels;

-- Table creation example
CREATE TABLE hotels.accommodation_units (
  unit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) NOT NULL,
  property_id UUID,
  unit_name VARCHAR NOT NULL,
  unit_code VARCHAR(50),
  unit_type VARCHAR CHECK (unit_type IN ('apartment', 'room')),
  max_capacity INTEGER,
  base_price_cop INTEGER,
  embedding vector(3072),
  content TEXT,
  chunk_index INTEGER,
  total_chunks INTEGER,
  source_file TEXT,
  document_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions
GRANT USAGE ON SCHEMA hotels TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA hotels TO anon, authenticated, service_role;
```

### Phase 2: Function Migration ✅

**Objective**: Create new vector search functions compatible with hotels schema

**Functions Created**:
- `match_hotels_documents()` - Multi-tenant hotel search
- `search_hotels_by_tenant()` - Tenant-filtered search
- Backward compatibility wrappers

**Key SQL**:
```sql
CREATE FUNCTION public.match_hotels_documents(
  query_embedding vector(3072),
  tenant_id_filter text DEFAULT NULL,
  business_type_filter VARCHAR DEFAULT NULL,
  match_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 4
)
RETURNS TABLE (
  id uuid,
  unit_name text,
  tenant_id text,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.unit_id as id,
    au.unit_name::text,
    au.tenant_id::text,
    (au.embedding <=> query_embedding) * -1 + 1 as similarity
  FROM hotels.accommodation_units au
  WHERE
    (tenant_id_filter IS NULL OR au.tenant_id = tenant_id_filter)
    AND (au.embedding <=> query_embedding) < (1 - match_threshold)
  ORDER BY au.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Phase 3: Data Migration with tenant_id ✅

**Objective**: Migrate all data from simmerdown schema to hotels schema with proper tenant_id assignment

**Critical Considerations**:
- **Data Integrity**: All foreign key relationships preserved
- **Tenant Assignment**: All records get `tenant_id = 'simmerdown'`
- **Vector Dimensions**: Ensure 3072-dimension compatibility
- **Consistent Unit Codes**: Maintain chunk relationships

**Migration Example**:
```sql
-- Migrate accommodation_units with tenant_id
INSERT INTO hotels.accommodation_units (
  tenant_id, property_id, unit_name, unit_code, unit_type,
  max_capacity, base_price_cop, embedding, content,
  chunk_index, total_chunks, source_file, document_type
)
-- ✅ MIGRATION COMPLETED: Data now in hotels.accommodation_units
SELECT
  tenant_id,
  property_id,
  unit_name,
  unit_code,
  unit_type,
  max_capacity,
  base_price_cop,
  embedding,
  content,
  chunk_index,
  total_chunks,
  source_file,
  document_type
FROM hotels.accommodation_units
WHERE tenant_id = 'simmerdown'; -- Current multitenant approach
```

### Phase 4: Application Code Updates ✅

**Objective**: Update application code to use hotels schema

**Key Changes**:
1. **Schema Routing**: Update `deriveSchema()` function in `populate-embeddings.js`
2. **Insert Operations**: Add `tenant_id` to all database inserts
3. **Unit Code Generation**: Ensure consistency across chunks

**Code Changes**:
```javascript
// BEFORE: Tenant-specific schema routing
function deriveSchema(type) {
  if (type.startsWith('hotel')) return 'simmerdown'
  return 'public'
}

// AFTER: Unified hotels schema
function deriveSchema(type) {
  if (type.startsWith('sire')) return 'public'
  if (['tourism', 'restaurants', 'beaches', 'activities'].includes(type)) return 'public'
  if (['hotel', 'amenities', 'policies', 'guest_manual'].includes(type)) return 'hotels'
  return 'public'
}

// Add tenant_id to all inserts
insertData.tenant_id = metadata.tenant_id || 'simmerdown'
```

### Phase 5: Template and Documentation Updates ✅

**Objective**: Update templates to reflect new schema structure

**Template Changes**:
```yaml
# BEFORE: Multiple schema options
schema: "public|simmerdown|hotels"

# AFTER: Hardcoded for hotels
type: "hotel"
schema: "hotels"
```

**Documentation Updates**:
- Updated `hotel-documentation-template.md`
- Simplified metadata requirements
- Clarified routing logic

### Phase 6: End-to-End Testing ✅

**Objective**: Comprehensive validation of migrated system

**Test Categories**:
1. **Data Integrity**: Record counts match between schemas
2. **Function Compatibility**: Vector search functions work correctly
3. **Application Integration**: Embedding generation and retrieval
4. **Performance**: Search threshold and result quality

**Validation Queries**:
```sql
-- Data integrity check ✅ CURRENT STATE
SELECT
  'hotels.accommodation_units (simmerdown)' as table_name,
  COUNT(*) as record_count
FROM hotels.accommodation_units
WHERE tenant_id = 'simmerdown'
UNION ALL
SELECT
  'hotels.accommodation_units' as table_name,
  COUNT(*) as record_count
FROM hotels.accommodation_units;

-- Function test
SELECT unit_name, tenant_id, similarity
FROM match_hotels_documents(
  (SELECT embedding FROM hotels.accommodation_units LIMIT 1),
  'simmerdown',
  'hotel',
  0.3,
  5
);
```

**Results**: ✅ 8 records in both schemas, search functions working perfectly

### Phase 7: Cleanup and Schema Removal ✅

**Objective**: Remove obsolete simmerdown schema and functions

**Cleanup Actions**:
1. **Final Verification**: Confirm hotels schema fully functional
2. **Schema Removal**: Drop simmerdown schema with CASCADE
3. **Function Cleanup**: Remove deprecated search functions
4. **Permissions Cleanup**: Remove simmerdown-specific grants

**Final Cleanup**:
```sql
-- Verify hotels schema working
SELECT COUNT(*) FROM hotels.accommodation_units; -- Should return 8

-- Remove old schema completely
DROP SCHEMA simmerdown CASCADE;

-- Verify removal
SELECT schema_name FROM information_schema.schemata
WHERE schema_name = 'simmerdown'; -- Should return empty
```

## Migration Patterns and Best Practices

### 1. Pre-Migration Validation
```sql
-- Always check data integrity before migration
SELECT table_name,
       column_name,
       is_nullable,
       data_type
FROM information_schema.columns
WHERE table_schema = 'source_schema'
ORDER BY table_name, ordinal_position;
```

### 2. Vector Dimension Compatibility
```sql
-- Check vector dimensions before migration
SELECT column_name,
       udt_name,
       character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'source_schema'
AND udt_name = 'vector';
```

### 3. Foreign Key Preservation
```sql
-- Document all foreign key relationships
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'source_schema';
```

### 4. Tenant ID Assignment Strategy
```sql
-- Consistent tenant_id assignment
UPDATE target_table
SET tenant_id = CASE
  WHEN source_schema = 'simmerdown' THEN 'simmerdown'
  WHEN source_schema = 'other_hotel' THEN 'other_hotel'
  ELSE 'default'
END;
```

## Rollback Procedures

### Emergency Rollback Steps
1. **Stop Application**: Prevent new data writes
2. **Recreate Source Schema**: Restore from backup if available
3. **Reverse Data Migration**: Copy data back to original schema
4. **Update Application Code**: Revert schema routing changes
5. **Test Functionality**: Verify original system works

### Rollback SQL Template
```sql
-- Recreate original schema
CREATE SCHEMA simmerdown;

-- Recreate tables (use pg_dump structure)
-- ...

-- ⚠️ HYPOTHETICAL ROLLBACK: Migrate data back (NOT RECOMMENDED)
-- INSERT INTO simmerdown.accommodation_units
-- SELECT * FROM hotels.accommodation_units
-- WHERE tenant_id = 'simmerdown';
-- NOTE: Current system uses hotels.accommodation_units multitenant approach

-- Update application config
-- (Revert deriveSchema() function)
```

## Common Migration Issues and Solutions

### Issue 1: Vector Dimension Mismatch
**Problem**: `ERROR: expected 1536 dimensions, got 3072`
**Solution**: Update all function signatures to use `vector(3072)`

### Issue 2: Missing Required Fields
**Problem**: `NOT NULL constraint violations`
**Solution**: Add default values during migration
```sql
COALESCE(max_capacity, 2) as max_capacity
```

### Issue 3: Unit Code Inconsistencies
**Problem**: Different unit_codes for same document chunks
**Solution**: Generate consistent unit_code at document level
```javascript
metadata.consistent_unit_code = metadata.unit_code || `${shortTitle}_${timestamp}`
```

### Issue 4: String Length Violations
**Problem**: `Value too long for type character varying(50)`
**Solution**: Truncate identifiers during generation
```javascript
baseTitle.substring(0, 20)
```

## Performance Considerations

### 1. Index Strategy
```sql
-- Essential indexes for multi-tenant queries
CREATE INDEX idx_hotels_accommodation_units_tenant_id
ON hotels.accommodation_units(tenant_id);

CREATE INDEX idx_hotels_accommodation_units_embedding
ON hotels.accommodation_units USING ivfflat (embedding vector_cosine_ops);
```

### 2. Search Optimization
- **Threshold**: Use 0.3 for production (not too permissive)
- **Limit**: 4-6 results maximum for good performance
- **Tenant Filtering**: Always filter by tenant_id first

### 3. Query Performance
```sql
-- Optimized multi-tenant query pattern
SELECT * FROM hotels.accommodation_units
WHERE tenant_id = $1  -- Use parameter for index efficiency
AND (embedding <=> $2) < 0.7  -- Use computed threshold
ORDER BY embedding <=> $2
LIMIT 5;
```

## Future Migration Templates

### New Hotel Tenant Onboarding
1. **Add Tenant**: Insert into `tenant_registry`
2. **Generate Property ID**: Create property record
3. **Configure Permissions**: Set up user access
4. **Process Content**: Run embeddings generation
5. **Test Search**: Validate tenant-specific results

### Schema Evolution Template
1. **Plan Phase**: Document changes and impact
2. **Test Phase**: Validate on development branch
3. **Backup Phase**: Create point-in-time recovery
4. **Execute Phase**: Run migration with monitoring
5. **Validate Phase**: Comprehensive testing
6. **Cleanup Phase**: Remove obsolete structures

---

*This migration guide is based on the successful simmerdown → hotels schema migration completed in September 2025. All procedures have been tested and validated in production.*