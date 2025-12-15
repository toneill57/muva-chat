/**
 * SireProgressBar - Usage Examples
 *
 * This file demonstrates how to use the SireProgressBar component
 * in different scenarios for SIRE compliance tracking.
 */

import { SireProgressBar } from './SireProgressBar';

// ============================================================================
// Example 1: Empty State (No fields completed)
// ============================================================================

export function EmptyStateExample() {
  return (
    <SireProgressBar
      completedFields={[]}
      totalFields={13}
    />
  );
}

// ============================================================================
// Example 2: Partial Progress (5 fields completed)
// ============================================================================

export function PartialProgressExample() {
  return (
    <SireProgressBar
      completedFields={[
        'documento_numero',
        'tipo_documento',
        'nombre_completo',
        'pais_nacionalidad',
        'fecha_nacimiento',
      ]}
      totalFields={13}
    />
  );
}

// ============================================================================
// Example 3: With Errors
// ============================================================================

export function WithErrorsExample() {
  return (
    <SireProgressBar
      completedFields={[
        'documento_numero',
        'tipo_documento',
        'nombre_completo',
        'pais_nacionalidad',
      ]}
      totalFields={13}
      errors={{
        fecha_nacimiento: 'Formato de fecha inválido',
        procedencia: 'País no encontrado en catálogo SIRE',
      }}
    />
  );
}

// ============================================================================
// Example 4: Complete State (All 13 fields)
// ============================================================================

export function CompleteStateExample() {
  return (
    <SireProgressBar
      completedFields={[
        'documento_numero',
        'tipo_documento',
        'nombre_completo',
        'pais_nacionalidad',
        'fecha_nacimiento',
        'procedencia',
        'destino',
        'codigo_hotel',
        'codigo_ciudad',
        'tipo_movimiento',
        'fecha_movimiento',
        'hora_movimiento',
        'pais_residencia',
      ]}
      totalFields={13}
    />
  );
}

// ============================================================================
// Example 5: Integration with Chat Flow
// ============================================================================

export function ChatIntegrationExample() {
  // Simulated state from conversational flow
  const completedFields = [
    'documento_numero',
    'tipo_documento',
    'nombre_completo',
    'pais_nacionalidad',
    'fecha_nacimiento',
    'procedencia',
  ];

  const errors = {
    procedencia: 'Por favor especifica ciudad o país',
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Registro de Entrada
        </h2>
        <p className="text-sm text-gray-600">
          Necesitamos algunos datos para tu registro SIRE
        </p>
      </div>

      <SireProgressBar
        completedFields={completedFields}
        totalFields={13}
        errors={errors}
      />

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900">
          Responde las preguntas en el chat y verás tu progreso aquí
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Example 6: Dynamic Update (Simulated conversation flow)
// ============================================================================

export function DynamicUpdateExample() {
  const [completedFields, setCompletedFields] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Simulate field completion every 2 seconds
  React.useEffect(() => {
    const fields = [
      'documento_numero',
      'tipo_documento',
      'nombre_completo',
      'pais_nacionalidad',
      'fecha_nacimiento',
      'procedencia',
      'destino',
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < fields.length) {
        setCompletedFields(prev => [...prev, fields[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Demo: Auto-complete simulation
      </h2>

      <SireProgressBar
        completedFields={completedFields}
        totalFields={13}
        errors={errors}
      />

      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
        Watch the progress bar animate as fields are completed
      </div>
    </div>
  );
}

// Note: Import React in actual usage
import React from 'react';
