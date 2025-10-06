import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { MotoPresClient } from '@/lib/integrations/motopress/client'
import { MotoPresDataMapper } from '@/lib/integrations/motopress/data-mapper'
import { requireAdminAuth, decryptCredentials } from '@/lib/admin-auth'

async function getIntegrationConfig(tenantId: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('integration_type', 'motopress')
    .eq('is_active', true)
    .single()

  if (error || !data) {
    throw new Error('No active MotoPress integration found')
  }

  return data
}

export async function GET(request: Request) {
  try {
    // ✅ Admin authentication required
    const { response: authError, session } = await requireAdminAuth(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const tenant_id = searchParams.get('tenant_id')
    const preview = searchParams.get('preview') === 'true'

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'Missing tenant_id parameter' },
        { status: 400 }
      )
    }

    // Verify admin belongs to this tenant
    if (session!.tenant_id !== tenant_id) {
      return NextResponse.json(
        { error: 'Access denied. Cannot view accommodations for another tenant.' },
        { status: 403 }
      )
    }

    console.log(`Fetching accommodations for tenant: ${tenant_id}, preview: ${preview}`)

    // Get integration configuration
    const config = await getIntegrationConfig(tenant_id)

    // ✅ Decrypt credentials
    const decryptedApiKey = await decryptCredentials(config.config_data.api_key)
    const credentials = {
      api_key: decryptedApiKey,
      consumer_secret: config.config_data.consumer_secret || process.env.MOTOPRESS_SECRET!,
      site_url: config.config_data.site_url
    }

    // Initialize MotoPress client
    const client = new MotoPresClient({
      apiKey: credentials.api_key,
      consumerSecret: credentials.consumer_secret,
      siteUrl: credentials.site_url
    })

    // Fetch accommodations from MotoPress
    const response = await client.getAllAccommodations()

    if (response.error || !response.data) {
      return NextResponse.json(
        { error: response.error || 'Failed to fetch accommodations' },
        { status: 500 }
      )
    }

    const accommodations = response.data

    if (preview) {
      // Return preview data for UI
      const previews = accommodations.map(acc =>
        MotoPresDataMapper.extractAccommodationPreview(acc)
      )

      return NextResponse.json({
        accommodations: previews,
        count: previews.length,
        preview: true
      })
    } else {
      // Return full accommodation data
      const mappedUnits = MotoPresDataMapper.mapBulkAccommodations(accommodations, tenant_id)

      return NextResponse.json({
        accommodations: mappedUnits,
        count: mappedUnits.length,
        raw_count: accommodations.length
      })
    }

  } catch (error: any) {
    console.error('Error fetching accommodations:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch accommodations',
        details: error.stack?.substring(0, 200)
      },
      { status: 500 }
    )
  }
}