/**
 * SIRE Validation Tests
 *
 * Comprehensive test suite for SIRE reservation validation module.
 *
 * @module sire-validation.test
 * @created December 23, 2025
 */

import {
  validateForSIRE,
  getValidationSummary,
  batchValidate,
  type SIREReservationData,
  type ValidationResult
} from '../sire-validation';

describe('SIRE Validation Module', () => {
  // ========================================
  // Valid Cases
  // ========================================

  describe('Valid Reservations', () => {
    it('should validate a complete valid Colombian reservation with all 13 SIRE fields', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'García',
        segundo_apellido: 'López',
        nombres: 'Juan Carlos',
        fecha_nacimiento: '15/03/1985',
        nacionalidad: '169', // Colombia
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025',
        lugar_procedencia: '249', // USA
        lugar_destino: '169' // Colombia
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fieldStatus.codigo_establecimiento).toBe('valid');
      expect(result.fieldStatus.codigo_municipio).toBe('valid');
      expect(result.fieldStatus.tipo_documento).toBe('valid');
      expect(result.fieldStatus.numero_documento).toBe('valid');
      expect(result.fieldStatus.primer_apellido).toBe('valid');
      expect(result.fieldStatus.segundo_apellido).toBe('valid');
      expect(result.fieldStatus.nombres).toBe('valid');
      expect(result.fieldStatus.fecha_nacimiento).toBe('valid');
      expect(result.fieldStatus.nacionalidad).toBe('valid');
      expect(result.fieldStatus.tipo_movimiento).toBe('valid');
      expect(result.fieldStatus.fecha_movimiento).toBe('valid');
      expect(result.fieldStatus.lugar_procedencia).toBe('valid');
      expect(result.fieldStatus.lugar_destino).toBe('valid');
    });

    it('should validate a valid foreign reservation', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '54321',
        codigo_municipio: '11001',
        tipo_documento: '3', // Pasaporte
        numero_documento: 'AB1234567',
        primer_apellido: 'Smith',
        segundo_apellido: 'Johnson',
        nombres: 'John Michael',
        fecha_nacimiento: '25/03/1985',
        nacionalidad: '249', // USA
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025',
        lugar_procedencia: '249', // USA
        lugar_destino: '169' // Colombia
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate reservation without segundo_apellido', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: 'CD9876543',
        primer_apellido: 'Tanaka',
        nombres: 'Yuki',
        fecha_nacimiento: '10/05/1990',
        nacionalidad: '193', // Japan
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025',
        lugar_procedencia: '193', // Japan
        lugar_destino: '169' // Colombia
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fieldStatus.segundo_apellido).toBe('valid');
    });

    it('should handle different document types', () => {
      // SIRE Official: Only 4 valid document type codes
      const documentTypes = ['3', '5', '10', '46'];

      documentTypes.forEach(tipo => {
        const reservation: SIREReservationData = {
          codigo_establecimiento: '12345',
          codigo_municipio: '88001',
          tipo_documento: tipo,
          numero_documento: '1234567890',
          primer_apellido: 'Test',
          nombres: 'User',
          fecha_nacimiento: '01/01/1990',
          nacionalidad: '169',
          tipo_movimiento: 'E',
          fecha_movimiento: '23/12/2025',
          lugar_procedencia: '249',
          lugar_destino: '169'
        };

        const result = validateForSIRE(reservation);
        expect(result.valid).toBe(true);
        expect(result.fieldStatus.tipo_documento).toBe('valid');
      });
    });
  });

  // ========================================
  // Invalid Cases - Missing Fields
  // ========================================

  describe('Missing Required Fields', () => {
    it('should reject reservation missing codigo_establecimiento', () => {
      const reservation: SIREReservationData = {
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Código de establecimiento es obligatorio');
      expect(result.fieldStatus.codigo_establecimiento).toBe('missing');
    });

    it('should reject reservation missing codigo_municipio', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Código de municipio es obligatorio');
      expect(result.fieldStatus.codigo_municipio).toBe('missing');
    });

    it('should reject reservation missing tipo_documento', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tipo de documento es obligatorio');
      expect(result.fieldStatus.tipo_documento).toBe('missing');
    });

    it('should reject reservation missing numero_documento', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Número de documento es obligatorio');
      expect(result.fieldStatus.numero_documento).toBe('missing');
    });

    it('should reject reservation missing primer_apellido', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Primer apellido es obligatorio');
      expect(result.fieldStatus.primer_apellido).toBe('missing');
    });

    it('should reject reservation missing nombres', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nombres es obligatorio');
      expect(result.fieldStatus.nombres).toBe('missing');
    });

    it('should reject reservation missing fecha_nacimiento', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Fecha de nacimiento es obligatoria');
      expect(result.fieldStatus.fecha_nacimiento).toBe('missing');
    });

    it('should reject reservation missing nacionalidad', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nacionalidad es obligatoria');
      expect(result.fieldStatus.nacionalidad).toBe('missing');
    });

    it('should reject reservation missing tipo_movimiento', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tipo de movimiento es obligatorio');
      expect(result.fieldStatus.tipo_movimiento).toBe('missing');
    });

    it('should reject reservation missing fecha_movimiento', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Fecha de movimiento es obligatoria');
      expect(result.fieldStatus.fecha_movimiento).toBe('missing');
    });

    it('should reject reservation missing lugar_procedencia', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025',
        lugar_destino: '169'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Lugar de procedencia es obligatorio');
      expect(result.fieldStatus.lugar_procedencia).toBe('missing');
    });

    it('should reject reservation missing lugar_destino', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025',
        lugar_procedencia: '249'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Lugar de destino es obligatorio');
      expect(result.fieldStatus.lugar_destino).toBe('missing');
    });
  });

  // ========================================
  // Invalid Cases - Format Errors
  // ========================================

  describe('Invalid Field Formats', () => {
    it('should reject codigo_establecimiento too short', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '123', // Too short (< 4)
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Código de establecimiento debe tener entre 4 y 10 caracteres');
      expect(result.fieldStatus.codigo_establecimiento).toBe('invalid');
    });

    it('should reject codigo_municipio invalid format', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: 'ABC12', // Not 5 digits
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Código de municipio debe ser exactamente 5 dígitos');
      expect(result.fieldStatus.codigo_municipio).toBe('invalid');
    });

    it('should reject invalid tipo_documento code', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '99', // Invalid code
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Tipo de documento inválido'))).toBe(true);
      expect(result.fieldStatus.tipo_documento).toBe('invalid');
    });

    it('should reject numero_documento too long', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '123456789012345678901', // > 20 chars
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Número de documento debe tener entre 1 y 20 caracteres');
      expect(result.fieldStatus.numero_documento).toBe('invalid');
    });

    it('should reject primer_apellido with invalid characters', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test@123', // Invalid characters
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('caracteres inválidos'))).toBe(true);
      expect(result.fieldStatus.primer_apellido).toBe('invalid');
    });

    it('should reject nombres with numbers', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User123', // Invalid characters
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Nombres contiene caracteres inválidos'))).toBe(true);
      expect(result.fieldStatus.nombres).toBe('invalid');
    });

    it('should reject fecha_nacimiento with wrong format', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '1990-01-01', // ISO format, not DD/MM/YYYY
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Fecha de nacimiento debe tener formato DD/MM/YYYY');
      expect(result.fieldStatus.fecha_nacimiento).toBe('invalid');
    });

    it('should reject fecha_nacimiento in future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = `${String(futureDate.getDate()).padStart(2, '0')}/${String(futureDate.getMonth() + 1).padStart(2, '0')}/${futureDate.getFullYear()}`;

      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: futureDateStr,
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Fecha de nacimiento no puede ser en el futuro');
      expect(result.fieldStatus.fecha_nacimiento).toBe('invalid');
    });

    it('should reject invalid nacionalidad code', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '999', // Invalid SIRE code
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Código de nacionalidad no reconocido'))).toBe(true);
      expect(result.fieldStatus.nacionalidad).toBe('invalid');
    });

    it('should reject invalid tipo_movimiento', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Test',
        nombres: 'User',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'X' as 'E', // Invalid
        fecha_movimiento: '23/12/2025'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Tipo de movimiento inválido'))).toBe(true);
      expect(result.fieldStatus.tipo_movimiento).toBe('invalid');
    });

    it('should reject invalid date formats', () => {
      const invalidDates = [
        '32/01/2025', // Day > 31
        '15/13/2025', // Month > 12
        '00/01/2025', // Day = 0
        '15/00/2025', // Month = 0
        '29/02/2025', // Invalid leap year
        '31/04/2025'  // April has 30 days
      ];

      invalidDates.forEach(fecha => {
        const reservation: SIREReservationData = {
          codigo_establecimiento: '12345',
          codigo_municipio: '88001',
          tipo_documento: '3',
          numero_documento: '1234567890',
          primer_apellido: 'Test',
          nombres: 'User',
          fecha_nacimiento: fecha,
          nacionalidad: '169',
          tipo_movimiento: 'E',
          fecha_movimiento: '23/12/2025'
        };

        const result = validateForSIRE(reservation);
        expect(result.valid).toBe(false);
        expect(result.fieldStatus.fecha_nacimiento).toBe('invalid');
      });
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('should handle accented characters in names', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Pérez',
        segundo_apellido: 'Núñez',
        nombres: 'José María',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025',
        lugar_procedencia: '249',
        lugar_destino: '169'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(true);
      expect(result.fieldStatus.primer_apellido).toBe('valid');
      expect(result.fieldStatus.segundo_apellido).toBe('valid');
      expect(result.fieldStatus.nombres).toBe('valid');
    });

    it('should handle compound surnames with hyphens', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: 'AB1234567',
        primer_apellido: 'Van Der Berg',
        segundo_apellido: 'Schmidt-Mueller',
        nombres: 'Hans',
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '23', // Germany (Alemania)
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025',
        lugar_procedencia: '23',
        lugar_destino: '169'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(true);
    });

    it('should handle apostrophes in names', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: 'AB1234567',
        primer_apellido: "O'Connor",
        nombres: "Siobhán",
        fecha_nacimiento: '01/01/1990',
        nacionalidad: '628', // UK - FIXED: was 248 (ESLOVENIA)
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025',
        lugar_procedencia: '628', // UK - FIXED: was 248
        lugar_destino: '169'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(true);
    });

    it('should warn about unusual ages', () => {
      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '3',
        numero_documento: '1234567890',
        primer_apellido: 'Anciano',
        nombres: 'Muy',
        fecha_nacimiento: '01/01/1900', // 125 years old
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025',
        lugar_procedencia: '249',
        lugar_destino: '169'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('inusualmente alta'))).toBe(true);
    });

    it('should warn about very young guests', () => {
      const today = new Date();
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(today.getMonth() - 6);
      const dateStr = `${String(sixMonthsAgo.getDate()).padStart(2, '0')}/${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}/${sixMonthsAgo.getFullYear()}`;

      const reservation: SIREReservationData = {
        codigo_establecimiento: '12345',
        codigo_municipio: '88001',
        tipo_documento: '5',
        numero_documento: '1234567890',
        primer_apellido: 'Bebé',
        nombres: 'Pequeño',
        fecha_nacimiento: dateStr,
        nacionalidad: '169',
        tipo_movimiento: 'E',
        fecha_movimiento: '23/12/2025',
        lugar_procedencia: '169',
        lugar_destino: '169'
      };

      const result = validateForSIRE(reservation);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('menor de 1 año'))).toBe(true);
    });

    it('should handle both movement types E and S', () => {
      const movements: Array<'E' | 'S'> = ['E', 'S'];

      movements.forEach(tipo => {
        const reservation: SIREReservationData = {
          codigo_establecimiento: '12345',
          codigo_municipio: '88001',
          tipo_documento: '3',
          numero_documento: '1234567890',
          primer_apellido: 'Test',
          nombres: 'User',
          fecha_nacimiento: '01/01/1990',
          nacionalidad: '169',
          tipo_movimiento: tipo,
          fecha_movimiento: '23/12/2025',
          lugar_procedencia: '249',
          lugar_destino: '169'
        };

        const result = validateForSIRE(reservation);
        expect(result.valid).toBe(true);
        expect(result.fieldStatus.tipo_movimiento).toBe('valid');
      });
    });
  });

  // ========================================
  // Helper Functions
  // ========================================

  describe('Helper Functions', () => {
    it('should generate validation summary for valid reservation', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: ['Warning message'],
        fieldStatus: {
          campo1: 'valid',
          campo2: 'valid'
        }
      };

      const summary = getValidationSummary(result);

      expect(summary).toContain('VALID');
      expect(summary).toContain('2/2');
      expect(summary).toContain('1 warnings');
    });

    it('should generate validation summary for invalid reservation', () => {
      const result: ValidationResult = {
        valid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: [],
        fieldStatus: {
          campo1: 'valid',
          campo2: 'invalid',
          campo3: 'missing'
        }
      };

      const summary = getValidationSummary(result);

      expect(summary).toContain('INVALID');
      expect(summary).toContain('2 errors');
      expect(summary).toContain('1 invalid');
      expect(summary).toContain('1 missing');
    });

    it('should batch validate multiple reservations', () => {
      const reservations: SIREReservationData[] = [
        {
          codigo_establecimiento: '12345',
          codigo_municipio: '88001',
          tipo_documento: '3',
          numero_documento: '1234567890',
          primer_apellido: 'Valid',
          nombres: 'User',
          fecha_nacimiento: '01/01/1990',
          nacionalidad: '169',
          tipo_movimiento: 'E',
          fecha_movimiento: '23/12/2025',
          lugar_procedencia: '249',
          lugar_destino: '169'
        },
        {
          codigo_establecimiento: '12345',
          codigo_municipio: '88001',
          tipo_documento: '99', // Invalid
          numero_documento: '1234567890',
          primer_apellido: 'Invalid',
          nombres: 'User',
          fecha_nacimiento: '01/01/1990',
          nacionalidad: '169',
          tipo_movimiento: 'E',
          fecha_movimiento: '23/12/2025',
          lugar_procedencia: '249',
          lugar_destino: '169'
        }
      ];

      const results = batchValidate(reservations);

      expect(results.total).toBe(2);
      expect(results.validCount).toBe(1);
      expect(results.invalidCount).toBe(1);
      expect(results.valid).toHaveLength(1);
      expect(results.invalid).toHaveLength(1);
    });
  });
});
