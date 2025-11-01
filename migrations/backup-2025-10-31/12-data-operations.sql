-- Migration File 12: Data - Operations
-- Generated: 2025-10-31
-- Schema: Verified from production (ooaumjzaztmutltifhoq)
-- Data: ALL operational data (small datasets)

SET session_replication_role = replica;

-- Insert hotels (3 records)
INSERT INTO hotels (
  id, tenant_id, name, description, short_description, address, contact_info,
  check_in_time, check_out_time, policies, hotel_amenities, motopress_property_id,
  full_description, tourism_summary, policies_summary, images, status,
  created_at, updated_at
) VALUES
(
  '238845ed-8c5b-4d33-9866-bb4e706b90b2',
  'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
  'SimmerDown Guest House',
  'Una experiencia única en San Andrés con habitaciones temáticas inspiradas en la cultura reggae local.',
  'Guest house boutique con temática reggae en San Andrés',
  '{"city": "San Andrés", "street": "Av. Colombia #12-34", "country": "Colombia", "department": "San Andrés y Providencia", "postal_code": "880001", "neighborhood": "El Centro"}',
  '{"email": "info@simmerdown.house", "phone": "+57 8 512-3456", "website": "https://simmerdown.house", "whatsapp": "+57 300-123-4567"}',
  '15:00:00',
  '12:00:00',
  '{"pets": "No permitidas", "smoking": "Permitido solo en áreas designadas", "check_in": "15:00", "children": "Bienvenidos mayores de 12 años", "check_out": "12:00", "cancellation": "24 horas antes sin costo"}',
  '["WiFi gratuito", "Aire acondicionado", "Terraza con vista al mar", "Jardín tropical", "Música reggae ambiente", "Zona de relajación", "Servicio de información turística", "Alquiler de bicicletas"]',
  NULL,
  'SimmerDown Guest House es una acomodación boutique única en San Andrés que combina el espíritu relajado del reggae con la belleza natural del Caribe colombiano.',
  'Experimenta San Andrés de forma única en SimmerDown Guest House. Habitaciones temáticas reggae, terraza con vista al mar, jardín tropical.',
  'Check-in: 15:00, Check-out: 12:00. Cancelación gratuita hasta 24h antes. Fumadores en áreas designadas. Solo mayores de 12 años.',
  '[]',
  'active',
  '2025-09-24 18:28:24.378473+00',
  '2025-09-24 18:40:06.545369+00'
),
(
  '3737a3d1-2197-4297-a326-86454db072ec',
  '2263efba-b62b-417b-a422-a84638bc632f',
  'Tu Casa en el Mar',
  'Hotel boutique en el centro de San Andrés, a 2 cuadras de la playa de Sprat Bight.',
  'Hotel boutique céntrico a 2 cuadras de Sprat Bight',
  '{"city": "San Andrés", "street": "Centro", "country": "Colombia", "department": "San Andrés y Providencia", "postal_code": "880001", "neighborhood": "Centro"}',
  '{"email": "info@tucasaenelmar.com", "phone": "+57 8 512-0000", "website": "https://tucasaenelmar.com", "whatsapp": "+57 300-000-0000"}',
  '15:00:00',
  '12:00:00',
  '{"pets": "No permitidas", "smoking": "No permitido", "check_in": "15:00", "children": "Bienvenidos", "check_out": "12:00", "cancellation": "Según políticas"}',
  '["WiFi gratuito", "Aire acondicionado", "Cocinas equipadas", "Acceso electrónico sin llaves", "Cajillas de seguridad", "Ventanas acústicas"]',
  NULL,
  NULL,
  NULL,
  NULL,
  '[]',
  'active',
  '2025-10-11 18:17:25.701877+00',
  '2025-10-11 18:17:25.701877+00'
),
(
  'c1ca871e-c34e-4532-90fa-88f132e7221b',
  '03d2ae98-06f1-407b-992b-ca809dfc333b',
  'Casa Boutique los Cedros',
  'Hotel principal de Casa Boutique los Cedros',
  NULL,
  NULL,
  '{"email": "tarek.oneill@gmail.com", "phone": "+573157706348"}',
  '15:00:00',
  '12:00:00',
  NULL,
  '[]',
  NULL,
  NULL,
  NULL,
  NULL,
  '[]',
  'active',
  '2025-10-19 00:27:22.696714+00',
  '2025-10-19 00:27:22.696714+00'
);

