-- ============================================================================
-- FIX REMAINING auth_rls_initplan WARNINGS - current_setting() Issues
-- ============================================================================
-- Migration: 2025-11-01-fix-current-setting-initplan.sql
-- Purpose: Wrap current_setting() calls with SELECT to prevent re-evaluation
-- Remaining: 46 warnings from current_setting() not being wrapped
-- Pattern: current_setting('x') → (select current_setting('x'))
-- ============================================================================

-- ============================================================================
-- 1. accommodation_units (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "accommodation_units_tenant_delete" ON public.accommodation_units;
CREATE POLICY "accommodation_units_tenant_delete" ON public.accommodation_units
  FOR DELETE
  USING (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_tenant_insert" ON public.accommodation_units;
CREATE POLICY "accommodation_units_tenant_insert" ON public.accommodation_units
  FOR INSERT
  WITH CHECK (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_tenant_select" ON public.accommodation_units;
CREATE POLICY "accommodation_units_tenant_select" ON public.accommodation_units
  FOR SELECT
  USING (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_tenant_update" ON public.accommodation_units;
CREATE POLICY "accommodation_units_tenant_update" ON public.accommodation_units
  FOR UPDATE
  USING (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  )
  WITH CHECK (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

-- ============================================================================
-- 2. accommodation_units_manual (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Guest can view their unit manual" ON public.accommodation_units_manual;
CREATE POLICY "Guest can view their unit manual" ON public.accommodation_units_manual
  FOR SELECT
  USING (
    unit_id IN (
      SELECT guest_reservations.accommodation_unit_id
      FROM guest_reservations
      WHERE (guest_reservations.id)::text = (select current_setting('request.jwt.claim.reservation_id'::text, true))
        AND (guest_reservations.status)::text = 'active'::text
    )
  );

-- ============================================================================
-- 3. accommodation_units_manual_chunks (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_delete" ON public.accommodation_units_manual_chunks;
CREATE POLICY "accommodation_units_manual_chunks_tenant_delete" ON public.accommodation_units_manual_chunks
  FOR DELETE
  USING (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_insert" ON public.accommodation_units_manual_chunks;
CREATE POLICY "accommodation_units_manual_chunks_tenant_insert" ON public.accommodation_units_manual_chunks
  FOR INSERT
  WITH CHECK (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_select" ON public.accommodation_units_manual_chunks;
CREATE POLICY "accommodation_units_manual_chunks_tenant_select" ON public.accommodation_units_manual_chunks
  FOR SELECT
  USING (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_update" ON public.accommodation_units_manual_chunks;
CREATE POLICY "accommodation_units_manual_chunks_tenant_update" ON public.accommodation_units_manual_chunks
  FOR UPDATE
  USING (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  )
  WITH CHECK (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

-- ============================================================================
-- 4. airbnb_mphb_imported_reservations (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "airbnb_mphb_tenant_isolation" ON public.airbnb_mphb_imported_reservations;
CREATE POLICY "airbnb_mphb_tenant_isolation" ON public.airbnb_mphb_imported_reservations
  FOR ALL
  USING (
    (tenant_id)::text = ((select current_setting('app.tenant_id'::text, true))::character varying)::text
  );

-- ============================================================================
-- 5. chat_conversations (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "chat_conversations_select" ON public.chat_conversations;
CREATE POLICY "chat_conversations_select" ON public.chat_conversations
  FOR SELECT
  USING (
    (
      (user_id)::text = (select current_setting('app.current_user_id'::text, true))
      AND (user_type)::text = 'guest'::text
    )
    OR (
      (tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))
      AND (select current_setting('app.user_role'::text, true)) = ANY (ARRAY['staff'::text, 'admin'::text, 'owner'::text])
    )
  );

-- ============================================================================
-- 6. chat_messages (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
CREATE POLICY "chat_messages_select" ON public.chat_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT chat_conversations.id
      FROM chat_conversations
      WHERE (chat_conversations.user_id)::text = (select current_setting('app.current_user_id'::text, true))
        AND (chat_conversations.user_type)::text = 'guest'::text
    )
    OR (
      conversation_id IN (
        SELECT chat_conversations.id
        FROM chat_conversations
        WHERE (chat_conversations.tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))
      )
      AND (select current_setting('app.user_role'::text, true)) = ANY (ARRAY['staff'::text, 'admin'::text, 'owner'::text])
    )
  );

-- ============================================================================
-- 7. conversation_memory (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own session memories" ON public.conversation_memory;
CREATE POLICY "Users can view own session memories" ON public.conversation_memory
  FOR SELECT
  USING (
    session_id IN (
      SELECT prospective_sessions.session_id
      FROM prospective_sessions
      WHERE prospective_sessions.cookie_id = (select current_setting('request.cookie_id'::text, true))
    )
  );

-- ============================================================================
-- 8. guest_reservations (1 policy - already has auth.uid wrapped, add current_setting)
-- ============================================================================

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
      (tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))
      AND (select current_setting('app.user_role'::text, true)) = ANY (ARRAY['staff'::text, 'admin'::text, 'owner'::text])
    )
  );

-- ============================================================================
-- 9. hotel_operations (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "hotel_operations_staff_access" ON public.hotel_operations;
CREATE POLICY "hotel_operations_staff_access" ON public.hotel_operations
  FOR SELECT
  USING (
    (tenant_id)::text = (select current_setting('request.jwt.claim.tenant_id'::text, true))
    AND (
      (access_level)::text = 'all_staff'::text
      OR (
        (access_level)::text = 'admin_only'::text
        AND (select current_setting('request.jwt.claim.role'::text, true)) = ANY (ARRAY['ceo'::text, 'admin'::text])
      )
      OR (
        (access_level)::text = 'ceo_only'::text
        AND (select current_setting('request.jwt.claim.role'::text, true)) = 'ceo'::text
      )
    )
  );

-- ============================================================================
-- 10. prospective_sessions (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "prospective_sessions_select" ON public.prospective_sessions;
CREATE POLICY "prospective_sessions_select" ON public.prospective_sessions
  FOR SELECT
  USING (
    (status)::text = 'active'::text
    OR tenant_id IN (
      SELECT staff_users.tenant_id
      FROM staff_users
      WHERE (staff_users.staff_id)::text = (select current_setting('request.jwt.claim.sub'::text, true))
    )
  );

-- ============================================================================
-- 11. reservation_accommodations (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "reservation_accommodations_tenant_isolation" ON public.reservation_accommodations;
CREATE POLICY "reservation_accommodations_tenant_isolation" ON public.reservation_accommodations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM guest_reservations gr
      WHERE gr.id = reservation_accommodations.reservation_id
        AND (gr.tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM guest_reservations gr
      WHERE gr.id = reservation_accommodations.reservation_id
        AND (gr.tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true))
    )
  );

-- ============================================================================
-- 12. staff_conversations (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "staff_conversations_tenant_delete" ON public.staff_conversations;
CREATE POLICY "staff_conversations_tenant_delete" ON public.staff_conversations
  FOR DELETE
  USING (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_conversations_tenant_insert" ON public.staff_conversations;
CREATE POLICY "staff_conversations_tenant_insert" ON public.staff_conversations
  FOR INSERT
  WITH CHECK (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_conversations_tenant_select" ON public.staff_conversations;
CREATE POLICY "staff_conversations_tenant_select" ON public.staff_conversations
  FOR SELECT
  USING (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_conversations_tenant_update" ON public.staff_conversations;
CREATE POLICY "staff_conversations_tenant_update" ON public.staff_conversations
  FOR UPDATE
  USING (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  )
  WITH CHECK (
    tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

-- ============================================================================
-- 13. staff_messages (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "staff_messages_tenant_delete" ON public.staff_messages;
CREATE POLICY "staff_messages_tenant_delete" ON public.staff_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM staff_conversations sc
      WHERE sc.conversation_id = staff_messages.conversation_id
        AND sc.tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
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
        AND sc.tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
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
        AND sc.tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
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
        AND sc.tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    )
    OR (select auth.role()) = 'service_role'::text
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM staff_conversations sc
      WHERE sc.conversation_id = sc.conversation_id
        AND sc.tenant_id = (select current_setting('app.tenant_id'::text, true))::uuid
    )
    OR (select auth.role()) = 'service_role'::text
  );

-- ============================================================================
-- 14. staff_users (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "staff_users_select" ON public.staff_users;
CREATE POLICY "staff_users_select" ON public.staff_users
  FOR SELECT
  USING (
    (staff_id)::text = (select current_setting('request.jwt.claim.staff_id'::text, true))
    OR (
      (tenant_id)::text = (select current_setting('request.jwt.claim.tenant_id'::text, true))
      AND (select current_setting('request.jwt.claim.role'::text, true)) = ANY (ARRAY['ceo'::text, 'admin'::text])
    )
  );

-- ============================================================================
-- 15. tenant_muva_content (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can delete own MUVA content" ON public.tenant_muva_content;
CREATE POLICY "Tenants can delete own MUVA content" ON public.tenant_muva_content
  FOR DELETE
  USING (tenant_id = (select current_setting('app.current_tenant_id'::text, true))::uuid);

DROP POLICY IF EXISTS "Tenants can insert own MUVA content" ON public.tenant_muva_content;
CREATE POLICY "Tenants can insert own MUVA content" ON public.tenant_muva_content
  FOR INSERT
  WITH CHECK (tenant_id = (select current_setting('app.current_tenant_id'::text, true))::uuid);

DROP POLICY IF EXISTS "Tenants can update own MUVA content" ON public.tenant_muva_content;
CREATE POLICY "Tenants can update own MUVA content" ON public.tenant_muva_content
  FOR UPDATE
  USING (tenant_id = (select current_setting('app.current_tenant_id'::text, true))::uuid);

DROP POLICY IF EXISTS "Tenants can view own MUVA content" ON public.tenant_muva_content;
CREATE POLICY "Tenants can view own MUVA content" ON public.tenant_muva_content
  FOR SELECT
  USING (tenant_id = (select current_setting('app.current_tenant_id'::text, true))::uuid);

-- ============================================================================
-- VALIDATION
-- ============================================================================
-- After migration, verify 0 auth_rls_initplan warnings
-- ============================================================================
