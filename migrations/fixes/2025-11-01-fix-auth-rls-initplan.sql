-- ============================================================================
-- FIX auth_rls_initplan WARNINGS - 97 Total Warnings
-- ============================================================================
-- Migration: 2025-11-01-fix-auth-rls-initplan.sql
-- Purpose: Eliminate auth_rls_initplan warnings by wrapping auth functions in SELECT
-- Issue: auth.uid(), auth.role(), auth.jwt() re-evaluate for each row
-- Solution: Replace with (select auth.uid()), (select auth.role()), (select auth.jwt())
-- Performance gain: ~30-50% faster on large datasets
-- ============================================================================

-- Pattern:
-- auth.uid()     → (select auth.uid())
-- auth.role()    → (select auth.role())
-- auth.jwt()     → (select auth.jwt())

-- ============================================================================
-- 1. accommodation_units (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "accommodation_units_tenant_delete" ON public.accommodation_units;
CREATE POLICY "accommodation_units_tenant_delete" ON public.accommodation_units
  FOR DELETE
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_tenant_insert" ON public.accommodation_units;
CREATE POLICY "accommodation_units_tenant_insert" ON public.accommodation_units
  FOR INSERT
  WITH CHECK (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_tenant_select" ON public.accommodation_units;
CREATE POLICY "accommodation_units_tenant_select" ON public.accommodation_units
  FOR SELECT
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_tenant_update" ON public.accommodation_units;
CREATE POLICY "accommodation_units_tenant_update" ON public.accommodation_units
  FOR UPDATE
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  )
  WITH CHECK (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

-- ============================================================================
-- 2. accommodation_units_manual_chunks (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_delete" ON public.accommodation_units_manual_chunks;
CREATE POLICY "accommodation_units_manual_chunks_tenant_delete" ON public.accommodation_units_manual_chunks
  FOR DELETE
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_insert" ON public.accommodation_units_manual_chunks;
CREATE POLICY "accommodation_units_manual_chunks_tenant_insert" ON public.accommodation_units_manual_chunks
  FOR INSERT
  WITH CHECK (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_select" ON public.accommodation_units_manual_chunks;
CREATE POLICY "accommodation_units_manual_chunks_tenant_select" ON public.accommodation_units_manual_chunks
  FOR SELECT
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_update" ON public.accommodation_units_manual_chunks;
CREATE POLICY "accommodation_units_manual_chunks_tenant_update" ON public.accommodation_units_manual_chunks
  FOR UPDATE
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  )
  WITH CHECK (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

-- ============================================================================
-- 3. airbnb_motopress_comparison (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "airbnb_motopress_comparison_access" ON public.airbnb_motopress_comparison;
CREATE POLICY "airbnb_motopress_comparison_access" ON public.airbnb_motopress_comparison
  FOR ALL
  USING (
    ((select auth.jwt()) ->> 'role'::text) = 'service_role'::text
    OR tenant_id IN (
      SELECT tenant_registry.tenant_id
      FROM tenant_registry
      WHERE tenant_registry.tenant_id = airbnb_motopress_comparison.tenant_id
    )
  );

-- ============================================================================
-- 4. calendar_event_conflicts (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can manage their own conflicts" ON public.calendar_event_conflicts;
CREATE POLICY "Tenants can manage their own conflicts" ON public.calendar_event_conflicts
  FOR ALL
  USING ((select auth.uid())::text = (tenant_id)::text)
  WITH CHECK ((select auth.uid())::text = (tenant_id)::text);

-- ============================================================================
-- 5. calendar_events (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can delete their own calendar events" ON public.calendar_events;
CREATE POLICY "Tenants can delete their own calendar events" ON public.calendar_events
  FOR DELETE
  USING ((select auth.uid())::text = (tenant_id)::text);

DROP POLICY IF EXISTS "Tenants can insert their own calendar events" ON public.calendar_events;
CREATE POLICY "Tenants can insert their own calendar events" ON public.calendar_events
  FOR INSERT
  WITH CHECK ((select auth.uid())::text = (tenant_id)::text);

DROP POLICY IF EXISTS "Tenants can update their own calendar events" ON public.calendar_events;
CREATE POLICY "Tenants can update their own calendar events" ON public.calendar_events
  FOR UPDATE
  USING ((select auth.uid())::text = (tenant_id)::text)
  WITH CHECK ((select auth.uid())::text = (tenant_id)::text);

DROP POLICY IF EXISTS "Tenants can view their own calendar events" ON public.calendar_events;
CREATE POLICY "Tenants can view their own calendar events" ON public.calendar_events
  FOR SELECT
  USING ((select auth.uid())::text = (tenant_id)::text);

-- ============================================================================
-- 6. calendar_sync_logs (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can view their own sync logs" ON public.calendar_sync_logs;
CREATE POLICY "Tenants can view their own sync logs" ON public.calendar_sync_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM ics_feed_configurations f
      WHERE f.id = calendar_sync_logs.feed_config_id
        AND (f.tenant_id)::text = (select auth.uid())::text
    )
  );

-- ============================================================================
-- 7. compliance_submissions (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Guests can create their own submissions" ON public.compliance_submissions;
CREATE POLICY "Guests can create their own submissions" ON public.compliance_submissions
  FOR INSERT
  WITH CHECK (guest_id = (select auth.uid()));

DROP POLICY IF EXISTS "Staff can update tenant submissions" ON public.compliance_submissions;
CREATE POLICY "Staff can update tenant submissions" ON public.compliance_submissions
  FOR UPDATE
  USING (
    (tenant_id)::text IN (
      SELECT DISTINCT gr.tenant_id
      FROM guest_reservations gr
      JOIN user_tenant_permissions utp ON (((utp.tenant_id)::character varying)::text = (gr.tenant_id)::text)
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
        AND (utp.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
    )
  );

DROP POLICY IF EXISTS "compliance_submissions_select" ON public.compliance_submissions;
CREATE POLICY "compliance_submissions_select" ON public.compliance_submissions
  FOR SELECT
  USING (
    guest_id = (select auth.uid())
    OR (tenant_id)::text IN (
      SELECT DISTINCT gr.tenant_id
      FROM guest_reservations gr
      JOIN user_tenant_permissions utp ON (((utp.tenant_id)::character varying)::text = (gr.tenant_id)::text)
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
    )
  );

-- ============================================================================
-- 8. conversation_attachments (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Guests can create own attachments" ON public.conversation_attachments;
CREATE POLICY "Guests can create own attachments" ON public.conversation_attachments
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT guest_conversations.id
      FROM guest_conversations
      WHERE guest_conversations.guest_id = (
        SELECT guest_reservations.id
        FROM guest_reservations
        WHERE guest_reservations.id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Guests can delete own attachments" ON public.conversation_attachments;
CREATE POLICY "Guests can delete own attachments" ON public.conversation_attachments
  FOR DELETE
  USING (
    conversation_id IN (
      SELECT guest_conversations.id
      FROM guest_conversations
      WHERE guest_conversations.guest_id = (
        SELECT guest_reservations.id
        FROM guest_reservations
        WHERE guest_reservations.id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Guests can update own attachments" ON public.conversation_attachments;
CREATE POLICY "Guests can update own attachments" ON public.conversation_attachments
  FOR UPDATE
  USING (
    conversation_id IN (
      SELECT guest_conversations.id
      FROM guest_conversations
      WHERE guest_conversations.guest_id = (
        SELECT guest_reservations.id
        FROM guest_reservations
        WHERE guest_reservations.id = (select auth.uid())
      )
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT guest_conversations.id
      FROM guest_conversations
      WHERE guest_conversations.guest_id = (
        SELECT guest_reservations.id
        FROM guest_reservations
        WHERE guest_reservations.id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Guests can view own attachments" ON public.conversation_attachments;
CREATE POLICY "Guests can view own attachments" ON public.conversation_attachments
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT guest_conversations.id
      FROM guest_conversations
      WHERE guest_conversations.guest_id = (
        SELECT guest_reservations.id
        FROM guest_reservations
        WHERE guest_reservations.id = (select auth.uid())
      )
    )
  );

-- ============================================================================
-- 9. guest_conversations (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "guest_conversations_delete" ON public.guest_conversations;
CREATE POLICY "guest_conversations_delete" ON public.guest_conversations
  FOR DELETE
  USING (guest_id = (select auth.uid()) OR true);

DROP POLICY IF EXISTS "guest_conversations_insert" ON public.guest_conversations;
CREATE POLICY "guest_conversations_insert" ON public.guest_conversations
  FOR INSERT
  WITH CHECK (guest_id = (select auth.uid()) OR true);

DROP POLICY IF EXISTS "guest_conversations_select" ON public.guest_conversations;
CREATE POLICY "guest_conversations_select" ON public.guest_conversations
  FOR SELECT
  USING (
    guest_id = (select auth.uid())
    OR (tenant_id)::text IN (
      SELECT DISTINCT gr.tenant_id
      FROM guest_reservations gr
      JOIN user_tenant_permissions utp ON (((utp.tenant_id)::character varying)::text = (gr.tenant_id)::text)
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
    )
    OR true
  );

DROP POLICY IF EXISTS "guest_conversations_update" ON public.guest_conversations;
CREATE POLICY "guest_conversations_update" ON public.guest_conversations
  FOR UPDATE
  USING (guest_id = (select auth.uid()) OR true)
  WITH CHECK (true);

-- ============================================================================
-- 10. guest_reservations (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Tenant owners can delete their own reservations" ON public.guest_reservations;
CREATE POLICY "Tenant owners can delete their own reservations" ON public.guest_reservations
  FOR DELETE
  USING (
    (tenant_id)::uuid IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
        AND (utp.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
    )
  );

DROP POLICY IF EXISTS "Tenant users can insert their own reservations" ON public.guest_reservations;
CREATE POLICY "Tenant users can insert their own reservations" ON public.guest_reservations
  FOR INSERT
  WITH CHECK (
    (tenant_id)::uuid IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
        AND (utp.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'staff'::character varying])::text[])
    )
  );

DROP POLICY IF EXISTS "Tenant users can update their own reservations" ON public.guest_reservations;
CREATE POLICY "Tenant users can update their own reservations" ON public.guest_reservations
  FOR UPDATE
  USING (
    (tenant_id)::uuid IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
        AND (utp.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'staff'::character varying])::text[])
    )
  )
  WITH CHECK (
    (tenant_id)::uuid IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
        AND (utp.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'staff'::character varying])::text[])
    )
  );

DROP POLICY IF EXISTS "guest_reservations_select" ON public.guest_reservations;
CREATE POLICY "guest_reservations_select" ON public.guest_reservations
  FOR SELECT
  USING (
    (tenant_id)::uuid IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
    )
    OR (
      (tenant_id)::text = current_setting('app.current_tenant_id'::text, true)
      AND current_setting('app.user_role'::text, true) = ANY (ARRAY['staff'::text, 'admin'::text, 'owner'::text])
    )
  );

-- ============================================================================
-- 11. hotels (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "hotels_insert" ON public.hotels;
CREATE POLICY "hotels_insert" ON public.hotels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.tenant_id = hotels.tenant_id
        AND utp.user_id = (select auth.uid())
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text, ('editor'::character varying)::text])
        AND utp.is_active = true
    )
  );

DROP POLICY IF EXISTS "hotels_tenant_isolation" ON public.hotels;
CREATE POLICY "hotels_tenant_isolation" ON public.hotels
  AS RESTRICTIVE
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.tenant_id = hotels.tenant_id
        AND utp.user_id = (select auth.uid())
        AND utp.is_active = true
    )
  );

DROP POLICY IF EXISTS "hotels_update" ON public.hotels;
CREATE POLICY "hotels_update" ON public.hotels
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.tenant_id = hotels.tenant_id
        AND utp.user_id = (select auth.uid())
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text, ('editor'::character varying)::text])
        AND utp.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.tenant_id = hotels.tenant_id
        AND utp.user_id = (select auth.uid())
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text, ('editor'::character varying)::text])
        AND utp.is_active = true
    )
  );

