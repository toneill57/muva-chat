import { NextResponse } from 'next/server'
import { MotoPresSyncManager } from '@/lib/integrations/motopress/sync-manager'
import { requireAdminAuth } from '@/lib/admin-auth'

interface SyncRequest {
  tenant_id: string
  selected_ids?: number[]  // For selective import
  force_embeddings?: boolean  // Force regeneration of embeddings
}

export async function POST(request: Request) {
  try {
    // ✅ Admin authentication required
    const { response: authError, session } = await requireAdminAuth(request)
    if (authError) return authError

    const { tenant_id, selected_ids, force_embeddings }: SyncRequest = await request.json()

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'Missing tenant_id' },
        { status: 400 }
      )
    }

    // Verify admin belongs to this tenant
    if (session!.tenant_id !== tenant_id) {
      return NextResponse.json(
        { error: 'Access denied. Cannot sync data for another tenant.' },
        { status: 403 }
      )
    }

    const syncManager = new MotoPresSyncManager()
    let result

    if (selected_ids && selected_ids.length > 0) {
      console.log(`Starting selective MotoPress import for tenant: ${tenant_id}, ${selected_ids.length} accommodations, force_embeddings: ${force_embeddings}`)
      result = await syncManager.syncSelectedAccommodations(tenant_id, selected_ids, force_embeddings || false)
    } else {
      console.log(`Starting full MotoPress sync for tenant: ${tenant_id}, force_embeddings: ${force_embeddings}`)
      result = await syncManager.syncAccommodations(tenant_id, force_embeddings || false)
    }

    console.log('Sync result:', {
      success: result.success,
      message: result.message,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
      totalProcessed: result.totalProcessed
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          created: result.created,
          updated: result.updated,
          total_processed: result.totalProcessed,
          embeddings_generated: result.embeddings_generated,
          embeddings_failed: result.embeddings_failed,
          embeddings_skipped: result.embeddings_skipped,
          errors: result.errors
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        data: {
          created: result.created,
          updated: result.updated,
          total_processed: result.totalProcessed,
          embeddings_generated: result.embeddings_generated,
          embeddings_failed: result.embeddings_failed,
          embeddings_skipped: result.embeddings_skipped,
          errors: result.errors
        }
      }, { status: 422 })
    }

  } catch (error: any) {
    console.error('Error in sync endpoint:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tenant_id = searchParams.get('tenant_id')
  const token = searchParams.get('token')

  // If no tenant_id, return error
  if (!tenant_id) {
    return NextResponse.json(
      { error: 'Missing tenant_id parameter' },
      { status: 400 }
    )
  }

  // If token is provided, this is an SSE sync request
  if (token) {
    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          console.log('[sync] Starting SSE sync for tenant:', tenant_id)

          // Verify token
          const { session } = await requireAdminAuth(request)
          if (!session || session.tenant_id !== tenant_id) {
            sendEvent({ type: 'error', message: 'Authentication failed' })
            controller.close()
            return
          }

          sendEvent({ type: 'progress', current: 0, total: 0, message: 'Iniciando sincronización...' })

          const syncManager = new MotoPresSyncManager()

          // Get force_embeddings from query param
          const force_embeddings = searchParams.get('force_embeddings') === 'true'

          // Sync with progress callback
          const result = await syncManager.syncAccommodationsWithProgress(
            tenant_id,
            force_embeddings,
            (current: number, total: number, message: string) => {
              sendEvent({ type: 'progress', current, total, message })
            }
          )

          // Send completion event
          if (result.success) {
            sendEvent({
              type: 'complete',
              message: result.message,
              data: {
                created: result.created,
                updated: result.updated,
                total_processed: result.totalProcessed,
                embeddings_generated: result.embeddings_generated,
                errors: result.errors
              }
            })
          } else {
            sendEvent({
              type: 'error',
              message: result.message,
              data: {
                errors: result.errors
              }
            })
          }

          controller.close()
        } catch (error: any) {
          console.error('[sync] SSE error:', error)
          sendEvent({ type: 'error', message: error.message || 'Internal error' })
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  // Otherwise, return sync history (original GET behavior)
  try {
    const { response: authError, session } = await requireAdminAuth(request)
    if (authError) return authError

    if (session!.tenant_id !== tenant_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const syncManager = new MotoPresSyncManager()
    const history = await syncManager.getSyncHistory(tenant_id, 10)
    const lastSync = await syncManager.getLastSyncStatus(tenant_id)

    return NextResponse.json({
      last_sync: lastSync,
      history,
      count: history.length
    })
  } catch (error: any) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}