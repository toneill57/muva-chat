/**
 * SIRE Validation Module
 *
 * Comprehensive validation of guest reservation data before TXT file generation.
 * Ensures all 13 SIRE mandatory fields meet official requirements.
 *
 * IMPORTANT: This module validates data BEFORE TXT export to prevent rejections
 * by the Migración Colombia portal.
 *
 * Features:
 * - Field-level validation (format, length, ranges)
 * - SIRE code verification (document types, nationalities)
 * - Date format validation (DD/MM/YYYY strict)
 * - Detailed error/warning reporting
 *
 * @module sire-validation
 * @created December 23, 2025
 * @context SIRE Auto-Submission FASE 3, Tarea 3.3
 */

import { getSIRECountryName } from './sire-catalogs';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Validation result for a single reservation
 *
 * Contains validation status, detailed errors, warnings, and field-level status.
 */
export interface ValidationResult {
  /** Whether reservation passes all validation checks */
  valid: boolean;

  /** Critical errors that exclude reservation from TXT file */
  errors: string[];

  /** Warnings that don't exclude but should be reviewed */
  warnings: string[];

  /** Field-level validation status */
  fieldStatus: Record<string, 'valid' | 'invalid' | 'missing'>;
}

/**
 * Guest reservation data for SIRE validation
 *
 * Matches the structure expected from guest_reservations table.
 */
export interface SIREReservationData {
  // Establecimiento (from tenant)
  codigo_establecimiento?: string;  // Hotel SIRE code
  codigo_municipio?: string;        // City DIVIPOLA code

  // Documento
  tipo_documento?: string | number; // 3, 5, 10, 46 - SIRE official codes only
  numero_documento?: string;        // Document number

  // Datos personales
  primer_apellido?: string;
  segundo_apellido?: string;        // Optional
  nombres?: string;
  fecha_nacimiento?: string;        // DD/MM/YYYY

  // Nacionalidad
  nacionalidad?: string | number;   // SIRE country code

  // Movimiento
  tipo_movimiento?: 'E' | 'S';      // E=Entrada, S=Salida
  fecha_movimiento?: string;        // DD/MM/YYYY
  lugar_procedencia?: string;       // Código país/ciudad de origen
  lugar_destino?: string;            // Código país/ciudad de destino
}

// ============================================================================
// CONSTANTS - Official SIRE Codes
// ============================================================================

/**
 * Valid SIRE document type codes
 *
 * Source: docs/features/sire-compliance/CODIGOS_OFICIALES.md
 */
/**
 * SIRE Valid Document Types - ONLY 4 codes accepted by official SIRE system
 * Source: _assets/sire/pasos-para-reportar-al-sire.md
 */
const VALID_DOCUMENT_TYPES = new Set(['3', '5', '10', '46']);

/**
 * Document type names for error messages
 */
const DOCUMENT_TYPE_NAMES: Record<string, string> = {
  '3': 'Pasaporte',
  '5': 'Cédula de extranjería',
  '10': 'Documento extranjero (Mercosur/CAN)',
  '46': 'Carné diplomático'
};

/**
 * Colombia SIRE code (NOT ISO 170)
 *
 * Reference for nationality validation
 */
const COLOMBIA_SIRE_CODE = '169';

/**
 * Valid movement types
 */
const VALID_MOVEMENT_TYPES = new Set(['E', 'S']);

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Main validation function: Validate reservation data for SIRE compliance
 *
 * Validates ALL 13 mandatory SIRE fields required before TXT generation.
 *
 * Fields validated (13 campos obligatorios):
 * 1. codigo_establecimiento
 * 2. codigo_municipio
 * 3. tipo_documento
 * 4. numero_documento
 * 5. primer_apellido
 * 6. segundo_apellido (optional)
 * 7. nombres
 * 8. fecha_nacimiento
 * 9. nacionalidad
 * 10. tipo_movimiento
 * 11. fecha_movimiento
 * 12. lugar_procedencia
 * 13. lugar_destino
 *
 * @param reservation - Guest reservation data to validate
 * @returns Validation result with errors, warnings, and field status
 *
 * @example
 * const reservation = {
 *   codigo_establecimiento: '12345',
 *   codigo_municipio: '88001',
 *   tipo_documento: '3',
 *   numero_documento: 'AB1234567',
 *   primer_apellido: 'Smith',
 *   nombres: 'John',
 *   fecha_nacimiento: '25/03/1985',
 *   nacionalidad: '249',
 *   tipo_movimiento: 'E',
 *   fecha_movimiento: '15/12/2025',
 *   lugar_procedencia: '249',
 *   lugar_destino: '169'
 * };
 *
 * const result = validateForSIRE(reservation);
 * if (result.valid) {
 *   // Include in TXT file
 * } else {
 *   // Log errors and exclude
 *   console.error('Validation failed:', result.errors);
 * }
 */
