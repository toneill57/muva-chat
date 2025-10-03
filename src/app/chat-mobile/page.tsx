import Link from 'next/link'

export const metadata = {
  title: 'Mobile Chat - Coming Soon',
  description: 'Mobile-first chat interface'
}

export default function ChatMobilePage() {
  return (
    <main className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="text-6xl mb-6">🚧</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Coming Soon
        </h1>
        <p className="text-gray-600 mb-8">
          Mobile-first chat interface is currently in development.
        </p>
        <Link
          href="/chat-mobile-dev"
          className="inline-block bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all"
        >
          View Development Version →
        </Link>
      </div>
    </main>
  )
}
