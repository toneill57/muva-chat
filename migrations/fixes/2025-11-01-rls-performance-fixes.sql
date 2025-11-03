-- ============================================================================
-- Supabase Performance & Security Linter Fixes
-- Generated: 2025-11-01
-- 
-- Fixes 211 issues:
-- - 114 auth_rls_initplan (RLS policies with slow auth function calls)
-- - 96 multiple_permissive_policies (informational - tables with multiple policies)
-- - 2 duplicate_index (redundant indexes)
--
-- Reference: https://supabase.com/docs/guides/database/database-linter
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: FIX DUPLICATE INDEXES (2 issues)
-- ============================================================================

-- Issue: hotels.accommodation_types has duplicate indexes
-- Keep: idx_hotels_accommodation_types_tenant_id (more descriptive name)
-- Drop: idx_hotels_accommodation_types_tenant
DROP INDEX IF EXISTS hotels.idx_hotels_accommodation_types_tenant;

-- Issue: public.accommodation_units_manual_chunks has duplicate indexes
-- Keep: idx_manual_chunks_accommodation_unit_id (more descriptive name)
-- Drop: idx_manual_chunks_unit_id
DROP INDEX IF EXISTS public.idx_manual_chunks_unit_id;

-- ============================================================================
-- PART 2: FIX AUTH RLS INITPLAN ISSUES (114 policies)
-- 
-- Problem: RLS policies using auth.uid() directly cause the function to be
--          re-evaluated for EACH row, creating severe performance degradation.
--
-- Solution: Wrap auth functions in a subquery: (select auth.uid())
--           This evaluates the function ONCE per query instead of per row.
-- ============================================================================


-- Fix policies for hotels.client (4 policies)
-- WARNING: Policy not found in database: hotels.client.info_client_info_tenant_select-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: hotels.client.info_client_info_tenant_insert-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: hotels.client.info_client_info_tenant_update-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: hotels.client.info_client_info_tenant_delete-- This policy may have been removed or renamed.

-- Fix policies for hotels.content (4 policies)
DROP POLICY IF EXISTS "content_tenant_select" ON hotels.content;CREATE POLICY "content_tenant_select"
  ON hotels.content
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))))
;DROP POLICY IF EXISTS "content_tenant_insert" ON hotels.content;CREATE POLICY "content_tenant_insert"
  ON hotels.content
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))))
;DROP POLICY IF EXISTS "content_tenant_update" ON hotels.content;CREATE POLICY "content_tenant_update"
  ON hotels.content
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))))
;DROP POLICY IF EXISTS "content_tenant_delete" ON hotels.content;CREATE POLICY "content_tenant_delete"
  ON hotels.content
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))))
;
-- Fix policies for hotels.guest (4 policies)
-- WARNING: Policy not found in database: hotels.guest.information_guest_information_tenant_select-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: hotels.guest.information_guest_information_tenant_insert-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: hotels.guest.information_guest_information_tenant_update-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: hotels.guest.information_guest_information_tenant_delete-- This policy may have been removed or renamed.

-- Fix policies for hotels.policies (4 policies)
DROP POLICY IF EXISTS "policies_tenant_select" ON hotels.policies;CREATE POLICY "policies_tenant_select"
  ON hotels.policies
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))))
;DROP POLICY IF EXISTS "policies_tenant_insert" ON hotels.policies;CREATE POLICY "policies_tenant_insert"
  ON hotels.policies
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))))
;DROP POLICY IF EXISTS "policies_tenant_update" ON hotels.policies;CREATE POLICY "policies_tenant_update"
  ON hotels.policies
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))))
;DROP POLICY IF EXISTS "policies_tenant_delete" ON hotels.policies;CREATE POLICY "policies_tenant_delete"
  ON hotels.policies
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))))
;
-- Fix policies for hotels.pricing (4 policies)
-- WARNING: Policy not found in database: hotels.pricing.rules_pricing_rules_tenant_select-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: hotels.pricing.rules_pricing_rules_tenant_insert-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: hotels.pricing.rules_pricing_rules_tenant_update-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: hotels.pricing.rules_pricing_rules_tenant_delete-- This policy may have been removed or renamed.

