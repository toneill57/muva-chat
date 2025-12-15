/**
 * SIRE Type Converters
 *
 * Converts between user-friendly formats (chat/UI) and SIRE-compliant codes.
 * Bridges the gap between FASE 1-2 (capture) and FASE 3 (TXT generation).
 */

// ============================================================================
// DOCUMENT TYPE CONVERSION
// ============================================================================

/**
 * Map user-friendly document type names to SIRE codes
 */
export const DOCUMENT_TYPE_TO_SIRE: Record<string, string> = {
  // English
  passport: '3',
  'foreign id': '5',
  'cedula extranjeria': '5',
  diplomatic: '46',
  mercosur: '10',
  can: '10',

  // Spanish
  pasaporte: '3',
  'cédula de extranjería': '5',
  'cedula de extranjeria': '5',
  'carné diplomático': '46',
  'carne diplomatico': '46',
  diplomático: '46',
  diplomatico: '46',

  // Direct codes (already SIRE format)
  '3': '3',
  '5': '5',
  '10': '10',
  '46': '46',
} as const;

/**
 * Map SIRE codes to display names (Spanish)
 */
export const SIRE_TO_DOCUMENT_NAME: Record<string, string> = {
  '3': 'Pasaporte',
  '5': 'Cédula de Extranjería',
  '10': 'Documento Mercosur/CAN',
  '46': 'Carné Diplomático',
};

/**
 * Valid SIRE document type codes
 */
export const VALID_DOCUMENT_TYPES = ['3', '5', '10', '46'] as const;
export type SIREDocumentType = (typeof VALID_DOCUMENT_TYPES)[number];

/**
 * Convert user input to SIRE document type code
 *
 * @param input - User input (e.g., 'passport', 'pasaporte', '3')
 * @returns SIRE code ('3', '5', '10', '46') or null if invalid
 */
export function convertDocumentType(input: string | null | undefined): string | null {
  if (!input) return null;

  const normalized = input.toLowerCase().trim();
  const sireCode = DOCUMENT_TYPE_TO_SIRE[normalized];

  if (sireCode && VALID_DOCUMENT_TYPES.includes(sireCode as SIREDocumentType)) {
    return sireCode;
  }

  return null;
}

/**
 * Check if a value is a valid SIRE document type code
 */
export function isValidDocumentType(value: string | null | undefined): boolean {
  if (!value) return false;
  return VALID_DOCUMENT_TYPES.includes(value as SIREDocumentType);
}

// ============================================================================
// DATE CONVERSION
// ============================================================================

/**
 * Date format patterns
 */
const DATE_PATTERNS = {
  // DD/MM/YYYY (SIRE format)
  SIRE: /^(\d{2})\/(\d{2})\/(\d{4})$/,
  // YYYY-MM-DD (ISO format)
  ISO: /^(\d{4})-(\d{2})-(\d{2})$/,
  // DD-MM-YYYY
  DASHED: /^(\d{2})-(\d{2})-(\d{4})$/,
};

/**
 * Convert any date format to ISO (YYYY-MM-DD) for database storage
 *
 * @param input - Date in various formats (DD/MM/YYYY, YYYY-MM-DD, Date object)
 * @returns ISO date string (YYYY-MM-DD) or null if invalid
 */
