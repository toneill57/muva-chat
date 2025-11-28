/**
 * Super Admin Integration Logs Endpoint
 *
 * Fetches sync history logs for a specific integration.
 * Protected by superAdminMiddleware (JWT authentication required).
 *
 * GET /api/super-admin/integrations/[id]/logs
 * Parameters:
 *   - id: integration_config.id (UUID)
 *
 * Response: {
 *   logs: Array<SyncHistory>
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { superAdminMiddleware } from '@/lib/middleware-super-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify super admin authentication
  const authResult = await superAdminMiddleware(request)

  // If middleware returns a response (error), return it
  if (authResult instanceof NextResponse && authResult.status !== 200) {
    return authResult
  }

  try {
    const supabase = createServerClient()
    const { id: integrationId } = await params

    // First, fetch the integration config to get tenant_id and integration_type
    const { data: integration, error: integrationError } = await supabase
      .from('integration_configs')
      .select('id, tenant_id, integration_type')
      .eq('id', integrationId)
      .single()

    if (integrationError) {
      console.error('[api/super-admin/integrations/logs] Error fetching integration:', integrationError)

      // Return empty logs if integration not found (not an error condition)
      if (integrationError.code === 'PGRST116') {
        return NextResponse.json({ logs: [] })
      }

      return NextResponse.json(
        { error: 'Failed to fetch integration', details: integrationError.message },
        { status: 500 }
      )
    }

    // Fetch sync history for this integration (matched by tenant_id + integration_type)
    const { data: logs, error: logsError } = await supabase
      .from('sync_history')
      .select('*')
      .eq('tenant_id', integration.tenant_id)
      .eq('integration_type', integration.integration_type)
      .order('started_at', { ascending: false })
      .limit(50)

    if (logsError) {
      console.error('[api/super-admin/integrations/logs] Error fetching sync logs:', logsError)
      return NextResponse.json(
        { error: 'Failed to fetch sync logs', details: logsError.message },
        { status: 500 }
      )
    }

    console.log(`[api/super-admin/integrations/logs] ✅ Fetched ${logs?.length || 0} logs for integration ${integrationId}`)

    return NextResponse.json({ logs: logs || [] })

  } catch (error) {
    console.error('[api/super-admin/integrations/logs] Unexpected error:', error)
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
