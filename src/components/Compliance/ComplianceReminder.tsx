'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface ComplianceReminderProps {
  onStart: () => void
  onDismiss: () => void
  progressPercentage?: number // 0 = not started, 50 = in progress, 100 = completed
}

export default function ComplianceReminder({
  onStart,
  onDismiss,
  progressPercentage = 0,
}: ComplianceReminderProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check localStorage for dismissed state
    const dismissed = localStorage.getItem('compliance_reminder_dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('compliance_reminder_dismissed', 'true')
    setIsDismissed(true)
    onDismiss()
  }

  // Auto-hide if completed
  if (progressPercentage === 100 || isDismissed) {
    return null
  }

  const getProgressBadge = () => {
    if (progressPercentage === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          No iniciado
        </span>
      )
    } else if (progressPercentage < 100) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          En progreso {progressPercentage}%
        </span>
      )
    }
    return null
  }

  return (
    <div
      className="relative bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4"
      role="alert"
      aria-live="polite"
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
        aria-label="Cerrar recordatorio"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-xl" aria-hidden="true">
            📋
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Registro SIRE</h3>
            {getProgressBadge()}
          </div>

          <p className="text-sm text-gray-700">
            Completa tu registro SIRE para ayudarnos a cumplir con la normativa colombiana
            <span className="text-gray-500"> (opcional)</span>
          </p>

          {/* Progress bar */}
          {progressPercentage > 0 && progressPercentage < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          )}

          {/* Button */}
          <button
            onClick={onStart}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {progressPercentage > 0 ? 'Continuar registro' : 'Iniciar registro'}
            <svg
              className="ml-2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
