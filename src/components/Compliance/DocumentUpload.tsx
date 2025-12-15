'use client';

import React, { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle, AlertCircle, File as FileIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Uploaded file with metadata
 */
export interface UploadedFile {
  file: File;
  preview?: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  documentType?: 'passport' | 'visa' | 'cedula' | 'unknown';
}

/**
 * Props for DocumentUpload component
 */
export interface DocumentUploadProps {
  /** Callback when files are selected/dropped */
  onFilesSelected: (files: File[]) => void;
  /** Callback when a file is removed */
  onFileRemove: (index: number) => void;
  /** Maximum number of files (default: 3) */
  maxFiles?: number;
  /** Maximum file size in bytes (default: 10MB) */
  maxSizeBytes?: number;
  /** Accepted file types (default: JPG, PNG, PDF, HEIC) */
  acceptedTypes?: string[];
  /** Whether files are currently being processed */
  isProcessing?: boolean;
  /** Array of uploaded files with their status */
  uploadedFiles?: UploadedFile[];
  /** Optional className for container styling */
  className?: string;
}

/**
 * ThumbnailPreview Component
 * Generates and displays preview for uploaded files
 */
const ThumbnailPreview: React.FC<{ file: File; preview?: string }> = ({ file, preview }) => {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(preview || null);

  React.useEffect(() => {
    // Use provided preview or generate new one
    if (preview) {
      setPreviewUrl(preview);
      return;
    }

    // Only generate preview for images
    if (!file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    return () => {
      if (previewUrl && !preview) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, preview]);

  // PDF icon
  if (file.type === 'application/pdf') {
    return (
      <div className="w-16 h-16 bg-red-50 rounded-lg flex items-center justify-center border border-red-200">
        <FileText className="w-8 h-8 text-red-600" />
      </div>
    );
  }

  // Generic file icon
  if (!previewUrl) {
    return (
      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
        <FileIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  // Image preview
  return (
    <img
      src={previewUrl}
      alt={file.name}
      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
    />
  );
};

/**
 * DocumentUpload Component
 *
 * Drag & drop file upload component for SIRE document processing.
 * Supports passport, visa, and cedula documents with OCR extraction.
 *
 * Features:
 * - Drag & drop with visual feedback
 * - Multiple file support (configurable max)
 * - File type validation (JPG, PNG, PDF, HEIC)
 * - File size validation (configurable max size)
 * - Thumbnail preview for images
 * - Status indicators (uploading, success, error)
 * - Error handling with user-friendly messages
 * - Mobile-first responsive design
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
 *
 * <DocumentUpload
 *   onFilesSelected={(files) => {
 *     const newFiles = files.map(file => ({
 *       file,
 *       status: 'success' as const,
 *     }));
 *     setUploadedFiles([...uploadedFiles, ...newFiles]);
 *   }}
 *   onFileRemove={(index) => {
 *     setUploadedFiles(files => files.filter((_, i) => i !== index));
 *   }}
 *   uploadedFiles={uploadedFiles}
 *   maxFiles={3}
 * />
 * ```
 */
export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onFilesSelected,
  onFileRemove,
  maxFiles = 3,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'application/pdf'],
  isProcessing = false,
  uploadedFiles = [],
  className = '',
}) => {
  const maxSizeMB = maxSizeBytes / 1024 / 1024;

  /**
   * Handle files dropped or selected
   */
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Check if we can accept more files
      if (uploadedFiles.length >= maxFiles) {
        return;
      }

      // Calculate how many files we can still accept
      const remainingSlots = maxFiles - uploadedFiles.length;
      const filesToAdd = acceptedFiles.slice(0, remainingSlots);

      if (filesToAdd.length > 0) {
        onFilesSelected(filesToAdd);
      }
    },
    [uploadedFiles.length, maxFiles, onFilesSelected]
  );

  /**
   * Configure dropzone
   */
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      const ext = type.split('/')[1];
      acc[type] = ext === 'jpeg' ? ['.jpg', '.jpeg'] : [`.${ext}`];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxSizeBytes,
    maxFiles: maxFiles - uploadedFiles.length,
    disabled: uploadedFiles.length >= maxFiles || isProcessing,
    multiple: maxFiles > 1,
  });

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  /**
   * Get document type label
   */
  const getDocumentTypeLabel = (type?: UploadedFile['documentType']): string => {
    switch (type) {
      case 'passport':
        return 'Pasaporte';
      case 'visa':
        return 'Visa';
      case 'cedula':
        return 'Cédula';
      default:
        return 'Documento';
    }
  };

  const canAcceptMore = uploadedFiles.length < maxFiles && !isProcessing;

  return (
    <div
      className={`w-full bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6 ${className}`}
      role="region"
      aria-label="Subir documentos SIRE"
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
          Subir Documentos
        </h3>
        <p className="text-sm text-gray-600">
          Sube pasaporte, visa o cédula para extracción automática de datos.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 sm:p-12
          transition-all duration-200
          ${
            isDragActive && !isDragReject
              ? 'border-blue-500 bg-blue-50 cursor-pointer'
              : isDragReject
              ? 'border-red-500 bg-red-50 cursor-not-allowed'
              : !canAcceptMore
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed opacity-60'
              : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
          }
        `}
        role="button"
        aria-label="Zona de arrastrar y soltar archivos"
        tabIndex={canAcceptMore ? 0 : -1}
        aria-disabled={!canAcceptMore}
      >
        <input {...getInputProps()} aria-label="Selector de archivos" />

        <div className="flex flex-col items-center justify-center text-center">
          <Upload
            className={`w-12 h-12 mb-4 transition-colors ${
              isDragActive && !isDragReject
                ? 'text-blue-500'
                : isDragReject
                ? 'text-red-500'
                : 'text-gray-400'
            }`}
            aria-hidden="true"
          />

          {isDragReject ? (
            <div>
              <p className="text-base sm:text-lg font-medium text-red-600 mb-2">
                Archivo no válido
              </p>
              <p className="text-xs sm:text-sm text-red-500">
                Verifica el tipo y tamaño del archivo
              </p>
            </div>
          ) : isDragActive ? (
            <p className="text-base sm:text-lg font-medium text-blue-600">
              Suelta los archivos aquí
            </p>
          ) : !canAcceptMore ? (
            <div>
              <p className="text-base sm:text-lg font-medium text-gray-500 mb-2">
                Máximo de archivos alcanzado
              </p>
              <p className="text-xs sm:text-sm text-gray-400">
                Elimina un archivo para agregar otro
              </p>
            </div>
          ) : (
            <>
              <p className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Arrastra archivos o haz clic para seleccionar
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                JPG, PNG, HEIC o PDF • Máximo {maxSizeMB}MB • Hasta {maxFiles} archivos
              </p>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Archivos seleccionados ({uploadedFiles.length}/{maxFiles})
            </h4>
            {isProcessing && (
              <span className="text-xs text-blue-600 flex items-center gap-1">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
                Procesando...
              </span>
            )}
          </div>

          <AnimatePresence>
            {uploadedFiles.map((uploadedFile, index) => (
              <motion.div
                key={`${uploadedFile.file.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-colors
                  ${
                    uploadedFile.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : uploadedFile.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-blue-50 border-blue-200'
                  }
                `}
              >
                {/* Thumbnail */}
                <ThumbnailPreview file={uploadedFile.file} preview={uploadedFile.preview} />

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadedFile.file.name}
                    </p>
                    {uploadedFile.documentType && uploadedFile.documentType !== 'unknown' && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {getDocumentTypeLabel(uploadedFile.documentType)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                  {uploadedFile.error && (
                    <p className="text-xs text-red-600 mt-1 flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{uploadedFile.error}</span>
                    </p>
                  )}
                </div>

                {/* Status Icon */}
                {uploadedFile.status === 'success' && (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" aria-label="Éxito" />
                )}
                {uploadedFile.status === 'uploading' && (
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" aria-label="Cargando" />
                )}
                {uploadedFile.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" aria-label="Error" />
                )}

                {/* Remove Button */}
                <button
                  onClick={() => onFileRemove(index)}
                  disabled={isProcessing}
                  className="p-1 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Eliminar ${uploadedFile.file.name}`}
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
