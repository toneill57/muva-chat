/**
 * SIRE TXT File Generator API
 *
 * POST /api/sire/generate-txt
 *
 * Generates SIRE-compliant TXT files for batch upload to Migración Colombia portal.
 * Reads ALL guests from reservation_guests table (supports multiple guests per reservation).
 * Filters by date, movement type, and excludes Colombian nationals.
 *
 * IMPORTANT: When movement_type='both', generates TWO records per guest:
 * - One E (Entrada) record with check_in_date
 * - One S (Salida) record with check_out_date
 *
 * MULTI-GUEST SUPPORT:
 * - Reads from reservation_guests table (not guest_reservations)
 * - Includes ALL guests (primary + companions) from each reservation
 * - Each guest generates their own SIRE records
 *
 * Request Body:
 * {
 *   tenant_id: string;           // Required
 *   date?: string;               // Single date YYYY-MM-DD (filters check_in OR check_out)
 *   date_from?: string;          // Range start YYYY-MM-DD
 *   date_to?: string;            // Range end YYYY-MM-DD
 *   movement_type?: 'E' | 'S' | 'both'; // Filter by movement type (default: 'both')
 *   test_mode?: boolean;         // If true, generates both E and S for all guests
 * }
 *
 * Response:
 * {
 *   success: true,
 *   txt_content: string,         // TXT file content (tab-delimited)
 *   filename: string,            // Suggested filename
 *   line_count: number,          // Total lines in TXT file
 *   guest_count: number,         // Number of unique guests
 *   reservation_count: number,   // Number of unique reservations
 *   breakdown: {
 *     entry_lines: number,       // Number of E (Entrada) lines
 *     exit_lines: number,        // Number of S (Salida) lines
 *     formula: string            // Explanation of line count calculation
 *   },
 *   excluded_count: number,      // Number of guests excluded
 *   excluded: Array<{            // Details of excluded guests
 *     reservation_id: string,
 *     guest_name: string,
 *     reason: string
 *   }>,
 *   generated_at: string         // ISO timestamp
 * }
 *
 * @module api/sire/generate-txt
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateSIRETXT, mapGuestToSIRE, SIREGuestData } from '@/lib/sire/sire-txt-generator';
import { createHash } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

interface GenerateTXTRequest {
  tenant_id: string;
  date?: string;                    // Single date YYYY-MM-DD
  date_from?: string;               // Range start YYYY-MM-DD
  date_to?: string;                 // Range end YYYY-MM-DD
  movement_type?: 'E' | 'S' | 'both'; // Filter by movement type
  test_mode?: boolean;              // If true, generates both E and S for all guests
}

interface ExcludedGuest {
  reservation_id: string;
  guest_name: string;
  reason: string;
}

// Colombian nationality code in SIRE system
const COLOMBIA_SIRE_CODE = '169';

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body: GenerateTXTRequest = await req.json();
    const { tenant_id, date, date_from, date_to, movement_type = 'both', test_mode = false } = body;

    // Validate required fields
    if (!tenant_id) {
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      );
    }

    // Validate date parameters (single date OR range, not both)
    if (date && (date_from || date_to)) {
      return NextResponse.json(
        { error: 'Cannot use both "date" and "date_from/date_to". Choose one.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // ========================================================================
    // QUERY RESERVATION GUESTS
    // ========================================================================

    // Build query to get ALL guests from reservation_guests with their reservation data
    let query = supabase
      .from('reservation_guests')
      .select(`
        *,
        reservation:guest_reservations!inner(
          id,
          tenant_id,
          check_in_date,
          check_out_date,
          hotel_sire_code,
          hotel_city_code,
          status
        )
      `)
      .eq('reservation.tenant_id', tenant_id)
      .neq('nationality_code', COLOMBIA_SIRE_CODE) // Exclude Colombians
      .in('reservation.status', ['active', 'confirmed', 'pending_payment']);

    // Date filtering logic:
    // - test_mode or movement_type='both': Filter by check_in_date OR check_out_date range
    // - movement_type='E': Filter by check_in_date
    // - movement_type='S': Filter by check_out_date
    if (test_mode || movement_type === 'both') {
      // For both events, we filter by check_in_date OR check_out_date being in range
      if (date) {
        // Single date: include if check_in or check_out matches
        query = query.or(`reservation.check_in_date.eq.${date},reservation.check_out_date.eq.${date}`);
      } else if (date_from || date_to) {
        // Range: include if either date falls within range
        // For simplicity, we'll query all and filter in code
        // This is more flexible for generating both E and S events
      }
    } else if (movement_type === 'E') {
      if (date) {
        query = query.eq('reservation.check_in_date', date);
      } else if (date_from || date_to) {
        if (date_from) query = query.gte('reservation.check_in_date', date_from);
        if (date_to) query = query.lte('reservation.check_in_date', date_to);
      }
    } else if (movement_type === 'S') {
      if (date) {
        query = query.eq('reservation.check_out_date', date);
      } else if (date_from || date_to) {
        if (date_from) query = query.gte('reservation.check_out_date', date_from);
        if (date_to) query = query.lte('reservation.check_out_date', date_to);
      }
    }

    const { data: guests, error: resError } = await query;

    if (resError) {
      console.error('[api/sire/generate-txt] Query error:', resError);
      return NextResponse.json(
        { error: 'Database query failed', details: resError.message },
        { status: 500 }
      );
    }

    if (!guests || guests.length === 0) {
      return NextResponse.json({
        success: true,
        txt_content: '',
        filename: `SIRE_${tenant_id}_empty.txt`,
        guest_count: 0,
        excluded_count: 0,
        excluded: [],
        generated_at: new Date().toISOString(),
        message: 'No foreign guests found for the specified criteria'
      });
    }

    // ========================================================================
    // PROCESS GUESTS
    // ========================================================================

    const sireGuests: SIREGuestData[] = [];
    const excluded: ExcludedGuest[] = [];

    // Determine if we should generate both E and S events
    const generateBothEvents = test_mode || movement_type === 'both';

    for (const guest of guests) {
      // Extract reservation data from the JOIN
      const reservation = guest.reservation;

      // Validate that reservation has hotel codes
      if (!reservation.hotel_sire_code || !reservation.hotel_city_code) {
        excluded.push({
          reservation_id: reservation.id,
          guest_name: guest.given_names ? `${guest.given_names} ${guest.first_surname}` : 'Unknown',
          reason: 'Missing hotel_sire_code or hotel_city_code'
        });
        continue;
      }

      const guestName = guest.given_names
        ? `${guest.given_names} ${guest.first_surname}`
        : 'Unknown';

      if (generateBothEvents) {
        // Generate BOTH E (check-in) and S (check-out) events for this guest

        // Generate E (Entrada) event
        if (reservation.check_in_date) {
          const sireDataE = mapGuestToSIRE(guest, reservation, 'E');
          if (sireDataE) {
            sireGuests.push(sireDataE);
          } else {
            excluded.push({
              reservation_id: reservation.id,
              guest_name: guestName,
              reason: 'Missing required SIRE fields for E event'
            });
          }
        }

        // Generate S (Salida) event
        if (reservation.check_out_date) {
          const sireDataS = mapGuestToSIRE(guest, reservation, 'S');
          if (sireDataS) {
            sireGuests.push(sireDataS);
          } else {
            excluded.push({
              reservation_id: reservation.id,
              guest_name: guestName,
              reason: 'Missing required SIRE fields for S event'
            });
          }
        }
      } else {
        // Single event mode - use the specified movement_type
        const sireData = mapGuestToSIRE(guest, reservation, movement_type as 'E' | 'S');

        if (sireData) {
          sireGuests.push(sireData);
        } else {
          excluded.push({
            reservation_id: reservation.id,
            guest_name: guestName,
            reason: 'Missing required SIRE fields (check logs for details)'
          });
        }
      }
    }

    // ========================================================================
    // GENERATE TXT FILE
    // ========================================================================

    const result = generateSIRETXT(sireGuests, tenant_id);

    // ========================================================================
    // CALCULATE STATISTICS
    // ========================================================================

    // Count unique guests (by document number + surname)
    const uniqueGuests = new Set(
      sireGuests.map(g => `${g.numero_identificacion}-${g.primer_apellido}`)
    );

    // Count unique reservations
    const uniqueReservationIds = new Set(
      guests.map((g: any) => g.reservation.id)
    );

    // Count entry and exit lines
    const entryCount = sireGuests.filter(g => g.tipo_movimiento === 'E').length;
    const exitCount = sireGuests.filter(g => g.tipo_movimiento === 'S').length;

    // ========================================================================
    // TRACK EXPORT IN DATABASE
    // ========================================================================

    // Only track if we generated content
    if (result.lineCount > 0) {
      try {
        // Calculate content hash for deduplication
        const contentHash = createHash('sha256')
          .update(result.content)
          .digest('hex');

        // Calculate file size in bytes
        const fileSizeBytes = Buffer.byteLength(result.content, 'utf8');

        // Insert export record
        const { error: insertError } = await supabase
          .from('sire_exports')
          .insert({
            tenant_id,
            export_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            date_range_from: date_from || date || null,
            date_range_to: date_to || date || null,
            movement_type: movement_type === 'both' ? null : movement_type,
            guest_count: uniqueGuests.size,
            reservation_count: uniqueReservationIds.size,
            excluded_count: excluded.length,
            line_count: result.lineCount,
            txt_filename: result.filename,
            txt_content_hash: contentHash,
            txt_content: result.content,
            file_size_bytes: fileSizeBytes,
            status: 'generated'
          });

        if (insertError) {
          console.error('[api/sire/generate-txt] Failed to track export:', insertError);
          // Don't fail the request, just log the error
        }
      } catch (trackError) {
        console.error('[api/sire/generate-txt] Error tracking export:', trackError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      txt_content: result.content,
      filename: result.filename,

      // Counts
      line_count: result.lineCount,
      guest_count: uniqueGuests.size,
      reservation_count: uniqueReservationIds.size,

      // Breakdown
      breakdown: {
        entry_lines: entryCount,
        exit_lines: exitCount,
        formula: `${uniqueGuests.size} guests x ${movement_type === 'both' ? '2 events' : '1 event'} = ${result.lineCount} lines`
      },

      // Exclusions
      excluded_count: excluded.length,
      excluded: excluded,

      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[api/sire/generate-txt] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
