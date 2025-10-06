import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAdminAuth, encryptCredentials } from '@/lib/admin-auth'

interface ConfigureRequest {
  tenant_id: string
  api_key: string
  site_url: string
  is_active: boolean
}

export async function POST(request: Request) {
  try {
    // ✅ Admin authentication required
    const { response: authError, session } = await requireAdminAuth(request)
    if (authError) return authError

    const { tenant_id, api_key, site_url, is_active }: ConfigureRequest = await request.json()

    if (!tenant_id || !api_key || !site_url) {
      return NextResponse.json(
        { error: 'Missing required fields: tenant_id, api_key, site_url' },
        { status: 400 }
      )
    }

    // Verify admin belongs to this tenant
    if (session!.tenant_id !== tenant_id) {
      return NextResponse.json(
        { error: 'Access denied. Cannot configure integration for another tenant.' },
        { status: 403 }
      )
    }

    const supabase = createServerClient()

    // ✅ Encrypt credentials before storing
    const encryptedApiKey = await encryptCredentials(api_key)
    const configData = {
      api_key: encryptedApiKey,
      site_url,
    }

    // Guardar o actualizar configuración
    const { data, error } = await supabase
      .from('integration_configs')
      .upsert({
        tenant_id,
        integration_type: 'motopress',
        config_data: configData,
        is_active,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id,integration_type'
      })
      .select()

    if (error) {
      console.error('Error saving integration config:', error)
      return NextResponse.json(
        { error: 'Failed to save configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      data: {
        id: data[0]?.id,
        is_active: data[0]?.is_active,
        updated_at: data[0]?.updated_at
      }
    })

  } catch (error) {
    console.error('Error in configure endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // ✅ Admin authentication required
    const { response: authError, session } = await requireAdminAuth(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const tenant_id = searchParams.get('tenant_id')

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'Missing tenant_id parameter' },
        { status: 400 }
      )
    }

    // Verify admin belongs to this tenant
    if (session!.tenant_id !== tenant_id) {
      return NextResponse.json(
        { error: 'Access denied. Cannot view configuration for another tenant.' },
        { status: 403 }
      )
    }

    const supabase = createServerClient()

    // Obtener configuración existente
    const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('integration_type', 'motopress')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching integration config:', error)
      return NextResponse.json(
        { error: 'Failed to fetch configuration' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({
        exists: false,
        config: null
      })
    }

    // Retornar configuración sin datos sensibles
    return NextResponse.json({
      exists: true,
      config: {
        id: data.id,
        is_active: data.is_active,
        last_sync_at: data.last_sync_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
        // No incluir config_data por seguridad
      }
    })

  } catch (error) {
    console.error('Error in configure GET endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}