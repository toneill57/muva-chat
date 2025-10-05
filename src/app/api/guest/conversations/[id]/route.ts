import { NextRequest, NextResponse } from 'next/server'
import { extractTokenFromHeader, verifyGuestToken } from '@/lib/guest-auth'
import { createServerClient } from '@/lib/supabase'

/**
 * PUT /api/guest/conversations/[id]
 *
 * Updates a conversation title
 *
 * Request body: { title: string }
 * Headers: Authorization: Bearer <token>
 * Response: { id, guest_id, tenant_id, title, last_message, created_at, updated_at }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 15
    const resolvedParams = await params
    // 1. Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)

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

    // 2. Parse request body
    const body = await request.json()
    const { title } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'El título es requerido' },
        { status: 400 }
      )
    }

    // Validate title length
    const validatedTitle = title.substring(0, 200)

    // 3. Update conversation in database (RLS verifies ownership)
    const supabase = createServerClient()

    const { data: conversation, error: dbError } = await supabase
      .from('guest_conversations')
      .update({
        title: validatedTitle
      })
      .eq('id', resolvedParams.id)
      .eq('guest_id', session.reservation_id)  // Ensure ownership
      .select()
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        // No rows updated (conversation not found or not owned by user)
        return NextResponse.json(
          { error: 'Conversación no encontrada' },
          { status: 404 }
        )
      }

      console.error('[guest-conversations] Error updating conversation:', dbError)
      return NextResponse.json(
        { error: 'No se pudo actualizar la conversación' },
        { status: 500 }
      )
    }

    // 4. Return updated conversation
    console.log('[guest-conversations] Updated conversation:', {
      id: resolvedParams.id,
      guest: session.guest_name,
      new_title: validatedTitle,
    })

    return NextResponse.json(conversation)

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
 * Deletes a conversation (cascade deletes messages)
 *
 * Headers: Authorization: Bearer <token>
 * Response: { success: true, message: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 15
    const resolvedParams = await params
    // 1. Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)

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

    // 2. Delete conversation (RLS + CASCADE deletes related messages)
    const supabase = createServerClient()

    const { error: dbError } = await supabase
      .from('guest_conversations')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('guest_id', session.reservation_id)  // Ensure ownership

    if (dbError) {
      console.error('[guest-conversations] Error deleting conversation:', dbError)
      return NextResponse.json(
        { error: 'No se pudo eliminar la conversación' },
        { status: 500 }
      )
    }

    // 3. Return success (even if 0 rows deleted, no error thrown)
    console.log('[guest-conversations] Deleted conversation:', {
      id: resolvedParams.id,
      guest: session.guest_name,
    })

    return NextResponse.json({
      success: true,
      message: 'Conversación eliminada'
    })

  } catch (error) {
    console.error('[guest-conversations] DELETE error:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}
