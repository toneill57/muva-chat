-- ===============================================================
-- PHASE 3: FK INDEXES - Production Performance Optimization
-- Database: ooaumjzaztmutltifhoq
-- Generated: 2025-11-01
-- Total Indexes: 13
-- ===============================================================

-- ===============================================================
-- 4.1 Critical application tables (6 indexes)
-- ===============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accommodation_units_tenant_hotel_fk 
  ON public.accommodation_units(tenant_id, hotel_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_airbnb_mphb_imported_reservations_unit_fk 
  ON public.airbnb_mphb_imported_reservations(accommodation_unit_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prospective_sessions_reservation_fk 
  ON public.prospective_sessions(converted_to_reservation_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotel_operations_created_by_fk 
  ON public.hotel_operations(created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_users_created_by_fk 
  ON public.staff_users(created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_tenant_permissions_granted_by_fk 
  ON public.user_tenant_permissions(granted_by);

-- ===============================================================
-- 4.2 hotels schema FK indexes (3 indexes)
-- ===============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotels_guest_information_property_fk 
  ON hotels.guest_information(property_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotels_policies_property_fk 
  ON hotels.policies(property_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotels_properties_client_fk 
  ON hotels.properties(client_id);

-- ===============================================================
-- 4.3 Calendar system FK indexes (3 indexes)
-- ===============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_merged_into_fk 
  ON public.calendar_events(merged_into_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_event_conflicts_winning_fk 
  ON public.calendar_event_conflicts(winning_event_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_airbnb_motopress_comparison_ics_fk 
  ON public.airbnb_motopress_comparison(ics_event_id);

-- ===============================================================
-- 4.6 SIRE compliance FK indexes (1 index)
-- ===============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sire_export_logs_user_fk 
  ON public.sire_export_logs(user_id);

-- ===============================================================
-- Total: 13 FK indexes
-- Estimated time: ~2 minutes
-- Impact: 20-50% improvement in JOIN performance
-- ===============================================================
