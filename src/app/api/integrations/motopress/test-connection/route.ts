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
      try {
        const decryptedApiKey = await decryptCredentials(config.config_data.api_key)
        const decryptedConsumerSecret = await decryptCredentials(config.config_data.consumer_secret)
        testApiKey = decryptedApiKey
        testConsumerSecret = decryptedConsumerSecret
        testSiteUrl = config.config_data.site_url
      } catch (decryptError) {
        console.error('Failed to decrypt MotoPress credentials:', decryptError)
        return NextResponse.json(
          {
            connected: false,
            error_code: 'decryption_failed',
            error: 'Error al desencriptar credenciales',
            message: 'Las credenciales no pudieron ser desencriptadas. Por favor reconfigura la integración.'
          },
          { status: 500 }
        )
      }
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

    // Determine error type
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Not configured (shouldn't happen if page logic is correct, but handle it)
    if (errorMessage.includes('No configuration')) {
      return NextResponse.json({
        connected: false,
        error_code: 'not_configured',
        error: 'MotoPress no está configurado',
        message: 'Por favor configura tus credenciales primero'
      }, { status: 404 })
    }

    // Network/fetch errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return NextResponse.json({
        connected: false,
        error_code: 'network_error',
        error: 'Error de red',
        message: 'No se pudo conectar al sitio de MotoPress'
      }, { status: 503 })
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return NextResponse.json({
        connected: false,
        error_code: 'timeout',
        error: 'Tiempo agotado',
        message: 'El sitio no respondió en 10 segundos'
      }, { status: 504 })
    }

    // Generic server error (last resort)
    return NextResponse.json({
      connected: false,
      error_code: 'server_error',
      error: 'Error del servidor',
      message: 'Ocurrió un error inesperado. Intenta nuevamente.'
    }, { status: 500 })
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
        'User-Agent': 'curl/8.7.1'
      },
      signal: AbortSignal.timeout(30000) // 30s timeout (same as MotoPress client)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('MotoPress API error:', response.status, errorText)

      let errorCode = 'api_error'
      let errorMsg = 'Error en la API de MotoPress'
      let details = `Verifica tus credenciales y la URL del sitio`

      if (response.status === 401 || response.status === 403) {
        errorCode = 'invalid_credentials'
        errorMsg = 'Credenciales incorrectas'
        details = 'Verifica tu Consumer Key y Consumer Secret'
      } else if (response.status === 404) {
        errorCode = 'site_not_found'
        errorMsg = 'Sitio no encontrado'
        details = 'La URL del sitio o el endpoint no existe'
      }

      return {
        connected: false,
        error_code: errorCode,
        error: errorMsg,
        message: `HTTP ${response.status}`,
        details: details
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
        error_code: 'network_error',
        error: 'Error de red',
        message: 'No se pudo conectar al sitio de MotoPress'
      }
    }

    if (error.name === 'AbortError') {
      return {
        connected: false,
        error_code: 'timeout',
        error: 'Tiempo agotado',
        message: 'El sitio no respondió en 10 segundos'
      }
    }

    return {
      connected: false,
      error_code: 'server_error',
      error: error.name || 'Error desconocido',
      message: error.message || 'Ocurrió un error inesperado'
    }
  }
}