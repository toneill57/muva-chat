'use client'

import { useState } from 'react'
import EditableField from './EditableField'
import SireDataCollapse from './SireDataCollapse'

interface ConversationalData {
  nombre_completo: string
  numero_pasaporte: string
  pais_texto: string
  proposito_viaje: string
}

interface SireData {
  // Hotel/Location
  codigo_hotel: string
  codigo_ciudad: string
  nombre_hotel: string

  // Documento
  tipo_documento: string
  numero_identificacion: string
  fecha_expedicion_documento: string

  // Identidad
  primer_apellido: string
  segundo_apellido: string
  nombre_extranjero: string

  // Nacionalidad
  codigo_nacionalidad: string
  codigo_pais: string

  // Fechas
  fecha_nacimiento: string
  tipo_movimiento: string
  fecha_movimiento: string

  // Lugares
  lugar_procedencia: string
  lugar_destino: string
  codigo_ciudad_residencia: string

  // Ocupación
  codigo_ocupacion: string
}

interface ComplianceConfirmationProps {
  conversationalData: ConversationalData
  sireData: SireData
  onConfirm: (data: any) => Promise<void>
  onEdit: (field: keyof ConversationalData, value: string) => void
  onCancel: () => void
  isLoading?: boolean
}

// Lista de países para dropdown (provisional - debería venir de src/lib/sire/sire-country-mapping.ts)
const COUNTRIES = [
  { label: 'Estados Unidos', value: 'Estados Unidos' },
  { label: 'Colombia', value: 'Colombia' },
  { label: 'España', value: 'España' },
  { label: 'México', value: 'México' },
  { label: 'Argentina', value: 'Argentina' },
  { label: 'Chile', value: 'Chile' },
  { label: 'Brasil', value: 'Brasil' },
  { label: 'Perú', value: 'Perú' },
  { label: 'Ecuador', value: 'Ecuador' },
  { label: 'Venezuela', value: 'Venezuela' },
  { label: 'Canadá', value: 'Canadá' },
  { label: 'Reino Unido', value: 'Reino Unido' },
  { label: 'Francia', value: 'Francia' },
  { label: 'Alemania', value: 'Alemania' },
  { label: 'Italia', value: 'Italia' },
  { label: 'Portugal', value: 'Portugal' },
  { label: 'Otro', value: 'Otro' },
]

