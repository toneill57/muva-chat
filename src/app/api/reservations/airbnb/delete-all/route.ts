import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyStaffToken, extractTokenFromHeader } from '@/lib/staff-auth'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Staff authentication
    const authHeader = request.headers.get('Authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - Missing token' }, { status: 401 })
    }

    const staffSession = await verifyStaffToken(token)

    if (!staffSession) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    const tenantId = staffSession.tenant_id

    // Delete all Airbnb calendar events for this tenant
    const { data: deletedEvents, error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('source', 'airbnb')
      .select('id')

    if (error) {
      console.error('[API] Error deleting Airbnb reservations:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete reservations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted: deletedEvents?.length || 0,
      message: `${deletedEvents?.length || 0} reservaciones de Airbnb eliminadas`
    })
  } catch (error) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
