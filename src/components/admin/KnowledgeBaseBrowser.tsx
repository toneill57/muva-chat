'use client';

import { useState, useEffect } from 'react';
import { Search, File, Trash2, Eye, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface KnowledgeBaseBrowserProps {
  tenantId: string;
}

interface KnowledgeBaseFile {
  file_path: string;
  chunks: number;
  created_at: string;
  source: string;
}

interface APIResponse {
  success: boolean;
  files: KnowledgeBaseFile[];
  total_files: number;
  total_chunks: number;
  by_source?: {
    tenant_knowledge_embeddings: number;
    accommodation_units_public: number;
    policies: number;
  };
  error?: string;
  message?: string;
}

export function KnowledgeBaseBrowser({ tenantId }: KnowledgeBaseBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [bySource, setBySource] = useState<{
    tenant_knowledge_embeddings: number;
    accommodation_units_public: number;
    policies: number;
  } | null>(null);

  useEffect(() => {
    loadFiles();
  }, [tenantId]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/knowledge-base?tenant_id=${encodeURIComponent(tenantId)}`);
      const data: APIResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load documents');
      }

      setFiles(data.files || []);
      setTotalFiles(data.total_files || 0);
      setTotalChunks(data.total_chunks || 0);
      setBySource(data.by_source || null);
    } catch (err) {
      console.error('[KnowledgeBaseBrowser] Error loading files:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      setFiles([]);
      setTotalFiles(0);
      setTotalChunks(0);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filePath: string, chunks: number) => {
    // Confirmation dialog
    const confirmed = confirm(
      `Delete ${filePath}?\n\nThis will remove all ${chunks} chunk(s) from the knowledge base. This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch('/api/admin/knowledge-base', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          file_path: filePath,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete document');
      }

      // Success - reload files list
      await loadFiles();

      // Show success feedback
      alert(`Successfully deleted ${filePath} (${data.deleted_chunks} chunks removed)`);
    } catch (err) {
      console.error('[KnowledgeBaseBrowser] Error deleting file:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete document. Please try again.');
    }
  };

  const handlePreview = (filePath: string) => {
    // TODO: Implement preview modal with first few chunks
    alert(`Preview functionality for "${filePath}" coming soon!`);
  };

  // Extract just the filename from the file_path
  const getFileName = (filePath: string) => {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  };

  // Filter files based on search query
  const filteredFiles = files.filter(file =>
    file.file_path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading knowledge base...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-8 text-center border-red-200 bg-red-50">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
        <p className="text-red-800 text-lg font-medium mb-2">Error loading documents</p>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <Button onClick={loadFiles} variant="outline" size="sm">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="space-y-3">
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <span>
            <strong className="text-gray-900">{totalFiles}</strong> {totalFiles === 1 ? 'file' : 'files'}
          </span>
          <span>
            <strong className="text-gray-900">{totalChunks}</strong> {totalChunks === 1 ? 'chunk' : 'chunks'}
          </span>
        </div>

        {/* Stats by source */}
        {bySource && (
          <div className="flex items-center gap-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
            <span className="font-medium text-gray-700">By Source:</span>
            <span>
              <strong className="text-gray-900">{bySource.tenant_knowledge_embeddings}</strong> Knowledge Base
            </span>
            <span>
              <strong className="text-gray-900">{bySource.accommodation_units_public}</strong> Accommodations
            </span>
            <span>
              <strong className="text-gray-900">{bySource.policies}</strong> Policies
            </span>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search documents by filename..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          aria-label="Search documents"
        />
      </div>

      {/* Empty state */}
      {filteredFiles.length === 0 ? (
        <Card className="p-12 text-center">
          <File className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg mb-2">
            {searchQuery
              ? 'No documents found matching your search'
              : 'No documents in knowledge base yet'}
          </p>
          {!searchQuery && (
            <p className="text-gray-400 text-sm">
              Upload your first document using the &quot;Upload Documents&quot; tab
            </p>
          )}
        </Card>
      ) : (
        /* Files table */
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chunks
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFiles.map((file) => (
                <tr key={file.file_path} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <File className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {getFileName(file.file_path)}
                        </p>
                        <p className="text-xs text-gray-500 truncate" title={file.file_path}>
                          {file.file_path}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      file.source === 'accommodation_units_public'
                        ? 'bg-blue-100 text-blue-800'
                        : file.source === 'hotels.policies'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {file.source === 'accommodation_units_public'
                        ? 'Accommodation'
                        : file.source === 'hotels.policies'
                        ? 'Policy'
                        : 'Knowledge'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">{file.chunks}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {new Date(file.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(file.file_path)}
                        aria-label={`Preview ${getFileName(file.file_path)}`}
                        title="Preview document"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file.file_path, file.chunks)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        aria-label={`Delete ${getFileName(file.file_path)}`}
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
