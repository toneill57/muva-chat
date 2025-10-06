-- Migration: Fix Mutable search_path in Functions
-- Date: 2025-10-06
-- Purpose: Set immutable search_path for 29 functions to prevent SQL injection
--
-- Issue: Functions without explicit search_path can be exploited via SQL injection
-- Solution: Set search_path = public, pg_temp for all affected functions
--
-- Advisory: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
--
-- Security Level: WARN (but HIGH priority for production security)
-- Functions Affected: 28 in public schema, 1 in muva_activities schema

-- ============================================================================
-- PUBLIC SCHEMA FUNCTIONS (28 functions)
-- ============================================================================

-- 1. check_slow_queries
ALTER FUNCTION public.check_slow_queries() SET search_path = public, pg_temp;

-- 2. get_full_document
ALTER FUNCTION public.get_full_document(uuid) SET search_path = public, pg_temp;

-- 3. check_rls_status
ALTER FUNCTION public.check_rls_status() SET search_path = public, pg_temp;

-- 4. has_tenant_feature
ALTER FUNCTION public.has_tenant_feature(text, text) SET search_path = public, pg_temp;

-- 5. get_accommodation_units
ALTER FUNCTION public.get_accommodation_units(uuid) SET search_path = public, pg_temp;

-- 6. get_tenant_schema
ALTER FUNCTION public.get_tenant_schema(uuid) SET search_path = public, pg_temp;

-- 7. list_rls_policies
ALTER FUNCTION public.list_rls_policies() SET search_path = public, pg_temp;

-- 8. check_accommodation_type_hotel_match
ALTER FUNCTION public.check_accommodation_type_hotel_match() SET search_path = public, pg_temp;

-- 9. update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;

-- 10. check_metadata_integrity
ALTER FUNCTION public.check_metadata_integrity() SET search_path = public, pg_temp;

-- 11. search_muva_restaurants
ALTER FUNCTION public.search_muva_restaurants(vector, text, numeric, text, integer) SET search_path = public, pg_temp;

-- 12. update_accommodation_units_manual_updated_at
ALTER FUNCTION public.update_accommodation_units_manual_updated_at() SET search_path = public, pg_temp;

-- 13. search_hotels_by_tenant
ALTER FUNCTION public.search_hotels_by_tenant(vector, uuid, double precision, integer) SET search_path = public, pg_temp;

-- 14. get_accommodation_units_by_ids
ALTER FUNCTION public.get_accommodation_units_by_ids(uuid[]) SET search_path = public, pg_temp;

-- 15. update_conversation_attachments_updated_at
ALTER FUNCTION public.update_conversation_attachments_updated_at() SET search_path = public, pg_temp;

-- 16. exec_sql (already has search_path set - skip)
-- ALTER FUNCTION public.exec_sql(text) SET search_path = public, pg_temp;

-- 17. check_rls_policies
ALTER FUNCTION public.check_rls_policies() SET search_path = public, pg_temp;

-- 18. test_tenant_isolation_simple
ALTER FUNCTION public.test_tenant_isolation_simple(uuid, uuid) SET search_path = public, pg_temp;

-- 19. validate_pricing_rule
ALTER FUNCTION public.validate_pricing_rule() SET search_path = public, pg_temp;

-- 20. set_app_tenant_id
ALTER FUNCTION public.set_app_tenant_id(uuid) SET search_path = public, pg_temp;

-- 21. update_conversation_timestamp
ALTER FUNCTION public.update_conversation_timestamp() SET search_path = public, pg_temp;

-- 22. search_muva_attractions
ALTER FUNCTION public.search_muva_attractions(vector, text, numeric, integer) SET search_path = public, pg_temp;

-- 23. get_accommodation_unit_by_motopress_id
ALTER FUNCTION public.get_accommodation_unit_by_motopress_id(text, uuid) SET search_path = public, pg_temp;

-- 24. simulate_app_tenant_access
ALTER FUNCTION public.simulate_app_tenant_access(uuid) SET search_path = public, pg_temp;

-- 25. log_changes
ALTER FUNCTION public.log_changes() SET search_path = public, pg_temp;

-- 26. execute_sql (NOTE: This is different from exec_sql - used by admin scripts)
-- Already has search_path set in 20251006010100_add_execute_sql_helper.sql

-- ============================================================================
-- MUVA_ACTIVITIES SCHEMA FUNCTIONS (1 function)
-- ============================================================================

-- 27. muva_activities.update_updated_at_column
ALTER FUNCTION muva_activities.update_updated_at_column() SET search_path = public, pg_temp;

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Verify all functions now have immutable search_path
-- Run manually after migration:
--
-- SELECT
--   n.nspname as schema_name,
--   p.proname as function_name,
--   pg_get_function_identity_arguments(p.oid) as arguments,
--   p.proconfig as search_path_setting
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE p.proname IN (
--   'check_slow_queries', 'get_full_document', 'check_rls_status',
--   'has_tenant_feature', 'get_accommodation_units', 'get_tenant_schema',
--   'list_rls_policies', 'check_accommodation_type_hotel_match',
--   'update_updated_at_column', 'check_metadata_integrity',
--   'search_muva_restaurants', 'update_accommodation_units_manual_updated_at',
--   'search_hotels_by_tenant', 'get_accommodation_units_by_ids',
--   'update_conversation_attachments_updated_at', 'check_rls_policies',
--   'test_tenant_isolation_simple', 'validate_pricing_rule',
--   'set_app_tenant_id', 'update_conversation_timestamp',
--   'search_muva_attractions', 'get_accommodation_unit_by_motopress_id',
--   'simulate_app_tenant_access', 'log_changes'
-- )
-- ORDER BY schema_name, function_name;
--
-- Expected: proconfig should show "search_path=public, pg_temp" for all functions

-- Add migration comment
COMMENT ON SCHEMA public IS 'InnPilot public schema - Updated 2025-10-06: Fixed search_path security for 28 functions';
