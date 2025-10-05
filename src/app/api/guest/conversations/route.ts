/**
 * Guest Conversations API
 *
 * POST /api/guest/conversations - Create new conversation
 * GET /api/guest/conversations - List all conversations for guest
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyGuestToken } from '@/lib/guest-auth'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/guest/conversations
 *
 * List all conversations for the authenticated guest
 *
 * Headers: Authorization: Bearer <token>
 * Response: { conversations: GuestConversation[], total: number }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Extract and verify token
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

    // 2. Fetch conversations from database
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('guest_conversations')
      .select('id, title, last_message, created_at, updated_at')
      .eq('guest_id', session.reservation_id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[guest-conversations] Database error:', error)
      return NextResponse.json(
        { error: 'Error al cargar conversaciones' },
        { status: 500 }
      )
    }

    console.log('[guest-conversations] GET:', {
      guest: session.guest_name,
      total: data?.length || 0,
    })

    return NextResponse.json({
      conversations: data || [],
      total: data?.length || 0,
    }, { status: 200 })

  } catch (error) {
    console.error('[guest-conversations] GET error:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/guest/conversations
 *
 * Create a new conversation for the authenticated guest
 *
 * Headers: Authorization: Bearer <token>
 * Body: { title?: string }
 * Response: { conversation: GuestConversation }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Extract and verify token
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

    // 2. Parse request body
    const body = await request.json()
    const { title } = body

    // Generate default title if not provided
    const conversationTitle = title?.trim() ||
      `Conversación ${new Date().toLocaleString('es-CO', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`

    // 3. Create conversation in database
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('guest_conversations')
      .insert({
        guest_id: session.reservation_id,
        tenant_id: session.tenant_id,
        title: conversationTitle,
        last_message: '',
      })
      .select()
      .single()

    if (error) {
      console.error('[guest-conversations] Create error:', error)
      return NextResponse.json(
        { error: 'Error al crear conversación' },
        { status: 500 }
      )
    }

    console.log('[guest-conversations] POST:', {
      guest: session.guest_name,
      conversation_id: data.id,
      title: conversationTitle,
    })

    return NextResponse.json({
      conversation: data,
    }, { status: 201 })

  } catch (error) {
    console.error('[guest-conversations] POST error:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}
