/**
 * SIRE TXT Generator Tests
 *
 * Tests for TXT file generation including:
 * - Correct field order
 * - TAB delimiters
 * - Date format (DD/MM/YYYY)
 * - UTF-8 encoding with accents
 * - Multiple guests per reservation
 * - E and S movements
 */

// Using Jest (project standard)
import {
  generateSIRETXT,
  generateSIRELine,
  calculateContentHash,
  filterForeignNationals,
  groupGuestsByReservation,
  type GuestReservation,
  type HotelInfo,
} from '../sire-txt-generator';
import { type ReservationGuest } from '../sire-validation';

// ============================================================================
// Test Data
// ============================================================================

const mockHotelInfo: HotelInfo = {
  hotel_sire_code: '12345',
  hotel_city_code: '88001', // San Andrés
};

const mockReservation: GuestReservation = {
  id: 'res-001',
  tenant_id: 'TEST_TENANT',
  guest_name: 'John Smith',
  check_in_date: '2025-10-15',
  check_out_date: '2025-10-18',
  status: 'active',
};

const mockGuest: ReservationGuest = {
  id: 'guest-001',
  reservation_id: 'res-001',
  tenant_id: 'TEST_TENANT',
  guest_order: 1,
  is_primary_guest: true,
  guest_type: 'adult',
  guest_name: 'John Michael Smith',
  document_type: '3', // Passport
  document_number: 'AB1234567',
  first_surname: 'SMITH',
  second_surname: 'JOHNSON',
  given_names: 'JOHN MICHAEL',
  birth_date: '1985-03-25',
  nationality_code: '249', // USA
  origin_city_code: '249', // USA
  destination_city_code: '88001', // San Andrés
  sire_status: 'complete',
};

const mockGuestWithAccents: ReservationGuest = {
  ...mockGuest,
  id: 'guest-002',
  guest_order: 2,
  is_primary_guest: false,
  guest_name: 'María García Muñoz',
  first_surname: 'GARCÍA',
  second_surname: 'MUÑOZ',
  given_names: 'MARÍA JOSÉ',
  document_number: 'CD9876543',
  nationality_code: '76', // Brazil
  birth_date: '1990-07-10',
};

const mockGuestNoSecondSurname: ReservationGuest = {
  ...mockGuest,
  id: 'guest-003',
  guest_order: 3,
  is_primary_guest: false,
  first_surname: 'SILVA',
  second_surname: '', // No second surname
  given_names: 'MARIA CLARA',
  document_number: 'EF5555555',
  nationality_code: '76', // Brazil
};

const mockColombianGuest: ReservationGuest = {
  ...mockGuest,
  id: 'guest-004',
  nationality_code: '169', // Colombia
};

// ============================================================================
// Tests: generateSIRELine
// ============================================================================