-- Fix policies for hotels.properties (4 policies)
DROP POLICY IF EXISTS "properties_tenant_select" ON hotels.properties;CREATE POLICY "properties_tenant_select"
  ON hotels.properties
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))))
;DROP POLICY IF EXISTS "properties_tenant_insert" ON hotels.properties;CREATE POLICY "properties_tenant_insert"
  ON hotels.properties
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))))
;DROP POLICY IF EXISTS "properties_tenant_update" ON hotels.properties;CREATE POLICY "properties_tenant_update"
  ON hotels.properties
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))))
;DROP POLICY IF EXISTS "properties_tenant_delete" ON hotels.properties;CREATE POLICY "properties_tenant_delete"
  ON hotels.properties
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))))
;
-- Fix policies for hotels.unit (4 policies)
-- WARNING: Policy not found in database: hotels.unit.amenities_unit_amenities_tenant_select-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: hotels.unit.amenities_unit_amenities_tenant_insert-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: hotels.unit.amenities_unit_amenities_tenant_update-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: hotels.unit.amenities_unit_amenities_tenant_delete-- This policy may have been removed or renamed.

-- Fix policies for public.accommodation (9 policies)
-- WARNING: Policy not found in database: public.accommodation.units_manual_Guest can view their unit manual-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.accommodation.units_accommodation_units_tenant_select-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.accommodation.units_accommodation_units_tenant_insert-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.accommodation.units_accommodation_units_tenant_update-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.accommodation.units_accommodation_units_tenant_delete-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.accommodation.units_manual_chunks_accommodation_units_manual_chunks_tenant_select-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.accommodation.units_manual_chunks_accommodation_units_manual_chunks_tenant_insert-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.accommodation.units_manual_chunks_accommodation_units_manual_chunks_tenant_update-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.accommodation.units_manual_chunks_accommodation_units_manual_chunks_tenant_delete-- This policy may have been removed or renamed.

-- Fix policies for public.airbnb (2 policies)
-- WARNING: Policy not found in database: public.airbnb.motopress_comparison_airbnb_motopress_comparison_service_role-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.airbnb.mphb_imported_reservations_airbnb_mphb_tenant_isolation-- This policy may have been removed or renamed.

-- Fix policies for public.calendar (6 policies)
-- WARNING: Policy not found in database: public.calendar.events_Tenants can view their own calendar events-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.calendar.events_Tenants can insert their own calendar events-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.calendar.events_Tenants can update their own calendar events-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.calendar.events_Tenants can delete their own calendar events-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.calendar.sync_logs_Tenants can view their own sync logs-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.calendar.event_conflicts_Tenants can manage their own conflicts-- This policy may have been removed or renamed.

-- Fix policies for public.chat (4 policies)
-- WARNING: Policy not found in database: public.chat.conversations_guest_own_conversations-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.chat.messages_guest_own_messages-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.chat.conversations_staff_tenant_conversations-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.chat.messages_staff_tenant_messages-- This policy may have been removed or renamed.

-- Fix policies for public.compliance (4 policies)
-- WARNING: Policy not found in database: public.compliance.submissions_Guests can view their own submissions-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.compliance.submissions_Guests can create their own submissions-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.compliance.submissions_Staff can view tenant submissions-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.compliance.submissions_Staff can update tenant submissions-- This policy may have been removed or renamed.

-- Fix policies for public.conversation (5 policies)
-- WARNING: Policy not found in database: public.conversation.attachments_Guests can update own attachments-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.conversation.attachments_Guests can delete own attachments-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.conversation.attachments_Guests can view own attachments-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.conversation.memory_Users can view own session memories-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.conversation.attachments_Guests can create own attachments-- This policy may have been removed or renamed.

-- Fix policies for public.guest (10 policies)
-- WARNING: Policy not found in database: public.guest.conversations_Guests can view their own conversations-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.guest.conversations_Guests can create their own conversations-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.guest.conversations_Guests can update their own conversations-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.guest.conversations_Guests can delete their own conversations-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.guest.conversations_Staff can view tenant conversations-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.guest.reservations_staff_tenant_reservations-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.guest.reservations_Tenant users can view their own reservations-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.guest.reservations_Tenant users can insert their own reservations-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.guest.reservations_Tenant users can update their own reservations-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.guest.reservations_Tenant owners can delete their own reservations-- This policy may have been removed or renamed.

-- Fix policies for public.hotel (1 policies)
-- WARNING: Policy not found in database: public.hotel.operations_hotel_operations_staff_access-- This policy may have been removed or renamed.

