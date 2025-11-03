-- =====================================================================================
-- PHASE 3a: FOUNDATION DATA MIGRATION
-- =====================================================================================
-- Generated: 2025-10-31
-- Tables: 5 foundation tables (95 total rows)
-- Order: tenant_registry → sire_countries → sire_cities → sire_document_types → user_tenant_permissions
--
-- CRITICAL NOTES:
-- 1. SIRE code 249 = USA (NOT ISO 840)
-- 2. All UUIDs preserved from production
-- 3. Sequences reset after data load
-- 4. Run AFTER schema foundation (parts 3-8)
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- TABLE: tenant_registry (3 rows)
-- =====================================================================================
-- Foundation: Core tenant configuration
-- Dependencies: None (first table in dependency chain)
-- =====================================================================================

INSERT INTO tenant_registry (
    tenant_id,
    nit,
    razon_social,
    nombre_comercial,
    schema_name,
    tenant_type,
    is_active,
    created_at,
    updated_at,
    slug,
    subscription_tier,
    features,
    subdomain,
    address,
    phone,
    email,
    social_media_links,
    seo_meta_description,
    seo_keywords,
    landing_page_content,
    logo_url,
    business_name,
    primary_color,
    chat_cta_link
) VALUES
(
    'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
    '900123456-7',
    'O`NEILL SAID S.A.S.',
    'Simmer Down Guest House',
    'tenant_simmerdown',
    'hotel',
    true,
    '2025-09-22 23:15:20.758991+00',
    '2025-10-26 15:37:29.444762+00',
    'simmerdown',
    'premium',
    '{"search_mode":"hotel","muva_match_count":0,"accommodation_search_enabled":true}',
    'simmerdown',
    'Cra 16 #3-31',
    '+573157706348',
    'facturacion@simmerdown.house',
    '{"tiktok":"","twitter":"","facebook":"","linkedin":"","instagram":"https://instagram.com/simmerdown.guest_house"}',
    'Apartamentos en San Andrés Isla a cinco minutos de la playa Spratt Bight y del letrero I ♥ San Andrés\nes el alojamiento perfecto para descansar cerca a todo',
    ARRAY['apartamentos','habitaciones privadas','mar','playa','simmer down'],
    '{"hero":{"title":"","cta_link":"/with-me","cta_text":"Get Started","subtitle":""},"about":{"title":"About Us","content":""},"contact":{"email":"","phone":"","title":"Contact Us","address":""},"gallery":{"title":"Gallery","images":[]},"services":{"items":[],"title":"Our Services"}}',
    'https://simmerdown.house/wp-content/uploads/2021/10/fav-icon-logo.png',
    'Simmer Down Guest House',
    '#3B82F6',
    '/book-now'
),
(
    '2263efba-b62b-417b-a422-a84638bc632f',
    '[PENDING_NIT]',
    'Tu Casa en el Mar S.A.S.',
    'Tu Casa en el Mar',
    'tenant_tucasamar',
    'hotel',
    true,
    '2025-10-11 17:34:33.414322+00',
    '2025-10-19 01:45:59.496881+00',
    'tucasamar',
    'basic',
    '{"muva_access":true,"search_mode":"hotel","premium_chat":false,"sire_city_code":"88001","sire_hotel_code":"[PENDING_SIRE]","muva_match_count":0,"guest_chat_enabled":true,"staff_chat_enabled":true,"accommodation_search_enabled":true}',
    'tucasamar',
    'Centro, San Andrés, Colombia (2 cuadras de Sprat Bight)',
    '+57300000000',
    'info@tucasaenelmar.com',
    '{"tiktok":"","twitter":"","facebook":"[PENDING_FACEBOOK]","linkedin":"","instagram":"[PENDING_INSTAGRAM]"}',
    'Tu Casa en el Mar - Alojamiento cómodo en el centro de San Andrés, a 2 cuadras de la playa Sprat Bight. Habitaciones y apartamentos con cocina equipada.',
    ARRAY['hotel san andres','alojamiento san andres','sprat bight','apartamento san andres','habitacion san andres','centro san andres'],
    '{"hero":{"title":"Tu Casa en el Mar","cta_link":"/chat","cta_text":"Reservar Ahora","subtitle":"Alojamiento cómodo en el corazón de San Andrés"},"about":{"title":"Sobre Nosotros","content":"Ubicados en el centro de San Andrés, a solo 2 cuadras de la playa Sprat Bight."},"contact":{"email":"info@tucasaenelmar.com","phone":"+57300000000","title":"Contáctanos","address":"Centro, San Andrés, Colombia"},"gallery":{"title":"Galería","images":[]},"services":{"items":[],"title":"Nuestras Habitaciones"}}',
    'https://tucasaenelmar.com/wp-content/uploads/2022/10/favicon2Mesa-de-trabajo-10.png',
    'Tu Casa en el Mar',
    '#7396a0',
    '/chat'
),
(
    '03d2ae98-06f1-407b-992b-ca809dfc333b',
    '900222333-5',
    'JUAN DIEGO MEJÍA',
    'Casa Boutique los Cedros',
    'tenant_loscedrosboutique',
    'hotel',
    true,
    '2025-10-19 00:27:22.486345+00',
    '2025-10-21 05:28:37.440338+00',
    'loscedrosboutique',
    'premium',
    '{"search_mode":"hotel","muva_match_count":0,"staff_chat_enabled":true,"accommodation_search_enabled":true}',
    'loscedrosboutique',
    'direccion',
    '+57 315 770 6347',
    'tarek.oneill@gmail.com',
    '{"tiktok":"","twitter":"","facebook":"","linkedin":"","instagram":""}',
    'casa los cedros 123 444',
    ARRAY['12341234'],
    '{"hero":{"title":"","cta_link":"/chat","cta_text":"Get Started","subtitle":""},"about":{"title":"About Us","content":""},"contact":{"email":"","phone":"","title":"Contact Us","address":""},"gallery":{"title":"Gallery","images":[]},"services":{"items":[],"title":"Our Services"}}',
    '',
    'Casa Boutique los Cedros',
    '#669d34',
    '/chat'
);

