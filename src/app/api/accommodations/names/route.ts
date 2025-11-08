/**
 * Accommodation Names API Endpoint
 *
 * GET /api/accommodations/names?ids=uuid1,uuid2,uuid3
 * Returns accommodation unit names for given UUIDs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const idsParam = url.searchParams.get('ids')

    if (!idsParam) {
      return NextResponse.json(
        { success: false, error: 'Missing ids parameter' },
        { status: 400 }
      )
    }

    const unitIds = idsParam.split(',').filter(Boolean)

    if (unitIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const supabase = createServerClient()

    const { data: unitsData, error } = await supabase
      .from('accommodation_units_public')
      .select('unit_id, name, metadata, unit_number, unit_type')
      .in('unit_id', unitIds)
      .ilike('name', '% - Overview')

    if (error) {
      console.error('[accommodations/names] Query error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const units = (unitsData || []).map(unit => ({
      id: unit.unit_id,
      name: unit.metadata?.original_accommodation || unit.name,
      unit_number: unit.unit_number,
      unit_type: unit.unit_type,
    }))

    return NextResponse.json({ success: true, data: units })
  } catch (err) {
    console.error('[accommodations/names] Error:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
