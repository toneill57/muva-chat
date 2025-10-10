/**
 * SIRE Data Formatters
 *
 * Helper functions to format SIRE compliance data for display in UI components.
 * Converts SIRE codes to human-readable names using official catalogs via API.
 *
 * Purpose: ComplianceReminder, ComplianceConfirmation, ComplianceSuccess components
 * FASE: 11.2 - UI Layer Integration
 */

// ============================================================================
// API LOOKUP HELPER
// ============================================================================

async function sireLookup(
  type: 'document_type' | 'country' | 'city',
  code: string
): Promise<any> {
  try {
    const response = await fetch(`/api/sire/lookup?type=${type}&code=${code}`);
    if (!response.ok) {
      console.warn(`[sireLookup] Failed for ${type} ${code}: ${response.status}`);
      return null;
    }
    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error(`[sireLookup] Error for ${type} ${code}:`, error);
    return null;
  }
}

// ============================================================================
// CATALOG FORMATTERS (API Lookups)
// ============================================================================

/**
 * Format document type code to human-readable name
 *
 * @param code - SIRE document type code (e.g., "3", "5", "10", "46")
 * @returns Formatted string: "3 - Pasaporte"
 *
 * @example
 * formatDocumentType("3") // Returns: "3 - Pasaporte"
 * formatDocumentType("5") // Returns: "5 - Cédula de ciudadanía"
 */
export async function formatDocumentType(code: string): Promise<string> {
  const data = await sireLookup('document_type', code);
  if (!data) return `${code} - Desconocido`;
  return `${data.code} - ${data.name}`;
}

/**
 * Format nationality code to human-readable country name
 *
 * @param code - SIRE country code (e.g., "249", "169")
 * @returns Formatted string: "249 - Estados Unidos"
 *
 * @example
 * formatNationality("249") // Returns: "249 - Estados Unidos"
 * formatNationality("169") // Returns: "169 - Colombia"
 */
export async function formatNationality(code: string): Promise<string> {
  const data = await sireLookup('country', code);
  if (!data) return `${code} - Desconocido`;
  return `${data.sire_code} - ${data.name_es}`;
}

/**
 * Format origin code (country or city) to human-readable name
 *
 * @param code - SIRE country code (3 digits) or DIVIPOLA city code (5 digits)
 * @returns Formatted string: "249 - Estados Unidos" or "11001 - Bogotá D.C."
 *
 * @example
 * formatOrigin("249") // Returns: "249 - Estados Unidos"
 * formatOrigin("11001") // Returns: "11001 - Bogotá D.C."
 */
export async function formatOrigin(code: string): Promise<string> {
  // First try city (5 digits)
  if (code.length === 5) {
    const cityData = await sireLookup('city', code);
    if (cityData) {
      return `${cityData.code} - ${cityData.name}`;
    }
  }

  // Fallback to country (3 digits)
  const countryData = await sireLookup('country', code);
  if (countryData) {
    return `${countryData.sire_code} - ${countryData.name_es}`;
  }

  return `${code} - Desconocido`;
}

/**
 * Format destination code (city) to human-readable name
 *
 * @param code - DIVIPOLA city code (5 digits)
 * @returns Formatted string: "11001 - Bogotá D.C."
 *
 * @example
 * formatDestination("11001") // Returns: "11001 - Bogotá D.C."
 * formatDestination("88001") // Returns: "88001 - San Andrés"
 */
export async function formatDestination(code: string): Promise<string> {
  const data = await sireLookup('city', code);
  if (!data) return `${code} - Desconocido`;
  return `${data.code} - ${data.name}`;
}

/**
 * Format hotel SIRE code (no lookup needed, just display)
 *
 * @param code - Hotel SCH code (e.g., "12345")
 * @returns Formatted string: "12345"
 *
 * @example
 * formatHotelCode("12345") // Returns: "12345"
 */
export function formatHotelCode(code: string): string {
  return code;
}

/**
 * Format hotel city code to human-readable name
 *
 * @param code - DIVIPOLA city code (5-6 digits)
 * @returns Formatted string: "88001 - San Andrés"
 *
 * @example
 * formatHotelCity("88001") // Returns: "88001 - San Andrés"
 */