-- =====================================================================================
-- TABLE: sire_countries (45 rows)
-- =====================================================================================
-- Foundation: SIRE-compliant country codes for Colombian tourism reporting
-- Dependencies: None
-- CRITICAL: sire_code 249 = USA (NOT ISO 840)
-- =====================================================================================

INSERT INTO sire_countries (
    iso_code,
    name,
    name_es,
    alpha2_code,
    created_at,
    sire_code
) VALUES
('032', 'Argentina', 'Argentina', 'AR', '2025-10-09 15:49:31.365541+00', '63'),
('040', 'Austria', 'Austria', 'AT', '2025-10-09 15:49:31.365541+00', '65'),
('036', 'Australia', 'Australia', 'AU', '2025-10-09 15:49:31.365541+00', '71'),
('056', 'Belgium', 'Bélgica', 'BE', '2025-10-09 15:49:31.365541+00', '87'),
('076', 'Brazil', 'Brasil', 'BR', '2025-10-09 15:49:31.365541+00', '105'),
('124', 'Canada', 'Canadá', 'CA', '2025-10-09 15:49:31.365541+00', '139'),
('152', 'Chile', 'Chile', 'CL', '2025-10-09 15:49:31.365541+00', '155'),
('156', 'China', 'China', 'CN', '2025-10-09 15:49:31.365541+00', '157'),
('170', 'Colombia', 'Colombia', 'CO', '2025-10-09 15:49:31.365541+00', '169'),
('203', 'Czech Republic', 'República Checa', 'CZ', '2025-10-09 15:49:31.365541+00', '189'),
('410', 'South Korea', 'Corea del Sur', 'KR', '2025-10-09 15:49:31.365541+00', '190'),
('188', 'Costa Rica', 'Costa Rica', 'CR', '2025-10-09 15:49:31.365541+00', '196'),
('208', 'Denmark', 'Dinamarca', 'DK', '2025-10-09 15:49:31.365541+00', '230'),
('218', 'Ecuador', 'Ecuador', 'EC', '2025-10-09 15:49:31.365541+00', '239'),
('818', 'Egypt', 'Egipto', 'EG', '2025-10-09 15:49:31.365541+00', '240'),
('784', 'United Arab Emirates', 'Emiratos Árabes Unidos', 'AE', '2025-10-09 15:49:31.365541+00', '244'),
('724', 'Spain', 'España', 'ES', '2025-10-09 15:49:31.365541+00', '245'),
('840', 'United States', 'Estados Unidos', 'US', '2025-10-09 15:49:31.365541+00', '249'),
('246', 'Finland', 'Finlandia', 'FI', '2025-10-09 15:49:31.365541+00', '257'),
('250', 'France', 'Francia', 'FR', '2025-10-09 15:49:31.365541+00', '261'),
('276', 'Germany', 'Alemania', 'DE', '2025-10-09 15:49:31.365541+00', '293'),
('300', 'Greece', 'Grecia', 'GR', '2025-10-09 15:49:31.365541+00', '321'),
('348', 'Hungary', 'Hungría', 'HU', '2025-10-09 15:49:31.365541+00', '355'),
('356', 'India', 'India', 'IN', '2025-10-09 15:49:31.365541+00', '361'),
('376', 'Israel', 'Israel', 'IL', '2025-10-09 15:49:31.365541+00', '373'),
('380', 'Italy', 'Italia', 'IT', '2025-10-09 15:49:31.365541+00', '377'),
('372', 'Ireland', 'Irlanda', 'IE', '2025-10-09 15:49:31.365541+00', '385'),
('392', 'Japan', 'Japón', 'JP', '2025-10-09 15:49:31.365541+00', '651'),
('484', 'Mexico', 'México', 'MX', '2025-10-09 15:49:31.365541+00', '483'),
('528', 'Netherlands', 'Países Bajos', 'NL', '2025-10-09 15:49:31.365541+00', '523'),
('578', 'Norway', 'Noruega', 'NO', '2025-10-09 15:49:31.365541+00', '537'),
('554', 'New Zealand', 'Nueva Zelanda', 'NZ', '2025-10-09 15:49:31.365541+00', '545'),
('591', 'Panama', 'Panamá', 'PA', '2025-10-09 15:49:31.365541+00', '577'),
('604', 'Peru', 'Perú', 'PE', '2025-10-09 15:49:31.365541+00', '590'),
('620', 'Portugal', 'Portugal', 'PT', '2025-10-09 15:49:31.365541+00', '607'),
('616', 'Poland', 'Polonia', 'PL', '2025-10-09 15:49:31.365541+00', '613'),
('642', 'Romania', 'Rumania', 'RO', '2025-10-09 15:49:31.365541+00', '625'),
('643', 'Russia', 'Rusia', 'RU', '2025-10-09 15:49:31.365541+00', '667'),
('826', 'United Kingdom', 'Reino Unido', 'GB', '2025-10-09 15:49:31.365541+00', '673'),
('710', 'South Africa', 'Sudáfrica', 'ZA', '2025-10-09 15:49:31.365541+00', '695'),
('756', 'Switzerland', 'Suiza', 'CH', '2025-10-09 15:49:31.365541+00', '767'),
('752', 'Sweden', 'Suecia', 'SE', '2025-10-09 15:49:31.365541+00', '769'),
('792', 'Turkey', 'Turquía', 'TR', '2025-10-09 15:49:31.365541+00', '787'),
('858', 'Uruguay', 'Uruguay', 'UY', '2025-10-09 15:49:31.365541+00', '841'),
('862', 'Venezuela', 'Venezuela', 'VE', '2025-10-09 15:49:31.365541+00', '854');

