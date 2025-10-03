import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotel_id')
    const tenantId = searchParams.get('tenant_id')

    const supabase = createServerClient()

    // Use raw SQL to access hotels schema (Supabase client can't access custom schemas directly)
    let whereClause = 'WHERE 1=1'
    if (hotelId) {
      whereClause += ` AND hotel_id = '${hotelId}'`
    }
    if (tenantId) {
      whereClause += ` AND tenant_id = '${tenantId}'`
    }

    const sqlQuery = `
      SELECT
        id, name, unit_number, description, short_description,
        capacity, bed_configuration, view_type, status,
        is_featured, display_order, hotel_id, tenant_id
      FROM hotels.accommodation_units
      ${whereClause}
      ORDER BY display_order ASC
    `

    console.log('🔍 Using RPC function get_accommodation_units with:', { hotelId, tenantId })

    // Use the custom RPC function that works with hotels schema
    const { data: units, error } = await supabase.rpc('get_accommodation_units', {
      p_hotel_id: hotelId,
      p_tenant_id: tenantId
    })

    console.log('📊 RPC Function Result:', { units, error, count: units?.length })

    if (error) {
      console.error('Error fetching accommodation units:', error)
      return NextResponse.json({ error: 'Failed to fetch accommodation units' }, { status: 500 })
    }
    // Process and enhance the data
    const enhancedUnits = units?.map((unit: any) => ({
      ...unit,
      embedding_status: {
        has_fast: !!unit.embedding_fast,
        has_balanced: !!unit.embedding_balanced,
        fast_dimensions: unit.embedding_fast?.length || 0,
        balanced_dimensions: unit.embedding_balanced?.length || 0
      },
      capacity_summary: {
        total: unit.capacity?.total || 2,
        adults: unit.capacity?.adults || 2,
        children: unit.capacity?.children || 0
      },
      features_summary: {
        unique_features_count: Array.isArray(unit.unique_features) ? unit.unique_features.length : (unit.unique_features ? Object.keys(unit.unique_features).length : 0),
        accessibility_features_count: Array.isArray(unit.accessibility_features) ? unit.accessibility_features.length : (unit.accessibility_features ? Object.keys(unit.accessibility_features).length : 0),
        has_ocean_view: unit.location_details?.ocean_view || false
      },
      pricing_summary: {
        seasonal_rules: 2, // mock data
        hourly_rules: 0, // mock data
        base_price_range: [
          unit.base_price_low_season || 150000,
          unit.base_price_high_season || 200000
        ]
      },
      amenities_summary: {
        total: Array.isArray(unit.amenities_list) ? unit.amenities_list.length : (unit.amenities_list ? Object.keys(unit.amenities_list).length : 0),
        included: Array.isArray(unit.amenities_list) ? unit.amenities_list.length : (unit.amenities_list ? Object.keys(unit.amenities_list).length : 0),
        premium: 0, // mock data
        featured: 0 // mock data
      },
      unit_amenities: unit.amenities_list || [],
      pricing_rules: [] // mock data for now
    }))

    return NextResponse.json({
      success: true,
      units: enhancedUnits,
      count: units?.length || 0
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}