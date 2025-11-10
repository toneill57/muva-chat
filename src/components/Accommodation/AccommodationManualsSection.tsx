'use client'

import { useState, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileText, Loader2, Plus, Eye, Trash2, AlertCircle, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import useSWR from 'swr' // P3.3: SWR for caching
import { logManualEvent } from '@/lib/manual-analytics' // P4.3: Analytics tracking

interface Manual {
  id: string
  filename: string
  chunk_count: number
  created_at: string
  file_size_bytes?: number
}

interface AccommodationManualsSectionProps {
  unitId: string
  tenantId: string
  onViewContent: (manualId: string) => void
}

export function AccommodationManualsSection({
  unitId,
  tenantId,
  onViewContent
}: AccommodationManualsSectionProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // P3.3: SWR fetcher function
  const fetcher = async (url: string) => {
    const token = localStorage.getItem('staff_token')
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    // 404 is OK - means no manuals yet (empty state)
    if (response.status === 404) {
      return []
    }

    if (!response.ok) {
      throw new Error('Failed to fetch manuals')
    }

    const data = await response.json()
    return data.success ? (data.data || []) : []
  }

  // P3.3: Use SWR for caching and automatic revalidation
  const {
    data: manuals = [],
    error: swrError,
    isLoading,
    mutate
  } = useSWR<Manual[]>(
    `/api/accommodation-manuals/${unitId}`,
    fetcher,
    {
      revalidateOnFocus: false, // No revalidar cuando usuario vuelve a la ventana
      revalidateOnReconnect: true, // Revalidar si se reconecta internet
      refreshInterval: 60000, // Revalidar cada 60 segundos
      dedupingInterval: 5000, // Deduplicar requests en 5 segundos
      shouldRetryOnError: true,
      errorRetryCount: 3
    }
  )

  // State
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // P2.1: Search/Filter
  const [searchQuery, setSearchQuery] = useState('')

  // P2.2: Bulk Delete
  const [selectedManuals, setSelectedManuals] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // P3.2: Rate Limiting
  const [uploadCooldown, setUploadCooldown] = useState(false)

  // Convert SWR error to local error state
  useEffect(() => {
    if (swrError) {
      setError('Failed to load manuals')
    }
  }, [swrError])

  const handleFileDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      toast({
        title: 'No file selected',
        description: 'Please select a valid .md file',
        variant: 'destructive'
      })
      return
    }

    // P3.2: Rate Limiting - Prevent spam uploads
    if (uploadCooldown) {
      toast({
        title: 'Por favor espera',
        description: 'Espera unos segundos antes de subir otro manual',
        variant: 'destructive'
      })
      return
    }

    const file = acceptedFiles[0]

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive'
      })
      return
    }

    // P2.3: Manual Versioning - Check if filename exists
    const existingManual = manuals.find(m => m.filename === file.name)
    if (existingManual) {
      const confirmReplace = window.confirm(
        `Ya existe un manual con el nombre "${file.name}".\n\n¿Deseas reemplazarlo? El anterior será eliminado permanentemente.`
      )
      if (!confirmReplace) return

      // Delete existing manual first
      try {
        const token = localStorage.getItem('staff_token')
        await fetch(`/api/accommodation-manuals/${unitId}/${existingManual.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      } catch (err) {
        console.error('Error deleting existing manual:', err)
        toast({
          title: 'Error',
          description: 'Failed to delete existing manual',
          variant: 'destructive'
        })
        return
      }
    }

    // P3.2: Activate rate limiting cooldown
    setUploadCooldown(true)

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Simulate progress (real upload happens instantly)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      const token = localStorage.getItem('staff_token')
      const response = await fetch(`/api/accommodation-manuals/${unitId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await response.json()

      toast({
        title: 'Manual uploaded',
        description: `${file.name} processed successfully with ${data.chunk_count || 0} chunks`
      })

      // P4.3: Log upload event
      logManualEvent({
        manualId: data.manual_id || null,
        tenantId,
        unitId,
        eventType: 'upload',
        metadata: { filename: file.name, chunk_count: data.chunk_count || 0 }
      })

      // P3.3: Revalidate SWR cache
      await mutate()

    } catch (err) {
      console.error('Upload error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload manual'
      setError(errorMessage)
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)

      // P3.2: Reset cooldown after 3 seconds
      setTimeout(() => {
        setUploadCooldown(false)
      }, 3000)
    }
  }

  const handleDelete = async (manualId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return
    }

    try {
      const token = localStorage.getItem('staff_token')
      const response = await fetch(`/api/accommodation-manuals/${unitId}/${manualId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Delete failed')
      }

      toast({
        title: 'Manual deleted',
        description: `${filename} has been removed`
      })

      // P4.3: Log delete event
      logManualEvent({
        manualId,
        tenantId,
        unitId,
        eventType: 'delete',
        metadata: { filename }
      })

      // P3.3: Revalidate SWR cache
      await mutate()

    } catch (err) {
      console.error('Delete error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete manual'
      setError(errorMessage)
      toast({
        title: 'Delete failed',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  // P2.2: Bulk Delete Handler
  const handleBulkDelete = async () => {
    if (selectedManuals.length === 0) return

    // Confirmación reforzada: usuario debe escribir "ELIMINAR"
    const confirmMessage = `¿Estás seguro de eliminar ${selectedManuals.length} manuales?\n\nEsta acción NO se puede deshacer.\n\nEscribe "ELIMINAR" para confirmar:`
    const userInput = window.prompt(confirmMessage)

    if (userInput !== 'ELIMINAR') {
      toast({
        title: 'Cancelado',
        description: 'No se eliminaron los manuales'
      })
      return
    }

    setIsBulkDeleting(true)
    setError(null)

    try {
      const token = localStorage.getItem('staff_token')
      let deletedCount = 0
      const errors: string[] = []

      for (const manualId of selectedManuals) {
        try {
          const response = await fetch(`/api/accommodation-manuals/${unitId}/${manualId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            const data = await response.json()
            errors.push(data.error || 'Delete failed')
          } else {
            deletedCount++
          }
        } catch (err) {
          console.error('Delete error:', err)
          errors.push(err instanceof Error ? err.message : 'Unknown error')
        }
      }

      // Clear selection
      setSelectedManuals([])

      // P3.3: Revalidate SWR cache
      await mutate()

      if (errors.length > 0) {
        toast({
          title: 'Eliminación parcial',
          description: `${deletedCount} manuales eliminados, ${errors.length} errores`,
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Manuales eliminados',
          description: `${deletedCount} manuales eliminados exitosamente`
        })
      }

    } catch (err) {
      console.error('Bulk delete error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete manuals'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsBulkDeleting(false)
    }
  }

  // P2.2: Toggle manual selection
  const toggleManualSelection = (manualId: string) => {
    setSelectedManuals(prev =>
      prev.includes(manualId)
        ? prev.filter(id => id !== manualId)
        : [...prev, manualId]
    )
  }

  // P2.2: Select/Deselect all
  const selectAllManuals = () => {
    setSelectedManuals(filteredManuals.map(m => m.id))
  }

  const deselectAllManuals = () => {
    setSelectedManuals([])
  }

  // P2.1: Filtered manuals based on search query
  const filteredManuals = manuals.filter(m =>
    m.filename.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/markdown': ['.md']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: handleFileDrop,
    disabled: isUploading || uploadCooldown, // P3.2: Disable during cooldown
    multiple: false
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="border-t pt-3">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t pt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900 flex items-center">
          <FileText className="h-4 w-4 mr-1" />
          Manuals ({manuals.length})
        </h4>
        {manuals.length > 0 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-blue-600 hover:text-blue-700 transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            disabled={isUploading}
            aria-label="Upload another manual"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-800">{error}</p>
        </div>
      )}

      {/* Estado 1: Empty (sin manuales) */}
      {manuals.length === 0 && !isUploading && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            uploadCooldown
              ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
              : isDragActive
                ? 'border-blue-500 bg-blue-50 cursor-pointer'
                : 'border-gray-300 hover:border-gray-400 bg-gray-50 cursor-pointer'
          }`}
        >
          <input {...getInputProps()} />
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 font-medium">
            {uploadCooldown
              ? 'Esperando...'
              : isDragActive
                ? 'Drop file here'
                : 'Drag & drop .md file or click to select'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {uploadCooldown ? 'Por favor espera unos segundos' : 'Maximum 10MB'}
          </p>
        </div>
      )}

      {/* Estado 2: Uploading */}
      {isUploading && (
        <div className="p-4 border rounded-lg bg-blue-50">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Processing manual...</p>
              <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Estado 3: List (con manuales) */}
      {manuals.length > 0 && !isUploading && (
        <div className="space-y-2">
          {/* P2.1: Search Bar - Solo si hay >3 manuales */}
          {manuals.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar manual..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* P2.2: Bulk Actions - Solo si hay selección */}
          {selectedManuals.length > 0 && (
            <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-blue-900">
                  {selectedManuals.length} seleccionado{selectedManuals.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={deselectAllManuals}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Deseleccionar todos
                </button>
              </div>
              {selectedManuals.length > 1 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isBulkDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Eliminar {selectedManuals.length} manuales</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Select All / Deselect All buttons - Solo si hay manuales */}
          {filteredManuals.length > 1 && (
            <div className="flex items-center space-x-2 text-xs">
              <button
                onClick={selectAllManuals}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Seleccionar todos
              </button>
              {selectedManuals.length > 0 && (
                <>
                  <span className="text-gray-400">•</span>
                  <button
                    onClick={deselectAllManuals}
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    Deseleccionar todos
                  </button>
                </>
              )}
            </div>
          )}

          {/* No results message */}
          {filteredManuals.length === 0 && searchQuery && (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No se encontraron manuales que coincidan con "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-blue-600 hover:text-blue-700 underline mt-2"
              >
                Limpiar búsqueda
              </button>
            </div>
          )}

          {/* Manual List */}
          {filteredManuals.map((manual) => (
            <div
              key={manual.id}
              className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 transition-colors"
            >
              {/* P2.2: Checkbox for selection */}
              <input
                type="checkbox"
                checked={selectedManuals.includes(manual.id)}
                onChange={() => toggleManualSelection(manual.id)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                aria-label={`Select ${manual.filename}`}
              />

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium text-gray-900 truncate"
                  title={manual.filename}
                >
                  {manual.filename}
                </p>
                <p className="text-xs text-gray-500">
                  {manual.chunk_count} chunk{manual.chunk_count !== 1 ? 's' : ''}
                  {manual.file_size_bytes && (
                    <> • {(manual.file_size_bytes / 1024).toFixed(1)}KB</>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onViewContent(manual.id)}
                  className="p-2 text-blue-600 hover:text-blue-700 transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  title="View content"
                  aria-label="View manual content"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(manual.id, manual.filename)}
                  className="p-2 text-red-600 hover:text-red-700 transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  title="Delete manual"
                  aria-label={`Delete ${manual.filename}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Drag & Drop zone when manuals exist */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
              uploadCooldown
                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                : isDragActive
                  ? 'border-blue-500 bg-blue-50 cursor-pointer'
                  : 'border-gray-300 hover:border-gray-400 cursor-pointer'
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-xs text-gray-600">
              {uploadCooldown
                ? 'Esperando...'
                : isDragActive
                  ? 'Drop to upload'
                  : 'Drop .md file or click to add another'}
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input (fallback) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md"
        onChange={(e) => {
          const files = e.target.files
          if (files && files.length > 0) {
            handleFileDrop(Array.from(files))
          }
          // Reset input
          e.target.value = ''
        }}
        className="hidden"
      />
    </div>
  )
}
