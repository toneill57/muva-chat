/**
 * SIRE TXT File Generator API
 *
 * POST /api/sire/generate-txt
 *
 * Generates SIRE-compliant TXT files for batch upload to Migración Colombia portal.
 * Filters reservations by date, movement type, and excludes Colombian nationals.
 *
 * Request Body:
 * {
 *   tenant_id: string;           // Required
 *   date?: string;               // Single date YYYY-MM-DD (for movement_date)
 *   date_from?: string;          // Range start YYYY-MM-DD
 *   date_to?: string;            // Range end YYYY-MM-DD
 *   movement_type?: 'E' | 'S' | 'both'; // Filter by movement type (default: 'both')
 * }
 *
 * Response:
 * {
 *   success: true,
 *   txt_content: string,         // TXT file content (tab-delimited)
 *   filename: string,            // Suggested filename
 *   guest_count: number,         // Number of guests included
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
import { generateSIRETXT, mapReservationToSIRE, SIREGuestData, TenantSIREInfo } from '@/lib/sire/sire-txt-generator';
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
    const { tenant_id, date, date_from, date_to, movement_type = 'both' } = body;

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
    // QUERY RESERVATIONS
    // ========================================================================

    // Build query
    let query = supabase
      .from('guest_reservations')
      .select('*')
      .eq('tenant_id', tenant_id)
      .neq('nationality_code', COLOMBIA_SIRE_CODE); // Exclude Colombians

    // Date filtering based on movement_date
    if (date) {
      query = query.eq('movement_date', date);
    } else if (date_from || date_to) {
      if (date_from) {
        query = query.gte('movement_date', date_from);
      }
      if (date_to) {
        query = query.lte('movement_date', date_to);
      }
    }

    // Movement type filtering
    if (movement_type !== 'both') {
      query = query.eq('movement_type', movement_type);
    }

    const { data: reservations, error: resError } = await query;

    if (resError) {
      console.error('[api/sire/generate-txt] Query error:', resError);
      return NextResponse.json(
        { error: 'Database query failed', details: resError.message },
        { status: 500 }
      );
    }

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({
        success: true,
        txt_content: '',
        filename: `SIRE_${tenant_id}_empty.txt`,
        guest_count: 0,
        excluded_count: 0,
        excluded: [],
        generated_at: new Date().toISOString(),
        message: 'No foreign guest reservations found for the specified criteria'
      });
    }

    // ========================================================================
    // PROCESS RESERVATIONS
    // ========================================================================

    const sireGuests: SIREGuestData[] = [];
    const excluded: ExcludedGuest[] = [];

    for (const reservation of reservations) {
      // Validate that reservation has hotel codes
      if (!reservation.hotel_sire_code || !reservation.hotel_city_code) {
        excluded.push({
          reservation_id: reservation.id,
          guest_name: reservation.guest_name || 'Unknown',
          reason: 'Missing hotel_sire_code or hotel_city_code'
        });
        continue;
      }

      // Build tenant info from reservation fields
      const tenantInfo: TenantSIREInfo = {
        hotel_sire_code: reservation.hotel_sire_code,
        hotel_city_code: reservation.hotel_city_code
      };

      // Map to SIRE format
      const movementType = reservation.movement_type as 'E' | 'S';
      const sireData = mapReservationToSIRE(reservation, tenantInfo, movementType);

      if (sireData) {
        sireGuests.push(sireData);
      } else {
        excluded.push({
          reservation_id: reservation.id,
          guest_name: reservation.guest_name || 'Unknown',
          reason: 'Missing required SIRE fields (check logs for details)'
        });
      }
    }

    // ========================================================================
    // GENERATE TXT FILE
    // ========================================================================

    const result = generateSIRETXT(sireGuests, tenant_id);

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
            guest_count: result.lineCount,
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
      guest_count: result.lineCount,
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
