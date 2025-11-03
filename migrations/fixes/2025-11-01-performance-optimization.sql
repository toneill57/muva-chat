-- ===============================================================
-- PERFORMANCE OPTIMIZATION MIGRATION - For Staging/Fresh Deployments
-- Generated: 2025-11-01
-- Applied to Production: ooaumjzaztmutltifhoq (successful)
-- ===============================================================
--
-- WHAT THIS MIGRATION DOES:
-- 1. Creates 13 missing foreign key indexes for faster JOINs
-- 2. Improves multi-tenant query performance
-- 3. Optimizes calendar system and reservation lookups
--
-- WHAT THIS MIGRATION DOES NOT DO:
-- - VACUUM/ANALYZE operations (those are maintenance, not schema changes)
-- - Statistics updates (those are environment-specific)
-- - Dead tuple cleanup (automatic via autovacuum)
--
-- EXECUTION METHOD:
-- - All indexes created with CONCURRENTLY (zero downtime)
-- - Safe to run on production or staging
-- - Idempotent (uses IF NOT EXISTS)
--
-- ESTIMATED TIME: 2-3 minutes
-- DOWNTIME: 0 seconds
--
-- ===============================================================

-- ===============================================================
-- SECTION 1: APPLICATION TABLES FK INDEXES
-- ===============================================================
-- Impact: HIGH - Most frequently joined tables
-- ===============================================================

-- 1.1 Accommodation Units (multi-tenant core table)
-- Optimizes: Filtering by tenant_id AND hotel_id in multi-tenant queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accommodation_units_tenant_hotel_fk
  ON public.accommodation_units(tenant_id, hotel_id);

-- 1.2 Airbnb/Motopress Imported Reservations
-- Optimizes: JOINs to accommodation_units
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_airbnb_mphb_imported_reservations_unit_fk
  ON public.airbnb_mphb_imported_reservations(accommodation_unit_id);

-- 1.3 Prospective Sessions (conversion tracking)
-- Optimizes: Looking up conversions by reservation_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prospective_sessions_reservation_fk
  ON public.prospective_sessions(converted_to_reservation_id);

-- 1.4 Hotel Operations (audit trail)
-- Optimizes: Filtering operations by creator
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotel_operations_created_by_fk
  ON public.hotel_operations(created_by);

-- 1.5 Staff Users (user management)
-- Optimizes: Tracking who created staff users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_users_created_by_fk
  ON public.staff_users(created_by);

-- 1.6 User Tenant Permissions (authorization)
-- Optimizes: Audit trail for permission grants
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_tenant_permissions_granted_by_fk
  ON public.user_tenant_permissions(granted_by);

-- ===============================================================
-- SECTION 2: HOTELS SCHEMA FK INDEXES
-- ===============================================================
-- Impact: MEDIUM - Property management optimizations
-- ===============================================================

-- 2.1 Guest Information
-- Optimizes: JOINs to properties table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotels_guest_information_property_fk
  ON hotels.guest_information(property_id);

-- 2.2 Policies
-- Optimizes: JOINs to properties table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotels_policies_property_fk
  ON hotels.policies(property_id);

-- 2.3 Properties
-- Optimizes: Filtering properties by client
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotels_properties_client_fk
  ON hotels.properties(client_id);

-- ===============================================================
-- SECTION 3: CALENDAR SYSTEM FK INDEXES
-- ===============================================================
-- Impact: MEDIUM - Calendar event processing optimizations
-- ===============================================================

-- 3.1 Calendar Events (merge tracking)
-- Optimizes: Finding merged events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_merged_into_fk
  ON public.calendar_events(merged_into_id);

-- 3.2 Calendar Event Conflicts
-- Optimizes: Resolution tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_event_conflicts_winning_fk
  ON public.calendar_event_conflicts(winning_event_id);

-- 3.3 Airbnb/Motopress Comparison
-- Optimizes: Linking comparisons to ICS events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_airbnb_motopress_comparison_ics_fk
  ON public.airbnb_motopress_comparison(ics_event_id);

-- ===============================================================
-- SECTION 4: SIRE COMPLIANCE FK INDEXES
-- ===============================================================
-- Impact: LOW-MEDIUM - Export logging optimizations
-- ===============================================================

-- 4.1 SIRE Export Logs
-- Optimizes: Filtering exports by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sire_export_logs_user_fk
  ON public.sire_export_logs(user_id);

-- ===============================================================
-- VERIFICATION QUERY
-- ===============================================================
--
-- After running this migration, verify all indexes were created:
--
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   pg_size_pretty(pg_relation_size(indexrelid)) as index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname IN ('public', 'hotels')
--   AND indexname LIKE 'idx_%_fk'
-- ORDER BY schemaname, tablename, indexname;
--
-- Expected result: 13 rows
--
-- ===============================================================
-- MONITORING AFTER MIGRATION
-- ===============================================================
--
-- Wait 24-48 hours, then check index usage:
--
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch,
--   pg_size_pretty(pg_relation_size(indexrelid)) as index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname IN ('public', 'hotels')
--   AND indexname LIKE 'idx_%_fk'
-- ORDER BY idx_scan DESC;
--
-- Indexes with idx_scan > 0 are being used
--
-- ===============================================================
-- PRODUCTION RESULTS (Nov 1, 2025)
-- ===============================================================
--
-- Applied to: ooaumjzaztmutltifhoq (production)
-- Execution time: 2 minutes
-- Downtime: 0 seconds
-- Issues resolved: 13/13 missing FK indexes
-- Total index size: 168 kB
--
-- Before: 17 missing FK indexes identified by advisors
-- After: 0 critical missing indexes (4 auth/storage deferred as low priority)
--
-- Performance improvement (estimated):
-- - JOINs on FK columns: 20-50% faster
-- - Multi-tenant queries: Significant improvement
-- - Calendar operations: Better performance on conflict resolution
--
-- ===============================================================
-- ROLLBACK PLAN (if needed)
-- ===============================================================
--
-- To remove all indexes created by this migration:
--
-- DROP INDEX CONCURRENTLY IF EXISTS idx_accommodation_units_tenant_hotel_fk;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_airbnb_mphb_imported_reservations_unit_fk;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_prospective_sessions_reservation_fk;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_hotel_operations_created_by_fk;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_staff_users_created_by_fk;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_user_tenant_permissions_granted_by_fk;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_hotels_guest_information_property_fk;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_hotels_policies_property_fk;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_hotels_properties_client_fk;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_calendar_events_merged_into_fk;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_calendar_event_conflicts_winning_fk;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_airbnb_motopress_comparison_ics_fk;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_sire_export_logs_user_fk;
--
-- ===============================================================
-- END OF MIGRATION
-- ===============================================================
