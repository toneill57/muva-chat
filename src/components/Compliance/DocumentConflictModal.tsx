/**
 * DocumentConflictModal Component
 *
 * Modal que se muestra cuando los datos del pasaporte difieren de los datos de la reserva.
 * Permite al usuario decidir si sobrescribir los datos existentes o mantenerlos.
 *
 * Features:
 * - Tabla de comparación lado a lado (Reserva vs Pasaporte)
 * - Botones de acción claros y descriptivos
 * - Advertencia visual sobre la decisión
 *
 * @created December 25, 2025
 * @context SIRE Auto-Submission - Conditional Overwrite UI
 */

'use client'

import { AlertTriangle, FileText, User } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface ConflictModalProps {
  existing: {
    names: string | null
    surname: string | null
  }
  extracted: {
    names: string
    surname: string
  }
  onConfirm: (decision: 'use_document' | 'keep_existing') => void
  onCancel?: () => void
}

// ============================================================================
// Component
// ============================================================================

export function DocumentConflictModal({
  existing,
  extracted,
  onConfirm,
  onCancel
}: ConflictModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in" onClick={onCancel} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
          {/* Header */}
          <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Los datos del pasaporte difieren de la reserva
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Los nombres en el documento escaneado no coinciden con los datos de la reserva.
                  Por favor, verifica cuáles datos son correctos.
                </p>
              </div>
            </div>
          </div>

          {/* Body - Comparison Table */}
          <div className="px-6 py-6">
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3"
                    >
                      Campo
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Reserva actual
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Pasaporte escaneado
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Nombres */}
                  <tr className={existing.names !== extracted.names ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Nombres
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {existing.names || <span className="text-gray-400 italic">Sin datos</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700">
                      {extracted.names}
                    </td>
                  </tr>

                  {/* Apellido */}
                  <tr className={existing.surname !== extracted.surname ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Apellido
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {existing.surname || <span className="text-gray-400 italic">Sin datos</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700">
                      {extracted.surname}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">¿Cuál es la información correcta?</p>
                  <p>
                    Si la persona que se está registrando es <strong>diferente</strong> a quien hizo la reserva
                    (ej: un familiar o amigo), usa los <strong>datos del pasaporte</strong>.
                  </p>
                  <p className="mt-2">
                    Si hay un error en el escaneo del pasaporte y los datos de la reserva son correctos,
                    mantén los <strong>datos actuales</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Actions */}
          <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end border-t border-gray-200">
            <button
              onClick={() => onConfirm('keep_existing')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Mantener datos actuales de la reserva
            </button>
            <button
              onClick={() => onConfirm('use_document')}
              className="px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              Usar datos del pasaporte escaneado
            </button>
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
