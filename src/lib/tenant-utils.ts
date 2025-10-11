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

  // Production: subdomain.muva.chat
  if (host.endsWith('.muva.chat')) {
    const parts = host.split('.');
    // subdomain.muva.chat → ["subdomain", "muva", "chat"]
    if (parts.length === 3) {
      // Treat "www" as no subdomain
      return parts[0] === 'www' ? null : parts[0];
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
  // Early return if no subdomain provided
  if (!subdomain) {
    return null;
  }

  // Validate subdomain format before querying
  if (!isValidSubdomain(subdomain)) {
    console.error(`[tenant-utils] Invalid subdomain format: ${subdomain}`);
    return null;
  }

  try {
    // Dynamic import to avoid build-time errors
    const { createServerClient } = await import('@/lib/supabase');
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('tenant_registry')
      .select('*')
      .eq('subdomain', subdomain)
      .single();

    if (error) {
      // Log error but don't throw - return null for graceful handling
      console.error('[tenant-utils] Error fetching tenant by subdomain:', error.message);
      return null;
    }

    return data as Tenant;
  } catch (error) {
    console.error('[tenant-utils] Unexpected error in getTenantBySubdomain:', error);
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
