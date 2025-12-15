/**
 * SIRE Entity Extraction Tests
 *
 * Unit tests for entity extraction functions.
 */

import { describe, it, expect } from '@jest/globals';
import {
  extractSIREEntities,
  extractFullName,
  extractBirthDate,
  extractNationality,
  extractDocumentNumber,
  extractLocation,
} from '../entity-extraction';

describe('extractFullName', () => {
  it('should extract 3-part name (ideal case)', () => {
    const result = extractFullName('John Smith Anderson');

    expect(result.value).toEqual({
      nombres: 'JOHN',
      primerApellido: 'SMITH',
      segundoApellido: 'ANDERSON'
    });
    expect(result.confidence).toBe(1.00);
  });

  it('should extract 4+ part name (compound first name)', () => {
    const result = extractFullName('John Michael Smith Anderson');

    expect(result.value).toEqual({
      nombres: 'JOHN MICHAEL',
      primerApellido: 'SMITH',
      segundoApellido: 'ANDERSON'
    });
    expect(result.confidence).toBe(0.90);
  });

  it('should handle 2-part name (no second surname)', () => {
    const result = extractFullName('John Smith');

    expect(result.value).toEqual({
      nombres: 'JOHN',
      primerApellido: 'SMITH',
      segundoApellido: ''
    });
    expect(result.confidence).toBe(0.80);
  });

  it('should handle Spanish format "Apellidos, Nombres"', () => {
    const result = extractFullName('García Pérez, Juan Pablo');

    expect(result.value).toEqual({
      nombres: 'JUAN PABLO',
      primerApellido: 'GARCÍA',
      segundoApellido: 'PÉREZ'
    });
    expect(result.confidence).toBe(1.00);
  });

  it('should handle accents and special characters', () => {
    const result = extractFullName("María José O'Connor-Sánchez");

    // Note: Hyphenated names count as single word (O'Connor-Sánchez = 1 word)
    // So "María José O'Connor-Sánchez" = 3 words total
    expect(result.value).toEqual({
      nombres: 'MARÍA',
      primerApellido: 'JOSÉ',
      segundoApellido: "O'CONNOR-SÁNCHEZ"
    });
    expect(result.confidence).toBe(1.00);
  });

  it('should handle 1-word name (incomplete)', () => {
    const result = extractFullName('John');

    expect(result.value).toEqual({
      nombres: 'JOHN',
      primerApellido: '',
      segundoApellido: ''
    });
    expect(result.confidence).toBe(0.40);
    expect(result.warnings).toBeDefined();
  });
});

