/**
 * Audit Logger Library
 *
 * Provides centralized audit logging for all super admin actions.
 * Logs are immutable and stored in super_admin_audit_log table.
 *
 * SECURITY: All super admin actions should be logged for compliance and security.
 */

import { createServerClient } from '@/lib/supabase'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface LogActionParams {
  adminId: string
  action: string
  targetType?: string
  targetId?: string
  changes?: {
    before?: any
    after?: any
  }
  request: Request
}

export interface AuditLogEntry {
  id: string
  super_admin_id: string
  action: string
  target_type: string | null
  target_id: string | null
  changes: {
    before?: any
    after?: any
  } | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// ============================================================================
// Audit Logging Functions
// ============================================================================

/**
 * Log a super admin action to the audit log
 *
 * @param params - Audit log parameters
 * @returns Promise<void>
 *
 * @example
 * await logAction({
 *   adminId: session.super_admin_id,
 *   action: 'tenant.update',
 *   targetType: 'tenant',
 *   targetId: tenantId,
 *   changes: { before: oldData, after: newData },
 *   request
 * })
 */
export async function logAction({
  adminId,
  action,
  targetType,
  targetId,
  changes,
  request,
}: LogActionParams): Promise<void> {
  try {
    const supabase = createServerClient()

    // Extract IP address (try multiple headers for proxy support)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') || // Cloudflare
      'unknown'

    // Extract user agent
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Insert audit log entry
    const { error } = await supabase.from('super_admin_audit_log').insert({
      super_admin_id: adminId,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      changes: changes || null,
      ip_address: ip,
      user_agent: userAgent,
    })

    if (error) {
      console.error('[audit-logger] Failed to insert audit log:', error)
      // Don't throw - audit logging should not break the main flow
      // But log the error for monitoring
    } else {
      console.log(
        `[audit-logger] ✅ Logged action: ${action} by admin ${adminId}`
      )
    }
  } catch (err) {
    console.error('[audit-logger] Exception while logging:', err)
    // Don't throw - audit logging is critical but should not break operations
  }
}

/**
 * Log a successful login action
 *
 * @param adminId - Super admin ID
 * @param username - Super admin username
 * @param request - Request object
 * @returns Promise<void>
 */
export async function logLogin(
  adminId: string,
  username: string,
  request: Request
): Promise<void> {
  await logAction({
    adminId,
    action: 'login',
    targetType: 'auth',
    targetId: username,
    request,
  })
}

/**
 * Log a tenant update action
 *
 * @param adminId - Super admin ID
 * @param tenantId - Tenant ID being updated
 * @param before - Previous tenant state
 * @param after - New tenant state
 * @param request - Request object
 * @returns Promise<void>
 */
export async function logTenantUpdate(
  adminId: string,
  tenantId: string,
  before: any,
  after: any,
  request: Request
): Promise<void> {
  await logAction({
    adminId,
    action: 'tenant.update',
    targetType: 'tenant',
    targetId: tenantId,
    changes: { before, after },
    request,
  })
}

/**
 * Log a content upload action
 *
 * @param adminId - Super admin ID
 * @param filename - Uploaded filename
 * @param category - Content category
 * @param request - Request object
 * @returns Promise<void>
 */
export async function logContentUpload(
  adminId: string,
  filename: string,
  category: string,
  request: Request
): Promise<void> {
  await logAction({
    adminId,
    action: 'content.upload',
    targetType: 'content',
    targetId: filename,
    changes: {
      after: { filename, category },
    },
    request,
  })
}

/**
 * Log a settings update action
 *
 * @param adminId - Super admin ID
 * @param before - Previous settings state
 * @param after - New settings state
 * @param request - Request object
 * @returns Promise<void>
 */
export async function logSettingsUpdate(
  adminId: string,
  before: any,
  after: any,
  request: Request
): Promise<void> {
  await logAction({
    adminId,
    action: 'settings.update',
    targetType: 'settings',
    targetId: 'platform',
    changes: { before, after },
    request,
  })
}

// ============================================================================
// Export action types for consistency
// ============================================================================

export const AuditActions = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  TENANT_CREATE: 'tenant.create',
  TENANT_UPDATE: 'tenant.update',
  TENANT_DELETE: 'tenant.delete',
  CONTENT_UPLOAD: 'content.upload',
  CONTENT_DELETE: 'content.delete',
  SETTINGS_UPDATE: 'settings.update',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
} as const
