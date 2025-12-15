'use client';

import React, { useState } from 'react';
import { DocumentUpload, type UploadedFile } from './DocumentUpload';

/**
 * DocumentUpload Component - Usage Example
 *
 * This file demonstrates basic usage for the DocumentUpload component.
 * NOT FOR PRODUCTION - For testing and development reference only.
 */

/**
 * Basic Usage Example
 * Simple integration with file upload and status tracking
 */
export const BasicExample: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Document Upload Example</h2>

      <DocumentUpload
        onFilesSelected={(files) => {
          const newFiles = files.map(file => ({
            file,
            status: 'success' as const,
          }));
          setUploadedFiles([...uploadedFiles, ...newFiles]);
        }}
        onFileRemove={(index) => {
          setUploadedFiles(files => files.filter((_, i) => i !== index));
        }}
        uploadedFiles={uploadedFiles}
        maxFiles={3}
      />

      {uploadedFiles.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Uploaded Files:</h3>
          <ul className="space-y-1">
            {uploadedFiles.map((f, idx) => (
              <li key={idx} className="text-sm">
                {f.file.name} ({f.status})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BasicExample;
