/**
 * useSireProgressiveDisclosure Hook
 *
 * Custom hook para manejo de estado de progressive disclosure SIRE.
 * Gestiona captura secuencial de 13 campos obligatorios con validación en tiempo real.
 *
 * Features:
 * - Determina próximo campo a preguntar automáticamente
 * - Valida cada campo en tiempo real
 * - Normaliza valores (ej: "ab-123456" → "AB123456")
 * - Tracking de campos completados
 * - Detección de completitud de datos
 *
 * @see src/lib/sire/progressive-disclosure.ts - Lógica de validación y determinación de campos
 * @see src/lib/sire/conversational-prompts.ts - System prompts y templates
 * @see src/components/Compliance/SireProgressBar.tsx - Componente visual de progreso
 */

import { useState, useCallback, useMemo } from 'react'
import {
  getNextFieldToAsk,
  validateField,
  isDataComplete,
  getMissingFields,
} from '@/lib/sire/progressive-disclosure'
import type { SIREConversationalData } from '@/lib/sire/conversational-prompts'
import type { ValidationResult } from '@/lib/sire/progressive-disclosure'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Valor de retorno del hook
 */
export interface UseSireProgressiveDisclosureReturn {
  sireData: Partial<SIREConversationalData>
  completedFields: string[]
  currentField: string | null
  errors: Record<string, string>
  updateField: (fieldName: string, value: string) => void
  setAllFields: (fields: Partial<SIREConversationalData>) => void
  validateCurrentField: (value: string) => ValidationResult
  isComplete: boolean
  missingFields: string[]
  reset: (keepAutoFilled?: Partial<SIREConversationalData>) => void
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook para manejo de progressive disclosure SIRE
 *
 * Este hook gestiona el estado completo de captura conversacional de datos SIRE:
 * - Determina qué campo preguntar según datos ya capturados
 * - Valida cada respuesta del usuario en tiempo real
 * - Normaliza valores (uppercasing, remover guiones, etc.)
 * - Tracking de campos completados para progress bar
 * - Detección de completitud de datos
 *
 * @returns Estado y funciones de control para progressive disclosure
 *
 * @example
 * ```tsx
 * const sireDisclosure = useSireProgressiveDisclosure()
 *
 * // Mostrar pregunta para campo actual
 * const question = getQuestionForField(sireDisclosure.currentField, { language: 'es' })
 *
 * // Validar respuesta del usuario
 * const validation = sireDisclosure.validateCurrentField(userInput)
 * if (validation.valid) {
 *   // Usar ?? para preservar string vacío '' (ej: second_surname skip)
 *   sireDisclosure.updateField(sireDisclosure.currentField, validation.normalized ?? userInput)
 * }
 *
 * // Progress bar
 * <SireProgressBar
 *   completedFields={sireDisclosure.completedFields}
 *   totalFields={13}
 *   currentField={sireDisclosure.currentField}
 * />
 * ```
 */
export function useSireProgressiveDisclosure(): UseSireProgressiveDisclosureReturn {
  // Estado de datos SIRE capturados
  const [sireData, setSireData] = useState<Partial<SIREConversationalData>>({})

  // Campos completados exitosamente
  const [completedFields, setCompletedFields] = useState<string[]>([])

  // Errores de validación por campo
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Determinar próximo campo a preguntar (memoizado para performance)
  const currentField = useMemo(() => {
    return getNextFieldToAsk(sireData)
  }, [sireData])

  // Determinar si datos están completos (memoizado)
  const isComplete = useMemo(() => {
    return isDataComplete(sireData)
  }, [sireData])

  // Obtener lista de campos faltantes (memoizado)
  const missingFields = useMemo(() => {
    return getMissingFields(sireData)
  }, [sireData])

  /**
   * Actualizar campo SIRE con validación
   *
   * Esta función:
   * 1. Valida el valor antes de guardar
   * 2. Guarda el valor normalizado si es válido
   * 3. Agrega el campo a completedFields
   * 4. Limpia errores previos del campo
   * 5. Guarda error si validación falla
   *
   * @param fieldName - Nombre del campo a actualizar
   * @param value - Valor a guardar
   *
   * @example
   * updateField('identification_number', 'AB-123456')
   * // Guarda: { identification_number: 'AB123456' } (normalizado)
   * // Agrega 'identification_number' a completedFields
   */
  const updateField = useCallback(
    (fieldName: string, value: string) => {
      // Validar antes de guardar (pasar currentData para context-aware validation)
      const validation = validateField(fieldName, value, sireData)

      if (validation.valid) {
        // Guardar valor normalizado (usar ?? para preservar string vacío '')
        setSireData((prev) => ({
          ...prev,
          [fieldName]: validation.normalized ?? value,
        }))

        // Agregar a completedFields si no existe
        if (!completedFields.includes(fieldName)) {
          setCompletedFields((prev) => [...prev, fieldName])
        }

        // Limpiar error si existía
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[fieldName]
          return newErrors
        })
      } else {
        // Guardar error
        setErrors((prev) => ({
          ...prev,
          [fieldName]: validation.error || 'Error de validación',
        }))
      }
    },
    [completedFields, sireData]
  )

  /**
   * Validar campo actual sin guardar
   *
   * Esta función permite validar la respuesta del usuario antes de
   * actualizar el estado. Útil para mostrar errores en tiempo real.
   *
   * @param value - Valor a validar
   * @returns Resultado de validación con error opcional y valor normalizado
   *
   * @example
   * const validation = validateCurrentField(userInput)
   * if (!validation.valid) {
   *   showError(validation.error)
   * }
   */
  const validateCurrentField = useCallback(
    (value: string): ValidationResult => {
      if (!currentField) {
        return {
          valid: false,
          error: 'No hay campo actual para validar',
        }
      }

      return validateField(currentField, value, sireData)
    },
    [currentField, sireData]
  )

  /**
   * Actualizar múltiples campos de una vez (evita issues de React batching)
   *
   * Usa esta función después de document upload para asegurar que
   * todos los campos se actualicen en un solo render cycle.
   *
   * @param fields - Objeto con los campos a actualizar
   *
   * @example
   * sireDisclosure.setAllFields({
   *   document_type_code: '3',
   *   identification_number: 'AB123456',
   *   first_surname: 'GARCIA',
   *   names: 'JUAN',
   *   nationality_code: '169',
   *   birth_date: '25/09/1982'
   * })
   */
  const setAllFields = useCallback((fields: Partial<SIREConversationalData>) => {
    setSireData(prev => ({
      ...prev,
      ...fields
    }))

    // Update completed fields list
    const newCompletedFields = Object.keys(fields).filter(key => {
      const value = fields[key as keyof SIREConversationalData]
      // Include field if it has a value OR if it's second_surname with empty string (skipped)
      return value !== undefined && value !== null && (value !== '' || key === 'second_surname')
    })

    setCompletedFields(prev => {
      const combined = new Set([...prev, ...newCompletedFields])
      return Array.from(combined)
    })

    // Clear errors for updated fields
    setErrors(prev => {
      const newErrors = { ...prev }
      Object.keys(fields).forEach(key => delete newErrors[key])
      return newErrors
    })
  }, [])

  /**
   * Reiniciar estado para registrar un nuevo huésped
   *
   * @param keepAutoFilled - Campos auto-llenados a preservar (hotel_code, city_code, movement_type, movement_date)
   *
   * @example
   * // Reset for new guest, keeping hotel/city info
   * sireDisclosure.reset({
   *   hotel_code: hotelCode,
   *   city_code: cityCode,
   *   movement_type: 'E',
   *   movement_date: checkInDate
   * })
   */
  const reset = useCallback((keepAutoFilled?: Partial<SIREConversationalData>) => {
    setSireData(keepAutoFilled || {})
    setCompletedFields([])
    setErrors({})
  }, [])

  return {
    sireData,
    completedFields,
    currentField,
    errors,
    updateField,
    setAllFields,
    validateCurrentField,
    isComplete,
    missingFields,
    reset,
  }
}
