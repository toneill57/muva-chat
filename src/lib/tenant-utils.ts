/**
 * Tenant Utilities for Multi-Tenant Subdomain Routing
 *
 * This module provides helper functions to extract and validate tenant subdomains
 * from hostnames in both local development and production environments.
 *
 * @module tenant-utils
 */

/**
 * Extracts subdomain from hostname for multi-tenant routing
 *
 * Supported formats:
 * - Production: subdomain.muva.chat → "subdomain"
 * - Local dev: subdomain.localhost:3000 → "subdomain"
 * - No subdomain: muva.chat → null
 * - WWW subdomain: www.muva.chat → null (treated as no subdomain)
 *
 * @param hostname - Full hostname including port (e.g., "simmerdown.localhost:3000")
 * @returns Subdomain string or null if none found
 *
 * @example
 * ```typescript
 * getSubdomain('simmerdown.muva.chat')         // → "simmerdown"
 * getSubdomain('free-hotel-test.muva.chat')    // → "free-hotel-test"
 * getSubdomain('www.muva.chat')                // → null
 * getSubdomain('muva.chat')                    // → null
 * getSubdomain('simmerdown.localhost:3000')    // → "simmerdown"
 * getSubdomain('localhost:3000')               // → null
 * ```
 */
export function getSubdomain(hostname: string): string | null {
  // Remove port if present (e.g., "localhost:3000" → "localhost")
  const host = hostname.split(':')[0];

  // Localhost development: subdomain.localhost
  if (host === 'localhost' || host.endsWith('.localhost')) {
    const parts = host.split('.');
    // subdomain.localhost → ["subdomain", "localhost"]
    return parts.length > 1 ? parts[0] : null;
  }

  // Production: subdomain.muva.chat OR subdomain.staging.muva.chat
  if (host.endsWith('.muva.chat')) {
    const parts = host.split('.');
    // subdomain.muva.chat → ["subdomain", "muva", "chat"] (3 parts)
    // subdomain.staging.muva.chat → ["subdomain", "staging", "muva", "chat"] (4 parts)
    if (parts.length >= 3) {
      const subdomain = parts[0];
      // Treat "www" and "staging" as no subdomain (they're environment indicators)
      if (subdomain === 'www' || subdomain === 'staging') {
        return null;
      }
      return subdomain;
    }
  }

  // No subdomain found (muva.chat, www.muva.chat, or unknown domain)
  return null;
}

/**
 * Validates subdomain format (lowercase, alphanumeric, hyphens only)
 * Matches database constraint: subdomain ~ '^[a-z0-9-]+$'
 *
 * @param subdomain - Subdomain string to validate
 * @returns True if subdomain format is valid
 *
 * @example
 * ```typescript
 * isValidSubdomain('simmerdown')               // → true
 * isValidSubdomain('free-hotel-test')          // → true
 * isValidSubdomain('Invalid-Upper')            // → false
 * isValidSubdomain('test_underscore')          // → false
 * isValidSubdomain('test.dot')                 // → false
 * ```
 */
export function isValidSubdomain(subdomain: string): boolean {
  return /^[a-z0-9-]+$/.test(subdomain);
}

// ============================================================================
// Tenant Entity Type
// ============================================================================

/**
 * Tenant entity from tenant_registry table
 * Represents a single tenant/client in the multi-tenant system
 */
export interface Tenant {
  tenant_id: string;        // UUID primary key
  nombre_comercial: string; // Business name
  subdomain: string;        // Unique subdomain (e.g., "simmerdown")
  slug: string;             // URL-friendly slug
  created_at: string;       // ISO timestamp
  updated_at: string;       // ISO timestamp
  // Optional branding fields (will be added in Phase 4)
  logo_url?: string | null;
  business_name?: string | null;
  primary_color?: string | null;
  // Additional tenant_registry fields
  nit?: string | null;
  razon_social?: string | null;
  schema_name?: string | null;
  tenant_type?: string | null;
  is_active?: boolean | null;
  subscription_tier?: string | null;
  features?: Record<string, unknown> | null;
  // Settings fields (FASE 4D.6)
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  social_media_links?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
  } | null;
  seo_meta_description?: string | null;
  seo_keywords?: string[] | null;
}

// ============================================================================
// Database Functions
// ============================================================================

/**
 * Fetches tenant by subdomain from database
 *
 * @param subdomain - Subdomain string (e.g., "simmerdown")
 * @returns Tenant object or null if not found
 *
 * @example
 * ```typescript
 * const tenant = await getTenantBySubdomain('simmerdown');
 * if (tenant) {
 *   console.log(tenant.nombre_comercial); // "SimmerDown Guest House"
 * }
 * ```
 */
export async function getTenantBySubdomain(
  subdomain: string | null
): Promise<Tenant | null> {
  console.log('[getTenantBySubdomain] Called with subdomain:', subdomain);

  // Early return if no subdomain provided
  if (!subdomain) {
    console.log('[getTenantBySubdomain] No subdomain provided, returning null');
    return null;
  }

  // Validate subdomain format before querying
  if (!isValidSubdomain(subdomain)) {
    console.error(`[getTenantBySubdomain] ❌ Invalid subdomain format: ${subdomain}`);
    return null;
  }

  try {
    // Dynamic import to avoid build-time errors
    console.log('[getTenantBySubdomain] Creating Supabase client...');
    const { createServerClient } = await import('@/lib/supabase');
    const supabase = createServerClient();

    console.log('[getTenantBySubdomain] Supabase client created, querying tenant_registry...');

    const { data, error } = await supabase
      .from('tenant_registry')
      .select('*')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (error) {
      // Log error but don't throw - return null for graceful handling
      console.error('[getTenantBySubdomain] ❌ Supabase query error:', error.message, error.code, error.details);
      return null;
    }

    // .maybeSingle() returns null when no rows found (not an error)
    if (!data) {
      console.log(`[getTenantBySubdomain] ℹ️  No tenant found for subdomain: ${subdomain}`);
      return null;
    }

    console.log('[getTenantBySubdomain] ✅ Query successful, data:', `tenant_id=${data.tenant_id}, name=${data.business_name || data.nombre_comercial}`);
    return data as Tenant;
  } catch (error) {
    console.error('[getTenantBySubdomain] ❌ Unexpected error:', error);
    return null;
  }
}

/**
 * Extracts subdomain from request headers (set by middleware)
 *
 * @param request - Next.js Request object
 * @returns Subdomain string or null
 *
 * @example
 * ```typescript
 * // In API route
 * export async function GET(req: NextRequest) {
 *   const subdomain = getSubdomainFromRequest(req);
 *   const tenant = await getTenantBySubdomain(subdomain);
 * }
 * ```
 */
export function getSubdomainFromRequest(request: Request): string | null {
  return request.headers.get('x-tenant-subdomain');
}
