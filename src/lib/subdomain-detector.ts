/**
 * Client-side subdomain detection helpers
 * Complements server-side tenant-utils.ts
 */

export interface TenantBranding {
  tenant_id: string
  subdomain: string
  slug: string
  business_name: string
  logo_url: string | null
  primary_color: string | null
  address: string | null
  phone: string | null
  email: string | null
  social_media_links: {
    facebook?: string
    instagram?: string
    twitter?: string
    linkedin?: string
    tiktok?: string
  } | null
  seo_meta_description: string | null
  seo_keywords: string[] | null
}

/**
 * Get subdomain from client-side (cookie or window.location)
 * Returns null if no subdomain or if on main domain
 */
export function getSubdomainFromClient(): string | null {
  if (typeof window === 'undefined') return null

  // 1. Try cookie first (set by middleware)
  const cookies = document.cookie.split('; ')
  const tenantCookie = cookies.find(c => c.startsWith('tenant_subdomain='))
  if (tenantCookie) {
    const subdomain = tenantCookie.split('=')[1]
    if (subdomain && subdomain !== '') {
      // Validate format before returning
      if (isValidSubdomainClient(subdomain)) {
        return subdomain
      }
    }
  }

  // 2. Fallback to window.location
  const hostname = window.location.hostname

  // localhost:3000 → null
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null
  }

  // subdomain.localhost:3000 → "subdomain"
  if (hostname.endsWith('.localhost')) {
    const parts = hostname.split('.')
    if (parts.length > 1) {
      const subdomain = parts[0]
      return isValidSubdomainClient(subdomain) ? subdomain : null
    }
    return null
  }

  // subdomain.muva.chat → "subdomain"
  // www.subdomain.muva.chat → "subdomain"
  if (hostname.endsWith('.muva.chat')) {
    const parts = hostname.split('.')

    // www.subdomain.muva.chat (4 parts)
    if (parts.length === 4 && parts[0] === 'www') {
      const subdomain = parts[1]
      return isValidSubdomainClient(subdomain) ? subdomain : null
    }

    // subdomain.muva.chat (3 parts)
    if (parts.length === 3) {
      const subdomain = parts[0]
      // Treat "www" as no subdomain
      if (subdomain === 'www') return null
      return isValidSubdomainClient(subdomain) ? subdomain : null
    }
  }

  return null
}

/**
 * Fetch tenant branding data by subdomain
 * Calls /api/tenant/branding under the hood
 */
export async function fetchTenantBranding(subdomain: string): Promise<TenantBranding | null> {
  try {
    const response = await fetch(`/api/tenant/branding?subdomain=${encodeURIComponent(subdomain)}`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data as TenantBranding

  } catch (error) {
    console.error('[subdomain-detector] Error fetching tenant branding:', error)
    return null
  }
}

/**
 * Fetch tenant branding by tenant_id
 */
export async function fetchTenantBrandingById(tenantId: string): Promise<TenantBranding | null> {
  try {
    const response = await fetch(`/api/tenant/branding?tenant_id=${encodeURIComponent(tenantId)}`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data as TenantBranding

  } catch (error) {
    console.error('[subdomain-detector] Error fetching tenant branding by ID:', error)
    return null
  }
}

/**
 * Validate subdomain format (must match DB constraint)
 * Pattern: lowercase, alphanumeric, hyphens only
 */
export function isValidSubdomainClient(subdomain: string): boolean {
  return /^[a-z0-9-]+$/.test(subdomain)
}