-- =====================================================================================
-- TABLE: sire_cities (42 rows)
-- =====================================================================================
-- Foundation: Colombian city codes for SIRE reporting
-- Dependencies: None
-- Note: Code 88001 = San Andrés (used by multiple tenants)
-- =====================================================================================

INSERT INTO sire_cities (
    code,
    name,
    department,
    region,
    created_at
) VALUES
('05001', 'Medellín', 'Antioquia', 'Andina', '2025-10-09 15:49:31.365541+00'),
('05088', 'Bello', 'Antioquia', 'Andina', '2025-10-09 15:49:31.365541+00'),
('05266', 'Guarne', 'Antioquia', 'Andina', '2025-10-09 15:49:31.365541+00'),
('05360', 'Itagüí', 'Antioquia', 'Andina', '2025-10-09 15:49:31.365541+00'),
('08001', 'Barranquilla', 'Atlántico', 'Caribe', '2025-10-09 15:49:31.365541+00'),
('08078', 'Baranoa', 'Atlántico', 'Caribe', '2025-10-09 15:49:31.365541+00'),
('08137', 'Cartagena', 'Atlántico', 'Caribe', '2025-10-09 15:49:31.365541+00'),
('11001', 'Bogotá D.C.', 'Distrito Capital', 'Andina', '2025-10-09 15:49:31.365541+00'),
('13001', 'Cartagena', 'Bolívar', 'Caribe', '2025-10-09 15:49:31.365541+00'),
('13006', 'Arjona', 'Bolívar', 'Caribe', '2025-10-09 15:49:31.365541+00'),
('15001', 'Tunja', 'Boyacá', 'Andina', '2025-10-09 15:49:31.365541+00'),
('17001', 'Manizales', 'Caldas', 'Andina', '2025-10-09 15:49:31.365541+00'),
('18001', 'Florencia', 'Caquetá', 'Amazonía', '2025-10-09 15:49:31.365541+00'),
('19001', 'Popayán', 'Cauca', 'Andina', '2025-10-09 15:49:31.365541+00'),
('20001', 'Valledupar', 'Cesar', 'Caribe', '2025-10-09 15:49:31.365541+00'),
('23001', 'Montería', 'Córdoba', 'Caribe', '2025-10-09 15:49:31.365541+00'),
('41001', 'Neiva', 'Huila', 'Andina', '2025-10-09 15:49:31.365541+00'),
('44001', 'Riohacha', 'La Guajira', 'Caribe', '2025-10-09 15:49:31.365541+00'),
('47001', 'Santa Marta', 'Magdalena', 'Caribe', '2025-10-09 15:49:31.365541+00'),
('47161', 'Ciénaga', 'Magdalena', 'Caribe', '2025-10-09 15:49:31.365541+00'),
('50001', 'Villavicencio', 'Meta', 'Orinoquía', '2025-10-09 15:49:31.365541+00'),
('52001', 'Pasto', 'Nariño', 'Andina', '2025-10-09 15:49:31.365541+00'),
('54001', 'Cúcuta', 'Norte de Santander', 'Andina', '2025-10-09 15:49:31.365541+00'),
('63001', 'Armenia', 'Quindío', 'Andina', '2025-10-09 15:49:31.365541+00'),
('66001', 'Pereira', 'Risaralda', 'Andina', '2025-10-09 15:49:31.365541+00'),
('68001', 'Bucaramanga', 'Santander', 'Andina', '2025-10-09 15:49:31.365541+00'),
('68276', 'Girón', 'Santander', 'Andina', '2025-10-09 15:49:31.365541+00'),
('68307', 'Floridablanca', 'Santander', 'Andina', '2025-10-09 15:49:31.365541+00'),
('70001', 'Sincelejo', 'Sucre', 'Caribe', '2025-10-09 15:49:31.365541+00'),
('73001', 'Ibagué', 'Tolima', 'Andina', '2025-10-09 15:49:31.365541+00'),
('76001', 'Cali', 'Valle del Cauca', 'Pacífica', '2025-10-09 15:49:31.365541+00'),
('76111', 'Buenaventura', 'Valle del Cauca', 'Pacífica', '2025-10-09 15:49:31.365541+00'),
('76520', 'Palmira', 'Valle del Cauca', 'Pacífica', '2025-10-09 15:49:31.365541+00'),
('81001', 'Arauca', 'Arauca', 'Orinoquía', '2025-10-09 15:49:31.365541+00'),
('85001', 'Yopal', 'Casanare', 'Orinoquía', '2025-10-09 15:49:31.365541+00'),
('86001', 'Mocoa', 'Putumayo', 'Amazonía', '2025-10-09 15:49:31.365541+00'),
('88001', 'San Andrés', 'San Andrés y Providencia', 'Insular', '2025-10-09 15:49:31.365541+00'),
('91001', 'Leticia', 'Amazonas', 'Amazonía', '2025-10-09 15:49:31.365541+00'),
('94001', 'Inírida', 'Guainía', 'Amazonía', '2025-10-09 15:49:31.365541+00'),
('95001', 'San José del Guaviare', 'Guaviare', 'Amazonía', '2025-10-09 15:49:31.365541+00'),
('97001', 'Mitú', 'Vaupés', 'Amazonía', '2025-10-09 15:49:31.365541+00'),
('99001', 'Puerto Carreño', 'Vichada', 'Orinoquía', '2025-10-09 15:49:31.365541+00');

