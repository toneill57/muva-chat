import { headers } from 'next/headers'
import { getTenantBySubdomain, getSubdomain } from '@/lib/tenant-utils'
import TenantChatPage from '@/components/Tenant/TenantChatPage'
import { notFound } from 'next/navigation'

// Force dynamic rendering (required for headers())
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Get hostname from headers
  const headersList = await headers()
  const hostname = headersList.get('host') || ''

  // Extract subdomain (middleware already detected it)
  const subdomain = getSubdomain(hostname)
  console.log('[page.tsx] hostname:', hostname, 'subdomain:', subdomain)

  // NO SUBDOMAIN → Main MUVA.chat page (placeholder for now)
  if (!subdomain) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            MUVA Chat
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Descubre alojamientos únicos en San Andrés
          </p>
          <p className="text-gray-500 mb-4">
            🚧 Super Chat coming soon... (FASE 2)
          </p>
          <div className="mt-8 space-y-2 text-sm text-gray-400">
            <p>Para probar el sistema, visita:</p>
            <ul className="space-y-1">
              <li><a href="http://simmerdown.localhost:3000" className="text-teal-600 hover:underline">http://simmerdown.localhost:3000</a></li>
              <li><a href="http://hotel-boutique.localhost:3000" className="text-teal-600 hover:underline">http://hotel-boutique.localhost:3000</a></li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // SUBDOMAIN EXISTS → Fetch tenant data
  console.log('[page.tsx] Fetching tenant for subdomain:', subdomain)
  const tenant = await getTenantBySubdomain(subdomain)
  console.log('[page.tsx] Tenant fetch result:', tenant ? `Found: ${tenant.business_name || tenant.nombre_comercial}` : 'null')

  // Tenant not found → 404
  if (!tenant) {
    console.error(`[page.tsx] Tenant not found for subdomain: ${subdomain}`)
    notFound()
  }

  // Render TenantChatPage with tenant data
  return (
    <TenantChatPage
      subdomain={subdomain}
      tenant={{
        tenant_id: tenant.tenant_id,
        business_name: tenant.business_name || tenant.nombre_comercial,
        logo_url: tenant.logo_url || null,
        primary_color: tenant.primary_color || '#3B82F6' // fallback to blue
      }}
    />
  )
}

// Generate metadata dynamically
export async function generateMetadata() {
  const headersList = await headers()
  const hostname = headersList.get('host') || ''
  const subdomain = getSubdomain(hostname)

  if (!subdomain) {
    return {
      title: 'MUVA Chat - Descubre alojamientos únicos',
      description: 'Chatea con AI para encontrar tu lugar perfecto en San Andrés'
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
    title: `${tenant.business_name || tenant.nombre_comercial} - Chat con AI`,
    description: tenant.seo_meta_description || `Chatea con ${tenant.business_name || tenant.nombre_comercial}`
  }
}
