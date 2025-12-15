/**
 * SIRE Save Guest Data API Endpoint
 *
 * POST /api/sire/save-guest-data
 * Saves guest SIRE data to the reservation_guests table.
 * This endpoint bridges FASE 1-2 (data capture) with FASE 3 (TXT generation).
 *
 * Called from:
 * - GuestChatInterface when SIRE fields are captured via conversation
 * - DocumentPreview when OCR extraction is confirmed
 *
 * Flow:
 * 1. Receive guest data (conversational or OCR format)
 * 2. Normalize and convert to SIRE format
 * 3. Validate all required fields
 * 4. Insert or update reservation_guests
 * 5. Update sire_status based on completeness
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import {
  normalizeGuestData,
  type ConversationalGuestData,
  type NormalizedGuestData,
} from '@/lib/sire/type-converters';
import {
  validateGuestForSIRE,
  type ReservationGuest,
} from '@/lib/sire/sire-validation';

// ============================================================================
// Configuration
// ============================================================================

export const runtime = 'nodejs';

// ============================================================================
// Types
// ============================================================================

interface RequestBody {
  reservation_id: string;
  tenant_id: string;
  guest_order?: number; // 1 = titular, 2+ = companions (default: 1)
  source?: 'chat' | 'ocr' | 'manual'; // Where the data came from

  // Guest data (conversational format)
  first_surname?: string;
  second_surname?: string;
  given_names?: string;
  document_type?: string; // 'passport', '3', etc.
  document_number?: string;
  nationality_code?: string;
  origin_city_code?: string;
  destination_city_code?: string;
  birth_date?: string;

  // Full name alternative (will be split)
  full_name?: string;
}

interface SuccessResponse {
  success: true;
  guest_id: string;
  sire_status: 'pending' | 'complete';
  completeness: number;
  normalized_data: NormalizedGuestData;
  validation_errors: string[];
}

interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  validation_errors?: string[];
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const body = (await request.json()) as RequestBody;

    // Validate required fields
    if (!body.reservation_id) {
      return NextResponse.json(
        { success: false, error: 'reservation_id is required', code: 'MISSING_RESERVATION' },
        { status: 400 }
      );
    }

    if (!body.tenant_id) {
      return NextResponse.json(
        { success: false, error: 'tenant_id is required', code: 'MISSING_TENANT' },
        { status: 400 }
      );
    }

    // Normalize guest data
    const conversationalData: ConversationalGuestData = {
      first_surname: body.first_surname,
      second_surname: body.second_surname,
      given_names: body.given_names,
      full_name: body.full_name,
      document_type: body.document_type,
      document_number: body.document_number,
      nationality_code: body.nationality_code,
      origin_city_code: body.origin_city_code,
      destination_city_code: body.destination_city_code,
      birth_date: body.birth_date,
    };

    const normalizedData = normalizeGuestData(conversationalData);

    // Build guest record for validation
    const guestOrder = body.guest_order || 1;
    const guestRecord: Partial<ReservationGuest> = {
      reservation_id: body.reservation_id,
      tenant_id: body.tenant_id,
      guest_order: guestOrder,
      is_primary_guest: guestOrder === 1,
      guest_type: normalizedData.guest_type,
      guest_name: normalizedData.guest_name,
      document_type: normalizedData.document_type,
      document_number: normalizedData.document_number,
      first_surname: normalizedData.first_surname,
      second_surname: normalizedData.second_surname,
      given_names: normalizedData.given_names,
      birth_date: normalizedData.birth_date,
      nationality_code: normalizedData.nationality_code,
      origin_city_code: normalizedData.origin_city_code,
      destination_city_code: normalizedData.destination_city_code,
      sire_status: 'pending',
    };

    // Validate guest data
    const validation = validateGuestForSIRE(guestRecord as ReservationGuest);

    // Determine SIRE status based on completeness
    const sireStatus = validation.valid ? 'complete' : 'pending';
    guestRecord.sire_status = sireStatus;

    // Create Supabase client
    const supabase = await createServerClient();

    // Verify reservation exists
    const { data: reservation, error: resError } = await supabase
      .from('guest_reservations')
      .select('id, tenant_id')
      .eq('id', body.reservation_id)
      .eq('tenant_id', body.tenant_id)
      .single();

    if (resError || !reservation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reservation not found',
          code: 'RESERVATION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check if guest already exists (upsert)
    const { data: existingGuest } = await supabase
      .from('reservation_guests')
      .select('id')
      .eq('reservation_id', body.reservation_id)
      .eq('guest_order', guestOrder)
      .single();

    let guestId: string;

    if (existingGuest) {
      // Update existing guest
      const { data: updated, error: updateError } = await supabase
        .from('reservation_guests')
        .update({
          guest_type: guestRecord.guest_type,
          guest_name: guestRecord.guest_name,
          document_type: guestRecord.document_type,
          document_number: guestRecord.document_number,
          first_surname: guestRecord.first_surname,
          second_surname: guestRecord.second_surname,
          given_names: guestRecord.given_names,
          birth_date: guestRecord.birth_date,
          nationality_code: guestRecord.nationality_code,
          origin_city_code: guestRecord.origin_city_code,
          destination_city_code: guestRecord.destination_city_code,
          sire_status: guestRecord.sire_status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingGuest.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('[save-guest-data] Update error:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update guest data', code: 'DB_ERROR' },
          { status: 500 }
        );
      }

      guestId = updated!.id;
      console.log(`[save-guest-data] Updated guest ${guestId} for reservation ${body.reservation_id}`);
    } else {
      // Insert new guest
      const { data: inserted, error: insertError } = await supabase
        .from('reservation_guests')
        .insert({
          reservation_id: body.reservation_id,
          tenant_id: body.tenant_id,
          guest_order: guestOrder,
          is_primary_guest: guestOrder === 1,
          guest_type: guestRecord.guest_type,
          guest_name: guestRecord.guest_name,
          document_type: guestRecord.document_type,
          document_number: guestRecord.document_number,
          first_surname: guestRecord.first_surname,
          second_surname: guestRecord.second_surname,
          given_names: guestRecord.given_names,
          birth_date: guestRecord.birth_date,
          nationality_code: guestRecord.nationality_code,
          origin_city_code: guestRecord.origin_city_code,
          destination_city_code: guestRecord.destination_city_code,
          sire_status: guestRecord.sire_status,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[save-guest-data] Insert error:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to save guest data', code: 'DB_ERROR' },
          { status: 500 }
        );
      }

      guestId = inserted!.id;
      console.log(`[save-guest-data] Inserted guest ${guestId} for reservation ${body.reservation_id}`);
    }

    return NextResponse.json({
      success: true,
      guest_id: guestId,
      sire_status: sireStatus,
      completeness: validation.completeness,
      normalized_data: normalizedData,
      validation_errors: validation.errors.map((e) => e.message),
    });
  } catch (error) {
    console.error('[save-guest-data] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET Handler - Retrieve guest data
// ============================================================================

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const reservationId = searchParams.get('reservation_id');
  const guestOrder = searchParams.get('guest_order');

  if (!reservationId) {
    return NextResponse.json(
      { success: false, error: 'reservation_id parameter required' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerClient();

    let query = supabase
      .from('reservation_guests')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('guest_order');

    if (guestOrder) {
      query = query.eq('guest_order', parseInt(guestOrder));
    }

    const { data: guests, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve guest data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      guests: guests || [],
      count: guests?.length || 0,
    });
  } catch (error) {
    console.error('[save-guest-data] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
