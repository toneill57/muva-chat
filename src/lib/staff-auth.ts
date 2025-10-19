/**
 * Staff Authentication Library
 *
 * Provides authentication functions for hotel staff using username/password.
 * Generates JWT tokens for secure staff sessions.
 */

import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { createServerClient } from './supabase'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface StaffCredentials {
  username: string
  password: string
  tenant_id: string
}

export interface StaffSession {
  staff_id: string
  tenant_id: string
  username: string
  full_name: string
  role: 'ceo' | 'admin' | 'housekeeper'
  permissions: {
    sire_access: boolean
    admin_panel: boolean
    reports_access: boolean
    modify_operations: boolean
  }
}

// ============================================================================
// Configuration
// ============================================================================

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'innpilot-staff-secret-key-change-in-production'
)
const JWT_EXPIRY = '24h'

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Authenticate staff member using username and password
 *
 * @param credentials - Staff credentials (username, password, tenant_id)
 * @returns StaffSession if successful, null if authentication fails
 * @throws Error if staff chat is disabled for tenant
 */
export async function authenticateStaff(
  credentials: StaffCredentials
): Promise<StaffSession | null> {
  const { username, password, tenant_id } = credentials

  // Input validation
  if (!username || !password || !tenant_id) {
    console.log('[staff-auth] Missing required credentials')
    return null
  }

  try {
    const supabase = createServerClient()

    // Query staff_users
    const { data: staffData, error } = await supabase
      .from('staff_users')
      .select('*')
      .eq('username', username)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .single()

    if (error || !staffData) {
      console.log('[staff-auth] Staff not found or inactive')
      return null
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, staffData.password_hash)

    if (!passwordMatch) {
      console.log('[staff-auth] Password mismatch')
      return null
    }

    // Update last_login_at
    await supabase
      .from('staff_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('staff_id', staffData.staff_id)

    // Build session
    const session: StaffSession = {
      staff_id: staffData.staff_id,
      tenant_id: staffData.tenant_id,
      username: staffData.username,
      full_name: staffData.full_name,
      role: staffData.role,
      permissions: staffData.permissions || {
        sire_access: true,
        admin_panel: false,
        reports_access: false,
        modify_operations: false,
      },
    }

    console.log('[staff-auth] ✅ Authentication successful:', username)
    return session
  } catch (error: any) {
    // Re-throw specific errors
    if (error.message === 'Staff chat is not enabled for this tenant') {
      throw error
    }

    console.error('[staff-auth] Authentication error:', error)
    return null
  }
}

/**
 * Generate JWT token for staff session
 *
 * @param session - Staff session data
 * @returns JWT token string
 */
export async function generateStaffToken(session: StaffSession): Promise<string> {
  try {
    const token = await new SignJWT({
      staff_id: session.staff_id,
      tenant_id: session.tenant_id,
      username: session.username,
      full_name: session.full_name,
      role: session.role,
      permissions: session.permissions,
      type: 'staff',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRY)
      .sign(SECRET_KEY)

    console.log('[staff-auth] ✅ JWT token generated')
    return token
  } catch (error) {
    console.error('[staff-auth] Token generation error:', error)
    throw new Error('Failed to generate authentication token')
  }
}

/**
 * Verify JWT token and reconstruct session
 *
 * @param token - JWT token string
 * @returns StaffSession if valid, null if invalid/expired
 */
export async function verifyStaffToken(token: string): Promise<StaffSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)

    // Validate payload structure
    if (!payload.staff_id || !payload.tenant_id || !payload.role) {
      console.error('[staff-auth] Invalid token payload structure')
      return null
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      console.log('[staff-auth] Token expired')
      return null
    }

    const session: StaffSession = {
      staff_id: payload.staff_id as string,
      tenant_id: payload.tenant_id as string,
      username: payload.username as string,
      full_name: payload.full_name as string,
      role: payload.role as 'ceo' | 'admin' | 'housekeeper',
      permissions: payload.permissions as StaffSession['permissions'],
    }

    return session
  } catch (error) {
    console.error('[staff-auth] Token verification error:', error)
    return null
  }
}

/**
 * Extract token from Authorization header
 *
 * @param authHeader - Authorization header value (e.g., "Bearer <token>")
 * @returns Token string or null
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

// ============================================================================
// Export helper utilities
// ============================================================================

export const StaffAuthErrors = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  STAFF_CHAT_DISABLED: 'Staff chat not enabled',
  TENANT_NOT_FOUND: 'Tenant not found',
  INACTIVE_ACCOUNT: 'Account is inactive',
  INVALID_TOKEN: 'Invalid or expired token',
  MISSING_HEADER: 'Authorization header missing',
} as const
