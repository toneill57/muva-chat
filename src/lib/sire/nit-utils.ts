/**
 * NIT Processing Utilities for SIRE Compliance
 *
 * Colombian NIT (Número de Identificación Tributaria) format:
 * - Full format: 900222791-5 (9 digits + hyphen + verification digit)
 * - SIRE format: 900222791 (just the 9 digits, no verification)
 */

/**
 * Extracts the hotel SIRE code from a Colombian NIT
 *
 * SIRE requires the NIT WITHOUT the verification digit.
 *
 * @param nit - Full NIT with verification digit (e.g., "900222791-5" or "9002227915")
 * @returns Numeric part only (e.g., "900222791")
 *
 * @example
 * extractHotelCodeFromNIT("900222791-5")  // → "900222791"
 * extractHotelCodeFromNIT("900.222.791-5") // → "900222791"
 * extractHotelCodeFromNIT("9002227915")   // → "900222791"
 */
export function extractHotelCodeFromNIT(nit: string): string {
  if (!nit) return '';

  // Remove all non-digits except hyphen
  const cleaned = nit.replace(/[^\d-]/g, '');

  // If format has hyphen (e.g., "900222791-5"), extract everything before it
  if (cleaned.includes('-')) {
    return cleaned.split('-')[0];
  }

  // If no hyphen, assume last digit is verification digit
  // Colombian NITs are typically 9 digits + 1 verification digit = 10 total
  if (cleaned.length >= 10) {
    return cleaned.slice(0, -1);
  }

  // If less than 10 digits and no hyphen, return as-is (might already be clean)
  return cleaned;
}

/**
 * Validates if a NIT has the correct format
 *
 * @param nit - NIT to validate
 * @returns true if valid format
 */
export function isValidNITFormat(nit: string): boolean {
  if (!nit) return false;

  // Remove formatting characters
  const cleaned = nit.replace(/[\s.]/g, '');

  // Valid formats:
  // - 900222791-5 (with hyphen)
  // - 9002227915 (without hyphen, 10 digits)
  // - 900222791 (already clean, 9 digits)

  const withHyphen = /^\d{8,9}-\d$/.test(cleaned);
  const withoutHyphen = /^\d{9,10}$/.test(cleaned);

  return withHyphen || withoutHyphen;
}
