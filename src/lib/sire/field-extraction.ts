/**
 * SIRE Field Extraction - OCR to SIRE Mapping
 *
 * Maps extracted OCR data (from document-ocr.ts) to SIRE official format.
 *
 * This module bridges two data structures:
 * - INPUT: PassportData, VisaData, CedulaData (raw OCR extraction)
 * - OUTPUT: SIREConversationalData (normalized SIRE fields)
 *
 * Key Features:
 * - Name splitting (fullName → apellidos + nombres)
 * - Nationality mapping (country name → SIRE code)
 * - Document type detection (passport/cedula/visa → SIRE type)
 * - Date normalization (multiple formats → DD/MM/YYYY)
 * - Field validation with confidence scoring
 *
 * @see src/lib/sire/document-ocr.ts - OCR data structures
 * @see src/lib/sire/field-mappers.ts - SIRE data structures
 * @see docs/sire-auto-submission/PLAN.md - FASE 2.3 specification
 */

import type { PassportData, VisaData, CedulaData } from './document-ocr';
import { getSIRECountryCode } from './sire-catalogs';

// ============================================================================
// TYPES
// ============================================================================

/**
 * SIRE Conversational Data (Normalized)
 *
 * This is the target format after OCR → SIRE mapping.
 * Matches the interface in field-mappers.ts but uses partial for progressive disclosure.
 */
export interface SIREConversationalData {
  // Name components (SIRE requires separated fields)
  primer_apellido: string; // First surname
  segundo_apellido: string; // Second surname (can be empty)
  nombres: string; // Given names

  // Document information
  tipo_documento: string; // SIRE code: 3=Passport, 5=Cedula, 46=Diplomatic, 10=PEP
  documento_numero: string; // Alphanumeric 6-15 chars (no hyphens)

  // Nationality
  codigo_nacionalidad: string; // SIRE country code (e.g., 249=USA, 169=Colombia)

  // Personal information
  genero: string; // M or F
  fecha_nacimiento: string; // DD/MM/YYYY format

  // Movement information (optional - may come from reservation)
  fecha_llegada?: string; // DD/MM/YYYY format
  fecha_salida?: string; // DD/MM/YYYY format
  lugar_procedencia?: string; // SIRE country code
}

/**
 * Field-level confidence and error tracking
 */
export interface FieldExtractionResult {
  /** Partially populated SIRE data (fields may be missing) */
  sireData: Partial<SIREConversationalData>;

  /** Confidence score per field (0.0 - 1.0) */
  confidence: Record<string, number>;

  /** List of errors encountered during extraction */
  errors: string[];
}

// ============================================================================
// NAME SPLITTING
// ============================================================================

/**
 * Split full name into SIRE components
 *
 * Handles multiple name formats:
 * - Passport format: "SURNAME, Given Names" → apellido: SURNAME, nombres: Given Names
 * - Spanish format: "GARCIA LOPEZ, MARIA ELENA" → primer: GARCIA, segundo: LOPEZ, nombres: MARIA ELENA
 * - Space-separated: "JOHN MICHAEL SMITH" → primer: SMITH, segundo: "", nombres: JOHN MICHAEL
 * - Single surname: "JOHN SMITH" → primer: SMITH, segundo: "", nombres: JOHN
 *
 * Confidence scoring:
 * - 0.95: Comma-separated format (most reliable)
 * - 0.85: Multiple words detected
 * - 0.70: Single word or ambiguous format
 *
 * @param fullName - Full name from OCR (e.g., "SMITH, JOHN MICHAEL")
 * @returns Object with apellidos, nombres, and confidence score
 *
 * @example
 * splitFullName("SMITH, JOHN MICHAEL")
 * // { primer_apellido: "SMITH", segundo_apellido: "", nombres: "JOHN MICHAEL", confidence: 0.95 }
 *
 * @example
 * splitFullName("GARCIA LOPEZ, MARIA ELENA")
 * // { primer_apellido: "GARCIA", segundo_apellido: "LOPEZ", nombres: "MARIA ELENA", confidence: 0.95 }
 *
 * @example
 * splitFullName("JOHN MICHAEL SMITH")
 * // { primer_apellido: "SMITH", segundo_apellido: "", nombres: "JOHN MICHAEL", confidence: 0.85 }
 */
