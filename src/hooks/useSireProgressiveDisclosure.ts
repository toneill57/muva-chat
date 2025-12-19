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
  validateCurrentField: (value: string) => ValidationResult
  isComplete: boolean
  missingFields: string[]
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
      // Validar antes de guardar
      const validation = validateField(fieldName, value)

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
    [completedFields]
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

      return validateField(currentField, value)
    },
    [currentField]
  )

  return {
    sireData,
    completedFields,
    currentField,
    errors,
    updateField,
    validateCurrentField,
    isComplete,
    missingFields,
  }
}
