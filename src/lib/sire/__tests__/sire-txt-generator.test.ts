/**
 * Unit Tests for SIRE TXT File Generator
 *
 * Tests the generation of SIRE-compliant TXT files with:
 * - Tab-delimited format (13 fields per line)
 * - CRLF line endings
 * - UPPERCASE names
 * - Empty second_apellido handling
 * - Database row mapping
 *
 * @see src/lib/sire/sire-txt-generator.ts
 */

import {
  generateGuestLine,
  generateSIRETXT,
  mapReservationToSIRE,
  SIREGuestData,
  TenantSIREInfo,
} from '../sire-txt-generator';

// ============================================================================
// TEST DATA
// ============================================================================

const mockGuestWithSecondSurname: SIREGuestData = {
  codigo_hotel: '12345',
  codigo_ciudad: '88001',
  tipo_documento: '3',
  numero_identificacion: 'AB1234567',
  codigo_nacionalidad: '249',
  primer_apellido: 'Smith',
  segundo_apellido: 'Johnson',
  nombres: 'John Michael',
  tipo_movimiento: 'E',
  fecha_movimiento: '15/10/2025',
  lugar_procedencia: '249',
  lugar_destino: '88001',
  fecha_nacimiento: '25/03/1985',
};

const mockGuestWithoutSecondSurname: SIREGuestData = {
  codigo_hotel: '12345',
  codigo_ciudad: '88001',
  tipo_documento: '3',
  numero_identificacion: 'CD9876543',
  codigo_nacionalidad: '105', // Brasil
  primer_apellido: 'Silva',
  segundo_apellido: '',
  nombres: 'Maria Clara',
  tipo_movimiento: 'E',
  fecha_movimiento: '15/10/2025',
  lugar_procedencia: '105',
  lugar_destino: '88001',
  fecha_nacimiento: '10/07/1990',
};

const mockTenantInfo: TenantSIREInfo = {
  hotel_sire_code: '12345',
  hotel_city_code: '88001',
};

const mockReservationComplete = {
  id: 'res-001',
  document_type: '3',
  document_number: 'AB1234567',
  nationality_code: '249',
  first_surname: 'Smith',
  second_surname: 'Johnson',
  given_names: 'John Michael',
  birth_date: '1985-03-25',
  check_in_date: '2025-10-15',
  check_out_date: '2025-10-20',
  origin_country_code: '249',
  destination_country_code: '88001',
};

const mockReservationMinimal = {
  id: 'res-002',
  document_type: '5',
  document_number: 'CE123456',
  nationality_code: '250', // Venezuela
  first_surname: 'Gonzalez',
  second_surname: '', // Empty but present
  given_names: 'Carlos',
  birth_date: '1992-05-10',
  check_in_date: '2025-10-15',
  check_out_date: '2025-10-18',
  // origin_country_code missing (should default to nationality_code)
  // destination_country_code missing (should default to hotel_city_code)
};

// ============================================================================
// TESTS: generateGuestLine()
// ============================================================================

describe('generateGuestLine', () => {
  it('should generate tab-delimited line with 13 fields', () => {
    const line = generateGuestLine(mockGuestWithSecondSurname);

    // Split by tab and verify count
    const fields = line.split('\t');
    expect(fields).toHaveLength(13);
  });

  it('should convert names to UPPERCASE', () => {
    const line = generateGuestLine(mockGuestWithSecondSurname);

    expect(line).toContain('SMITH');
    expect(line).toContain('JOHNSON');
    expect(line).toContain('JOHN MICHAEL');
    expect(line).not.toContain('smith');
    expect(line).not.toContain('john');
  });

  it('should handle empty second_apellido correctly', () => {
    const line = generateGuestLine(mockGuestWithoutSecondSurname);

    const fields = line.split('\t');
    expect(fields[5]).toBe('SILVA'); // primer_apellido
    expect(fields[6]).toBe(''); // segundo_apellido (empty)
    expect(fields[7]).toBe('MARIA CLARA'); // nombres
  });

  it('should preserve tab delimiter even with empty field', () => {
    const line = generateGuestLine(mockGuestWithoutSecondSurname);

    // Verify double tab between SILVA and MARIA CLARA
    expect(line).toContain('SILVA\t\tMARIA CLARA');
  });

  it('should generate correct field order', () => {
    const line = generateGuestLine(mockGuestWithSecondSurname);
    const fields = line.split('\t');

    expect(fields[0]).toBe('12345'); // codigo_hotel
    expect(fields[1]).toBe('88001'); // codigo_ciudad
    expect(fields[2]).toBe('3'); // tipo_documento
    expect(fields[3]).toBe('AB1234567'); // numero_identificacion
    expect(fields[4]).toBe('249'); // codigo_nacionalidad
    expect(fields[5]).toBe('SMITH'); // primer_apellido
    expect(fields[6]).toBe('JOHNSON'); // segundo_apellido
    expect(fields[7]).toBe('JOHN MICHAEL'); // nombres
    expect(fields[8]).toBe('E'); // tipo_movimiento
    expect(fields[9]).toBe('15/10/2025'); // fecha_movimiento
    expect(fields[10]).toBe('249'); // lugar_procedencia
    expect(fields[11]).toBe('88001'); // lugar_destino
    expect(fields[12]).toBe('25/03/1985'); // fecha_nacimiento
  });
});

