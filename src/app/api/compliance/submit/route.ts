/**
 * Compliance Submission API (MOCK Version)
 *
 * POST /api/compliance/submit
 *
 * Guarda submissions en DB con status 'pending' SIN ejecutar SIRE/TRA real.
 * SIRE/TRA real se implementará en FASE 3.2-3.3 (opcional).
 *
 * Flow:
 * 1. Recibir conversational_data desde frontend
 * 2. Validar campos requeridos (nombre_completo, numero_pasaporte, pais_texto)
 * 3. Mapear conversational → SIRE (13 campos oficiales)
 * 4. Guardar en compliance_submissions con status 'pending'
 * 5. Retornar mockRefs (NO ejecutar SIRE/TRA real)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import {
  ComplianceChatEngine,
  type ConversationalData,
  type TenantComplianceConfig,
  type ReservationData,
  updateReservationWithComplianceData,
} from '@/lib/compliance-chat-engine';

// ============================================================================
// INTERFACES
// ============================================================================

interface SubmitRequest {
  conversationalData: ConversationalData;
  guestId?: string;
  reservationId?: string;
  conversationId?: string;
}

// ============================================================================
// POST /api/compliance/submit
// ============================================================================

export async function POST(request: NextRequest) {
  console.log('[compliance-api] POST /api/compliance/submit (MOCK MODE)');

  try {
    const supabase = createServerClient();

    // ========================================================================
    // STEP 1: Parse and validate request body
    // ========================================================================

    const body: SubmitRequest = await request.json();
    const {
      conversationalData,
      guestId,
      reservationId,
      conversationId
    } = body;

    console.log('[compliance-api] Request received:', {
      conversationalDataFields: Object.keys(conversationalData || {}),
      guestId,
      reservationId,
      conversationId
    });

    // Validate conversational_data exists
    if (!conversationalData) {
      return NextResponse.json(
        {
          error: 'Missing required field: conversationalData'
        },
        { status: 400 }
      );
    }

    // Validate required conversational fields
    const requiredFields = [
      'nombre_completo',
      'numero_pasaporte',
      'pais_texto'
    ];

    const missingFields = requiredFields.filter(
      field => !conversationalData[field as keyof ConversationalData]
    );

    if (missingFields.length > 0) {
      console.error('[compliance-api] Missing required fields:', missingFields);

      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields,
          details: 'nombre_completo, numero_pasaporte, and pais_texto are required'
        },
        { status: 400 }
      );
    }

    console.log('[compliance-api] Conversational data preview:', {
      nombre: conversationalData.nombre_completo?.substring(0, 30),
      pasaporte: conversationalData.numero_pasaporte,
      pais: conversationalData.pais_texto,
      fecha_nacimiento: conversationalData.fecha_nacimiento,
      proposito_viaje: conversationalData.proposito_viaje?.substring(0, 50)
    });

    // ========================================================================
    // STEP 2: Get reservation data (for tenant_id and check-in date)
    // ========================================================================

    let tenantId: string;
    let reservationData: ReservationData | undefined;
    let actualGuestId: string | undefined = guestId;

    if (reservationId) {
      const { data: reservation, error: reservationError } = await supabase
        .from('guest_reservations')
        .select('id, tenant_id, check_in_date, check_out_date')
        .eq('id', reservationId)
        .single();

      if (reservationError || !reservation) {
        console.error('[compliance-api] Reservation not found:', reservationError);
        return NextResponse.json(
          { error: 'Reservation not found' },
          { status: 404 }
        );
      }

      tenantId = reservation.tenant_id;
      actualGuestId = reservation.id;
      reservationData = {
        check_in_date: reservation.check_in_date,
        check_out_date: reservation.check_out_date
      };

      console.log('[compliance-api] Reservation found:', {
        tenantId,
        checkIn: reservationData.check_in_date,
        checkOut: reservationData.check_out_date
      });
    } else {
      // Fallback: try to get tenant from conversation
      if (!conversationId) {
        return NextResponse.json(
          {
            error: 'Missing required field: reservationId or conversationId'
          },
          { status: 400 }
        );
      }

      const { data: conversation, error: conversationError } = await supabase
        .from('guest_conversations')
        .select('tenant_id, reservation_id')
        .eq('id', conversationId)
        .single();

      if (conversationError || !conversation) {
        console.error('[compliance-api] Conversation not found:', conversationError);
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      tenantId = conversation.tenant_id;

      // Get reservation data from conversation
      if (conversation.reservation_id) {
        const { data: reservation } = await supabase
          .from('guest_reservations')
          .select('id, check_in_date, check_out_date')
          .eq('id', conversation.reservation_id)
          .single();

        if (reservation) {
          actualGuestId = reservation.id;
          reservationData = {
            check_in_date: reservation.check_in_date,
            check_out_date: reservation.check_out_date
          };
        }
      }
    }

    // ========================================================================
    // STEP 3: Get tenant SIRE configuration
    // ========================================================================

    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('tenant_id, nombre_comercial, features')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    if (tenantError || !tenant) {
      console.error('[compliance-api] Tenant not found:', tenantError);
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 404 }
      );
    }

    // Extract SIRE config from tenant features
    const features = tenant.features || {};
    const sireHotelCode = features.sire_hotel_code;
    const sireCityCode = features.sire_city_code;

    if (!sireHotelCode || !sireCityCode) {
      console.warn('[compliance-api] Tenant missing SIRE configuration:', {
        tenantId,
        hasSireHotelCode: !!sireHotelCode,
        hasSireCityCode: !!sireCityCode
      });

      // Use default values for testing
      const defaultSireHotelCode = '999999';
      const defaultSireCityCode = '88001'; // San Andrés

      console.log('[compliance-api] Using default SIRE codes:', {
        hotel: defaultSireHotelCode,
        ciudad: defaultSireCityCode
      });

      var tenantConfig: TenantComplianceConfig = {
        codigo_hotel: defaultSireHotelCode,
        codigo_ciudad: defaultSireCityCode,
        nombre_hotel: tenant.nombre_comercial
      };
    } else {
      var tenantConfig: TenantComplianceConfig = {
        codigo_hotel: sireHotelCode,
        codigo_ciudad: sireCityCode,
        nombre_hotel: tenant.nombre_comercial
      };
    }

    console.log('[compliance-api] Tenant config:', tenantConfig);

    // ========================================================================
    // STEP 4: Map conversational → SIRE (13 campos oficiales)
    // ========================================================================

    const engine = new ComplianceChatEngine();

    const sireData = await engine.mapToSIRE(
      conversationalData,
      tenantConfig,
      reservationData
    );

    console.log('[compliance-api] SIRE mapping complete:', {
      codigo_hotel: sireData.codigo_hotel,
      codigo_ciudad: sireData.codigo_ciudad,
      tipo_documento: sireData.tipo_documento,
      numero_identificacion: sireData.numero_identificacion,
      nacionalidad: sireData.codigo_nacionalidad,
      nombre: `${sireData.nombres} ${sireData.primer_apellido} ${sireData.segundo_apellido}`,
      fecha_movimiento: sireData.fecha_movimiento
    });

    // ========================================================================
    // STEP 5: Save to compliance_submissions (status = 'pending')
    // ========================================================================

    const submissionData = {
      guest_id: actualGuestId,
      tenant_id: tenantId,
      type: 'both', // 'sire', 'tra', or 'both' (per DB constraint)
      status: 'pending',
      data: {
        conversational_data: conversationalData,
        sire_data: sireData
      },
      sire_response: null,
      tra_response: null,
      error_message: null,
      submitted_at: new Date().toISOString(),
      submitted_by: 'guest'
    };

    console.log('[compliance-api] Saving submission to DB:', {
      guest_id: actualGuestId,
      tenant_id: tenantId,
      type: submissionData.type,
      status: submissionData.status,
      data_layers: Object.keys(submissionData.data)
    });

    const { data: submission, error: insertError } = await supabase
      .from('compliance_submissions')
      .insert(submissionData)
      .select()
      .single();

    if (insertError) {
      console.error('[compliance-api] Failed to save submission:', insertError);

      return NextResponse.json(
        {
          error: 'Failed to save submission to database',
          details: insertError.message
        },
        { status: 500 }
      );
    }

    console.log('[compliance-api] ✅ Submission saved to DB:', {
      submissionId: submission.id,
      status: submission.status
    });

    // ========================================================================
    // STEP 5.1: Update guest_reservations with SIRE compliance data (FASE 2)
    // ========================================================================

    if (reservationId) {
      try {
        console.log('[compliance-api] Updating reservation with SIRE data...', {
          reservation_id: reservationId
        });

        await updateReservationWithComplianceData(reservationId, sireData);

        console.log('[compliance-api] ✅ Reservation updated with SIRE compliance data');
      } catch (updateError: any) {
        // Log error but don't fail the request (submission already saved)
        console.error('[compliance-api] ⚠️ Failed to update reservation (non-critical):', {
          error: updateError.message,
          reservation_id: reservationId
        });

        // Continue execution - submission is still valid
      }
    } else {
      console.log('[compliance-api] ⚠️ No reservationId provided, skipping reservation update');
    }

    // ========================================================================
    // STEP 6: Generate MOCK references (NO ejecutar SIRE/TRA real)
    // ========================================================================

    const timestamp = Date.now();
    const mockRefs = {
      sireRef: `MOCK-SIRE-${timestamp}`,
      traRef: `MOCK-TRA-${timestamp}`
    };

    console.log('[compliance-api] 🎭 MOCK mode - Generated mock references:', mockRefs);
    console.log('[compliance-api] ⚠️ SIRE/TRA not executed (MOCK mode)');

    // ========================================================================
    // STEP 7: Success response
    // ========================================================================

    const response = {
      success: true,
      submissionId: submission.id,
      mockRefs,
      timestamp: submission.submitted_at,
      status: submission.status,
      message: 'Submission guardada en DB. SIRE/TRA se ejecutará en FASE 3.2-3.3'
    };

    console.log('[compliance-api] ✅ Response:', response);

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('[compliance-api] Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
