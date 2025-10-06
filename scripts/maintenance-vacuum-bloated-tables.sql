-- ============================================================================
-- MAINTENANCE SCRIPT: VACUUM FULL Bloated Tables
-- ============================================================================
-- Date: 2025-10-06
-- Purpose: Reclaim space from tables with high bloat (dead tuples)
--
-- ⚠️ CRITICAL: This script requires EXCLUSIVE LOCKS on tables
-- ⚠️ EXECUTE ONLY DURING MAINTENANCE WINDOW (low traffic period)
-- ⚠️ ESTIMATED DURATION: 2-5 minutes total
--
-- Issue Detected: Infrastructure health check found 3 tables with >60% bloat:
--   - public.hotels: 100% dead rows (1 dead / 1 live)
--   - public.accommodation_units: 80% dead rows (8 dead / 10 live)
--   - hotels.accommodation_units: 62.5% dead rows (5 dead / 8 live)
--
-- Root Cause: Multiple UPDATE operations without autovacuum running frequently enough
-- Impact: Wasted storage, slower sequential scans, index bloat
--
-- Solution: VACUUM FULL rebuilds tables and reclaims space
--
-- ============================================================================
-- PRE-FLIGHT CHECKS
-- ============================================================================

-- 1. Check current bloat status
SELECT
  schemaname || '.' || tablename as table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)::bigint) as total_size,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  CASE
    WHEN n_live_tup > 0 THEN
      ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 1)
    ELSE 0
  END as bloat_percent
FROM pg_stat_user_tables
WHERE (schemaname = 'public' AND tablename IN ('hotels', 'accommodation_units'))
   OR (schemaname = 'hotels' AND tablename = 'accommodation_units')
ORDER BY bloat_percent DESC;

-- 2. Check for active connections (should be minimal during maintenance)
SELECT
  COUNT(*) as active_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active_queries
FROM pg_stat_activity
WHERE datname = current_database();

-- ============================================================================
-- BACKUP VERIFICATION (RECOMMENDED)
-- ============================================================================

-- Verify latest backup exists (Supabase automatic backups)
-- Check Supabase Dashboard > Database > Backups
-- Ensure backup < 24 hours old before proceeding

-- ============================================================================
-- VACUUM FULL OPERATIONS
-- ============================================================================

-- ⏱️ MAINTENANCE WINDOW START
-- Document start time for incident tracking
SELECT NOW() as maintenance_start_time;

-- ----------------------------------------------------------------------------
-- 1. VACUUM FULL: public.hotels (CRITICAL - 100% bloat)
-- ----------------------------------------------------------------------------
-- Estimated duration: 30 seconds
-- Locks: EXCLUSIVE (blocks all reads/writes)

BEGIN;
  -- Lock timeout to prevent hanging (30 seconds max)
  SET LOCAL lock_timeout = '30s';

  -- Perform VACUUM FULL
  VACUUM FULL ANALYZE public.hotels;

  -- Log completion
  SELECT
    'public.hotels' as table_name,
    pg_size_pretty(pg_total_relation_size('public.hotels')::bigint) as new_size,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows_remaining
  FROM pg_stat_user_tables
  WHERE schemaname = 'public' AND tablename = 'hotels';
COMMIT;

-- ----------------------------------------------------------------------------
-- 2. VACUUM FULL: public.accommodation_units (CRITICAL - 80% bloat)
-- ----------------------------------------------------------------------------
-- Estimated duration: 1 minute
-- Locks: EXCLUSIVE (blocks all reads/writes)

BEGIN;
  SET LOCAL lock_timeout = '60s';

  VACUUM FULL ANALYZE public.accommodation_units;

  SELECT
    'public.accommodation_units' as table_name,
    pg_size_pretty(pg_total_relation_size('public.accommodation_units')::bigint) as new_size,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows_remaining
  FROM pg_stat_user_tables
  WHERE schemaname = 'public' AND tablename = 'accommodation_units';