// ============================================================================
// TESTS: generateSIRETXT()
// ============================================================================

describe('generateSIRETXT', () => {
  it('should generate TXT with CRLF line endings', () => {
    const guests = [mockGuestWithSecondSurname, mockGuestWithoutSecondSurname];
    const result = generateSIRETXT(guests, 'test-hotel');

    // Verify CRLF (\r\n) between lines
    expect(result.content).toContain('\r\n');
    expect(result.content.split('\r\n')).toHaveLength(2);
  });

  it('should return correct line count', () => {
    const guests = [mockGuestWithSecondSurname, mockGuestWithoutSecondSurname];
    const result = generateSIRETXT(guests, 'test-hotel');

    expect(result.lineCount).toBe(2);
  });

  it('should generate filename with tenant ID and date', () => {
    const guests = [mockGuestWithSecondSurname];
    const result = generateSIRETXT(guests, 'hotel-san-andres');

    // Format: SIRE_<tenant>_<YYYYMMDD>.txt
    expect(result.filename).toMatch(/^SIRE_hotel-san-andres_\d{8}\.txt$/);
    expect(result.filename).toContain('SIRE_');
    expect(result.filename).toContain('hotel-san-andres');
    expect(result.filename).toMatch(/\.txt$/);
  });

  it('should handle empty guest array', () => {
    const result = generateSIRETXT([], 'test-hotel');

    expect(result.content).toBe('');
    expect(result.lineCount).toBe(0);
    expect(result.filename).toContain('empty');
  });

  it('should generate valid multi-line TXT', () => {
    const guests = [
      mockGuestWithSecondSurname,
      mockGuestWithoutSecondSurname,
    ];
    const result = generateSIRETXT(guests, 'test-hotel');

    const lines = result.content.split('\r\n');

    // Verify first line
    expect(lines[0]).toContain('SMITH');
    expect(lines[0]).toContain('JOHNSON');
    expect(lines[0]).toContain('JOHN MICHAEL');

    // Verify second line
    expect(lines[1]).toContain('SILVA');
    expect(lines[1]).toContain('MARIA CLARA');
  });

  it('should not include header row', () => {
    const guests = [mockGuestWithSecondSurname];
    const result = generateSIRETXT(guests, 'test-hotel');

    // First line should be data, not headers
    expect(result.content).not.toContain('codigo_hotel');
    expect(result.content).not.toContain('tipo_documento');
    expect(result.content).toMatch(/^12345/); // First field of first guest
  });
});

// ============================================================================
// TESTS: mapReservationToSIRE()
// ============================================================================

