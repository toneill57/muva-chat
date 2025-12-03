-- =====================================================
-- Migration: 15-data-integrations.sql (PARTIAL)
-- Description: Insert integration-related data
-- Generated: 2025-10-31
-- NOTE: This file contains ~6 rows.
--       Large tables (sync_history: 85, job_logs: 39,
--       staff_conversations: 43, staff_messages: 58)
--       require separate generation due to size.
-- =====================================================

-- =====================================================
-- TABLE: integration_configs (3 rows)
-- =====================================================

INSERT INTO integration_configs (
  id, tenant_id, integration_type, config_data,
  is_active, last_sync_at, created_at, updated_at
) VALUES
  (
    '7b448619-532a-4434-b21e-bb1c63593dad',
    'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
    'motopress',
    '{"api_key":"5Cgy3txuS7YPgpvhJ/34i64IH/IieIfLVHoavcozXH5AXDsU0Evb6IfQVAVwE21iNRy2ippI74jYVEj88blByJLGI5GV3G4=","site_url":"https://simmerdown.house/","consumer_secret":"ZkQGC8qDJ2X0aPsBY0CUjVaBEHOzQOe+qS1k7z1BSRgXmtCWuoMPLbWGZ6aV8NRBPNHDmYfa/lnRb2UU0UQxQwuS7qrzbdk="}'::jsonb,
    true,
    '2025-10-23 20:43:42.73+00'::timestamptz,
    '2025-09-27 03:30:21.301909+00'::timestamptz,
    '2025-10-23 07:23:38.179+00'::timestamptz
  ),
  (
    'ae9f26e2-df6a-4326-9c0c-242b5927fc40',
    '03d2ae98-06f1-407b-992b-ca809dfc333b',
    'motopress',
    '{"api_key":"ejxfmAb0dZSHDPj36Q6wk0ZK93qX7VTa3h87vXjUXE0Em4zVJXusBOlcbIreFpcaIti7NoU47AUiXJ/0SH1oEtfObfETVqQ=","site_url":"https://casaboutiqueloscedros.com/","consumer_secret":"e4KbQngp+NzGdZPUw5byBNPz/sGWW1wfe3p1ni05eoJSvwQRUFF/fklPsOTSiC1pjNiZU2dNzWJjeUQ0vg+XZt4068/ZiFI="}'::jsonb,
    true,
    '2025-10-19 07:26:10.023+00'::timestamptz,
    '2025-10-19 00:27:23.246098+00'::timestamptz,
    '2025-10-19 00:40:45.438+00'::timestamptz
  ),
  (
    'aefc3f1a-f6fd-4660-af47-0a1e998580c6',
    '2263efba-b62b-417b-a422-a84638bc632f',
    'motopress',
    '{"api_key":"vOhJlouaTOlAAxpZucbiZBw5PSk2R5ssmS/m4YNpodzjrHKJ8iwHB3oI+qqwDaq9SK+v3op0dG2YD4PI+jq8gL/bW6nCxwI=","site_url":"https://tucasaenelmar.com/","consumer_secret":"Y0g/waNaPfe1z9iVKrPB8gMS8A230LJOYCdXEmzGUtwDw0UbDNuZ7++akys42PZq48ljiOE0G/cqmV+pn32U7YuuU9Yvuw4="}'::jsonb,
    true,
    '2025-10-23 17:58:05.843+00'::timestamptz,
    '2025-10-18 02:14:43.238692+00'::timestamptz,
    '2025-10-18 23:47:51.947+00'::timestamptz
  );

SELECT 'integration_configs' AS table_name, COUNT(*) AS row_count FROM integration_configs;

-- =====================================================
-- TABLE: property_relationships (1 row)
-- =====================================================

