'use client'

import { useState } from 'react'

interface ValidationRule {
  regex?: RegExp
  min?: number
  max?: number
  errorMessage?: string
}

interface EditableFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  validation?: ValidationRule
  type?: 'text' | 'textarea' | 'select'
  options?: { label: string; value: string }[]
  placeholder?: string
  helpText?: string
  icon?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export default function EditableField({
  label,
  value,
  onChange,
  validation,
  type = 'text',
  options = [],
  placeholder = '',
  helpText = '',
  icon = '✏️',
  onMouseEnter,
  onMouseLeave,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = (val: string): boolean => {
    if (!validation) return true

    if (validation.regex && !validation.regex.test(val)) {
      setError(validation.errorMessage || 'Formato inválido')
      return false
    }

    if (validation.min && val.length < validation.min) {
      setError(`Mínimo ${validation.min} caracteres`)
      return false
    }

    if (validation.max && val.length > validation.max) {
      setError(`Máximo ${validation.max} caracteres`)
      return false
    }

    setError(null)
    return true
  }

  const handleChange = (val: string) => {
    onChange(val)
    validate(val)
  }

  const handleBlur = () => {
    setIsEditing(false)
  }

  return (
    <div
      className="space-y-2"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <label className="block text-sm font-medium text-gray-700">
        {label} {icon}
      </label>

      <div className="flex gap-2">
        {type === 'text' && (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={handleBlur}
            className={`flex-1 px-3 py-2 border rounded-md transition ${
              error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            } focus:outline-none focus:ring-2`}
            placeholder={placeholder}
          />
        )}

        {type === 'textarea' && (
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={handleBlur}
            className={`flex-1 px-3 py-2 border rounded-md transition ${
              error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            } focus:outline-none focus:ring-2`}
            placeholder={placeholder}
            rows={2}
            maxLength={validation?.max}
          />
        )}

        {type === 'select' && (
          <select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={handleBlur}
            className={`flex-1 px-3 py-2 border rounded-md transition ${
              error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            } focus:outline-none focus:ring-2`}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={() => setIsEditing(true)}
          className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition"
          aria-label={`Editar ${label}`}
        >
          Editar
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {helpText && !error && (
        <p className="text-xs text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  )
}
