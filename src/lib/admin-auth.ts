/**
 * Admin Authentication Library
 *
 * Provides authentication middleware for admin-only endpoints (MotoPress integration, etc.)
 * Only staff with role 'ceo' or 'admin' can access these endpoints.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyStaffToken, extractTokenFromHeader, StaffSession } from './staff-auth'

// ============================================================================
// Types
// ============================================================================

export interface AdminAuthResult {
  authorized: boolean
  session?: StaffSession
  error?: string
}

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Verify admin authentication for API endpoints
 * Requires JWT token with role 'ceo' or 'admin'
 *
 * @param request - Next.js request object
 * @returns AdminAuthResult with session if authorized
 */
export async function verifyAdminAuth(request: NextRequest | Request): Promise<AdminAuthResult> {
  try {
    // Extract Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return {
        authorized: false,
        error: 'Missing Authorization header. Format: Bearer <token>',
      }
    }

    // Verify JWT token
    const session = await verifyStaffToken(token)

    if (!session) {
      return {
        authorized: false,
        error: 'Invalid or expired token',
      }
    }

    // Check admin role
    const isAdmin = session.role === 'ceo' || session.role === 'admin'

    if (!isAdmin) {
      return {
        authorized: false,
        error: `Access denied. Role '${session.role}' not authorized. Requires 'ceo' or 'admin'.`,
      }
    }

    // Success
    return {
      authorized: true,
      session,
    }
  } catch (error) {
    console.error('[admin-auth] Verification error:', error)
    return {
      authorized: false,
      error: 'Authentication verification failed',
    }
  }
}

/**
 * Middleware wrapper for admin-only endpoints
 * Returns 401/403 response if unauthorized
 *
 * @param request - Next.js request object
 * @returns NextResponse with error or null if authorized
 */
export async function requireAdminAuth(
  request: NextRequest | Request
): Promise<{ response?: NextResponse; session?: StaffSession }> {
  const authResult = await verifyAdminAuth(request)

  if (!authResult.authorized) {
    const statusCode = authResult.error?.includes('Missing Authorization') ? 401 : 403

    return {
      response: NextResponse.json(
        {
          error: authResult.error,
          message:
            statusCode === 401
              ? 'Authentication required. Please login as admin or CEO.'
              : 'Access forbidden. Admin or CEO role required.',
        },
        { status: statusCode }
      ),
    }
  }

  return {
    session: authResult.session,
  }
}

// ============================================================================
// Encryption Utilities (for MotoPress credentials)
// ============================================================================

/**
 * Encrypt sensitive credentials before storing in database
 * Uses AES-256-GCM encryption
 *
 * @param plaintext - Sensitive data to encrypt
 * @returns Base64-encoded encrypted string
 */
export async function encryptCredentials(plaintext: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)

  // Get encryption key from environment
  const keyMaterial = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production'

  // Derive a 256-bit key using SHA-256 (ensures correct length)
  const keyData = encoder.encode(keyMaterial)
  const hash = await crypto.subtle.digest('SHA-256', keyData)

  // Import key (hash is exactly 256 bits)
  const key = await crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)

  // Return base64
  return Buffer.from(combined).toString('base64')
}

/**
 * Decrypt credentials from database
 *
 * @param encrypted - Base64-encoded encrypted string
 * @returns Decrypted plaintext
 */
export async function decryptCredentials(encrypted: string): Promise<string> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  // Decode base64
  const combined = Buffer.from(encrypted, 'base64')

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)

  // Get encryption key
  const keyMaterial = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production'

  // Derive same 256-bit key using SHA-256
  const keyData = encoder.encode(keyMaterial)
  const hash = await crypto.subtle.digest('SHA-256', keyData)

  // Import key (hash is exactly 256 bits)
  const key = await crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  // Decrypt
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)

  return decoder.decode(decrypted)
}
