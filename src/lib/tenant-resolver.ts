import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 🔒 MULTI-TENANT SECURITY ARCHITECTURE
 *
 * This file is CRITICAL for multi-tenant data isolation. Any changes here
 * can cause serious security breaches where tenant data leaks to other tenants.
 *
 * ⚠️ NEVER HARDCODE TENANT IDENTIFIERS ⚠️
 * ⚠️ ALWAYS USE DYNAMIC UUID LOOKUP ⚠️
 * ⚠️ NO FALLBACK VALUES ALLOWED ⚠️
 *
 * Architecture:
 * 1. Client sends UUID (e.g., "b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf")
 * 2. This function returns the SAME UUID for database filtering
 * 3. Database functions filter data by this UUID in tenant_id columns
 * 4. Each tenant's data remains completely isolated
 *
 * Critical Rules:
 * - Function MUST return the exact tenant UUID received (after validation)
 * - Function MUST NOT have hardcoded fallbacks
 * - Function MUST throw errors for invalid/missing UUIDs
 * - Function MUST validate tenant exists and is active before returning
 */

// Lazy initialization to avoid build-time errors
function getSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Cache for tenant UUID to schema_name mapping
const tenantCache = new Map<string, { schema_name: string, expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Resolves tenant UUID to tenant identifier for database operations
 *
 * @param tenantUuid - The formal tenant UUID from client_id
 * @returns The tenant identifier (UUID) for database filtering
 */
export async function resolveTenantSchemaName(tenantUuid: string | null | undefined): Promise<string> {
  // Handle null/undefined cases - no default UUID for security
  if (!tenantUuid) {
    console.warn('⚠️ No tenant UUID provided, cannot resolve tenant')
    throw new Error('Tenant UUID is required for multi-tenant operations')
  }

  // Check cache first
  const cached = tenantCache.get(tenantUuid)
  if (cached && cached.expires > Date.now()) {
    console.log(`🎯 Cache hit: ${tenantUuid} → ${cached.schema_name}`)
    return cached.schema_name
  }

  const supabase = getSupabaseClient()

  try {
    // 🔧 SMART TENANT RESOLUTION: Handle both UUID and schema_name inputs
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantUuid)

    let data, error;
    if (isValidUuid) {
      // Query by tenant_id (UUID) - return the UUID itself
      const result = await supabase
        .from('tenant_registry')
        .select('tenant_id, tenant_type, is_active')
        .eq('tenant_id', tenantUuid)
        .eq('is_active', true)
        .single()
      data = result.data
      error = result.error
    } else {
      // Query by slug (string) - for user-friendly URLs like "simmerdown"
      const result = await supabase
        .from('tenant_registry')
        .select('tenant_id, tenant_type, is_active')
        .eq('slug', tenantUuid)
        .eq('is_active', true)
        .single()
      data = result.data
      error = result.error
    }

    if (error || !data) {
      console.warn(`⚠️ Tenant ${tenantUuid} not found in registry:`, error?.message)
      throw new Error(`Tenant ${tenantUuid} not found or inactive`)
    }

    const tenantIdentifier = data.tenant_id
    if (!tenantIdentifier) {
      console.warn(`⚠️ Tenant ${tenantUuid} has no tenant_id`)
      throw new Error(`Invalid tenant data for ${tenantUuid}`)
    }

    // Cache the result
    tenantCache.set(tenantUuid, {
      schema_name: tenantIdentifier,
      expires: Date.now() + CACHE_TTL
    })

    console.log(`✅ Resolved tenant: ${tenantUuid} → ${tenantIdentifier} (${data.tenant_type})`)
    return tenantIdentifier

  } catch (error) {
    console.error(`❌ Error resolving tenant ${tenantUuid}:`, error)
    throw error // Don't return fallback for security - let the error bubble up
  }
}

/**
 * Gets tenant information including schema_name and business details
 */
export async function getTenantInfo(tenantUuid: string): Promise<{
  schema_name: string
  tenant_type: string
  nombre_comercial: string
  razon_social: string
} | null> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('tenant_registry')
      .select('schema_name, tenant_type, nombre_comercial, razon_social, is_active')
      .eq('tenant_id', tenantUuid)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      console.warn(`⚠️ Tenant info not found for ${tenantUuid}:`, error?.message)
      return null
    }

    return data
  } catch (error) {
    console.error(`❌ Error getting tenant info for ${tenantUuid}:`, error)
    return null
  }
}

/**
 * Clears the tenant cache (useful for development/testing)
 */
export function clearTenantCache(): void {
  tenantCache.clear()
  console.log('🗑️ Tenant cache cleared')
}