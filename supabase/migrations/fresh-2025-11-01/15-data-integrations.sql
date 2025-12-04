-- =====================================================
-- Migration: 15-data-integrations.sql
-- Description: Insert integration-related data
-- Tables: 9 tables, ~225 rows total
-- Generated: 2025-10-31
-- =====================================================

-- =====================================================
-- TABLE: integration_configs (3 rows)
-- Description: Motopress integration configs for tenants
-- =====================================================

INSERT INTO integration_configs (
  id,
  tenant_id,
  integration_type,
  config_data,
  is_active,
  last_sync_at,
  created_at,
  updated_at
) VALUES
  (
    '7b448619-532a-4434-b21e-bb1c63593dad',
    'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
    'motopress',
    '{"api_key":"5Cgy3txuS7YPgpvhJ/34i64IH/IieIfLVHoavcozXH5AXDsU0Evb6IfQVAVwE21iNRy2ippI74jYVEj88blByJLGI5GV3G4=","site_url":"https://simmerdown.house/","consumer_secret":"ZkQGC8qDJ2X0aPsBY0CUjVaBEHOzQOe+qS1k7z1BSRgXmtCWuoMPLbWGZ6aV8NRBPNHDmYfa/lnRb2UU0UQxQwuS7qrzbdk="}'::jsonb,
    true,
    '2025-10-23 20:43:42.73+00',
    '2025-09-27 03:30:21.301909+00',
    '2025-10-23 07:23:38.179+00'
  ),
  (
    'ae9f26e2-df6a-4326-9c0c-242b5927fc40',
    '03d2ae98-06f1-407b-992b-ca809dfc333b',
    'motopress',
    '{"api_key":"ejxfmAb0dZSHDPj36Q6wk0ZK93qX7VTa3h87vXjUXE0Em4zVJXusBOlcbIreFpcaIti7NoU47AUiXJ/0SH1oEtfObfETVqQ=","site_url":"https://casaboutiqueloscedros.com/","consumer_secret":"e4KbQngp+NzGdZPUw5byBNPz/sGWW1wfe3p1ni05eoJSvwQRUFF/fklPsOTSiC1pjNiZU2dNzWJjeUQ0vg+XZt4068/ZiFI="}'::jsonb,
    true,
    '2025-10-19 07:26:10.023+00',
    '2025-10-19 00:27:23.246098+00',
    '2025-10-19 00:40:45.438+00'
  ),
  (
    'aefc3f1a-f6fd-4660-af47-0a1e998580c6',
    '2263efba-b62b-417b-a422-a84638bc632f',
    'motopress',
    '{"api_key":"vOhJlouaTOlAAxpZucbiZBw5PSk2R5ssmS/m4YNpodzjrHKJ8iwHB3oI+qqwDaq9SK+v3op0dG2YD4PI+jq8gL/bW6nCxwI=","site_url":"https://tucasaenelmar.com/","consumer_secret":"Y0g/waNaPfe1z9iVKrPB8gMS8A230LJOYCdXEmzGUtwDw0UbDNuZ7++akys42PZq48ljiOE0G/cqmV+pn32U7YuuU9Yvuw4="}'::jsonb,
    true,
    '2025-10-23 17:58:05.843+00',
    '2025-10-18 02:14:43.238692+00',
    '2025-10-18 23:47:51.947+00'
  );

-- Verify integration_configs count
SELECT 'integration_configs' AS table_name, COUNT(*) AS row_count FROM integration_configs;

