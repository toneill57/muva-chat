'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Phone, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import type { GuestLoginProps, FormState, ValidationError } from '@/lib/guest-chat-types'
import type { GuestSession } from '@/lib/guest-auth'

/**
 * GuestLogin Component
 *
 * Mobile-first authentication screen for guest users
 * Features: Date picker, phone input with mask, real-time validation, error handling
 */
export function GuestLogin({ tenantId, onLoginSuccess, onError }: GuestLoginProps) {
  const [formState, setFormState] = useState<FormState>({
    check_in_date: '',
    phone_last_4: '',
    errors: [],
    isValid: false,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Real-time validation
  useEffect(() => {
    const errors: ValidationError[] = []

    // Validate check-in date
    if (touched.check_in_date && formState.check_in_date) {
      const selectedDate = new Date(formState.check_in_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Allow dates from 30 days ago to any future date
      const minDate = new Date(today)
      minDate.setDate(minDate.getDate() - 30)

      // ⚠️ TEMPORAL: Validación de fecha futura deshabilitada para testing
      // const maxDate = new Date(today)
      // maxDate.setDate(maxDate.getDate() + 30)

      if (selectedDate < minDate) {
        errors.push({
          field: 'check_in_date',
          message: 'La fecha no puede ser anterior a 30 días atrás',
        })
      }
    } else if (touched.check_in_date && !formState.check_in_date) {
      errors.push({
        field: 'check_in_date',
        message: 'La fecha de check-in es requerida',
      })
    }

    // Validate phone last 4
    if (touched.phone_last_4 && formState.phone_last_4) {
      const phoneRegex = /^\d{4}$/
      if (!phoneRegex.test(formState.phone_last_4)) {
        errors.push({
          field: 'phone_last_4',
          message: 'Debe ingresar exactamente 4 dígitos',
        })
      }
    } else if (touched.phone_last_4 && !formState.phone_last_4) {
      errors.push({
        field: 'phone_last_4',
        message: 'Los últimos 4 dígitos son requeridos',
      })
    }

    const isValid =
      errors.length === 0 &&
      formState.check_in_date.length > 0 &&
      formState.phone_last_4.length === 4

    setFormState((prev) => ({
      ...prev,
      errors,
      isValid,
    }))
  }, [formState.check_in_date, formState.phone_last_4, touched])

  const handleInputChange = (field: keyof FormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }))
    setSubmitError(null)
  }

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    handleInputChange('phone_last_4', value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Mark all fields as touched
    setTouched({ check_in_date: true, phone_last_4: true })

    if (!formState.isValid) {
      return
    }

    setIsLoading(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/guest/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // CRITICAL: Allow browser to send/receive cookies
        body: JSON.stringify({
          tenant_id: tenantId,
          check_in_date: formState.check_in_date,
          phone_last_4: formState.phone_last_4,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión')
      }

      // Reconstruct GuestSession from response
      // Keep check_in/check_out as YYYY-MM-DD strings to match GuestSession interface
      const session: GuestSession = {
        reservation_id: data.reservation_id || '',
        tenant_id: tenantId,
        guest_name: data.guest_info.name,
        check_in: data.guest_info.check_in,    // Keep as YYYY-MM-DD string
        check_out: data.guest_info.check_out,  // Keep as YYYY-MM-DD string
        reservation_code: data.guest_info.reservation_code,
        accommodation_unit: data.guest_info.accommodation_unit,  // 🆕 NUEVO
        tenant_features: data.guest_info.tenant_features,         // 🆕 NUEVO
      }

      onLoginSuccess(session, data.token)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido'
      setSubmitError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getFieldError = (field: keyof FormState): string | undefined => {
    return formState.errors.find((e) => e.field === field)?.message
  }

  const formatPhoneDisplay = (value: string): string => {
    if (value.length === 0) return ''
    return `•••• ${value}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-blue-100">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold text-center text-blue-900">
            Bienvenido
          </CardTitle>
          <CardDescription className="text-center text-base">
            Ingresa tus datos para acceder al chat
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Check-in Date Input */}
            <div className="space-y-2">
              <label
                htmlFor="check_in_date"
                className="text-sm font-medium text-gray-700 flex items-center gap-2"
              >
                <Calendar className="h-4 w-4 text-blue-600" />
                Fecha de Check-in
              </label>
              <Input
                id="check_in_date"
                type="date"
                value={formState.check_in_date}
                onChange={(e) => handleInputChange('check_in_date', e.target.value)}
                onBlur={() => handleBlur('check_in_date')}
                className={`h-12 text-base ${
                  getFieldError('check_in_date')
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300'
                }`}
                disabled={isLoading}
                aria-label="Fecha de check-in"
                aria-invalid={!!getFieldError('check_in_date')}
                aria-describedby={
                  getFieldError('check_in_date') ? 'date-error' : undefined
                }
              />
              {getFieldError('check_in_date') && (
                <p
                  id="date-error"
                  className="text-sm text-red-600 flex items-center gap-1"
                  role="alert"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  {getFieldError('check_in_date')}
                </p>
              )}
            </div>

            {/* Phone Last 4 Input */}
            <div className="space-y-2">
              <label
                htmlFor="phone_last_4"
                className="text-sm font-medium text-gray-700 flex items-center gap-2"
              >
                <Phone className="h-4 w-4 text-blue-600" />
                Últimos 4 dígitos del teléfono
              </label>
              <div className="relative">
                <Input
                  id="phone_last_4"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  value={formState.phone_last_4}
                  onChange={handlePhoneInput}
                  onBlur={() => handleBlur('phone_last_4')}
                  placeholder="1234"
                  className={`h-12 text-base font-mono ${
                    getFieldError('phone_last_4')
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                  aria-label="Últimos 4 dígitos del teléfono"
                  aria-invalid={!!getFieldError('phone_last_4')}
                  aria-describedby={
                    getFieldError('phone_last_4') ? 'phone-error' : 'phone-hint'
                  }
                />
                {formState.phone_last_4 && !getFieldError('phone_last_4') && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </div>
              {getFieldError('phone_last_4') ? (
                <p
                  id="phone-error"
                  className="text-sm text-red-600 flex items-center gap-1"
                  role="alert"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  {getFieldError('phone_last_4')}
                </p>
              ) : (
                <p id="phone-hint" className="text-sm text-gray-500">
                  Solo los últimos 4 dígitos (ej: {formatPhoneDisplay(formState.phone_last_4 || '1234')})
                </p>
              )}
            </div>

            {/* Submit Error */}
            {submitError && (
              <div
                className="p-4 bg-red-50 border border-red-200 rounded-lg"
                role="alert"
              >
                <p className="text-sm text-red-800 font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {submitError}
                </p>
                {submitError.includes('no encontrada') && (
                  <ul className="mt-2 text-sm text-red-700 space-y-1 ml-6 list-disc">
                    <li>Verifica la fecha de check-in</li>
                    <li>Confirma los últimos 4 dígitos del teléfono</li>
                    <li>Asegúrate que la reserva esté activa</li>
                  </ul>
                )}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              disabled={!formState.isValid || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Necesitas ayuda? Contacta a recepción para obtener tus datos de acceso
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mobile responsive styles */}
      <style jsx global>{`
        @media (max-width: 640px) {
          .min-h-screen {
            padding: 1rem 0.75rem;
          }
        }

        /* Ensure mobile date/time pickers look good */
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          padding: 4px;
        }

        /* Touch target optimization for mobile */
        @media (max-width: 768px) {
          button,
          input {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  )
}
