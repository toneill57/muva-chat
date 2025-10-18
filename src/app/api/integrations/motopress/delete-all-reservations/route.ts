/**
 * Delete All MotoPress Reservations API Endpoint
 *
 * DELETE /api/integrations/motopress/delete-all-reservations
 *
 * Deletes ALL reservations from guest_reservations table for the authenticated tenant.
 * This is a DESTRUCTIVE operation with two-factor confirmation in UI.
 *
 * Security:
 * - Requires valid staff token (JWT)
 * - Validates tenant_id matches session
 * - Only deletes reservations with booking_source='motopress'
 * - Logs deletion to sync_history
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function DELETE(request: NextRequest) {
  try {
    console.log('[delete-all-reservations] Starting...')

    // 1. Authenticate staff user
    const authResult = await requireAdminAuth(request)

    if (!authResult.success || !authResult.session) {
      console.log('[delete-all-reservations] Authentication failed')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tenant_id } = authResult.session

    console.log(`[delete-all-reservations] Authenticated tenant: ${tenant_id}`)

    // 2. Parse request body
    const body = await request.json()
    const requestedTenantId = body.tenant_id

    // 3. Validate tenant_id matches session (CRITICAL security check)
    if (requestedTenantId !== tenant_id) {
      console.error('[delete-all-reservations] Tenant ID mismatch:', {
        session: tenant_id,
        requested: requestedTenantId
      })
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Tenant mismatch' },
        { status: 403 }
      )
    }

    // 4. Delete all MotoPress reservations for this tenant
    const supabase = createServerClient()

    const { data, error, count } = await supabase
      .from('guest_reservations')
      .delete({ count: 'exact' })
      .eq('tenant_id', tenant_id)
      .eq('booking_source', 'motopress')

    if (error) {
      console.error('[delete-all-reservations] Database error:', error)
      return NextResponse.json(
        {
          success: false,
          error: `Database error: ${error.message}`
        },
        { status: 500 }
      )
    }

    const deletedCount = count || 0

    console.log(`[delete-all-reservations] ✅ Deleted ${deletedCount} reservations for tenant ${tenant_id}`)

    // 5. Log deletion to sync_history
    await supabase
      .from('sync_history')
      .insert({
        tenant_id,
        integration_type: 'motopress',
        sync_type: 'reservations_delete_all',
        status: 'success',
        records_processed: deletedCount,
        metadata: {
          operation: 'delete_all',
          deleted_count: deletedCount,
          staff_id: authResult.session.staff_id,
          staff_role: authResult.session.role
        },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })

    // 6. Return success response
    return NextResponse.json({
      success: true,
      data: {
        deleted: deletedCount,
        tenant_id
      }
    })

  } catch (error: any) {
    console.error('[delete-all-reservations] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}
