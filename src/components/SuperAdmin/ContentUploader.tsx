'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload,
  File,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FileItem, FileStatus } from '@/types/super-admin';

export function ContentUploader() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('actividades');
  const { toast } = useToast();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/markdown': ['.md'] },
    multiple: true,
    onDrop: (acceptedFiles) => {
      const newFiles = acceptedFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending' as FileStatus,
        error: null
      }));
      setFiles(prev => [...prev, ...newFiles]);
    },
    onDropRejected: () => {
      toast({
        title: 'Invalid files',
        description: 'Only .md files are allowed',
        variant: 'destructive'
      });
    }
  });

  const updateFileStatus = (
    fileName: string,
    status: FileStatus,
    progress: number = 0,
    error: string | null = null,
    embeddingsCount?: number
  ) => {
    setFiles(prev => prev.map(f =>
      f.file.name === fileName
        ? { ...f, status, progress, error, embeddingsCount }
        : f
    ));
  };

  const uploadFile = async (fileItem: FileItem) => {
    const { file } = fileItem;

    updateFileStatus(file.name, 'uploading', 10);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', selectedCategory);

    try {
      updateFileStatus(file.name, 'uploading', 30);

      const token = localStorage.getItem('super_admin_token');
      const response = await fetch('/api/super-admin/content/upload', {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData
      });

      updateFileStatus(file.name, 'processing', 60);

      const result = await response.json();

      if (response.ok && result.success) {
        updateFileStatus(
          file.name,
          'completed',
          100,
          null,
          result.embeddings
        );
        toast({
          title: 'Upload successful',
          description: `${file.name} processed with ${result.embeddings} embeddings`
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateFileStatus(file.name, 'error', 0, errorMessage);
      toast({
        title: 'Upload failed',
        description: `${file.name}: ${errorMessage}`,
        variant: 'destructive'
      });
    }
  };

  const uploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');

    for (const fileItem of pendingFiles) {
      await uploadFile(fileItem);
    }
  };

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.file.name !== fileName));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const getStatusBadge = (status: FileStatus) => {
    const variants: Record<FileStatus, { variant: 'default' | 'secondary' | 'destructive'; label: string; icon: React.ComponentType<{ className?: string }> }> = {
      pending: { variant: 'secondary', label: 'Pending', icon: File },
      uploading: { variant: 'default', label: 'Uploading', icon: Loader2 },
      processing: { variant: 'default', label: 'Processing', icon: Loader2 },
      completed: { variant: 'default', label: 'Completed', icon: CheckCircle2 },
      error: { variant: 'destructive', label: 'Error', icon: AlertCircle }
    };

    const { variant, label, icon: Icon } = variants[status];

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className={`h-3 w-3 ${status === 'uploading' || status === 'processing' ? 'animate-spin' : ''}`} />
        {label}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const completedCount = files.filter(f => f.status === 'completed').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload MUVA Content</CardTitle>
        <CardDescription>
          Drag & drop .md files to upload tourism content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Category:</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actividades">Actividades</SelectItem>
              <SelectItem value="accommodations">Accommodations</SelectItem>
              <SelectItem value="restaurants">Restaurants</SelectItem>
              <SelectItem value="rentals">Rentals</SelectItem>
              <SelectItem value="spots">Spots</SelectItem>
              <SelectItem value="culture">Culture</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors
            ${isDragActive
              ? 'border-teal-600 bg-teal-50 dark:bg-teal-950'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-teal-600 font-medium">Drop files here...</p>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Drag & drop .md files here, or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Only markdown (.md) files are accepted
              </p>
            </>
          )}
        </div>

        {/* Files Preview */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Files ({files.length}) - {completedCount} completed
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
              >
                Clear All
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {files.map((fileItem, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {fileItem.file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(fileItem.file.size)}
                        </span>
                        {fileItem.embeddingsCount !== undefined && (
                          <span className="text-xs text-teal-600">
                            {fileItem.embeddingsCount} embeddings
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(fileItem.status)}
                      {fileItem.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileItem.file.name)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(fileItem.status === 'uploading' || fileItem.status === 'processing') && (
                    <Progress value={fileItem.progress} className="h-2" />
                  )}

                  {/* Error Message */}
                  {fileItem.error && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {fileItem.error}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Upload Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={uploadAll}
                disabled={pendingCount === 0}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload All ({pendingCount})
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
