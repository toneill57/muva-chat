'use client';

import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Edit2, ZoomIn, Save } from 'lucide-react';
import type { FieldExtractionResult } from '@/lib/sire/field-extraction';

interface DocumentPreviewProps {
  imageUrl: string;
  extractedData: FieldExtractionResult;
  onConfirm: (data: FieldExtractionResult) => void;
  onCancel: () => void;
}

export function DocumentPreview({
  imageUrl,
  extractedData,
  onConfirm,
  onCancel
}: DocumentPreviewProps) {
  const [editedData, setEditedData] = useState(extractedData);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleConfirm = () => {
    onConfirm(editedData);
  };

  const handleFieldEdit = (fieldKey: string, newValue: string) => {
    setEditedData(prev => ({
      ...prev,
      sireData: {
        ...prev.sireData,
        [fieldKey]: newValue
      }
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Documento Procesado</h2>
            <p className="text-sm text-gray-500 mt-1">
              Verifica la información extraída y edita si es necesario
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Image Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Imagen del Documento</h3>
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                  {isZoomed ? 'Reducir' : 'Ampliar'}
                </button>
              </div>
              <div
                className={`border border-gray-300 rounded-lg overflow-hidden cursor-pointer transition-all ${
                  isZoomed ? 'scale-105' : ''
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
              >
                <img
                  src={imageUrl}
                  alt="Documento"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Right Column - Extracted Fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Campos Extraídos</h3>

              <div className="space-y-3">
                <FieldRow
                  label="Nombres"
                  fieldKey="nombres"
                  value={editedData.sireData.nombres || ''}
                  confidence={editedData.confidence.nombre}
                  onEdit={handleFieldEdit}
                />

                <FieldRow
                  label="Primer Apellido"
                  fieldKey="primer_apellido"
                  value={editedData.sireData.primer_apellido || ''}
                  confidence={editedData.confidence.nombre}
                  onEdit={handleFieldEdit}
                />

                <FieldRow
                  label="Segundo Apellido"
                  fieldKey="segundo_apellido"
                  value={editedData.sireData.segundo_apellido || ''}
                  confidence={editedData.confidence.nombre}
                  onEdit={handleFieldEdit}
                  optional
                />

                <FieldRow
                  label="Número de Documento"
                  fieldKey="documento_numero"
                  value={editedData.sireData.documento_numero || ''}
                  confidence={editedData.confidence.documento}
                  onEdit={handleFieldEdit}
                />

                <FieldRow
                  label="Nacionalidad (código SIRE)"
                  fieldKey="codigo_nacionalidad"
                  value={editedData.sireData.codigo_nacionalidad || ''}
                  confidence={editedData.confidence.nacionalidad}
                  onEdit={handleFieldEdit}
                />

                <FieldRow
                  label="Fecha de Nacimiento"
                  fieldKey="fecha_nacimiento"
                  value={editedData.sireData.fecha_nacimiento || ''}
                  confidence={editedData.confidence.fecha_nacimiento}
                  onEdit={handleFieldEdit}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Errors Section */}
              {(editedData.errors.length > 0 || editedData.warnings.length > 0) && (
                <div className="mt-6 space-y-2">
                  {editedData.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-red-800 mb-1">Errores</h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            {editedData.errors.map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {editedData.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800 mb-1">Advertencias</h4>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            {editedData.warnings.map((warning, idx) => (
                              <li key={idx}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium
                       hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium
                       hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Confirmar y Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FIELD ROW COMPONENT
// ============================================================================

interface FieldRowProps {
  label: string;
  fieldKey: string;
  value: string;
  confidence?: number;
  onEdit: (fieldKey: string, value: string) => void;
  optional?: boolean;
  placeholder?: string;
}

function FieldRow({
  label,
  fieldKey,
  value,
  confidence = 0,
  onEdit,
  optional = false,
  placeholder
}: FieldRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onEdit(fieldKey, editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  // Confidence color coding
  const getConfidenceColor = () => {
    if (!confidence || confidence === 0) return 'text-gray-500 bg-gray-50';
    if (confidence >= 0.9) return 'text-green-600 bg-green-50';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceBorder = () => {
    if (!confidence || confidence === 0) return 'border-gray-200';
    if (confidence >= 0.9) return 'border-green-200';
    if (confidence >= 0.7) return 'border-yellow-200';
    return 'border-red-200';
  };

  return (
    <div className={`border rounded-lg p-3 ${getConfidenceBorder()}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {label}
              {optional && <span className="text-gray-400 text-xs ml-1">(opcional)</span>}
            </span>
            {confidence > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded ${getConfidenceColor()}`}>
                {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-700 p-1"
            aria-label={`Editar ${label}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg
                         hover:bg-blue-700 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg
                         hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className={`text-sm ${value ? 'text-gray-900' : 'text-gray-400 italic'}`}>
          {value || (optional ? 'No especificado' : 'No detectado')}
        </p>
      )}
    </div>
  );
}

export default DocumentPreview;
