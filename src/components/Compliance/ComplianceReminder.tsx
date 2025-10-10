'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

// SIRE fields from guest_reservations table
interface GuestReservation {
  document_type: string | null
  document_number: string | null
  birth_date: string | null
  first_surname: string | null
  second_surname: string | null
  given_names: string | null
  nationality_code: string | null
  origin_city_code: string | null
  destination_city_code: string | null
  movement_type: string | null
  movement_date: string | null
  hotel_sire_code: string | null
  hotel_city_code: string | null
}

interface ComplianceReminderProps {
  onStart: () => void
  onDismiss: () => void
  reservation?: GuestReservation // SIRE data from guest_reservations
}

/**
 * Checks SIRE data completeness in guest_reservations
 * Returns progress status and percentage
 */
function checkSIRECompleteness(reservation?: GuestReservation): {
  isComplete: boolean
  progress: number
  status: 'not_started' | 'in_progress' | 'completed'
  filledCount: number
  totalRequired: number
} {
  if (!reservation) {
    return {
      isComplete: false,
      progress: 0,
      status: 'not_started',
      filledCount: 0,
      totalRequired: 6,
    }
  }

  // Required SIRE fields (6 core fields)
  const requiredFields = [
    reservation.document_type,
    reservation.document_number,
    reservation.birth_date,
    reservation.first_surname,
    reservation.given_names,
    reservation.nationality_code,
  ]

  const filledCount = requiredFields.filter(
    (field) => field !== null && field !== undefined && field !== ''
  ).length
  const totalRequired = requiredFields.length
  const progress = Math.round((filledCount / totalRequired) * 100)

  let status: 'not_started' | 'in_progress' | 'completed' = 'not_started'
  if (progress === 0) status = 'not_started'
  else if (progress < 100) status = 'in_progress'
  else status = 'completed'

  return {
    isComplete: progress === 100,
    progress,
    status,
    filledCount,
    totalRequired,
  }
}

export default function ComplianceReminder({
  onStart,
  onDismiss,
  reservation,
}: ComplianceReminderProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  const { isComplete, progress, status, filledCount, totalRequired } =
    checkSIRECompleteness(reservation)

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
  if (isComplete || isDismissed) {
    return null
  }

  const getProgressBadge = () => {
    if (status === 'not_started') {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
          role="status"
          aria-label="Registro SIRE no iniciado"
        >
          No iniciado
        </span>
      )
    } else if (status === 'in_progress') {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
          role="status"
          aria-label={`Registro SIRE en progreso: ${filledCount} de ${totalRequired} campos completados`}
        >
          En progreso ({filledCount}/{totalRequired} campos)
        </span>
      )
    } else if (status === 'completed') {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
          role="status"
          aria-label="Registro SIRE completado"
        >
          ✅ Completado
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
          {status === 'in_progress' && (
            <div className="w-full bg-gray-200 rounded-full h-2" aria-hidden="true">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso: ${progress}%`}
              />
            </div>
          )}

          {/* Button */}
          <button
            onClick={onStart}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label={status === 'in_progress' ? 'Continuar registro SIRE' : 'Iniciar registro SIRE'}
          >
            {status === 'in_progress' ? 'Continuar registro' : 'Iniciar registro'}
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
