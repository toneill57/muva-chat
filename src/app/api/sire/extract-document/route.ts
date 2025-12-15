/**
 * SIRE Document OCR API Endpoint
 *
 * POST /api/sire/extract-document
 * Processes uploaded identity documents (passport, visa, cedula) via OCR,
 * extracts SIRE-compliant fields, and saves to database.
 *
 * Features:
 * - Multipart/form-data file upload
 * - Guest authentication via JWT
 * - Supabase Storage upload (sire-documents bucket)
 * - Claude Vision OCR extraction
 * - SIRE field mapping and validation
 * - Database persistence (sire_document_uploads table)
 *
 * Flow:
 * 1. Authenticate guest via JWT token
 * 2. Validate file upload (type, size)
 * 3. Upload to Supabase Storage
 * 4. Extract data via Claude Vision OCR
 * 5. Map to SIRE format and validate
 * 6. Save to database
 * 7. Return extracted data + validation results
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyGuestToken } from '@/lib/guest-auth'
import {
  extractPassportData,
  extractVisaData,
  extractCedulaData,
  detectDocumentType,
  isValidMimeType,
  validateImageSize,
  checkOCRRateLimit,
  type SupportedMimeType,
  type DocumentType,
  type OCRResult,
} from '@/lib/sire/document-ocr'
import {
  mapPassportToSIRE,
  mapVisaToSIRE,
  mapCedulaToSIRE,
  validateExtractedFields,
  type FieldExtractionResult,
} from '@/lib/sire/field-extraction'

// ============================================================================
// Configuration
// ============================================================================

export const runtime = 'nodejs'
export const maxDuration = 30 // 30 seconds for OCR processing

// Maximum file size: 10MB (configurable)
const MAX_FILE_SIZE_MB = 10

// ============================================================================
// Types
// ============================================================================

interface SuccessResponse {
  success: true
  id: string
  file_url: string
  extracted_data: FieldExtractionResult
  validation: {
    valid: boolean
    errors: string[]
  }
  processing_time_ms: number
}

interface ErrorResponse {
  success: false
  error: string
  code?: string
}

type Response = SuccessResponse | ErrorResponse

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<Response>> {
  const startTime = Date.now()

  try {
    // 1. Extract and verify authentication token
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing authentication token',
          code: 'MISSING_AUTH',
        },
        { status: 401 }
      )
    }

    // Verify guest token
    const guestSession = await verifyGuestToken(token)

    if (!guestSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired authentication token',
          code: 'INVALID_TOKEN',
        },
        { status: 401 }
      )
    }

    console.log('[sire/extract-document] Guest authenticated:', {
      reservation_id: guestSession.reservation_id,
      tenant_id: guestSession.tenant_id,
      guest_name: guestSession.guest_name,
    })

    // 2. Check rate limit (10 requests per minute per tenant)
    const rateLimitCheck = checkOCRRateLimit(guestSession.tenant_id)
    if (!rateLimitCheck.success) {
      const resetInSeconds = Math.ceil(rateLimitCheck.resetMs / 1000)
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      )
    }

    console.log('[sire/extract-document] Rate limit OK:', {
      remaining: rateLimitCheck.remaining,
      resetMs: rateLimitCheck.resetMs,
    })

    // 3. Parse multipart/form-data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing file in request. Expected field name: "file"',
          code: 'MISSING_FILE',
        },
        { status: 400 }
      )
    }

    // 4. Validate file type
    if (!isValidMimeType(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type: ${file.type}. Supported types: image/jpeg, image/png, image/gif, image/webp`,
          code: 'UNSUPPORTED_FILE_TYPE',
        },
        { status: 400 }
      )
    }

    const mimeType = file.type as SupportedMimeType

    // 5. Validate file size
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const sizeValidation = validateImageSize(fileBuffer, MAX_FILE_SIZE_MB)

    if (!sizeValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: sizeValidation.error || 'Invalid file size',
          code: 'INVALID_FILE_SIZE',
        },
        { status: 400 }
      )
    }

    console.log('[sire/extract-document] File validated:', {
      filename: file.name,
      type: mimeType,
      size_mb: (fileBuffer.length / (1024 * 1024)).toFixed(2),
    })

    // 6. Upload to Supabase Storage (sire-documents bucket)
    const supabase = createServerClient()
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const storagePath = `${guestSession.tenant_id}/${guestSession.reservation_id}/${timestamp}.${fileExtension}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('sire-documents')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      console.error('[sire/extract-document] Storage upload failed:', uploadError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to upload file to storage',
          code: 'STORAGE_UPLOAD_FAILED',
        },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('sire-documents')
      .getPublicUrl(storagePath)

    const fileUrl = publicUrlData.publicUrl

    console.log('[sire/extract-document] File uploaded to storage:', {
      path: storagePath,
      url: fileUrl,
    })

    // 7. Detect document type and extract via OCR
    let ocrResult: OCRResult
    const detectedType = await detectDocumentType(fileBuffer, mimeType)

    console.log('[sire/extract-document] Document type detected:', detectedType)

    switch (detectedType) {
      case 'passport':
        ocrResult = await extractPassportData(fileBuffer, mimeType)
        break
      case 'visa':
        ocrResult = await extractVisaData(fileBuffer, mimeType)
        break
      case 'cedula':
        ocrResult = await extractCedulaData(fileBuffer, mimeType)
        break
      default:
        // Fallback to passport extraction
        ocrResult = await extractPassportData(fileBuffer, mimeType)
    }

    if (!ocrResult.success || !ocrResult.passportData && !ocrResult.visaData && !ocrResult.cedulaData) {
      console.error('[sire/extract-document] OCR extraction failed:', {
        error: ocrResult.error,
        errorCode: ocrResult.errorCode,
      })
      return NextResponse.json(
        {
          success: false,
          error: ocrResult.error || 'OCR extraction failed',
          code: ocrResult.errorCode || 'OCR_FAILED',
        },
        { status: 422 }
      )
    }

    console.log('[sire/extract-document] OCR extraction successful:', {
      documentType: ocrResult.documentType,
      confidence: ocrResult.confidence,
      processingTimeMs: ocrResult.processingTimeMs,
    })

    // 8. Map OCR data to SIRE format
    let extractedData: FieldExtractionResult

    if (ocrResult.passportData) {
      extractedData = mapPassportToSIRE(ocrResult.passportData)
    } else if (ocrResult.cedulaData) {
      extractedData = mapCedulaToSIRE(ocrResult.cedulaData)
    } else if (ocrResult.visaData) {
      extractedData = mapVisaToSIRE(ocrResult.visaData)
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'No document data could be extracted',
          code: 'NO_DATA_EXTRACTED',
        },
        { status: 422 }
      )
    }

    // 9. Validate extracted fields
    const validation = validateExtractedFields(extractedData.sireData)

    console.log('[sire/extract-document] Field mapping complete:', {
      fieldsExtracted: Object.keys(extractedData.sireData).length,
      validationPassed: validation.valid,
      errors: validation.errors,
    })

    // 10. Save to database (sire_document_uploads)
    // Note: This assumes the table exists. If it doesn't, we'll skip DB insert gracefully
    let recordId: string | null = null

    try {
      const { data: dbData, error: dbError } = await supabase
        .from('sire_document_uploads')
        .insert({
          reservation_id: guestSession.reservation_id,
          tenant_id: guestSession.tenant_id,
          document_type: ocrResult.documentType,
          file_url: fileUrl,
          ocr_result: ocrResult,
          extracted_fields: extractedData.sireData,
          confidence_score: ocrResult.confidence,
          status: validation.valid ? 'completed' : 'needs_review',
        })
        .select('id')
        .single()

      if (dbError) {
        // Log error but don't fail the request if table doesn't exist yet
        console.warn('[sire/extract-document] Database insert skipped (table may not exist):', dbError.message)
      } else if (dbData) {
        recordId = dbData.id
        console.log('[sire/extract-document] Saved to database:', { id: recordId })
      }
    } catch (dbException) {
      console.warn('[sire/extract-document] Database error (continuing):', dbException)
    }

    // 11. Return success response
    const processingTimeMs = Date.now() - startTime

    return NextResponse.json(
      {
        success: true,
        id: recordId || 'not_saved', // If DB insert failed, return placeholder
        file_url: fileUrl,
        extracted_data: extractedData,
        validation,
        processing_time_ms: processingTimeMs,
      },
      { status: 200 }
    )
  } catch (error: any) {
    const processingTimeMs = Date.now() - startTime
    console.error('[sire/extract-document] Unexpected error:', {
      error: error.message,
      stack: error.stack,
      processingTimeMs,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during document processing',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// OPTIONS Handler (CORS)
// ============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