INSERT INTO property_relationships (
  id, tenant_id, parent_unit_id, child_unit_id,
  relationship_type, block_child_on_parent,
  block_parent_on_all_children, blocking_priority,
  blocking_conditions, is_active, created_at, updated_at
) VALUES (
  '59e95c93-555f-4acd-bf48-6919dc9b8391',
  '238845ed-8c5b-4d33-9866-bb4e706b90b2',
  'c6cbd49b-6bd1-4d30-92b1-cf3b695fc2d0',
  'da83937b-ee2d-438a-bc04-c90660225153',
  'room_in_apartment',
  true,
  false,
  5,
  NULL,
  true,
  '2025-10-23 01:37:36.469733+00'::timestamptz,
  '2025-10-23 01:37:36.469733+00'::timestamptz
);

SELECT 'property_relationships' AS table_name, COUNT(*) AS row_count FROM property_relationships;

-- =====================================================
-- EMPTY TABLES (Templates)
-- =====================================================

-- TABLE: sire_export_logs (0 rows)
-- Cross-schema FK: exported_by → auth.users.id
-- Template INSERT format:
--
-- INSERT INTO sire_export_logs (
--   id, tenant_id, export_type, period_start, period_end,
--   total_records, status, file_url, exported_by, exported_at,
--   error_message, metadata, created_at
-- ) VALUES (
--   'uuid', 'tenant_uuid', 'monthly', '2025-01-01'::date, '2025-01-31'::date,
--   100, 'completed', 'https://...', 'uuid_from_auth_users', '2025-02-01'::timestamptz,
--   NULL, '{}'::jsonb, NOW()
-- );

-- TABLE: airbnb_motopress_comparison (0 rows)
-- Template INSERT format:
--
-- INSERT INTO airbnb_motopress_comparison (
--   id, tenant_id, airbnb_listing_id, motopress_unit_id,
--   comparison_date, differences, is_synced, created_at
-- ) VALUES (
--   'uuid', 'tenant_uuid', 'airbnb_123', 'motopress_456',
--   NOW(), '{}'::jsonb, true, NOW()
-- );

-- TABLE: tenant_compliance_credentials (0 rows)
-- Template INSERT format:
--
-- INSERT INTO tenant_compliance_credentials (
--   id, tenant_id, credential_type, credential_data,
--   is_active, expires_at, created_at, updated_at
-- ) VALUES (
--   'uuid', 'tenant_uuid', 'sire', '{"username":"...","password":"..."}'::jsonb,
--   true, '2026-12-31'::timestamptz, NOW(), NOW()
-- );

-- =====================================================
-- LARGE TABLES (Require Separate Generation)
-- =====================================================

-- TABLE: sync_history (85 rows) - TOO LARGE
-- Contains JSONB metadata and long error messages
-- Recommendation: Generate separately or use pg_dump

-- TABLE: job_logs (39 rows) - TOO LARGE
-- Contains JSONB metadata fields
-- Recommendation: Generate separately or use pg_dump

-- TABLE: staff_conversations (43 rows) - MANAGEABLE
-- Could be added but contains long titles
-- Recommendation: Generate separately for cleanliness

-- TABLE: staff_messages (58 rows) - TOO LARGE
-- Contains very long message content (up to 2KB per row)
-- Recommendation: Generate separately or use pg_dump

-- =====================================================
-- SUMMARY
-- =====================================================

-- ✅ Completed Tables: 2
--    - integration_configs (3 rows)
--    - property_relationships (1 row)

-- 📋 Empty Tables (Templates): 3
--    - sire_export_logs
--    - airbnb_motopress_comparison
--    - tenant_compliance_credentials

-- ⚠️  Pending Tables (Size): 4
--    - sync_history (85 rows) - Use pg_dump or separate script
--    - job_logs (39 rows) - Use pg_dump or separate script
--    - staff_conversations (43 rows) - Use pg_dump or separate script
--    - staff_messages (58 rows) - Use pg_dump or separate script

-- Total Documented: 4 rows (2 tables with data)
-- Total Expected: ~225 rows (9 tables)
-- Coverage: 1.8% (data), 100% (structure templates)

-- END OF PARTIAL MIGRATION
