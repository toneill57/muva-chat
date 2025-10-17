'use client'

import { use, useEffect, useState } from 'react'

/**
 * Legacy Guest Chat Page Component
 *
 * DEPRECATED: Redirects to new subdomain-based URL
 * Old URL: /guest-chat/[tenant_id]
 * New URL: subdomain.muva.chat/guest-chat
 *
 * This route is maintained for backwards compatibility
 */
export default function LegacyGuestChatPage({ params }: { params: Promise<{ tenant_id: string }> }) {
  // Unwrap params Promise (Next.js 15)
  const { tenant_id: tenantSlugOrUuid } = use(params)
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const resolveTenantSlug = async () => {
      try {
        // Resolve tenant slug from UUID
        const response = await fetch('/api/tenant/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slugOrUuid: tenantSlugOrUuid }),
        })

        if (!response.ok) {
          console.error('Failed to resolve tenant')
          setLoading(false)
          return
        }

        const { tenant_slug } = await response.json()
        setTenantSlug(tenant_slug)

        // Redirect to new subdomain-based URL
        const currentHost = window.location.host
        const baseDomain = currentHost.replace(/^[^.]+\./, '') // Remove subdomain
        const newUrl = `${window.location.protocol}//${tenant_slug}.${baseDomain}/guest-chat`

        console.log(`[Legacy Guest Chat] Redirecting to: ${newUrl}`)
        window.location.href = newUrl
      } catch (err) {
        console.error('Error resolving tenant:', err)
        setLoading(false)
      }
    }

    resolveTenantSlug()
  }, [tenantSlugOrUuid])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirigiendo...</p>
        {!loading && (
          <p className="mt-2 text-sm text-gray-500">
            Si no eres redirigido automáticamente,{' '}
            <a href="/guest-chat" className="text-blue-600 hover:underline">
              haz clic aquí
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