export default function ComplianceConfirmation({
  conversationalData,
  sireData,
  onConfirm,
  onEdit,
  onCancel,
  isLoading = false,
}: ComplianceConfirmationProps) {
  const [highlightedFields, setHighlightedFields] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  // Validaciones
  const validateNombreCompleto = (nombre: string): string | null => {
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/
    if (!regex.test(nombre)) {
      return 'El nombre solo puede contener letras, espacios, guiones y apóstrofes'
    }
    if (nombre.length < 3) {
      return 'Mínimo 3 caracteres'
    }
    if (nombre.length > 100) {
      return 'Máximo 100 caracteres'
    }
    return null
  }

  const validatePasaporte = (pasaporte: string): string | null => {
    const regex = /^[A-Z]{2}[0-9]{6,9}$/
    if (!regex.test(pasaporte)) {
      return 'Formato inválido. Usa 2 letras mayúsculas + 6-9 dígitos (ej: US123456789)'
    }
    return null
  }

  const handleEdit = (field: keyof ConversationalData, value: string) => {
    // Auto-uppercase for passport
    if (field === 'numero_pasaporte') {
      value = value.toUpperCase()
    }

    onEdit(field, value)

    // Validate
    let error: string | null = null
    if (field === 'nombre_completo') {
      error = validateNombreCompleto(value)
    } else if (field === 'numero_pasaporte') {
      error = validatePasaporte(value)
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }))
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleConfirm = async () => {
    // Validate all fields before confirming
    const nombreError = validateNombreCompleto(conversationalData.nombre_completo)
    const pasaporteError = validatePasaporte(conversationalData.numero_pasaporte)

    if (nombreError || pasaporteError) {
      setErrors({
        ...(nombreError && { nombre_completo: nombreError }),
        ...(pasaporteError && { numero_pasaporte: pasaporteError }),
      })
      return
    }

    setError(null)

    try {
      await onConfirm({
        conversational_data: conversationalData,
        sire_data: sireData,
      })
    } catch (err: any) {
      setError(err.message || 'Error al enviar datos de compliance')
      console.error('Compliance submission error:', err)
    }
  }

  // Hover mapping handlers
  const handleNombreHover = () => {
    setHighlightedFields(['primer_apellido', 'segundo_apellido', 'nombre_extranjero'])
  }

  const handlePasaporteHover = () => {
    setHighlightedFields(['tipo_documento', 'numero_identificacion'])
  }

  const handlePaisHover = () => {
    setHighlightedFields(['codigo_pais', 'codigo_nacionalidad'])
  }

  const clearHighlight = () => {
    setHighlightedFields([])
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compliance-confirmation-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <h2 id="compliance-confirmation-title" className="text-2xl font-bold">
            📋 Confirmación Final SIRE
          </h2>
          <p className="text-sm text-blue-100 mt-1">
            Verifica que todos los datos estén correctos antes de enviar
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* SECCIÓN 1: Datos Conversacionales (EDITABLE) */}
          <div className="space-y-4 p-6 bg-white rounded-lg border-2 border-blue-200">
            <h3 className="text-xl font-semibold text-gray-900">📝 Confirma tus datos</h3>
            <p className="text-sm text-gray-600">
              Estos campos son editables. Asegúrate de que estén correctos.
            </p>

            <div className="space-y-4 mt-4">
              {/* Nombre completo */}
              <div onMouseEnter={handleNombreHover} onMouseLeave={clearHighlight}>
                <EditableField
                  label="Nombre completo"
                  value={conversationalData.nombre_completo}
                  onChange={(value) => handleEdit('nombre_completo', value)}
                  validation={{
                    regex: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/,
                    min: 3,
                    max: 100,
                    errorMessage:
                      'El nombre solo puede contener letras, espacios, guiones y apóstrofes',
                  }}
                  placeholder="Juan Pérez García"
                  helpText="Solo letras, espacios, guiones y apóstrofes"
                />
              </div>

              {/* Número pasaporte */}
              <div onMouseEnter={handlePasaporteHover} onMouseLeave={clearHighlight}>
                <EditableField
                  label="Número de pasaporte"
                  value={conversationalData.numero_pasaporte}
                  onChange={(value) => handleEdit('numero_pasaporte', value.toUpperCase())}
                  validation={{
                    regex: /^[A-Z]{2}[0-9]{6,9}$/,
                    errorMessage:
                      'Formato inválido. Usa 2 letras mayúsculas + 6-9 dígitos (ej: US123456789)',
                  }}
                  placeholder="AB123456789"
                  helpText="Formato: 2 letras + 6-9 dígitos (ej: US123456789)"
                />
              </div>

              {/* País */}
              <div onMouseEnter={handlePaisHover} onMouseLeave={clearHighlight}>
                <EditableField
                  label="País de origen"
                  value={conversationalData.pais_texto}
                  onChange={(value) => handleEdit('pais_texto', value)}
                  type="select"
                  options={COUNTRIES}
                  helpText="Selecciona tu país de origen"
                />
              </div>

              {/* Propósito viaje */}
              <EditableField
                label="Propósito del viaje"
                value={conversationalData.proposito_viaje}
                onChange={(value) => handleEdit('proposito_viaje', value)}
                type="textarea"
                validation={{ max: 200 }}
                placeholder="Turismo y vacaciones"
                helpText="Máximo 200 caracteres"
              />
            </div>
          </div>

          {/* SECCIÓN 2: Datos SIRE (READ-ONLY, COLAPSABLE) */}
          <SireDataCollapse
            sireData={sireData}
            highlightedFields={highlightedFields}
            conversationalPaisTex={conversationalData.pais_texto}
          />

          {/* Warning si hay errores */}
          {Object.keys(errors).length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ Por favor corrige los errores antes de confirmar
              </p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* SECCIÓN 3: Botones de Acción */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end border-t pt-6">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Cancelar confirmación"
            >
              ❌ Cancelar
            </button>

            <button
              onClick={handleConfirm}
              disabled={isLoading || Object.keys(errors).length > 0}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Confirmar y enviar a SIRE"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Validando datos...
                </span>
              ) : (
                '✅ Confirmar y Enviar a SIRE'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
