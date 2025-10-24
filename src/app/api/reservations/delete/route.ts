import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractTokenFromHeader } from '@/lib/staff-auth'

/**
 * DELETE /api/reservations/delete
 *
 * Deletes (soft delete) a pending reservation by changing its status to 'cancelled'
 *
 * SECURITY:
 * - Only allows deletion if status is NOT 'active' (confirmed reservations are protected)
 * - Requires valid staff authentication token
 * - Staff must belong to the same tenant as the reservation
 *
 * Request body:
 * {
 *   "reservation_id": "uuid"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Reservation deleted successfully"
 * }
 */

export async function DELETE(request: NextRequest) {
  console.log('[reservations-delete] DELETE /api/reservations/delete')

  try {
    // 1. Verify staff authentication
    const authHeader = request.headers.get('Authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      console.log('[reservations-delete] ❌ Missing authorization header')
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const staffSession = await verifyStaffToken(token)

    if (!staffSession) {
      console.log('[reservations-delete] ❌ Invalid token')
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    console.log('[reservations-delete] ✅ Staff authenticated:', {
      username: staffSession.username,
      tenant_id: staffSession.tenant_id
    })

    // 2. Parse request body
    const body = await request.json()
    const { reservation_id } = body

    if (!reservation_id) {
      return NextResponse.json({ error: 'Missing reservation_id' }, { status: 400 })
    }

    console.log('[reservations-delete] Request:', { reservation_id })

    // 3. Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 4. Fetch reservation to verify ownership and status
    const { data: reservation, error: fetchError } = await supabase
      .from('guest_reservations')
      .select('id, tenant_id, status, guest_name')
      .eq('id', reservation_id)
      .single()

    if (fetchError || !reservation) {
      console.error('[reservations-delete] ❌ Reservation not found:', fetchError)
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // 5. Security: Verify tenant ownership
    if (reservation.tenant_id !== staffSession.tenant_id) {
      console.log('[reservations-delete] ❌ Tenant mismatch:', {
        reservation_tenant: reservation.tenant_id,
        staff_tenant: staffSession.tenant_id
      })
      return NextResponse.json({ error: 'Unauthorized: Tenant mismatch' }, { status: 403 })
    }

    // 6. Security: ONLY allow deletion if status is NOT 'active'
    if (reservation.status === 'active') {
      console.log('[reservations-delete] ❌ Cannot delete active (confirmed) reservation')
      return NextResponse.json(
        { error: 'Cannot delete confirmed reservations. Only pending reservations can be deleted.' },
        { status: 403 }
      )
    }

    console.log('[reservations-delete] ✅ Security checks passed, proceeding with soft delete')

    // 7. Soft delete: Change status to 'cancelled'
    const { error: deleteError } = await supabase
      .from('guest_reservations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', reservation_id)

    if (deleteError) {
      console.error('[reservations-delete] ❌ Failed to delete reservation:', deleteError)
      return NextResponse.json({ error: 'Failed to delete reservation' }, { status: 500 })
    }

    console.log('[reservations-delete] ✅ Reservation deleted successfully:', {
      reservation_id,
      guest_name: reservation.guest_name
    })

    return NextResponse.json({
      success: true,
      message: 'Reservation deleted successfully'
    })

  } catch (error) {
    console.error('[reservations-delete] ❌ Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
