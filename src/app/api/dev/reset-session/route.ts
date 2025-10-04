/**
 * Dev Chat Reset Session API Endpoint
 *
 * Expires the session_id cookie to force creation of new session.
 * Used by the "New Conversation" button in chat interface.
 */

import { NextResponse } from 'next/server'

/**
 * POST /api/dev/reset-session
 *
 * Expires the session_id cookie (HttpOnly, so can't be deleted from JS)
 */
export async function POST() {
  try {
    console.log('[reset-session] Expiring session cookie')

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Session cookie expired'
    })

    // Expire the session_id cookie by setting Max-Age=0
    const cookieOptions = [
      'session_id=',
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Path=/',
      'Max-Age=0', // Expires immediately
    ]

    response.headers.set('Set-Cookie', cookieOptions.join('; '))

    return response
  } catch (error) {
    console.error('[reset-session] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset session'
      },
      { status: 500 }
    )
  }
}
