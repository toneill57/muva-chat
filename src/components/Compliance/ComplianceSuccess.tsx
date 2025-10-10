'use client'

import { useEffect, useState } from 'react'

interface ComplianceSuccessProps {
  submissionData: {
    submission_id: string
    reservation_id: string
    sire_reference?: string
  }
  onClose: () => void
}

export default function ComplianceSuccess({
  submissionData,
  onClose,
}: ComplianceSuccessProps) {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    // Auto-close after 8 seconds
    const timer = setTimeout(() => {
      onClose()
    }, 8000)

    // Hide confetti after 4 seconds
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false)
    }, 4000)

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
            ¡Registro SIRE completado!
          </h2>

          <p className="text-gray-600 mb-8">
            Tus datos han sido guardados correctamente en el sistema
          </p>

          {/* Reference info */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">ID de Reserva:</span>
                <span className="text-sm font-mono text-gray-900">
                  {submissionData.reservation_id.slice(0, 8)}...
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">ID de Submission:</span>
                <span className="text-sm font-mono text-gray-900">
                  {submissionData.submission_id.slice(0, 8)}...
                </span>
              </div>

              {submissionData.sire_reference && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Referencia SIRE:</span>
                  <span className="text-lg font-mono font-bold text-blue-600">
                    {submissionData.sire_reference}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-gray-600 text-center">
                ✅ Los datos se guardaron en <code className="bg-gray-200 px-1 rounded">compliance_submissions</code> y{' '}
                <code className="bg-gray-200 px-1 rounded">guest_reservations</code>
              </p>
            </div>

            <div className="border-t pt-4">
              <span className="text-xs text-gray-500 block text-center">
                {new Date().toLocaleString('es-CO', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          </div>

          {/* Info message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800 text-center">
              ✓ Registro SIRE completado. Los datos están listos para exportación cuando sea requerido.
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

          {/* Auto-close notice */}
          <p className="text-xs text-gray-500 mt-4">
            Esta ventana se cerrará automáticamente en 8 segundos
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