-- =====================================================================================
-- TABLE: sire_document_types (4 rows)
-- =====================================================================================
-- Foundation: Document types for SIRE guest identification
-- Dependencies: None
-- =====================================================================================

INSERT INTO sire_document_types (
    code,
    name,
    description,
    created_at
) VALUES
('5', 'Cédula de Ciudadanía', 'Documento de identidad colombiano', '2025-10-09 15:49:31.365541+00'),
('3', 'Pasaporte', 'Pasaporte internacional', '2025-10-09 15:49:31.365541+00'),
('10', 'PEP', 'Permiso Especial de Permanencia', '2025-10-09 15:49:31.365541+00'),
('46', 'Permiso de Ingreso y Permanencia', 'Permiso migratorio especial', '2025-10-09 15:49:31.365541+00');

-- =====================================================================================
-- TABLE: user_tenant_permissions (1 row)
-- =====================================================================================
-- Foundation: Admin permission for primary tenant (simmerdown)
-- Dependencies: tenant_registry
-- =====================================================================================

INSERT INTO user_tenant_permissions (
    id,
    user_id,
    tenant_id,
    role,
    permissions,
    granted_by,
    granted_at,
    expires_at,
    is_active,
    created_at,
    updated_at
) VALUES (
    '4b66e97f-a33f-4428-9bca-9568b6618f4f',
    '78270dc1-8145-4d03-9d71-ac597c2a75ed',
    'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
    'admin',
    '{"muva_access":true,"sire_access":true}',
    NULL,
    '2025-09-22 23:40:20.216055+00',
    NULL,
    true,
    '2025-09-22 22:02:58.267328+00',
    '2025-09-22 22:02:58.267328+00'
);

-- =====================================================================================
-- SEQUENCE RESETS
-- =====================================================================================
-- Reset sequences to prevent ID conflicts in future inserts
-- Note: Only applies to tables with SERIAL columns (none in this phase)
-- =====================================================================================

-- No sequences to reset (all tables use UUIDs or fixed codes)

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================
-- Run these queries to verify data integrity:
--
-- SELECT COUNT(*) FROM tenant_registry;           -- Expected: 3
-- SELECT COUNT(*) FROM sire_countries;            -- Expected: 45
-- SELECT COUNT(*) FROM sire_cities;               -- Expected: 42
-- SELECT COUNT(*) FROM sire_document_types;       -- Expected: 4
-- SELECT COUNT(*) FROM user_tenant_permissions;   -- Expected: 1
--
-- Total: 95 rows
--
-- Verify SIRE USA code:
-- SELECT sire_code, name FROM sire_countries WHERE alpha2_code = 'US';
-- Expected: sire_code = '249' (NOT 840)
-- =====================================================================================

COMMIT;

-- =====================================================================================
-- END PHASE 3a: FOUNDATION DATA MIGRATION
-- =====================================================================================
-- Next: Phase 3b (parts 10-14) - Remaining operational data
-- =====================================================================================
