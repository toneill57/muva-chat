import { NextResponse } from 'next/server'
import { MotoPresSyncManager } from '@/lib/integrations/motopress/sync-manager'
import { requireAdminAuth } from '@/lib/admin-auth'

interface SyncRequest {
  tenant_id: string
  selected_ids?: number[]  // For selective import
}

export async function POST(request: Request) {
  try {
    // ✅ Admin authentication required
    const { response: authError, session } = await requireAdminAuth(request)
    if (authError) return authError

    const { tenant_id, selected_ids }: SyncRequest = await request.json()

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
      console.log(`Starting selective MotoPress import for tenant: ${tenant_id}, ${selected_ids.length} accommodations`)
      result = await syncManager.syncSelectedAccommodations(tenant_id, selected_ids)
    } else {
      console.log(`Starting full MotoPress sync for tenant: ${tenant_id}`)
      result = await syncManager.syncAccommodations(tenant_id)
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
  try {
    // ✅ Admin authentication required
    const { response: authError, session } = await requireAdminAuth(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const tenant_id = searchParams.get('tenant_id')

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'Missing tenant_id parameter' },
        { status: 400 }
      )
    }

    // Verify admin belongs to this tenant
    if (session!.tenant_id !== tenant_id) {
      return NextResponse.json(
        { error: 'Access denied. Cannot view sync history for another tenant.' },
        { status: 403 }
      )
    }

    const syncManager = new MotoPresSyncManager()

    // Get sync history
    const history = await syncManager.getSyncHistory(tenant_id, 10)

    // Get last sync status
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