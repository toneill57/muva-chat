/**
 * Dev Chat Demo Page
 *
 * ⚠️ DEMO PAGE - Solo para desarrollo/testing de features experimentales
 * ❌ NO usar en producción
 *
 * Para producción usar: [subdomain].muva.chat (ej: simmerdown.muva.chat)
 *
 * Este demo usa componentes de /components/Dev/ para testing de features nuevas.
 * Acceso: http://localhost:3000/dev-chat-demo
 */

import { DevChat } from '@/components/Dev'

export default function DevChatDemoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      {/* Dev Badge */}
      <div className="fixed top-4 right-4 z-[9997] bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg">
        <p className="text-sm font-bold">🚧 DEV MODE</p>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Dev Chat Environment 🛠️
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Testing environment for chat improvements.
            This is an EXACT copy of the public chat for safe experimentation.
          </p>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Try the Dev Chat Assistant
            </h2>
            <p className="text-gray-600 mb-6">
              Click the chat bubble in the bottom-right corner to start testing.
              All features are identical to the production version.
            </p>

            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">🏠</div>
                <h3 className="font-semibold text-purple-900 mb-2">
                  View Accommodations
                </h3>
                <p className="text-sm text-purple-700">
                  Ask about our rooms and see beautiful photos right in the chat.
                </p>
              </div>

              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">📅</div>
                <h3 className="font-semibold text-indigo-900 mb-2">
                  Check Availability
                </h3>
                <p className="text-sm text-indigo-700">
                  Tell us your dates and we'll show you what's available.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">✨</div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Test Features
                </h3>
                <p className="text-sm text-blue-700">
                  Experiment with new features without affecting production.
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
                  className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm"
                >
                  {question}
                </span>
              ))}
            </div>
          </div>

          {/* Dev Environment Info */}
          <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl shadow-lg p-6 mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Development Environment Info
            </h2>

            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="flex gap-4">
                <div className="text-3xl">🔧</div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    Safe Testing
                  </h4>
                  <p className="text-sm text-gray-600">
                    All changes are isolated. Original system remains untouched.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-3xl">📊</div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    Full Functionality
                  </h4>
                  <p className="text-sm text-gray-600">
                    All features work exactly like production.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-3xl">🎨</div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    UI Experiments
                  </h4>
                  <p className="text-sm text-gray-600">
                    Test new designs and interactions safely.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-3xl">⚡</div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    Quick Iterations
                  </h4>
                  <p className="text-sm text-gray-600">
                    Make changes and see results immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Features Comparison */}
          <div className="text-left">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Current Features (Identical to Production)
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

          {/* Next Steps */}
          <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📝 Ready to Make Improvements?
            </h3>
            <p className="text-gray-600 mb-4">
              Check the TODO.md and plan.md files for a list of planned improvements and how to implement them.
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="/plan.md"
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold
                           hover:bg-purple-700 transition-colors"
              >
                View Plan
              </a>
              <a
                href="/TODO.md"
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold
                           hover:bg-indigo-700 transition-colors"
              >
                View TODOs
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Dev Chat Component */}
      <DevChat />
    </main>
  )
}
