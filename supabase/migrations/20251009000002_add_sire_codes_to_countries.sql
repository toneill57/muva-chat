-- Migration: Add SIRE codes to sire_countries table
-- Date: 2025-10-09
-- Purpose: Add official SIRE country codes (different from ISO 3166-1)
-- Phase: FASE 11.2 - SIRE Compliance Corrections

-- ============================================================================
-- CONTEXT: SIRE vs ISO Country Codes
-- ============================================================================
-- SIRE (Sistema de Información y Registro de Extranjeros) uses proprietary
-- country codes that are DIFFERENT from ISO 3166-1 numeric codes.
--
-- Examples:
-- | Country       | ISO 3166-1 | SIRE Code | Difference |
-- |---------------|------------|-----------|------------|
-- | USA           | 840        | 249       | -591       |
-- | Colombia      | 170        | 169       | -1         |
-- | Brasil        | 076        | 105       | +29        |
-- | España        | 724        | 245       | -479       |
--
-- Source: _assets/sire/codigos-pais.json (250 countries with official SIRE codes)

-- ============================================================================
-- STEP 1: Add sire_code column
-- ============================================================================

ALTER TABLE public.sire_countries
  ADD COLUMN IF NOT EXISTS sire_code VARCHAR(3);

COMMENT ON COLUMN public.sire_countries.sire_code IS 'Official SIRE country code (NOT ISO 3166-1). Used for SIRE TXT export.';

-- ============================================================================
-- STEP 2: Create index for SIRE code lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sire_countries_sire_code
  ON public.sire_countries(sire_code);

-- ============================================================================
-- STEP 3: Populate SIRE codes for existing countries
-- ============================================================================
-- Source: _assets/sire/codigos-pais.json
-- Strategy: Manual mapping for top 45 countries (will run script for full 250)

UPDATE public.sire_countries SET sire_code = '249' WHERE iso_code = '840'; -- ESTADOS UNIDOS
UPDATE public.sire_countries SET sire_code = '105' WHERE iso_code = '076'; -- BRASIL
UPDATE public.sire_countries SET sire_code = '63' WHERE iso_code = '032'; -- ARGENTINA
UPDATE public.sire_countries SET sire_code = '493' WHERE iso_code = '484'; -- MEXICO
UPDATE public.sire_countries SET sire_code = '169' WHERE iso_code = '170'; -- COLOMBIA
UPDATE public.sire_countries SET sire_code = '245' WHERE iso_code = '724'; -- ESPAÑA
UPDATE public.sire_countries SET sire_code = '275' WHERE iso_code = '250'; -- FRANCIA
UPDATE public.sire_countries SET sire_code = '23' WHERE iso_code = '276'; -- ALEMANIA
UPDATE public.sire_countries SET sire_code = '628' WHERE iso_code = '826'; -- REINO UNIDO
UPDATE public.sire_countries SET sire_code = '386' WHERE iso_code = '380'; -- ITALIA
UPDATE public.sire_countries SET sire_code = '149' WHERE iso_code = '124'; -- CANADA
UPDATE public.sire_countries SET sire_code = '589' WHERE iso_code = '604'; -- PERU
UPDATE public.sire_countries SET sire_code = '211' WHERE iso_code = '152'; -- CHILE
UPDATE public.sire_countries SET sire_code = '239' WHERE iso_code = '218'; -- ECUADOR
UPDATE public.sire_countries SET sire_code = '850' WHERE iso_code = '862'; -- VENEZUELA
UPDATE public.sire_countries SET sire_code = '580' WHERE iso_code = '591'; -- PANAMA
UPDATE public.sire_countries SET sire_code = '196' WHERE iso_code = '188'; -- COSTA RICA
UPDATE public.sire_countries SET sire_code = '845' WHERE iso_code = '858'; -- URUGUAY
UPDATE public.sire_countries SET sire_code = '573' WHERE iso_code = '528'; -- PAISES BAJOS
UPDATE public.sire_countries SET sire_code = '767' WHERE iso_code = '756'; -- SUIZA
UPDATE public.sire_countries SET sire_code = '87' WHERE iso_code = '056'; -- BELGICA
UPDATE public.sire_countries SET sire_code = '72' WHERE iso_code = '040'; -- AUSTRIA
UPDATE public.sire_countries SET sire_code = '607' WHERE iso_code = '620'; -- PORTUGAL
UPDATE public.sire_countries SET sire_code = '764' WHERE iso_code = '752'; -- SUECIA
UPDATE public.sire_countries SET sire_code = '538' WHERE iso_code = '578'; -- NORUEGA
UPDATE public.sire_countries SET sire_code = '232' WHERE iso_code = '208'; -- DINAMARCA
UPDATE public.sire_countries SET sire_code = '271' WHERE iso_code = '246'; -- FINLANDIA
UPDATE public.sire_countries SET sire_code = '375' WHERE iso_code = '372'; -- IRLANDA
UPDATE public.sire_countries SET sire_code = '603' WHERE iso_code = '616'; -- POLONIA
UPDATE public.sire_countries SET sire_code = '207' WHERE iso_code = '203'; -- REPUBLICA CHECA
UPDATE public.sire_countries SET sire_code = '355' WHERE iso_code = '348'; -- HUNGRIA
UPDATE public.sire_countries SET sire_code = '670' WHERE iso_code = '642'; -- RUMANIA
UPDATE public.sire_countries SET sire_code = '301' WHERE iso_code = '300'; -- GRECIA
UPDATE public.sire_countries SET sire_code = '827' WHERE iso_code = '792'; -- TURQUIA
UPDATE public.sire_countries SET sire_code = '673' WHERE iso_code = '643'; -- RUSIA
UPDATE public.sire_countries SET sire_code = '215' WHERE iso_code = '156'; -- CHINA
UPDATE public.sire_countries SET sire_code = '399' WHERE iso_code = '392'; -- JAPON
UPDATE public.sire_countries SET sire_code = '190' WHERE iso_code = '410'; -- COREA DEL SUR
UPDATE public.sire_countries SET sire_code = '361' WHERE iso_code = '356'; -- INDIA
UPDATE public.sire_countries SET sire_code = '69' WHERE iso_code = '036'; -- AUSTRALIA
UPDATE public.sire_countries SET sire_code = '540' WHERE iso_code = '554'; -- NUEVA ZELANDA
UPDATE public.sire_countries SET sire_code = '756' WHERE iso_code = '710'; -- SUDAFRICA
UPDATE public.sire_countries SET sire_code = '240' WHERE iso_code = '818'; -- EGIPTO
UPDATE public.sire_countries SET sire_code = '383' WHERE iso_code = '376'; -- ISRAEL
UPDATE public.sire_countries SET sire_code = '244' WHERE iso_code = '784'; -- EMIRATOS ARABES UNIDOS

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next step: Run scripts/populate-sire-codes.ts to populate remaining countries
-- Total: 45/250 countries populated (top tourism countries)
-- Remaining: 205 countries to be populated by script
