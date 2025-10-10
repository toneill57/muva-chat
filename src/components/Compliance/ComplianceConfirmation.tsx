'use client'

import { useState, useEffect } from 'react'
import {
  formatHotelCode,
  formatHotelCity,
  formatDocumentType,
  formatNationality,
  formatOrigin,
  formatDestination,
  formatDate,
  formatMovementType,
  formatMovementDate,
} from '@/lib/sire-formatters'

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * SIRE Compliance Data (13 campos oficiales)
 *
 * These are the 13 SIRE fields stored in guest_reservations after compliance chat.
 */
interface ComplianceData {
  // Datos del Hotel (2 campos)
  hotel_sire_code: string // "12345" (SCH registration code)
  hotel_city_code: string // "88001" (DIVIPOLA city code)

  // Datos del Huésped (6 campos)
  document_type: string // "3" (Pasaporte)
  document_number: string // "AB123456"
  nationality_code: string // "249" (SIRE country code, NOT ISO 3166-1)
  first_surname: string // "GARCIA"
  second_surname?: string // "LOPEZ" (optional, always shown in UI)
  given_names: string // "JUAN CARLOS"

  // Datos del Movimiento (3 campos)
  movement_type: string // "E" (Entrada) or "S" (Salida)
  movement_date: string // "2025-10-09" (YYYY-MM-DD)

  // Datos Geográficos (2 campos)
  origin_city_code: string // "249" (SIRE code) or "11001" (DIVIPOLA city)
  destination_city_code: string // "11001" (DIVIPOLA city code)

  // Additional
  birth_date: string // "1990-05-15" (YYYY-MM-DD)
}

