import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { extractTokenFromHeader, verifyGuestToken } from '@/lib/guest-auth'

export async function GET(request: NextRequest) {
  try {
    // 1. Verify authentication (cookie or header)
    const cookieToken = request.cookies.get('guest_token')?.value
    const authHeader = request.headers.get('authorization')
    const headerToken = extractTokenFromHeader(authHeader)
    const token = cookieToken || headerToken

    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticación requerido' },
        { status: 401 }
      )
    }

    const session = await verifyGuestToken(token)

    if (!session) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      )
    }

    // 2. Extract tenant_id from session
    const tenantId = session.tenant_id

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // 3. Fetch tenant configuration
    const supabase = createServerClient()

    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('tenant_id, nit, nombre_comercial, features')
      .eq('tenant_id', tenantId)
      .single()

    if (tenantError || !tenant) {
      console.error('[tenant-config] DB error:', tenantError)
      return NextResponse.json({ error: 'Tenant config not found' }, { status: 404 })
    }

    // Extract SIRE codes from features JSONB
    const features = tenant.features || {}
    const sireCityCode = features.sire_city_code || '88001'  // Fallback a San Andrés

    return NextResponse.json({
      tenant_id: tenant.tenant_id,
      hotel_code: tenant.nit,           // NIT es el hotel_code
      hotel_name: tenant.nombre_comercial,
      city_code: sireCityCode
    })

  } catch (error) {
    console.error('[tenant-config] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
