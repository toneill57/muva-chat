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

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/tenant/resolve',
    description: 'Resolves tenant slug or UUID to tenant_id',
    method: 'POST',
    request: {
      body: {
        slugOrUuid: 'string (slug like "simmerdown" or UUID)',
      },
    },
    response: {
      success: 'boolean',
      tenant_id: 'string (UUID)',
    },
  })
}