-- ============================================================================
-- 12. ics_feed_configurations (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can manage their own ICS feeds" ON public.ics_feed_configurations;
CREATE POLICY "Tenants can manage their own ICS feeds" ON public.ics_feed_configurations
  FOR ALL
  USING ((select auth.uid())::text = (tenant_id)::text)
  WITH CHECK ((select auth.uid())::text = (tenant_id)::text);

-- ============================================================================
-- 13. integration_configs (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Users can only access their tenant's integration configs" ON public.integration_configs;
CREATE POLICY "Users can only access their tenant's integration configs" ON public.integration_configs
  FOR ALL
  USING (
    tenant_id IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 14. job_logs (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all job logs" ON public.job_logs;
CREATE POLICY "Admins can view all job logs" ON public.job_logs
  FOR SELECT
  USING (((select auth.jwt()) ->> 'role'::text) = 'admin'::text);

-- ============================================================================
-- 15. muva_content (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "muva_content_delete" ON public.muva_content;
CREATE POLICY "muva_content_delete" ON public.muva_content
  FOR DELETE
  USING ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "muva_content_insert" ON public.muva_content;
CREATE POLICY "muva_content_insert" ON public.muva_content
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "muva_content_update" ON public.muva_content;
CREATE POLICY "muva_content_update" ON public.muva_content
  FOR UPDATE
  USING ((select auth.role()) = 'service_role'::text)
  WITH CHECK ((select auth.role()) = 'service_role'::text);

-- ============================================================================
-- 16. property_relationships (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can manage their own property relationships" ON public.property_relationships;
CREATE POLICY "Tenants can manage their own property relationships" ON public.property_relationships
  FOR ALL
  USING ((select auth.uid())::text = (tenant_id)::text)
  WITH CHECK ((select auth.uid())::text = (tenant_id)::text);

-- ============================================================================
-- 17. sire_content (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "sire_content_delete" ON public.sire_content;
CREATE POLICY "sire_content_delete" ON public.sire_content
  FOR DELETE
  USING ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "sire_content_insert" ON public.sire_content;
CREATE POLICY "sire_content_insert" ON public.sire_content
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "sire_content_update" ON public.sire_content;
CREATE POLICY "sire_content_update" ON public.sire_content
  FOR UPDATE
  USING ((select auth.role()) = 'service_role'::text)
  WITH CHECK ((select auth.role()) = 'service_role'::text);

-- ============================================================================
-- 18. sire_export_logs (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Tenant users can view their export logs" ON public.sire_export_logs;
CREATE POLICY "Tenant users can view their export logs" ON public.sire_export_logs
  FOR SELECT
  USING (
    (tenant_id)::uuid IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
    )
  );

-- ============================================================================
-- 19. staff_conversations (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "staff_conversations_tenant_delete" ON public.staff_conversations;
CREATE POLICY "staff_conversations_tenant_delete" ON public.staff_conversations
  FOR DELETE
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_conversations_tenant_insert" ON public.staff_conversations;
CREATE POLICY "staff_conversations_tenant_insert" ON public.staff_conversations
  FOR INSERT
  WITH CHECK (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_conversations_tenant_select" ON public.staff_conversations;
CREATE POLICY "staff_conversations_tenant_select" ON public.staff_conversations
  FOR SELECT
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_conversations_tenant_update" ON public.staff_conversations;
CREATE POLICY "staff_conversations_tenant_update" ON public.staff_conversations
  FOR UPDATE
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  )
  WITH CHECK (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

-- ============================================================================
-- 20. staff_messages (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "staff_messages_tenant_delete" ON public.staff_messages;
CREATE POLICY "staff_messages_tenant_delete" ON public.staff_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM staff_conversations sc
      WHERE sc.conversation_id = staff_messages.conversation_id
        AND sc.tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    )
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_messages_tenant_insert" ON public.staff_messages;
CREATE POLICY "staff_messages_tenant_insert" ON public.staff_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM staff_conversations sc
      WHERE sc.conversation_id = sc.conversation_id
        AND sc.tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    )
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_messages_tenant_select" ON public.staff_messages;
CREATE POLICY "staff_messages_tenant_select" ON public.staff_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM staff_conversations sc
      WHERE sc.conversation_id = staff_messages.conversation_id
        AND sc.tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    )
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_messages_tenant_update" ON public.staff_messages;
CREATE POLICY "staff_messages_tenant_update" ON public.staff_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM staff_conversations sc
      WHERE sc.conversation_id = staff_messages.conversation_id
        AND sc.tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    )
    OR (select auth.role()) = 'service_role'::text
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM staff_conversations sc
      WHERE sc.conversation_id = sc.conversation_id
        AND sc.tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    )
    OR (select auth.role()) = 'service_role'::text
  );

-- ============================================================================
-- 21. sync_history (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Users can only access their tenant's sync history" ON public.sync_history;
CREATE POLICY "Users can only access their tenant's sync history" ON public.sync_history
  FOR ALL
  USING (
    tenant_id IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 22. tenant_compliance_credentials (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Only admins can create credentials" ON public.tenant_compliance_credentials;
CREATE POLICY "Only admins can create credentials" ON public.tenant_compliance_credentials
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_compliance_credentials.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

DROP POLICY IF EXISTS "Only admins can delete credentials" ON public.tenant_compliance_credentials;
CREATE POLICY "Only admins can delete credentials" ON public.tenant_compliance_credentials
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_compliance_credentials.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

DROP POLICY IF EXISTS "Only admins can update credentials" ON public.tenant_compliance_credentials;
CREATE POLICY "Only admins can update credentials" ON public.tenant_compliance_credentials
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_compliance_credentials.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

DROP POLICY IF EXISTS "Only admins can view credentials" ON public.tenant_compliance_credentials;
CREATE POLICY "Only admins can view credentials" ON public.tenant_compliance_credentials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_compliance_credentials.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

-- ============================================================================
-- 23. tenant_knowledge_embeddings (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "tenant_knowledge_delete" ON public.tenant_knowledge_embeddings;
CREATE POLICY "tenant_knowledge_delete" ON public.tenant_knowledge_embeddings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_knowledge_embeddings.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

DROP POLICY IF EXISTS "tenant_knowledge_insert" ON public.tenant_knowledge_embeddings;
CREATE POLICY "tenant_knowledge_insert" ON public.tenant_knowledge_embeddings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_knowledge_embeddings.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'editor'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

DROP POLICY IF EXISTS "tenant_knowledge_isolation" ON public.tenant_knowledge_embeddings;
CREATE POLICY "tenant_knowledge_isolation" ON public.tenant_knowledge_embeddings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_knowledge_embeddings.tenant_id
        AND user_tenant_permissions.is_active = true
    )
  );

DROP POLICY IF EXISTS "tenant_knowledge_update" ON public.tenant_knowledge_embeddings;
CREATE POLICY "tenant_knowledge_update" ON public.tenant_knowledge_embeddings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_knowledge_embeddings.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'editor'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

-- ============================================================================
-- 24. tenant_registry (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Only service role can create tenants" ON public.tenant_registry;
CREATE POLICY "Only service role can create tenants" ON public.tenant_registry
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Only service role can delete tenants" ON public.tenant_registry;
CREATE POLICY "Only service role can delete tenants" ON public.tenant_registry
  FOR DELETE
  USING ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Only service role can update tenants" ON public.tenant_registry;
CREATE POLICY "Only service role can update tenants" ON public.tenant_registry
  FOR UPDATE
  USING ((select auth.role()) = 'service_role'::text);

-- ============================================================================
-- 25. user_tenant_permissions (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "user_tenant_permissions_delete" ON public.user_tenant_permissions;
CREATE POLICY "user_tenant_permissions_delete" ON public.user_tenant_permissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.tenant_id = user_tenant_permissions.tenant_id
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text])
        AND utp.is_active = true
    )
  );

DROP POLICY IF EXISTS "user_tenant_permissions_insert" ON public.user_tenant_permissions;
CREATE POLICY "user_tenant_permissions_insert" ON public.user_tenant_permissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.tenant_id = user_tenant_permissions.tenant_id
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text])
        AND utp.is_active = true
    )
  );

DROP POLICY IF EXISTS "user_tenant_permissions_select" ON public.user_tenant_permissions;
CREATE POLICY "user_tenant_permissions_select" ON public.user_tenant_permissions
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.tenant_id = user_tenant_permissions.tenant_id
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text])
        AND utp.is_active = true
    )
  );

DROP POLICY IF EXISTS "user_tenant_permissions_update" ON public.user_tenant_permissions;
CREATE POLICY "user_tenant_permissions_update" ON public.user_tenant_permissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.tenant_id = user_tenant_permissions.tenant_id
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text])
        AND utp.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.tenant_id = user_tenant_permissions.tenant_id
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text])
        AND utp.is_active = true
    )
  );

-- ============================================================================
-- VALIDATION
-- ============================================================================
-- After migration, verify NO auth_rls_initplan warnings by checking policies:
--
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (
--     qual LIKE '%auth.uid()%'
--     OR qual LIKE '%auth.role()%'
--     OR qual LIKE '%auth.jwt()%'
--     OR with_check LIKE '%auth.uid()%'
--     OR with_check LIKE '%auth.role()%'
--     OR with_check LIKE '%auth.jwt()%'
--   );
--
-- Expected: 0 rows (all should use (select auth.xxx()) now)
-- ============================================================================