interface ComplianceConfirmationProps {
  complianceData: ComplianceData
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

// ============================================================================
// DATA ROW COMPONENT
// ============================================================================

interface DataRowProps {
  label: string
  value: string
  isLoading?: boolean
}

function DataRow({ label, value, isLoading = false }: DataRowProps) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-200 last:border-b-0">
      <span className="text-sm font-medium text-gray-700 w-2/5">{label}</span>
      {isLoading ? (
        <div className="w-3/5 flex justify-end">
          <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
      ) : (
        <span className="text-sm text-gray-900 font-semibold text-right w-3/5">
          {value}
        </span>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ComplianceConfirmation({
  complianceData,
  onConfirm,
  onCancel,
  isLoading = false,
}: ComplianceConfirmationProps) {
  // Formatted values state
  const [formattedData, setFormattedData] = useState<{
    hotelCode: string
    hotelCity: string
    documentType: string
    birthDate: string
    nationality: string
    movementType: string
    movementDate: string
    origin: string
    destination: string
  } | null>(null)

  // Loading state
  const [isFormattingData, setIsFormattingData] = useState(true)

  // Format data on mount
  useEffect(() => {
    const formatData = async () => {
      setIsFormattingData(true)

      try {
        const [hotelCity, documentType, nationality, origin, destination] =
          await Promise.all([
            formatHotelCity(complianceData.hotel_city_code),
            formatDocumentType(complianceData.document_type),
            formatNationality(complianceData.nationality_code),
            formatOrigin(complianceData.origin_city_code),
            formatDestination(complianceData.destination_city_code),
          ])

        setFormattedData({
          hotelCode: formatHotelCode(complianceData.hotel_sire_code),
          hotelCity,
          documentType,
          birthDate: formatDate(complianceData.birth_date),
          nationality,
          movementType: formatMovementType(complianceData.movement_type),
          movementDate: formatMovementDate(complianceData.movement_date),
          origin,
          destination,
        })
      } catch (error) {
        console.error('[ComplianceConfirmation] Error formatting data:', error)
        // Fallback to raw values
        setFormattedData({
          hotelCode: complianceData.hotel_sire_code,
          hotelCity: complianceData.hotel_city_code,
          documentType: complianceData.document_type,
          birthDate: formatDate(complianceData.birth_date),
          nationality: complianceData.nationality_code,
          movementType: complianceData.movement_type,
          movementDate: formatDate(complianceData.movement_date),
          origin: complianceData.origin_city_code,
          destination: complianceData.destination_city_code,
        })
      } finally {
        setIsFormattingData(false)
      }
    }

    formatData()
  }, [complianceData])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compliance-confirmation-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <h2 id="compliance-confirmation-title" className="text-2xl font-bold">
            Confirmar datos SIRE
          </h2>
          <p className="text-sm text-blue-100 mt-1">
            Por favor verifica que los siguientes datos son correctos antes de confirmar
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* SECTION 1: Datos del Hotel (2 campos) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-blue-600">🏨</span>
              Datos del Hotel
            </h3>
            <div className="bg-gray-50 rounded-lg p-5 space-y-1">
              {/* Campo 1: Código del hotel */}
              <DataRow
                label="Código SCH del hotel"
                value={formattedData?.hotelCode || '...'}
                isLoading={isFormattingData}
              />

              {/* Campo 2: Ciudad del hotel */}
              <DataRow
                label="Ciudad del hotel"
                value={formattedData?.hotelCity || '...'}
                isLoading={isFormattingData}
              />
            </div>
          </div>

          {/* SECTION 2: Datos del Huésped (6 campos) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-green-600">👤</span>
              Datos del Huésped
            </h3>
            <div className="bg-gray-50 rounded-lg p-5 space-y-1">
              {/* Campo 3: Tipo de documento */}
              <DataRow
                label="Tipo de documento"
                value={formattedData?.documentType || '...'}
                isLoading={isFormattingData}
              />

              {/* Campo 4: Número de identificación */}
              <DataRow
                label="Número de identificación"
                value={complianceData.document_number}
              />

              {/* Campo 5: Nacionalidad */}
              <DataRow
                label="Nacionalidad"
                value={formattedData?.nationality || '...'}
                isLoading={isFormattingData}
              />

              {/* Campo 6: Primer apellido */}
              <DataRow label="Primer apellido" value={complianceData.first_surname} />

              {/* Campo 7: Segundo apellido (OPTIONAL - pero siempre se muestra) */}
              <DataRow
                label="Segundo apellido"
                value={complianceData.second_surname || '(Ninguno)'}
              />

              {/* Campo 8: Nombres */}
              <DataRow label="Nombres" value={complianceData.given_names} />
            </div>
          </div>

          {/* SECTION 3: Datos del Movimiento (3 campos) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-purple-600">🔄</span>
              Datos del Movimiento
            </h3>
            <div className="bg-gray-50 rounded-lg p-5 space-y-1">
              {/* Campo 9: Tipo de movimiento */}
              <DataRow
                label="Tipo de movimiento"
                value={formattedData?.movementType || '...'}
                isLoading={isFormattingData}
              />

              {/* Campo 10: Fecha del movimiento */}
              <DataRow
                label="Fecha del movimiento"
                value={formattedData?.movementDate || '...'}
                isLoading={isFormattingData}
              />

              {/* Campo 13: Fecha de nacimiento */}
              <DataRow
                label="Fecha de nacimiento"
                value={formattedData?.birthDate || '...'}
                isLoading={isFormattingData}
              />
            </div>
          </div>

          {/* SECTION 4: Datos Geográficos (2 campos) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-orange-600">🌍</span>
              Datos Geográficos
            </h3>
            <div className="bg-gray-50 rounded-lg p-5 space-y-1">
              {/* Campo 11: Procedencia */}
              <DataRow
                label="Procedencia"
                value={formattedData?.origin || '...'}
                isLoading={isFormattingData}
              />

              {/* Campo 12: Destino */}
              <DataRow
                label="Destino"
                value={formattedData?.destination || '...'}
                isLoading={isFormattingData}
              />
            </div>
          </div>

          {/* Info message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Los 13 campos mostrados son obligatorios para cumplir con la normativa SIRE
              de Colombia. Asegúrate de que estén correctos antes de confirmar.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end border-t pt-6">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Cancelar confirmación"
            >
              Cancelar
            </button>

            <button
              onClick={onConfirm}
              disabled={isLoading || isFormattingData}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              aria-label="Confirmar datos SIRE"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Guardando...
                </>
              ) : (
                'Confirmar datos'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
