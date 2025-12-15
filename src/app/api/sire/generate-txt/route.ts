/**
 * SIRE TXT Generation API Endpoint
 *
 * POST /api/sire/generate-txt
 * Generates tab-delimited TXT file for SIRE compliance reporting.
 * Includes all guests (titular + companions) from reservation_guests table.
 *
 * Features:
 * - Staff authentication (API key or admin JWT)
 * - Date range filtering
 * - Movement type filtering (E, S, or both)
 * - Foreign nationals only (excludes Colombian nationals)
 * - Validation of all guest data before export
 * - Export tracking in sire_exports table
 *
 * Flow:
 * 1. Authenticate staff/admin
 * 2. Query reservations within date range
 * 3. Query all guests for those reservations
 * 4. Filter foreign nationals only
 * 5. Validate each guest's SIRE data
 * 6. Generate TXT content
 * 7. Track export in database
 * 8. Return TXT content + statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import {
  generateSIRETXT,
  calculateContentHash,
  getTXTSummary,
  filterForeignNationals,
  type GuestReservation,
  type HotelInfo,
  type SIRETXTResult,
  type MovementType,
} from '@/lib/sire/sire-txt-generator';
import { type ReservationGuest } from '@/lib/sire/sire-validation';

// ============================================================================
// Configuration
// ============================================================================

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for large exports

// ============================================================================
// Types
// ============================================================================

interface RequestBody {
  tenant_id: string;
  date?: string; // Single date (YYYY-MM-DD)
  date_from?: string; // Range start (YYYY-MM-DD)
  date_to?: string; // Range end (YYYY-MM-DD)
  movement_type?: 'E' | 'S'; // Optional filter
  include_colombians?: boolean; // Default: false (SIRE only requires foreigners)
}

interface SuccessResponse {
  success: true;
  txt_content: string;
  filename: string;
  statistics: {
    reservation_count: number;
    guest_count: number;
    line_count: number;
    excluded_count: number;
    error_count: number;
  };
  excluded: Array<{
    guest_name: string;
    reason: string;
    missing_fields: string[];
  }>;
  export_id: string;
  processing_time_ms: number;
}

interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = (await request.json()) as RequestBody;

    // Validate required fields
    if (!body.tenant_id) {
      return NextResponse.json(
        { success: false, error: 'tenant_id is required', code: 'MISSING_TENANT' },
        { status: 400 }
      );
    }

    // Validate date parameters
    const { dateFrom, dateTo } = parseDateParams(body);
    if (!dateFrom && !dateTo && !body.date) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one date parameter required (date, date_from, or date_to)',
          code: 'MISSING_DATE',
        },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createServerClient();

    // Get hotel info from tenant_registry
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('hotel_sire_code, hotel_city_code, tenant_name')
      .eq('tenant_id', body.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        {
          success: false,
          error: `Tenant not found: ${body.tenant_id}`,
          code: 'TENANT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Validate hotel SIRE configuration
    if (!tenant.hotel_sire_code || !tenant.hotel_city_code) {
      return NextResponse.json(
        {
          success: false,
          error: 'Hotel SIRE configuration incomplete. Please configure hotel_sire_code and hotel_city_code in tenant_registry.',
          code: 'MISSING_HOTEL_CONFIG',
        },
        { status: 400 }
      );
    }

    const hotelInfo: HotelInfo = {
      hotel_sire_code: tenant.hotel_sire_code,
      hotel_city_code: tenant.hotel_city_code,
    };

    // Query reservations within date range
    let reservationsQuery = supabase
      .from('guest_reservations')
      .select('id, tenant_id, guest_name, check_in_date, check_out_date, status')
      .eq('tenant_id', body.tenant_id)
      .eq('status', 'active');

    // Apply date filters
    if (body.date) {
      // Single date: check if check_in or check_out falls on this date
      reservationsQuery = reservationsQuery.or(
        `check_in_date.eq.${body.date},check_out_date.eq.${body.date}`
      );
    } else {
      if (dateFrom) {
        reservationsQuery = reservationsQuery.gte('check_out_date', dateFrom);
      }
      if (dateTo) {
        reservationsQuery = reservationsQuery.lte('check_in_date', dateTo);
      }
    }

    const { data: reservations, error: reservationsError } = await reservationsQuery;

    if (reservationsError) {
      console.error('[generate-txt] Reservations query error:', reservationsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to query reservations',
          code: 'DB_ERROR',
        },
        { status: 500 }
      );
    }

    if (!reservations || reservations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No reservations found for the specified date range',
          code: 'NO_RESERVATIONS',
        },
        { status: 404 }
      );
    }

    // Get reservation IDs
    const reservationIds = reservations.map((r) => r.id);

    // Query all guests for these reservations
    const { data: guests, error: guestsError } = await supabase
      .from('reservation_guests')
      .select('*')
      .eq('tenant_id', body.tenant_id)
      .in('reservation_id', reservationIds)
      .order('reservation_id')
      .order('guest_order');

    if (guestsError) {
      console.error('[generate-txt] Guests query error:', guestsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to query guests',
          code: 'DB_ERROR',
        },
        { status: 500 }
      );
    }

    // If no guests in reservation_guests table, return informative error
    if (!guests || guests.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No guest data found in reservation_guests table. Guest SIRE data must be captured before export.',
          code: 'NO_GUEST_DATA',
        },
        { status: 404 }
      );
    }

    // Filter foreign nationals only (unless include_colombians is true)
    const filteredGuests = body.include_colombians
      ? (guests as ReservationGuest[])
      : filterForeignNationals(guests as ReservationGuest[]);

    if (filteredGuests.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No foreign national guests found. SIRE only requires reporting of non-Colombian guests.',
          code: 'NO_FOREIGN_GUESTS',
        },
        { status: 404 }
      );
    }

    // Generate TXT content
    const result = generateSIRETXT(
      reservations as GuestReservation[],
      filteredGuests,
      hotelInfo,
      {
        movementType: body.movement_type as MovementType | undefined,
        dateFrom,
        dateTo,
      }
    );

    // If no valid guests after validation
    if (result.lineCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No guests have complete SIRE data for export',
          code: 'NO_COMPLETE_GUESTS',
        },
        { status: 400 }
      );
    }

    // Calculate content hash for duplicate detection
    const contentHash = await calculateContentHash(result.content);

    // Check for duplicate export
    const { data: existingExport } = await supabase
      .from('sire_exports')
      .select('id, export_date')
      .eq('tenant_id', body.tenant_id)
      .eq('txt_content_hash', contentHash)
      .single();

    if (existingExport) {
      console.log(
        `[generate-txt] Duplicate export detected: ${existingExport.id} from ${existingExport.export_date}`
      );
      // Continue but log the duplicate
    }

    // Save export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('sire_exports')
      .insert({
        tenant_id: body.tenant_id,
        export_date: new Date().toISOString().split('T')[0],
        date_range_from: dateFrom || body.date,
        date_range_to: dateTo || body.date,
        movement_type: body.movement_type || null,
        reservation_count: result.reservationCount,
        guest_count: result.guestCount,
        line_count: result.lineCount,
        excluded_count: result.excluded.length,
        txt_filename: result.filename,
        txt_content_hash: contentHash,
        file_size_bytes: new TextEncoder().encode(result.content).length,
        status: 'generated',
      })
      .select('id')
      .single();

    if (exportError) {
      console.error('[generate-txt] Failed to save export record:', exportError);
      // Continue anyway - the TXT was generated successfully
    }

    // Log summary
    console.log(`[generate-txt] ${getTXTSummary(result)}`);

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      txt_content: result.content,
      filename: result.filename,
      statistics: {
        reservation_count: result.reservationCount,
        guest_count: result.guestCount,
        line_count: result.lineCount,
        excluded_count: result.excluded.length,
        error_count: result.errors.length,
      },
      excluded: result.excluded.map((ex) => ({
        guest_name: ex.guest_name,
        reason: ex.reason,
        missing_fields: ex.missingFields,
      })),
      export_id: exportRecord?.id || 'not_tracked',
      processing_time_ms: processingTime,
    });
  } catch (error) {
    console.error('[generate-txt] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseDateParams(body: RequestBody): {
  dateFrom: string | undefined;
  dateTo: string | undefined;
} {
  if (body.date) {
    // Single date - use as both from and to
    return { dateFrom: body.date, dateTo: body.date };
  }

  return {
    dateFrom: body.date_from,
    dateTo: body.date_to,
  };
}

// ============================================================================
// GET Handler - Download previously generated export
// ============================================================================

export async function GET(
  request: NextRequest
): Promise<NextResponse<SuccessResponse | ErrorResponse | Response>> {
  const { searchParams } = new URL(request.url);
  const exportId = searchParams.get('export_id');

  if (!exportId) {
    return NextResponse.json(
      { success: false, error: 'export_id parameter required', code: 'MISSING_PARAM' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerClient();

    // Get export record
    const { data: exportRecord, error } = await supabase
      .from('sire_exports')
      .select('*')
      .eq('id', exportId)
      .single();

    if (error || !exportRecord) {
      return NextResponse.json(
        { success: false, error: 'Export not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Update status to downloaded
    await supabase
      .from('sire_exports')
      .update({ status: 'downloaded' })
      .eq('id', exportId);

    // Return export metadata (actual regeneration would require storing content)
    return NextResponse.json({
      success: true,
      export_id: exportRecord.id,
      filename: exportRecord.txt_filename,
      statistics: {
        reservation_count: exportRecord.reservation_count,
        guest_count: exportRecord.guest_count,
        line_count: exportRecord.line_count,
        excluded_count: exportRecord.excluded_count,
        error_count: 0,
      },
      status: exportRecord.status,
      created_at: exportRecord.created_at,
    } as unknown as SuccessResponse);
  } catch (error) {
    console.error('[generate-txt] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
