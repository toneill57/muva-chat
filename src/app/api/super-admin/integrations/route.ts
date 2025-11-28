/**
 * Super Admin Integrations Monitor Endpoint
 *
 * Provides list view of all integrations (MotoPress/Airbnb) with sync status.
 * Protected by superAdminMiddleware (JWT authentication required).
 *
 * GET /api/super-admin/integrations
 * Query Parameters:
 *   - type: "motopress" | "airbnb" (filter by integration type)
 *   - status: "error" | "synced" | "never_synced" (filter by computed sync status)
 *   - tenant: string (filter by tenant_id)
 *
 * Response: {
 *   integrations: Array<IntegrationStatus>,
 *   total: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { superAdminMiddleware } from '@/lib/middleware-super-admin'

export async function GET(request: NextRequest) {
  // Verify super admin authentication
  const authResult = await superAdminMiddleware(request)

  // If middleware returns a response (error), return it
  if (authResult instanceof NextResponse && authResult.status !== 200) {
    return authResult
  }

  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const filterType = searchParams.get('type') // 'motopress' | 'airbnb'
    const filterStatus = searchParams.get('status') // 'error' | 'synced' | 'never_synced'
    const tenant = searchParams.get('tenant') // tenant_id

    // Start building query for integration_configs
    let query = supabase
      .from('integration_configs')
      .select(`
        id,
        tenant_id,
        integration_type,
        is_active,
        last_sync_at,
        created_at,
        updated_at,
        tenant_registry!inner(
          tenant_id,
          nombre_comercial,
          subdomain
        )
      `)
      .order('created_at', { ascending: false })

    // Apply integration type filter
    if (filterType) {
      query = query.eq('integration_type', filterType)
    }

    // Apply tenant filter
    if (tenant) {
      query = query.eq('tenant_id', tenant)
    }

    const { data: integrations, error: integrationsError } = await query

    if (integrationsError) {
      console.error('[api/super-admin/integrations] Error fetching integrations:', integrationsError)
      return NextResponse.json(
        { error: 'Failed to fetch integrations', details: integrationsError.message },
        { status: 500 }
      )
    }

    // For each integration, fetch sync history
    const enrichedData = await Promise.all(
      (integrations || []).map(async (integration: any) => {
        // Fetch sync history for this integration
        const { data: syncHistory, error: syncError } = await supabase
          .from('sync_history')
          .select('*')
          .eq('tenant_id', integration.tenant_id)
          .eq('integration_type', integration.integration_type)
          .order('started_at', { ascending: false })
          .limit(50)

        if (syncError) {
          console.error(`[api/super-admin/integrations] Error fetching sync history for ${integration.id}:`, syncError)
        }

        // Calculate sync status
        const sortedSyncs = syncHistory || []
        const lastSync = sortedSyncs[0] // Most recent
        const errorCount = sortedSyncs.filter(
          (sync: any) => sync.status === 'error' || sync.status === 'failed'
        ).length

        let status: 'synced' | 'error' | 'never_synced' = 'never_synced'
        if (lastSync) {
          status = (lastSync.status === 'completed' || lastSync.status === 'success') ? 'synced' : 'error'
        }

        return {
          integration_id: integration.id,
          tenant_id: integration.tenant_id,
          tenant_name: integration.tenant_registry?.nombre_comercial || 'Unknown',
          subdomain: integration.tenant_registry?.subdomain || 'unknown',
          provider: integration.integration_type,
          status,
          last_sync: lastSync?.started_at || integration.last_sync_at || null,
          last_sync_status: lastSync?.status || null,
          records_synced: lastSync?.records_processed || 0,
          error_count: errorCount,
          error_message: lastSync?.error_message || null,
          is_active: integration.is_active,
          created_at: integration.created_at,
          updated_at: integration.updated_at
        }
      })
    )

    // Apply status filter (after enriching)
    let filteredData = enrichedData
    if (filterStatus === 'error') {
      filteredData = enrichedData.filter(i => i.status === 'error')
    } else if (filterStatus === 'synced') {
      filteredData = enrichedData.filter(i => i.status === 'synced')
    } else if (filterStatus === 'never_synced') {
      filteredData = enrichedData.filter(i => i.status === 'never_synced')
    }

    console.log(`[api/super-admin/integrations] ✅ Fetched ${filteredData.length} integrations`)

    return NextResponse.json({
      integrations: filteredData,
      total: filteredData.length
    })

  } catch (error) {
    console.error('[api/super-admin/integrations] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Only allow GET requests
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
