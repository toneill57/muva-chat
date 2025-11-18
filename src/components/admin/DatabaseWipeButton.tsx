'use client'

/**
 * Database Wipe Button Component (DEV ONLY)
 *
 * Provides a UI button to wipe the dev database for testing purposes
 * Only visible when NEXT_PUBLIC_ENABLE_DEV_FEATURES=true
 */

import { useState, useEffect } from 'react'

export default function DatabaseWipeButton() {
  const [isWiping, setIsWiping] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Check if we're in dev environment (client-side only)
  // CRITICAL: Must check in useEffect to avoid SSR/client mismatch
  useEffect(() => {
    // Only show in dev environment (NEXT_PUBLIC_ENABLE_DEV_FEATURES=true)
    const isDevEnv = process.env.NEXT_PUBLIC_ENABLE_DEV_FEATURES === 'true'
    setIsVisible(isDevEnv)
  }, [])

  // Don't show button in production or during SSR
  if (!isVisible) {
    return null
  }

  const handleWipeDatabase = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      '⚠️ ADVERTENCIA: Esta acción borrará TODOS los datos de la base de datos DEV.\n\n' +
      'Esto incluye:\n' +
      '• Todos los tenants\n' +
      '• Todos los alojamientos\n' +
      '• Todas las reservas\n' +
      '• Todos los embeddings\n\n' +
      '¿Estás seguro de que quieres continuar?'
    )

    if (!confirmed) {
      return
    }

    setIsWiping(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/wipe-database', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: `${data.message} (${data.tables_wiped?.length || 0} tablas limpiadas)`
        })

        // Auto-clear success message after 5 seconds
        setTimeout(() => {
          setMessage(null)
        }, 5000)
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Error al limpiar la base de datos'
        })
      }
    } catch (error: any) {
      console.error('Error wiping database:', error)
      setMessage({
        type: 'error',
        text: `Error: ${error?.message || 'Unknown error'}`
      })
    } finally {
      setIsWiping(false)
    }
  }

  return (
    <div className="mt-12 pt-8 border-t border-gray-300">
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">
            🔧 Herramientas de Desarrollo (DEV)
          </h3>
          <p className="text-xs text-yellow-700 mb-3">
            Esta sección solo está disponible en el ambiente DEV
          </p>

          <button
            onClick={handleWipeDatabase}
            disabled={isWiping}
            className={`
              px-4 py-2 rounded-md font-medium text-sm transition-all
              ${isWiping
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
              }
            `}
          >
            {isWiping ? (
              <>
                <span className="inline-block animate-spin mr-2">⚙️</span>
                Limpiando base de datos...
              </>
            ) : (
              <>
                🗑️ Limpiar Base de Datos
              </>
            )}
          </button>
        </div>

        {/* Status Messages */}
        {message && (
          <div
            className={`
              p-4 rounded-lg text-sm
              ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : ''}
              ${message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : ''}
              ${message.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-800' : ''}
            `}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
