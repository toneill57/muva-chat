/**
 * Super Admin Compliance Monitoring Endpoint
 *
 * Provides SIRE compliance status for all tenants based on submission history.
 * Protected by superAdminMiddleware (JWT authentication required).
 *
 * GET /api/super-admin/compliance
 * Response: {
 *   tenants: Array<{
 *     tenant_id: string,
 *     subdomain: string,
 *     nombre_comercial: string,
 *     last_submission: string | null,
 *     submissions_30d: number,
 *     total_reservations: number,
 *     status: 'compliant' | 'warning' | 'overdue' | 'never_submitted',
 *     days_since_last: number | null
 *   }>,
 *   summary: {
 *     total_tenants: number,
 *     compliant: number,
 *     warning: number,
 *     overdue: number,
 *     never_submitted: number,
 *     compliance_rate: number
 *   }
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

    // Fetch all SIRE submissions with tenant data
    const { data: submissions, error: submissionsError } = await supabase
      .from('sire_submissions')
      .select(`
        submission_id,
        tenant_id,
        submission_date,
        status,
        reservations_count,
        tenant_registry!inner (
          subdomain,
          nombre_comercial
        )
      `)
      .order('submission_date', { ascending: false })

    if (submissionsError) {
      console.error('[api/super-admin/compliance] Error fetching submissions:', submissionsError)
      return NextResponse.json(
        { error: 'Failed to fetch compliance data', details: submissionsError.message },
        { status: 500 }
      )
    }

    // Get all tenants to include those with no submissions
    const { data: allTenants, error: tenantsError } = await supabase
      .from('tenant_registry')
      .select('tenant_id, subdomain, nombre_comercial')
      .order('nombre_comercial', { ascending: true })

    if (tenantsError) {
      console.error('[api/super-admin/compliance] Error fetching tenants:', tenantsError)
      return NextResponse.json(
        { error: 'Failed to fetch tenants', details: tenantsError.message },
        { status: 500 }
      )
    }

    // Calculate stats per tenant
    const tenantStatsMap = new Map()

    // Initialize all tenants
    allTenants?.forEach(tenant => {
      tenantStatsMap.set(tenant.tenant_id, {
        tenant_id: tenant.tenant_id,
        subdomain: tenant.subdomain,
        nombre_comercial: tenant.nombre_comercial,
        last_submission: null,
        submissions_30d: 0,
        total_reservations: 0,
        status: 'never_submitted',
        days_since_last: null
      })
    })

    // Aggregate submission data
    submissions?.forEach(sub => {
      const tenantId = sub.tenant_id
      const stats = tenantStatsMap.get(tenantId)

      if (!stats) {
        // Tenant exists in submissions but not in tenant_registry (shouldn't happen with FK)
        return
      }

      // Update last submission (already ordered by date desc, so first one is most recent)
      if (!stats.last_submission) {
        stats.last_submission = sub.submission_date
      }

      // Count submissions in last 30 days
      const daysSince = (Date.now() - new Date(sub.submission_date).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince <= 30) {
        stats.submissions_30d++
        stats.total_reservations += sub.reservations_count || 0
      }
    })

    // Calculate status and days since last submission
    const tenantStats = Array.from(tenantStatsMap.values()).map(tenant => {
      if (tenant.last_submission) {
        const daysSince = (Date.now() - new Date(tenant.last_submission).getTime()) / (1000 * 60 * 60 * 24)
        tenant.days_since_last = Math.floor(daysSince)

        // Status logic:
        // - compliant: ≤20 days since last submission
        // - warning: 21-30 days
        // - overdue: >30 days
        if (daysSince <= 20) {
          tenant.status = 'compliant'
        } else if (daysSince <= 30) {
          tenant.status = 'warning'
        } else {
          tenant.status = 'overdue'
        }
      }
      // else status remains 'never_submitted' and days_since_last remains null

      return tenant
    })

    // Calculate summary metrics
    const summary = {
      total_tenants: tenantStats.length,
      compliant: tenantStats.filter(t => t.status === 'compliant').length,
      warning: tenantStats.filter(t => t.status === 'warning').length,
      overdue: tenantStats.filter(t => t.status === 'overdue').length,
      never_submitted: tenantStats.filter(t => t.status === 'never_submitted').length,
      compliance_rate: tenantStats.length > 0
        ? Math.round((tenantStats.filter(t => t.status === 'compliant').length / tenantStats.length) * 100)
        : 0
    }

    console.log('[api/super-admin/compliance] ✅ Compliance summary:', {
      total: summary.total_tenants,
      compliant: summary.compliant,
      compliance_rate: `${summary.compliance_rate}%`
    })

    return NextResponse.json({
      tenants: tenantStats,
      summary
    })

  } catch (error) {
    console.error('[api/super-admin/compliance] Unexpected error:', error)
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