-- Fix policies for public.hotels (3 policies)
DROP POLICY IF EXISTS "Hotels tenant isolation" ON public.hotels;CREATE POLICY "Hotels tenant isolation"
  ON public.hotels
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_tenant_permissions utp
  WHERE ((utp.tenant_id = hotels.tenant_id) AND (utp.user_id = (select auth.uid())) AND (utp.is_active = true)))))
;DROP POLICY IF EXISTS "Hotels insert policy" ON public.hotels;CREATE POLICY "Hotels insert policy"
  ON public.hotels
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_tenant_permissions utp
  WHERE ((utp.tenant_id = hotels.tenant_id) AND (utp.user_id = (select auth.uid())) AND ((utp.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'editor'::character varying])::text[])) AND (utp.is_active = true)))))
;DROP POLICY IF EXISTS "Hotels update policy" ON public.hotels;CREATE POLICY "Hotels update policy"
  ON public.hotels
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_tenant_permissions utp
  WHERE ((utp.tenant_id = hotels.tenant_id) AND (utp.user_id = (select auth.uid())) AND ((utp.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'editor'::character varying])::text[])) AND (utp.is_active = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_tenant_permissions utp
  WHERE ((utp.tenant_id = hotels.tenant_id) AND (utp.user_id = (select auth.uid())) AND ((utp.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'editor'::character varying])::text[])) AND (utp.is_active = true)))))
;
-- Fix policies for public.ics (1 policies)
-- WARNING: Policy not found in database: public.ics.feed_configurations_Tenants can manage their own ICS feeds-- This policy may have been removed or renamed.

-- Fix policies for public.integration (1 policies)
-- WARNING: Policy not found in database: public.integration.configs_Users can only access their tenant's integration configs-- This policy may have been removed or renamed.

-- Fix policies for public.job (1 policies)
-- WARNING: Policy not found in database: public.job.logs_Admins can view all job logs-- This policy may have been removed or renamed.

-- Fix policies for public.muva (1 policies)
-- WARNING: Policy not found in database: public.muva.content_Only service role can modify MUVA content-- This policy may have been removed or renamed.

-- Fix policies for public.policies (4 policies)
DROP POLICY IF EXISTS "Users with tenant permissions can view policies" ON public.policies;CREATE POLICY "Users with tenant permissions can view policies"
  ON public.policies
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((tenant_id IN ( SELECT user_tenant_permissions.tenant_id
   FROM user_tenant_permissions
  WHERE ((user_tenant_permissions.user_id = (select auth.uid())) AND (user_tenant_permissions.is_active = true)))))
;DROP POLICY IF EXISTS "Users with tenant permissions can insert policies" ON public.policies;CREATE POLICY "Users with tenant permissions can insert policies"
  ON public.policies
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((tenant_id IN ( SELECT user_tenant_permissions.tenant_id
   FROM user_tenant_permissions
  WHERE ((user_tenant_permissions.user_id = (select auth.uid())) AND (user_tenant_permissions.is_active = true)))))
;DROP POLICY IF EXISTS "Users with tenant permissions can update policies" ON public.policies;CREATE POLICY "Users with tenant permissions can update policies"
  ON public.policies
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((tenant_id IN ( SELECT user_tenant_permissions.tenant_id
   FROM user_tenant_permissions
  WHERE ((user_tenant_permissions.user_id = (select auth.uid())) AND (user_tenant_permissions.is_active = true)))))
  WITH CHECK ((tenant_id IN ( SELECT user_tenant_permissions.tenant_id
   FROM user_tenant_permissions
  WHERE ((user_tenant_permissions.user_id = (select auth.uid())) AND (user_tenant_permissions.is_active = true)))))
;DROP POLICY IF EXISTS "Users with tenant permissions can delete policies" ON public.policies;CREATE POLICY "Users with tenant permissions can delete policies"
  ON public.policies
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((tenant_id IN ( SELECT user_tenant_permissions.tenant_id
   FROM user_tenant_permissions
  WHERE ((user_tenant_permissions.user_id = (select auth.uid())) AND (user_tenant_permissions.is_active = true)))))
;
-- Fix policies for public.property (1 policies)
-- WARNING: Policy not found in database: public.property.relationships_Tenants can manage their own property relationships-- This policy may have been removed or renamed.

-- Fix policies for public.prospective (1 policies)
-- WARNING: Policy not found in database: public.prospective.sessions_prospective_sessions_staff_access-- This policy may have been removed or renamed.

