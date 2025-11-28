/**
 * Super Admin Login Endpoint
 *
 * Authenticates super administrators and returns JWT token.
 *
 * POST /api/super-admin/login
 * Body: { username: string, password: string }
 * Response: { token: string, expiresIn: string } | { error: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { loginSuperAdmin, verifySuperAdminToken } from '@/lib/super-admin-auth'
import { logLogin } from '@/lib/audit-logger'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { username, password } = body

    // Validate required fields
    if (!username || !password) {
      console.log('[api/super-admin/login] Missing credentials')
      return NextResponse.json(
        { error: 'Missing credentials' },
        { status: 400 }
      )
    }

    // Validate input types
    if (typeof username !== 'string' || typeof password !== 'string') {
      console.log('[api/super-admin/login] Invalid credential types')
      return NextResponse.json(
        { error: 'Invalid credential format' },
        { status: 400 }
      )
    }

    // Authenticate using super-admin-auth library
    // (loginSuperAdmin already handles last_login_at update)
    const token = await loginSuperAdmin(username, password)

    if (!token) {
      console.log('[api/super-admin/login] Authentication failed for:', username)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    console.log('[api/super-admin/login] ✅ Login successful:', username)

    // Decode token to extract super_admin_id for audit logging
    const session = await verifySuperAdminToken(token)
    if (session) {
      // Log successful login (fire and forget - don't block response)
      logLogin(session.super_admin_id, username, request).catch((error) => {
        console.error('[api/super-admin/login] Failed to log audit entry:', error)
      })
    }

    return NextResponse.json({
      token,
      expiresIn: '7d',
    })
  } catch (error) {
    console.error('[api/super-admin/login] Unexpected error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
