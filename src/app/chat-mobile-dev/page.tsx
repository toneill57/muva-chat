/**
 * Mobile Chat Demo Page (Dev)
 *
 * ⚠️ DEMO PAGE - Solo para desarrollo/testing mobile + features experimentales
 * ❌ NO usar en producción
 *
 * Para producción usar: [subdomain].muva.chat en dispositivos móviles
 * Este demo usa componentes de /components/Dev/DevChatMobileDev para testing.
 * Acceso: http://localhost:3000/chat-mobile-dev
 */

import DevChatMobileDev from '@/components/Dev/DevChatMobileDev'

export const metadata = {
  title: 'Mobile Chat - DEV',
  description: 'Mobile-first chat interface - Development Environment'
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover'
}

export default function ChatMobileDevPage() {
  return (
    <main className="h-screen w-screen overflow-hidden relative">
      <DevChatMobileDev />
    </main>
  )
}