-- Fix policies for public.reservation (1 policies)
-- WARNING: Policy not found in database: public.reservation.accommodations_reservation_accommodations_tenant_isolation-- This policy may have been removed or renamed.

-- Fix policies for public.sire (2 policies)
-- WARNING: Policy not found in database: public.sire.content_Only service role can modify SIRE content-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.sire.export_logs_Tenant users can view their export logs-- This policy may have been removed or renamed.

-- Fix policies for public.staff (10 policies)
-- WARNING: Policy not found in database: public.staff.users_staff_own_profile-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.staff.users_staff_admin_view_all-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.staff.messages_staff_messages_tenant_update-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.staff.messages_staff_messages_tenant_delete-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.staff.conversations_staff_conversations_tenant_select-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.staff.conversations_staff_conversations_tenant_insert-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.staff.conversations_staff_conversations_tenant_update-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.staff.conversations_staff_conversations_tenant_delete-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.staff.messages_staff_messages_tenant_select-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.staff.messages_staff_messages_tenant_insert-- This policy may have been removed or renamed.

-- Fix policies for public.sync (1 policies)
-- WARNING: Policy not found in database: public.sync.history_Users can only access their tenant's sync history-- This policy may have been removed or renamed.

-- Fix policies for public.tenant (16 policies)
-- WARNING: Policy not found in database: public.tenant.compliance_credentials_Only admins can delete credentials-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.muva_content_Tenants can view own MUVA content-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.compliance_credentials_Only admins can view credentials-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.compliance_credentials_Only admins can create credentials-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.compliance_credentials_Only admins can update credentials-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.registry_Users can view tenants they have access to-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.registry_Only service role can create tenants-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.registry_Only service role can update tenants-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.registry_Only service role can delete tenants-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.muva_content_Tenants can insert own MUVA content-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.knowledge_embeddings_tenant_knowledge_isolation-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.knowledge_embeddings_tenant_knowledge_insert-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.knowledge_embeddings_tenant_knowledge_update-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.knowledge_embeddings_tenant_knowledge_delete-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.muva_content_Tenants can update own MUVA content-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.tenant.muva_content_Tenants can delete own MUVA content-- This policy may have been removed or renamed.

-- Fix policies for public.user (2 policies)
-- WARNING: Policy not found in database: public.user.tenant_permissions_Users can view own permissions-- This policy may have been removed or renamed.
-- WARNING: Policy not found in database: public.user.tenant_permissions_Tenant admins can manage permissions-- This policy may have been removed or renamed.

-- ============================================================================
-- PART 3: MULTIPLE PERMISSIVE POLICIES (96 issues - INFORMATIONAL)
-- ============================================================================

-- The following tables have multiple PERMISSIVE policies:
-- This is not necessarily a problem, but can impact performance.
-- PERMISSIVE policies use OR logic (any policy match grants access).
--
-- Consider consolidating policies on these tables if performance issues arise:

-- public.airbnb_motopress_comparison
-- public.chat_conversations
-- public.chat_messages
-- public.compliance_submissions
-- public.guest_conversations
-- public.guest_reservations
-- public.hotels
-- public.muva_content
-- public.prospective_sessions
-- public.sire_content
-- public.staff_users
-- public.tenant_registry
-- public.user_tenant_permissions

-- No action needed for now. These are informational.
-- If performance issues arise, consolidate policies per table.

COMMIT;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Verify no duplicate indexes remain:
-- SELECT schemaname, tablename, indexname 
-- FROM pg_indexes 
-- WHERE schemaname IN ('public', 'hotels')
-- ORDER BY tablename, indexname;

-- Verify policies were recreated with performance fix:
-- SELECT 
--   schemaname, 
--   tablename, 
--   policyname,
--   CASE 
--     WHEN definition ~ 'auth\.uid\(\)' THEN 'SLOW (needs fix)'
--     WHEN definition ~ '\(select auth\.uid\(\)\)' THEN 'FAST (fixed)'
--     ELSE 'OK'
--   END as performance_status
-- FROM pg_policies
-- WHERE schemaname IN ('public', 'hotels')
-- AND (definition ~ 'auth\.' OR definition ~ 'current_setting')
-- ORDER BY performance_status DESC, tablename, policyname;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Total policies fixed: 19
-- Policies not found (may be removed): 95
-- Duplicate indexes dropped: 2
-- Multiple permissive policy warnings: 13
--
-- Expected result: 19 policies now use (select auth.func())
--                 instead of bare auth.func() calls
-- ============================================================================