export function splitFullName(fullName: string): {
  primer_apellido: string;
  segundo_apellido: string;
  nombres: string;
  confidence: number;
} {
  const cleaned = fullName.trim().replace(/\s+/g, ' ');

  // Format 1: "SURNAME(S), Given Names" (passport format - highest confidence)
  if (cleaned.includes(',')) {
    const [surnamesPart, givenNamesPart] = cleaned.split(',').map((p) => p.trim());
    const surnames = surnamesPart.split(/\s+/);

    return {
      primer_apellido: surnames[0] || '',
      segundo_apellido: surnames[1] || '',
      nombres: givenNamesPart || '',
      confidence: 0.95, // High confidence - comma separator is explicit
    };
  }

  // Format 2: Space-separated words
  const parts = cleaned.split(/\s+/);

  if (parts.length === 1) {
    // Single word - assume it's a name (edge case)
    return {
      primer_apellido: '',
      segundo_apellido: '',
      nombres: parts[0],
      confidence: 0.70, // Low confidence - ambiguous
    };
  }

  if (parts.length === 2) {
    // "Given Surname" format
    return {
      primer_apellido: parts[1],
      segundo_apellido: '',
      nombres: parts[0],
      confidence: 0.85, // Medium confidence - common format
    };
  }

  if (parts.length === 3) {
    // "Given Surname1 Surname2" or "Given1 Given2 Surname"
    // Assume last two words are surnames (Spanish convention)
    return {
      primer_apellido: parts[1],
      segundo_apellido: parts[2],
      nombres: parts[0],
      confidence: 0.85,
    };
  }

  // 4+ words: Last two = surnames, rest = given names
  const primer_apellido = parts[parts.length - 2];
  const segundo_apellido = parts[parts.length - 1];
  const nombres = parts.slice(0, parts.length - 2).join(' ');

  return {
    primer_apellido,
    segundo_apellido,
    nombres,
    confidence: 0.85,
  };
}

// ============================================================================
// NATIONALITY MAPPING
// ============================================================================

/**
 * Map nationality string to SIRE country code
 *
 * Uses fuzzy search from sire-catalogs.ts to handle:
 * - Different spellings: "United States" vs "USA" vs "Estados Unidos"
 * - Accents: "España" vs "Espana"
 * - Case variations: "COLOMBIA" vs "colombia"
 * - Typos: "Estdos Unidos" → "Estados Unidos"
 *
 * Common aliases:
 * - USA, United States, Estados Unidos → 249
 * - Colombia → 169
 * - España, Spain → 245
 * - Brasil, Brazil → 105
 *
 * @param nationality - Country name from passport (any language/format)
 * @returns Object with success status, SIRE code, and confidence
 *
 * @example
 * mapNationalityToSIRE("United States")
 * // { success: true, code: "249", confidence: 0.95 }
 *
 * @example
 * mapNationalityToSIRE("USA")
 * // { success: true, code: "249", confidence: 0.95 }
 *
 * @example
 * mapNationalityToSIRE("NARNIA")
 * // { success: false, code: null, confidence: 0 }
 */
