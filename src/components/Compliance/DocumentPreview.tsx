'use client';

import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Edit2, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FieldExtractionResult } from '@/lib/sire/field-extraction';

/**
 * Props for DocumentPreview modal
 */
export interface DocumentPreviewProps {
  /** URL of the document image */
  imageUrl: string;
  /** Extracted SIRE fields with confidence scores */
  extractedData: FieldExtractionResult;
  /** Callback when user confirms the extracted data */
  onConfirm: (data: FieldExtractionResult) => void;
  /** Callback when user cancels the preview */
  onCancel: () => void;
}

/**
 * Props for individual field row
 */
interface FieldRowProps {
  label: string;
  value: string | undefined;
  confidence: number | undefined;
  onEdit: (newValue: string) => void;
  helpText?: string;
}

/**
 * Get confidence color and label
 */
const getConfidenceInfo = (confidence?: number): {
  color: string;
  bgColor: string;
  label: string;
  icon: React.ReactNode;
} => {
  if (!confidence) {
    return {
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      label: 'Sin extraer',
      icon: <AlertCircle className="w-4 h-4 text-gray-600" />,
    };
  }

  if (confidence >= 0.9) {
    return {
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      label: 'Alta',
      icon: <CheckCircle className="w-4 h-4 text-green-700" />,
    };
  }

  if (confidence >= 0.7) {
    return {
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100',
      label: 'Media',
      icon: <AlertCircle className="w-4 h-4 text-yellow-700" />,
    };
  }

  return {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    label: 'Baja',
    icon: <AlertCircle className="w-4 h-4 text-red-700" />,
  };
};

/**
 * FieldRow Component
 * Displays a single SIRE field with confidence indicator and edit capability
 */
