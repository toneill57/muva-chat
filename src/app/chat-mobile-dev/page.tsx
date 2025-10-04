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
    <main className="h-screen w-screen overflow-hidden relative bg-[hsl(var(--chat-bg))]">
      <DevChatMobileDev />
    </main>
  )
}
