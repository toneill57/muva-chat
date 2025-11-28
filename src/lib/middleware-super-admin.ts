/**
 * Super Admin Middleware
 *
 * Protects super admin API routes with JWT authentication.
 * Attaches super admin identity to request headers for downstream handlers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminToken, extractTokenFromHeader } from '@/lib/super-admin-auth'

/**
 * Verify super admin token and attach identity to request
 *
 * @param request - Incoming Next.js request
 * @returns NextResponse with super admin headers or 401 error
 */
export async function superAdminMiddleware(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      console.log('[middleware/super-admin] Missing authorization token')
      return NextResponse.json(
        { error: 'Unauthorized - Token required' },
        { status: 401 }
      )
    }

    // Verify JWT token
    const superAdmin = await verifySuperAdminToken(token)

    if (!superAdmin) {
      console.log('[middleware/super-admin] Invalid or expired token')
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Attach super admin identity to request headers
    // This allows downstream API routes to access super admin context
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-super-admin-id', superAdmin.super_admin_id)
    requestHeaders.set('x-super-admin-username', superAdmin.username)
    requestHeaders.set('x-super-admin-role', superAdmin.role)

    // Pass permissions as JSON string (can be parsed by API routes)
    requestHeaders.set('x-super-admin-permissions', JSON.stringify(superAdmin.permissions))

    console.log('[middleware/super-admin] ✅ Authenticated:', superAdmin.username)

    // Continue to API route with enriched headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    console.error('[middleware/super-admin] Middleware error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Extract super admin context from request headers
 *
 * Helper function for API routes to retrieve super admin identity
 * injected by the middleware.
 *
 * @param request - Next.js request object
 * @returns Super admin context or null
 */
export function getSuperAdminContext(request: NextRequest) {
  const id = request.headers.get('x-super-admin-id')
  const username = request.headers.get('x-super-admin-username')
  const permissionsJson = request.headers.get('x-super-admin-permissions')

  if (!id || !username || !permissionsJson) {
    return null
  }

  try {
    const permissions = JSON.parse(permissionsJson)
    return {
      super_admin_id: id,
      username,
      role: 'super_admin' as const,
      permissions,
    }
  } catch (error) {
    console.error('[middleware/super-admin] Failed to parse permissions:', error)
    return null
  }
}
