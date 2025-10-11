import TenantChatPage from '@/components/Tenant/TenantChatPage'
import { headers } from 'next/headers'
import { getTenantBySubdomain, getSubdomain } from '@/lib/tenant-utils'
import { notFound } from 'next/navigation'

// Force dynamic rendering to ensure subdomain detection works
export const dynamic = 'force-dynamic'

interface TenantPageProps {
  params: Promise<{ tenant: string }>
}

/**
 * Tenant Root Page - Renders TenantChatPage for subdomain root
 *
 * This page handles requests to the root of a tenant subdomain:
 * - simmerdown.muva.chat/ → Renders chat with Simmer Down branding
 * - hotel-boutique.muva.chat/ → Renders chat with Hotel Boutique branding
 *
 * Note: /chat route still works for backward compatibility
 * - simmerdown.muva.chat/chat → Also renders the same chat
 */
export default async function TenantPage({ params }: TenantPageProps) {
  // Get subdomain from headers (set by middleware)
  const headersList = await headers()
  const hostname = headersList.get('host') || ''
  const headerSubdomain = headersList.get('x-tenant-subdomain')

  // Use header subdomain or extract from hostname
  const subdomain = headerSubdomain || getSubdomain(hostname)

  console.log('[tenant/page.tsx] Rendering root page for subdomain:', subdomain)

  if (!subdomain) {
    console.error('[tenant/page.tsx] No subdomain found, returning 404')
    notFound()
  }

  // Fetch tenant data
  const tenant = await getTenantBySubdomain(subdomain)

  if (!tenant) {
    console.error('[tenant/page.tsx] Tenant not found for subdomain:', subdomain)
    notFound()
  }

  console.log('[tenant/page.tsx] ✅ Rendering chat for tenant:', tenant.business_name || tenant.nombre_comercial)

  // Render TenantChatPage with tenant data
  // This is the same component used in /[tenant]/chat/page.tsx
  return (
    <TenantChatPage
      subdomain={subdomain}
      tenant={{
        tenant_id: tenant.tenant_id,
        business_name: tenant.business_name || tenant.nombre_comercial,
        logo_url: tenant.logo_url || null,
        primary_color: tenant.primary_color || '#3B82F6'
      }}
    />
  )
}

/**
 * Generate metadata dynamically per tenant
 * Sets page title and description based on tenant data
 */
export async function generateMetadata() {
  const headersList = await headers()
  const hostname = headersList.get('host') || ''
  const headerSubdomain = headersList.get('x-tenant-subdomain')
  const subdomain = headerSubdomain || getSubdomain(hostname)

  if (!subdomain) {
    return {
      title: 'Tenant not found',
      description: 'The requested tenant could not be found'
    }
  }

  const tenant = await getTenantBySubdomain(subdomain)

  if (!tenant) {
    return {
      title: 'Tenant not found',
      description: 'The requested tenant could not be found'
    }
  }

  return {
    title: `${tenant.business_name || tenant.nombre_comercial} - Chat with AI`,
    description: tenant.seo_meta_description || `Chat with ${tenant.business_name || tenant.nombre_comercial} AI assistant`
  }
}
