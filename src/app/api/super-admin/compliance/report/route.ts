/**
 * Super Admin Compliance Report Export Endpoint
 *
 * Exports all SIRE submissions as a CSV file for compliance tracking and auditing.
 * Protected by superAdminMiddleware (JWT authentication required).
 *
 * GET /api/super-admin/compliance/report
 * Response: CSV file download (text/csv)
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
    const { data: submissions, error } = await supabase
      .from('sire_submissions')
      .select(`
        submission_id,
        submission_date,
        status,
        reservations_count,
        created_at,
        tenant_registry!inner (
          nombre_comercial,
          subdomain
        )
      `)
      .order('submission_date', { ascending: false })

    if (error) {
      console.error('[api/super-admin/compliance/report] Error fetching submissions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch compliance report data', details: error.message },
        { status: 500 }
      )
    }

    // Generate CSV content
    const csvRows = [
      // Header row
      ['Tenant', 'Subdomain', 'Submission Date', 'Status', 'Reservations Count', 'Created At', 'Submission ID']
    ]

    // Data rows
    submissions?.forEach((sub: any) => {
      csvRows.push([
        sub.tenant_registry?.nombre_comercial || '',
        sub.tenant_registry?.subdomain || '',
        new Date(sub.submission_date).toISOString().split('T')[0], // YYYY-MM-DD format
        sub.status || '',
        String(sub.reservations_count || 0),
        new Date(sub.created_at).toISOString(),
        sub.submission_id || ''
      ])
    })

    // Convert to CSV string
    const csv = csvRows.map(row => {
      // Escape fields containing commas or quotes
      return row.map(field => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`
        }
        return field
      }).join(',')
    }).join('\n')

    // Add UTF-8 BOM for Excel compatibility
    const csvWithBOM = '\ufeff' + csv

    // Generate filename with current date
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `sire-compliance-${dateStr}.csv`

    console.log(`[api/super-admin/compliance/report] ✅ Generated CSV report with ${submissions?.length || 0} submissions`)

    // Return CSV as downloadable file
    return new Response(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('[api/super-admin/compliance/report] Unexpected error:', error)
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
