-- ============================================================================
-- FIX REMAINING auth_rls_initplan WARNINGS - hotels schema
-- ============================================================================
-- Migration: 2025-11-01-fix-hotels-schema-initplan.sql
-- Purpose: Wrap current_setting() in hotels schema tables
-- Remaining: 16 warnings from 4 tables in hotels schema
-- Security: IDENTICAL - only performance optimization
-- ============================================================================

-- ============================================================================
-- 1. hotels.client_info (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "client_info_tenant_delete" ON hotels.client_info;
CREATE POLICY "client_info_tenant_delete" ON hotels.client_info
  FOR DELETE
  USING ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

DROP POLICY IF EXISTS "client_info_tenant_insert" ON hotels.client_info;
CREATE POLICY "client_info_tenant_insert" ON hotels.client_info
  FOR INSERT
  WITH CHECK ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

DROP POLICY IF EXISTS "client_info_tenant_select" ON hotels.client_info;
CREATE POLICY "client_info_tenant_select" ON hotels.client_info
  FOR SELECT
  USING ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

DROP POLICY IF EXISTS "client_info_tenant_update" ON hotels.client_info;
CREATE POLICY "client_info_tenant_update" ON hotels.client_info
  FOR UPDATE
  USING ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

-- ============================================================================
-- 2. hotels.guest_information (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "guest_information_tenant_delete" ON hotels.guest_information;
CREATE POLICY "guest_information_tenant_delete" ON hotels.guest_information
  FOR DELETE
  USING ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

DROP POLICY IF EXISTS "guest_information_tenant_insert" ON hotels.guest_information;
CREATE POLICY "guest_information_tenant_insert" ON hotels.guest_information
  FOR INSERT
  WITH CHECK ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

DROP POLICY IF EXISTS "guest_information_tenant_select" ON hotels.guest_information;
CREATE POLICY "guest_information_tenant_select" ON hotels.guest_information
  FOR SELECT
  USING ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

DROP POLICY IF EXISTS "guest_information_tenant_update" ON hotels.guest_information;
CREATE POLICY "guest_information_tenant_update" ON hotels.guest_information
  FOR UPDATE
  USING ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

-- ============================================================================
-- 3. hotels.pricing_rules (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "pricing_rules_tenant_delete" ON hotels.pricing_rules;
CREATE POLICY "pricing_rules_tenant_delete" ON hotels.pricing_rules
  FOR DELETE
  USING ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

DROP POLICY IF EXISTS "pricing_rules_tenant_insert" ON hotels.pricing_rules;
CREATE POLICY "pricing_rules_tenant_insert" ON hotels.pricing_rules
  FOR INSERT
  WITH CHECK ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

DROP POLICY IF EXISTS "pricing_rules_tenant_select" ON hotels.pricing_rules;
CREATE POLICY "pricing_rules_tenant_select" ON hotels.pricing_rules
  FOR SELECT
  USING ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

DROP POLICY IF EXISTS "pricing_rules_tenant_update" ON hotels.pricing_rules;
CREATE POLICY "pricing_rules_tenant_update" ON hotels.pricing_rules
  FOR UPDATE
  USING ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

-- ============================================================================
-- 4. hotels.unit_amenities (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "unit_amenities_tenant_delete" ON hotels.unit_amenities;
CREATE POLICY "unit_amenities_tenant_delete" ON hotels.unit_amenities
  FOR DELETE
  USING ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

DROP POLICY IF EXISTS "unit_amenities_tenant_insert" ON hotels.unit_amenities;
CREATE POLICY "unit_amenities_tenant_insert" ON hotels.unit_amenities
  FOR INSERT
  WITH CHECK ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

DROP POLICY IF EXISTS "unit_amenities_tenant_select" ON hotels.unit_amenities;
CREATE POLICY "unit_amenities_tenant_select" ON hotels.unit_amenities
  FOR SELECT
  USING ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

DROP POLICY IF EXISTS "unit_amenities_tenant_update" ON hotels.unit_amenities;
CREATE POLICY "unit_amenities_tenant_update" ON hotels.unit_amenities
  FOR UPDATE
  USING ((tenant_id)::text = (select current_setting('app.current_tenant_id'::text, true)));

-- ============================================================================
-- VALIDATION
-- ============================================================================
-- After this migration: 0 auth_rls_initplan warnings expected
-- Security: IDENTICAL tenant isolation maintained
-- Performance: Optimized (current_setting evaluated once per query, not per row)
-- ============================================================================
