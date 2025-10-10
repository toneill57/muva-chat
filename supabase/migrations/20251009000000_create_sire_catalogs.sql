-- Migration: Create SIRE catalog tables for human-readable lookups
-- Date: October 9, 2025
-- Purpose: Support ComplianceConfirmation UI with formatted field names

-- =====================================================
-- 1. SIRE Document Types Catalog
-- =====================================================
CREATE TABLE IF NOT EXISTS sire_document_types (
  code VARCHAR(2) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sire_document_types IS 'SIRE official document type codes (3=Pasaporte, 5=Cédula, etc.)';

INSERT INTO sire_document_types (code, name, description) VALUES
  ('3', 'Pasaporte', 'Pasaporte internacional'),
  ('5', 'Cédula de Ciudadanía', 'Documento de identidad colombiano'),
  ('10', 'PEP', 'Permiso Especial de Permanencia'),
  ('46', 'Permiso de Ingreso y Permanencia', 'Permiso migratorio especial')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. SIRE Countries Catalog (ISO 3166-1 numeric)
-- =====================================================
CREATE TABLE IF NOT EXISTS sire_countries (
  iso_code VARCHAR(3) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_es VARCHAR(100),
  alpha2_code VARCHAR(2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sire_countries IS 'ISO 3166-1 numeric country codes for SIRE nationality/origin/destination';

-- Top 30 países más comunes en turismo colombiano
INSERT INTO sire_countries (iso_code, name, name_es, alpha2_code) VALUES
  ('840', 'United States', 'Estados Unidos', 'US'),
  ('076', 'Brazil', 'Brasil', 'BR'),
  ('032', 'Argentina', 'Argentina', 'AR'),
  ('484', 'Mexico', 'México', 'MX'),
  ('170', 'Colombia', 'Colombia', 'CO'),
  ('724', 'Spain', 'España', 'ES'),
  ('250', 'France', 'Francia', 'FR'),
  ('276', 'Germany', 'Alemania', 'DE'),
  ('826', 'United Kingdom', 'Reino Unido', 'GB'),
  ('380', 'Italy', 'Italia', 'IT'),
  ('124', 'Canada', 'Canadá', 'CA'),
  ('604', 'Peru', 'Perú', 'PE'),
  ('152', 'Chile', 'Chile', 'CL'),
  ('218', 'Ecuador', 'Ecuador', 'EC'),
  ('862', 'Venezuela', 'Venezuela', 'VE'),
  ('591', 'Panama', 'Panamá', 'PA'),
  ('188', 'Costa Rica', 'Costa Rica', 'CR'),
  ('858', 'Uruguay', 'Uruguay', 'UY'),
  ('528', 'Netherlands', 'Países Bajos', 'NL'),
  ('756', 'Switzerland', 'Suiza', 'CH'),
  ('056', 'Belgium', 'Bélgica', 'BE'),
  ('040', 'Austria', 'Austria', 'AT'),
  ('620', 'Portugal', 'Portugal', 'PT'),
  ('752', 'Sweden', 'Suecia', 'SE'),
  ('578', 'Norway', 'Noruega', 'NO'),
  ('208', 'Denmark', 'Dinamarca', 'DK'),
  ('246', 'Finland', 'Finlandia', 'FI'),
  ('372', 'Ireland', 'Irlanda', 'IE'),
  ('616', 'Poland', 'Polonia', 'PL'),
  ('203', 'Czech Republic', 'República Checa', 'CZ'),
  ('348', 'Hungary', 'Hungría', 'HU'),
  ('642', 'Romania', 'Rumania', 'RO'),
  ('300', 'Greece', 'Grecia', 'GR'),
  ('792', 'Turkey', 'Turquía', 'TR'),
  ('643', 'Russia', 'Rusia', 'RU'),
  ('156', 'China', 'China', 'CN'),
  ('392', 'Japan', 'Japón', 'JP'),
  ('410', 'South Korea', 'Corea del Sur', 'KR'),
  ('356', 'India', 'India', 'IN'),
  ('036', 'Australia', 'Australia', 'AU'),
  ('554', 'New Zealand', 'Nueva Zelanda', 'NZ'),
  ('710', 'South Africa', 'Sudáfrica', 'ZA'),
  ('818', 'Egypt', 'Egipto', 'EG'),
  ('376', 'Israel', 'Israel', 'IL'),
  ('784', 'United Arab Emirates', 'Emiratos Árabes Unidos', 'AE')
ON CONFLICT (iso_code) DO NOTHING;

-- =====================================================
-- 3. SIRE Cities Catalog (DIVIPOLA codes)
-- =====================================================
CREATE TABLE IF NOT EXISTS sire_cities (
  code VARCHAR(6) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  region VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sire_cities IS 'Colombian DIVIPOLA city codes for SIRE origin/destination (5-digit codes)';

-- Ciudades principales de Colombia (departamentos + capitales)
INSERT INTO sire_cities (code, name, department, region) VALUES
  -- Bogotá D.C.
  ('11001', 'Bogotá D.C.', 'Distrito Capital', 'Andina'),

  -- Antioquia
  ('05001', 'Medellín', 'Antioquia', 'Andina'),
  ('05088', 'Bello', 'Antioquia', 'Andina'),
  ('05360', 'Itagüí', 'Antioquia', 'Andina'),
  ('05266', 'Guarne', 'Antioquia', 'Andina'),

  -- Valle del Cauca
  ('76001', 'Cali', 'Valle del Cauca', 'Pacífica'),
  ('76520', 'Palmira', 'Valle del Cauca', 'Pacífica'),
  ('76111', 'Buenaventura', 'Valle del Cauca', 'Pacífica'),

  -- Atlántico
  ('08001', 'Barranquilla', 'Atlántico', 'Caribe'),
  ('08078', 'Baranoa', 'Atlántico', 'Caribe'),
  ('08137', 'Cartagena', 'Atlántico', 'Caribe'),

  -- Bolívar
  ('13001', 'Cartagena', 'Bolívar', 'Caribe'),
  ('13006', 'Arjona', 'Bolívar', 'Caribe'),

  -- Santander
  ('68001', 'Bucaramanga', 'Santander', 'Andina'),
  ('68276', 'Girón', 'Santander', 'Andina'),
  ('68307', 'Floridablanca', 'Santander', 'Andina'),

  -- Norte de Santander
  ('54001', 'Cúcuta', 'Norte de Santander', 'Andina'),

  -- Magdalena
  ('47001', 'Santa Marta', 'Magdalena', 'Caribe'),
  ('47161', 'Ciénaga', 'Magdalena', 'Caribe'),

  -- San Andrés y Providencia
  ('88001', 'San Andrés', 'San Andrés y Providencia', 'Insular'),

  -- Caldas
  ('17001', 'Manizales', 'Caldas', 'Andina'),

  -- Quindío
  ('63001', 'Armenia', 'Quindío', 'Andina'),

  -- Risaralda
  ('66001', 'Pereira', 'Risaralda', 'Andina'),

  -- Tolima
  ('73001', 'Ibagué', 'Tolima', 'Andina'),

  -- Huila
  ('41001', 'Neiva', 'Huila', 'Andina'),

  -- Meta
  ('50001', 'Villavicencio', 'Meta', 'Orinoquía'),

  -- Nariño
  ('52001', 'Pasto', 'Nariño', 'Andina'),

  -- Cauca
  ('19001', 'Popayán', 'Cauca', 'Andina'),

  -- Boyacá
  ('15001', 'Tunja', 'Boyacá', 'Andina'),

  -- Córdoba
  ('23001', 'Montería', 'Córdoba', 'Caribe'),

  -- Cesar
  ('20001', 'Valledupar', 'Cesar', 'Caribe'),

  -- La Guajira
  ('44001', 'Riohacha', 'La Guajira', 'Caribe'),

  -- Sucre
  ('70001', 'Sincelejo', 'Sucre', 'Caribe'),

  -- Casanare
  ('85001', 'Yopal', 'Casanare', 'Orinoquía'),

  -- Arauca
  ('81001', 'Arauca', 'Arauca', 'Orinoquía'),

  -- Putumayo
  ('86001', 'Mocoa', 'Putumayo', 'Amazonía'),

  -- Caquetá
  ('18001', 'Florencia', 'Caquetá', 'Amazonía'),

  -- Amazonas
  ('91001', 'Leticia', 'Amazonas', 'Amazonía'),

  -- Guainía
  ('94001', 'Inírida', 'Guainía', 'Amazonía'),

  -- Vaupés
  ('97001', 'Mitú', 'Vaupés', 'Amazonía'),

  -- Guaviare
  ('95001', 'San José del Guaviare', 'Guaviare', 'Amazonía'),

  -- Vichada
  ('99001', 'Puerto Carreño', 'Vichada', 'Orinoquía')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 4. Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sire_countries_name ON sire_countries(name);
CREATE INDEX IF NOT EXISTS idx_sire_countries_name_es ON sire_countries(name_es);
CREATE INDEX IF NOT EXISTS idx_sire_cities_name ON sire_cities(name);
CREATE INDEX IF NOT EXISTS idx_sire_cities_department ON sire_cities(department);

-- =====================================================
-- 5. Row Level Security (Optional - Public Read)
-- =====================================================
ALTER TABLE sire_document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sire_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sire_cities ENABLE ROW LEVEL SECURITY;

-- Allow public read access (catalog data is public)
CREATE POLICY "Public read access to document types"
  ON sire_document_types FOR SELECT
  USING (true);

CREATE POLICY "Public read access to countries"
  ON sire_countries FOR SELECT
  USING (true);

CREATE POLICY "Public read access to cities"
  ON sire_cities FOR SELECT
  USING (true);
