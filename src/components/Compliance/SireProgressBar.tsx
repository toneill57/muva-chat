'use client';

import React from 'react';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Props for SireProgressBar component
 */
interface SireProgressBarProps {
  /** Array of completed field names */
  completedFields: string[];
  /** Total number of fields to complete (default: 6 - fields captured from guest) */
  totalFields?: number;
  /** Optional error messages keyed by field name */
  errors?: Record<string, string>;
}

/**
 * SIRE field labels mapping
 * Maps technical field names to user-friendly Spanish labels
 * Using same field names as progressive-disclosure.ts
 */
const FIELD_LABELS: Record<string, string> = {
  full_name: 'Nombre',
  document_number: 'Documento',
  nationality_text: 'Nacionalidad',
  birth_date: 'F. Nacimiento',
  origin_text: 'Procedencia',
  destination_text: 'Destino',
};

/**
 * SIRE field order (canonical order for display)
 * Only the 6 fields that need to be captured from guest
 */
const FIELD_ORDER = [
  'full_name',
  'document_number',
  'nationality_text',
  'birth_date',
  'origin_text',
  'destination_text',
];

/**
 * SireProgressBar Component
 *
 * Displays a visual progress indicator for SIRE compliance data collection.
 * Shows which of the 6 guest-captured fields have been completed, are pending, or have errors.
 *
 * Features:
 * - Animated progress bar with smooth transitions
 * - Color-coded field status indicators (green=complete, gray=pending, red=error)
 * - Responsive grid layout (2 cols mobile, 3 cols desktop)
 * - Mobile-first design with safe area support
 *
 * @example
 * ```tsx
 * <SireProgressBar
 *   completedFields={['document_number', 'full_name']}
 *   totalFields={6}
 *   errors={{ nationality_text: 'Invalid country code' }}
 * />
 * ```
 */
export const SireProgressBar: React.FC<SireProgressBarProps> = ({
  completedFields,
  totalFields = 6,
  errors = {},
}) => {
  const completedCount = completedFields.length;
  const progressPercentage = (completedCount / totalFields) * 100;

  /**
   * Determines field status (complete, error, pending)
   */
  const getFieldStatus = (fieldName: string): 'complete' | 'error' | 'pending' => {
    if (errors[fieldName]) return 'error';
    if (completedFields.includes(fieldName)) return 'complete';
    return 'pending';
  };

  /**
   * Returns status icon component based on field status
   */
  const getStatusIcon = (status: 'complete' | 'error' | 'pending') => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-600" aria-label="Completado" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" aria-label="Error" />;
      case 'pending':
        return <Circle className="w-4 h-4 text-gray-300" aria-label="Pendiente" />;
    }
  };

  /**
   * Returns text color classes based on field status
   */
  const getTextColor = (status: 'complete' | 'error' | 'pending') => {
    switch (status) {
      case 'complete':
        return 'text-green-900';
      case 'error':
        return 'text-red-900';
      case 'pending':
        return 'text-gray-400';
    }
  };

  return (
    <div
      className="w-full bg-white rounded-lg border border-gray-200 p-4 sm:p-6"
      role="region"
      aria-label="Progreso de registro SIRE"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900">
          Registro de Entrada - Colombia
        </h3>
        <span
          className="text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded"
          aria-label={`${completedCount} de ${totalFields} campos completados`}
        >
          {completedCount}/{totalFields}
        </span>
      </div>

      {/* Progress Bar */}
      <div
        className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-6"
        role="progressbar"
        aria-valuenow={progressPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Barra de progreso"
      >
        <motion.div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Fields Grid */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        role="list"
        aria-label="Lista de campos SIRE"
      >
        {FIELD_ORDER.map((fieldName) => {
          const status = getFieldStatus(fieldName);
          const label = FIELD_LABELS[fieldName] || fieldName;
          const error = errors[fieldName];

          return (
            <div
              key={fieldName}
              className="flex items-center gap-2"
              role="listitem"
              aria-label={`${label}: ${status === 'complete' ? 'completado' : status === 'error' ? 'con error' : 'pendiente'}`}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {getStatusIcon(status)}
              </div>

              {/* Field Label */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs sm:text-sm font-medium truncate ${getTextColor(status)}`}
                  title={error || label}
                >
                  {label}
                </p>
                {error && (
                  <p className="text-xs text-red-600 truncate" title={error}>
                    {error}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Status Message */}
      {completedCount === totalFields && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <p className="text-xs sm:text-sm text-green-800 text-center font-medium">
            ✓ Todos los campos completados. Listo para envío SIRE.
          </p>
        </motion.div>
      )}

      {/* Error Count (if any) */}
      {Object.keys(errors).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <p className="text-xs sm:text-sm text-red-800 text-center font-medium">
            {Object.keys(errors).length} campo{Object.keys(errors).length > 1 ? 's' : ''} con error{Object.keys(errors).length > 1 ? 'es' : ''}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default SireProgressBar;