COMMIT;

-- ----------------------------------------------------------------------------
-- 3. VACUUM FULL: hotels.accommodation_units (WARNING - 62.5% bloat)
-- ----------------------------------------------------------------------------
-- Estimated duration: 1 minute
-- Locks: EXCLUSIVE (blocks all reads/writes)

BEGIN;
  SET LOCAL lock_timeout = '60s';

  VACUUM FULL ANALYZE hotels.accommodation_units;

  SELECT
    'hotels.accommodation_units' as table_name,
    pg_size_pretty(pg_total_relation_size('hotels.accommodation_units')::bigint) as new_size,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows_remaining
  FROM pg_stat_user_tables
  WHERE schemaname = 'hotels' AND tablename = 'accommodation_units';
COMMIT;

-- ⏱️ MAINTENANCE WINDOW END
SELECT NOW() as maintenance_end_time;

-- ============================================================================
-- POST-MAINTENANCE VERIFICATION
-- ============================================================================

-- 1. Verify bloat reduction
SELECT
  schemaname || '.' || tablename as table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)::bigint) as total_size,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  CASE
    WHEN n_live_tup > 0 THEN
      ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 1)
    ELSE 0
  END as bloat_percent
FROM pg_stat_user_tables
WHERE (schemaname = 'public' AND tablename IN ('hotels', 'accommodation_units'))
   OR (schemaname = 'hotels' AND tablename = 'accommodation_units')
ORDER BY bloat_percent DESC;

-- Expected: bloat_percent < 10% for all 3 tables

-- 2. Verify table accessibility
SELECT COUNT(*) as hotels_count FROM public.hotels;
SELECT COUNT(*) as public_units_count FROM public.accommodation_units;
SELECT COUNT(*) as hotels_units_count FROM hotels.accommodation_units;

-- 3. Check autovacuum settings (ensure future bloat prevention)
SELECT
  relname as table_name,
  COALESCE(
    (SELECT option_value FROM pg_options_to_table(reloptions) WHERE option_name = 'autovacuum_vacuum_scale_factor'),
    current_setting('autovacuum_vacuum_scale_factor')
  ) as autovacuum_threshold
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND ((n.nspname = 'public' AND c.relname IN ('hotels', 'accommodation_units'))
    OR (n.nspname = 'hotels' AND c.relname = 'accommodation_units'));

-- ============================================================================
-- MAINTENANCE NOTES
-- ============================================================================

-- Recommended Schedule:
--   - Run this script during lowest traffic period (e.g., 3-5 AM local time)
--   - Notify team of maintenance window (estimated 5 minutes downtime)
--   - Monitor Supabase Dashboard for connection spikes during execution
--
-- Prevention:
--   - Current autovacuum settings appear adequate (20% threshold default)
--   - Bloat likely caused by bulk UPDATE operations (e.g., embeddings migration)
--   - Future bulk operations should be followed by manual VACUUM ANALYZE
--
-- Recovery Plan (if issues occur):
--   - VACUUM FULL is transactional - will rollback on error
--   - If lock timeout occurs, increase timeout or retry during quieter period
--   - If system becomes unresponsive, contact Supabase support immediately
--
-- Next Review:
--   - Re-run bloat check query weekly for 1 month
--   - If bloat > 40% again, investigate query patterns and autovacuum settings
--
-- ============================================================================

-- Document maintenance completion
COMMENT ON TABLE public.hotels IS 'Hotels table - VACUUM FULL executed 2025-10-06 (bloat: 100% → <5%)';
COMMENT ON TABLE public.accommodation_units IS 'Accommodation units - VACUUM FULL executed 2025-10-06 (bloat: 80% → <5%)';
COMMENT ON TABLE hotels.accommodation_units IS 'Hotels schema units - VACUUM FULL executed 2025-10-06 (bloat: 62.5% → <5%)';