-- Insert staff_users (6 records)
-- NOTE: Password hashes are test data (all use bcrypt hash of 'password123')
INSERT INTO staff_users (
  staff_id, tenant_id, role, username, password_hash, full_name, email, phone,
  permissions, is_active, last_login_at, created_at, updated_at, created_by
) VALUES
(
  '4c16fa0a-c4f9-408e-8a43-5d8eaceb7a00',
  'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
  'housekeeper',
  'housekeeping_maria',
  '$2b$10$PWTpCbHcXMikuA/gq.cSDOwYecyrizh2xf3H0moPtmH.62izZNlyS',
  'María Rodríguez (Housekeeping)',
  NULL,
  '+57 300 123 4567',
  '{"admin_panel": false, "sire_access": true, "reports_access": false, "modify_operations": false}',
  true,
  '2025-10-17 20:06:23.735+00',
  '2025-10-01 03:52:57.782617+00',
  '2025-10-01 06:11:46.55564+00',
  'ed0b94df-18d1-4f98-b9b3-69667a7226fc'
),
(
  'ed0b94df-18d1-4f98-b9b3-69667a7226fc',
  'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
  'ceo',
  'admin_ceo',
  '$2b$10$PWTpCbHcXMikuA/gq.cSDOwYecyrizh2xf3H0moPtmH.62izZNlyS',
  'Carlos Ospina (CEO)',
  'carlos@simmerdown.com',
  NULL,
  '{"admin_panel": true, "sire_access": true, "reports_access": true, "modify_operations": true}',
  true,
  '2025-11-01 03:18:10.014+00',
  '2025-10-01 03:52:57.782617+00',
  '2025-10-01 06:11:46.55564+00',
  NULL
),
(
  'f92c1c7d-5987-433e-b334-531fb2cc54ca',
  'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
  'admin',
  'admin_simmer',
  '$2b$10$PWTpCbHcXMikuA/gq.cSDOwYecyrizh2xf3H0moPtmH.62izZNlyS',
  'Laura Martínez (Admin)',
  'laura@simmerdown.com',
  NULL,
  '{"admin_panel": true, "sire_access": true, "reports_access": true, "modify_operations": false}',
  true,
  '2025-10-31 01:57:29.551+00',
  '2025-10-01 03:52:57.782617+00',
  '2025-10-01 06:11:46.55564+00',
  'ed0b94df-18d1-4f98-b9b3-69667a7226fc'
),
(
  '83d866a5-e385-4758-9921-63f1f15e371e',
  'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
  'admin',
  'test_admin',
  '$2b$10$kDlG/7lZ//MFJXNEJY/HR.21YeCoS5t2zm3cr9dELuFbxngu5gdhy',
  'Test Admin (Testing)',
  NULL,
  NULL,
  '{"admin_panel": true, "sire_access": true, "reports_access": true, "modify_operations": true}',
  true,
  '2025-10-09 22:07:25.208+00',
  '2025-10-09 21:53:07.526177+00',
  '2025-10-09 21:53:07.526177+00',
  NULL
),
(
  'e095212f-4688-42d6-8305-dc34c34e1ac6',
  '2263efba-b62b-417b-a422-a84638bc632f',
  'ceo',
  'Heidy',
  '$2b$10$mEohiznQBFlBH5oROvzyXuLTu3zGVaQuQRHLylfeudMCSTSpblqyG',
  'Heidy - CEO',
  NULL,
  NULL,
  '{"admin_panel": true, "sire_access": true, "reports_access": true, "modify_operations": true}',
  true,
  '2025-10-23 18:11:43.652+00',
  '2025-10-18 01:13:14.046304+00',
  '2025-10-18 01:16:36.850564+00',
  NULL
),
(
  '470cc6bd-9ecd-4c82-a7e7-84a456a8f8ac',
  '03d2ae98-06f1-407b-992b-ca809dfc333b',
  'admin',
  'diabli',
  '$2b$10$di0AmPz4Qt5xz.AHrpt2Yu8dLp7GZCKQ/hDftoo184IighmqoYjWe',
  'Diablito',
  'tarek.oneill@gmail.com',
  NULL,
  '{"admin_panel": true, "sire_access": true, "reports_access": true, "modify_operations": true}',
  true,
  '2025-10-21 05:27:54.651+00',
  '2025-10-19 00:27:23.05994+00',
  '2025-10-19 00:27:23.05994+00',
  NULL
);

-- Insert accommodation_units (2 records)
INSERT INTO accommodation_units (
  id, hotel_id, motopress_type_id, motopress_instance_id, name, unit_number,
  description, short_description, unit_type, capacity, bed_configuration,
  size_m2, floor_number, view_type, tourism_features, booking_policies,
  unique_features, accessibility_features, location_details, is_featured,
  display_order, status, images, tenant_id, accommodation_type_id,
  created_at, updated_at
) VALUES
(
  'c6cbd49b-6bd1-4d30-92b1-cf3b695fc2d0',
  '238845ed-8c5b-4d33-9866-bb4e706b90b2',
  NULL,
  NULL,
  'Zimmer Heist',
  NULL,
  'Apartamento completo con 4 habitaciones en Simmer Down House',
  'Apartamento completo con 4 habitaciones en Simmer Down House',
  'apartment',
  '{"total": 8, "adults": 8, "children": 8}',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  1,
  'active',
  NULL,
  NULL,
  NULL,
  '2025-10-23 01:36:35.56543+00',
  '2025-10-23 01:36:35.56543+00'
),
(
  'da83937b-ee2d-438a-bc04-c90660225153',
  '238845ed-8c5b-4d33-9866-bb4e706b90b2',
  NULL,
  NULL,
  'Kaya',
  NULL,
  'Habitación privada Kaya dentro de Zimmer Heist',
  'Habitación privada Kaya dentro de Zimmer Heist',
  'room',
  '{"total": 2, "adults": 2, "children": 2}',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  1,
  'active',
  NULL,
  NULL,
  NULL,
  '2025-10-23 01:36:35.899844+00',
  '2025-10-23 01:36:35.899844+00'
);

-- NOTE: hotel_operations content is too large (10 records with long markdown)
-- To add hotel_operations data, run:
--   pnpm dlx tsx scripts/copy-hotel-operations.ts
-- Or manually copy from production after initial migration

SET session_replication_role = DEFAULT;

-- Migration complete
-- Next steps:
-- 1. Regenerate embeddings: pnpm dlx tsx scripts/sync-hotel-embeddings.ts
-- 2. Copy hotel_operations if needed
