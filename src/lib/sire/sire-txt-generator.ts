/**
 * SIRE TXT File Generator
 *
 * Generates tab-delimited TXT files for SIRE compliance reporting.
 * Each line represents one guest movement (Entry E or Exit S).
 *
 * Format: 13 fields separated by TAB (\t), ending with LF (\n)
 * Encoding: UTF-8
 *
 * Based on: docs/features/sire-compliance/CODIGOS_OFICIALES.md
 */

import { formatDateToSIRE } from './sire-catalogs';
import {
  ReservationGuest,
  validateGuestForSIRE,
  validateHotelInfo,
  isGuestSIREComplete,
  getMissingFields,
  parseToSIREDate,
  ValidationError,
} from './sire-validation';

// ============================================================================
// TYPES
// ============================================================================

export interface GuestReservation {
  id: string;
  tenant_id: string;
  guest_name: string;
  check_in_date: Date | string;
  check_out_date: Date | string;
  status: string;
}

export interface HotelInfo {
  hotel_sire_code: string;
  hotel_city_code: string;
}

export interface SIRETXTResult {
  content: string;
  lineCount: number;
  guestCount: number;
  reservationCount: number;
  errors: TXTGenerationError[];
  excluded: ExcludedGuest[];
  filename: string;
}

export interface TXTGenerationError {
  guest_id: string;
  reservation_id: string;
  guest_name: string;
  guest_order: number;
  field: string;
  error: string;
  movement?: 'E' | 'S';
}

export interface ExcludedGuest {
  guest_id: string;
  reservation_id: string;
  guest_name: string;
  guest_order: number;
  reason: string;
  missingFields: string[];
}

export type MovementType = 'E' | 'S';

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate SIRE TXT content from reservations and guests
 *
 * @param reservations - Array of guest reservations (for check-in/check-out dates)
 * @param guests - Array of reservation guests (titular + companions)
 * @param hotelInfo - Hotel SIRE code and city code from tenant
 * @param options - Generation options
 * @returns SIRETXTResult with content and statistics
 */
export function generateSIRETXT(
  reservations: GuestReservation[],
  guests: ReservationGuest[],
  hotelInfo: HotelInfo,
  options: {
    movementType?: MovementType; // 'E', 'S', or undefined for both
    dateFrom?: Date | string;
    dateTo?: Date | string;
  } = {}
): SIRETXTResult {
  const lines: string[] = [];
  const errors: TXTGenerationError[] = [];
  const excluded: ExcludedGuest[] = [];

  // Validate hotel info first
  const hotelErrors = validateHotelInfo(hotelInfo);
  if (hotelErrors.length > 0) {
    return {
      content: '',
      lineCount: 0,
      guestCount: 0,
      reservationCount: 0,
      errors: hotelErrors.map((e) => ({
        guest_id: '',
        reservation_id: '',
        guest_name: 'Hotel Configuration',
        guest_order: 0,
        field: e.field,
        error: e.message,
      })),
      excluded: [],
      filename: generateFilename(options.movementType),
    };
  }

  // Create reservation lookup map
  const reservationMap = new Map<string, GuestReservation>();
  for (const res of reservations) {
    reservationMap.set(res.id, res);
  }

  // Track unique reservations and guests processed
  const processedReservations = new Set<string>();
  let validGuestCount = 0;

  // Process each guest
  for (const guest of guests) {
    const reservation = reservationMap.get(guest.reservation_id);
    if (!reservation) {
      excluded.push({
        guest_id: guest.id,
        reservation_id: guest.reservation_id,
        guest_name: guest.guest_name || `Guest #${guest.guest_order}`,
        guest_order: guest.guest_order,
        reason: 'Reservación no encontrada',
        missingFields: [],
      });
      continue;
    }

    // Filter by date range if specified
    if (options.dateFrom || options.dateTo) {
      const checkIn = new Date(reservation.check_in_date);
      const checkOut = new Date(reservation.check_out_date);
      const dateFrom = options.dateFrom ? new Date(options.dateFrom) : null;
      const dateTo = options.dateTo ? new Date(options.dateTo) : null;

      // Skip if outside date range
      if (dateFrom && checkOut < dateFrom) continue;
      if (dateTo && checkIn > dateTo) continue;
    }

    // Validate guest data
    const validation = validateGuestForSIRE(guest);
    if (!validation.valid) {
      excluded.push({
        guest_id: guest.id,
        reservation_id: guest.reservation_id,
        guest_name: validation.guest_name,
        guest_order: guest.guest_order,
        reason: `Datos incompletos: ${validation.errors.map((e) => e.message).join('; ')}`,
        missingFields: validation.missingFields,
      });

      // Add to errors for detailed tracking
      for (const err of validation.errors) {
        errors.push({
          guest_id: guest.id,
          reservation_id: guest.reservation_id,
          guest_name: validation.guest_name,
          guest_order: guest.guest_order,
          field: err.field,
          error: err.message,
        });
      }
      continue;
    }

    // Generate lines based on movement type
    const movements: MovementType[] = options.movementType
      ? [options.movementType]
      : ['E', 'S'];

    for (const movement of movements) {
      const movementDate =
        movement === 'E' ? reservation.check_in_date : reservation.check_out_date;

      const line = generateSIRELine(guest, movement, movementDate, hotelInfo);
      lines.push(line);
    }

    processedReservations.add(guest.reservation_id);
    validGuestCount++;
  }

  // Generate TXT content
  const content = lines.join('\n') + (lines.length > 0 ? '\n' : '');

  return {
    content,
    lineCount: lines.length,
    guestCount: validGuestCount,
    reservationCount: processedReservations.size,
    errors,
    excluded,
    filename: generateFilename(options.movementType),
  };
}

