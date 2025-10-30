'use client'

/**
 * Tenant Sign-Up Page
 *
 * Multi-step wizard for automated tenant onboarding:
 * 1. Información del Negocio (nombre, NIT, razón social)
 * 2. Subdomain & Branding
 * 3. Contacto (email, teléfono, dirección)
 * 4. Usuario Admin (username, password, nombre)
 * 5. Confirmación
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ============================================================================
// Types
// ============================================================================

interface FormData {
  // Step 1: Información del Negocio
  nombre_comercial: string
  nit: string
  razon_social: string
  tenant_type: 'hotel' | 'apartamentos' | 'hostal'

  // Step 2: Subdomain & Branding
  subdomain: string
  primary_color: string

  // Step 3: Contacto
  email: string
  phone: string
  address: string

  // Step 4: Usuario Admin
  admin_username: string
  admin_password: string
  admin_full_name: string
}

interface ValidationErrors {
  [key: string]: string
}

// ============================================================================
// Component
// ============================================================================

export default function SignupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    nombre_comercial: '',
    nit: '',
    razon_social: '',
    tenant_type: 'hotel',
    subdomain: '',
    primary_color: '#3B82F6',
    email: '',
    phone: '',
    address: '',
    admin_username: '',
    admin_password: '',
    admin_full_name: ''
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ========================================================================
  // Subdomain Availability Check (debounced)
  // ========================================================================

  useEffect(() => {
    if (!formData.subdomain || formData.subdomain.length < 3) {
      setSubdomainAvailable(null)
      return
    }

    const timer = setTimeout(async () => {
      setCheckingSubdomain(true)
      try {
        const res = await fetch(`/api/signup?subdomain=${encodeURIComponent(formData.subdomain)}`)
        const data = await res.json()
        setSubdomainAvailable(data.available)
      } catch (error) {
        console.error('Error checking subdomain:', error)
        setSubdomainAvailable(null)
      } finally {
        setCheckingSubdomain(false)
      }
    }, 500) // Debounce 500ms

    return () => clearTimeout(timer)
  }, [formData.subdomain])

  // ========================================================================
  // Form Handlers
  // ========================================================================

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {}

    if (step === 1) {
      if (!formData.nombre_comercial.trim()) newErrors.nombre_comercial = 'Requerido'
      if (!formData.nit.trim()) newErrors.nit = 'Requerido'
      if (!formData.razon_social.trim()) newErrors.razon_social = 'Requerido'
    }

    if (step === 2) {
      if (!formData.subdomain.trim()) {
        newErrors.subdomain = 'Requerido'
      } else if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
        newErrors.subdomain = 'Solo lowercase, números y guiones'
      } else if (subdomainAvailable === false) {
        newErrors.subdomain = 'Este subdomain no está disponible'
      }
    }

    if (step === 3) {
      if (!formData.email.trim()) {
        newErrors.email = 'Requerido'
      } else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.email)) {
        newErrors.email = 'Email inválido'
      }
      if (!formData.phone.trim()) newErrors.phone = 'Requerido'
      if (!formData.address.trim()) newErrors.address = 'Requerido'
    }

    if (step === 4) {
      if (!formData.admin_username.trim()) {
        newErrors.admin_username = 'Requerido'
      } else if (formData.admin_username.length < 4) {
        newErrors.admin_username = 'Mínimo 4 caracteres'
      } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.admin_username)) {
        newErrors.admin_username = 'Solo letras, números, guiones y underscores'
      }

      if (!formData.admin_password) {
        newErrors.admin_password = 'Requerido'
      } else if (formData.admin_password.length < 6) {
        newErrors.admin_password = 'Mínimo 6 caracteres'
      }

      if (!formData.admin_full_name.trim()) newErrors.admin_full_name = 'Requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5))
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setSubmitError(data.error || 'Error creando cuenta')
        if (data.details) {
          console.error('Signup errors:', data.details)
        }
        return
      }

      // Success! Redirect to success page or dashboard
      router.push(`/signup/success?subdomain=${data.subdomain}`)

    } catch (error: any) {
      console.error('Signup error:', error)
      setSubmitError('Error de conexión. Por favor intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // ========================================================================
  // Render Steps
  // ========================================================================

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Información del Negocio</h2>
            <p className="text-gray-600">Cuéntanos sobre tu hotel o alojamiento</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Comercial *
              </label>
              <input
                type="text"
                value={formData.nombre_comercial}
                onChange={(e) => handleChange('nombre_comercial', e.target.value)}
                placeholder="Hotel Paradise"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.nombre_comercial && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre_comercial}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NIT *
              </label>
              <input
                type="text"
                value={formData.nit}
                onChange={(e) => handleChange('nit', e.target.value)}
                placeholder="900123456-7"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.nit && (
                <p className="mt-1 text-sm text-red-600">{errors.nit}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Razón Social *
              </label>
              <input
                type="text"
                value={formData.razon_social}
                onChange={(e) => handleChange('razon_social', e.target.value)}
                placeholder="HOTEL PARADISE S.A.S."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.razon_social && (
                <p className="mt-1 text-sm text-red-600">{errors.razon_social}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Negocio
              </label>
              <select
                value={formData.tenant_type}
                onChange={(e) => handleChange('tenant_type', e.target.value as FormData['tenant_type'])}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="hotel">Hotel</option>
                <option value="apartamentos">Apartamentos</option>
                <option value="hostal">Hostal</option>
              </select>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Subdomain & Branding</h2>
            <p className="text-gray-600">Elige tu subdomain único</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subdomain * <span className="text-gray-500">(solo lowercase, números y guiones)</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={formData.subdomain}
                  onChange={(e) => handleChange('subdomain', e.target.value.toLowerCase())}
                  placeholder="hotel-paradise"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-gray-600">.muva.chat</span>
              </div>

              {/* Subdomain availability indicator */}
              {formData.subdomain && formData.subdomain.length >= 3 && (
                <div className="mt-2">
                  {checkingSubdomain && (
                    <p className="text-sm text-gray-500">Verificando disponibilidad...</p>
                  )}
                  {!checkingSubdomain && subdomainAvailable === true && (
                    <p className="text-sm text-green-600">✅ Subdomain disponible</p>
                  )}
                  {!checkingSubdomain && subdomainAvailable === false && (
                    <p className="text-sm text-red-600">❌ Subdomain no disponible</p>
                  )}
                </div>
              )}

              {errors.subdomain && (
                <p className="mt-1 text-sm text-red-600">{errors.subdomain}</p>
              )}

              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  Tu dashboard estará en: <strong>https://{formData.subdomain || 'tu-hotel'}.muva.chat</strong>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color Primario
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg w-32"
                />
                <span className="text-gray-600">Usado en botones y accents</span>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Información de Contacto</h2>
            <p className="text-gray-600">¿Cómo te podemos contactar?</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="admin@hotelparadise.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+573001234567"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección *
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Calle 1 #2-3, Santa Marta, Colombia"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address}</p>
              )}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Usuario Administrador</h2>
            <p className="text-gray-600">Crea tu cuenta de acceso al dashboard</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={formData.admin_full_name}
                onChange={(e) => handleChange('admin_full_name', e.target.value)}
                placeholder="Juan Pérez"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.admin_full_name && (
                <p className="mt-1 text-sm text-red-600">{errors.admin_full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username * <span className="text-gray-500">(mínimo 4 caracteres)</span>
              </label>
              <input
                type="text"
                value={formData.admin_username}
                onChange={(e) => handleChange('admin_username', e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.admin_username && (
                <p className="mt-1 text-sm text-red-600">{errors.admin_username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password * <span className="text-gray-500">(mínimo 6 caracteres)</span>
              </label>
              <input
                type="password"
                value={formData.admin_password}
                onChange={(e) => handleChange('admin_password', e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.admin_password && (
                <p className="mt-1 text-sm text-red-600">{errors.admin_password}</p>
              )}
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Confirmar Datos</h2>
            <p className="text-gray-600">Revisa que todo esté correcto antes de crear tu cuenta</p>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Negocio</h3>
                <p className="text-gray-700"><strong>Nombre:</strong> {formData.nombre_comercial}</p>
                <p className="text-gray-700"><strong>NIT:</strong> {formData.nit}</p>
                <p className="text-gray-700"><strong>Razón Social:</strong> {formData.razon_social}</p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Subdomain</h3>
                <p className="text-blue-600 font-mono">https://{formData.subdomain}.muva.chat</p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Contacto</h3>
                <p className="text-gray-700"><strong>Email:</strong> {formData.email}</p>
                <p className="text-gray-700"><strong>Teléfono:</strong> {formData.phone}</p>
                <p className="text-gray-700"><strong>Dirección:</strong> {formData.address}</p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Administrador</h3>
                <p className="text-gray-700"><strong>Nombre:</strong> {formData.admin_full_name}</p>
                <p className="text-gray-700"><strong>Username:</strong> {formData.admin_username}</p>
              </div>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{submitError}</p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Únete a MUVA</h1>
          <p className="text-gray-600">Crea tu cuenta y empieza a gestionar tu hotel en minutos</p>
        </div>

        {/* Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 5 && (
                  <div
                    className={`w-12 h-1 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Negocio</span>
            <span>Subdomain</span>
            <span>Contacto</span>
            <span>Admin</span>
            <span>Confirmar</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {renderStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Atrás
              </button>
            )}
            {currentStep < 5 && (
              <button
                onClick={handleNext}
                className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Siguiente
              </button>
            )}
            {currentStep === 5 && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="ml-auto px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {submitting ? 'Creando cuenta...' : '🎉 Crear Mi Cuenta'}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 mt-6">
          ¿Ya tienes cuenta?{' '}
          <a href="/login-legacy" className="text-blue-600 hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  )
}
