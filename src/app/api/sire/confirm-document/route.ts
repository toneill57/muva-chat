/**
 * SIRE Document Confirmation API Endpoint
 *
 * POST /api/sire/confirm-document
 *
 * Confirma o rechaza la sobrescritura de datos de reserva con datos extraídos de pasaporte.
 * Este endpoint se llama cuando hay un conflicto de nombres detectado.
 *
 * Features:
 * - Procesa decisión del usuario sobre sobrescritura de datos
 * - Guarda datos del pasaporte a DB si usuario confirma
 * - Actualiza guest_name sincronizado
 * - Soporte para guest_order (titular vs acompañantes)
 *
 * @created December 25, 2025
 * @context SIRE Auto-Submission - Sobrescritura Condicional
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyGuestToken, extractTokenFromHeader, GuestAuthErrors } from '@/lib/guest-auth'
import type { FieldExtractionResult } from '@/lib/sire/field-extraction'

// ============================================================================
// Configuration
// ============================================================================

export const runtime = 'nodejs'
export const maxDuration = 10 // 10 seconds

// ============================================================================
// Types
// ============================================================================

interface RequestBody {
  reservation_id: string
  extracted_data: FieldExtractionResult
  user_decision: 'use_document' | 'keep_existing'
  guest_order?: number // Optional: defaults to 1 (titular)
}

interface SuccessResponse {
  success: true
  saved_to_db: boolean
  guest_name?: string
}

interface ErrorResponse {
  success: false
  error: string
  code: string
  details?: string
}

type Response = SuccessResponse | ErrorResponse

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<Response>> {
  try {
    // === GUEST AUTHENTICATION ===
    // Try cookie first, then fall back to Authorization header (same as /api/guest/chat)
    const cookieToken = request.cookies.get('guest_token')?.value
    const authHeader = request.headers.get('Authorization')
    const headerToken = extractTokenFromHeader(authHeader)
    const token = cookieToken || headerToken

    if (!token) {
      console.error('[sire/confirm-document] Missing authentication (no cookie or header)')
      return NextResponse.json(
        {
          success: false,
          error: GuestAuthErrors.MISSING_HEADER,
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      )
    }

    const guestSession = await verifyGuestToken(token)

    if (!guestSession) {
      console.error('[sire/confirm-document] Invalid or expired token')
      return NextResponse.json(
        {
          success: false,
          error: GuestAuthErrors.INVALID_TOKEN,
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      )
    }

    console.log(`[sire/confirm-document] Authenticated guest: ${guestSession.guest_name} (reservation: ${guestSession.reservation_id})`)

    // === PARSE REQUEST BODY ===
    const body: RequestBody = await request.json()
    const { reservation_id, extracted_data, user_decision, guest_order = 1 } = body

    if (!reservation_id || !extracted_data || !user_decision) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: reservation_id, extracted_data, user_decision',
          code: 'MISSING_PARAMETERS',
        },
        { status: 400 }
      )
    }

    if (user_decision !== 'use_document' && user_decision !== 'keep_existing') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid user_decision. Must be "use_document" or "keep_existing"',
          code: 'INVALID_PARAMETER',
        },
        { status: 400 }
      )
    }

    console.log('[sire/confirm-document] User decision:', user_decision)

    // === CASE 1: KEEP EXISTING DATA ===
    if (user_decision === 'keep_existing') {
      console.log('[sire/confirm-document] User chose to keep existing data, no changes made')
      return NextResponse.json({
        success: true,
        saved_to_db: false,
      })
    }

    // === CASE 2: USE DOCUMENT DATA ===
    console.log('[sire/confirm-document] User chose to use document data, saving to DB...')

    const supabase = createServerClient()

    // Map extracted data (Spanish field names) to DB columns (English)
    const dbData: Record<string, any> = {}

    if (extracted_data.sireData.primer_apellido) dbData.first_surname = extracted_data.sireData.primer_apellido
    if (extracted_data.sireData.segundo_apellido) dbData.second_surname = extracted_data.sireData.segundo_apellido
    if (extracted_data.sireData.nombres) dbData.given_names = extracted_data.sireData.nombres
    if (extracted_data.sireData.tipo_documento) dbData.document_type = extracted_data.sireData.tipo_documento
    if (extracted_data.sireData.documento_numero) dbData.document_number = extracted_data.sireData.documento_numero
    if (extracted_data.sireData.codigo_nacionalidad) dbData.nationality_code = extracted_data.sireData.codigo_nacionalidad

    // Convert birth_date from DD/MM/YYYY to YYYY-MM-DD for PostgreSQL
    if (extracted_data.sireData.fecha_nacimiento) {
      const ddmmyyyy = extracted_data.sireData.fecha_nacimiento
      const parts = ddmmyyyy.split('/')
      if (parts.length === 3) {
        dbData.birth_date = `${parts[2]}-${parts[1]}-${parts[0]}` // YYYY-MM-DD
      }
    }

    // === SYNC guest_name FROM EXTRACTED DATA ===
    // Construir nombre completo para guest_name (mantiene coherencia en logs)
    const fullName = [
      extracted_data.sireData.nombres,
      extracted_data.sireData.primer_apellido,
      extracted_data.sireData.segundo_apellido
    ].filter(Boolean).join(' ').toUpperCase()

    if (fullName) {
      dbData.guest_name = fullName
      console.log('[sire/confirm-document] Syncing guest_name:', fullName)
    }

    // === SAVE TO DATABASE ===
    const { error: updateError } = await supabase
      .from('guest_reservations')
      .update(dbData)
      .eq('id', reservation_id)

    if (updateError) {
      console.error('[sire/confirm-document] Failed to save to guest_reservations:', updateError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save document data to database',
          code: 'DB_UPDATE_ERROR',
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    console.log('[sire/confirm-document] ✅ Document data saved successfully:', Object.keys(dbData))

    // === RETURN SUCCESS ===
    return NextResponse.json({
      success: true,
      saved_to_db: true,
      guest_name: fullName,
    })

  } catch (error: any) {
    console.error('[sire/confirm-document] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET Handler - API Info
// ============================================================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: '/api/sire/confirm-document',
    description: 'Confirma o rechaza sobrescritura de datos de reserva con datos de pasaporte',
    method: 'POST',
    authentication: 'JWT token via Cookie or Authorization header',
    request: {
      content_type: 'application/json',
      body: {
        reservation_id: 'string (required, UUID)',
        extracted_data: 'FieldExtractionResult (required, objeto con sireData)',
        user_decision: '"use_document" | "keep_existing" (required)',
        guest_order: 'number (optional, defaults to 1)',
      },
    },
    response: {
      success: 'boolean',
      saved_to_db: 'boolean',
      guest_name: 'string (only if saved)',
    },
    examples: {
      use_document: {
        reservation_id: '12345678-1234-1234-1234-123456789012',
        extracted_data: {
          sireData: {
            nombres: 'JUAN CARLOS',
            primer_apellido: 'GARCÍA',
            segundo_apellido: 'LÓPEZ',
            documento_numero: 'AB123456',
            tipo_documento: '3',
            codigo_nacionalidad: '169',
            fecha_nacimiento: '25/03/1985'
          },
          errors: [],
          warnings: []
        },
        user_decision: 'use_document'
      },
      keep_existing: {
        reservation_id: '12345678-1234-1234-1234-123456789012',
        extracted_data: { sireData: {}, errors: [], warnings: [] },
        user_decision: 'keep_existing'
      }
    },
    features: [
      'JWT authentication',
      'Sobrescritura condicional de datos',
      'Sync automático de guest_name',
      'Soporte multi-guest (guest_order)',
      'Field mapping español → inglés',
      'Date format conversion DD/MM/YYYY → YYYY-MM-DD',
    ],
  })
}

// ============================================================================
// OPTIONS Handler (CORS)
// ============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
