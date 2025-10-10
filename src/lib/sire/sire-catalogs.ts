/**
 * SIRE Catalogs Integration
 *
 * This module provides helpers to access official SIRE country codes and
 * Colombian DIVIPOLA city codes using fuzzy search for robust matching.
 *
 * ⚠️ CRITICAL: SIRE codes are NOT ISO 3166-1 codes!
 * - USA: SIRE 249 (NOT ISO 840)
 * - Colombia: SIRE 169 (NOT ISO 170)
 * - Brasil: SIRE 105 (NOT ISO 076)
 *
 * Data Sources:
 * - `_assets/sire/codigos-pais.json` - 250 official SIRE country codes
 * - `_assets/sire/ciudades-colombia.json` - 1,122 DIVIPOLA city codes
 *
 * @see docs/sire/CODIGOS_OFICIALES.md - Official SIRE specification
 * @see docs/sire/CODIGOS_SIRE_VS_ISO.md - Differences between SIRE and ISO codes
 */

import countryCatalog from '../../../_assets/sire/codigos-pais.json';
import cityCatalog from '../../../_assets/sire/ciudades-colombia.json';
import Fuse from 'fuse.js';

// ============================================================================
// FUSE.JS INSTANCES (Fuzzy Search)
// ============================================================================

/**
 * Fuse.js instance for country fuzzy search
 *
 * Config:
 * - threshold: 0.3 (70% similarity required)
 * - ignoreLocation: true (match anywhere in string)
 */
const countryFuse = new Fuse(countryCatalog, {
  keys: ['nombre'],
  threshold: 0.3, // 70% similarity required
  ignoreLocation: true
});

/**
 * Fuse.js instance for Colombian city fuzzy search
 *
 * Config:
 * - threshold: 0.3 (70% similarity required)
 * - ignoreLocation: true (match anywhere in string)
 */
const cityFuse = new Fuse(cityCatalog, {
  keys: ['ciudad'],
  threshold: 0.3,
  ignoreLocation: true
});

// ============================================================================
// PUBLIC HELPERS
// ============================================================================

/**
 * Get SIRE country code from country name (Spanish)
 *
 * Uses fuzzy search to handle:
 * - Accents: "España" vs "Espana"
 * - Case: "COLOMBIA" vs "colombia"
 * - Typos: "Estados Unidso" → "Estados Unidos"
 *
 * ⚠️ RETURNS SIRE CODES (NOT ISO 3166-1):
 * - USA: "249" (NOT "840")
 * - Colombia: "169" (NOT "170")
 * - Brasil: "105" (NOT "076")
 *
 * @param countryName - Country name in Spanish (e.g., "Estados Unidos", "españa")
 * @returns SIRE country code (1-3 digits) or null if not found
 *
 * @example
 * getSIRECountryCode("Estados Unidos") // "249" ✅ (NOT ISO 840 ❌)
 * getSIRECountryCode("estados unidos") // "249" (case insensitive)
 * getSIRECountryCode("COLOMBIA") // "169" ✅ (NOT ISO 170 ❌)
 * getSIRECountryCode("España") // "245" ✅ (NOT ISO 724 ❌)
 * getSIRECountryCode("NARNIA") // null (not found)
 */
export function getSIRECountryCode(countryName: string): string | null {
  const results = countryFuse.search(countryName.trim());

  if (results.length === 0) {
    console.warn('[sire-catalogs] Country not found:', countryName);
    return null;
  }

  const match = results[0].item;
  console.log('[sire-catalogs] Country match:', {
    input: countryName,
    matched: match.nombre,
    code: match.codigo,
  });

  return match.codigo;
}