describe('mapReservationToSIRE', () => {
  it('should map complete reservation to SIRE format (check-in)', () => {
    const result = mapReservationToSIRE(
      mockReservationComplete,
      mockTenantInfo,
      'E'
    );

    expect(result).not.toBeNull();
    expect(result?.codigo_hotel).toBe('12345');
    expect(result?.codigo_ciudad).toBe('88001');
    expect(result?.tipo_documento).toBe('3');
    expect(result?.numero_identificacion).toBe('AB1234567');
    expect(result?.codigo_nacionalidad).toBe('249');
    expect(result?.primer_apellido).toBe('Smith');
    expect(result?.segundo_apellido).toBe('Johnson');
    expect(result?.nombres).toBe('John Michael');
    expect(result?.tipo_movimiento).toBe('E');
    expect(result?.fecha_movimiento).toBe('15/10/2025');
    expect(result?.lugar_procedencia).toBe('249');
    expect(result?.lugar_destino).toBe('88001');
    expect(result?.fecha_nacimiento).toBe('25/03/1985');
  });

  it('should map reservation for check-out (tipo_movimiento=S)', () => {
    const result = mapReservationToSIRE(
      mockReservationComplete,
      mockTenantInfo,
      'S'
    );

    expect(result).not.toBeNull();
    expect(result?.tipo_movimiento).toBe('S');
    expect(result?.fecha_movimiento).toBe('20/10/2025'); // check_out_date
  });

  it('should handle missing origin_country_code (default to nationality)', () => {
    const result = mapReservationToSIRE(
      mockReservationMinimal,
      mockTenantInfo,
      'E'
    );

    expect(result).not.toBeNull();
    expect(result?.lugar_procedencia).toBe('250'); // nationality_code
  });

  it('should handle missing destination_country_code (default to city)', () => {
    const result = mapReservationToSIRE(
      mockReservationMinimal,
      mockTenantInfo,
      'E'
    );

    expect(result).not.toBeNull();
    expect(result?.lugar_destino).toBe('88001'); // hotel_city_code
  });

  it('should handle empty second_surname', () => {
    const result = mapReservationToSIRE(
      mockReservationMinimal,
      mockTenantInfo,
      'E'
    );

    expect(result).not.toBeNull();
    expect(result?.segundo_apellido).toBe('');
  });

  it('should format dates correctly from YYYY-MM-DD', () => {
    const result = mapReservationToSIRE(
      mockReservationComplete,
      mockTenantInfo,
      'E'
    );

    expect(result).not.toBeNull();
    expect(result?.fecha_movimiento).toBe('15/10/2025'); // DD/MM/YYYY
    expect(result?.fecha_nacimiento).toBe('25/03/1985');
  });

  it('should return null if missing required field (document_type)', () => {
    const invalidReservation = {
      ...mockReservationComplete,
      document_type: null,
    };

    const result = mapReservationToSIRE(invalidReservation, mockTenantInfo, 'E');

    expect(result).toBeNull();
  });

  it('should return null if missing required field (nationality_code)', () => {
    const invalidReservation = {
      ...mockReservationComplete,
      nationality_code: '',
    };

    const result = mapReservationToSIRE(invalidReservation, mockTenantInfo, 'E');

    expect(result).toBeNull();
  });

  it('should return null if missing check_in_date for tipo_movimiento=E', () => {
    const invalidReservation = {
      ...mockReservationComplete,
      check_in_date: null,
    };

    const result = mapReservationToSIRE(invalidReservation, mockTenantInfo, 'E');

    expect(result).toBeNull();
  });

  it('should return null if missing check_out_date for tipo_movimiento=S', () => {
    const invalidReservation = {
      ...mockReservationComplete,
      check_out_date: null,
    };

    const result = mapReservationToSIRE(invalidReservation, mockTenantInfo, 'S');

    expect(result).toBeNull();
  });

  it('should log warning when missing required field', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const invalidReservation = {
      ...mockReservationComplete,
      given_names: null,
    };

    mapReservationToSIRE(invalidReservation, mockTenantInfo, 'E');

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Missing required field: given_names')
    );

    consoleWarnSpy.mockRestore();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration: DB to TXT file', () => {
  it('should convert multiple reservations to complete TXT file', () => {
    // Map reservations
    const guest1 = mapReservationToSIRE(
      mockReservationComplete,
      mockTenantInfo,
      'E'
    );
    const guest2 = mapReservationToSIRE(
      mockReservationMinimal,
      mockTenantInfo,
      'E'
    );

    expect(guest1).not.toBeNull();
    expect(guest2).not.toBeNull();

    // Generate TXT
    const result = generateSIRETXT([guest1!, guest2!], 'hotel-test');

    // Verify output
    expect(result.lineCount).toBe(2);
    expect(result.content).toContain('SMITH');
    expect(result.content).toContain('GONZALEZ');
    expect(result.content).toContain('\r\n');

    // Verify both lines have 13 fields
    const lines = result.content.split('\r\n');
    expect(lines[0].split('\t')).toHaveLength(13);
    expect(lines[1].split('\t')).toHaveLength(13);
  });

  it('should skip invalid reservations and process valid ones', () => {
    const validReservation = mockReservationComplete;
    const invalidReservation = {
      ...mockReservationComplete,
      document_number: null, // Missing required field
    };

    const guest1 = mapReservationToSIRE(validReservation, mockTenantInfo, 'E');
    const guest2 = mapReservationToSIRE(invalidReservation, mockTenantInfo, 'E');

    expect(guest1).not.toBeNull();
    expect(guest2).toBeNull();

    // Generate TXT with only valid guest
    const validGuests = [guest1].filter(g => g !== null) as SIREGuestData[];
    const result = generateSIRETXT(validGuests, 'hotel-test');

    expect(result.lineCount).toBe(1);
    expect(result.content).toContain('SMITH');
  });
});

