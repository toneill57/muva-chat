import DevChatMobileDev from '@/components/Dev/DevChatMobileDev'

export const metadata = {
  title: 'Mobile Chat - DEV',
  description: 'Mobile-first chat interface - Development Environment'
}

export default function ChatMobileDevPage() {
  return (
    <main className="h-screen w-screen overflow-hidden relative">
      {/* DEV Badge - moved to top-left to avoid blocking header button */}
      <div className="fixed top-4 left-4 z-[9999] bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg">
        <p className="text-sm font-bold">🚧 DEV MODE</p>
      </div>

      <DevChatMobileDev />
    </main>
  )
}
