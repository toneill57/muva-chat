'use client'

/**
 * Signup Success Page
 *
 * Displayed after successful tenant registration.
 * Shows credentials and next steps.
 */

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const subdomain = searchParams.get('subdomain') || 'tu-hotel'

  // Detect current environment and build correct dashboard URL
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname.includes('localhost')
  const currentPort = typeof window !== 'undefined' ? window.location.port : ''

  const dashboardUrl = isLocalhost
    ? `http://${subdomain}.localhost:${currentPort}/dashboard`
    : `https://${subdomain}.muva.chat/dashboard`

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-block bg-green-500 text-white rounded-full p-6 mb-4">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ¡Cuenta Creada Exitosamente! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            Tu plataforma MUVA está lista para usar
          </p>
        </div>

        {/* Account Details Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Detalles de tu Cuenta
          </h2>

          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Dashboard URL</p>
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-mono text-lg"
              >
                {dashboardUrl}
              </a>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
                ⚠️ Guarda tus credenciales de acceso
              </p>
              <p className="text-sm text-yellow-700">
                Usa el username y password que creaste en el paso anterior para
                acceder a tu dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Next Steps Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Próximos Pasos
          </h2>

          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Accede a tu Dashboard
                </h3>
                <p className="text-gray-600">
                  Ingresa con tus credenciales y explora las funcionalidades
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Personaliza tu Branding
                </h3>
                <p className="text-gray-600">
                  Sube tu logo y ajusta los colores en Settings → Branding
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Conecta MotoPress o Airbnb
                </h3>
                <p className="text-gray-600">
                  Sincroniza tus habitaciones y reservas en Integrations
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Carga Documentos del Hotel
                </h3>
                <p className="text-gray-600">
                  Sube políticas, FAQs y manuales en Knowledge Base
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                5
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Prueba el Chat de Huéspedes
                </h3>
                <p className="text-gray-600">
                  Comparte el link con tus huéspedes y recibe mensajes en tiempo real
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white mb-6">
          <h2 className="text-2xl font-bold mb-4">
            ✨ Incluido en tu Plan Premium
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-2">
              <svg
                className="w-6 h-6 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Chat AI con Claude (ilimitado)</span>
            </div>

            <div className="flex items-start space-x-2">
              <svg
                className="w-6 h-6 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Contenido turístico MUVA</span>
            </div>

            <div className="flex items-start space-x-2">
              <svg
                className="w-6 h-6 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Integraciones MotoPress/Airbnb</span>
            </div>

            <div className="flex items-start space-x-2">
              <svg
                className="w-6 h-6 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Cumplimiento SIRE automático</span>
            </div>

            <div className="flex items-start space-x-2">
              <svg
                className="w-6 h-6 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Chat para staff interno</span>
            </div>

            <div className="flex items-start space-x-2">
              <svg
                className="w-6 h-6 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Reportes y analytics</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <a
            href={dashboardUrl}
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg shadow-lg transform hover:scale-105 transition"
          >
            Ir a Mi Dashboard →
          </a>
        </div>

        {/* Support */}
        <div className="mt-8 text-center text-gray-600">
          <p>
            ¿Necesitas ayuda?{' '}
            <a
              href="mailto:support@muva.chat"
              className="text-blue-600 hover:underline"
            >
              Contáctanos
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
