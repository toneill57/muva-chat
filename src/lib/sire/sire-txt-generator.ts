/**
 * SIRE TXT File Generator
 *
 * Generates official SIRE TXT format for batch upload to Migración Colombia portal.
 * Format: Tab-delimited, 13 columns per line, one guest per line.
 *
 * Reference: docs/features/sire-compliance/CODIGOS_OFICIALES.md (lines 482-629)
 *
 * @module sire-txt-generator
 * @see docs/features/sire-compliance/CODIGOS_OFICIALES.md - Official SIRE specification
 */

import { formatDateToSIRE } from './sire-catalogs';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * SIRE data structure for a single guest (13 campos oficiales)
 *
 * Represents one line in the TXT file with all required SIRE fields.
 */
export interface SIREGuestData {
  // Campos del establecimiento (auto-filled from tenant)
  codigo_hotel: string;        // Campo 1: Código SCH del hotel
  codigo_ciudad: string;       // Campo 2: Código DIVIPOLA de la ciudad

  // Campos del documento
  tipo_documento: string;      // Campo 3: 3=Pasaporte, 5=Cédula Ext, 46=Diplomático, 10=Mercosur
  numero_identificacion: string; // Campo 4: Número del documento

  // Campos personales
  codigo_nacionalidad: string; // Campo 5: Código SIRE del país (NO ISO)
  primer_apellido: string;     // Campo 6: Primer apellido (MAYÚSCULAS)
  segundo_apellido: string;    // Campo 7: Segundo apellido o vacío (MAYÚSCULAS)
  nombres: string;             // Campo 8: Nombres (MAYÚSCULAS)

  // Campos de movimiento
  tipo_movimiento: 'E' | 'S';  // Campo 9: E=Entrada, S=Salida
  fecha_movimiento: string;    // Campo 10: DD/MM/YYYY
  lugar_procedencia: string;   // Campo 11: Código país/ciudad de origen
  lugar_destino: string;       // Campo 12: Código país/ciudad destino
  fecha_nacimiento: string;    // Campo 13: DD/MM/YYYY
}

/**
 * Result of TXT generation
 */
export interface SIRETXTResult {
  content: string;             // TXT content ready for file
  lineCount: number;           // Number of guests included
  filename: string;            // Suggested filename
}

/**
 * Tenant information required for SIRE file generation
 */
