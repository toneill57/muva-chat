import { NextRequest, NextResponse } from 'next/server'
import { extractTokenFromHeader, verifyGuestToken } from '@/lib/guest-auth'
import { createServerClient } from '@/lib/supabase'

/**
 * POST /api/guest/conversations
 *
 * Creates a new conversation for the authenticated guest
 *
 * Request body: { title?: string }
 * Headers: Authorization: Bearer <token>
 * Response: { id, guest_id, tenant_id, title, last_message, created_at, updated_at }
 */
export async function POST(request: NextRequest) {
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

    // 2. Parse request body
    const body = await request.json().catch(() => ({}))
    const { title = 'Nueva conversación' } = body

    // Validate title length
    const validatedTitle = typeof title === 'string'
      ? title.substring(0, 200)
      : 'Nueva conversación'

    // 3. Extract tenant_id from session
    const tenantId = session.tenant_id

    // 4. Create conversation in database
    const supabase = createServerClient()

    const { data: conversation, error: dbError } = await supabase
      .from('guest_conversations')
      .insert({
        guest_id: session.reservation_id,
        tenant_id: tenantId,
        title: validatedTitle,
        last_message: null,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[guest-conversations] Error creating conversation:', dbError)
      return NextResponse.json(
        { error: 'No se pudo crear la conversación' },
        { status: 500 }
      )
    }

    // 5. Return created conversation
    console.log('[guest-conversations] Created conversation:', {
      id: conversation.id,
      guest: session.guest_name,
      tenant: tenantId,
      title: validatedTitle,
    })

    return NextResponse.json(conversation, { status: 201 })

  } catch (error) {
    console.error('[guest-conversations] POST error:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/guest/conversations
 *
 * Lists all conversations for the authenticated guest
 *
 * Headers: Authorization: Bearer <token>
 * Response: { conversations: [...], total: number }
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

    // 2. Query conversations for this guest (RLS automatically filters by guest_id)
    const supabase = createServerClient()

    const { data: conversations, error: dbError } = await supabase
      .from('guest_conversations')
      .select('*')
      .eq('guest_id', session.reservation_id)
      .order('updated_at', { ascending: false })

    if (dbError) {
      console.error('[guest-conversations] Error fetching conversations:', dbError)
      return NextResponse.json(
        { error: 'No se pudieron cargar las conversaciones' },
        { status: 500 }
      )
    }

    // 3. Return conversations
    console.log('[guest-conversations] Fetched conversations:', {
      guest: session.guest_name,
      count: conversations?.length || 0,
    })

    return NextResponse.json({
      conversations: conversations || [],
      total: conversations?.length || 0,
    })

  } catch (error) {
    console.error('[guest-conversations] GET error:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}
