/**
 * SIRE Document Extraction API Endpoint
 *
 * POST /api/sire/extract-document?reservation_id=xxx
 *
 * Extracts structured SIRE data from uploaded passport/visa/ID card images
 * using Claude Vision OCR + field mapping.
 *
 * Features:
 * - Multipart form data upload
 * - Claude Vision OCR extraction
 * - Passport → SIRE field mapping
 * - Field validation with confidence scoring
 * - Supabase Storage upload
 * - Optional database persistence
 *
 * @created December 23, 2025
 * @context SIRE Auto-Submission FASE 2, Tarea 2.5
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyGuestToken, extractTokenFromHeader, GuestAuthErrors } from '@/lib/guest-auth'
import { extractPassportData, extractVisaData, OCRError } from '@/lib/sire/document-ocr'
import { mapPassportToSIRE, validateExtractedFields, type FieldExtractionResult } from '@/lib/sire/field-extraction'

// ============================================================================
// Configuration
// ============================================================================

export const runtime = 'nodejs'
export const maxDuration = 30 // 30 seconds for OCR processing

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const STORAGE_BUCKET = 'sire-documents'

// ============================================================================
// Types
// ============================================================================

interface SuccessResponse {
  success: true
  id?: string // Optional: DB record ID (if table exists)
  file_url: string
  extracted_data: FieldExtractionResult
  validation: {
    valid: boolean
    errors: string[]
    warnings: string[]
  }
  processing_time_ms: number
}

interface ErrorResponse {
  success: false
  error: string
  code: string
  details?: string
}

type Response = SuccessResponse | ErrorResponse

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<Response>> {
  const startTime = Date.now()

  try {
    // === GUEST AUTHENTICATION ===
    // Try cookie first, then fall back to Authorization header (same as /api/guest/chat)
    const cookieToken = request.cookies.get('guest_token')?.value
    const authHeader = request.headers.get('Authorization')
    const headerToken = extractTokenFromHeader(authHeader)
    const token = cookieToken || headerToken

    if (!token) {
      console.error('[sire/extract-document] Missing authentication (no cookie or header)')
      return NextResponse.json(
        {
          success: false,
          error: GuestAuthErrors.MISSING_HEADER,
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      )
    }

    const guestSession = await verifyGuestToken(token)

    if (!guestSession) {
      console.error('[sire/extract-document] Invalid or expired token')
      return NextResponse.json(
        {
          success: false,
          error: GuestAuthErrors.INVALID_TOKEN,
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      )
    }

    console.log(`[sire/extract-document] Authenticated guest: ${guestSession.guest_name} (reservation: ${guestSession.reservation_id})`)

    // === CREATE SUPABASE CLIENT FOR STORAGE ===
    const supabase = createServerClient()

    // === VALIDATE QUERY PARAMS ===
    const url = new URL(request.url)
    const reservationId = url.searchParams.get('reservation_id')

    if (!reservationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: reservation_id',
          code: 'MISSING_PARAMETER',
        },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(reservationId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid reservation_id format (must be UUID)',
          code: 'INVALID_UUID',
        },
        { status: 400 }
      )
    }

    console.log('[sire/extract-document] Processing document for reservation:', reservationId)

    // === PARSE MULTIPART FORM DATA ===
    const formData = await request.formData()
    const files = formData.getAll('files[]') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No files uploaded (expected files[] in multipart form)',
          code: 'NO_FILES',
        },
        { status: 400 }
      )
    }

    // Process only the first file for now
    const file = files[0]

    console.log('[sire/extract-document] File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
    })

    // === VALIDATE FILE ===
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
          code: 'FILE_TOO_LARGE',
        },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
          code: 'INVALID_FILE_TYPE',
        },
        { status: 400 }
      )
    }

    // === UPLOAD TO SUPABASE STORAGE ===
    const fileName = `${reservationId}/${Date.now()}-${file.name}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    console.log('[sire/extract-document] Uploading to Supabase Storage:', {
      bucket: STORAGE_BUCKET,
      path: fileName,
    })

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[sire/extract-document] Storage upload failed:', uploadError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to upload file to storage',
          code: 'UPLOAD_ERROR',
          details: uploadError.message,
        },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uploadData.path)

    const fileUrl = urlData.publicUrl

    console.log('[sire/extract-document] File uploaded successfully:', fileUrl)

    // === EXTRACT DATA WITH OCR ===
    console.log('[sire/extract-document] Starting OCR extraction...')

    let ocrResult
    try {
      // Default to passport extraction (most common document type)
      ocrResult = await extractPassportData(fileBuffer, file.type)
    } catch (error) {
      if (error instanceof OCRError) {
        console.error('[sire/extract-document] OCR error:', error.message)
        return NextResponse.json(
          {
            success: false,
            error: 'OCR extraction failed',
            code: error.code,
            details: error.message,
          },
          { status: 422 }
        )
      }
      throw error // Re-throw unknown errors
    }

    if (!ocrResult.success || !ocrResult.structuredData) {
      console.error('[sire/extract-document] OCR failed:', ocrResult.error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to extract data from document',
          code: 'OCR_FAILED',
          details: ocrResult.error || 'Unknown OCR error',
        },
        { status: 422 }
      )
    }

    console.log('[sire/extract-document] OCR extraction successful:', {
      confidence: ocrResult.confidence,
      processing_time_ms: ocrResult.processingTimeMs,
    })

    // === MAP TO SIRE FORMAT ===
    console.log('[sire/extract-document] Mapping OCR data to SIRE format...')

    // Type guard: mapPassportToSIRE only accepts PassportData
    // For visa documents, we use extractPassportData which returns PassportData
    if (!('fullName' in ocrResult.structuredData)) {
      console.error('[sire/extract-document] Unexpected data structure (not PassportData)')
      return NextResponse.json(
        {
          success: false,
          error: 'Unexpected document data structure',
          code: 'INVALID_DATA_STRUCTURE',
        },
        { status: 422 }
      )
    }

    const extractedData = mapPassportToSIRE(ocrResult.structuredData)

    console.log('[sire/extract-document] SIRE mapping complete:', {
      fields_extracted: Object.keys(extractedData.sireData).length,
      errors: extractedData.errors.length,
      warnings: extractedData.warnings.length,
    })

    // === VALIDATE EXTRACTED FIELDS ===
    const validation = validateExtractedFields(extractedData.sireData)

    console.log('[sire/extract-document] Validation result:', {
      valid: validation.valid,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
    })

    // === SAVE EXTRACTED DATA TO GUEST_RESERVATIONS ===
    // Automatically populate SIRE fields from extracted document data
    // Map Spanish field names (conversational) to English column names (database)
    console.log('[sire/extract-document] Saving extracted data to guest_reservations...')
    try {
      const dbData: Record<string, any> = {}

      // Map conversational field names to database column names
      if (extractedData.sireData.primer_apellido) dbData.first_surname = extractedData.sireData.primer_apellido
      if (extractedData.sireData.segundo_apellido) dbData.second_surname = extractedData.sireData.segundo_apellido
      if (extractedData.sireData.nombres) dbData.given_names = extractedData.sireData.nombres
      if (extractedData.sireData.tipo_documento) dbData.document_type = extractedData.sireData.tipo_documento
      if (extractedData.sireData.documento_numero) dbData.document_number = extractedData.sireData.documento_numero
      if (extractedData.sireData.codigo_nacionalidad) dbData.nationality_code = extractedData.sireData.codigo_nacionalidad

      // Convert birth_date from DD/MM/YYYY to YYYY-MM-DD for PostgreSQL
      if (extractedData.sireData.fecha_nacimiento) {
        const ddmmyyyy = extractedData.sireData.fecha_nacimiento
        const parts = ddmmyyyy.split('/')
        if (parts.length === 3) {
          dbData.birth_date = `${parts[2]}-${parts[1]}-${parts[0]}` // YYYY-MM-DD
        }
      }

      const { error: updateError } = await supabase
        .from('guest_reservations')
        .update(dbData)
        .eq('id', reservationId)

      if (updateError) {
        console.error('[sire/extract-document] Failed to save to guest_reservations:', updateError)
      } else {
        console.log('[sire/extract-document] ✅ SIRE data saved to guest_reservations:', Object.keys(dbData))
      }
    } catch (saveError) {
      console.error('[sire/extract-document] Error saving to guest_reservations:', saveError)
    }

    // === OPTIONAL: SAVE TO DATABASE ===
    // Note: Table may not exist yet (created in Tarea 2.6)
    let recordId: string | undefined

    try {
      const { data: dbData, error: dbError } = await supabase
        .from('sire_document_uploads')
        .insert({
          reservation_id: reservationId,
          file_url: fileUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          extracted_data: extractedData.sireData,
          ocr_confidence: ocrResult.confidence,
          validation_status: validation.valid ? 'valid' : 'invalid',
          validation_errors: validation.errors,
          validation_warnings: validation.warnings,
        })
        .select('id')
        .single()

      if (dbError) {
        console.warn('[sire/extract-document] Database save skipped (table may not exist):', dbError.message)
        // Don't fail the request - table creation is a future task
      } else if (dbData) {
        recordId = dbData.id
        console.log('[sire/extract-document] Saved to database, record ID:', recordId)
      }
    } catch (dbError) {
      console.warn('[sire/extract-document] Database operation failed (non-critical):', dbError)
      // Continue - database save is optional
    }

    const processingTimeMs = Date.now() - startTime

    console.log('[sire/extract-document] ✅ Document extraction complete:', {
      processing_time_ms: processingTimeMs,
      file_url: fileUrl,
      validation_valid: validation.valid,
    })

    // === RETURN SUCCESS RESPONSE ===
    return NextResponse.json(
      {
        success: true,
        id: recordId,
        file_url: fileUrl,
        extracted_data: extractedData,
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
        },
        processing_time_ms: processingTimeMs,
      },
      { status: 200 }
    )
  } catch (error: any) {
    const processingTimeMs = Date.now() - startTime

    console.error('[sire/extract-document] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET Handler - API Info
// ============================================================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: '/api/sire/extract-document',
    description: 'Extracts structured SIRE data from passport/visa/ID card images',
    method: 'POST',
    authentication: 'Supabase session required',
    query_params: {
      reservation_id: 'string (required, UUID)',
    },
    request: {
      content_type: 'multipart/form-data',
      fields: {
        'files[]': 'File (required, image file)',
      },
    },
    response: {
      success: 'boolean',
      id: 'string (optional, DB record ID if table exists)',
      file_url: 'string (Supabase Storage public URL)',
      extracted_data: 'FieldExtractionResult (SIRE data + confidence scores)',
      validation: {
        valid: 'boolean',
        errors: 'string[]',
        warnings: 'string[]',
      },
      processing_time_ms: 'number',
    },
    features: [
      'Claude Vision OCR (Sonnet 4)',
      'Passport data extraction (9 fields)',
      'Visa data extraction (7 fields)',
      'Automatic SIRE field mapping',
      'Field validation with confidence scoring',
      'Supabase Storage upload',
      'Optional database persistence',
      'Retry logic with exponential backoff',
    ],
    limits: {
      max_file_size: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
      allowed_mime_types: ALLOWED_MIME_TYPES,
      timeout: `${maxDuration}s`,
    },
  })
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
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
