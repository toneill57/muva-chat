/**
 * Super Admin Audit Log Endpoint
 *
 * Provides query access to audit log with filtering and pagination.
 * Protected by superAdminMiddleware (JWT authentication required).
 *
 * GET /api/super-admin/audit-log
 * Query params:
 *   - page: number (default 1)
 *   - limit: number (default 50, max 200)
 *   - action: string (filter by action)
 *   - target_type: string (filter by target type)
 *   - admin_id: string (filter by admin ID)
 *   - from: ISO date string (filter from date)
 *   - to: ISO date string (filter to date)
 *   - search: string (search in action, target_type, target_id)
 *   - format: 'json' | 'csv' (default 'json')
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { superAdminMiddleware } from '@/lib/middleware-super-admin'

/**
 * GET handler - Fetch audit logs with filtering and pagination
 */
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

    // Parse pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10))
    )
    const offset = (page - 1) * limit

    // Parse filter params
    const action = searchParams.get('action')
    const targetType = searchParams.get('target_type')
    const adminId = searchParams.get('admin_id')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const search = searchParams.get('search')
    const format = searchParams.get('format') || 'json'

    // Build query
    let query = supabase
      .from('super_admin_audit_log')
      .select(
        `
        log_id,
        super_admin_id,
        action,
        target_type,
        target_id,
        changes,
        ip_address,
        user_agent,
        created_at,
        super_admin_users!inner(username, full_name)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    // Apply filters
    if (action) {
      query = query.eq('action', action)
    }

    if (targetType) {
      query = query.eq('target_type', targetType)
    }

    if (adminId) {
      query = query.eq('super_admin_id', adminId)
    }

    if (fromDate) {
      try {
        const from = new Date(fromDate).toISOString()
        query = query.gte('created_at', from)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid from date format. Use ISO 8601.' },
          { status: 400 }
        )
      }
    }

    if (toDate) {
      try {
        const to = new Date(toDate).toISOString()
        query = query.lte('created_at', to)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid to date format. Use ISO 8601.' },
          { status: 400 }
        )
      }
    }

    if (search) {
      // Search in action, target_type, or target_id
      query = query.or(
        `action.ilike.%${search}%,target_type.ilike.%${search}%,target_id.ilike.%${search}%`
      )
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data: logs, error, count } = await query

    if (error) {
      console.error('[api/super-admin/audit-log] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch audit logs', details: error.message },
        { status: 500 }
      )
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    // Transform data to flatten super_admin_users
    const transformedLogs = logs?.map((log: any) => ({
      log_id: log.log_id,
      super_admin_id: log.super_admin_id,
      admin_username: log.super_admin_users?.username || 'Unknown',
      admin_full_name: log.super_admin_users?.full_name || 'Unknown',
      action: log.action,
      target_type: log.target_type,
      target_id: log.target_id,
      changes: log.changes,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: log.created_at,
    }))

    // Handle CSV export
    if (format === 'csv') {
      const csv = convertToCSV(transformedLogs || [])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Return JSON response
    console.log(
      `[api/super-admin/audit-log] ✅ Fetched ${logs?.length || 0} logs (page ${page}/${totalPages})`
    )

    return NextResponse.json({
      logs: transformedLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    })
  } catch (error) {
    console.error('[api/super-admin/audit-log] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Convert audit logs to CSV format
 */
function convertToCSV(logs: any[]): string {
  if (logs.length === 0) {
    return 'No data available'
  }

  // CSV headers
  const headers = [
    'Created At',
    'Admin Username',
    'Admin Full Name',
    'Action',
    'Target Type',
    'Target ID',
    'Changes',
    'IP Address',
    'User Agent',
  ]

  // CSV rows
  const rows = logs.map((log) => [
    log.created_at,
    log.admin_username,
    log.admin_full_name,
    log.action,
    log.target_type || '',
    log.target_id || '',
    log.changes ? JSON.stringify(log.changes) : '',
    log.ip_address || '',
    log.user_agent || '',
  ])

  // Escape CSV values
  const escapeCSV = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  // Build CSV string
  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ]

  return csvLines.join('\n')
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
