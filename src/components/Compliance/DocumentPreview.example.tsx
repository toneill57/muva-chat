'use client';

import React, { useState } from 'react';
import { DocumentUpload, type UploadedFile } from './DocumentUpload';
import { DocumentPreview } from './DocumentPreview';
import type { FieldExtractionResult } from '@/lib/sire/field-extraction';

/**
 * DocumentPreview Component - Usage Example
 *
 * This file demonstrates the full workflow: Upload → Extract → Preview → Confirm
 * NOT FOR PRODUCTION - For testing and development reference only.
 */

/**
 * Full Workflow Example
 * Shows document upload, OCR extraction, and preview with editing
 */
export const FullWorkflowExample: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Mock extracted data for demonstration
  const mockExtractedData: FieldExtractionResult = {
    sireData: {
      nombres: 'JOHN MICHAEL',
      primer_apellido: 'SMITH',
      segundo_apellido: '',
      documento_numero: 'AB123456',
      codigo_nacionalidad: '249', // USA
      fecha_nacimiento: '15/03/1985',
      genero: 'M',
      tipo_documento: '3', // Passport
    },
    confidence: {
      nombres: 0.95,
      primer_apellido: 0.95,
      segundo_apellido: 0.85,
      documento_numero: 0.90,
      codigo_nacionalidad: 0.92,
      fecha_nacimiento: 0.88,
      genero: 0.95,
      tipo_documento: 0.95,
    },
    errors: [],
  };

  // Mock image URL (replace with actual uploaded image)
  const mockImageUrl = 'https://via.placeholder.com/800x500/4A90E2/FFFFFF?text=Passport+Image';

  const handleFilesSelected = (files: File[]) => {
    const newFiles = files.map(file => ({
      file,
      status: 'uploading' as const,
    }));
    setUploadedFiles([...uploadedFiles, ...newFiles]);

    // Simulate OCR processing
    setTimeout(() => {
      setUploadedFiles(prev =>
        prev.map(f => ({ ...f, status: 'success' as const }))
      );
      // Auto-open preview after successful upload
      setShowPreview(true);
    }, 1500);
  };

  const handleConfirm = (data: FieldExtractionResult) => {
    console.log('User confirmed data:', data);
    setShowPreview(false);
    alert('Data confirmed! In production, this would proceed to SIRE submission.');
  };

  const handleCancel = () => {
    setShowPreview(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">SIRE Document Processing</h2>
        <p className="text-gray-600">
          Upload a passport or cédula to extract SIRE data automatically
        </p>
      </div>

      {/* Step 1: Document Upload */}
      <DocumentUpload
        onFilesSelected={handleFilesSelected}
        onFileRemove={(index) => {
          setUploadedFiles(files => files.filter((_, i) => i !== index));
        }}
        uploadedFiles={uploadedFiles}
        maxFiles={1}
        isProcessing={uploadedFiles.some(f => f.status === 'uploading')}
      />

      {/* Step 2: Preview Button (after successful upload) */}
      {uploadedFiles.length > 0 && uploadedFiles[0].status === 'success' && !showPreview && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-900 mb-3">
            Document processed successfully! Review the extracted data.
          </p>
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Review Extracted Data
          </button>
        </div>
      )}

      {/* Step 3: Document Preview Modal */}
      {showPreview && (
        <DocumentPreview
          imageUrl={mockImageUrl}
          extractedData={mockExtractedData}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

/**
 * Preview with Low Confidence Example
 * Shows preview with fields that have low confidence scores
 */
export const LowConfidenceExample: React.FC = () => {
  const [showPreview, setShowPreview] = useState(false);

  // Mock data with low confidence scores
  const lowConfidenceData: FieldExtractionResult = {
    sireData: {
      nombres: 'MARIA',
      primer_apellido: 'GARCIA',
      segundo_apellido: 'LOPEZ',
      documento_numero: '12345678',
      codigo_nacionalidad: '169', // Colombia
      fecha_nacimiento: '20/08/1990',
      genero: 'F',
      tipo_documento: '5', // Cédula
    },
    confidence: {
      nombres: 0.85,
      primer_apellido: 0.65, // Low confidence
      segundo_apellido: 0.60, // Low confidence
      documento_numero: 0.72,
      codigo_nacionalidad: 0.95,
      fecha_nacimiento: 0.68, // Low confidence
      genero: 0.90,
      tipo_documento: 0.95,
    },
    errors: [
      'Low confidence in primer_apellido - please verify',
      'fecha_nacimiento may be incorrect due to poor image quality',
    ],
  };

  const mockImageUrl = 'https://via.placeholder.com/800x500/E94560/FFFFFF?text=Poor+Quality+Image';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Low Confidence Example</h2>
      <p className="text-gray-600 mb-6">
        This example shows how the preview handles low confidence scores and errors
      </p>

      <button
        onClick={() => setShowPreview(true)}
        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
      >
        Show Preview with Low Confidence
      </button>

      {showPreview && (
        <DocumentPreview
          imageUrl={mockImageUrl}
          extractedData={lowConfidenceData}
          onConfirm={(data) => {
            console.log('Confirmed despite low confidence:', data);
            setShowPreview(false);
          }}
          onCancel={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

/**
 * Preview with Missing Fields Example
 * Shows preview when some fields couldn't be extracted
 */
export const MissingFieldsExample: React.FC = () => {
  const [showPreview, setShowPreview] = useState(false);

  // Mock data with missing fields
  const missingFieldsData: FieldExtractionResult = {
    sireData: {
      nombres: 'CARLOS',
      primer_apellido: 'RODRIGUEZ',
      segundo_apellido: undefined, // Missing
      documento_numero: 'XY987654',
      codigo_nacionalidad: undefined, // Missing
      fecha_nacimiento: undefined, // Missing
      genero: 'M',
      tipo_documento: '3',
    },
    confidence: {
      nombres: 0.92,
      primer_apellido: 0.88,
      documento_numero: 0.85,
      genero: 0.90,
      tipo_documento: 0.95,
    },
    errors: [
      'codigo_nacionalidad not extracted from document',
      'fecha_nacimiento not extracted from document',
      'segundo_apellido not found (may be optional)',
    ],
  };

  const mockImageUrl = 'https://via.placeholder.com/800x500/9C27B0/FFFFFF?text=Partial+Data';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Missing Fields Example</h2>
      <p className="text-gray-600 mb-6">
        This example shows how the preview handles missing fields that need manual input
      </p>

      <button
        onClick={() => setShowPreview(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        Show Preview with Missing Fields
      </button>

      {showPreview && (
        <DocumentPreview
          imageUrl={mockImageUrl}
          extractedData={missingFieldsData}
          onConfirm={(data) => {
            console.log('User filled missing fields:', data);
            setShowPreview(false);
          }}
          onCancel={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

/**
 * All Examples Container
 */
export const AllPreviewExamples: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const examples = [
    { name: 'Full Workflow', component: <FullWorkflowExample /> },
    { name: 'Low Confidence', component: <LowConfidenceExample /> },
    { name: 'Missing Fields', component: <MissingFieldsExample /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      {/* Tabs */}
      <div className="max-w-6xl mx-auto mb-8 px-4">
        <div className="flex gap-2 overflow-x-auto bg-white p-2 rounded-lg shadow">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`
                px-4 py-2 rounded-lg whitespace-nowrap transition-colors
                ${
                  activeTab === index
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {example.name}
            </button>
          ))}
        </div>
      </div>

      {/* Active example */}
      <div className="bg-white rounded-lg shadow-lg">
        {examples[activeTab].component}
      </div>
    </div>
  );
};

export default AllPreviewExamples;
