/**
 * SIRE Entity Extraction
 *
 * Advanced entity extraction functions for SIRE compliance fields.
 * Provides specialized parsing, validation, and confidence scoring
 * for conversational data extraction.
 *
 * Used by: compliance-chat-engine.ts
 * References: sire-catalogs.ts (for country/city codes)
 */

import { getSIRECountryCode, getDIVIPOLACityCode } from './sire-catalogs';
import countryCatalog from '../../../_assets/sire/codigos-pais.json';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Extraction result with confidence scoring
 */
export interface ExtractionResult<T = any> {
  value: T | null;
  confidence: number; // 0.00-1.00
  rawInput: string;
  warnings?: string[];
}

/**
 * Full name components
 */
export interface FullNameComponents {
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
}

/**
 * Location extraction result (country or city code)
 */
export interface LocationResult {
  code: string;
  type: 'country' | 'city';
  name: string;
}

// ============================================================================
// MAIN EXTRACTION ROUTER
// ============================================================================

/**
 * Extract SIRE entities from user input with field-specific logic
 *
 * Routes to specialized extractors based on field name.
 * Returns null value with 0 confidence if extraction fails.
 *
 * @param message - User's natural language input
 * @param fieldName - SIRE field name (e.g., 'full_name', 'birth_date')
 * @returns Extraction result with value, confidence, and warnings
 *
 * @example
 * extractSIREEntities("John Michael Smith Anderson", "full_name")
 * // Returns: {
 * //   value: { nombres: "JOHN MICHAEL", primerApellido: "SMITH", segundoApellido: "ANDERSON" },
 * //   confidence: 1.00,
 * //   rawInput: "John Michael Smith Anderson"
 * // }
 *
 * @example
 * extractSIREEntities("25 de marzo de 1985", "birth_date")
 * // Returns: {
 * //   value: "1985-03-25",
 * //   confidence: 1.00,
 * //   rawInput: "25 de marzo de 1985"
 * // }
 */
export function extractSIREEntities(
  message: string,
  fieldName: string
): ExtractionResult {
  const trimmed = message.trim();

  if (!trimmed) {
    return { value: null, confidence: 0, rawInput: message };
  }

  switch (fieldName) {
    case 'full_name':
    case 'nombre_completo':
      return extractFullName(trimmed);

    case 'birth_date':
    case 'fecha_nacimiento':
      return extractBirthDate(trimmed);

    case 'nationality':
    case 'nationality_text':
    case 'pais_texto':
    case 'pais_nacionalidad':
      return extractNationality(trimmed);

    case 'document_number':
    case 'numero_pasaporte':
    case 'documento_numero':
      return extractDocumentNumber(trimmed);

    case 'origin':
    case 'origin_text':
    case 'procedencia':
    case 'procedencia_texto':
      return extractLocation(trimmed);

    case 'destination':
    case 'destination_text':
    case 'destino':
    case 'destino_texto':
      return extractLocation(trimmed);

    default:
      return { value: null, confidence: 0, rawInput: message };
  }
}

// ============================================================================
// FULL NAME EXTRACTION
// ============================================================================

/**
 * Extract full name components (nombres, apellidos)
 *
 * Handles multiple formats:
 * - "John Smith" → { nombres: "JOHN", primerApellido: "SMITH", segundoApellido: "" }
 * - "John Michael Smith" → { nombres: "JOHN", primerApellido: "MICHAEL", segundoApellido: "SMITH" }
 * - "John Michael Smith Anderson" → { nombres: "JOHN MICHAEL", primerApellido: "SMITH", segundoApellido: "ANDERSON" }
 * - "García Pérez, Juan Pablo" → { nombres: "JUAN PABLO", primerApellido: "GARCÍA", segundoApellido: "PÉREZ" }
 *
 * Confidence scoring:
 * - 1.00: 3+ words (full name with both apellidos)
 * - 0.80: 2 words (nombre + 1 apellido)
 * - 0.60: 4+ words (ambiguous split)
 * - 0.40: 1 word (incomplete)
 *
 * @param message - Full name in natural language
 * @returns Extraction result with name components
 */
