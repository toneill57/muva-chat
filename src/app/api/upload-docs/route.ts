import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * POST /api/admin/upload-docs
 *
 * Receives file uploads (.md, .txt, .pdf) for tenant knowledge base
 * Saves files to data/temp/{tenant_id}/ for later processing
 *
 * @param request - multipart/form-data with fields:
 *   - file: File (required)
 *   - tenant_id: string (required)
 *
 * @returns JSON response with file_id and success status
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tenantId = formData.get('tenant_id') as string

    // Validation: Check if file is provided
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
          message: 'Please upload a file'
        },
        { status: 400 }
      )
    }

    // Validation: Check if tenant_id is provided
    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant_id provided',
          message: 'tenant_id is required'
        },
        { status: 400 }
      )
    }

    // Validation: File type
    const fileName = file.name.toLowerCase()
    const validExtensions = ['.md', '.txt', '.pdf']
    const isValidType = validExtensions.some(ext => fileName.endsWith(ext))

    if (!isValidType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type',
          message: 'Only .md, .txt, and .pdf files are allowed',
          validTypes: validExtensions
        },
        { status: 400 }
      )
    }

    // Validation: Check MIME type for extra security
    const validMimeTypes = [
      'text/markdown',
      'text/plain',
      'application/pdf',
      'application/octet-stream' // Some browsers send this for .md files
    ]

    if (!validMimeTypes.includes(file.type)) {
      console.warn(`[upload-docs] Suspicious file type: ${file.type} for ${fileName}`)
      // Log but don't block - some browsers send incorrect MIME types for .md files
    }

    // Validation: File size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large',
          message: `Maximum file size is ${maxSize / (1024 * 1024)}MB`,
          fileSize: file.size,
          maxSize
        },
        { status: 400 }
      )
    }

    // TODO: Tenant ownership verification
    // Once auth is implemented, verify that the requesting user has permission
    // to upload documents for this tenant_id
    // For now, we skip this check (noted in task spec)

    // Create directory path: data/temp/{tenant_id}/
    const baseDir = join(process.cwd(), 'data', 'temp', tenantId)

    // Create directory if it doesn't exist (mkdir -p equivalent)
    if (!existsSync(baseDir)) {
      await mkdir(baseDir, { recursive: true })
      console.log(`[upload-docs] Created directory: ${baseDir}`)
    }

    // Generate safe filename (preserve original name)
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = join(baseDir, safeFileName)

    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Write file to disk
    await writeFile(filePath, buffer)
    console.log(`[upload-docs] File saved: ${filePath} (${file.size} bytes)`)

    // Generate file_id (format: {tenant_id}/{filename})
    const fileId = `${tenantId}/${safeFileName}`

    // Success response
    return NextResponse.json({
      success: true,
      file_id: fileId,
      message: 'File uploaded. Processing will start shortly.',
      metadata: {
        fileName: safeFileName,
        originalName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        tenantId
      }
    })

  } catch (error) {
    console.error('[upload-docs] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/upload-docs
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/upload-docs',
    method: 'POST',
    description: 'Upload knowledge base documents for tenant',
    contentType: 'multipart/form-data',
    fields: {
      file: {
        type: 'File',
        required: true,
        description: 'Document file to upload',
        validTypes: ['.md', '.txt', '.pdf'],
        maxSize: '10MB'
      },
      tenant_id: {
        type: 'string',
        required: true,
        description: 'UUID of the tenant'
      }
    },
    response: {
      success: true,
      file_id: '{tenant_id}/{filename}',
      message: 'File uploaded. Processing will start shortly.',
      metadata: {
        fileName: 'Sanitized filename',
        originalName: 'Original filename',
        fileSize: 'Size in bytes',
        fileType: 'MIME type',
        uploadedAt: 'ISO timestamp',
        tenantId: 'Tenant UUID'
      }
    },
    notes: [
      'Files are saved to data/temp/{tenant_id}/',
      'Processing will be triggered manually via script (future: job queue)',
      'Auth verification is a placeholder for now (future: verify tenant ownership)'
    ],
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
}