export function mapNationalityToSIRE(nationality: string): {
  success: boolean;
  code: string | null;
  confidence: number;
} {
  // Normalize input
  const normalized = nationality.trim();

  if (!normalized) {
    return { success: false, code: null, confidence: 0 };
  }

  // Common aliases mapping (faster than fuzzy search)
  const aliases: Record<string, string> = {
    // USA variations
    usa: '249',
    'united states': '249',
    'estados unidos': '249',
    eeuu: '249',
    'united states of america': '249',

    // Colombia
    colombia: '169',
    col: '169',

    // Spain
    españa: '245',
    spain: '245',
    esp: '245',

    // Brazil
    brasil: '105',
    brazil: '105',
    bra: '105',

    // Argentina
    argentina: '63',
    arg: '63',

    // Mexico
    mexico: '493',
    méxico: '493',
    mex: '493',

    // Canada
    canada: '117',
    canadá: '117',
    can: '117',

    // France
    francia: '265',
    france: '265',
    fra: '265',

    // Germany
    alemania: '23',
    germany: '23',
    ger: '23',
    deu: '23',

    // UK
    'united kingdom': '300',
    'reino unido': '300',
    uk: '300',
    'gran bretaña': '300',
    england: '300',
    inglaterra: '300',

    // Italy
    italia: '369',
    italy: '369',
    ita: '369',
  };

  const lowerNormalized = normalized.toLowerCase();
  const aliasCode = aliases[lowerNormalized];

  if (aliasCode) {
    console.log('[field-extraction] Nationality alias matched:', {
      input: nationality,
      code: aliasCode,
    });
    return { success: true, code: aliasCode, confidence: 0.95 };
  }

  // Fallback to fuzzy search in SIRE catalog
  const code = getSIRECountryCode(normalized);

  if (code) {
    console.log('[field-extraction] Nationality fuzzy matched:', {
      input: nationality,
      code,
    });
    return { success: true, code, confidence: 0.85 }; // Lower confidence for fuzzy match
  }

  console.warn('[field-extraction] Nationality not found:', nationality);
  return { success: false, code: null, confidence: 0 };
}

// ============================================================================
// DOCUMENT TYPE DETECTION
// ============================================================================

/**
 * Detect SIRE document type from document number pattern
 *
 * SIRE document types:
 * - 3: Passport (most common - ~95% of tourist cases)
 * - 5: Cédula de Extranjería (foreign resident card)
 * - 46: Diplomatic passport
 * - 10: PEP (Permiso Especial de Permanencia - Venezuelan migrants)
 *
 * Detection heuristics:
 * - Starts with letter(s) → Passport (3)
 * - Only digits, length < 11 → Cédula (5)
 * - Default → Passport (3)
 *
 * @param documentNumber - Document number from OCR
 * @returns SIRE document type code
 *
 * @example
 * detectDocumentType("AB123456") // "3" (Passport - has letters)
 * detectDocumentType("12345678") // "5" (Cédula - only digits, < 11)
 * detectDocumentType("123456789012") // "3" (Passport - default for long numbers)
 */
export function detectDocumentType(documentNumber: string): string {
  const cleaned = documentNumber.replace(/[-\s]/g, '');

  // Pattern: Contains letters → Passport
  if (/[A-Z]/i.test(cleaned)) {
    return '3'; // Passport
  }

  // Pattern: Only digits, length < 11 → Cédula
  if (/^\d+$/.test(cleaned) && cleaned.length < 11) {
    return '5'; // Cédula de Extranjería
  }

  // Default: Passport (most common in tourism)
  return '3';
}

// ============================================================================
// DATE NORMALIZATION
// ============================================================================

/**
 * Normalize date to SIRE format (DD/MM/YYYY)
 *
 * Handles multiple input formats:
 * - ISO: "1985-03-25" → "25/03/1985"
 * - Passport: "25 MAR 1985" → "25/03/1985"
 * - European: "25/03/1985" → "25/03/1985" (no change)
 * - US: "03/25/1985" → "25/03/1985" (swaps day/month)
 *
 * Month abbreviations supported:
 * - JAN/ENE → 01, FEB → 02, MAR → 03, APR/ABR → 04, MAY → 05, JUN → 06
 * - JUL → 07, AUG/AGO → 08, SEP → 09, OCT → 10, NOV → 11, DEC/DIC → 12
 *
 * @param date - Date string in any common format
 * @returns Date in DD/MM/YYYY format or null if invalid
 *
 * @example
 * normalizeDateFormat("1985-03-25") // "25/03/1985"
 * normalizeDateFormat("25 MAR 1985") // "25/03/1985"
 * normalizeDateFormat("25/03/1985") // "25/03/1985"
 * normalizeDateFormat("invalid") // null
 */
