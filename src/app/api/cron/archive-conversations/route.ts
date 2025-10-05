import { NextResponse } from 'next/server'
import {
  getConversationsToArchive,
  archiveConversation,
  getConversationsToDelete,
  deleteConversation,
} from '@/lib/guest-conversation-memory'

/**
 * Cron Job: Archive and Delete Old Conversations
 *
 * Schedule: Daily at 2am (VPS crontab)
 * Setup: scripts/cron/setup-archive-cron.sh
 *
 * Actions:
 * 1. Archive conversations inactive for 30+ days
 * 2. Delete conversations archived for 90+ days
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret (security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[cron-archive] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[cron-archive] Unauthorized cron attempt:', {
        provided_header: authHeader?.substring(0, 20) + '...',
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[cron-archive] Starting conversation archiving job...')

    // 1. Archive conversations (30+ days inactive)
    const conversationsToArchive = await getConversationsToArchive()
    let archivedCount = 0

    for (const conversationId of conversationsToArchive) {
      const success = await archiveConversation(conversationId)
      if (success) archivedCount++
    }

    console.log('[cron-archive] Archived conversations:', archivedCount)

    // 2. Delete conversations (archived 90+ days ago)
    const conversationsToDelete = await getConversationsToDelete()
    let deletedCount = 0

    for (const conversationId of conversationsToDelete) {
      const success = await deleteConversation(conversationId)
      if (success) deletedCount++
    }

    console.log('[cron-archive] Deleted conversations:', deletedCount)

    return NextResponse.json({
      success: true,
      archived: archivedCount,
      deleted: deletedCount,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[cron-archive] Job failed:', error)
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
