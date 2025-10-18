/**
 * Staff Login API Endpoint
 *
 * POST /api/staff/login
 * Authenticates hotel staff and returns JWT token with permissions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateStaff, generateStaffToken } from '@/lib/staff-auth'
import { resolveSubdomainToTenantId } from '@/lib/tenant-resolver'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { username, password, tenant_id, subdomain } = body

    // Validate required fields
    if (!username || !password || !tenant_id) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'username, password, and tenant_id are required',
        },
        { status: 400 }
      )
    }

    // Validate field types
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      typeof tenant_id !== 'string'
    ) {
      return NextResponse.json(
        {
          error: 'Invalid field types',
          message: 'All fields must be strings',
        },
        { status: 400 }
      )
    }

    console.log('[staff-login-api] Authentication attempt:', {
      username,
      tenant_id,
      timestamp: new Date().toISOString(),
    })

    // Authenticate staff
    const session = await authenticateStaff({
      username,
      password,
      tenant_id,
    })

    if (!session) {
      console.warn('[staff-login-api] Authentication failed:', {
        username,
        tenant_id,
      })

      return NextResponse.json(
        {
          error: 'Invalid credentials',
          message: 'Username, password, or tenant_id is incorrect',
        },
        { status: 401 }
      )
    }

    // SUBDOMAIN VALIDATION: If subdomain is provided, ensure staff belongs to that tenant
    if (subdomain) {
      try {
        const resolvedTenantId = await resolveSubdomainToTenantId(subdomain)

        if (session.tenant_id !== resolvedTenantId) {
          console.warn('[staff-login-api] Subdomain mismatch:', {
            username: session.username,
            staff_tenant_id: session.tenant_id,
            subdomain_tenant_id: resolvedTenantId,
            subdomain,
          })

          return NextResponse.json(
            {
              error: 'Access denied',
              message: `No tienes acceso a este hotel (${subdomain})`,
              code: 'TENANT_MISMATCH',
            },
            { status: 403 }
          )
        }

        console.log('[staff-login-api] Subdomain validation passed:', {
          username: session.username,
          subdomain,
          tenant_id: resolvedTenantId,
        })
      } catch (error: any) {
        console.error('[staff-login-api] Subdomain resolution error:', error)
        return NextResponse.json(
          {
            error: 'Invalid subdomain',
            message: `No se pudo resolver el subdominio: ${subdomain}`,
          },
          { status: 400 }
        )
      }
    }

    // Generate JWT token
    const token = await generateStaffToken(session)

    // Calculate expiration timestamp (24 hours from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    console.log('[staff-login-api] Login successful:', {
      username: session.username,
      role: session.role,
      tenant_id: session.tenant_id,
    })

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          staff_info: {
            staff_id: session.staff_id,
            username: session.username,
            full_name: session.full_name,
            role: session.role,
            permissions: session.permissions,
          },
          session_expires_at: expiresAt.toISOString(),
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[staff-login-api] Login error:', error)

    // Check for specific error types
    if (error.message === 'Staff chat is not enabled for this tenant') {
      return NextResponse.json(
        {
          error: 'Service not available',
          message: 'Staff chat is not enabled for your organization',
          code: 'STAFF_CHAT_DISABLED',
        },
        { status: 403 }
      )
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST to login' },
    { status: 405 }
  )
}
