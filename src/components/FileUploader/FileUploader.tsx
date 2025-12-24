'use client'

import { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, FileCode, Zap, Eye } from "lucide-react"
import { formatFileSize } from "@/lib/utils"

interface SireValidationResult {
  fileType: 'sire_data'
  isValid: boolean
  errors: string[]
  lineCount: number
  fileSize: number
  fileName: string
  format: 'tab' | 'csv' | 'unknown'
  fieldValidation: Array<{
    field: number
    name: string
    validCount: number
    totalCount: number
    errors: string[]
  }>
}

interface MarkdownAnalysisResult {
  fileType: 'markdown_document'
  fileName: string
  fileSize: number
  documentType: string
  frontmatter: Record<string, any> | null
  autoEmbedEligible: boolean
  metadata: {
    isValid: boolean
    errors: string[]
    suggestions: string[]
    schema: {
      description: string
      requiredFields: string[]
      suggestedFields: string[]
    }
  }
  contentPreview: string
  wordCount: number
  estimatedChunks: number
}

type UploadResult = SireValidationResult | MarkdownAnalysisResult

export function FileUploader() {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      handleFile(file)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      handleFile(file)
    }
  }

  const handleFile = async (file: File) => {
    const fileName = file.name.toLowerCase()

    // Validar tipo de archivo
    if (!fileName.endsWith('.txt') && !fileName.endsWith('.csv') && !fileName.endsWith('.md')) {
      setError('Solo se permiten archivos .txt/.csv (datos SIRE) o .md (documentación)')
      setUploadResult(null)
      return
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Máximo 10MB')
      setUploadResult(null)
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al procesar el archivo')
      }

      const result = await response.json()
      setUploadResult(result)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo')
      setUploadResult(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTemplate = () => {
    const templateContent = `CODIGO_HOTEL\tCODIGO_CIUDAD\tTIPO_DOC\tNUMERO_DOC\tCODIGO_NACIONALIDAD\tPRIMER_APELLIDO\tSEGUNDO_APELLIDO\tNOMBRES\tTIPO_MOVIMIENTO\tFECHA_MOVIMIENTO\tLUGAR_PROCEDENCIA\tLUGAR_DESTINO\tFECHA_NACIMIENTO
7706\t88001\t3\tAB1234567\t249\tSMITH\t\tJOHN MICHAEL\tE\t15/09/2024\t249\t88001\t01/01/1990`

    const blob = new Blob([templateContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_sire.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Archivos
          </CardTitle>
          <CardDescription>
            Archivos SIRE (.txt/.csv) o documentación (.md) - Arrastra aquí o haz clic para seleccionar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                Selecciona un archivo
              </p>
              <p className="text-sm text-gray-500">
                Datos SIRE (.txt/.csv) o documentación (.md)
              </p>
              <div className="flex items-center justify-center gap-4 mt-4">
                <input
                  type="file"
                  accept=".txt,.csv,.md"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  type="button"
                >
                  Seleccionar Archivo
                </Button>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Plantilla
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Procesando archivo...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-red-800 font-medium">Error:</span>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SIRE Data File Results */}
      {uploadResult && uploadResult.fileType === 'sire_data' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uploadResult.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Validación SIRE
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Archivo</p>
                <p className="font-medium">{uploadResult.fileName}</p>
              </div>
              <div>
                <p className="text-gray-500">Tamaño</p>
                <p className="font-medium">{formatFileSize(uploadResult.fileSize)}</p>
              </div>
              <div>
                <p className="text-gray-500">Registros</p>
                <p className="font-medium">{uploadResult.lineCount}</p>
              </div>
              <div>
                <p className="text-gray-500">Estado</p>
                <p className={`font-medium ${
                  uploadResult.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {uploadResult.isValid ? 'Válido' : 'Con errores'}
                </p>
              </div>
            </div>

            {uploadResult.isValid ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">
                    ¡Archivo válido! Listo para enviar al SIRE
                  </span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  El archivo cumple con todos los requisitos de formato SIRE
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-red-800 font-medium">
                      Errores encontrados:
                    </span>
                    <ul className="text-red-700 text-sm mt-1 space-y-1">
                      {uploadResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {uploadResult.isValid && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-blue-800 font-medium mb-2">Próximos pasos:</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Descarga el archivo validado si es necesario</li>
                  <li>• Sube el archivo al portal oficial del SIRE</li>
                  <li>• Verifica la recepción en el sistema gubernamental</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Markdown Document Results */}
      {uploadResult && uploadResult.fileType === 'markdown_document' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-blue-600" />
              Análisis de Documento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Archivo</p>
                <p className="font-medium">{uploadResult.fileName}</p>
              </div>
              <div>
                <p className="text-gray-500">Tamaño</p>
                <p className="font-medium">{formatFileSize(uploadResult.fileSize)}</p>
              </div>
              <div>
                <p className="text-gray-500">Palabras</p>
                <p className="font-medium">{uploadResult.wordCount}</p>
              </div>
              <div>
                <p className="text-gray-500">Tipo</p>
                <p className="font-medium capitalize">{uploadResult.documentType.replace('_', ' ')}</p>
              </div>
            </div>

            {/* Document Type and Auto-Embed Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Categorización
                </h4>
                <p className="text-sm text-gray-600 mb-2">{uploadResult.metadata.schema.description}</p>
                <p className="text-sm">
                  <span className="font-medium">Chunks estimados:</span> {uploadResult.estimatedChunks}
                </p>
              </div>

              <div className={`border rounded-lg p-4 ${
                uploadResult.autoEmbedEligible
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Auto-Embedding
                </h4>
                <div className="flex items-center gap-2">
                  {uploadResult.autoEmbedEligible ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">Elegible para procesamiento automático</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">Requiere revisión manual</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata Validation */}
            {(!uploadResult.metadata.isValid || uploadResult.metadata.suggestions.length > 0) && (
              <div className="space-y-3">
                {!uploadResult.metadata.isValid && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-red-800 font-medium mb-2">Campos requeridos faltantes:</h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      {uploadResult.metadata.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {uploadResult.metadata.suggestions.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-blue-800 font-medium mb-2">Mejoras sugeridas:</h4>
                    <ul className="text-blue-700 text-sm space-y-1">
                      {uploadResult.metadata.suggestions.map((suggestion, index) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Frontmatter Preview */}
            {uploadResult.frontmatter && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Metadata del Documento
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {Object.entries(uploadResult.frontmatter).slice(0, 6).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-gray-500">{key}:</span>
                      <span className="ml-2 font-medium">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {uploadResult.autoEmbedEligible && (
                <Button
                  onClick={() => {/* TODO: Trigger embedding */}}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Procesar Embeddings
                </Button>
              )}
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Vista Previa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información sobre tipos de archivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {/* SIRE Data Files */}
          <div className="border-l-4 border-blue-400 pl-4">
            <h4 className="font-medium mb-2 text-blue-800">Archivos de datos SIRE (.txt/.csv)</h4>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Campos obligatorios (13 total):</span>
                <p className="text-gray-600">
                  Código hotel, código ciudad, tipo documento, número, código nacionalidad,
                  apellidos, nombres, tipo movimiento, fecha movimiento, lugar procedencia/destino, fecha nacimiento
                </p>
              </div>
              <div>
                <span className="font-medium">Tipos de documento válidos:</span>
                <p className="text-gray-600">
                  3 (Cédula extranjería), 5 (Pasaporte), 46 (Visa), 10 (PTP)
                </p>
              </div>
              <div>
                <span className="font-medium">Formato:</span>
                <p className="text-gray-600">
                  Campos separados por tabulaciones (TAB) o comas (CSV)
                </p>
              </div>
            </div>
          </div>

          {/* Documentation Files */}
          <div className="border-l-4 border-green-400 pl-4">
            <h4 className="font-medium mb-2 text-green-800">Archivos de documentación (.md)</h4>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Tipos soportados:</span>
                <p className="text-gray-600">
                  SIRE regulatorios, templates, guías técnicas, procesos hoteleros, documentación de sistema
                </p>
              </div>
              <div>
                <span className="font-medium">Frontmatter recomendado:</span>
                <p className="text-gray-600">
                  title, type, description, auto_embed, priority, audience
                </p>
              </div>
              <div>
                <span className="font-medium">Procesamiento automático:</span>
                <p className="text-gray-600">
                  Documentos elegibles se procesan automáticamente para embedding vectorial
                </p>
              </div>
            </div>
          </div>

          {/* Example Frontmatter */}
          <div className="bg-gray-50 border border-gray-200 rounded p-3">
            <h4 className="font-medium mb-2">Ejemplo de frontmatter para documentos:</h4>
            <pre className="text-xs text-gray-700 overflow-x-auto">
{`---
title: "Guía de Reportes SIRE"
type: sire_regulatory
description: "Procedimientos oficiales para reportar huéspedes"
auto_embed: true
priority: critical
audience: hotel_staff
---`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}