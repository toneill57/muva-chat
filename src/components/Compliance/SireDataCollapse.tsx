'use client'

import { useState } from 'react'

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

interface SireDataCollapseProps {
  sireData: SireData
  highlightedFields?: string[]
  onFieldHover?: (fieldName: string) => void
  conversationalPaisTex?: string
}

const tipoDocumentoMap: Record<string, string> = {
  '3': 'Pasaporte',
  '5': 'Cédula de extranjería',
  '46': 'Carné diplomático',
  '10': 'Documento extranjero',
}

export default function SireDataCollapse({
  sireData,
  highlightedFields = [],
  onFieldHover,
  conversationalPaisTex = '',
}: SireDataCollapseProps) {
  const [showDetails, setShowDetails] = useState(false)

  const isHighlighted = (fieldName: string) => highlightedFields.includes(fieldName)

  const FieldDisplay = ({
    label,
    value,
    fieldName,
  }: {
    label: string
    value: string
    fieldName: string
  }) => (
    <div
      onMouseEnter={() => onFieldHover?.(fieldName)}
      onMouseLeave={() => onFieldHover?.('')}
    >
      <label className="text-xs text-gray-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value || '(vacío)'}
          disabled
          className={`w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded transition ${
            isHighlighted(fieldName) ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''
          }`}
          aria-label={`${label}: ${value}`}
        />
        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded whitespace-nowrap">
          auto 🤖
        </span>
      </div>
    </div>
  )

  return (
    <div className="mt-6 space-y-4">
      {/* Collapse trigger */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
        aria-expanded={showDetails}
        aria-controls="sire-details"
      >
        <span className="text-sm font-medium text-gray-700">
          {showDetails ? '▼' : '▶'} Ver detalles técnicos SIRE (generados automáticamente)
        </span>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          13 campos oficiales
        </span>
      </button>

      {/* Collapse content */}
      {showDetails && (
        <div
          id="sire-details"
          className="p-6 bg-gray-50 rounded-lg space-y-4 border-l-4 border-blue-500"
          role="region"
          aria-label="Detalles técnicos SIRE"
        >
          <p className="text-xs text-gray-600 mb-4">
            ℹ️ Estos datos se generan automáticamente basados en tu información conversacional.
            No son editables directamente.
          </p>

          {/* Grupo: Identidad */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Identidad</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldDisplay
                label="Primer apellido"
                value={sireData.primer_apellido}
                fieldName="primer_apellido"
              />
              <FieldDisplay
                label="Segundo apellido"
                value={sireData.segundo_apellido}
                fieldName="segundo_apellido"
              />
              <FieldDisplay
                label="Nombre"
                value={sireData.nombre_extranjero}
                fieldName="nombre_extranjero"
              />
            </div>
          </div>

          {/* Grupo: Documento */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Documento</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Tipo documento</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`${sireData.tipo_documento} (${
                      tipoDocumentoMap[sireData.tipo_documento] || 'Desconocido'
                    })`}
                    disabled
                    className={`w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded transition ${
                      isHighlighted('tipo_documento') ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''
                    }`}
                  />
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded whitespace-nowrap">
                    auto 🤖
                  </span>
                </div>
              </div>
              <FieldDisplay
                label="Número documento"
                value={sireData.numero_identificacion}
                fieldName="numero_identificacion"
              />
              <FieldDisplay
                label="Fecha expedición"
                value={sireData.fecha_expedicion_documento}
                fieldName="fecha_expedicion_documento"
              />
            </div>
          </div>

          {/* Grupo: Nacionalidad */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Nacionalidad</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Código país</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`${sireData.codigo_pais}${
                      conversationalPaisTex ? ` (${conversationalPaisTex})` : ''
                    }`}
                    disabled
                    className={`w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded transition ${
                      isHighlighted('codigo_pais') ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''
                    }`}
                  />
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded whitespace-nowrap">
                    auto 🤖
                  </span>
                </div>
              </div>
              <FieldDisplay
                label="Código nacionalidad"
                value={sireData.codigo_nacionalidad}
                fieldName="codigo_nacionalidad"
              />
            </div>
          </div>

          {/* Grupo: Hotel/Ubicación */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Hotel/Ubicación</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldDisplay
                label="Código hotel"
                value={sireData.codigo_hotel}
                fieldName="codigo_hotel"
              />
              <FieldDisplay
                label="Nombre hotel"
                value={sireData.nombre_hotel}
                fieldName="nombre_hotel"
              />
              <FieldDisplay
                label="Código ciudad"
                value={sireData.codigo_ciudad}
                fieldName="codigo_ciudad"
              />
            </div>
          </div>

          {/* Grupo: Fechas y Movimiento */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">
              Fechas y Movimiento
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldDisplay
                label="Fecha nacimiento"
                value={sireData.fecha_nacimiento}
                fieldName="fecha_nacimiento"
              />
              <div>
                <label className="text-xs text-gray-600">Tipo movimiento</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`${sireData.tipo_movimiento} (${
                      sireData.tipo_movimiento === 'E' ? 'Entrada' : 'Salida'
                    })`}
                    disabled
                    className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
                  />
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded whitespace-nowrap">
                    auto 🤖
                  </span>
                </div>
              </div>
              <FieldDisplay
                label="Fecha movimiento"
                value={sireData.fecha_movimiento}
                fieldName="fecha_movimiento"
              />
              <FieldDisplay
                label="Lugar procedencia"
                value={sireData.lugar_procedencia}
                fieldName="lugar_procedencia"
              />
              <FieldDisplay
                label="Lugar destino"
                value={sireData.lugar_destino}
                fieldName="lugar_destino"
              />
              <FieldDisplay
                label="Ciudad residencia"
                value={sireData.codigo_ciudad_residencia}
                fieldName="codigo_ciudad_residencia"
              />
            </div>
          </div>

          {/* Grupo: Ocupación */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Ocupación</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Código ocupación</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`${sireData.codigo_ocupacion} (No especificado)`}
                    disabled
                    className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
                  />
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded whitespace-nowrap">
                    auto 🤖
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Info footer */}
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-800">
              💡 <strong>Mapeo automático:</strong> Si corriges tu nombre completo arriba, los
              apellidos y nombre se actualizarán automáticamente aquí.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
