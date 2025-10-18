import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantSchemaName } from '@/lib/tenant-resolver'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/tenant/resolve
 *
 * Resolves tenant slug or UUID to tenant_id UUID (and vice versa)
 * Used by guest-chat page to support friendly URLs
 */
export async function POST(request: NextRequest) {
  try {
    const { slugOrUuid } = await request.json()

    if (!slugOrUuid) {
      return NextResponse.json(
        { error: 'slugOrUuid is required' },
        { status: 400 }
      )
    }

    const tenantId = await resolveTenantSchemaName(slugOrUuid)

    // Also fetch the slug for redirect purposes
    const { data: tenantData } = await supabase
      .from('tenant_registry')
      .select('slug, nombre_comercial')
      .eq('tenant_id', tenantId)
      .single()

    return NextResponse.json({
      success: true,
      tenant_id: tenantId,
      tenant_slug: tenantData?.slug || slugOrUuid,
      tenant_name: tenantData?.nombre_comercial || 'Hotel',
    })
  } catch (error) {
    console.error('[tenant-resolve] Error:', error)

    return NextResponse.json(
      {
        error: 'Tenant not found',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 404 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subdomain = searchParams.get('subdomain')
    const slugOrUuid = searchParams.get('slugOrUuid') || subdomain

    if (!slugOrUuid) {
      return NextResponse.json({
        endpoint: '/api/tenant/resolve',
        description: 'Resolves tenant slug or UUID to tenant_id',
        usage: {
          GET: 'Query params: ?subdomain=simmerdown or ?slugOrUuid=simmerdown',
          POST: 'Body: { slugOrUuid: "simmerdown" }',
        },
      })
    }

    const tenantId = await resolveTenantSchemaName(slugOrUuid)

    // Fetch additional tenant data
    const { data: tenantData } = await supabase
      .from('tenant_registry')
      .select('slug, nombre_comercial, razon_social')
      .eq('tenant_id', tenantId)
      .single()

    return NextResponse.json({
      success: true,
      tenant_id: tenantId,
      tenant_slug: tenantData?.slug || slugOrUuid,
      business_name: tenantData?.nombre_comercial || tenantData?.razon_social || 'Hotel',
      nombre_comercial: tenantData?.nombre_comercial,
    })
  } catch (error) {
    console.error('[tenant-resolve-GET] Error:', error)

    return NextResponse.json(
      {
        error: 'Tenant not found',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 404 }
    )
  }
}
