/**
 * SIRE Validation Functions
 *
 * Validates guest data against official SIRE requirements before TXT export.
 * Based on: docs/features/sire-compliance/CODIGOS_OFICIALES.md
 *
 * CRITICAL: All regex patterns come from official SIRE specification.
 * Do NOT modify without verifying against official documentation.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ReservationGuest {
  id: string;
  reservation_id: string;
  tenant_id: string;
  guest_order: number;
  is_primary_guest: boolean;
  guest_type: 'adult' | 'child' | 'infant';
  guest_name: string | null;
  document_type: string | null;
  document_number: string | null;
  first_surname: string | null;
  second_surname: string | null;
  given_names: string | null;
  birth_date: Date | string | null;
  nationality_code: string | null;
  origin_city_code: string | null;
  destination_city_code: string | null;
  sire_status: 'pending' | 'complete' | 'exported';
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: string | null;
}

export interface GuestValidationResult {
  guest_id: string;
  reservation_id: string;
  guest_name: string;
  guest_order: number;
  valid: boolean;
  errors: ValidationError[];
  missingFields: string[];
  completeness: number; // 0-100 percentage
}

export interface BatchValidationResult {
  totalGuests: number;
  validGuests: number;
  invalidGuests: number;
  results: GuestValidationResult[];
}

// ============================================================================
// REGEX PATTERNS (Official SIRE Specification)
// ============================================================================

const SIRE_PATTERNS = {
  // Field 1: Hotel code - 4-6 digits
  hotelCode: /^[0-9]{4,6}$/,

  // Field 2: City code - 5-6 digits (DIVIPOLA)
  cityCode: /^[0-9]{5,6}$/,

  // Field 3: Document type - only 3, 5, 10, 46
  documentType: /^(3|5|10|46)$/,

  // Field 4: Document number - 6-15 alphanumeric, uppercase
  documentNumber: /^[A-Z0-9]{6,15}$/,

  // Field 5: Nationality code - 1-3 digits (SIRE code, NOT ISO)
  nationalityCode: /^[0-9]{1,3}$/,

  // Field 6: First surname - 1-50 letters with accents
  firstSurname: /^[A-ZÁÉÍÓÚÑÜ\s]{1,50}$/,

  // Field 7: Second surname - 0-50 letters with accents (CAN BE EMPTY)
  secondSurname: /^[A-ZÁÉÍÓÚÑÜ\s]{0,50}$/,

  // Field 8: Given names - 1-50 letters with accents
  givenNames: /^[A-ZÁÉÍÓÚÑÜ\s]{1,50}$/,

  // Field 9: Movement type - E or S only
  movementType: /^[ES]$/,

  // Field 10 & 13: Date format - dd/mm/yyyy
  dateFormat: /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/[0-9]{4}$/,

  // Fields 11 & 12: Location code - 1-6 digits (country or DIVIPOLA)
  locationCode: /^[0-9]{1,6}$/,
} as const;

// Valid document type codes
const VALID_DOCUMENT_TYPES = ['3', '5', '10', '46'] as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate a single field value against SIRE requirements
 */
