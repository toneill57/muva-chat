/**
 * Guest Login API Endpoint
 *
 * Authenticates guests using check-in date + last 4 digits of phone number.
 * Returns JWT token for authenticated sessions.
 *
 * POST /api/guest/login
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateGuest,
  generateGuestToken,
  GuestAuthErrors,
  type GuestCredentials,
} from '@/lib/guest-auth'

// ============================================================================
// Types
// ============================================================================

interface LoginRequestBody {
  tenant_id: string
  check_in_date: string  // YYYY-MM-DD
  phone_last_4: string   // 4 digits
}

interface LoginSuccessResponse {
  success: true
  token: string
  reservation_id: string
  guest_info: {
    name: string
    check_in: string
    check_out: string
    reservation_code: string
    accommodation_unit?: {
      id: string
      name: string
      unit_number?: string
    }
    tenant_features?: {
      muva_access: boolean
    }
  }
}

interface LoginErrorResponse {
  success: false
  error: string
  code?: string
}

type LoginResponse = LoginSuccessResponse | LoginErrorResponse

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  try {
    // Parse request body
    const body = (await request.json()) as LoginRequestBody

    // Validate required fields
    if (!body.tenant_id || !body.check_in_date || !body.phone_last_4) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: tenant_id, check_in_date, phone_last_4',
          code: 'MISSING_FIELDS',
        },
        { status: 400 }
      )
    }

    // Validate phone_last_4 format
    if (body.phone_last_4.length !== 4 || !/^\d{4}$/.test(body.phone_last_4)) {
      return NextResponse.json(
        {
          success: false,
          error: 'phone_last_4 must be exactly 4 digits',
          code: 'INVALID_PHONE_FORMAT',
        },
        { status: 400 }
      )
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.check_in_date)) {
      return NextResponse.json(
        {
          success: false,
          error: 'check_in_date must be in YYYY-MM-DD format',
          code: 'INVALID_DATE_FORMAT',
        },
        { status: 400 }
      )
    }

    // Build credentials
    const credentials: GuestCredentials = {
      tenant_id: body.tenant_id,
      check_in_date: body.check_in_date,
      phone_last_4: body.phone_last_4,
    }

    // Authenticate guest
    const session = await authenticateGuest(credentials)

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: GuestAuthErrors.NO_RESERVATION,
          code: 'NO_RESERVATION',
        },
        { status: 401 }
      )
    }

    // Generate JWT token
    let token: string
    try {
      token = await generateGuestToken(session)
    } catch (error) {
      console.error('[guest-login] Token generation failed:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate authentication token',
          code: 'TOKEN_GENERATION_FAILED',
        },
        { status: 500 }
      )
    }

    // Return success response with HTTP-only cookie
    const response = NextResponse.json(
      {
        success: true,
        token,
        reservation_id: session.reservation_id,
        guest_info: {
          name: session.guest_name,
          check_in: session.check_in,   // Already YYYY-MM-DD string
          check_out: session.check_out, // Already YYYY-MM-DD string
          reservation_code: session.reservation_code,
          accommodation_unit: session.accommodation_unit,
          tenant_features: session.tenant_features,
        },
      },
      { status: 200 }
    )

    // Set HTTP-only cookie for automatic authentication
    response.cookies.set('guest_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    console.log(`[guest-login] ✅ Cookie set for ${session.guest_name} (reservation: ${session.reservation_id})`)

    return response
  } catch (error) {
    console.error('[guest-login] Unexpected error:', error)

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      )
    }

    // Generic server error
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
