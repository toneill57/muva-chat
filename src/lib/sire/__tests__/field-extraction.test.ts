/**
 * Field Extraction Tests
 *
 * Tests for OCR → SIRE field mapping and validation
 *
 * @module field-extraction.test
 * @created December 23, 2025
 */

import {
  splitFullName,
  mapNationalityToSIRE,
  detectDocumentType,
  normalizeDateFormat,
  mapPassportToSIRE,
  validateExtractedFields,
  calculateOverallConfidence
} from '../field-extraction';
import { PassportData } from '../document-ocr';

describe('Field Extraction - Name Splitting', () => {
  test('should split "SURNAME, GIVEN NAMES" format correctly', () => {
    const result = splitFullName('SMITH, JOHN MICHAEL');

    expect(result.success).toBe(true);
    expect(result.primerApellido).toBe('SMITH');
    expect(result.segundoApellido).toBeUndefined();
    expect(result.nombres).toBe('JOHN MICHAEL');
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  test('should split Hispanic double surnames correctly', () => {
    const result = splitFullName('GARCIA LOPEZ, MARIA ELENA');

    expect(result.success).toBe(true);
    expect(result.primerApellido).toBe('GARCIA');
    expect(result.segundoApellido).toBe('LOPEZ');
    expect(result.nombres).toBe('MARIA ELENA');
    expect(result.confidence).toBeGreaterThan(0.90);
  });

  test('should handle single surname format', () => {
    const result = splitFullName('JOHN SMITH');

    expect(result.success).toBe(true);
    expect(result.nombres).toBe('JOHN');
    expect(result.primerApellido).toBe('SMITH');
  });

  test('should handle compound surnames', () => {
    const result = splitFullName('VAN DER BERG, JOHANNES');

    expect(result.success).toBe(true);
    expect(result.primerApellido).toBe('VAN');
    expect(result.segundoApellido).toBe('DER BERG');
    expect(result.nombres).toBe('JOHANNES');
  });

  test('should handle empty string', () => {
    const result = splitFullName('');

    expect(result.success).toBe(false);
    expect(result.confidence).toBe(0);
  });
});

describe('Field Extraction - Nationality Mapping', () => {
  test('should map USA to SIRE code 249', () => {
    const result = mapNationalityToSIRE('United States');

    expect(result.success).toBe(true);
    expect(result.code).toBe('249');
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  test('should map Colombia to SIRE code 169', () => {
    const result = mapNationalityToSIRE('Colombia');

    expect(result.success).toBe(true);
    expect(result.code).toBe('169');
  });

  test('should handle case-insensitive matching', () => {
    const result = mapNationalityToSIRE('SPAIN');

    expect(result.success).toBe(true);
    expect(result.code).toBe('217');
  });

  test('should handle country code aliases', () => {
    expect(mapNationalityToSIRE('USA').code).toBe('249');
    expect(mapNationalityToSIRE('UK').code).toBe('248');
    expect(mapNationalityToSIRE('ESP').code).toBe('217');
  });

  test('should fail for unknown countries', () => {
    const result = mapNationalityToSIRE('Narnia');

    expect(result.success).toBe(false);
  });
});

describe('Field Extraction - Document Type Detection', () => {
  test('should detect passport from alphanumeric format', () => {
    expect(detectDocumentType('AB123456')).toBe('3');
    expect(detectDocumentType('PA1234567')).toBe('3');
  });

  test('should detect diplomatic passport', () => {
    expect(detectDocumentType('DA1234567')).toBe('46');
    expect(detectDocumentType('D1234567')).toBe('46');
  });

  test('should detect cédula from numeric format', () => {
    expect(detectDocumentType('1234567890')).toBe('5');
  });

  test('should handle document numbers with separators', () => {
    expect(detectDocumentType('AB-123456')).toBe('3');
    expect(detectDocumentType('AB 123456')).toBe('3');
  });

  test('should default to passport for unknown formats', () => {
    expect(detectDocumentType('')).toBe('3');
    expect(detectDocumentType('UNKNOWN123')).toBe('3');
  });
});

describe('Field Extraction - Date Normalization', () => {
  test('should normalize passport date format (DD MMM YYYY)', () => {
    expect(normalizeDateFormat('25 MAR 1985')).toBe('25/03/1985');
    expect(normalizeDateFormat('15 JUL 2025')).toBe('15/07/2025');
  });

  test('should normalize ISO date format (YYYY-MM-DD)', () => {
    expect(normalizeDateFormat('1985-03-25')).toBe('25/03/1985');
    expect(normalizeDateFormat('2025-07-15')).toBe('15/07/2025');
  });

  test('should pass through DD/MM/YYYY format', () => {
    expect(normalizeDateFormat('25/03/1985')).toBe('25/03/1985');
  });

  test('should handle Spanish month abbreviations', () => {
    expect(normalizeDateFormat('25 ENE 1985')).toBe('25/01/1985');
    expect(normalizeDateFormat('15 DIC 2025')).toBe('15/12/2025');
  });

  test('should return null for invalid formats', () => {
    expect(normalizeDateFormat('')).toBeNull();
    expect(normalizeDateFormat('invalid date')).toBeNull();
  });
});

describe('Field Extraction - Full Passport Mapping', () => {
  test('should map complete passport data to SIRE format', () => {
    const passportData: PassportData = {
      fullName: 'SMITH, JOHN MICHAEL',
      passportNumber: 'AB1234567',
      nationality: 'United States',
      birthDate: '25 MAR 1985',
      expiryDate: '25 MAR 2035',
      placeOfBirth: 'New York',
      issueDate: '26 MAR 2025',
      issuingAuthority: 'United States'
    };

    const result = mapPassportToSIRE(passportData);

    expect(result.sireData.primer_apellido).toBe('SMITH');
    expect(result.sireData.nombres).toBe('JOHN MICHAEL');
    expect(result.sireData.documento_numero).toBe('AB1234567');
    expect(result.sireData.tipo_documento).toBe('3');
    expect(result.sireData.codigo_nacionalidad).toBe('249');
    expect(result.sireData.fecha_nacimiento).toBe('25/03/1985');
    expect(result.errors).toHaveLength(0);
  });

  test('should handle Hispanic names correctly', () => {
    const passportData: PassportData = {
      fullName: 'GARCIA LOPEZ, MARIA ELENA',
      passportNumber: 'PA7654321',
      nationality: 'Colombia',
      birthDate: '15/05/1990',
      expiryDate: null,
      placeOfBirth: null,
      issueDate: null,
      issuingAuthority: null
    };

    const result = mapPassportToSIRE(passportData);

    expect(result.sireData.primer_apellido).toBe('GARCIA');
    expect(result.sireData.segundo_apellido).toBe('LOPEZ');
    expect(result.sireData.nombres).toBe('MARIA ELENA');
    expect(result.sireData.codigo_nacionalidad).toBe('169');
  });

  test('should report errors for missing required fields', () => {
    const passportData: PassportData = {
      fullName: null,
      passportNumber: null,
      nationality: null,
      birthDate: null,
      expiryDate: null,
      placeOfBirth: null,
      issueDate: null,
      issuingAuthority: null
    };

    const result = mapPassportToSIRE(passportData);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors).toContain('Nombre completo no encontrado en el documento');
    expect(result.errors).toContain('Número de pasaporte no encontrado');
    expect(result.errors).toContain('Nacionalidad no encontrada en el documento');
  });

});

describe('Field Extraction - Validation', () => {
  test('should validate correct SIRE data', () => {
    const sireData = {
      primer_apellido: 'SMITH',
      nombres: 'JOHN',
      documento_numero: 'AB123456',
      fecha_nacimiento: '25/03/1985',
      codigo_nacionalidad: '249'
    };

    const validation = validateExtractedFields(sireData);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should reject invalid document numbers', () => {
    const sireData = {
      documento_numero: '123' // Too short
    };

    const validation = validateExtractedFields(sireData);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('should reject invalid name characters', () => {
    const sireData = {
      primer_apellido: 'SMITH123' // Contains numbers
    };

    const validation = validateExtractedFields(sireData);

    expect(validation.valid).toBe(false);
  });

  test('should reject future birth dates', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateStr = `${String(futureDate.getDate()).padStart(2, '0')}/${String(futureDate.getMonth() + 1).padStart(2, '0')}/${futureDate.getFullYear()}`;

    const sireData = {
      fecha_nacimiento: dateStr
    };

    const validation = validateExtractedFields(sireData);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Fecha de nacimiento no puede ser en el futuro');
  });

  test('should warn about unusual ages', () => {
    const sireData = {
      fecha_nacimiento: '01/01/1850' // 175 years old
    };

    const validation = validateExtractedFields(sireData);

    expect(validation.warnings.length).toBeGreaterThan(0);
  });
});

describe('Field Extraction - Confidence Calculation', () => {
  test('should calculate average confidence correctly', () => {
    const confidence = {
      nombre: 0.92,
      documento: 0.95,
      nacionalidad: 0.90
    };

    const overall = calculateOverallConfidence(confidence, []);

    expect(overall).toBeCloseTo((0.92 + 0.95 + 0.90) / 3, 2);
  });

  test('should penalize confidence for errors', () => {
    const confidence = {
      nombre: 0.90,
      documento: 0.90
    };

    const withErrors = calculateOverallConfidence(confidence, ['Error 1', 'Error 2']);
    const withoutErrors = calculateOverallConfidence(confidence, []);

    expect(withErrors).toBeLessThan(withoutErrors);
  });

  test('should return 0 for empty confidence', () => {
    const overall = calculateOverallConfidence({}, []);

    expect(overall).toBe(0);
  });

  test('should cap error penalty at 0.5', () => {
    const confidence = { field: 0.90 };
    const manyErrors = Array(10).fill('Error');

    const overall = calculateOverallConfidence(confidence, manyErrors);

    expect(overall).toBeGreaterThanOrEqual(0.40); // 0.90 - 0.50 max penalty
  });
});
