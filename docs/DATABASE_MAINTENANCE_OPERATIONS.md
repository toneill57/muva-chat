# Database Maintenance Operations Guide

> **Status**: Current as of September 2025
> **Last Updated**: After hotels schema implementation
> **Scope**: Multi-tenant PostgreSQL with pgvector embeddings

## Overview

This guide covers essential database maintenance operations for MUVA's multi-tenant architecture, including schema management, vector embeddings, and performance optimization procedures.

## Architecture Summary

### Current Database Structure
```
PostgreSQL Database (Supabase)
├── public/
│   ├── sire_content (shared compliance data)
│   ├── muva_content (shared tourism data)
│   ├── tenant_registry (tenant metadata)
│   └── user_tenant_permissions (access control)
├── hotels/
│   ├── accommodation_units (tenant_id filtering)
│   ├── policies (tenant_id filtering)
│   ├── client_info (tenant_id filtering)
│   ├── properties (tenant_id filtering)
│   ├── guest_information (tenant_id filtering)
│   ├── unit_amenities (tenant_id filtering)
│   ├── pricing_rules (tenant_id filtering)
│   └── content (tenant_id filtering)
└── Extensions:
    ├── pgvector (vector similarity search)
    └── uuid-ossp (UUID generation)
```

### Key Specifications
- **Vector Dimensions**: 3072 (text-embedding-3-large)
- **Tenant Separation**: `tenant_id VARCHAR(50)` field
- **Search Threshold**: 0.3 (production optimized)
- **Index Strategy**: ivfflat for vector columns

## Core Maintenance Operations

### 1. Schema Management

#### Create New Tenant Schema (Legacy Pattern - Deprecated)
```sql
-- DEPRECATED: Individual schemas per tenant
-- New tenants use hotels schema with tenant_id separation
```

#### Add New Hotel Tenant (Current Pattern)
```sql
-- 1. Register tenant
INSERT INTO public.tenant_registry (
  tenant_id, nit, razon_social, nombre_comercial, tenant_type
) VALUES (
  gen_random_uuid(),
  '900123456',
  'HOTEL EXAMPLE SAS',
  'Hotel Example',
  'hotel'
);

-- 2. Create property record
INSERT INTO hotels.properties (
  property_id, tenant_id, property_name, address, city, country
) VALUES (
  gen_random_uuid(),
  'hotel_example', -- tenant_id
  'Hotel Example',
  'Calle Example 123',
  'San Andrés',
  'Colombia'
);

-- 3. Set up user permissions
INSERT INTO public.user_tenant_permissions (
  user_id, tenant_id, role, permissions, is_active
) VALUES (
  'user-uuid',
  'hotel_example',
  'admin',
  '{"sire_access": true, "muva_access": true}',
  true
);
```

#### Schema Permissions Management
```sql
-- Grant standard permissions for hotels schema
GRANT USAGE ON SCHEMA hotels TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA hotels TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA hotels TO anon, authenticated, service_role;

-- Grant permissions for specific functions
GRANT EXECUTE ON FUNCTION public.match_hotels_documents TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_hotels_by_tenant TO anon, authenticated;
```

### 2. Vector Embeddings Management

#### Check Vector Dimensions
```sql
-- Verify vector column specifications
SELECT
  schemaname,
  tablename,
  attname as column_name,
  format_type(atttypid, atttypmod) as data_type
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE format_type(atttypid, atttypmod) LIKE 'vector%'
ORDER BY schemaname, tablename;
```

#### Vector Index Management
```sql
-- Create vector indexes for performance
CREATE INDEX IF NOT EXISTS idx_hotels_accommodation_units_embedding
ON hotels.accommodation_units USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_sire_content_embedding
ON public.sire_content USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_muva_content_embedding
ON public.muva_content USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

#### Embedding Quality Validation
```sql
-- Check for null embeddings
SELECT
  schemaname.tablename,
  COUNT(*) as total_records,
  COUNT(embedding) as records_with_embeddings,
  COUNT(*) - COUNT(embedding) as null_embeddings