// ============================================================================
// CRITICAL TESTS - Format Validation (Missing from implementation)
// ============================================================================

describe('Critical Format Validation', () => {
  it('should use TAB delimiter exclusively (no comma/semicolon/pipe)', () => {
    const line = generateGuestLine(mockGuestWithSecondSurname);

    // Verify NO invalid delimiters
    expect(line).not.toMatch(/[,;|]/);

    // Verify ONLY tabs used between fields
    const fields = line.split('\t');
    expect(fields).toHaveLength(13);

    // Verify no other delimiters by joining back
    const reconstructed = fields.join('\t');
    expect(reconstructed).toBe(line);
  });

  it('should validate date format with strict DD/MM/YYYY regex', () => {
    const line = generateGuestLine(mockGuestWithSecondSurname);
    const fields = line.split('\t');

    const fechaMovimiento = fields[9]; // fecha_movimiento
    const fechaNacimiento = fields[12]; // fecha_nacimiento

    // Strict DD/MM/YYYY regex
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;

    expect(fechaMovimiento).toMatch(dateRegex);
    expect(fechaNacimiento).toMatch(dateRegex);

    // Verify exact format (not YYYY-MM-DD or other variants)
    expect(fechaMovimiento).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fechaNacimiento).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle UTF-8 accented characters in uppercase', () => {
    const mockGuestWithAccents: SIREGuestData = {
      codigo_hotel: '12345',
      codigo_ciudad: '88001',
      tipo_documento: '3',
      numero_identificacion: 'CO1234567',
      codigo_nacionalidad: '169',
      primer_apellido: 'García',
      segundo_apellido: 'Pérez',
      nombres: 'José María',
      tipo_movimiento: 'E',
      fecha_movimiento: '15/10/2025',
      lugar_procedencia: '169',
      lugar_destino: '88001',
      fecha_nacimiento: '10/05/1985',
    };

    const line = generateGuestLine(mockGuestWithAccents);

    // Verify accented characters preserved in uppercase
    expect(line).toContain('GARCÍA');
    expect(line).toContain('PÉREZ');
    expect(line).toContain('JOSÉ MARÍA');

    // Verify NOT stripped of accents
    expect(line).not.toContain('GARCIA'); // Without accent
    expect(line).not.toContain('PEREZ');  // Without accent
    expect(line).not.toContain('JOSE');   // Without accent
  });

  it('should match official SIRE example format exactly', () => {
    // Official SIRE example data
    const officialExample: SIREGuestData = {
      codigo_hotel: '12345',
      codigo_ciudad: '88001',
      tipo_documento: '3',
      numero_identificacion: 'AB1234567',
      codigo_nacionalidad: '249', // USA
      primer_apellido: 'Smith',
      segundo_apellido: 'Johnson',
      nombres: 'John',
      tipo_movimiento: 'E',
      fecha_movimiento: '15/10/2025',
      lugar_procedencia: '249',
      lugar_destino: '88001',
      fecha_nacimiento: '25/03/1985',
    };

    const line = generateGuestLine(officialExample);

    // Expected official format (13 fields, TAB-delimited)
    const expected = '12345\t88001\t3\tAB1234567\t249\tSMITH\tJOHNSON\tJOHN\tE\t15/10/2025\t249\t88001\t25/03/1985';

    expect(line).toBe(expected);
  });

  it('should use SIRE country codes (NOT ISO 3166-1)', () => {
    // USA: SIRE code = 249, ISO 3166-1 = 840
    const mockUSAGuest: SIREGuestData = {
      codigo_hotel: '12345',
      codigo_ciudad: '88001',
      tipo_documento: '3',
      numero_identificacion: 'US1234567',
      codigo_nacionalidad: '249', // SIRE code (NOT 840)
      primer_apellido: 'Smith',
      segundo_apellido: '',
      nombres: 'John',
      tipo_movimiento: 'E',
      fecha_movimiento: '15/10/2025',
      lugar_procedencia: '249', // SIRE code
      lugar_destino: '169',
      fecha_nacimiento: '25/03/1985',
    };

    const line = generateGuestLine(mockUSAGuest);
    const fields = line.split('\t');

    // Verify SIRE code used
    expect(fields[4]).toBe('249'); // codigo_nacionalidad
    expect(fields[10]).toBe('249'); // lugar_procedencia

    // Verify NOT ISO code
    expect(fields[4]).not.toBe('840');
    expect(fields[10]).not.toBe('840');

    // Verify in full line
    expect(line).toContain('\t249\t'); // nacionalidad field
    expect(line).not.toContain('\t840\t');
  });
});
