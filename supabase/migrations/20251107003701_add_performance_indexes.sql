-- Migration: Add Performance Indexes
-- Created: 2025-11-06
-- Purpose: Optimize query performance for frequently accessed tables
-- Related: docs/performance-optimization/N1_ANALYSIS_DETAILED.md

-- ============================================================================
-- 1. Accommodation Units - Tenant + MotoPress ID Lookup
-- ============================================================================
-- Used by: MotoPress sync to check if unit exists
-- Query pattern: WHERE tenant_id = X AND motopress_unit_id = Y
-- Frequency: High (every sync operation)
-- Impact: 30x improvement on sync operations

CREATE INDEX IF NOT EXISTS idx_accommodation_units_tenant_motopress
ON hotels.accommodation_units(tenant_id, motopress_unit_id);

COMMENT ON INDEX hotels.idx_accommodation_units_tenant_motopress IS
'Optimizes MotoPress sync SELECT queries checking for existing units';

-- ============================================================================
-- 2. Integration Configs - Tenant + Type + Active Status
-- ============================================================================
-- Used by: All integration managers to fetch active config
-- Query pattern: WHERE tenant_id = X AND integration_type = Y AND is_active = true
-- Frequency: High (every integration operation)
-- Impact: Faster config lookups

CREATE INDEX IF NOT EXISTS idx_integration_configs_tenant_type_active
ON public.integration_configs(tenant_id, integration_type, is_active);

COMMENT ON INDEX public.idx_integration_configs_tenant_type_active IS
'Optimizes integration config lookups by tenant and type';

-- ============================================================================
-- 3. Calendar Events - Sync Feed Foreign Key
-- ============================================================================
-- SKIPPED: sync_feed_id column does not exist in calendar_events table
-- TODO: Add this index when sync_feed_id column is added to schema

-- CREATE INDEX IF NOT EXISTS idx_calendar_events_sync_feed
-- ON public.calendar_events(sync_feed_id)
-- WHERE sync_feed_id IS NOT NULL;

-- ============================================================================
-- 4. Calendar Event Changes - Event ID
-- ============================================================================
-- SKIPPED: calendar_event_changes table does not exist
-- TODO: Add this index when calendar_event_changes table is added to schema

-- CREATE INDEX IF NOT EXISTS idx_calendar_event_changes_event_id
-- ON public.calendar_event_changes(calendar_event_id);

-- ============================================================================
-- 5. Accommodation Units - Hotel ID (for JOINs)
-- ============================================================================
-- Used by: Queries joining accommodation units with hotels
-- Query pattern: JOIN ON accommodation_units.hotel_id = hotels.id
-- Frequency: High (guest chat, search)
-- Impact: Faster JOIN operations

CREATE INDEX IF NOT EXISTS idx_accommodation_units_hotel_id
ON hotels.accommodation_units(hotel_id);

COMMENT ON INDEX hotels.idx_accommodation_units_hotel_id IS
'Optimizes JOIN operations between units and hotels';

-- ============================================================================
-- 6. Accommodation Units - Status + Tenant (for active units queries)
-- ============================================================================
-- Used by: Public searches for active accommodations
-- Query pattern: WHERE tenant_id = X AND status = 'active'
-- Frequency: Very High (every public search)
-- Impact: Faster public accommodation searches

CREATE INDEX IF NOT EXISTS idx_accommodation_units_tenant_status
ON hotels.accommodation_units(tenant_id, status)
WHERE status = 'active';

COMMENT ON INDEX hotels.idx_accommodation_units_tenant_status IS
'Partial index for active accommodation lookups (most common case)';

-- ============================================================================
-- 7. Performance Analysis: Verify Index Usage
-- ============================================================================
-- Run these queries to verify indexes are being used:

-- Example 1: Check MotoPress sync query
-- EXPLAIN ANALYZE
-- SELECT id FROM hotels.accommodation_units
-- WHERE tenant_id = 'some-tenant-id'
-- AND motopress_unit_id = 123;
-- Should show: Index Scan using idx_accommodation_units_tenant_motopress

-- Example 2: Check integration config query
-- EXPLAIN ANALYZE
-- SELECT * FROM integration_configs
-- WHERE tenant_id = 'some-tenant-id'
-- AND integration_type = 'motopress'
-- AND is_active = true;
-- Should show: Index Scan using idx_integration_configs_tenant_type_active

-- ============================================================================
-- Index Statistics (After Running Production Workload)
-- ============================================================================
-- Query to monitor index usage:
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE indexname LIKE 'idx_%'
-- ORDER BY idx_scan DESC;

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
-- DROP INDEX IF EXISTS hotels.idx_accommodation_units_tenant_motopress;
-- DROP INDEX IF EXISTS public.idx_integration_configs_tenant_type_active;
-- DROP INDEX IF EXISTS public.idx_calendar_events_sync_feed; -- Not created (column doesn't exist)
-- DROP INDEX IF EXISTS public.idx_calendar_event_changes_event_id; -- Not created (table doesn't exist)
-- DROP INDEX IF EXISTS hotels.idx_accommodation_units_hotel_id;
-- DROP INDEX IF EXISTS hotels.idx_accommodation_units_tenant_status;