export function validateForSIRE(
  reservation: SIREReservationData
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fieldStatus: Record<string, 'valid' | 'invalid' | 'missing'> = {};

  // ========================================
  // 1. codigo_establecimiento
  // ========================================
  const establecimiento = validateEstablecimiento(reservation.codigo_establecimiento);
  if (!establecimiento.valid) {
    errors.push(...establecimiento.errors);
    fieldStatus.codigo_establecimiento = establecimiento.status;
  } else {
    fieldStatus.codigo_establecimiento = 'valid';
    if (establecimiento.warnings.length > 0) {
      warnings.push(...establecimiento.warnings);
    }
  }

  // ========================================
  // 2. codigo_municipio
  // ========================================
  const municipio = validateMunicipio(reservation.codigo_municipio);
  if (!municipio.valid) {
    errors.push(...municipio.errors);
    fieldStatus.codigo_municipio = municipio.status;
  } else {
    fieldStatus.codigo_municipio = 'valid';
  }

  // ========================================
  // 3. tipo_documento
  // ========================================
  const tipoDoc = validateTipoDocumento(reservation.tipo_documento);
  if (!tipoDoc.valid) {
    errors.push(...tipoDoc.errors);
    fieldStatus.tipo_documento = tipoDoc.status;
  } else {
    fieldStatus.tipo_documento = 'valid';
  }

  // ========================================
  // 4. numero_documento
  // ========================================
  const numeroDoc = validateNumeroDocumento(reservation.numero_documento);
  if (!numeroDoc.valid) {
    errors.push(...numeroDoc.errors);
    fieldStatus.numero_documento = numeroDoc.status;
  } else {
    fieldStatus.numero_documento = 'valid';
  }

  // ========================================
  // 5. primer_apellido
  // ========================================
  const primerApellido = validatePrimerApellido(reservation.primer_apellido);
  if (!primerApellido.valid) {
    errors.push(...primerApellido.errors);
    fieldStatus.primer_apellido = primerApellido.status;
  } else {
    fieldStatus.primer_apellido = 'valid';
  }

  // ========================================
  // 6. segundo_apellido (optional)
  // ========================================
  const segundoApellido = validateSegundoApellido(reservation.segundo_apellido);
  if (!segundoApellido.valid) {
    warnings.push(...segundoApellido.errors); // Warnings only, not critical
    fieldStatus.segundo_apellido = 'valid'; // Don't fail validation
  } else {
    fieldStatus.segundo_apellido = 'valid';
  }

  // ========================================
  // 7. nombres
  // ========================================
  const nombres = validateNombres(reservation.nombres);
  if (!nombres.valid) {
    errors.push(...nombres.errors);
    fieldStatus.nombres = nombres.status;
  } else {
    fieldStatus.nombres = 'valid';
  }

  // ========================================
  // 8. fecha_nacimiento
  // ========================================
  const fechaNacimiento = validateFechaNacimiento(reservation.fecha_nacimiento);
  if (!fechaNacimiento.valid) {
    errors.push(...fechaNacimiento.errors);
    fieldStatus.fecha_nacimiento = fechaNacimiento.status;
  } else {
    fieldStatus.fecha_nacimiento = 'valid';
    if (fechaNacimiento.warnings.length > 0) {
      warnings.push(...fechaNacimiento.warnings);
    }
  }

  // ========================================
  // 9. nacionalidad
  // ========================================
  const nacionalidad = validateNacionalidad(reservation.nacionalidad);
  if (!nacionalidad.valid) {
    errors.push(...nacionalidad.errors);
    fieldStatus.nacionalidad = nacionalidad.status;
  } else {
    fieldStatus.nacionalidad = 'valid';
  }

  // ========================================
  // 10. tipo_movimiento
  // ========================================
  const tipoMovimiento = validateTipoMovimiento(reservation.tipo_movimiento);
  if (!tipoMovimiento.valid) {
    errors.push(...tipoMovimiento.errors);
    fieldStatus.tipo_movimiento = tipoMovimiento.status;
  } else {
    fieldStatus.tipo_movimiento = 'valid';
  }

  // ========================================
  // 11. fecha_movimiento
  // ========================================
  const fechaMovimiento = validateFechaMovimiento(reservation.fecha_movimiento);
  if (!fechaMovimiento.valid) {
    errors.push(...fechaMovimiento.errors);
    fieldStatus.fecha_movimiento = fechaMovimiento.status;
  } else {
    fieldStatus.fecha_movimiento = 'valid';
  }

  // ========================================
  // 12. lugar_procedencia
  // ========================================
  const lugarProcedencia = validateLugarProcedencia(reservation.lugar_procedencia);
  if (!lugarProcedencia.valid) {
    errors.push(...lugarProcedencia.errors);
    fieldStatus.lugar_procedencia = lugarProcedencia.status;
  } else {
    fieldStatus.lugar_procedencia = 'valid';
  }

  // ========================================
  // 13. lugar_destino
  // ========================================
  const lugarDestino = validateLugarDestino(reservation.lugar_destino);
  if (!lugarDestino.valid) {
    errors.push(...lugarDestino.errors);
    fieldStatus.lugar_destino = lugarDestino.status;
  } else {
    fieldStatus.lugar_destino = 'valid';
  }

  // ========================================
  // Cross-field validation
  // ========================================
  if (reservation.fecha_nacimiento && reservation.fecha_movimiento) {
    const crossValidation = validateCrossFields(
      reservation.fecha_nacimiento,
      reservation.fecha_movimiento
    );
    if (crossValidation.warnings.length > 0) {
      warnings.push(...crossValidation.warnings);
    }
  }

  // ========================================
  // Final result
  // ========================================
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fieldStatus
  };
}

