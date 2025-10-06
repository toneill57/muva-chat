import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/guest/logout
 *
 * Clears the guest_token HTTP-only cookie
 * This endpoint is called when a guest explicitly logs out
 *
 * Response: { success: true, message: string }
 */
export async function POST(_request: NextRequest) {
  try {
    const response = NextResponse.json(
      {
        success: true,
        message: 'Sesión cerrada exitosamente',
      },
      { status: 200 }
    )

    // Clear the guest_token cookie by setting maxAge to 0
    response.cookies.set('guest_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    })

    console.log('[guest-logout] Cookie cleared successfully')

    return response
  } catch (error) {
    console.error('[guest-logout] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al cerrar sesión',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/guest/logout
 *
 * API information endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/guest/logout',
    description: 'Clears guest authentication cookie',
    method: 'POST',
    response: {
      success: 'boolean',
      message: 'string',
    },
  })
}
