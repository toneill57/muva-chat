import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
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
        { error: 'Access denied. Cannot view status for another tenant.' },
        { status: 403 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // Get integration config
    const { data: config, error: configError } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('integration_type', 'motopress')
      .single()

    if (configError && configError.code !== 'PGRST116') {
      throw configError
    }

    // Get last sync info
    const { data: lastSync, error: syncError } = await supabase
      .from('sync_history')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('integration_type', 'motopress')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (syncError && syncError.code !== 'PGRST116') {
      console.warn('Could not fetch sync history:', syncError)
    }

    // Get accommodation count
    const { count: accommodationsCount, error: countError } = await supabase
      .from('accommodation_units')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .not('motopress_instance_id', 'is', null)

    if (countError) {
      console.warn('Could not count accommodations:', countError)
    }

    return NextResponse.json({
      is_configured: !!config,
      is_active: config?.is_active || false,
      last_sync_at: config?.last_sync_at || lastSync?.completed_at,
      accommodations_count: accommodationsCount || 0,
      last_sync_status: lastSync?.status || 'none',
      last_sync_records: {
        created: lastSync?.records_created || 0,
        updated: lastSync?.records_updated || 0,
        processed: lastSync?.records_processed || 0
      },
      last_sync_error: lastSync?.error_message
    })

  } catch (error: any) {
    console.error('Error fetching integration status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}