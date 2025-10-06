/**
 * Delete Old Archived Conversations Cron Job
 *
 * Permanently deletes archived conversations older than 90 days.
 * Runs daily via VPS crontab.
 *
 * Usage: Called by /api/cron/conversation-cleanup
 */

import { getConversationsToDelete, deleteConversation } from '../guest-conversation-memory'

export interface DeleteResult {
  success: boolean
  deleted: number
  failed: number
  errors: string[]
}

/**
 * Delete all archived conversations (90+ days)
 *
 * @param tenantId - Optional: Filter by tenant
 * @returns DeleteResult
 */
export async function deleteOldArchivedConversations(tenantId?: string): Promise<DeleteResult> {
  console.log('[cron-delete] Starting delete job...')

  const result: DeleteResult = {
    success: true,
    deleted: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Get conversations that need deletion
    const conversationIds = await getConversationsToDelete(tenantId)

    console.log('[cron-delete] Found', conversationIds.length, 'conversations to delete')

    if (conversationIds.length === 0) {
      console.log('[cron-delete] No conversations to delete')
      return result
    }

    // Delete each conversation (CASCADE will delete messages + attachments)
    for (const conversationId of conversationIds) {
      try {
        const deleted = await deleteConversation(conversationId)

        if (deleted) {
          result.deleted++
        } else {
          result.failed++
          result.errors.push(`Failed to delete: ${conversationId}`)
        }
      } catch (error) {
        result.failed++
        result.errors.push(`Error deleting ${conversationId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log('[cron-delete] Delete job completed:', {
      deleted: result.deleted,
      failed: result.failed,
    })

    return result
  } catch (error) {
    console.error('[cron-delete] Delete job failed:', error)

    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')

    return result
  }
}