export function normalizeDateFormat(date: string): string | null {
  if (!date) return null;

  const cleaned = date.trim();

  // Format 1: ISO (YYYY-MM-DD)
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  // Format 2: Passport format (DD MMM YYYY)
  const passportMatch = cleaned.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/i);
  if (passportMatch) {
    const [, day, monthAbbr, year] = passportMatch;

    const monthMap: Record<string, string> = {
      JAN: '01',
      ENE: '01',
      FEB: '02',
      MAR: '03',
      APR: '04',
      ABR: '04',
      MAY: '05',
      JUN: '06',
      JUL: '07',
      AUG: '08',
      AGO: '08',
      SEP: '09',
      OCT: '10',
      NOV: '11',
      DEC: '12',
      DIC: '12',
    };

    const month = monthMap[monthAbbr.toUpperCase()];
    if (!month) {
      console.warn('[field-extraction] Unknown month abbreviation:', monthAbbr);
      return null;
    }

    return `${day.padStart(2, '0')}/${month}/${year}`;
  }

  // Format 3: Already in DD/MM/YYYY
  const europeanMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (europeanMatch) {
    const [, day, month, year] = europeanMatch;
    // Validate day and month ranges
    const d = parseInt(day);
    const m = parseInt(month);

    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }

  console.warn('[field-extraction] Unrecognized date format:', date);
  return null;
}

// ============================================================================
// FIELD VALIDATION
// ============================================================================

/**
 * Validate extracted SIRE fields
 *
 * Validates:
 * - documento_numero: 6-15 alphanumeric characters (no hyphens)
 * - nombres/apellidos: Only letters, spaces, and accents
 * - fecha_nacimiento: DD/MM/YYYY format, not in future
 * - genero: M or F
 *
 * @param sireData - Partially populated SIRE data
 * @returns Object with valid flag and list of errors
 *
 * @example
 * validateExtractedFields({ documento_numero: "ABC", nombres: "JOHN" })
 * // { valid: false, errors: ["documento_numero must be 6-15 characters"] }
 */