FROM (
  SELECT 'hotels' as schemaname, 'accommodation_units' as tablename, embedding FROM hotels.accommodation_units
  UNION ALL
  SELECT 'public' as schemaname, 'sire_content' as tablename, embedding FROM public.sire_content
  UNION ALL
  SELECT 'public' as schemaname, 'muva_content' as tablename, embedding FROM public.muva_content
) as combined
GROUP BY schemaname.tablename;
```

#### Vector Dimension Validation
```sql
-- Validate vector dimensions are consistent
WITH vector_dims AS (
  SELECT
    'hotels.accommodation_units' as table_name,
    array_length(embedding::real[], 1) as dimensions
  FROM hotels.accommodation_units
  WHERE embedding IS NOT NULL
  LIMIT 1

  UNION ALL

  SELECT
    'public.sire_content' as table_name,
    array_length(embedding::real[], 1) as dimensions
  FROM public.sire_content
  WHERE embedding IS NOT NULL
  LIMIT 1
)
SELECT * FROM vector_dims;
-- Expected result: All should show 3072 dimensions
```

### 3. Multi-Tenant Data Operations

#### Tenant Data Isolation Verification
```sql
-- Verify tenant separation in hotels schema
SELECT
  tenant_id,
  COUNT(*) as record_count,
  COUNT(DISTINCT unit_code) as unique_units
FROM hotels.accommodation_units
GROUP BY tenant_id
ORDER BY tenant_id;
```

#### Cross-Tenant Data Validation
```sql
-- Ensure no data leakage between tenants
SELECT
  tenant_id,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record,
  COUNT(DISTINCT source_file) as unique_files
FROM hotels.accommodation_units
WHERE tenant_id IS NOT NULL
GROUP BY tenant_id;
```

#### Tenant User Access Audit
```sql
-- Review user permissions across tenants
SELECT
  utp.tenant_id,
  tr.nombre_comercial,
  COUNT(utp.user_id) as user_count,
  STRING_AGG(DISTINCT utp.role, ', ') as roles,
  COUNT(CASE WHEN utp.is_active THEN 1 END) as active_users
FROM public.user_tenant_permissions utp
JOIN public.tenant_registry tr ON utp.tenant_id::uuid = tr.tenant_id
GROUP BY utp.tenant_id, tr.nombre_comercial
ORDER BY tr.nombre_comercial;
```

### 4. Search Function Management

#### Function Health Check
```sql
-- Test all search functions
SELECT
  routine_name,
  routine_schema,
  routine_type,
  is_deterministic
FROM information_schema.routines
WHERE routine_name LIKE '%match%'
AND routine_schema IN ('public', 'hotels')
ORDER BY routine_name;
```

#### Search Performance Testing
```sql
-- Test search function performance
EXPLAIN ANALYZE
SELECT unit_name, tenant_id, (embedding <=> $1) as distance
FROM hotels.accommodation_units
WHERE tenant_id = 'simmerdown'
AND (embedding <=> $1) < 0.7
ORDER BY embedding <=> $1
LIMIT 5;
```

#### Function Parameter Validation
```sql
-- Verify function signatures
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%match%'
AND n.nspname = 'public'
ORDER BY p.proname;
```

### 5. Performance Optimization

#### Index Usage Analysis
```sql
-- Check index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as index_tuples_read,
  idx_tup_fetch as index_tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname IN ('public', 'hotels')
AND indexname LIKE '%embedding%'
ORDER BY idx_scan DESC;
```

#### Table Size Analysis
```sql
-- Monitor table sizes for capacity planning
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname IN ('public', 'hotels')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Query Performance Monitoring
```sql
-- Monitor slow queries (requires pg_stat_statements)
SELECT
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
WHERE query LIKE '%embedding%'
OR query LIKE '%match_%'
ORDER BY mean_time DESC
LIMIT 10;
```

### 6. Data Integrity Maintenance

#### Chunk Consistency Validation
```sql
-- Verify chunk integrity for embeddings
SELECT
  tenant_id,
  unit_code,
  total_chunks,
  COUNT(*) as actual_chunks,
  CASE
    WHEN total_chunks = COUNT(*) THEN 'OK'
    ELSE 'INCONSISTENT'
  END as status
FROM hotels.accommodation_units
WHERE unit_code IS NOT NULL
GROUP BY tenant_id, unit_code, total_chunks
HAVING total_chunks != COUNT(*)
ORDER BY tenant_id, unit_code;
```

#### Foreign Key Integrity Check
```sql
-- Verify referential integrity
SELECT
  conrelid::regclass as table_name,
  conname as constraint_name,
  confrelid::regclass as referenced_table
FROM pg_constraint
WHERE contype = 'f'
AND connamespace IN (
  SELECT oid FROM pg_namespace WHERE nspname IN ('public', 'hotels')
)
ORDER BY table_name;
```