const FieldRow: React.FC<FieldRowProps> = ({ label, value, confidence, onEdit, helpText }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  const confidenceInfo = getConfidenceInfo(confidence);

  const handleSave = () => {
    onEdit(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
      {/* Label and Confidence Badge */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900">{label}</label>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${confidenceInfo.bgColor}`}>
          {confidenceInfo.icon}
          <span className={confidenceInfo.color}>{confidenceInfo.label}</span>
        </div>
      </div>

      {/* Value or Edit Input */}
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`Ingrese ${label.toLowerCase()}`}
            autoFocus
            aria-label={`Editar ${label}`}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Guardar cambios"
            >
              Guardar
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Cancelar edición"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className={`flex-1 text-sm ${value ? 'text-gray-900' : 'text-gray-400 italic'}`}>
            {value || 'No extraído'}
          </span>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`Editar ${label}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Help Text */}
      {helpText && !isEditing && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

/**
 * DocumentPreview Component
 *
 * Modal that displays the uploaded document image with extracted SIRE fields.
 * Allows users to review, edit, and confirm the extracted data before submission.
 *
 * Features:
 * - Image preview with zoom controls
 * - Color-coded confidence indicators per field
 * - Inline editing for all fields
 * - Warning/error display section
 * - Mobile-first responsive layout
 * - Full keyboard navigation support
 * - Accessibility compliant (ARIA labels, roles)
 *
 * @example
 * ```tsx
 * <DocumentPreview
 *   imageUrl="/uploads/passport-image.jpg"
 *   extractedData={{
 *     sireData: {
 *       nombres: "JOHN",
 *       primer_apellido: "SMITH",
 *       documento_numero: "AB123456",
 *       // ... other fields
 *     },
 *     confidence: {
 *       nombres: 0.95,
 *       primer_apellido: 0.95,
 *       documento_numero: 0.90,
 *       // ... other scores
 *     },
 *     errors: []
 *   }}
 *   onConfirm={(data) => {
 *     console.log('User confirmed:', data);
 *   }}
 *   onCancel={() => {
 *     console.log('User cancelled');
 *   }}
 * />
 * ```
 */
export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  imageUrl,
  extractedData,
  onConfirm,
  onCancel,
}) => {
  const [editedData, setEditedData] = useState(extractedData);
  const [isZoomed, setIsZoomed] = useState(false);

  /**
   * Handle field edit
   */
  const handleFieldEdit = (fieldName: keyof typeof editedData.sireData, newValue: string) => {
    setEditedData((prev) => ({
      ...prev,
      sireData: {
        ...prev.sireData,
        [fieldName]: newValue,
      },
      // Boost confidence to 1.0 for manually edited fields
      confidence: {
        ...prev.confidence,
        [fieldName]: 1.0,
      },
    }));
  };

  /**
   * Handle confirm button
   */
  const handleConfirm = () => {
    onConfirm(editedData);
  };

  /**
   * Handle escape key to close modal
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const hasErrors = editedData.errors.length > 0;
  const hasLowConfidence = Object.values(editedData.confidence).some((conf) => conf < 0.7);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onCancel}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-preview-title"
      >
        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
            <h2 id="document-preview-title" className="text-xl font-semibold text-gray-900">
              Revisar Datos Extraídos
            </h2>
            <button
              onClick={onCancel}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Image Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Documento</h3>
                  <button
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={isZoomed ? 'Reducir zoom' : 'Ampliar zoom'}
                  >
                    {isZoomed ? (
                      <>
                        <ZoomOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Reducir</span>
                      </>
                    ) : (
                      <>
                        <ZoomIn className="w-4 h-4" />
                        <span className="hidden sm:inline">Ampliar</span>
                      </>
                    )}
                  </button>
                </div>

                <div
                  className={`relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer transition-transform ${
                    isZoomed ? 'scale-105' : 'scale-100'
                  }`}
                  onClick={() => setIsZoomed(!isZoomed)}
                >
                  <img
                    src={imageUrl}
                    alt="Documento escaneado"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>

              {/* Right Column: Extracted Fields */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Datos SIRE Extraídos</h3>

                {/* Warnings Section */}
                {(hasErrors || hasLowConfidence) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-yellow-800 mb-2">
                          Atención Requerida
                        </h4>
                        <ul className="space-y-1 text-xs text-yellow-700">
                          {hasLowConfidence && (
                            <li>Algunos campos tienen baja confianza. Revisa y edita si es necesario.</li>
                          )}
                          {editedData.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Field List */}
                <div className="space-y-3">
                  <FieldRow
                    label="Nombres"
                    value={editedData.sireData.nombres}
                    confidence={editedData.confidence.nombres}
                    onEdit={(value) => handleFieldEdit('nombres', value)}
                    helpText="Nombres de pila (sin apellidos)"
                  />

                  <FieldRow
                    label="Primer Apellido"
                    value={editedData.sireData.primer_apellido}
                    confidence={editedData.confidence.primer_apellido}
                    onEdit={(value) => handleFieldEdit('primer_apellido', value)}
                  />

                  <FieldRow
                    label="Segundo Apellido"
                    value={editedData.sireData.segundo_apellido}
                    confidence={editedData.confidence.segundo_apellido}
                    onEdit={(value) => handleFieldEdit('segundo_apellido', value)}
                    helpText="Opcional - puede dejarse vacío"
                  />

                  <FieldRow
                    label="Número de Documento"
                    value={editedData.sireData.documento_numero}
                    confidence={editedData.confidence.documento_numero}
                    onEdit={(value) => handleFieldEdit('documento_numero', value)}
                    helpText="Formato alfanumérico, 6-15 caracteres"
                  />

                  <FieldRow
                    label="Nacionalidad (Código SIRE)"
                    value={editedData.sireData.codigo_nacionalidad}
                    confidence={editedData.confidence.codigo_nacionalidad}
                    onEdit={(value) => handleFieldEdit('codigo_nacionalidad', value)}
                    helpText="Código SIRE de país (ej: 249=USA, 169=Colombia)"
                  />

                  <FieldRow
                    label="Fecha de Nacimiento"
                    value={editedData.sireData.fecha_nacimiento}
                    confidence={editedData.confidence.fecha_nacimiento}
                    onEdit={(value) => handleFieldEdit('fecha_nacimiento', value)}
                    helpText="Formato: DD/MM/YYYY"
                  />

                  <FieldRow
                    label="Género"
                    value={editedData.sireData.genero}
                    confidence={editedData.confidence.genero}
                    onEdit={(value) => handleFieldEdit('genero', value)}
                    helpText="M o F"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Cancelar y volver"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Confirmar datos y continuar"
            >
              Confirmar y Continuar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DocumentPreview;
