import type { Viewport, Metadata } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',  // Support notch safe areas
}

export const metadata: Metadata = {
  title: 'Chat de Invitado | InnPilot',
  description: 'Asistente conversacional para huéspedes. Obtén información sobre tu estancia, actividades turísticas y más.',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Chat de Invitado',
    description: 'Tu asistente personal durante tu estancia',
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary',
    title: 'Chat de Invitado',
    description: 'Tu asistente personal durante tu estancia',
  },
}

export default function GuestChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-blue-50 to-indigo-100">
      {children}
    </div>
  )
}
