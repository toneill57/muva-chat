import { headers } from 'next/headers'
import { getSubdomain } from '@/lib/tenant-utils'
import { redirect } from 'next/navigation'
import { SuperChatPage } from '@/components/SuperChat'

// Force dynamic rendering (required for headers())
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Get hostname from headers
  const headersList = await headers()
  const hostname = headersList.get('host') || ''

  // Extract subdomain (middleware already detected it)
  const subdomain = getSubdomain(hostname)
  console.log('[page.tsx] hostname:', hostname, 'subdomain:', subdomain)

  // NO SUBDOMAIN → MUVA Super Chat (aggregated platform chat)
  if (!subdomain) {
    return <SuperChatPage />
  }

  // SUBDOMAIN EXISTS → Redirect to /with-me
  redirect('/with-me')
}

// Generate metadata dynamically
export async function generateMetadata() {
  return {
    title: 'MUVA Chat - Descubre alojamientos únicos',
    description: 'Chatea con AI para encontrar tu lugar perfecto en San Andrés'
  }
}
