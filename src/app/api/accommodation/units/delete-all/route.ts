import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { tenant_id } = await request.json()

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      )
    }

    // Verify staff authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Verify user belongs to the tenant
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.tenant_id !== tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized for this tenant' },
        { status: 403 }
      )
    }

    // Delete all accommodations for this tenant
    const { data, error } = await supabase
      .from('accommodation_units')
      .delete()
      .eq('tenant_id', tenant_id)
      .select()

    if (error) {
      console.error('Error deleting accommodations:', error)
      return NextResponse.json(
        { error: 'Failed to delete accommodations', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted_count: data?.length || 0,
      message: `Successfully deleted ${data?.length || 0} accommodation(s)`
    })

  } catch (error) {
    console.error('Error in delete-all endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