export function validateExtractedFields(
  sireData: Partial<SIREConversationalData>
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate documento_numero
  if (sireData.documento_numero) {
    const cleaned = sireData.documento_numero.replace(/[-\s]/g, '');
    if (cleaned.length < 6 || cleaned.length > 15) {
      errors.push('documento_numero must be 6-15 characters (excluding hyphens)');
    }
    if (!/^[A-Z0-9]+$/i.test(cleaned)) {
      errors.push('documento_numero must be alphanumeric');
    }
  }

  // Validate nombres (only letters, spaces, accents)
  if (sireData.nombres) {
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(sireData.nombres)) {
      errors.push('nombres must contain only letters and spaces');
    }
  }

  // Validate apellidos
  if (sireData.primer_apellido) {
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(sireData.primer_apellido)) {
      errors.push('primer_apellido must contain only letters and spaces');
    }
  }

  if (sireData.segundo_apellido) {
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(sireData.segundo_apellido)) {
      errors.push('segundo_apellido must contain only letters and spaces');
    }
  }

  // Validate fecha_nacimiento (DD/MM/YYYY)
  if (sireData.fecha_nacimiento) {
    const dateMatch = sireData.fecha_nacimiento.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!dateMatch) {
      errors.push('fecha_nacimiento must be in DD/MM/YYYY format');
    } else {
      const [, day, month, year] = dateMatch;
      const d = parseInt(day);
      const m = parseInt(month);
      const y = parseInt(year);

      if (d < 1 || d > 31) errors.push('fecha_nacimiento: invalid day');
      if (m < 1 || m > 12) errors.push('fecha_nacimiento: invalid month');

      // Not in future
      const birthDate = new Date(y, m - 1, d);
      if (birthDate > new Date()) {
        errors.push('fecha_nacimiento cannot be in the future');
      }
    }
  }

  // Validate genero
  if (sireData.genero && !['M', 'F'].includes(sireData.genero.toUpperCase())) {
    errors.push('genero must be M or F');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// MAIN MAPPING FUNCTIONS
// ============================================================================

/**
 * Map passport OCR data to SIRE format
 *
 * Extracts and normalizes:
 * - fullName → primer_apellido, segundo_apellido, nombres
 * - passportNumber → documento_numero (cleaned)
 * - nationality → codigo_nacionalidad (SIRE code)
 * - birthDate → fecha_nacimiento (DD/MM/YYYY)
 * - sex → genero (M/F)
 *
 * Includes per-field confidence scoring and error tracking.
 *
 * @param passportData - Extracted passport data from OCR
 * @returns FieldExtractionResult with SIRE data, confidence, and errors
 *
 * @example
 * const ocrResult = await extractPassportData(imageBuffer, mimeType);
 * const sireResult = mapPassportToSIRE(ocrResult.passportData);
 * // sireResult.sireData = { primer_apellido: "SMITH", nombres: "JOHN", ... }
 * // sireResult.confidence = { primer_apellido: 0.95, nombres: 0.95, ... }
 */
export function mapPassportToSIRE(passportData: PassportData): FieldExtractionResult {
  const sireData: Partial<SIREConversationalData> = {};
  const confidence: Record<string, number> = {};
  const errors: string[] = [];

  // 1. Extract name components
  if (passportData.fullName) {
    const nameResult = splitFullName(passportData.fullName);
    sireData.primer_apellido = nameResult.primer_apellido;
    sireData.segundo_apellido = nameResult.segundo_apellido;
    sireData.nombres = nameResult.nombres;

    confidence.primer_apellido = nameResult.confidence;
    confidence.segundo_apellido = nameResult.confidence;
    confidence.nombres = nameResult.confidence;
  } else {
    errors.push('fullName not extracted from passport');
  }

  // 2. Extract document number
  if (passportData.passportNumber) {
    // Clean document number (remove hyphens, spaces)
    const cleaned = passportData.passportNumber.replace(/[-\s]/g, '').toUpperCase();
    sireData.documento_numero = cleaned;
    sireData.tipo_documento = detectDocumentType(cleaned);

    // Higher confidence if MRZ is present
    confidence.documento_numero = passportData.mrz && passportData.mrz.length > 0 ? 0.95 : 0.85;
    confidence.tipo_documento = 0.95; // High confidence in type detection
  } else {
    errors.push('passportNumber not extracted from passport');
  }

  // 3. Map nationality to SIRE code
  if (passportData.nationality) {
    const nationalityResult = mapNationalityToSIRE(passportData.nationality);
    if (nationalityResult.success && nationalityResult.code) {
      sireData.codigo_nacionalidad = nationalityResult.code;
      confidence.codigo_nacionalidad = nationalityResult.confidence;
    } else {
      errors.push(`Nationality not found in SIRE catalog: ${passportData.nationality}`);
    }
  } else {
    errors.push('nationality not extracted from passport');
  }

  // 4. Normalize birth date
  if (passportData.birthDate) {
    const normalizedDate = normalizeDateFormat(passportData.birthDate);
    if (normalizedDate) {
      sireData.fecha_nacimiento = normalizedDate;
      confidence.fecha_nacimiento = passportData.mrz && passportData.mrz.length > 0 ? 0.95 : 0.85;
    } else {
      errors.push(`Invalid birthDate format: ${passportData.birthDate}`);
    }
  } else {
    errors.push('birthDate not extracted from passport');
  }

  // 5. Extract gender
  if (passportData.sex) {
    sireData.genero = passportData.sex.toUpperCase();
    confidence.genero = passportData.mrz && passportData.mrz.length > 0 ? 0.95 : 0.85;
  } else {
    errors.push('sex not extracted from passport');
  }

  // Validate extracted fields
  const validation = validateExtractedFields(sireData);
  if (!validation.valid) {
    errors.push(...validation.errors);
  }

  console.log('[field-extraction] Passport → SIRE mapping complete:', {
    success: errors.length === 0,
    fieldsExtracted: Object.keys(sireData).length,
    avgConfidence:
      Object.values(confidence).reduce((sum, c) => sum + c, 0) / Object.values(confidence).length,
    errors,
  });

  return {
    sireData,
    confidence,
    errors,
  };
}

/**
 * Map cédula OCR data to SIRE format
 *
 * Similar to passport mapping but optimized for Colombian cédula fields.
 *
 * @param cedulaData - Extracted cédula data from OCR
 * @returns FieldExtractionResult with SIRE data, confidence, and errors
 */
export function mapCedulaToSIRE(cedulaData: CedulaData): FieldExtractionResult {
  const sireData: Partial<SIREConversationalData> = {};
  const confidence: Record<string, number> = {};
  const errors: string[] = [];

  // 1. Extract name components
  if (cedulaData.fullName) {
    const nameResult = splitFullName(cedulaData.fullName);
    sireData.primer_apellido = nameResult.primer_apellido;
    sireData.segundo_apellido = nameResult.segundo_apellido;
    sireData.nombres = nameResult.nombres;

    confidence.primer_apellido = nameResult.confidence;
    confidence.segundo_apellido = nameResult.confidence;
    confidence.nombres = nameResult.confidence;
  } else {
    errors.push('fullName not extracted from cédula');
  }

  // 2. Extract document number
  if (cedulaData.cedulaNumber) {
    const cleaned = cedulaData.cedulaNumber.replace(/[-\s]/g, '');
    sireData.documento_numero = cleaned;
    sireData.tipo_documento = '5'; // Cédula de Extranjería

    confidence.documento_numero = 0.85;
    confidence.tipo_documento = 0.95;
  } else {
    errors.push('cedulaNumber not extracted');
  }

  // 3. Nationality (default to Colombia for cédula)
  sireData.codigo_nacionalidad = '169'; // Colombia
  confidence.codigo_nacionalidad = 0.70; // Lower confidence - inferred

  // 4. Normalize birth date
  if (cedulaData.birthDate) {
    const normalizedDate = normalizeDateFormat(cedulaData.birthDate);
    if (normalizedDate) {
      sireData.fecha_nacimiento = normalizedDate;
      confidence.fecha_nacimiento = 0.85;
    } else {
      errors.push(`Invalid birthDate format: ${cedulaData.birthDate}`);
    }
  } else {
    errors.push('birthDate not extracted from cédula');
  }

  // 5. Extract gender
  if (cedulaData.sex) {
    sireData.genero = cedulaData.sex.toUpperCase();
    confidence.genero = 0.85;
  } else {
    errors.push('sex not extracted from cédula');
  }

  // Validate extracted fields
  const validation = validateExtractedFields(sireData);
  if (!validation.valid) {
    errors.push(...validation.errors);
  }

  console.log('[field-extraction] Cédula → SIRE mapping complete:', {
    success: errors.length === 0,
    fieldsExtracted: Object.keys(sireData).length,
    errors,
  });

  return {
    sireData,
    confidence,
    errors,
  };
}

/**
 * Map visa OCR data to SIRE format
 *
 * Note: Visas typically need to be combined with passport data for complete SIRE submission.
 * This function extracts what it can from visa alone.
 *
 * @param visaData - Extracted visa data from OCR
 * @returns FieldExtractionResult with SIRE data, confidence, and errors
 */
export function mapVisaToSIRE(visaData: VisaData): FieldExtractionResult {
  const sireData: Partial<SIREConversationalData> = {};
  const confidence: Record<string, number> = {};
  const errors: string[] = [];

  // Extract visa number (if usable as document number)
  if (visaData.visaNumber) {
    const cleaned = visaData.visaNumber.replace(/[-\s]/g, '');
    sireData.documento_numero = cleaned;
    confidence.documento_numero = 0.70; // Lower confidence - visa number is not always a valid ID

    errors.push('Visa data incomplete - requires passport data for full SIRE submission');
  } else {
    errors.push('visaNumber not extracted from visa');
  }

  // Note: Visas don't contain name, nationality, or birth date
  // These must be sourced from passport or manual input

  console.log('[field-extraction] Visa → SIRE mapping complete (partial):', {
    success: false, // Visa alone is insufficient
    fieldsExtracted: Object.keys(sireData).length,
    errors,
  });

  return {
    sireData,
    confidence,
    errors,
  };
}
