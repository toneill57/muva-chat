/**
 * Mobile Chat Demo Page (Public)
 *
 * ⚠️ DEMO PAGE - Solo para desarrollo/testing mobile
 * ❌ NO usar en producción
 *
 * Para producción usar: [subdomain].muva.chat en dispositivos móviles
 * Este demo usa componentes de /components/Public/ChatMobile para testing.
 * Acceso: http://localhost:3000/chat-mobile
 */

import ChatMobile from '@/components/Public/ChatMobile'

export const metadata = {
  title: 'Mobile Chat - Simmer Down',
  description: 'Chat mobile-first para Simmer Down Guest House en San Andrés, Colombia'
}

export default function ChatMobilePage() {
  return <ChatMobile />
}