export function validateField(
  fieldName: string,
  value: string | null | undefined,
  required: boolean = true
): ValidationError | null {
  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    if (required) {
      return {
        field: fieldName,
        code: 'MISSING_REQUIRED',
        message: `Campo obligatorio '${fieldName}' está vacío`,
        value: null,
      };
    }
    return null; // Optional field is empty - OK
  }

  const trimmedValue = String(value).trim();

  switch (fieldName) {
    case 'document_type':
      if (!SIRE_PATTERNS.documentType.test(trimmedValue)) {
        return {
          field: fieldName,
          code: 'INVALID_DOCUMENT_TYPE',
          message: `Tipo de documento inválido. Valores permitidos: 3 (Pasaporte), 5 (Cédula Extranjería), 10 (Mercosur), 46 (Diplomático)`,
          value: trimmedValue,
        };
      }
      break;

    case 'document_number':
      // Uppercase for validation
      const upperDocNum = trimmedValue.toUpperCase().replace(/[-\s]/g, '');
      if (!SIRE_PATTERNS.documentNumber.test(upperDocNum)) {
        return {
          field: fieldName,
          code: 'INVALID_DOCUMENT_NUMBER',
          message: `Número de documento inválido. Debe ser 6-15 caracteres alfanuméricos sin guiones ni espacios`,
          value: trimmedValue,
        };
      }
      break;

    case 'nationality_code':
      if (!SIRE_PATTERNS.nationalityCode.test(trimmedValue)) {
        return {
          field: fieldName,
          code: 'INVALID_NATIONALITY_CODE',
          message: `Código de nacionalidad inválido. Debe ser 1-3 dígitos (código SIRE, no ISO)`,
          value: trimmedValue,
        };
      }
      break;

    case 'first_surname':
      const upperFirstSurname = trimmedValue.toUpperCase();
      if (!SIRE_PATTERNS.firstSurname.test(upperFirstSurname)) {
        return {
          field: fieldName,
          code: 'INVALID_FIRST_SURNAME',
          message: `Primer apellido inválido. Solo letras (incluyendo acentos), máximo 50 caracteres`,
          value: trimmedValue,
        };
      }
      break;

    case 'second_surname':
      // Second surname CAN be empty
      if (trimmedValue !== '') {
        const upperSecondSurname = trimmedValue.toUpperCase();
        if (!SIRE_PATTERNS.secondSurname.test(upperSecondSurname)) {
          return {
            field: fieldName,
            code: 'INVALID_SECOND_SURNAME',
            message: `Segundo apellido inválido. Solo letras (incluyendo acentos), máximo 50 caracteres`,
            value: trimmedValue,
          };
        }
      }
      break;

    case 'given_names':
      const upperGivenNames = trimmedValue.toUpperCase();
      if (!SIRE_PATTERNS.givenNames.test(upperGivenNames)) {
        return {
          field: fieldName,
          code: 'INVALID_GIVEN_NAMES',
          message: `Nombre(s) inválido(s). Solo letras (incluyendo acentos), máximo 50 caracteres`,
          value: trimmedValue,
        };
      }
      break;

    case 'origin_city_code':
    case 'destination_city_code':
      if (!SIRE_PATTERNS.locationCode.test(trimmedValue)) {
        return {
          field: fieldName,
          code: 'INVALID_LOCATION_CODE',
          message: `Código de ubicación inválido. Debe ser 1-6 dígitos (código SIRE país o DIVIPOLA ciudad)`,
          value: trimmedValue,
        };
      }
      break;

    case 'birth_date':
      // If it's already in DD/MM/YYYY format, validate directly
      if (SIRE_PATTERNS.dateFormat.test(trimmedValue)) {
        // Additional validation: reasonable age
        const ageError = validateBirthDateAge(trimmedValue);
        if (ageError) return ageError;
      } else {
        // Try to parse as Date object or ISO string
        const parsed = parseToSIREDate(trimmedValue);
        if (!parsed) {
          return {
            field: fieldName,
            code: 'INVALID_DATE_FORMAT',
            message: `Fecha de nacimiento inválida. Formato esperado: DD/MM/YYYY`,
            value: trimmedValue,
          };
        }
      }
      break;
  }

  return null;
}

/**
 * Validate birth date is within reasonable age range (0-120 years)
 */
function validateBirthDateAge(dateStr: string): ValidationError | null {
  const [day, month, year] = dateStr.split('/').map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();

  if (age < 0 || age > 120) {
    return {
      field: 'birth_date',
      code: 'INVALID_AGE',
      message: `Edad inválida (${age} años). Debe estar entre 0 y 120 años`,
      value: dateStr,
    };
  }

  return null;
}

/**
 * Parse various date formats to DD/MM/YYYY string
 * Handles timezone issues by parsing YYYY-MM-DD as local date
 */
export function parseToSIREDate(value: string | Date | null): string | null {
  if (!value) return null;

  // Already in correct format
  if (typeof value === 'string' && SIRE_PATTERNS.dateFormat.test(value)) {
    return value;
  }

  let day: number, month: number, year: number;

  if (value instanceof Date) {
    day = value.getDate();
    month = value.getMonth() + 1;
    year = value.getFullYear();
  } else if (typeof value === 'string') {
    // Parse ISO format (YYYY-MM-DD) without timezone issues
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    } else {
      // Try generic Date parsing as fallback
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return null;
      }
      day = date.getDate();
      month = date.getMonth() + 1;
      year = date.getFullYear();
    }
  } else {
    return null;
  }

  // Format as DD/MM/YYYY
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

/**
 * Validate a complete guest record for SIRE export
 */