describe('extractBirthDate', () => {
  it('should parse Spanish long format "25 de marzo de 1985"', () => {
    const result = extractBirthDate('25 de marzo de 1985');

    expect(result.value).toBe('1985-03-25');
    expect(result.confidence).toBe(1.00);
  });

  it('should parse English format "March 25, 1985"', () => {
    const result = extractBirthDate('March 25, 1985');

    expect(result.value).toBe('1985-03-25');
    expect(result.confidence).toBe(1.00);
  });

  it('should parse slash format "25/03/1985"', () => {
    const result = extractBirthDate('25/03/1985');

    expect(result.value).toBe('1985-03-25');
    expect(result.confidence).toBe(1.00);
  });

  it('should parse ISO format "1985-03-25"', () => {
    const result = extractBirthDate('1985-03-25');

    expect(result.value).toBe('1985-03-25');
    expect(result.confidence).toBe(1.00);
  });

  it('should handle months in Spanish', () => {
    const months = [
      { input: '15 de enero de 1990', expected: '1990-01-15' },
      { input: '28 de febrero de 1990', expected: '1990-02-28' },
      { input: '25 de diciembre de 1985', expected: '1985-12-25' }
    ];

    months.forEach(({ input, expected }) => {
      const result = extractBirthDate(input);
      expect(result.value).toBe(expected);
      expect(result.confidence).toBe(1.00);
    });
  });

  it('should handle months in English', () => {
    const months = [
      { input: 'January 15, 1990', expected: '1990-01-15' },
      { input: 'December 25, 1985', expected: '1985-12-25' }
    ];

    months.forEach(({ input, expected }) => {
      const result = extractBirthDate(input);
      expect(result.value).toBe(expected);
      expect(result.confidence).toBe(1.00);
    });
  });

  it('should warn for minor age (< 18)', () => {
    const result = extractBirthDate('01/01/2010'); // ~15 years old

    expect(result.confidence).toBe(0.80);
    expect(result.warnings).toBeDefined();
    expect(result.warnings![0]).toContain('menor de 18');
  });

  it('should reject invalid dates', () => {
    const result = extractBirthDate('32/13/2025'); // Invalid day/month

    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('should reject future dates', () => {
    const result = extractBirthDate('01/01/2030');

    expect(result.confidence).toBeLessThan(1.00);
    expect(result.warnings).toBeDefined();
  });

  it('should reject invalid formats', () => {
    const result = extractBirthDate('not a date');

    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.warnings).toBeDefined();
  });
});

describe('extractNationality', () => {
  it('should map "Estados Unidos" to SIRE code 249', () => {
    const result = extractNationality('Estados Unidos');

    expect(result.value).toBe('249'); // SIRE code, NOT ISO 840
    expect(result.confidence).toBeGreaterThan(0.80);
  });

  it('should map "USA" alias to SIRE code 249', () => {
    const result = extractNationality('USA');

    expect(result.value).toBe('249');
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  it('should map "United States" alias to SIRE code 249', () => {
    const result = extractNationality('United States');

    expect(result.value).toBe('249');
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  it('should map "Colombia" to SIRE code 169', () => {
    const result = extractNationality('Colombia');

    expect(result.value).toBe('169'); // SIRE code, NOT ISO 170
    expect(result.confidence).toBeGreaterThan(0.80);
  });

  it('should map "España" to SIRE code 245', () => {
    const result = extractNationality('España');

    expect(result.value).toBe('245'); // SIRE code, NOT ISO 724
    expect(result.confidence).toBeGreaterThan(0.80);
  });

  it('should handle fuzzy matches (accents)', () => {
    const result = extractNationality('Espana'); // Without accent

    expect(result.value).toBe('245');
    expect(result.confidence).toBeGreaterThan(0.80);
  });

  it('should reject unknown countries', () => {
    const result = extractNationality('Narnia');

    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.warnings).toBeDefined();
  });
});

describe('extractDocumentNumber', () => {
  it('should clean passport format "AB-123456"', () => {
    const result = extractDocumentNumber('AB-123456');

    expect(result.value).toBe('AB123456');
    expect(result.confidence).toBe(1.00);
  });

  it('should clean passport with spaces "AB 123456"', () => {
    const result = extractDocumentNumber('AB 123456');

    expect(result.value).toBe('AB123456');
    expect(result.confidence).toBe(1.00);
  });

  it('should uppercase lowercase input', () => {
    const result = extractDocumentNumber('ab123456');

    expect(result.value).toBe('AB123456');
    expect(result.confidence).toBe(1.00);
  });

  it('should remove special characters', () => {
    const result = extractDocumentNumber('AB.123.456');

    expect(result.value).toBe('AB123456');
    expect(result.confidence).toBe(1.00);
  });

  it('should handle 15-char limit', () => {
    const result = extractDocumentNumber('AB123456789012345'); // 17 chars

    expect(result.value).toBe('AB1234567890123'); // Truncated to 15
    expect(result.confidence).toBe(0.70);
    expect(result.warnings).toBeDefined();
  });

  it('should warn for short numbers (< 6 chars)', () => {
    const result = extractDocumentNumber('AB123');

    expect(result.confidence).toBe(0.60);
    expect(result.warnings).toBeDefined();
  });

  it('should reject empty input', () => {
    const result = extractDocumentNumber('');

    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
  });
});

describe('extractLocation', () => {
  it('should map "Bogotá" to DIVIPOLA code 11001', () => {
    const result = extractLocation('Bogotá');

    expect(result.value).toEqual({
      code: '11001',
      type: 'city',
      name: 'Bogotá'
    });
    expect(result.confidence).toBe(1.00);
  });

  it('should map "Medellín" to DIVIPOLA code 5001', () => {
    const result = extractLocation('Medellín');

    expect(result.value?.code).toBe('5001');
    expect(result.value?.type).toBe('city');
    expect(result.confidence).toBe(1.00);
  });

  it('should fallback to country code for "Estados Unidos"', () => {
    const result = extractLocation('Estados Unidos');

    expect(result.value?.code).toBe('249');
    expect(result.value?.type).toBe('country');
    expect(result.confidence).toBe(0.90);
  });

  it('should handle fuzzy city match (without accent)', () => {
    const result = extractLocation('Bogota'); // Without accent

    expect(result.value?.code).toBe('11001');
    expect(result.confidence).toBe(1.00);
  });

  it('should reject unknown locations', () => {
    const result = extractLocation('Unknown City');

    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.warnings).toBeDefined();
  });
});

describe('extractSIREEntities (router)', () => {
  it('should route to extractFullName for "full_name" field', () => {
    const result = extractSIREEntities('John Smith Anderson', 'full_name');

    expect(result.value).toHaveProperty('nombres');
    expect(result.value).toHaveProperty('primerApellido');
    expect(result.value).toHaveProperty('segundoApellido');
  });

  it('should route to extractBirthDate for "birth_date" field', () => {
    const result = extractSIREEntities('25/03/1985', 'birth_date');

    expect(result.value).toBe('1985-03-25');
  });

  it('should route to extractNationality for "nationality" field', () => {
    const result = extractSIREEntities('Estados Unidos', 'nationality');

    expect(result.value).toBe('249');
  });

  it('should route to extractDocumentNumber for "document_number" field', () => {
    const result = extractSIREEntities('AB-123456', 'document_number');

    expect(result.value).toBe('AB123456');
  });

  it('should route to extractLocation for "origin" field', () => {
    const result = extractSIREEntities('Bogotá', 'origin');

    expect(result.value).toHaveProperty('code');
    expect(result.value).toHaveProperty('type');
  });

  it('should return null for unknown field names', () => {
    const result = extractSIREEntities('test', 'unknown_field');

    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('should handle empty input', () => {
    const result = extractSIREEntities('', 'full_name');

    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
  });
});
