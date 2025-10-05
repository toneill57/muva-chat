/**
 * Guest Conversation Attachments API
 *
 * POST /api/guest/conversations/:id/attachments
 *
 * Purpose: Upload files (images, documents) to guest conversations with Claude Vision analysis
 * Use cases:
 *   1. Location recognition: Upload photo -> Vision identifies location & provides directions
 *   2. Passport OCR: Upload passport photo -> Auto-fill compliance form with extracted data
 *
 * FASE 2.5: Multi-Modal File Upload
 * Date: 2025-10-05
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyGuestToken } from '@/lib/guest-auth'
import { createServerClient } from '@/lib/supabase'
import { analyzePassport, recognizeLocation, analyzeImage } from '@/lib/claude-vision'

/**
 * POST /api/guest/conversations/:id/attachments
 *
 * Upload file to Supabase Storage and analyze with Claude Vision API
 *
 * Request:
 *   - Headers: Authorization: Bearer <guest_jwt_token>
 *   - Body: multipart/form-data
 *     - file: File (image/*, application/pdf)
 *     - analysisType: 'location' | 'passport' | 'general' (optional)
 *     - customPrompt: string (optional - for general analysis)
 *
 * Response:
 *   - 201: { success: true, attachment: {...}, visionAnalysis: {...} }
 *   - 400: Invalid file or request
 *   - 401: Unauthorized
 *   - 403: Forbidden (conversation not owned by guest)
 *   - 500: Server error
 *
 * Performance Target: <5000ms total (upload + analysis)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const { id: conversationId } = await params

    console.log('[attachments] POST request:', {
      conversation_id: conversationId,
      timestamp: new Date().toISOString(),
    })

    // =========================================================================
    // 1. AUTHENTICATION
    // =========================================================================

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      console.warn('[attachments] Missing authorization token')
      return NextResponse.json(
        { error: 'Token de autenticación requerido' },
        { status: 401 }
      )
    }

    const session = await verifyGuestToken(token)
    if (!session) {
      console.warn('[attachments] Invalid or expired token')
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      )
    }

    console.log('[attachments] Guest authenticated:', {
      guest: session.guest_name,
      tenant: session.tenant_id,
      reservation_id: session.reservation_id,
    })

    // =========================================================================
    // 2. CONVERSATION OWNERSHIP VALIDATION
    // =========================================================================

    const supabase = createServerClient()

    const { data: conversation, error: convError } = await supabase
      .from('guest_conversations')
      .select('guest_id, tenant_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      console.error('[attachments] Conversation not found:', convError)
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      )
    }

    // Verify conversation belongs to guest
    if (conversation.guest_id !== session.reservation_id) {
      console.warn('[attachments] Conversation ownership mismatch:', {
        conversation_guest: conversation.guest_id,
        session_guest: session.reservation_id,
      })
      return NextResponse.json(
        { error: 'No tienes permiso para esta conversación' },
        { status: 403 }
      )
    }

    // =========================================================================
    // 3. PARSE MULTIPART FORM DATA
    // =========================================================================

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const analysisType = (formData.get('analysisType') as string) || 'general'
    const customPrompt = (formData.get('customPrompt') as string) || ''

    if (!file) {
      console.warn('[attachments] No file provided')
      return NextResponse.json(
        { error: 'Archivo requerido' },
        { status: 400 }
      )
    }

    console.log('[attachments] File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
      analysisType,
    })

    // =========================================================================
    // 4. FILE VALIDATION
    // =========================================================================

    // Validate file size (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      console.warn('[attachments] File too large:', {
        size: file.size,
        max: MAX_FILE_SIZE,
      })
      return NextResponse.json(
        { error: 'Archivo demasiado grande (máximo 10MB)' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ]

    if (!allowedTypes.includes(file.type)) {
      console.warn('[attachments] Invalid file type:', file.type)
      return NextResponse.json(
        {
          error: 'Tipo de archivo no permitido',
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        },
        { status: 400 }
      )
    }

    // =========================================================================
    // 5. UPLOAD TO SUPABASE STORAGE
    // =========================================================================

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `${session.reservation_id}/${conversationId}/${fileName}`

    console.log('[attachments] Uploading to Supabase Storage:', {
      bucket: 'guest-attachments',
      path: filePath,
    })

    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('guest-attachments')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      console.error('[attachments] Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Error al subir archivo', details: uploadError.message },
        { status: 500 }
      )
    }

    console.log('[attachments] File uploaded successfully:', uploadData.path)

    // =========================================================================
    // 6. GET PUBLIC URL
    // =========================================================================

    const { data: urlData } = supabase.storage
      .from('guest-attachments')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    console.log('[attachments] Public URL generated:', publicUrl.substring(0, 80) + '...')

    // =========================================================================
    // 7. ANALYZE WITH CLAUDE VISION (if image)
    // =========================================================================

    let visionAnalysis = null
    let ocrText = null

    if (file.type.startsWith('image/')) {
      try {
        console.log('[attachments] Starting Claude Vision analysis:', analysisType)

        if (analysisType === 'passport') {
          visionAnalysis = await analyzePassport(publicUrl)
          ocrText = JSON.stringify(visionAnalysis.passportData)
          console.log('[attachments] Passport OCR complete:', {
            hasPassportData: !!visionAnalysis.passportData,
            passportNumber: visionAnalysis.passportData?.passportNumber,
          })
        } else if (analysisType === 'location') {
          visionAnalysis = await recognizeLocation(publicUrl)
          ocrText = visionAnalysis.description
          console.log('[attachments] Location recognition complete:', {
            location: visionAnalysis.location,
          })
        } else if (analysisType === 'general' && customPrompt) {
          visionAnalysis = await analyzeImage(publicUrl, customPrompt, 'general')
          ocrText = visionAnalysis.description
          console.log('[attachments] General analysis complete')
        }

        console.log('[attachments] Vision analysis duration:', {
          ms: Date.now() - startTime,
        })
      } catch (visionError) {
        console.error('[attachments] Vision API error (continuing without analysis):', visionError)
        // Continue without vision analysis - file is already uploaded
        visionAnalysis = {
          description: 'Análisis no disponible',
          confidence: 0,
          rawResponse: visionError instanceof Error ? visionError.message : 'Error desconocido',
        }
      }
    } else {
      console.log('[attachments] Skipping vision analysis (not an image)')
    }

    // =========================================================================
    // 8. SAVE ATTACHMENT METADATA TO DATABASE
    // =========================================================================

    const { data: attachment, error: dbError } = await supabase
      .from('conversation_attachments')
      .insert({
        conversation_id: conversationId,
        file_type: file.type.startsWith('image/') ? 'image' : 'document',
        file_url: publicUrl,
        file_size_bytes: file.size,
        mime_type: file.type,
        original_filename: file.name,
        ocr_text: ocrText,
        vision_analysis: visionAnalysis,
        analysis_type: analysisType,
        confidence_score: visionAnalysis?.confidence || null,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[attachments] Database error:', dbError)
      // Note: File is already uploaded, but metadata failed
      return NextResponse.json(
        {
          error: 'Error al guardar metadata',
          details: dbError.message,
          fileUrl: publicUrl, // Return URL even if metadata failed
        },
        { status: 500 }
      )
    }

    // =========================================================================
    // 9. SUCCESS RESPONSE
    // =========================================================================

    const duration = Date.now() - startTime

    console.log('[attachments] POST success:', {
      attachment_id: attachment.id,
      file_name: fileName,
      file_size: file.size,
      analysis_type: analysisType,
      has_vision: !!visionAnalysis,
      duration_ms: duration,
    })

    return NextResponse.json(
      {
        success: true,
        attachment: {
          id: attachment.id,
          file_url: attachment.file_url,
          file_type: attachment.file_type,
          file_size_bytes: attachment.file_size_bytes,
          original_filename: attachment.original_filename,
          created_at: attachment.created_at,
        },
        visionAnalysis,
        metadata: {
          duration_ms: duration,
          guest: session.guest_name,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[attachments] POST error:', error)
    return NextResponse.json(
      {
        error: 'Error del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/guest/conversations/:id/attachments
 *
 * List all attachments for a conversation
 *
 * Response:
 *   - 200: { attachments: [...] }
 *   - 401: Unauthorized
 *   - 403: Forbidden
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params

    // Authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticación requerido' },
        { status: 401 }
      )
    }

    const session = await verifyGuestToken(token)
    if (!session) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      )
    }

    // Verify conversation ownership
    const supabase = createServerClient()

    const { data: conversation, error: convError } = await supabase
      .from('guest_conversations')
      .select('guest_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      )
    }

    if (conversation.guest_id !== session.reservation_id) {
      return NextResponse.json(
        { error: 'No tienes permiso para esta conversación' },
        { status: 403 }
      )
    }

    // Fetch attachments
    const { data: attachments, error } = await supabase
      .from('conversation_attachments')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[attachments] GET error:', error)
      return NextResponse.json(
        { error: 'Error al obtener archivos' },
        { status: 500 }
      )
    }

    console.log('[attachments] GET success:', {
      conversation_id: conversationId,
      count: attachments?.length || 0,
    })

    return NextResponse.json({
      attachments: attachments || [],
      count: attachments?.length || 0,
    })
  } catch (error) {
    console.error('[attachments] GET error:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}
