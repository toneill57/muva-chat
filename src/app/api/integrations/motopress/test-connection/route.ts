import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAdminAuth, decryptCredentials } from '@/lib/admin-auth'

interface TestConnectionRequest {
  tenant_id?: string
  api_key?: string
  consumer_secret?: string
  site_url?: string
}

export async function POST(request: Request) {
  try {
    console.log('[motopress-test] POST request received')
    console.log('[motopress-test] Authorization header:', request.headers.get('Authorization')?.substring(0, 20) + '...')

    // ✅ Admin authentication required
    const { response: authError, session } = await requireAdminAuth(request)
    if (authError) {
      console.log('[motopress-test] Auth failed:', authError.status)
      return authError
    }

    console.log('[motopress-test] Auth success:', session?.username, session?.role)

    const body: TestConnectionRequest = await request.json()
    const { tenant_id, api_key, consumer_secret, site_url } = body

    const supabase = createServerClient()

    let testApiKey = api_key
    let testConsumerSecret = consumer_secret
    let testSiteUrl = site_url
    const effectiveTenantId = tenant_id || session!.tenant_id

    // Verify admin belongs to this tenant
    if (effectiveTenantId && session!.tenant_id !== effectiveTenantId) {
      return NextResponse.json(
        { error: 'Access denied. Cannot test connection for another tenant.' },
        { status: 403 }
      )
    }

    // Si no se proporcionan credenciales, obtenerlas de la configuración existente
    if (!testApiKey || !testConsumerSecret || !testSiteUrl) {
      const { data: config, error: configError } = await supabase
        .from('integration_configs')
        .select('config_data')
        .eq('tenant_id', effectiveTenantId)
        .eq('integration_type', 'motopress')
        .single()

      if (configError || !config) {
        return NextResponse.json(
          { error: 'No configuration found for tenant' },
          { status: 404 }
        )
      }

      // ✅ Decrypt credentials from database
      const decryptedApiKey = await decryptCredentials(config.config_data.api_key)
      const decryptedConsumerSecret = await decryptCredentials(config.config_data.consumer_secret)
      testApiKey = decryptedApiKey
      testConsumerSecret = decryptedConsumerSecret
      testSiteUrl = config.config_data.site_url
    }

    if (!testApiKey || !testConsumerSecret || !testSiteUrl) {
      return NextResponse.json(
        { error: 'Missing API key, consumer secret, or site URL' },
        { status: 400 }
      )
    }

    // Use the user-provided credentials for MotoPress REST API
    const testResult = await testMotoPresConnection(testApiKey, testConsumerSecret, testSiteUrl)

    return NextResponse.json(testResult)

  } catch (error) {
    console.error('Error in test-connection endpoint:', error)
    return NextResponse.json(
      {
        connected: false,
        error: 'Internal server error',
        message: 'Failed to test connection'
      },
      { status: 500 }
    )
  }
}

async function testMotoPresConnection(consumerKey: string, consumerSecret: string, siteUrl: string) {
  try {
    // Use Basic Auth (same as client.ts)
    const baseUrl = siteUrl.replace(/\/$/, '')
    const apiUrl = `${baseUrl}/wp-json/mphb/v1/accommodation_types?per_page=100`
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

    console.log('Testing MotoPress Hotel Booking connection to:', baseUrl + '/wp-json/mphb/v1/accommodation_types')

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'User-Agent': 'InnPilot/1.0'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('MotoPress API error:', response.status, errorText)

      return {
        connected: false,
        error: `HTTP ${response.status}`,
        message: 'Failed to connect to MotoPress API',
        details: errorText.substring(0, 200)
      }
    }

    const data = await response.json()

    // La respuesta debe ser un array de accommodation_types
    if (!Array.isArray(data)) {
      return {
        connected: false,
        error: 'Invalid response format',
        message: 'Expected array of accommodation types'
      }
    }

    console.log(`Successfully retrieved ${data.length} accommodation types`)

    return {
      connected: true,
      message: 'Connection successful',
      accommodations_count: data.length,
      api_version: response.headers.get('X-API-Version') || 'mphb/v1',
      response_time: Date.now()
    }

  } catch (error: any) {
    console.error('MotoPress connection test failed:', error)

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        connected: false,
        error: 'Network error',
        message: 'Failed to reach MotoPress site'
      }
    }

    if (error.name === 'AbortError') {
      return {
        connected: false,
        error: 'Timeout',
        message: 'Connection timeout after 10 seconds'
      }
    }

    return {
      connected: false,
      error: error.name || 'Unknown error',
      message: error.message || 'Failed to test connection'
    }
  }
}