/**
 * Get DIVIPOLA city code from city name (Colombian cities only)
 *
 * Uses fuzzy search to handle:
 * - Accents: "Bogotá" vs "Bogota"
 * - Case: "MEDELLÍN" vs "medellín"
 * - Typos: "Medelin" → "Medellín"
 *
 * Covers 1,122 Colombian cities with official DIVIPOLA codes (5 digits).
 *
 * @param cityName - City name in Spanish (e.g., "Bogotá", "Medellin")
 * @returns DIVIPOLA city code (5 digits) or null if not found
 *
 * @example
 * getDIVIPOLACityCode("Bogotá") // "11001"
 * getDIVIPOLACityCode("Bogota") // "11001" (accent insensitive)
 * getDIVIPOLACityCode("MEDELLÍN") // "5001" (case insensitive)
 * getDIVIPOLACityCode("San Andrés") // "88001"
 * getDIVIPOLACityCode("Pereira") // "66001" (secondary city)
 * getDIVIPOLACityCode("Unknown City") // null (not found)
 */
export function getDIVIPOLACityCode(cityName: string): string | null {
  const results = cityFuse.search(cityName.trim());

  if (results.length === 0) {
    console.warn('[sire-catalogs] City not found:', cityName);
    return null;
  }

  const match = results[0].item;
  console.log('[sire-catalogs] City match:', {
    input: cityName,
    matched: match.ciudad,
    code: match.codigo,
  });

  return match.codigo;
}

/**
 * Format Date object or YYYY-MM-DD string to SIRE format (dd/mm/yyyy)
 *
 * Used when retrieving dates from database (PostgreSQL DATE type stores as YYYY-MM-DD)
 * and generating TXT files (SIRE requires dd/mm/yyyy).
 *
 * Conversion:
 * - Database: YYYY-MM-DD (ISO 8601)
 * - SIRE TXT: dd/mm/yyyy (European format)
 *
 * @param date - Date object or ISO date string (YYYY-MM-DD)
 * @returns SIRE formatted date (dd/mm/yyyy)
 *
 * @example
 * formatDateToSIRE(new Date("1985-03-25")) // "25/03/1985"
 * formatDateToSIRE("2025-10-09") // "09/10/2025"
 * formatDateToSIRE("1990-05-15") // "15/05/1990"
 *
 * @example Usage in API
 * const reservation = await getReservation(id);
 * const sireData = {
 *   // ...
 *   fecha_movimiento: formatDateToSIRE(reservation.movement_date), // DB Date → dd/mm/yyyy
 *   fecha_nacimiento: formatDateToSIRE(reservation.birth_date),    // DB Date → dd/mm/yyyy
 * };
 * const txt = generateSIRETXT(sireData);
 */
export function formatDateToSIRE(date: Date | string): string {
  let d: Date;

  if (typeof date === 'string') {
    // Handle YYYY-MM-DD string (avoid timezone issues)
    const [year, month, day] = date.split('-').map(Number);
    d = new Date(year, month - 1, day);
  } else {
    d = date;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`; // dd/mm/yyyy
}

/**
 * Helper for debugging: Format SIRE/DIVIPOLA code to human-readable location
 *
 * Useful for:
 * - Console logging during development
 * - Error messages with context
 * - Debugging TXT generation
 *
 * @param code - SIRE country code or DIVIPOLA city code
 * @returns Formatted string with code and location name
 *
 * @example
 * formatLocation("11001") // "11001 - BOGOTÁ"
 * formatLocation("249") // "249 - ESTADOS UNIDOS"
 * formatLocation("88001") // "88001 - SAN ANDRÉS"
 * formatLocation("999") // "999" (unknown code)
 *
 * @example Usage in logs
 * console.log('[compliance] Procedencia:', formatLocation(sireData.lugar_procedencia));
 * // Output: [compliance] Procedencia: 11001 - BOGOTÁ
 */
export function formatLocation(code: string): string {
  // Try city first (5-6 digits)
  const city = cityCatalog.find((c) => c.codigo === code);
  if (city) return `${code} - ${city.ciudad}`;

  // Try country (1-3 digits)
  const country = countryCatalog.find((c) => c.codigo === code);
  if (country) return `${code} - ${country.nombre}`;

  return code; // Unknown code
}