export function validateGuestForSIRE(guest: ReservationGuest): GuestValidationResult {
  const errors: ValidationError[] = [];
  const missingFields: string[] = [];

  // Required fields for SIRE (excluding hotel codes which come from tenant)
  const requiredFields = [
    'document_type',
    'document_number',
    'first_surname',
    'given_names',
    'birth_date',
    'nationality_code',
    'origin_city_code',
    'destination_city_code',
  ] as const;

  // Optional fields
  const optionalFields = ['second_surname'] as const;

  // Validate required fields
  for (const field of requiredFields) {
    const value = guest[field];
    const error = validateField(field, value as string | null, true);
    if (error) {
      errors.push(error);
      if (error.code === 'MISSING_REQUIRED') {
        missingFields.push(field);
      }
    }
  }

  // Validate optional fields
  for (const field of optionalFields) {
    const value = guest[field];
    const error = validateField(field, value as string | null, false);
    if (error) {
      errors.push(error);
    }
  }

  // Calculate completeness (required fields only)
  const completedRequired = requiredFields.filter((f) => {
    const val = guest[f];
    return val !== null && val !== undefined && val !== '';
  }).length;
  const completeness = Math.round((completedRequired / requiredFields.length) * 100);

  // Build guest name for display
  const guestName =
    guest.guest_name ||
    [guest.given_names, guest.first_surname, guest.second_surname]
      .filter(Boolean)
      .join(' ') ||
    `Guest #${guest.guest_order}`;

  return {
    guest_id: guest.id,
    reservation_id: guest.reservation_id,
    guest_name: guestName,
    guest_order: guest.guest_order,
    valid: errors.length === 0,
    errors,
    missingFields,
    completeness,
  };
}

/**
 * Validate multiple guests for batch SIRE export
 */
export function validateReservationGuests(
  guests: ReservationGuest[]
): BatchValidationResult {
  const results = guests.map((guest) => validateGuestForSIRE(guest));

  return {
    totalGuests: guests.length,
    validGuests: results.filter((r) => r.valid).length,
    invalidGuests: results.filter((r) => !r.valid).length,
    results,
  };
}

/**
 * Check if a guest has all required SIRE fields complete
 */
export function isGuestSIREComplete(guest: ReservationGuest): boolean {
  const requiredFields = [
    'document_type',
    'document_number',
    'first_surname',
    'given_names',
    'birth_date',
    'nationality_code',
    'origin_city_code',
    'destination_city_code',
  ] as const;

  return requiredFields.every((field) => {
    const value = guest[field];
    return value !== null && value !== undefined && value !== '';
  });
}

/**
 * Get list of missing required fields for a guest
 */
export function getMissingFields(guest: ReservationGuest): string[] {
  const requiredFields = [
    'document_type',
    'document_number',
    'first_surname',
    'given_names',
    'birth_date',
    'nationality_code',
    'origin_city_code',
    'destination_city_code',
  ] as const;

  return requiredFields.filter((field) => {
    const value = guest[field];
    return value === null || value === undefined || value === '';
  });
}

/**
 * Validate hotel info from tenant registry
 */
export function validateHotelInfo(hotelInfo: {
  hotel_sire_code: string | null;
  hotel_city_code: string | null;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!hotelInfo.hotel_sire_code) {
    errors.push({
      field: 'hotel_sire_code',
      code: 'MISSING_REQUIRED',
      message: 'Código SIRE del hotel no configurado en tenant_registry',
      value: null,
    });
  } else if (!SIRE_PATTERNS.hotelCode.test(hotelInfo.hotel_sire_code)) {
    errors.push({
      field: 'hotel_sire_code',
      code: 'INVALID_HOTEL_CODE',
      message: 'Código SIRE del hotel inválido. Debe ser 4-6 dígitos',
      value: hotelInfo.hotel_sire_code,
    });
  }

  if (!hotelInfo.hotel_city_code) {
    errors.push({
      field: 'hotel_city_code',
      code: 'MISSING_REQUIRED',
      message: 'Código de ciudad del hotel no configurado en tenant_registry',
      value: null,
    });
  } else if (!SIRE_PATTERNS.cityCode.test(hotelInfo.hotel_city_code)) {
    errors.push({
      field: 'hotel_city_code',
      code: 'INVALID_CITY_CODE',
      message: 'Código de ciudad del hotel inválido. Debe ser 5-6 dígitos (DIVIPOLA)',
      value: hotelInfo.hotel_city_code,
    });
  }

  return errors;
}

// ============================================================================
// HELPER EXPORTS
// ============================================================================

export { SIRE_PATTERNS, VALID_DOCUMENT_TYPES };
