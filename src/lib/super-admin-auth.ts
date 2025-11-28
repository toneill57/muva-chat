/**
 * Super Admin Authentication Library
 *
 * Provides authentication functions for platform super administrators.
 * Uses JWT tokens for secure super admin sessions.
 *
 * SECURITY: Super admin access bypasses tenant-level restrictions.
 * Use with extreme caution.
 */

import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { createServerClient } from './supabase'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SuperAdmin {
  super_admin_id: string
  username: string
  role: 'super_admin'
  permissions: {
    platform_admin: boolean
    tenant_management: boolean
    content_management: boolean
    analytics_access: boolean
  }
}

export interface SuperAdminCredentials {
  username: string
  password: string
}

// ============================================================================
// Configuration
// ============================================================================

const SECRET_KEY = new TextEncoder().encode(
  process.env.SUPER_ADMIN_JWT_SECRET || 'super-admin-secret-key-change-in-production'
)
const JWT_EXPIRY = '7d'

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Login super admin - verifica credenciales y genera JWT
 *
 * @param username - Super admin username
 * @param password - Super admin password
 * @returns JWT token string o null si credenciales inválidas
 */
export async function loginSuperAdmin(
  username: string,
  password: string
): Promise<string | null> {
  // Input validation
  if (!username || !password) {
    console.log('[super-admin-auth] Missing required credentials')
    return null
  }

  try {
    const supabase = createServerClient()

    // Query super_admin_users
    const { data: adminData, error } = await supabase
      .from('super_admin_users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single()

    if (error || !adminData) {
      console.log('[super-admin-auth] Super admin not found or inactive')
      return null
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, adminData.password_hash)

    if (!passwordMatch) {
      console.log('[super-admin-auth] Password mismatch')
      return null
    }

    // Update last_login_at
    await supabase
      .from('super_admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('super_admin_id', adminData.super_admin_id)

    // Build session payload
    const permissions = adminData.permissions || {
      platform_admin: true,
      tenant_management: true,
      content_management: true,
      analytics_access: true,
    }

    // Generate JWT token
    const token = await new SignJWT({
      super_admin_id: adminData.super_admin_id,
      username: adminData.username,
      role: 'super_admin',
      permissions,
      type: 'super_admin',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRY)
      .sign(SECRET_KEY)

    console.log('[super-admin-auth] ✅ Authentication successful:', username)
    return token
  } catch (error: any) {
    console.error('[super-admin-auth] Authentication error:', error)
    return null
  }
}

/**
 * Verificar JWT token de super admin
 *
 * @param token - JWT token string
 * @returns SuperAdmin object o null si token inválido
 */
export async function verifySuperAdminToken(
  token: string
): Promise<SuperAdmin | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)

    // Validate payload structure
    if (!payload.super_admin_id || !payload.username || payload.type !== 'super_admin') {
      console.error('[super-admin-auth] Invalid token payload structure')
      return null
    }

    // Check expiration (jose handles this automatically, but we can double-check)
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      console.log('[super-admin-auth] Token expired')
      return null
    }

    const superAdmin: SuperAdmin = {
      super_admin_id: payload.super_admin_id as string,
      username: payload.username as string,
      role: 'super_admin',
      permissions: payload.permissions as SuperAdmin['permissions'],
    }

    return superAdmin
  } catch (error) {
    console.error('[super-admin-auth] Token verification error:', error)
    return null
  }
}

/**
 * Hash password usando bcrypt
 *
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Verificar password contra hash
 *
 * @param password - Plain text password
 * @param hash - Bcrypt hash
 * @returns true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
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

export const SuperAdminAuthErrors = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  INACTIVE_ACCOUNT: 'Account is inactive',
  INVALID_TOKEN: 'Invalid or expired token',
  MISSING_HEADER: 'Authorization header missing',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
} as const