export async function formatHotelCity(code: string): Promise<string> {
  const data = await sireLookup('city', code);
  if (!data) return `${code} - Desconocido`;
  return `${data.code} - ${data.name}`;
}

/**
 * Format movement type to human-readable text
 *
 * @param type - Movement type ('E' or 'S')
 * @returns Formatted string: "Entrada (Check-in)" or "Salida (Check-out)"
 *
 * @example
 * formatMovementType("E") // Returns: "Entrada (Check-in)"
 * formatMovementType("S") // Returns: "Salida (Check-out)"
 */
export function formatMovementType(type: string): string {
  if (type === 'E') return 'Entrada (Check-in)';
  if (type === 'S') return 'Salida (Check-out)';
  return type;
}

/**
 * Format movement date to human-readable format (DD/MM/YYYY)
 * Uses the existing formatDate function for consistency
 *
 * @param isoDate - ISO date string (e.g., "2025-10-09")
 * @returns Formatted string: "09/10/2025"
 *
 * @example
 * formatMovementDate("2025-10-09") // Returns: "09/10/2025"
 */
export function formatMovementDate(isoDate: string): string {
  return formatDate(isoDate);
}

// ============================================================================
// DATE FORMATTERS
// ============================================================================

/**
 * Format ISO date (YYYY-MM-DD) to human-readable format (DD/MM/YYYY)
 *
 * @param isoDate - ISO date string (e.g., "1990-05-15")
 * @returns Formatted string: "15/05/1990"
 *
 * @example
 * formatDate("1990-05-15") // Returns: "15/05/1990"
 * formatDate("2025-10-07") // Returns: "07/10/2025"
 */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

// ============================================================================
// PROGRESS CALCULATION
// ============================================================================

/**
 * Calculate compliance progress from guest reservation SIRE fields
 *
 * Checks all 13 mandatory SIRE fields (segundo_apellido is optional, so 12 required + 1 optional).
 *
 * @param reservation - Guest reservation with SIRE fields
 * @returns Object with completedFields count and progressPercentage (0-100)
 *
 * @example
 * calculateComplianceProgress({
 *   hotel_sire_code: "12345",
 *   hotel_city_code: "88001",
 *   document_type: "3",
 *   document_number: "AB123456",
 *   nationality_code: "840",
 *   first_surname: "GARCIA",
 *   second_surname: null, // Optional
 *   given_names: "JUAN",
 *   movement_type: "E",
 *   movement_date: "2025-10-09",
 *   origin_country_code: "840",
 *   destination_country_code: "11001",
 *   birth_date: "1990-05-15"
 * }) // Returns: { completedFields: 12, progressPercentage: 92 }
 */
export interface SIREComplianceFields {
  hotel_sire_code: string | null;
  hotel_city_code: string | null;
  document_type: string | null;
  document_number: string | null;
  nationality_code: string | null;
  first_surname: string | null;
  second_surname: string | null;
  given_names: string | null;
  movement_type: string | null;
  movement_date: string | null;
  origin_country_code: string | null;
  destination_country_code: string | null;
  birth_date: string | null;
}

export function calculateComplianceProgress(
  reservation: Partial<SIREComplianceFields>
): { completedFields: number; progressPercentage: number } {
  // All 13 SIRE fields (segundo_apellido is optional but still counted)
  const sireFields = [
    reservation.hotel_sire_code,
    reservation.hotel_city_code,
    reservation.document_type,
    reservation.document_number,
    reservation.nationality_code,
    reservation.first_surname,
    reservation.second_surname, // Optional but counted
    reservation.given_names,
    reservation.movement_type,
    reservation.movement_date,
    reservation.origin_country_code,
    reservation.destination_country_code,
    reservation.birth_date,
  ];

  // Count non-null and non-empty fields
  const completedFields = sireFields.filter(
    (field) => field !== null && field !== ''
  ).length;

  // Progress percentage (13 total fields)
  const progressPercentage = Math.round((completedFields / 13) * 100);

  return { completedFields, progressPercentage };
}