describe('generateSIRELine', () => {
  it('should generate correct field order with TAB delimiters', () => {
    const line = generateSIRELine(mockGuest, 'E', '2025-10-15', mockHotelInfo);
    const fields = line.split('\t');

    expect(fields).toHaveLength(13);
    expect(fields[0]).toBe('12345'); // hotel code
    expect(fields[1]).toBe('88001'); // city code
    expect(fields[2]).toBe('3'); // document type
    expect(fields[3]).toBe('AB1234567'); // document number
    expect(fields[4]).toBe('249'); // nationality
    expect(fields[5]).toBe('SMITH'); // first surname
    expect(fields[6]).toBe('JOHNSON'); // second surname
    expect(fields[7]).toBe('JOHN MICHAEL'); // given names
    expect(fields[8]).toBe('E'); // movement type
    expect(fields[9]).toBe('15/10/2025'); // movement date DD/MM/YYYY
    expect(fields[10]).toBe('249'); // origin
    expect(fields[11]).toBe('88001'); // destination
    expect(fields[12]).toBe('25/03/1985'); // birth date DD/MM/YYYY
  });

  it('should format dates as DD/MM/YYYY', () => {
    const line = generateSIRELine(mockGuest, 'E', '2025-12-05', mockHotelInfo);
    const fields = line.split('\t');

    expect(fields[9]).toBe('05/12/2025'); // movement date
    expect(fields[12]).toBe('25/03/1985'); // birth date
  });

  it('should handle S (exit) movement type', () => {
    const line = generateSIRELine(mockGuest, 'S', '2025-10-18', mockHotelInfo);
    const fields = line.split('\t');

    expect(fields[8]).toBe('S');
    expect(fields[9]).toBe('18/10/2025');
  });

  it('should handle empty second surname', () => {
    const line = generateSIRELine(
      mockGuestNoSecondSurname,
      'E',
      '2025-10-15',
      mockHotelInfo
    );
    const fields = line.split('\t');

    expect(fields).toHaveLength(13);
    expect(fields[5]).toBe('SILVA'); // first surname
    expect(fields[6]).toBe(''); // second surname empty
    expect(fields[7]).toBe('MARIA CLARA'); // given names
  });

  it('should preserve UTF-8 characters (accents)', () => {
    const line = generateSIRELine(
      mockGuestWithAccents,
      'E',
      '2025-10-15',
      mockHotelInfo
    );
    const fields = line.split('\t');

    expect(fields[5]).toBe('GARCÍA'); // Contains Á
    expect(fields[6]).toBe('MUÑOZ'); // Contains Ñ
    expect(fields[7]).toBe('MARÍA JOSÉ'); // Contains Á
  });

  it('should clean document number (remove hyphens)', () => {
    const guestWithHyphens: ReservationGuest = {
      ...mockGuest,
      document_number: 'AB-123-456-7',
    };
    const line = generateSIRELine(guestWithHyphens, 'E', '2025-10-15', mockHotelInfo);
    const fields = line.split('\t');

    expect(fields[3]).toBe('AB1234567'); // Hyphens removed
  });
});

// ============================================================================
// Tests: generateSIRETXT
// ============================================================================

describe('generateSIRETXT', () => {
  it('should generate both E and S lines when no movement type specified', () => {
    const result = generateSIRETXT(
      [mockReservation],
      [mockGuest],
      mockHotelInfo,
      {}
    );

    expect(result.lineCount).toBe(2); // E + S
    expect(result.guestCount).toBe(1);

    const lines = result.content.trim().split('\n');
    expect(lines[0]).toContain('\tE\t'); // Entry
    expect(lines[1]).toContain('\tS\t'); // Exit
  });

  it('should generate only E lines when movement_type=E', () => {
    const result = generateSIRETXT(
      [mockReservation],
      [mockGuest],
      mockHotelInfo,
      { movementType: 'E' }
    );

    expect(result.lineCount).toBe(1);
    expect(result.content).toContain('\tE\t');
    expect(result.content).not.toContain('\tS\t');
  });

  it('should generate multiple lines for multiple guests', () => {
    const result = generateSIRETXT(
      [mockReservation],
      [mockGuest, mockGuestWithAccents],
      mockHotelInfo,
      { movementType: 'E' }
    );

    expect(result.lineCount).toBe(2); // 2 guests × 1 movement
    expect(result.guestCount).toBe(2);
  });

  it('should generate 4 lines for 2 guests with both movements', () => {
    const result = generateSIRETXT(
      [mockReservation],
      [mockGuest, mockGuestWithAccents],
      mockHotelInfo,
      {}
    );

    expect(result.lineCount).toBe(4); // 2 guests × 2 movements
    expect(result.guestCount).toBe(2);
  });

  it('should exclude guests with missing required fields', () => {
    const incompleteGuest: ReservationGuest = {
      ...mockGuest,
      id: 'guest-incomplete',
      document_type: null, // Missing required field
    };

    const result = generateSIRETXT(
      [mockReservation],
      [incompleteGuest],
      mockHotelInfo,
      {}
    );

    expect(result.lineCount).toBe(0);
    expect(result.excluded).toHaveLength(1);
    expect(result.excluded[0].missingFields).toContain('document_type');
  });

  it('should end content with newline', () => {
    const result = generateSIRETXT(
      [mockReservation],
      [mockGuest],
      mockHotelInfo,
      { movementType: 'E' }
    );

    expect(result.content.endsWith('\n')).toBe(true);
  });

  it('should generate correct filename', () => {
    const result = generateSIRETXT(
      [mockReservation],
      [mockGuest],
      mockHotelInfo,
      { movementType: 'E' }
    );

    expect(result.filename).toMatch(/^SIRE_\d{4}-\d{2}-\d{2}_E\.txt$/);
  });

  it('should return hotel config errors when missing', () => {
    const result = generateSIRETXT(
      [mockReservation],
      [mockGuest],
      { hotel_sire_code: '', hotel_city_code: '88001' },
      {}
    );

    expect(result.lineCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('hotel_sire_code');
  });
});

// ============================================================================
// Tests: filterForeignNationals
// ============================================================================

describe('filterForeignNationals', () => {
  it('should exclude Colombian nationals', () => {
    const guests = [mockGuest, mockColombianGuest];
    const filtered = filterForeignNationals(guests);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].nationality_code).toBe('249'); // USA
  });

  it('should keep all foreigners', () => {
    const guests = [mockGuest, mockGuestWithAccents];
    const filtered = filterForeignNationals(guests);

    expect(filtered).toHaveLength(2);
  });
});

