import { NextRequest, NextResponse } from 'next/server'
import { extractTokenFromHeader, verifyGuestToken } from '@/lib/guest-auth'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/guest/chat/history
 *
 * Retrieves chat message history for a guest conversation
 *
 * Query params: conversation_id
 * Headers: Authorization: Bearer <token>
 * Response: { messages: GuestChatMessage[], total: number }
 */
export async function GET(request: NextRequest) {
  try {
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

    // 2. Get conversation_id from query params
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversation_id')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id es requerido' },
        { status: 400 }
      )
    }

    // 3. Fetch messages from database
    const supabase = createServerClient()

    // 3.1 Verify conversation belongs to this guest (support multi-conversation)
    const { data: conversation, error: convError } = await supabase
      .from('guest_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('guest_id', session.reservation_id)
      .single()

    // If conversation not found in guest_conversations, fallback to legacy check
    // (for backwards compatibility with old single-conversation system)
    if (convError || !conversation) {
      // Check if it's the legacy conversation_id from session
      if (conversationId !== session.conversation_id) {
        return NextResponse.json(
          { error: 'Acceso no autorizado a esta conversación' },
          { status: 403 }
        )
      }
    }

    // 4. Fetch messages from database

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at, metadata')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100) // Last 100 messages

    if (error) {
      console.error('[chat-history] Database error:', error)
      return NextResponse.json(
        { error: 'Error al cargar el historial' },
        { status: 500 }
      )
    }

    // 5. Format messages to include entities from metadata
    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      created_at: msg.created_at,
      entities: msg.metadata?.entities || [],
    }))

    return NextResponse.json({
      messages: formattedMessages,
      total: formattedMessages.length,
    }, { status: 200 })

  } catch (error) {
    console.error('[chat-history] Error:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}
