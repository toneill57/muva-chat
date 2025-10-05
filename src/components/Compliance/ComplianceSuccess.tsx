'use client'

import { useEffect, useState } from 'react'

interface ComplianceSuccessProps {
  sireReferenceNumber: string
  traReferenceNumber?: string
  onClose: () => void
}

export default function ComplianceSuccess({
  sireReferenceNumber,
  traReferenceNumber,
  onClose,
}: ComplianceSuccessProps) {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      onClose()
    }, 5000)

    // Hide confetti after 3 seconds
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false)
    }, 3000)

    return () => {
      clearTimeout(timer)
      clearTimeout(confettiTimer)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compliance-success-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Success animation background */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="confetti-container">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][
                      Math.floor(Math.random() * 4)
                    ],
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 p-8 text-center">
          {/* Success icon */}
          <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <svg
              className="w-16 h-16 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Title */}
          <h2
            id="compliance-success-title"
            className="text-3xl font-bold text-gray-900 mb-3"
          >
            ¡Registro SIRE exitoso!
          </h2>

          <p className="text-gray-600 mb-8">
            Tus datos han sido enviados correctamente a las autoridades colombianas
          </p>

          {/* Reference numbers */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Referencia SIRE:</span>
              <span className="text-lg font-mono font-bold text-blue-600">
                {sireReferenceNumber}
              </span>
            </div>

            {traReferenceNumber && (
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-sm font-medium text-gray-700">Referencia TRA:</span>
                <span className="text-lg font-mono font-bold text-purple-600">
                  {traReferenceNumber}
                </span>
              </div>
            )}

            <div className="border-t pt-4">
              <span className="text-xs text-gray-500">
                {new Date().toLocaleString('es-CO', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          </div>

          {/* Info message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              💡 Guarda estos números de referencia. Te serán útiles durante tu estadía.
            </p>
          </div>

          {/* Button */}
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-medium"
            aria-label="Volver al chat"
          >
            Volver al chat
          </button>

          {/* Auto-redirect notice */}
          <p className="text-xs text-gray-500 mt-4">
            Esta ventana se cerrará automáticamente en 5 segundos
          </p>
        </div>
      </div>

      {/* Confetti CSS */}
      <style jsx>{`
        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          opacity: 0;
          animation: confetti-fall 3s linear infinite;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-bounce {
          animation: bounce 1s ease-in-out 3;
        }
      `}</style>
    </div>
  )
}