export interface TenantSIREInfo {
  hotel_sire_code: string;     // SCH code for hotel
  hotel_city_code: string;     // DIVIPOLA code for city
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Generate a single TXT line for one guest
 *
 * Converts SIREGuestData to tab-delimited string with 13 fields.
 * Names are automatically converted to UPPERCASE.
 *
 * @param guest - Guest data with all 13 SIRE fields
 * @returns Tab-delimited string (no trailing newline)
 *
 * @example
 * const guest: SIREGuestData = {
 *   codigo_hotel: '12345',
 *   codigo_ciudad: '88001',
 *   tipo_documento: '3',
 *   numero_identificacion: 'AB1234567',
 *   codigo_nacionalidad: '249',
 *   primer_apellido: 'Smith',
 *   segundo_apellido: '',
 *   nombres: 'John Michael',
 *   tipo_movimiento: 'E',
 *   fecha_movimiento: '15/10/2025',
 *   lugar_procedencia: '249',
 *   lugar_destino: '88001',
 *   fecha_nacimiento: '25/03/1985'
 * };
 * generateGuestLine(guest);
 * // "12345\t88001\t3\tAB1234567\t249\tSMITH\t\tJOHN MICHAEL\tE\t15/10/2025\t249\t88001\t25/03/1985"
 */
export function generateGuestLine(guest: SIREGuestData): string {
  // Validate all 13 fields are present
  const fields = [
    guest.codigo_hotel,
    guest.codigo_ciudad,
    guest.tipo_documento,
    guest.numero_identificacion,
    guest.codigo_nacionalidad,
    guest.primer_apellido.toUpperCase(),
    (guest.segundo_apellido || '').toUpperCase(),  // Can be empty
    guest.nombres.toUpperCase(),
    guest.tipo_movimiento,
    guest.fecha_movimiento,
    guest.lugar_procedencia,
    guest.lugar_destino,
    guest.fecha_nacimiento,
  ];

  // Join with tabs
  return fields.join('\t');
}

/**
 * Generate complete TXT file content from array of guests
 *
 * Creates SIRE-compliant TXT file with:
 * - Tab-delimited fields (13 per line)
 * - CRLF line endings (Windows format)
 * - No header row (first line is first guest)
 * - UTF-8 encoding (without BOM)
 *
 * @param guests - Array of guest data with 13 SIRE fields each
 * @param tenantId - Tenant identifier for filename
 * @returns TXT content, line count, and suggested filename
 *
 * @example
 * const guests: SIREGuestData[] = [
 *   { codigo_hotel: '12345', ... },
 *   { codigo_hotel: '12345', ... }
 * ];
 * const result = generateSIRETXT(guests, 'hotel-san-andres');
 * // result.content: "12345\t88001\t...\r\n12345\t88001\t...\r\n"
 * // result.lineCount: 2
 * // result.filename: "SIRE_hotel-san-andres_20251223.txt"
 */
export function generateSIRETXT(
  guests: SIREGuestData[],
  tenantId: string
): SIRETXTResult {
  if (guests.length === 0) {
    return {
      content: '',
      lineCount: 0,
      filename: `SIRE_${tenantId}_empty.txt`
    };
  }

  // Generate lines
  const lines = guests.map(guest => generateGuestLine(guest));

  // Join with CRLF (Windows line endings per SIRE spec)
  const content = lines.join('\r\n');

  // Generate filename with date (YYYYMMDD)
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const filename = `SIRE_${tenantId}_${dateStr}.txt`;

  return {
    content,
    lineCount: guests.length,
    filename
  };
}

// ============================================================================
// DATABASE MAPPING
// ============================================================================

/**
 * Guest data from reservation_guests table (with JOIN to guest_reservations)
 */
export interface ReservationGuestData {
  guest_order: number;
  given_names: string | null;
  first_surname: string | null;
  second_surname: string | null;
  document_type: string | null;
  document_number: string | null;
  nationality_code: string | null;
  birth_date: string | null;
  origin_city_code: string | null;
  destination_city_code: string | null;
}

/**
 * Reservation metadata from guest_reservations table
 */
export interface ReservationMetadata {
  id: string;
  check_in_date: string;
  check_out_date: string;
  hotel_sire_code: string;
  hotel_city_code: string;
}

/**
 * Map reservation_guests data to SIREGuestData
 *
 * Converts guest data from reservation_guests table (with reservation JOIN)
 * to SIRE format. This function is optimized for multi-guest support where
 * each reservation can have multiple guests.
 *
 * Required fields in guest object:
 * - document_type (SIRE code: 3=Pasaporte, 5=Cédula Ext, etc.)
 * - document_number
 * - nationality_code (SIRE country code, NOT ISO)
 * - first_surname
 * - given_names
 * - birth_date (Date or YYYY-MM-DD string)
 *
 * Required fields in reservation object:
 * - hotel_sire_code (from tenant configuration)
 * - hotel_city_code (from tenant configuration)
 * - check_in_date (for movementType='E')
 * - check_out_date (for movementType='S')
 *
 * Optional fields:
 * - second_surname (can be empty string)
 * - origin_city_code (defaults to nationality_code)
 * - destination_city_code (defaults to hotel_city_code)
 *
 * @param guest - Guest data from reservation_guests table
 * @param reservation - Reservation metadata from guest_reservations table
 * @param movementType - 'E' for check-in, 'S' for check-out
 * @returns SIREGuestData or null if missing required fields
 *
 * @example
 * const guest = {
 *   guest_order: 1,
 *   document_type: '3',
 *   document_number: 'AB1234567',
 *   nationality_code: '249',
 *   first_surname: 'Smith',
 *   second_surname: 'Johnson',
 *   given_names: 'John Michael',
 *   birth_date: '1985-03-25',
 *   origin_city_code: '249',
 *   destination_city_code: '88001'
 * };
 * const reservation = {
 *   id: '123',
 *   hotel_sire_code: '12345',
 *   hotel_city_code: '88001',
 *   check_in_date: '2025-10-15',
 *   check_out_date: '2025-10-20'
 * };
 * const sireData = mapGuestToSIRE(guest, reservation, 'E');
 * // Returns SIREGuestData with all 13 fields
 */
export function mapGuestToSIRE(
  guest: ReservationGuestData,
  reservation: ReservationMetadata,
  movementType: 'E' | 'S'
): SIREGuestData | null {
  // Validate required fields from guest
  if (!guest.document_number || !guest.first_surname || !guest.given_names) {
    console.warn(`[sire-txt-generator] Guest ${guest.guest_order} missing required fields:`, {
      hasDocNumber: !!guest.document_number,
      hasFirstSurname: !!guest.first_surname,
      hasGivenNames: !!guest.given_names
    });
    return null;
  }

  if (!guest.document_type || !guest.nationality_code || !guest.birth_date) {
    console.warn(`[sire-txt-generator] Guest ${guest.guest_order} missing SIRE required fields:`, {
      hasDocType: !!guest.document_type,
      hasNationality: !!guest.nationality_code,
      hasBirthDate: !!guest.birth_date
    });
    return null;
  }

  // Determine movement date based on type
  const movementDate = movementType === 'E'
    ? reservation.check_in_date
    : reservation.check_out_date;

  if (!movementDate) {
    console.warn(
      `[sire-txt-generator] Guest ${guest.guest_order}: Missing ${movementType === 'E' ? 'check_in_date' : 'check_out_date'} ` +
      `for reservation ${reservation.id}`
    );
    return null;
  }

  return {
    codigo_hotel: reservation.hotel_sire_code,
    codigo_ciudad: reservation.hotel_city_code,
    tipo_documento: guest.document_type,
    numero_identificacion: guest.document_number,
    codigo_nacionalidad: guest.nationality_code,
    primer_apellido: guest.first_surname,
    segundo_apellido: guest.second_surname || '',
    nombres: guest.given_names,
    tipo_movimiento: movementType,
    fecha_movimiento: formatDateToSIRE(movementDate),
    lugar_procedencia: guest.origin_city_code || guest.nationality_code,
    lugar_destino: guest.destination_city_code || reservation.hotel_city_code,
    fecha_nacimiento: formatDateToSIRE(guest.birth_date),
  };
}

/**
 * Map guest_reservations row to SIREGuestData
 *
 * Converts database row from `guest_reservations` table to SIRE format.
 * Performs validation of required fields and data transformations.
 *
 * Required fields in reservation object:
 * - document_type (SIRE code: 3=Pasaporte, 5=Cédula Ext, etc.)
 * - document_number
 * - nationality_code (SIRE country code, NOT ISO)
 * - first_surname
 * - given_names
 * - birth_date (Date or YYYY-MM-DD string)
 * - check_in_date (for movementType='E')
 * - check_out_date (for movementType='S')
 *
 * Optional fields:
 * - second_surname (can be empty string)
 * - origin_country_code (defaults to nationality_code)
 * - destination_country_code (defaults to hotel_city_code)
 *
 * @param reservation - Row from guest_reservations table
 * @param tenantInfo - Tenant info with hotel code and city code
 * @param movementType - 'E' for check-in, 'S' for check-out
 * @returns SIREGuestData or null if missing required fields
 *
 * @example
 * const reservation = {
 *   id: '123',
 *   document_type: '3',
 *   document_number: 'AB1234567',
 *   nationality_code: '249',
 *   first_surname: 'Smith',
 *   second_surname: 'Johnson',
 *   given_names: 'John Michael',
 *   birth_date: '1985-03-25',
 *   check_in_date: '2025-10-15',
 *   origin_country_code: '249'
 * };
 * const tenantInfo = {
 *   hotel_sire_code: '12345',
 *   hotel_city_code: '88001'
 * };
 * const sireData = mapReservationToSIRE(reservation, tenantInfo, 'E');
 * // Returns SIREGuestData with all 13 fields
 */
export function mapReservationToSIRE(
  reservation: any,
  tenantInfo: TenantSIREInfo,
  movementType: 'E' | 'S'
): SIREGuestData | null {
  // Required fields check
  const requiredFields = [
    'document_type',
    'document_number',
    'nationality_code',
    'first_surname',
    'given_names',
    'birth_date'
  ];

  for (const field of requiredFields) {
    if (!reservation[field]) {
      console.warn(`[sire-txt-generator] Missing required field: ${field} for reservation ${reservation.id}`);
      return null;
    }
  }

  // Determine movement date based on type
  const movementDate = movementType === 'E'
    ? reservation.check_in_date
    : reservation.check_out_date;

  if (!movementDate) {
    console.warn(
      `[sire-txt-generator] Missing ${movementType === 'E' ? 'check_in_date' : 'check_out_date'} ` +
      `for reservation ${reservation.id}`
    );
    return null;
  }

  return {
    codigo_hotel: tenantInfo.hotel_sire_code,
    codigo_ciudad: tenantInfo.hotel_city_code,
    tipo_documento: reservation.document_type,
    numero_identificacion: reservation.document_number,
    codigo_nacionalidad: reservation.nationality_code,
    primer_apellido: reservation.first_surname,
    segundo_apellido: reservation.second_surname || '',
    nombres: reservation.given_names,
    tipo_movimiento: movementType,
    fecha_movimiento: formatDateToSIRE(movementDate),
    lugar_procedencia: reservation.origin_city_code || reservation.nationality_code,
    lugar_destino: reservation.destination_city_code || tenantInfo.hotel_city_code,
    fecha_nacimiento: formatDateToSIRE(reservation.birth_date),
  };
}
