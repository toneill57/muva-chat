/**
 * Guest Conversations API - Individual Conversation Operations
 *
 * PUT /api/guest/conversations/[id] - Update conversation title
 * DELETE /api/guest/conversations/[id] - Delete conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyGuestToken } from '@/lib/guest-auth'
import { createServerClient } from '@/lib/supabase'

/**
 * PUT /api/guest/conversations/[id]
 *
 * Update conversation title
 *
 * Headers: Authorization: Bearer <token>
 * Body: { title: string }
 * Response: { success: true, conversation: GuestConversation }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Get conversation ID from params
    const { id } = await params

    // 2. Extract and verify token
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

    // 3. Parse request body
    const body = await request.json()
    const { title } = body

    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'El título es requerido y no puede estar vacío' },
        { status: 400 }
      )
    }

    if (title.length > 255) {
      return NextResponse.json(
        { error: 'El título es demasiado largo (máximo 255 caracteres)' },
        { status: 400 }
      )
    }

    // 4. Update conversation in database
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('guest_conversations')
      .update({ title: title.trim() })
      .eq('id', id)
      .eq('guest_id', session.reservation_id) // Security: Only update own conversations
      .select()
      .single()

    if (error) {
      // Check if conversation not found or not owned by guest
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Conversación no encontrada o acceso no autorizado' },
          { status: 404 }
        )
      }

      console.error('[guest-conversations] Update error:', error)
      return NextResponse.json(
        { error: 'Error al actualizar conversación' },
        { status: 500 }
      )
    }

    console.log('[guest-conversations] PUT:', {
      guest: session.guest_name,
      conversation_id: id,
      new_title: title.trim(),
    })

    return NextResponse.json({
      success: true,
      conversation: data,
    }, { status: 200 })

  } catch (error) {
    console.error('[guest-conversations] PUT error:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/guest/conversations/[id]
 *
 * Delete conversation (CASCADE will delete associated messages)
 *
 * Headers: Authorization: Bearer <token>
 * Response: { success: true, deleted_id: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Get conversation ID from params
    const { id } = await params

    // 2. Extract and verify token
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

    // 3. Delete conversation from database
    const supabase = createServerClient()

    // First verify the conversation exists and belongs to the guest
    const { data: conversation, error: verifyError } = await supabase
      .from('guest_conversations')
      .select('id, title')
      .eq('id', id)
      .eq('guest_id', session.reservation_id)
      .single()

    if (verifyError || !conversation) {
      return NextResponse.json(
        { error: 'Conversación no encontrada o acceso no autorizado' },
        { status: 404 }
      )
    }

    // Delete the conversation (CASCADE will delete messages)
    const { error: deleteError } = await supabase
      .from('guest_conversations')
      .delete()
      .eq('id', id)
      .eq('guest_id', session.reservation_id)

    if (deleteError) {
      console.error('[guest-conversations] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar conversación' },
        { status: 500 }
      )
    }

    console.log('[guest-conversations] DELETE:', {
      guest: session.guest_name,
      conversation_id: id,
      title: conversation.title,
    })

    return NextResponse.json({
      success: true,
      deleted_id: id,
    }, { status: 200 })

  } catch (error) {
    console.error('[guest-conversations] DELETE error:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}
