'use client'

import { Bot } from 'lucide-react'
import NewConversationButton from './NewConversationButton'

interface TenantHeaderProps {
  tenant: {
    business_name: string
    logo_url: string | null
    primary_color: string
  }
  onNewConversation: () => void
}

export default function TenantHeader({ tenant, onNewConversation }: TenantHeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 text-white shadow-md pt-[env(safe-area-inset-top)]"
      style={{
        background: `linear-gradient(to right, ${tenant.primary_color}, ${adjustColor(tenant.primary_color, 20)})`
      }}
    >
      <div className="h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {tenant.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.business_name}
              className="w-10 h-10 rounded-full object-cover bg-white/20"
            />
          ) : (
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
          )}
          <h1 className="font-bold text-lg">{tenant.business_name} Chat</h1>
        </div>

        <NewConversationButton onClick={onNewConversation} />
      </div>
    </header>
  )
}

/**
 * Helper to adjust color brightness
 * For gradient effect
 */
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = (num >> 8 & 0x00FF) + amt
  const B = (num & 0x0000FF) + amt
  return '#' + (
    0x1000000 +
    (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)
  ).toString(16).slice(1)
}
