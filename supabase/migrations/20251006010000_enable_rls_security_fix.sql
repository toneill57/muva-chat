-- Migration: Enable RLS on 4 tables without Row Level Security
-- Date: 2025-10-06
-- Priority: CRITICAL - Security vulnerability fix
-- Issue: https://github.com/anthropics/claude-code/issues/SECURITY-001
--
-- Tables affected:
--   1. public.accommodation_units
--   2. public.accommodation_units_manual_chunks
--   3. public.staff_conversations
--   4. public.staff_messages
--
-- Impact: Without RLS, these tables are accessible by any authenticated user
--         This breaks multi-tenant isolation and is a critical security flaw.

-- ============================================================================
-- PART 1: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.accommodation_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodation_units_manual_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: CREATE POLICIES FOR public.accommodation_units
-- ============================================================================

-- SELECT Policy: Allow tenants to view their own accommodation units
-- Also allow service_role (backend) to access all
CREATE POLICY "accommodation_units_tenant_select"
  ON public.accommodation_units
  FOR SELECT
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  );

-- INSERT Policy: Only allow inserting with correct tenant_id
CREATE POLICY "accommodation_units_tenant_insert"
  ON public.accommodation_units
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  );

-- UPDATE Policy: Only allow updating own tenant's units
CREATE POLICY "accommodation_units_tenant_update"
  ON public.accommodation_units
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  );

-- DELETE Policy: Only allow deleting own tenant's units
CREATE POLICY "accommodation_units_tenant_delete"
  ON public.accommodation_units
  FOR DELETE
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  );

-- ============================================================================
-- PART 3: CREATE POLICIES FOR public.accommodation_units_manual_chunks
-- ============================================================================

-- SELECT Policy: Allow access to chunks of units belonging to tenant
CREATE POLICY "accommodation_units_manual_chunks_tenant_select"
  ON public.accommodation_units_manual_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accommodation_units_manual aum
      JOIN public.accommodation_units au ON au.id = aum.accommodation_unit_id
      WHERE aum.id = accommodation_units_manual_chunks.manual_id
        AND au.tenant_id = current_setting('app.tenant_id', true)::uuid
    )
    OR auth.role() = 'service_role'
  );

-- INSERT Policy: Allow inserting chunks for own tenant's manuals
CREATE POLICY "accommodation_units_manual_chunks_tenant_insert"
  ON public.accommodation_units_manual_chunks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accommodation_units_manual aum
      JOIN public.accommodation_units au ON au.id = aum.accommodation_unit_id
      WHERE aum.id = manual_id
        AND au.tenant_id = current_setting('app.tenant_id', true)::uuid
    )
    OR auth.role() = 'service_role'
  );

-- UPDATE Policy: Allow updating chunks for own tenant's manuals
CREATE POLICY "accommodation_units_manual_chunks_tenant_update"
  ON public.accommodation_units_manual_chunks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.accommodation_units_manual aum
      JOIN public.accommodation_units au ON au.id = aum.accommodation_unit_id
      WHERE aum.id = accommodation_units_manual_chunks.manual_id
        AND au.tenant_id = current_setting('app.tenant_id', true)::uuid
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accommodation_units_manual aum
      JOIN public.accommodation_units au ON au.id = aum.accommodation_unit_id
      WHERE aum.id = manual_id
        AND au.tenant_id = current_setting('app.tenant_id', true)::uuid
    )
    OR auth.role() = 'service_role'
  );

-- DELETE Policy: Allow deleting chunks for own tenant's manuals
CREATE POLICY "accommodation_units_manual_chunks_tenant_delete"
  ON public.accommodation_units_manual_chunks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.accommodation_units_manual aum
      JOIN public.accommodation_units au ON au.id = aum.accommodation_unit_id
      WHERE aum.id = accommodation_units_manual_chunks.manual_id
        AND au.tenant_id = current_setting('app.tenant_id', true)::uuid
    )
    OR auth.role() = 'service_role'
  );

-- ============================================================================
-- PART 4: CREATE POLICIES FOR public.staff_conversations
-- ============================================================================

-- SELECT Policy: Allow staff to view conversations from their tenant
CREATE POLICY "staff_conversations_tenant_select"
  ON public.staff_conversations
  FOR SELECT
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  );

-- INSERT Policy: Only allow creating conversations for own tenant
CREATE POLICY "staff_conversations_tenant_insert"
  ON public.staff_conversations
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  );

