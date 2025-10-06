/**
 * Archive Inactive Conversations Cron Job
 * 
 * Auto-archives conversations with no activity for 30+ days.
 * Runs daily via VPS crontab.
 * 
 * Usage: Called by /api/cron/conversation-cleanup
 */

import { getConversationsToArchive, archiveConversation } from '../guest-conversation-memory'

export interface ArchiveResult {
  success: boolean
  archived: number
  failed: number
  errors: string[]
}

/**
 * Archive all inactive conversations (30+ days)
 * 
 * @param tenantId - Optional: Filter by tenant
 * @returns ArchiveResult
 */
export async function archiveInactiveConversations(tenantId?: string): Promise<ArchiveResult> {
  console.log('[cron-archive] Starting archive job...')

  const result: ArchiveResult = {
    success: true,
    archived: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Get conversations that need archiving
    const conversationIds = await getConversationsToArchive(tenantId)

    console.log('[cron-archive] Found', conversationIds.length, 'conversations to archive')

    if (conversationIds.length === 0) {
      console.log('[cron-archive] No conversations to archive')
      return result
    }

    // Archive each conversation
    for (const conversationId of conversationIds) {
      try {
        const archived = await archiveConversation(conversationId)

        if (archived) {
          result.archived++
        } else {
          result.failed++
          result.errors.push(`Failed to archive: ${conversationId}`)
        }
      } catch (error) {
        result.failed++
        result.errors.push(`Error archiving ${conversationId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log('[cron-archive] Archive job completed:', {
      archived: result.archived,
      failed: result.failed,
    })

    return result
  } catch (error) {
    console.error('[cron-archive] Archive job failed:', error)

    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')

    return result
  }
}
