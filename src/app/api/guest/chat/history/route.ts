import { NextRequest, NextResponse } from 'next/server'
import { extractTokenFromHeader, verifyGuestToken } from '@/lib/guest-auth'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/guest/chat/history
 *
 * Retrieves chat message history for a guest conversation
 *
 * Query params: conversation_id (OPTIONAL - if not provided, returns all messages for guest)
 * Headers: Authorization: Bearer <token>
 * Response: { messages: GuestChatMessage[], total: number }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify authentication (cookie or header)
    const cookieToken = request.cookies.get('guest_token')?.value
    const authHeader = request.headers.get('authorization')
    const headerToken = extractTokenFromHeader(authHeader)
    const token = cookieToken || headerToken

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

    // 2. Get conversation_id from query params (OPTIONAL for backward compatibility)
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversation_id')

    // 3. Fetch messages from database
    const supabase = createServerClient()

    // 4. Build query based on whether conversation_id is provided
    let query = supabase
      .from('chat_messages')
      .select('id, role, content, created_at, metadata')

    if (conversationId) {
      // Filter by specific conversation_id
      console.log('[chat-history] Fetching messages for conversation:', conversationId)

      // Verify conversation belongs to this guest (support multi-conversation)
      const { data: conversation, error: convError } = await supabase
        .from('guest_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('guest_id', session.reservation_id)
        .single()

      // Conversation not found or access denied
      if (convError || !conversation) {
        return NextResponse.json(
          { error: 'Acceso no autorizado a esta conversación' },
          { status: 403 }
        )
      }

      query = query.eq('conversation_id', conversationId)
    } else {
      // No conversation_id provided - return empty array
      // (conversation_id is now required for multi-conversation system)
      console.warn('[chat-history] No conversation_id provided - returning empty array')
      return NextResponse.json({
        messages: [],
        total: 0,
      }, { status: 200 })
    }

    // 5. Execute query
    const { data: messages, error } = await query
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
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('[chat-history] Error:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}