// ============================================================================
// FIELD-LEVEL VALIDATORS
// ============================================================================

/**
 * Validate codigo_establecimiento (hotel SIRE code)
 *
 * Requirements:
 * - Must be present
 * - Length: 4-10 characters
 * - Format: alphanumeric
 */
function validateEstablecimiento(value?: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  status: 'valid' | 'invalid' | 'missing';
} {
  if (!value) {
    return {
      valid: false,
      errors: ['Código de establecimiento es obligatorio'],
      warnings: [],
      status: 'missing'
    };
  }

  const cleaned = String(value).trim();

  if (cleaned.length < 4 || cleaned.length > 10) {
    return {
      valid: false,
      errors: ['Código de establecimiento debe tener entre 4 y 10 caracteres'],
      warnings: [],
      status: 'invalid'
    };
  }

  if (!/^[A-Z0-9]+$/i.test(cleaned)) {
    return {
      valid: false,
      errors: ['Código de establecimiento debe ser alfanumérico'],
      warnings: [],
      status: 'invalid'
    };
  }

  const warnings: string[] = [];
  if (cleaned.length < 5) {
    warnings.push('Código de establecimiento parece corto (normalmente 5+ caracteres)');
  }

  return { valid: true, errors: [], warnings, status: 'valid' };
}

/**
 * Validate codigo_municipio (DIVIPOLA city code)
 *
 * Requirements:
 * - Must be present
 * - Length: exactly 5 digits
 * - Format: numeric
 */
function validateMunicipio(value?: string): {
  valid: boolean;
  errors: string[];
  status: 'valid' | 'invalid' | 'missing';
} {
  if (!value) {
    return {
      valid: false,
      errors: ['Código de municipio es obligatorio'],
      status: 'missing'
    };
  }

  const cleaned = String(value).trim();

  if (!/^\d{5}$/.test(cleaned)) {
    return {
      valid: false,
      errors: ['Código de municipio debe ser exactamente 5 dígitos'],
      status: 'invalid'
    };
  }

  return { valid: true, errors: [], status: 'valid' };
}

/**
 * Validate tipo_documento
 *
 * Requirements:
 * - Must be present
 * - Must be one of: 1, 2, 3, 4, 5, 6, 7, 8
 */