// ============================================================================
// LINE GENERATOR
// ============================================================================

/**
 * Generate a single SIRE TXT line for one guest and one movement
 *
 * Field order (13 fields, tab-delimited):
 * 1. codigo_hotel
 * 2. codigo_ciudad
 * 3. tipo_documento
 * 4. numero_identificacion
 * 5. codigo_nacionalidad
 * 6. primer_apellido
 * 7. segundo_apellido (can be empty)
 * 8. nombres
 * 9. tipo_movimiento (E or S)
 * 10. fecha_movimiento (DD/MM/YYYY)
 * 11. lugar_procedencia
 * 12. lugar_destino
 * 13. fecha_nacimiento (DD/MM/YYYY)
 */
export function generateSIRELine(
  guest: ReservationGuest,
  movementType: MovementType,
  movementDate: Date | string,
  hotelInfo: HotelInfo
): string {
  // Format dates
  const formattedMovementDate = formatDateToSIRE(movementDate);
  const formattedBirthDate = parseToSIREDate(guest.birth_date) || '';

  // Clean and uppercase text fields
  const firstSurname = cleanTextField(guest.first_surname);
  const secondSurname = cleanTextField(guest.second_surname) || ''; // Can be empty
  const givenNames = cleanTextField(guest.given_names);

  // Clean document number (remove hyphens, spaces, uppercase)
  const documentNumber = cleanDocumentNumber(guest.document_number);

  // Build the 13 fields
  const fields = [
    hotelInfo.hotel_sire_code, // 1. codigo_hotel
    hotelInfo.hotel_city_code, // 2. codigo_ciudad
    guest.document_type || '', // 3. tipo_documento
    documentNumber, // 4. numero_identificacion
    guest.nationality_code || '', // 5. codigo_nacionalidad
    firstSurname, // 6. primer_apellido
    secondSurname, // 7. segundo_apellido (can be empty)
    givenNames, // 8. nombres
    movementType, // 9. tipo_movimiento
    formattedMovementDate, // 10. fecha_movimiento
    guest.origin_city_code || '', // 11. lugar_procedencia
    guest.destination_city_code || '', // 12. lugar_destino
    formattedBirthDate, // 13. fecha_nacimiento
  ];

  return fields.join('\t');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Clean text field: uppercase, trim, remove invalid characters
 */
function cleanTextField(value: string | null | undefined): string {
  if (!value) return '';

  return value
    .toUpperCase()
    .trim()
    .replace(/[^A-ZÁÉÍÓÚÑÜ\s]/g, '') // Keep only valid characters
    .replace(/\s+/g, ' '); // Normalize spaces
}

/**
 * Clean document number: uppercase, remove hyphens and spaces
 */
function cleanDocumentNumber(value: string | null | undefined): string {
  if (!value) return '';

  return value.toUpperCase().replace(/[-\s]/g, '').trim();
}

/**
 * Generate filename for TXT export
 */
function generateFilename(movementType?: MovementType): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const suffix = movementType ? `_${movementType}` : '';
  return `SIRE_${date}${suffix}.txt`;
}

/**
 * Calculate content hash (SHA-256) for duplicate detection
 */
export async function calculateContentHash(content: string): Promise<string> {
  // Use Node.js crypto module (more compatible)
  const { createHash } = await import('crypto');
  const hash = createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

// ============================================================================
// BATCH PROCESSING HELPERS
// ============================================================================

/**
 * Group guests by reservation for processing
 */
export function groupGuestsByReservation(
  guests: ReservationGuest[]
): Map<string, ReservationGuest[]> {
  const grouped = new Map<string, ReservationGuest[]>();

  for (const guest of guests) {
    const existing = grouped.get(guest.reservation_id) || [];
    existing.push(guest);
    grouped.set(guest.reservation_id, existing);
  }

  // Sort guests within each reservation by guest_order
  grouped.forEach((guestList) => {
    guestList.sort((a, b) => a.guest_order - b.guest_order);
  });

  return grouped;
}

/**
 * Get summary statistics for a TXT generation result
 */
export function getTXTSummary(result: SIRETXTResult): string {
  const lines = [
    `=== SIRE TXT Export Summary ===`,
    `Archivo: ${result.filename}`,
    `Reservaciones: ${result.reservationCount}`,
    `Huéspedes válidos: ${result.guestCount}`,
    `Líneas generadas: ${result.lineCount}`,
    `Huéspedes excluidos: ${result.excluded.length}`,
    `Errores: ${result.errors.length}`,
  ];

  if (result.excluded.length > 0) {
    lines.push('', '--- Excluidos ---');
    for (const ex of result.excluded.slice(0, 10)) {
      // Show first 10
      lines.push(`  ${ex.guest_name}: ${ex.reason}`);
    }
    if (result.excluded.length > 10) {
      lines.push(`  ... y ${result.excluded.length - 10} más`);
    }
  }

  return lines.join('\n');
}

/**
 * Filter guests by nationality (exclude Colombians for SIRE)
 * SIRE only requires reporting of foreign nationals
 */
export function filterForeignNationals(guests: ReservationGuest[]): ReservationGuest[] {
  const COLOMBIA_SIRE_CODE = '169';
  return guests.filter((g) => g.nationality_code !== COLOMBIA_SIRE_CODE);
}
