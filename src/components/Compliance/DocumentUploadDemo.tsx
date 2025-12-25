'use client';

import React, { useState } from 'react';
import { DocumentUpload } from './DocumentUpload';
import type { DocumentExtractionResult } from './types';

/**
 * Demo component to test DocumentUpload functionality
 *
 * Usage:
 * - Import in a page or component
 * - Shows example of how to integrate DocumentUpload
 * - Logs extraction results to console
 */
export function DocumentUploadDemo() {
  const [result, setResult] = useState<DocumentExtractionResult | null>(null);

  const handleUploadComplete = (extractionResult: DocumentExtractionResult) => {
    console.log('Document extraction result:', extractionResult);
    setResult(extractionResult);
  };

  const handleCancel = () => {
    console.log('Upload cancelled');
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Document Upload Demo
        </h1>

        <DocumentUpload
          onUploadComplete={handleUploadComplete}
          onCancel={handleCancel}
          maxSizeMB={10}
        />

        {/* Result Display */}
        {result && (
          <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Extraction Result
            </h2>
            <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Usage Instructions
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>- Drag and drop a passport or visa image (JPG, PNG, PDF)</li>
            <li>- Maximum file size: 10MB</li>
            <li>- Multiple files supported (up to 2)</li>
            <li>- Click "Extraer Datos" to process</li>
            <li>- Check browser console for detailed logs</li>
          </ul>
        </div>

        {/* API Notes */}
        <div className="mt-4 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            API Integration Notes
          </h3>
          <p className="text-sm text-yellow-800 mb-2">
            This component expects an API endpoint at:
          </p>
          <code className="block bg-yellow-100 p-2 rounded text-sm mb-2">
            POST /api/sire/extract-document
          </code>
          <p className="text-sm text-yellow-800">
            The endpoint should accept multipart/form-data with files and return:
          </p>
          <pre className="bg-yellow-100 p-2 rounded text-xs mt-2 overflow-x-auto">
{`{
  "success": boolean,
  "extractedFields": {
    "firstName": string,
    "lastName": string,
    "documentNumber": string,
    "nationality": string,
    "birthDate": string,
    "expiryDate": string,
    ...
  },
  "confidence": number, // 0-1
  "error"?: string
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default DocumentUploadDemo;