// ============================================================================
// Tests: groupGuestsByReservation
// ============================================================================

describe('groupGuestsByReservation', () => {
  it('should group guests by reservation_id', () => {
    const guests = [
      { ...mockGuest, reservation_id: 'res-001', guest_order: 1 },
      { ...mockGuestWithAccents, reservation_id: 'res-001', guest_order: 2 },
      { ...mockGuestNoSecondSurname, reservation_id: 'res-002', guest_order: 1 },
    ];

    const grouped = groupGuestsByReservation(guests);

    expect(grouped.size).toBe(2);
    expect(grouped.get('res-001')).toHaveLength(2);
    expect(grouped.get('res-002')).toHaveLength(1);
  });

  it('should sort guests by guest_order within reservation', () => {
    const guests = [
      { ...mockGuestWithAccents, reservation_id: 'res-001', guest_order: 2 },
      { ...mockGuest, reservation_id: 'res-001', guest_order: 1 },
    ];

    const grouped = groupGuestsByReservation(guests);
    const res001Guests = grouped.get('res-001')!;

    expect(res001Guests[0].guest_order).toBe(1);
    expect(res001Guests[1].guest_order).toBe(2);
  });
});

// ============================================================================
// Tests: calculateContentHash
// ============================================================================

describe('calculateContentHash', () => {
  it('should generate consistent hash for same content', async () => {
    const content = 'test content';
    const hash1 = await calculateContentHash(content);
    const hash2 = await calculateContentHash(content);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex
  });

  it('should generate different hash for different content', async () => {
    const hash1 = await calculateContentHash('content 1');
    const hash2 = await calculateContentHash('content 2');

    expect(hash1).not.toBe(hash2);
  });
});

// ============================================================================
// Tests: TXT Format Compliance
// ============================================================================

describe('TXT Format Compliance', () => {
  it('should use TAB as delimiter (not space, comma, or pipe)', () => {
    const result = generateSIRETXT(
      [mockReservation],
      [mockGuest],
      mockHotelInfo,
      { movementType: 'E' }
    );

    const line = result.content.trim();
    expect(line).toContain('\t');
    expect(line.split('\t')).toHaveLength(13);
  });

  it('should use LF line endings (not CRLF)', () => {
    const result = generateSIRETXT(
      [mockReservation],
      [mockGuest, mockGuestWithAccents],
      mockHotelInfo,
      { movementType: 'E' }
    );

    expect(result.content).not.toContain('\r\n');
    expect(result.content).toContain('\n');
  });

  it('should not contain quotes around fields', () => {
    const result = generateSIRETXT(
      [mockReservation],
      [mockGuest],
      mockHotelInfo,
      { movementType: 'E' }
    );

    expect(result.content).not.toContain('"');
    expect(result.content).not.toContain("'");
  });

  it('should have exactly 13 fields per line', () => {
    const result = generateSIRETXT(
      [mockReservation],
      [mockGuest, mockGuestWithAccents, mockGuestNoSecondSurname],
      mockHotelInfo,
      {}
    );

    const lines = result.content.trim().split('\n');
    for (const line of lines) {
      const fields = line.split('\t');
      expect(fields).toHaveLength(13);
    }
  });
});