function validateTipoDocumento(value?: string | number): {
  valid: boolean;
  errors: string[];
  status: 'valid' | 'invalid' | 'missing';
} {
  if (value === undefined || value === null || value === '') {
    return {
      valid: false,
      errors: ['Tipo de documento es obligatorio'],
      status: 'missing'
    };
  }

  const code = String(value).trim();

  if (!VALID_DOCUMENT_TYPES.has(code)) {
    const validCodes = Array.from(VALID_DOCUMENT_TYPES)
      .map(c => `${c} (${DOCUMENT_TYPE_NAMES[c]})`)
      .join(', ');
    return {
      valid: false,
      errors: [`Tipo de documento inválido: "${code}". Códigos válidos: ${validCodes}`],
      status: 'invalid'
    };
  }

  return { valid: true, errors: [], status: 'valid' };
}

/**
 * Validate numero_documento
 *
 * Requirements:
 * - Must be present
 * - Length: 1-20 characters
 * - Format: alphanumeric (letters, numbers, hyphens allowed)
 */
function validateNumeroDocumento(value?: string): {
  valid: boolean;
  errors: string[];
  status: 'valid' | 'invalid' | 'missing';
} {
  if (!value) {
    return {
      valid: false,
      errors: ['Número de documento es obligatorio'],
      status: 'missing'
    };
  }

  const cleaned = String(value).trim();

  if (cleaned.length < 1 || cleaned.length > 20) {
    return {
      valid: false,
      errors: ['Número de documento debe tener entre 1 y 20 caracteres'],
      status: 'invalid'
    };
  }

  // Allow alphanumeric plus common separators (hyphens)
  if (!/^[A-Z0-9-]+$/i.test(cleaned)) {
    return {
      valid: false,
      errors: ['Número de documento debe ser alfanumérico (letras, números, guiones)'],
      status: 'invalid'
    };
  }

  return { valid: true, errors: [], status: 'valid' };
}

/**
 * Validate primer_apellido
 *
 * Requirements:
 * - Must be present
 * - Length: 1-50 characters
 * - Format: letters, spaces, hyphens, apostrophes, accented characters
 */