export function extractFullName(message: string): ExtractionResult<FullNameComponents> {
  const warnings: string[] = [];

  // Clean and normalize
  const cleaned = message
    .trim()
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s,'-]/g, ''); // Remove invalid characters

  if (!cleaned) {
    return {
      value: null,
      confidence: 0,
      rawInput: message,
      warnings: ['Nombre vacío o solo contiene caracteres inválidos']
    };
  }

  // Case 1: Format "Apellidos, Nombres" (Spanish legal format)
  if (cleaned.includes(',')) {
    const [apellidosPart, nombresPart] = cleaned.split(',').map(p => p.trim());

    if (!apellidosPart || !nombresPart) {
      warnings.push('Formato "Apellidos, Nombres" incompleto');
      return {
        value: null,
        confidence: 0.20,
        rawInput: message,
        warnings
      };
    }

    const apellidos = apellidosPart.split(/\s+/);

    return {
      value: {
        nombres: validateOnlyLetters(nombresPart).toUpperCase(),
        primerApellido: validateOnlyLetters(apellidos[0] || '').toUpperCase(),
        segundoApellido: apellidos[1] ? validateOnlyLetters(apellidos[1]).toUpperCase() : '',
      },
      confidence: 1.00,
      rawInput: message,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // Case 2: Format "Nombres Apellidos" (most common)
  const parts = cleaned.split(/\s+/);

  if (parts.length === 1) {
    // Only one word (incomplete)
    warnings.push('Solo se detectó una palabra. Se requiere nombre completo con apellidos.');
    return {
      value: {
        nombres: validateOnlyLetters(parts[0]).toUpperCase(),
        primerApellido: '',
        segundoApellido: '',
      },
      confidence: 0.40,
      rawInput: message,
      warnings
    };
  }

  if (parts.length === 2) {
    // Nombre + 1 Apellido
    return {
      value: {
        nombres: validateOnlyLetters(parts[0]).toUpperCase(),
        primerApellido: validateOnlyLetters(parts[1]).toUpperCase(),
        segundoApellido: '',
      },
      confidence: 0.80,
      rawInput: message,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  if (parts.length === 3) {
    // Nombre + 2 Apellidos (ideal)
    return {
      value: {
        nombres: validateOnlyLetters(parts[0]).toUpperCase(),
        primerApellido: validateOnlyLetters(parts[1]).toUpperCase(),
        segundoApellido: validateOnlyLetters(parts[2]).toUpperCase(),
      },
      confidence: 1.00,
      rawInput: message,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // 4+ words: Last 2 = apellidos, rest = nombres
  const primerApellido = parts[parts.length - 2];
  const segundoApellido = parts[parts.length - 1];
  const nombres = parts.slice(0, parts.length - 2).join(' ');

  warnings.push('Nombre largo detectado. Asumiendo últimas 2 palabras como apellidos.');

  return {
    value: {
      nombres: validateOnlyLetters(nombres).toUpperCase(),
      primerApellido: validateOnlyLetters(primerApellido).toUpperCase(),
      segundoApellido: validateOnlyLetters(segundoApellido).toUpperCase(),
    },
    confidence: 0.90,
    rawInput: message,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// ============================================================================
// BIRTH DATE EXTRACTION
// ============================================================================

/**
 * Spanish month names mapping
 */
const SPANISH_MONTHS: Record<string, number> = {
  'enero': 1,
  'febrero': 2,
  'marzo': 3,
  'abril': 4,
  'mayo': 5,
  'junio': 6,
  'julio': 7,
  'agosto': 8,
  'septiembre': 9,
  'octubre': 10,
  'noviembre': 11,
  'diciembre': 12,
};

/**
 * English month names mapping
 */
const ENGLISH_MONTHS: Record<string, number> = {
  'january': 1,
  'february': 2,
  'march': 3,
  'april': 4,
  'may': 5,
  'june': 6,
  'july': 7,
  'august': 8,
  'september': 9,
  'october': 10,
  'november': 11,
  'december': 12,
};

/**
 * Extract birth date from various formats
 *
 * Supported formats (all return ISO YYYY-MM-DD):
 * - "25 de marzo de 1985" → "1985-03-25"
 * - "March 25, 1985" → "1985-03-25"
 * - "25/03/1985" → "1985-03-25"
 * - "1985-03-25" → "1985-03-25"
 * - "marzo 25 1985" → "1985-03-25"
 *
 * Validates:
 * - Age range: 18-120 years
 * - Valid calendar dates
 * - Reasonable year range (1900-2100)
 *
 * Confidence scoring:
 * - 1.00: Valid date, age 18-120
 * - 0.80: Valid date, age < 18 (minor warning)
 * - 0.50: Valid date format, future date
 * - 0.00: Invalid format
 *
 * @param message - Date in natural language or formatted string
 * @returns Extraction result with ISO date string (YYYY-MM-DD)
 */
export function extractBirthDate(message: string): ExtractionResult<string> {
  const warnings: string[] = [];
  const cleaned = message.trim().toLowerCase();

  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  // Pattern 1: "25 de marzo de 1985" (Spanish long format)
  const spanishLongPattern = /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/;
  const spanishMatch = cleaned.match(spanishLongPattern);

  if (spanishMatch) {
    day = parseInt(spanishMatch[1]);
    month = SPANISH_MONTHS[spanishMatch[2]];
    year = parseInt(spanishMatch[3]);

    if (!month) {
      warnings.push(`Mes no reconocido: "${spanishMatch[2]}"`);
      return {
        value: null,
        confidence: 0,
        rawInput: message,
        warnings
      };
    }
  }

  // Pattern 2: "March 25, 1985" or "March 25 1985" (English format)
  const englishPattern = /(\w+)\s+(\d{1,2}),?\s+(\d{4})/;
  const englishMatch = cleaned.match(englishPattern);

  if (!spanishMatch && englishMatch) {
    month = ENGLISH_MONTHS[englishMatch[1]];
    day = parseInt(englishMatch[2]);
    year = parseInt(englishMatch[3]);

    if (!month) {
      warnings.push(`Month not recognized: "${englishMatch[1]}"`);
      return {
        value: null,
        confidence: 0,
        rawInput: message,
        warnings
      };
    }
  }

  // Pattern 3: "25/03/1985" (DD/MM/YYYY)
  const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const slashMatch = cleaned.match(slashPattern);

  if (!spanishMatch && !englishMatch && slashMatch) {
    day = parseInt(slashMatch[1]);
    month = parseInt(slashMatch[2]);
    year = parseInt(slashMatch[3]);
  }

  // Pattern 4: "1985-03-25" (ISO format)
  const isoPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  const isoMatch = cleaned.match(isoPattern);

  if (!spanishMatch && !englishMatch && !slashMatch && isoMatch) {
    year = parseInt(isoMatch[1]);
    month = parseInt(isoMatch[2]);
    day = parseInt(isoMatch[3]);
  }

  // Pattern 5: "marzo 25 1985" (Month Day Year - Spanish)
  const spanishShortPattern = /(\w+)\s+(\d{1,2})\s+(\d{4})/;
  const spanishShortMatch = cleaned.match(spanishShortPattern);

  if (!spanishMatch && !englishMatch && !slashMatch && !isoMatch && spanishShortMatch) {
    month = SPANISH_MONTHS[spanishShortMatch[1]];
    day = parseInt(spanishShortMatch[2]);
    year = parseInt(spanishShortMatch[3]);

    if (!month) {
      warnings.push(`Mes no reconocido: "${spanishShortMatch[1]}"`);
      return {
        value: null,
        confidence: 0,
        rawInput: message,
        warnings
      };
    }
  }

  // No pattern matched
  if (day === null || month === null || year === null) {
    warnings.push('Formato de fecha no reconocido. Use: DD/MM/YYYY, "25 de marzo de 1985", o "March 25, 1985"');
    return {
      value: null,
      confidence: 0,
      rawInput: message,
      warnings
    };
  }

  // Validate ranges
  if (year < 1900 || year > 2100) {
    warnings.push(`Año fuera de rango: ${year}. Rango válido: 1900-2100`);
    return {
      value: null,
      confidence: 0,
      rawInput: message,
      warnings
    };
  }

  if (month < 1 || month > 12) {
    warnings.push(`Mes inválido: ${month}. Rango válido: 1-12`);
    return {
      value: null,
      confidence: 0,
      rawInput: message,
      warnings
    };
  }

  if (day < 1 || day > 31) {
    warnings.push(`Día inválido: ${day}. Rango válido: 1-31`);
    return {
      value: null,
      confidence: 0,
      rawInput: message,
      warnings
    };
  }

  // Validate date is valid (handles Feb 30, etc.)
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    warnings.push(`Fecha inválida: ${day}/${month}/${year} (calendario)`);
    return {
      value: null,
      confidence: 0,
      rawInput: message,
      warnings
    };
  }

  // Calculate age
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--;
  }

  // Age validation
  if (age < 0) {
    warnings.push('Fecha de nacimiento en el futuro');
    return {
      value: formatToISO(year, month, day),
      confidence: 0.50,
      rawInput: message,
      warnings
    };
  }

  if (age < 18) {
    warnings.push(`Edad menor de 18 años (${age} años). Verificar si es correcto.`);
    return {
      value: formatToISO(year, month, day),
      confidence: 0.80,
      rawInput: message,
      warnings
    };
  }

  if (age > 120) {
    warnings.push(`Edad mayor de 120 años (${age} años). Verificar si es correcto.`);
    return {
      value: formatToISO(year, month, day),
      confidence: 0.60,
      rawInput: message,
      warnings
    };
  }

  // Valid adult birth date
  return {
    value: formatToISO(year, month, day),
    confidence: 1.00,
    rawInput: message,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// ============================================================================
// NATIONALITY EXTRACTION
// ============================================================================

/**
 * Common country name aliases (English → Spanish)
 */
const COUNTRY_ALIASES: Record<string, string> = {
  // English → Spanish
  'united states': 'Estados Unidos',
  'usa': 'Estados Unidos',
  'us': 'Estados Unidos',
  'america': 'Estados Unidos',
  'united kingdom': 'Reino Unido',
  'uk': 'Reino Unido',
  'england': 'Reino Unido',
  'britain': 'Reino Unido',
  'great britain': 'Reino Unido',
  'spain': 'España',
  'germany': 'Alemania',
  'france': 'Francia',
  'italy': 'Italia',
  'brazil': 'Brasil',
  'argentina': 'Argentina',
  'mexico': 'México',
  'canada': 'Canadá',
  'japan': 'Japón',
  'china': 'China',
  'india': 'India',
  'australia': 'Australia',

  // Common typos/variations
  'eeuu': 'Estados Unidos',
  'e.e.u.u.': 'Estados Unidos',
  'estados unidos de america': 'Estados Unidos',
  'reino unido de gran bretaña': 'Reino Unido',
};

/**
 * Extract nationality and map to SIRE country code
 *
 * Handles:
 * - English country names: "United States" → SIRE 249
 * - Spanish country names: "Estados Unidos" → SIRE 249
 * - Common abbreviations: "USA", "UK" → SIRE codes
 * - Fuzzy matching: "Estados Unidso" → SIRE 249
 *
 * Uses official SIRE codes from sire-catalogs.ts
 *
 * Confidence scoring:
 * - 1.00: Exact match in SIRE catalog
 * - 0.85: Fuzzy match (accents, typos)
 * - 0.70: Alias match (USA → Estados Unidos)
 * - 0.00: Not found in catalog
 *
 * @param message - Country name in English or Spanish
 * @returns Extraction result with SIRE country code
 */
export function extractNationality(message: string): ExtractionResult<string> {
  const warnings: string[] = [];
  const cleaned = message.trim().toLowerCase();

  if (!cleaned) {
    return {
      value: null,
      confidence: 0,
      rawInput: message,
      warnings: ['País vacío']
    };
  }

  // Try alias first (USA, UK, etc.)
  const alias = COUNTRY_ALIASES[cleaned];
  if (alias) {
    const code = getSIRECountryCode(alias);
    if (code) {
      return {
        value: code,
        confidence: 0.90,
        rawInput: message,
        warnings: [`Alias detectado: "${message}" → "${alias}"`]
      };
    }
  }

  // Try direct SIRE catalog lookup (fuzzy search)
  const code = getSIRECountryCode(message);

  if (!code) {
    warnings.push(`País no encontrado en catálogo SIRE: "${message}". Verificar ortografía.`);
    return {
      value: null,
      confidence: 0,
      rawInput: message,
      warnings
    };
  }

  // Find matched country name for confidence scoring
  const matchedCountry = countryCatalog.find(c => c.codigo === code);
  const matchedName = matchedCountry?.nombre || '';

  // Calculate confidence based on string similarity
  const normalizedInput = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedMatch = matchedName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const confidence = normalizedInput === normalizedMatch ? 1.00 : 0.85;

  return {
    value: code,
    confidence,
    rawInput: message,
    warnings: confidence < 1.00 ? [`Fuzzy match: "${message}" → "${matchedName}"`] : undefined
  };
}

// ============================================================================
// DOCUMENT NUMBER EXTRACTION
// ============================================================================

/**
 * Extract and clean document number
 *
 * Handles:
 * - Passport format: "AB-123456" → "AB123456"
 * - With spaces: "AB 123456" → "AB123456"
 * - Uppercase normalization: "ab123456" → "AB123456"
 * - Special characters removal: "AB.123.456" → "AB123456"
 *
 * Validates:
 * - Length: 6-15 characters (SIRE requirement)
 * - Format: Alphanumeric only (A-Z, 0-9)
 *
 * Confidence scoring:
 * - 1.00: 6-15 alphanumeric chars
 * - 0.80: < 6 chars (too short, warning)
 * - 0.80: > 15 chars (too long, warning)
 * - 0.00: Empty or invalid
 *
 * @param message - Document number as entered by user
 * @returns Extraction result with cleaned document number
 */
export function extractDocumentNumber(message: string): ExtractionResult<string> {
  const warnings: string[] = [];

  // Remove hyphens, spaces, dots, and other non-alphanumeric characters
  const cleaned = message
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!cleaned) {
    return {
      value: null,
      confidence: 0,
      rawInput: message,
      warnings: ['Número de documento vacío o inválido']
    };
  }

  // Validate length (SIRE requires 6-15 chars)
  if (cleaned.length < 6) {
    warnings.push(`Número muy corto (${cleaned.length} caracteres). SIRE requiere 6-15 caracteres.`);
    return {
      value: cleaned,
      confidence: 0.60,
      rawInput: message,
      warnings
    };
  }

  if (cleaned.length > 15) {
    warnings.push(`Número muy largo (${cleaned.length} caracteres). SIRE permite máximo 15 caracteres.`);
    return {
      value: cleaned.substring(0, 15), // Truncate
      confidence: 0.70,
      rawInput: message,
      warnings
    };
  }

  // Valid document number
  return {
    value: cleaned,
    confidence: 1.00,
    rawInput: message,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// ============================================================================
// LOCATION EXTRACTION (Procedencia/Destino)
// ============================================================================

/**
 * Extract location and map to SIRE/DIVIPOLA code
 *
 * Tries Colombian cities first (DIVIPOLA 5 digits), then countries (SIRE 1-3 digits).
 *
 * Examples:
 * - "Bogotá" → DIVIPOLA "11001" (city)
 * - "Estados Unidos" → SIRE "249" (country)
 * - "Medellín" → DIVIPOLA "05001" (city)
 *
 * Confidence scoring:
 * - 1.00: Colombian city found
 * - 0.90: Country found
 * - 0.00: Not found
 *
 * @param message - Location name in Spanish
 * @returns Extraction result with SIRE/DIVIPOLA code
 */
export function extractLocation(message: string): ExtractionResult<LocationResult> {
  const warnings: string[] = [];
  const cleaned = message.trim();

  if (!cleaned) {
    return {
      value: null,
      confidence: 0,
      rawInput: message,
      warnings: ['Ubicación vacía']
    };
  }

  // Try Colombian city first (DIVIPOLA)
  const cityCode = getDIVIPOLACityCode(cleaned);
  if (cityCode) {
    return {
      value: {
        code: cityCode,
        type: 'city',
        name: cleaned
      },
      confidence: 1.00,
      rawInput: message,
    };
  }

  // Fallback to country (SIRE)
  const countryCode = getSIRECountryCode(cleaned);
  if (countryCode) {
    const matchedCountry = countryCatalog.find(c => c.codigo === countryCode);
    return {
      value: {
        code: countryCode,
        type: 'country',
        name: matchedCountry?.nombre || cleaned
      },
      confidence: 0.90,
      rawInput: message,
    };
  }

  // Not found
  warnings.push(`Ubicación no encontrada: "${cleaned}". Verificar nombre de ciudad colombiana o país.`);
  return {
    value: null,
    confidence: 0,
    rawInput: message,
    warnings
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date components to ISO string (YYYY-MM-DD)
 */
function formatToISO(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Validate text contains only letters (with accents and Ñ)
 *
 * Removes numbers and special characters.
 * Preserves: a-z, A-Z, áéíóúÁÉÍÓÚ, ñÑ, spaces, hyphens, apostrophes
 */
function validateOnlyLetters(text: string): string {
  // Allow letters (with accents), Ñ, spaces, hyphens, apostrophes
  const cleaned = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]/g, '');
  return cleaned.trim();
}
