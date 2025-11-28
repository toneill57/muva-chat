/**
 * Super Admin Utilities
 *
 * Provides utility functions for super admin dashboard operations.
 * Includes platform metrics, tenant management, and analytics.
 */

import { createServerClient } from './supabase'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PlatformMetrics {
  active_tenants: number
  total_tenants: number
  conversations_30d: number
  active_users_30d: number
  muva_listings_count: number
  snapshot_at: string
}

export interface TenantStats {
  tenant_id: string
  subdomain: string
  nombre_comercial: string
  subscription_tier: string
  is_active: boolean
  conversation_count: number
  last_activity: string | null
  accommodation_count: number
  created_at: string
}

export interface TenantDetails {
  tenant_id: string
  subdomain: string
  nombre_comercial: string
  nombre_legal: string | null
  nit: string | null
  subscription_tier: string
  is_active: boolean
  created_at: string
  updated_at: string | null
  config: Record<string, any> | null
  accommodation_units?: Array<{
    accommodation_unit_id: string
    unit_name: string
    unit_type: string
    is_active: boolean
  }>
}

// ============================================================================
// Platform Metrics Functions
// ============================================================================

/**
 * Obtener métricas globales de la plataforma
 *
 * @returns PlatformMetrics object o null si error
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics | null> {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('v_platform_metrics')
      .select('*')
      .single()

    if (error) {
      console.error('[super-admin-utils] Error fetching platform metrics:', error)
      return null
    }

    return data as PlatformMetrics
  } catch (error) {
    console.error('[super-admin-utils] Unexpected error in getPlatformMetrics:', error)
    return null
  }
}

// ============================================================================
// Tenant Management Functions
// ============================================================================

/**
 * Obtener estadísticas de todos los tenants
 *
 * @returns Array de TenantStats
 */
export async function getTenantStats(): Promise<TenantStats[]> {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('v_tenant_stats')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[super-admin-utils] Error fetching tenant stats:', error)
      return []
    }

    return (data || []) as TenantStats[]
  } catch (error) {
    console.error('[super-admin-utils] Unexpected error in getTenantStats:', error)
    return []
  }
}

/**
 * Obtener detalles completos de un tenant
 *
 * @param tenantId - Tenant UUID
 * @returns TenantDetails object o null si no existe
 */
export async function getTenantDetails(tenantId: string): Promise<TenantDetails | null> {
  try {
    const supabase = createServerClient()

    // Get tenant registry data
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (tenantError || !tenantData) {
      console.error('[super-admin-utils] Tenant not found:', tenantId)
      return null
    }

    // Get accommodation units for this tenant
    const { data: unitsData, error: unitsError } = await supabase
      .from('accommodation_units')
      .select('accommodation_unit_id, unit_name, unit_type, is_active')
      .eq('tenant_id', tenantId)
      .order('unit_name', { ascending: true })

    if (unitsError) {
      console.error('[super-admin-utils] Error fetching accommodation units:', unitsError)
    }

    const tenantDetails: TenantDetails = {
      tenant_id: tenantData.tenant_id,
      subdomain: tenantData.subdomain,
      nombre_comercial: tenantData.nombre_comercial,
      nombre_legal: tenantData.nombre_legal,
      nit: tenantData.nit,
      subscription_tier: tenantData.subscription_tier,
      is_active: tenantData.is_active,
      created_at: tenantData.created_at,
      updated_at: tenantData.updated_at,
      config: tenantData.config,
      accommodation_units: unitsData || [],
    }

    return tenantDetails
  } catch (error) {
    console.error('[super-admin-utils] Unexpected error in getTenantDetails:', error)
    return null
  }
}

/**
 * Actualizar estado activo de un tenant
 *
 * @param tenantId - Tenant UUID
 * @param isActive - Nuevo estado (true/false)
 * @returns true si exitoso, false si error
 */
export async function updateTenantStatus(
  tenantId: string,
  isActive: boolean
): Promise<boolean> {
  try {
    const supabase = createServerClient()

    const { error } = await supabase
      .from('tenant_registry')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('[super-admin-utils] Error updating tenant status:', error)
      return false
    }

    console.log(`[super-admin-utils] ✅ Tenant ${tenantId} status updated: ${isActive}`)
    return true
  } catch (error) {
    console.error('[super-admin-utils] Unexpected error in updateTenantStatus:', error)
    return false
  }
}

// ============================================================================
// Analytics Functions
// ============================================================================

/**
 * Obtener actividad reciente de conversaciones (últimos 30 días)
 *
 * @returns Array de conversation counts por tenant
 */
export async function getRecentConversationActivity(): Promise<Array<{
  tenant_id: string
  subdomain: string
  conversation_count: number
  last_conversation_at: string | null
}>> {
  try {
    const supabase = createServerClient()

    // Get conversations from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('conversations')
      .select('tenant_id, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (error) {
      console.error('[super-admin-utils] Error fetching conversation activity:', error)
      return []
    }

    // Group by tenant_id and count
    const activityMap = new Map<string, { count: number, lastAt: string | null }>()

    data.forEach((conv) => {
      const existing = activityMap.get(conv.tenant_id)
      if (existing) {
        existing.count++
        if (!existing.lastAt || conv.created_at > existing.lastAt) {
          existing.lastAt = conv.created_at
        }
      } else {
        activityMap.set(conv.tenant_id, {
          count: 1,
          lastAt: conv.created_at
        })
      }
    })

    // Get tenant info
    const tenantIds = Array.from(activityMap.keys())
    const { data: tenants, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('tenant_id, subdomain')
      .in('tenant_id', tenantIds)

    if (tenantError) {
      console.error('[super-admin-utils] Error fetching tenant info:', tenantError)
      return []
    }

    // Combine results
    return tenants.map((tenant) => {
      const activity = activityMap.get(tenant.tenant_id)
      return {
        tenant_id: tenant.tenant_id,
        subdomain: tenant.subdomain,
        conversation_count: activity?.count || 0,
        last_conversation_at: activity?.lastAt || null,
      }
    }).sort((a, b) => b.conversation_count - a.conversation_count)

  } catch (error) {
    console.error('[super-admin-utils] Unexpected error in getRecentConversationActivity:', error)
    return []
  }
}

// ============================================================================
// Export helper utilities
// ============================================================================

export const SuperAdminErrors = {
  TENANT_NOT_FOUND: 'Tenant not found',
  UPDATE_FAILED: 'Update operation failed',
  METRICS_UNAVAILABLE: 'Metrics temporarily unavailable',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this operation',
} as const
