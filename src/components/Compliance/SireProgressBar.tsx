'use client';

import React from 'react';
import { CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react';

interface SireProgressBarProps {
  completedFields: string[];
  totalFields: number;
  currentField?: string;
  errors?: Record<string, string>;
}

// Labels legibles para cada campo SIRE (solo campos user-provided)
const FIELD_LABELS: Record<string, string> = {
  document_type_code: 'Tipo Doc.',        // 1. Primero
  identification_number: 'Documento',      // 2.
  first_surname: 'Apellido',              // 3.
  second_surname: 'Seg. Apellido',        // 4. (opcional)
  names: 'Nombres',                       // 5.
  nationality_code: 'Nacionalidad',       // 6.
  birth_date: 'F. Nacimiento',            // 7.
  origin_place: 'Procedencia',            // 8.
  destination_place: 'Destino'            // 9.
};

type FieldStatus = 'error' | 'current' | 'complete' | 'pending';

export function SireProgressBar({
  completedFields,
  totalFields,
  currentField,
  errors = {}
}: SireProgressBarProps) {
  // Filtrar solo campos que se muestran en el progress bar (excluir auto-filled)
  const visibleCompletedFields = completedFields.filter(field => field in FIELD_LABELS);

  const progress = Math.round((visibleCompletedFields.length / totalFields) * 100);

  // Función para determinar estado del campo
  const getFieldStatus = (field: string): FieldStatus => {
    if (errors[field]) return 'error';
    if (field === currentField) return 'current';
    if (completedFields.includes(field)) return 'complete';
    return 'pending';
  };

  // Estilos condicionales por estado
  const getFieldStyles = (status: FieldStatus): string => {
    const baseStyles = 'flex items-center gap-1.5 text-xs px-2 py-1.5 rounded transition-all duration-200';

    switch (status) {
      case 'complete':
        return `${baseStyles} bg-green-50`;
      case 'current':
        return `${baseStyles} bg-blue-50 ring-1 ring-blue-300`;
      case 'error':
        return `${baseStyles} bg-red-50`;
      default:
        return baseStyles;
    }
  };

  // Estilos de texto por estado
  const getTextStyles = (status: FieldStatus): string => {
    switch (status) {
      case 'error':
        return 'text-red-700 font-medium';
      case 'current':
        return 'text-blue-700 font-medium';
      case 'complete':
        return 'text-gray-700';
      default:
        return 'text-gray-400';
    }
  };

  // Renderizar icono según estado
  const renderIcon = (status: FieldStatus) => {
    const iconClasses = 'w-4 h-4 flex-shrink-0';

    switch (status) {
      case 'error':
        return <AlertCircle className={`${iconClasses} text-red-500`} />;
      case 'current':
        return <Loader2 className={`${iconClasses} text-blue-600 animate-spin`} />;
      case 'complete':
        return <CheckCircle2 className={`${iconClasses} text-green-600`} />;
      default:
        return <Circle className={`${iconClasses} text-gray-300`} />;
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Registro de Entrada - Colombia
        </h3>
        <span className="text-sm font-bold text-blue-600">
          {visibleCompletedFields.length}/{totalFields}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso del registro: ${progress}% completado`}
        />
      </div>

      {/* Percentage Badge */}
      <div className="flex justify-center mb-3">
        <span className="text-xs font-medium text-gray-600">
          {progress}% Completado
        </span>
      </div>

      {/* Field Status Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {Object.entries(FIELD_LABELS).map(([field, label]) => {
          const status = getFieldStatus(field);

          return (
            <div
              key={field}
              className={getFieldStyles(status)}
              role="status"
              aria-label={`${label}: ${status === 'complete' ? 'completado' : status === 'current' ? 'en progreso' : status === 'error' ? 'con error' : 'pendiente'}`}
            >
              {/* Icon según estado */}
              {renderIcon(status)}

              {/* Label */}
              <span className={`truncate ${getTextStyles(status)}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
