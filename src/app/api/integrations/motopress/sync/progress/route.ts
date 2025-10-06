import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

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
        { error: 'Access denied. Cannot view sync progress for another tenant.' },
        { status: 403 }
      )
    }

    const supabase = createServerClient()

    // Get the most recent sync history entry for this tenant
    const { data: lastSync, error: syncError } = await supabase
      .from('sync_history')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('integration_type', 'motopress')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (syncError && syncError.code !== 'PGRST116') {
      console.error('Error fetching sync progress:', syncError)
      return NextResponse.json(
        { error: 'Failed to fetch sync progress' },
        { status: 500 }
      )
    }

    // If no sync history exists
    if (!lastSync) {
      return NextResponse.json({
        status: 'no_sync',
        message: 'No sync operations found for this tenant',
        progress: {
          current: 0,
          total: 0,
          percentage: 0
        },
        last_sync_at: null
      })
    }

    // Calculate progress based on sync status
    let progress = {
      current: lastSync.records_created + lastSync.records_updated,
      total: lastSync.records_processed,
      percentage: 0
    }

    if (lastSync.records_processed > 0) {
      progress.percentage = Math.round(
        ((lastSync.records_created + lastSync.records_updated) / lastSync.records_processed) * 100
      )
    }

    // Determine current status
    let currentStatus = lastSync.status
    let message = 'Sync operation status'

    switch (lastSync.status) {
      case 'success':
        message = `Successfully synced ${progress.current} accommodations`
        progress.percentage = 100
        break
      case 'partial_success':
        message = `Partially synced ${progress.current}/${progress.total} accommodations with some errors`
        break
      case 'error':
        message = `Sync failed: ${lastSync.error_message}`
        progress.percentage = 0
        break
      case 'in_progress':
        message = `Sync in progress: ${progress.current}/${progress.total} accommodations processed`
        break
      default:
        message = `Sync status: ${lastSync.status}`
    }

    return NextResponse.json({
      status: currentStatus,
      message,
      progress,
      last_sync_at: lastSync.completed_at || lastSync.started_at,
      sync_details: {
        sync_type: lastSync.sync_type,
        records_created: lastSync.records_created,
        records_updated: lastSync.records_updated,
        records_processed: lastSync.records_processed,
        error_message: lastSync.error_message,
        duration_ms: lastSync.metadata?.duration_ms
      }
    })

  } catch (error: any) {
    console.error('Error in sync progress endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}