function validatePrimerApellido(value?: string): {
  valid: boolean;
  errors: string[];
  status: 'valid' | 'invalid' | 'missing';
} {
  if (!value) {
    return {
      valid: false,
      errors: ['Primer apellido es obligatorio'],
      status: 'missing'
    };
  }

  const cleaned = String(value).trim();

  if (cleaned.length < 1 || cleaned.length > 50) {
    return {
      valid: false,
      errors: ['Primer apellido debe tener entre 1 y 50 caracteres'],
      status: 'invalid'
    };
  }

  // Allow letters (including Unicode/accented), spaces, hyphens, apostrophes, periods
  // \p{L} matches any Unicode letter (covers all languages)
  if (!/^[\p{L}\s'.-]+$/u.test(cleaned)) {
    return {
      valid: false,
      errors: ['Primer apellido contiene caracteres inválidos (solo letras, espacios, guiones, apóstrofes, puntos)'],
      status: 'invalid'
    };
  }

  return { valid: true, errors: [], status: 'valid' };
}

/**
 * Validate segundo_apellido (optional)
 *
 * Requirements:
 * - Optional field
 * - If present: 1-50 characters
 * - Format: letters, spaces, hyphens, apostrophes, accented characters
 */
function validateSegundoApellido(value?: string): {
  valid: boolean;
  errors: string[];
} {
  // Empty or undefined is valid (optional field)
  if (!value || String(value).trim() === '') {
    return { valid: true, errors: [] };
  }

  const cleaned = String(value).trim();

  if (cleaned.length > 50) {
    return {
      valid: false,
      errors: ['Segundo apellido no debe exceder 50 caracteres']
    };
  }

  // Allow letters (including Unicode/accented), spaces, hyphens, apostrophes, periods
  // \p{L} matches any Unicode letter (covers all languages)
  if (!/^[\p{L}\s'.-]+$/u.test(cleaned)) {
    return {
      valid: false,
      errors: ['Segundo apellido contiene caracteres inválidos (solo letras, espacios, guiones, apóstrofes, puntos)']
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate nombres
 *
 * Requirements:
 * - Must be present
 * - Length: 1-100 characters
 * - Format: letters, spaces, hyphens, apostrophes, accented characters
 */
function validateNombres(value?: string): {
  valid: boolean;
  errors: string[];
  status: 'valid' | 'invalid' | 'missing';
} {
  if (!value) {
    return {
      valid: false,
      errors: ['Nombres es obligatorio'],
      status: 'missing'
    };
  }

  const cleaned = String(value).trim();

  if (cleaned.length < 1 || cleaned.length > 100) {
    return {
      valid: false,
      errors: ['Nombres debe tener entre 1 y 100 caracteres'],
      status: 'invalid'
    };
  }

  // Allow letters (Unicode), spaces, hyphens, apostrophes, periods
  if (!/^[\p{L}\s'.-]+$/u.test(cleaned)) {
    return {
      valid: false,
      errors: ['Nombres contiene caracteres inválidos (solo letras, espacios, guiones, apóstrofes, puntos)'],
      status: 'invalid'
    };
  }

  return { valid: true, errors: [], status: 'valid' };
}

/**
 * Validate fecha_nacimiento
 *
 * Requirements:
 * - Must be present
 * - Format: DD/MM/YYYY (strict)
 * - Must be valid date
 * - Cannot be in the future
 * - Reasonable age range (0-120 years)
 */
function validateFechaNacimiento(value?: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  status: 'valid' | 'invalid' | 'missing';
} {
  if (!value) {
    return {
      valid: false,
      errors: ['Fecha de nacimiento es obligatoria'],
      warnings: [],
      status: 'missing'
    };
  }

  const cleaned = String(value).trim();

  // Strict format check: DD/MM/YYYY
  const dateMatch = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!dateMatch) {
    return {
      valid: false,
      errors: ['Fecha de nacimiento debe tener formato DD/MM/YYYY'],
      warnings: [],
      status: 'invalid'
    };
  }

  const [, dayStr, monthStr, yearStr] = dateMatch;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  // Validate date components
  if (month < 1 || month > 12) {
    return {
      valid: false,
      errors: ['Mes inválido (debe ser 01-12)'],
      warnings: [],
      status: 'invalid'
    };
  }

  if (day < 1 || day > 31) {
    return {
      valid: false,
      errors: ['Día inválido (debe ser 01-31)'],
      warnings: [],
      status: 'invalid'
    };
  }

  // Create date object (month is 0-indexed in JS)
  const date = new Date(year, month - 1, day);

  // Check if date is valid (handles leap years, month lengths)
  if (
    isNaN(date.getTime()) ||
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return {
      valid: false,
      errors: ['Fecha de nacimiento inválida (no existe en el calendario)'],
      warnings: [],
      status: 'invalid'
    };
  }

  // Check not in future
  if (date > new Date()) {
    return {
      valid: false,
      errors: ['Fecha de nacimiento no puede ser en el futuro'],
      warnings: [],
      status: 'invalid'
    };
  }

  // Check reasonable age range
  const warnings: string[] = [];
  const ageYears = (new Date().getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  if (ageYears < 0) {
    return {
      valid: false,
      errors: ['Fecha de nacimiento resulta en edad negativa'],
      warnings: [],
      status: 'invalid'
    };
  }

  if (ageYears > 120) {
    warnings.push(`Edad calculada (${Math.floor(ageYears)} años) parece inusualmente alta`);
  }

  if (ageYears < 1) {
    warnings.push(`Huésped es menor de 1 año (${Math.floor(ageYears * 12)} meses)`);
  }

  return { valid: true, errors: [], warnings, status: 'valid' };
}

/**
 * Validate nacionalidad (SIRE country code)
 *
 * Requirements:
 * - Must be present
 * - Must be valid SIRE code (100-300 range typically)
 * - Verifies against SIRE catalog
 */
function validateNacionalidad(value?: string | number): {
  valid: boolean;
  errors: string[];
  status: 'valid' | 'invalid' | 'missing';
} {
  if (value === undefined || value === null || value === '') {
    return {
      valid: false,
      errors: ['Nacionalidad es obligatoria'],
      status: 'missing'
    };
  }

  const code = String(value).trim();

  // Check if code exists in SIRE catalog
  const countryName = getSIRECountryName(code);
  if (!countryName) {
    return {
      valid: false,
      errors: [`Código de nacionalidad no reconocido: "${code}". Debe ser un código SIRE válido (ej: 169=Colombia, 249=USA)`],
      status: 'invalid'
    };
  }

  return { valid: true, errors: [], status: 'valid' };
}

/**
 * Validate tipo_movimiento
 *
 * Requirements:
 * - Must be present
 * - Must be 'E' (entrada) or 'S' (salida)
 */
function validateTipoMovimiento(value?: 'E' | 'S' | string): {
  valid: boolean;
  errors: string[];
  status: 'valid' | 'invalid' | 'missing';
} {
  if (!value) {
    return {
      valid: false,
      errors: ['Tipo de movimiento es obligatorio'],
      status: 'missing'
    };
  }

  const cleaned = String(value).trim().toUpperCase();

  if (!VALID_MOVEMENT_TYPES.has(cleaned)) {
    return {
      valid: false,
      errors: [`Tipo de movimiento inválido: "${value}". Debe ser E (entrada) o S (salida)`],
      status: 'invalid'
    };
  }

  return { valid: true, errors: [], status: 'valid' };
}

/**
 * Validate fecha_movimiento
 *
 * Requirements:
 * - Must be present
 * - Format: DD/MM/YYYY (strict)
 * - Must be valid date
 */
function validateFechaMovimiento(value?: string): {
  valid: boolean;
  errors: string[];
  status: 'valid' | 'invalid' | 'missing';
} {
  if (!value) {
    return {
      valid: false,
      errors: ['Fecha de movimiento es obligatoria'],
      status: 'missing'
    };
  }

  const cleaned = String(value).trim();

  // Strict format check: DD/MM/YYYY
  const dateMatch = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!dateMatch) {
    return {
      valid: false,
      errors: ['Fecha de movimiento debe tener formato DD/MM/YYYY'],
      status: 'invalid'
    };
  }

  const [, dayStr, monthStr, yearStr] = dateMatch;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  // Validate date components
  if (month < 1 || month > 12) {
    return {
      valid: false,
      errors: ['Mes inválido en fecha de movimiento (debe ser 01-12)'],
      status: 'invalid'
    };
  }

  if (day < 1 || day > 31) {
    return {
      valid: false,
      errors: ['Día inválido en fecha de movimiento (debe ser 01-31)'],
      status: 'invalid'
    };
  }

  // Create date object
  const date = new Date(year, month - 1, day);

  // Check if date is valid
  if (
    isNaN(date.getTime()) ||
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return {
      valid: false,
      errors: ['Fecha de movimiento inválida (no existe en el calendario)'],
      status: 'invalid'
    };
  }

  return { valid: true, errors: [], status: 'valid' };
}

/**
 * Validate lugar_procedencia (origin city/country code)
 *
 * Requirements:
 * - Must be present
 * - Format: alphanumeric code (1-10 characters)
 * - Represents SIRE country/city code
 */
function validateLugarProcedencia(value?: string): {
  valid: boolean;
  errors: string[];
  status: 'valid' | 'invalid' | 'missing';
} {
  if (!value) {
    return {
      valid: false,
      errors: ['Lugar de procedencia es obligatorio'],
      status: 'missing'
    };
  }

  const cleaned = String(value).trim();

  if (cleaned.length < 1 || cleaned.length > 10) {
    return {
      valid: false,
      errors: ['Lugar de procedencia debe ser un código válido (1-10 caracteres)'],
      status: 'invalid'
    };
  }

  // SIRE codes are typically numeric or alphanumeric
  if (!/^[A-Z0-9]+$/i.test(cleaned)) {
    return {
      valid: false,
      errors: ['Lugar de procedencia debe ser un código alfanumérico válido'],
      status: 'invalid'
    };
  }

  return { valid: true, errors: [], status: 'valid' };
}

/**
 * Validate lugar_destino (destination city/country code)
 *
 * Requirements:
 * - Must be present
 * - Format: alphanumeric code (1-10 characters)
 * - Represents SIRE country/city code
 */
function validateLugarDestino(value?: string): {
  valid: boolean;
  errors: string[];
  status: 'valid' | 'invalid' | 'missing';
} {
  if (!value) {
    return {
      valid: false,
      errors: ['Lugar de destino es obligatorio'],
      status: 'missing'
    };
  }

  const cleaned = String(value).trim();

  if (cleaned.length < 1 || cleaned.length > 10) {
    return {
      valid: false,
      errors: ['Lugar de destino debe ser un código válido (1-10 caracteres)'],
      status: 'invalid'
    };
  }

  // SIRE codes are typically numeric or alphanumeric
  if (!/^[A-Z0-9]+$/i.test(cleaned)) {
    return {
      valid: false,
      errors: ['Lugar de destino debe ser un código alfanumérico válido'],
      status: 'invalid'
    };
  }

  return { valid: true, errors: [], status: 'valid' };
}

/**
 * Cross-field validation
 *
 * Validates logical relationships between fields:
 * - Birth date must be before movement date
 * - Age at movement date must be reasonable
 */
function validateCrossFields(
  fechaNacimiento: string,
  fechaMovimiento: string
): {
  warnings: string[];
} {
  const warnings: string[] = [];

  try {
    // Parse both dates
    const birthMatch = fechaNacimiento.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const movementMatch = fechaMovimiento.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (!birthMatch || !movementMatch) {
      return { warnings }; // Already validated in field validators
    }

    const birthDate = new Date(
      parseInt(birthMatch[3]),
      parseInt(birthMatch[2]) - 1,
      parseInt(birthMatch[1])
    );

    const movementDate = new Date(
      parseInt(movementMatch[3]),
      parseInt(movementMatch[2]) - 1,
      parseInt(movementMatch[1])
    );

    // Birth date must be before movement date
    if (birthDate >= movementDate) {
      warnings.push('Fecha de nacimiento debe ser anterior a fecha de movimiento');
    }

    // Check age at movement (should be reasonable)
    const ageAtMovement = (movementDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    if (ageAtMovement < 0) {
      warnings.push('Fecha de nacimiento es posterior a fecha de movimiento');
    } else if (ageAtMovement > 120) {
      warnings.push(`Edad en fecha de movimiento (${Math.floor(ageAtMovement)} años) parece inusualmente alta`);
    }
  } catch (error) {
    // Parsing errors already caught by field validators
  }

  return { warnings };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get validation summary for reporting
 *
 * Creates a human-readable summary of validation results.
 *
 * @param result - Validation result
 * @returns Summary string
 *
 * @example
 * const summary = getValidationSummary(result);
 * console.log(summary);
 * // "VALID - 13/13 fields valid, 2 warnings"
 * // or
 * // "INVALID - 3 errors, 11/13 fields valid"
 */
export function getValidationSummary(result: ValidationResult): string {
  const totalFields = Object.keys(result.fieldStatus).length;
  const validFields = Object.values(result.fieldStatus).filter(s => s === 'valid').length;
  const invalidFields = Object.values(result.fieldStatus).filter(s => s === 'invalid').length;
  const missingFields = Object.values(result.fieldStatus).filter(s => s === 'missing').length;

  if (result.valid) {
    const warningText = result.warnings.length > 0 ? `, ${result.warnings.length} warnings` : '';
    return `VALID - ${validFields}/${totalFields} fields valid${warningText}`;
  } else {
    return `INVALID - ${result.errors.length} errors, ${invalidFields} invalid, ${missingFields} missing`;
  }
}

/**
 * Batch validate multiple reservations
 *
 * Validates an array of reservations and returns summary statistics.
 *
 * @param reservations - Array of reservations to validate
 * @returns Object with valid/invalid counts and detailed results
 *
 * @example
 * const results = batchValidate(reservations);
 * console.log(`${results.validCount}/${results.total} reservations are valid`);
 * results.invalid.forEach(({ reservation, result }) => {
 *   console.error('Invalid reservation:', result.errors);
 * });
 */
export function batchValidate(
  reservations: SIREReservationData[]
): {
  total: number;
  validCount: number;
  invalidCount: number;
  valid: Array<{ reservation: SIREReservationData; result: ValidationResult }>;
  invalid: Array<{ reservation: SIREReservationData; result: ValidationResult }>;
} {
  const valid: Array<{ reservation: SIREReservationData; result: ValidationResult }> = [];
  const invalid: Array<{ reservation: SIREReservationData; result: ValidationResult }> = [];

  for (const reservation of reservations) {
    const result = validateForSIRE(reservation);

    if (result.valid) {
      valid.push({ reservation, result });
    } else {
      invalid.push({ reservation, result });
    }
  }

  return {
    total: reservations.length,
    validCount: valid.length,
    invalidCount: invalid.length,
    valid,
    invalid
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  validateForSIRE,
  getValidationSummary,
  batchValidate
};
