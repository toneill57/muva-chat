import DevChatMobileDev from '@/components/Dev/DevChatMobileDev'

export const metadata = {
  title: 'Mobile Chat - DEV',
  description: 'Mobile-first chat interface - Development Environment'
}

export default function ChatMobileDevPage() {
  return (
    <main className="h-screen w-screen overflow-hidden relative">
      <DevChatMobileDev />
    </main>
  )
}
