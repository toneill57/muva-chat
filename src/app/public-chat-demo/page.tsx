/**
 * Public Chat Demo Page
 *
 * ⚠️ DEMO PAGE - Solo para desarrollo/testing
 * ❌ NO usar en producción
 *
 * Para producción usar: [subdomain].muva.chat (ej: simmerdown.muva.chat)
 *
 * Este demo usa componentes de /components/Public/ para testing local.
 * Acceso: http://localhost:3000/public-chat-demo
 */

import { PublicChat } from '@/components/Public'

export default function PublicChatDemoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-blue-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to Simmer Down
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Experience the Colombian Caribbean like never before.
            Your tropical paradise awaits.
          </p>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Try Our Chat Assistant
            </h2>
            <p className="text-gray-600 mb-6">
              Click the chat bubble in the bottom-right corner to start a conversation.
              Ask about our rooms, availability, rates, or anything else!
            </p>

            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-teal-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">🏠</div>
                <h3 className="font-semibold text-teal-900 mb-2">
                  View Accommodations
                </h3>
                <p className="text-sm text-teal-700">
                  Ask about our rooms and see beautiful photos right in the chat.
                </p>
              </div>

              <div className="bg-cyan-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">📅</div>
                <h3 className="font-semibold text-cyan-900 mb-2">
                  Check Availability
                </h3>
                <p className="text-sm text-cyan-700">
                  Tell us your dates and we'll show you what's available.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">✨</div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Book Instantly
                </h3>
                <p className="text-sm text-blue-700">
                  Get direct links to check availability and make your reservation.
                </p>
              </div>
            </div>
          </div>

          {/* Sample Questions */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-12">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Try asking:
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'Show me your rooms',
                'I need a room for 2 people in December',
                'What are your rates?',
                'Tell me about amenities',
                'Do you have ocean view rooms?',
                "What's included in the price?"
              ].map((question, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm"
                >
                  {question}
                </span>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="text-left">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Chat Features
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="text-3xl">💬</div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    Natural Conversations
                  </h4>
                  <p className="text-sm text-gray-600">
                    Chat naturally and our AI understands your needs.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-3xl">🖼️</div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    Photo Previews
                  </h4>
                  <p className="text-sm text-gray-600">
                    See accommodation photos directly in the chat.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-3xl">🎯</div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    Smart Suggestions
                  </h4>
                  <p className="text-sm text-gray-600">
                    Get helpful follow-up questions to guide your search.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-3xl">📱</div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    Mobile Optimized
                  </h4>
                  <p className="text-sm text-gray-600">
                    Works perfectly on any device, anywhere.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Public Chat Component */}
      <PublicChat />
    </main>
  )
}
