'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import type { DocumentExtractionResult } from './types';

interface DocumentUploadProps {
  onUploadComplete: (result: DocumentExtractionResult) => void;
  onCancel?: () => void;
  maxSizeMB?: number;
  reservationId?: string;
}

export function DocumentUpload({
  onUploadComplete,
  onCancel,
  maxSizeMB = 10,
  reservationId
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);

    // Validar tamaño
    const invalidFiles = acceptedFiles.filter(
      file => file.size > maxSizeMB * 1024 * 1024
    );

    if (invalidFiles.length > 0) {
      setError(`Archivos demasiado grandes (máx ${maxSizeMB}MB)`);
      return;
    }

    setSelectedFiles(acceptedFiles);
  }, [maxSizeMB]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp']
    },
    maxFiles: 2, // Pasaporte + Visa
    multiple: true
  });

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simular progreso mientras se procesa
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const formData = new FormData();
      // Use 'files[]' as expected by the API endpoint
      selectedFiles.forEach(file => formData.append('files[]', file));

      // Build URL with reservation_id query param
      const url = reservationId
        ? `/api/sire/extract-document?reservation_id=${reservationId}`
        : '/api/sire/extract-document';

      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Error al procesar documento');
      }

      const result = await response.json();
      onUploadComplete(result);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Subir Documento de Identidad
        </h3>
        {onCancel && (
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Drag & Drop Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />

        {isDragActive ? (
          <p className="text-blue-600 font-medium">Suelta el archivo aquí...</p>
        ) : (
          <>
            <p className="text-gray-700 font-medium mb-2">
              Arrastra tu pasaporte o visa aquí
            </p>
            <p className="text-sm text-gray-500 mb-4">
              o haz clic para seleccionar (JPG, PNG - máx {maxSizeMB}MB)
            </p>
          </>
        )}
      </div>

      {/* Selected Files with Thumbnails */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <ThumbnailPreview file={file} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFiles(files => files.filter((_, i) => i !== idx));
                }}
                className="text-gray-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Procesando documento...</span>
            <span className="text-sm font-medium text-blue-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          {uploading ? 'Procesando...' : 'Extraer Datos'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={uploading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium
                       hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

// Thumbnail Preview Component
function ThumbnailPreview({ file }: { file: File }) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      return () => reader.abort();
    }
  }, [file]);

  if (file.type === 'application/pdf') {
    return (
      <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded border border-red-200">
        <FileText className="w-8 h-8 text-red-600" />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded border border-gray-200">
        <FileText className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={preview}
      alt="Preview"
      className="w-16 h-16 object-cover rounded border border-gray-200"
    />
  );
}

export default DocumentUpload;
