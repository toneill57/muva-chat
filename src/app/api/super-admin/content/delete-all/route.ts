import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { superAdminMiddleware } from '@/lib/middleware-super-admin'

export async function DELETE(request: NextRequest) {
  // Verify super admin authentication
  const authResult = await superAdminMiddleware(request)

  // If middleware returns a response (error), return it
  if (authResult instanceof NextResponse && authResult.status !== 200) {
    return authResult
  }

  try {
    const supabase = createServerClient()

    // Delete all MUVA content
    const { data, error } = await supabase
      .from('muva_content')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (neq to impossible UUID)
      .select('id')

    if (error) {
      console.error('[delete-all] Error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const deletedCount = data?.length || 0
    console.log(`[delete-all] Deleted ${deletedCount} records`)

    return NextResponse.json({
      success: true,
      deletedCount,
    })
  } catch (error) {
    console.error('[delete-all] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