export function convertToISODate(input: string | Date | null | undefined): string | null {
  if (!input) return null;

  // Already a Date object
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return formatDateToISO(input);
  }

  const str = input.trim();

  // Already ISO format
  const isoMatch = str.match(DATE_PATTERNS.ISO);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    if (isValidDate(parseInt(year), parseInt(month), parseInt(day))) {
      return str;
    }
    return null;
  }

  // SIRE format (DD/MM/YYYY)
  const sireMatch = str.match(DATE_PATTERNS.SIRE);
  if (sireMatch) {
    const [, day, month, year] = sireMatch;
    if (isValidDate(parseInt(year), parseInt(month), parseInt(day))) {
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  // Dashed format (DD-MM-YYYY)
  const dashedMatch = str.match(DATE_PATTERNS.DASHED);
  if (dashedMatch) {
    const [, day, month, year] = dashedMatch;
    if (isValidDate(parseInt(year), parseInt(month), parseInt(day))) {
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  return null;
}

/**
 * Convert any date format to SIRE format (DD/MM/YYYY)
 *
 * @param input - Date in various formats
 * @returns SIRE date string (DD/MM/YYYY) or null if invalid
 */
export function convertToSIREDate(input: string | Date | null | undefined): string | null {
  if (!input) return null;

  // Already a Date object
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return formatDateToSIRE(input);
  }

  const str = input.trim();

  // Already SIRE format
  const sireMatch = str.match(DATE_PATTERNS.SIRE);
  if (sireMatch) {
    const [, day, month, year] = sireMatch;
    if (isValidDate(parseInt(year), parseInt(month), parseInt(day))) {
      return str;
    }
    return null;
  }

  // ISO format (YYYY-MM-DD)
  const isoMatch = str.match(DATE_PATTERNS.ISO);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    if (isValidDate(parseInt(year), parseInt(month), parseInt(day))) {
      return `${day}/${month}/${year}`;
    }
    return null;
  }

  // Dashed format (DD-MM-YYYY)
  const dashedMatch = str.match(DATE_PATTERNS.DASHED);
  if (dashedMatch) {
    const [, day, month, year] = dashedMatch;
    if (isValidDate(parseInt(year), parseInt(month), parseInt(day))) {
      return `${day}/${month}/${year}`;
    }
    return null;
  }

  return null;
}

/**
 * Format Date object to ISO string (YYYY-MM-DD)
 */
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format Date object to SIRE string (DD/MM/YYYY)
 */
function formatDateToSIRE(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

/**
 * Validate date components
 */
function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;

  // Check days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return false;

  return true;
}

// ============================================================================
// TEXT FIELD NORMALIZATION
// ============================================================================

/**
 * Normalize text field for SIRE (uppercase, trim, remove invalid chars)
 *
 * @param input - Raw text input
 * @param allowEmpty - Whether empty string is valid (for second_surname)
 * @returns Normalized uppercase string or null
 */
export function normalizeTextField(
  input: string | null | undefined,
  allowEmpty: boolean = false
): string | null {
  if (input === null || input === undefined) {
    return allowEmpty ? '' : null;
  }

  const normalized = input
    .toUpperCase()
    .trim()
    .replace(/[^A-ZÁÉÍÓÚÑÜ\s]/g, '') // Keep only valid SIRE characters
    .replace(/\s+/g, ' '); // Normalize whitespace

  if (!normalized && !allowEmpty) {
    return null;
  }

  return normalized;
}

/**
 * Normalize document number (uppercase, remove hyphens/spaces)
 */
export function normalizeDocumentNumber(input: string | null | undefined): string | null {
  if (!input) return null;

  const normalized = input
    .toUpperCase()
    .trim()
    .replace(/[-\s]/g, ''); // Remove hyphens and spaces

  // Validate length (6-15 alphanumeric)
  if (!/^[A-Z0-9]{6,15}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

// ============================================================================
// GUEST TYPE DETECTION
// ============================================================================

/**
 * Valid guest types
 */
export const VALID_GUEST_TYPES = ['adult', 'child', 'infant'] as const;
export type GuestType = (typeof VALID_GUEST_TYPES)[number];

/**
 * Detect guest type from birth date
 *
 * @param birthDate - Birth date in any format
 * @param referenceDate - Reference date for age calculation (default: today)
 * @returns Guest type based on age
 */
export function detectGuestType(
  birthDate: string | Date | null | undefined,
  referenceDate: Date = new Date()
): GuestType {
  if (!birthDate) return 'adult'; // Default

  const isoDate = convertToISODate(birthDate);
  if (!isoDate) return 'adult';

  const [year, month, day] = isoDate.split('-').map(Number);
  const birth = new Date(year, month - 1, day);
  const age = calculateAge(birth, referenceDate);

  if (age < 2) return 'infant';
  if (age < 18) return 'child';
  return 'adult';
}

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate: Date, referenceDate: Date): number {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

// ============================================================================
// FULL CONVERSION HELPER
// ============================================================================

export interface ConversationalGuestData {
  // Names
  full_name?: string;
  first_surname?: string;
  second_surname?: string;
  given_names?: string;

  // Document
  document_type?: string; // 'passport', 'cedula', etc. or '3', '5', etc.
  document_number?: string;

  // Nationality & locations
  nationality_code?: string;
  origin_city_code?: string;
  destination_city_code?: string;

  // Dates
  birth_date?: string | Date;
}

export interface NormalizedGuestData {
  first_surname: string | null;
  second_surname: string | null;
  given_names: string | null;
  document_type: string | null;
  document_number: string | null;
  nationality_code: string | null;
  origin_city_code: string | null;
  destination_city_code: string | null;
  birth_date: string | null; // ISO format for DB
  guest_type: GuestType;
  guest_name: string | null; // Convenience field
}

/**
 * Convert conversational data to normalized format for DB storage
 *
 * @param data - Raw data from chat or OCR
 * @returns Normalized data ready for reservation_guests table
 */
export function normalizeGuestData(data: ConversationalGuestData): NormalizedGuestData {
  const firstName = normalizeTextField(data.first_surname);
  const secondName = normalizeTextField(data.second_surname, true); // Can be empty
  const givenNames = normalizeTextField(data.given_names);

  // Build guest_name from components
  const guestName = [givenNames, firstName, secondName].filter(Boolean).join(' ') || null;

  return {
    first_surname: firstName,
    second_surname: secondName || '',
    given_names: givenNames,
    document_type: convertDocumentType(data.document_type),
    document_number: normalizeDocumentNumber(data.document_number),
    nationality_code: data.nationality_code?.trim() || null,
    origin_city_code: data.origin_city_code?.trim() || null,
    destination_city_code: data.destination_city_code?.trim() || null,
    birth_date: convertToISODate(data.birth_date),
    guest_type: detectGuestType(data.birth_date),
    guest_name: guestName,
  };
}
