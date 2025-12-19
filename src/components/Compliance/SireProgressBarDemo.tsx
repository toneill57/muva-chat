'use client';

import React, { useState, useEffect } from 'react';
import { SireProgressBar } from './SireProgressBar';

/**
 * DEMO COMPONENT - Para testing visual del SireProgressBar
 *
 * Este componente simula el progreso de captura de datos SIRE
 * mostrando los diferentes estados del progress bar.
 *
 * NO usar en producción - solo para desarrollo/testing
 */
export function SireProgressBarDemo() {
  const [scenario, setScenario] = useState<'initial' | 'progress' | 'error' | 'complete'>('initial');

  // Escenarios de demostración
  const scenarios = {
    initial: {
      completedFields: [],
      currentField: undefined,
      errors: {}
    },
    progress: {
      completedFields: [
        'hotel_code',
        'city_code',
        'document_type_code',
        'movement_type',
        'movement_date',
        'identification_number',
        'first_surname'
      ],
      currentField: 'names',
      errors: {}
    },
    error: {
      completedFields: [
        'hotel_code',
        'city_code',
        'document_type_code',
        'movement_type',
        'movement_date',
        'identification_number',
        'first_surname',
        'names'
      ],
      currentField: 'nationality_code',
      errors: {
        birth_date: 'Fecha de nacimiento inválida',
        origin_place: 'Procedencia requerida'
      }
    },
    complete: {
      completedFields: [
        'hotel_code',
        'city_code',
        'document_type_code',
        'movement_type',
        'movement_date',
        'identification_number',
        'first_surname',
        'second_surname',
        'names',
        'nationality_code',
        'birth_date',
        'origin_place',
        'destination_place'
      ],
      currentField: undefined,
      errors: {}
    }
  };

  const currentScenario = scenarios[scenario];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Demo: SIRE Progress Bar Component
        </h2>

        {/* Botones de control */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setScenario('initial')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              scenario === 'initial'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            0/13 - Inicio
          </button>

          <button
            onClick={() => setScenario('progress')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              scenario === 'progress'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            7/13 - En Progreso
          </button>

          <button
            onClick={() => setScenario('error')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              scenario === 'error'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            8/13 - Con Errores
          </button>

          <button
            onClick={() => setScenario('complete')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              scenario === 'complete'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            13/13 - Completo
          </button>
        </div>

        {/* Descripción del escenario actual */}
        <div className="bg-white border border-blue-200 rounded p-3 mb-4 text-sm">
          <p className="font-semibold text-blue-800 mb-1">
            Escenario: {scenario.charAt(0).toUpperCase() + scenario.slice(1)}
          </p>
          <p className="text-gray-600">
            {scenario === 'initial' && 'Sin campos completados. Estado inicial del registro.'}
            {scenario === 'progress' && '7 campos completados (5 auto-deducibles + 2 del usuario). Preguntando por "Nombres".'}
            {scenario === 'error' && '8 campos completados, pero hay 2 campos con errores de validación.'}
            {scenario === 'complete' && 'Todos los 13 campos completados. Registro listo para envío.'}
          </p>
        </div>
      </div>

      {/* Componente bajo prueba */}
      <SireProgressBar
        completedFields={currentScenario.completedFields}
        totalFields={13}
        currentField={currentScenario.currentField}
        errors={currentScenario.errors}
      />

      {/* Información de campos */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-2">
          Información de Campos (Debug)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-semibold text-gray-700 mb-1">
              Campos Completados ({currentScenario.completedFields.length}/13):
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-0.5">
              {currentScenario.completedFields.length === 0 ? (
                <li className="text-gray-400">Ninguno</li>
              ) : (
                currentScenario.completedFields.map(field => (
                  <li key={field}>{field}</li>
                ))
              )}
            </ul>
          </div>

          <div>
            <p className="font-semibold text-gray-700 mb-1">
              Campo Actual:
            </p>
            <p className="text-gray-600">
              {currentScenario.currentField || 'Ninguno'}
            </p>

            {Object.keys(currentScenario.errors).length > 0 && (
              <>
                <p className="font-semibold text-red-700 mb-1 mt-3">
                  Errores ({Object.keys(currentScenario.errors).length}):
                </p>
                <ul className="list-disc list-inside text-red-600 space-y-0.5">
                  {Object.entries(currentScenario.errors).map(([field, error]) => (
                    <li key={field}>
                      <strong>{field}:</strong> {error}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile responsive test info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-blue-800 mb-2">
          Responsive Design Test
        </h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Mobile (&lt;640px): Grid de 2 columnas</li>
          <li>• Tablet (640-768px): Grid de 3 columnas</li>
          <li>• Desktop (&gt;768px): Grid de 4 columnas</li>
          <li>• Resize la ventana para ver los cambios</li>
        </ul>
      </div>
    </div>
  );
}