#### Content Duplication Detection
```sql
-- Detect potential duplicate content
SELECT
  tenant_id,
  content,
  COUNT(*) as duplicate_count
FROM hotels.accommodation_units
WHERE content IS NOT NULL
GROUP BY tenant_id, content
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

### 7. Backup and Recovery

#### Pre-Migration Backup
```sql
-- Create point-in-time backup before major operations
SELECT pg_start_backup('maintenance_backup_' || to_char(now(), 'YYYY_MM_DD_HH24_MI'));
-- Perform backup operations...
SELECT pg_stop_backup();
```

#### Schema-Specific Backup
```bash
# Backup specific schema
pg_dump -h hostname -U username -d database \
  --schema=hotels \
  --format=custom \
  --file=hotels_schema_backup_$(date +%Y%m%d_%H%M%S).dump
```

#### Selective Data Export
```sql
-- Export tenant-specific data
COPY (
  SELECT * FROM hotels.accommodation_units
  WHERE tenant_id = 'simmerdown'
) TO '/tmp/simmerdown_data_backup.csv' WITH CSV HEADER;
```

### 8. Monitoring and Alerting

#### Vector Search Health Check
```sql
-- Daily vector search health check
WITH search_metrics AS (
  SELECT
    COUNT(*) as total_embeddings,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as valid_embeddings,
    AVG(array_length(embedding::real[], 1)) as avg_dimensions
  FROM hotels.accommodation_units
)
SELECT
  total_embeddings,
  valid_embeddings,
  total_embeddings - valid_embeddings as null_embeddings,
  ROUND(avg_dimensions) as dimensions,
  CASE
    WHEN valid_embeddings::float / total_embeddings > 0.95 THEN 'HEALTHY'
    ELSE 'NEEDS_ATTENTION'
  END as status
FROM search_metrics;
```

#### Tenant Growth Monitoring
```sql
-- Monitor tenant data growth
SELECT
  tenant_id,
  COUNT(*) as current_records,
  MAX(created_at) as last_activity,
  COUNT(DISTINCT DATE(created_at)) as active_days
FROM hotels.accommodation_units
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tenant_id
ORDER BY current_records DESC;
```

#### System Resource Usage
```sql
-- Monitor database resource usage
SELECT
  setting as max_connections,
  (SELECT count(*) FROM pg_stat_activity) as current_connections,
  (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
FROM pg_settings WHERE name = 'max_connections';
```

## Emergency Procedures

### 1. Vector Index Corruption Recovery
```sql
-- Drop and recreate corrupted vector indexes
DROP INDEX IF EXISTS idx_hotels_accommodation_units_embedding;
CREATE INDEX idx_hotels_accommodation_units_embedding
ON hotels.accommodation_units USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Analyze table after index recreation
ANALYZE hotels.accommodation_units;
```

### 2. Search Function Recovery
```sql
-- Recreate search function if corrupted
DROP FUNCTION IF EXISTS public.match_hotels_documents;

-- Recreate function with correct signature
CREATE FUNCTION public.match_hotels_documents(
  query_embedding vector(3072),
  tenant_id_filter text DEFAULT NULL,
  business_type_filter VARCHAR DEFAULT NULL,
  match_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 4
)
-- ... (full function definition)
```

### 3. Tenant Data Recovery
```sql
-- Recover tenant data from backup
-- 1. Disable applications
-- 2. Restore from point-in-time backup
-- 3. Validate data integrity
-- 4. Re-enable applications

-- Validation query after recovery
SELECT
  COUNT(*) as recovered_records,
  COUNT(DISTINCT tenant_id) as tenants,
  MAX(created_at) as latest_record
FROM hotels.accommodation_units;
```

## Routine Maintenance Schedule

### Daily Tasks
- [ ] Vector search health check
- [ ] Monitor active connections
- [ ] Check for null embeddings

### Weekly Tasks
- [ ] Analyze table statistics
- [ ] Review index usage
- [ ] Monitor table sizes
- [ ] Tenant access audit

### Monthly Tasks
- [ ] Full backup validation
- [ ] Performance baseline review
- [ ] Schema growth analysis
- [ ] Function performance testing

### Quarterly Tasks
- [ ] Index optimization review
- [ ] Schema evolution planning
- [ ] Capacity planning update
- [ ] Security audit

---

*This maintenance guide covers the current multi-tenant architecture as of September 2025. Update procedures as the system evolves.*