-- UPDATE Policy: Only allow updating own tenant's conversations
CREATE POLICY "staff_conversations_tenant_update"
  ON public.staff_conversations
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  );

-- DELETE Policy: Only allow deleting own tenant's conversations
CREATE POLICY "staff_conversations_tenant_delete"
  ON public.staff_conversations
  FOR DELETE
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR auth.role() = 'service_role'
  );

-- ============================================================================
-- PART 5: CREATE POLICIES FOR public.staff_messages
-- ============================================================================

-- SELECT Policy: Allow staff to view messages from conversations in their tenant
CREATE POLICY "staff_messages_tenant_select"
  ON public.staff_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_conversations sc
      WHERE sc.id = staff_messages.conversation_id
        AND sc.tenant_id = current_setting('app.tenant_id', true)::uuid
    )
    OR auth.role() = 'service_role'
  );

-- INSERT Policy: Allow inserting messages only for own tenant's conversations
CREATE POLICY "staff_messages_tenant_insert"
  ON public.staff_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_conversations sc
      WHERE sc.id = conversation_id
        AND sc.tenant_id = current_setting('app.tenant_id', true)::uuid
    )
    OR auth.role() = 'service_role'
  );

-- UPDATE Policy: Allow updating messages only for own tenant's conversations
CREATE POLICY "staff_messages_tenant_update"
  ON public.staff_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_conversations sc
      WHERE sc.id = staff_messages.conversation_id
        AND sc.tenant_id = current_setting('app.tenant_id', true)::uuid
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_conversations sc
      WHERE sc.id = conversation_id
        AND sc.tenant_id = current_setting('app.tenant_id', true)::uuid
    )
    OR auth.role() = 'service_role'
  );

-- DELETE Policy: Allow deleting messages only for own tenant's conversations
CREATE POLICY "staff_messages_tenant_delete"
  ON public.staff_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_conversations sc
      WHERE sc.id = staff_messages.conversation_id
        AND sc.tenant_id = current_setting('app.tenant_id', true)::uuid
    )
    OR auth.role() = 'service_role'
  );

-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually to verify)
-- ============================================================================

-- Verify RLS is enabled on all 4 tables:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'accommodation_units',
--     'accommodation_units_manual_chunks',
--     'staff_conversations',
--     'staff_messages'
--   );
-- Expected: All should have rowsecurity = true

-- Verify policies were created (should be 16 total: 4 tables × 4 operations):
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'accommodation_units',
--     'accommodation_units_manual_chunks',
--     'staff_conversations',
--     'staff_messages'
--   )
-- ORDER BY tablename, cmd;
-- Expected: 16 rows

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration (DANGEROUS - only in emergency):
/*
-- Drop all policies
DROP POLICY IF EXISTS "accommodation_units_tenant_select" ON public.accommodation_units;
DROP POLICY IF EXISTS "accommodation_units_tenant_insert" ON public.accommodation_units;
DROP POLICY IF EXISTS "accommodation_units_tenant_update" ON public.accommodation_units;
DROP POLICY IF EXISTS "accommodation_units_tenant_delete" ON public.accommodation_units;

DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_select" ON public.accommodation_units_manual_chunks;
DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_insert" ON public.accommodation_units_manual_chunks;
DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_update" ON public.accommodation_units_manual_chunks;
DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_delete" ON public.accommodation_units_manual_chunks;

DROP POLICY IF EXISTS "staff_conversations_tenant_select" ON public.staff_conversations;
DROP POLICY IF EXISTS "staff_conversations_tenant_insert" ON public.staff_conversations;
DROP POLICY IF EXISTS "staff_conversations_tenant_update" ON public.staff_conversations;
DROP POLICY IF EXISTS "staff_conversations_tenant_delete" ON public.staff_conversations;

DROP POLICY IF EXISTS "staff_messages_tenant_select" ON public.staff_messages;
DROP POLICY IF EXISTS "staff_messages_tenant_insert" ON public.staff_messages;
DROP POLICY IF EXISTS "staff_messages_tenant_update" ON public.staff_messages;
DROP POLICY IF EXISTS "staff_messages_tenant_delete" ON public.staff_messages;

-- Disable RLS
ALTER TABLE public.accommodation_units DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodation_units_manual_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_messages DISABLE ROW LEVEL SECURITY;
*/
