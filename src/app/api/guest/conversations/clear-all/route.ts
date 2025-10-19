import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * DELETE /api/guest/conversations/clear-all
 *
 * DEVELOPMENT ONLY - Clears all guest conversations and messages
 * Used during testing to start with a clean slate
 *
 * Security: Only works in development mode (NODE_ENV !== 'production')
 */
export async function DELETE(request: NextRequest) {
  try {
    // 🔒 SECURITY: Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development mode' },
        { status: 403 }
      )
    }

    console.log('[clear-all] 🗑️ Clearing all guest conversations and messages...')

    const supabase = createServerClient()

    // Step 1: Delete all messages first
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using impossible ID)

    if (messagesError) {
      console.error('[clear-all] Failed to delete messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to delete messages', details: messagesError.message },
        { status: 500 }
      )
    }

    // Step 2: Delete all conversations
    const { error: conversationsError } = await supabase
      .from('guest_conversations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using impossible ID)

    if (conversationsError) {
      console.error('[clear-all] Failed to delete conversations:', conversationsError)
      return NextResponse.json(
        { error: 'Failed to delete conversations', details: conversationsError.message },
        { status: 500 }
      )
    }

    // Step 3: Verify deletion
    const { count: messagesCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })

    const { count: conversationsCount } = await supabase
      .from('guest_conversations')
      .select('*', { count: 'exact', head: true })

    console.log('[clear-all] ✅ Cleanup complete')
    console.log(`[clear-all] - Messages remaining: ${messagesCount || 0}`)
    console.log(`[clear-all] - Conversations remaining: ${conversationsCount || 0}`)

    return NextResponse.json({
      success: true,
      message: 'All guest conversations and messages have been deleted',
      result: {
        messages_remaining: messagesCount || 0,
        conversations_remaining: conversationsCount || 0,
      },
    })
  } catch (error: any) {
    console.error('[clear-all] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
