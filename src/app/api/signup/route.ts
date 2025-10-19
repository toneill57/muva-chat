/**
 * Tenant Sign-Up API Endpoint
 *
 * Handles automated tenant onboarding with:
 * - Tenant registry creation
 * - Default hotel setup
 * - Admin user creation
 * - Integration config initialization
 *
 * @route POST /api/signup
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

// ============================================================================
// Types
// ============================================================================

interface SignupRequest {
  // Básicos
  nombre_comercial: string
  subdomain: string
  email: string

  // Fiscales
  nit: string
  razon_social: string

  // Contacto
  phone: string
  address: string

  // Credenciales admin
  admin_username: string
  admin_password: string
  admin_full_name: string
}

interface SignupResponse {
  success: boolean
  tenant_id?: string
  subdomain?: string
  dashboard_url?: string
  error?: string
  details?: string[]
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates subdomain format (lowercase, alphanumeric, hyphens only)
 * Matches database constraint: subdomain ~ '^[a-z0-9-]+$'
 */
function validateSubdomainFormat(subdomain: string): boolean {
  return /^[a-z0-9-]+$/.test(subdomain)
}

/**
 * Validates email format
 */
function validateEmail(email: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)
}

/**
 * Validates phone format (Colombian standard)
 */
function validatePhone(phone: string): boolean {
  return /^\+?[\d\s\(\)\-]+$/.test(phone)
}

/**
 * Validates username (min 4 chars, alphanumeric + hyphens/underscores)
 */
function validateUsername(username: string): boolean {
  return username.length >= 4 && /^[a-zA-Z0-9_-]+$/.test(username)
}

/**
 * Validates password (min 6 chars, no complexity requirements)
 */
function validatePassword(password: string): boolean {
  return password.length >= 6
}

/**
 * Validates all signup data
 */
function validateSignupData(data: SignupRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Required fields
  if (!data.nombre_comercial?.trim()) errors.push('Nombre comercial es requerido')
  if (!data.subdomain?.trim()) errors.push('Subdomain es requerido')
  if (!data.email?.trim()) errors.push('Email es requerido')
  if (!data.nit?.trim()) errors.push('NIT es requerido')
  if (!data.razon_social?.trim()) errors.push('Razón social es requerida')
  if (!data.phone?.trim()) errors.push('Teléfono es requerido')
  if (!data.address?.trim()) errors.push('Dirección es requerida')
  if (!data.admin_username?.trim()) errors.push('Username de admin es requerido')
  if (!data.admin_password) errors.push('Password de admin es requerido')
  if (!data.admin_full_name?.trim()) errors.push('Nombre completo de admin es requerido')

  // Format validations
  if (data.subdomain && !validateSubdomainFormat(data.subdomain)) {
    errors.push('Subdomain debe ser lowercase, solo letras, números y guiones')
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push('Email inválido')
  }

  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Teléfono inválido')
  }

  if (data.admin_username && !validateUsername(data.admin_username)) {
    errors.push('Username debe tener mínimo 4 caracteres (letras, números, guiones, underscores)')
  }

  if (data.admin_password && !validatePassword(data.admin_password)) {
    errors.push('Password debe tener mínimo 6 caracteres')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body: SignupRequest = await req.json()

    console.log('[signup] New signup request for subdomain:', body.subdomain)

    // ========================================================================
    // 1. Validate Input Data
    // ========================================================================

    const validation = validateSignupData(body)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de registro inválidos',
          details: validation.errors
        } as SignupResponse,
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // ========================================================================
    // 2. Check Subdomain Availability
    // ========================================================================

    const { data: existingTenant, error: checkError } = await supabase
      .from('tenant_registry')
      .select('tenant_id')
      .eq('subdomain', body.subdomain)
      .maybeSingle()

    if (checkError) {
      console.error('[signup] Error checking subdomain:', checkError)
      return NextResponse.json(
        {
          success: false,
          error: 'Error verificando disponibilidad de subdomain',
          details: [checkError.message]
        } as SignupResponse,
        { status: 500 }
      )
    }

    if (existingTenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subdomain no disponible',
          details: [`El subdomain "${body.subdomain}" ya está en uso`]
        } as SignupResponse,
        { status: 409 }
      )
    }

    // ========================================================================
    // 3. Check Email Uniqueness
    // ========================================================================

    const { data: existingEmail, error: emailCheckError } = await supabase
      .from('tenant_registry')
      .select('tenant_id')
      .eq('email', body.email)
      .maybeSingle()

    if (emailCheckError) {
      console.error('[signup] Error checking email:', emailCheckError)
    }

    if (existingEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email ya registrado',
          details: [`El email "${body.email}" ya está asociado a otra cuenta`]
        } as SignupResponse,
        { status: 409 }
      )
    }

    // ========================================================================
    // 4. Create Tenant Registry
    // ========================================================================

    const schema_name = `tenant_${body.subdomain.replace(/-/g, '_')}`

    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_registry')
      .insert({
        nit: body.nit,
        razon_social: body.razon_social,
        nombre_comercial: body.nombre_comercial,
        subdomain: body.subdomain,
        slug: body.subdomain,
        schema_name: schema_name,
        tenant_type: 'hotel',
        is_active: true,
        subscription_tier: 'premium',
        features: {
          muva_access: true,
          premium_chat: true,
          guest_chat_enabled: true,
          staff_chat_enabled: true,
          sire_city_code: null,
          sire_hotel_code: null
        },
        email: body.email,
        phone: body.phone,
        address: body.address,
        business_name: body.nombre_comercial,
        primary_color: '#3B82F6'
      })
      .select('tenant_id')
      .single()

    if (tenantError || !tenant) {
      console.error('[signup] Error creating tenant:', tenantError)
      return NextResponse.json(
        {
          success: false,
          error: 'Error creando tenant',
          details: [tenantError?.message || 'Unknown error']
        } as SignupResponse,
        { status: 500 }
      )
    }

    const tenant_id = tenant.tenant_id

    console.log('[signup] ✅ Tenant created:', tenant_id)

    // ========================================================================
    // 5. Create Default Hotel
    // ========================================================================

    const { error: hotelError } = await supabase
      .from('hotels')
      .insert({
        tenant_id: tenant_id,
        name: body.nombre_comercial,
        description: `Hotel principal de ${body.nombre_comercial}`,
        contact_info: {
          email: body.email,
          phone: body.phone
        },
        status: 'active'
      })

    if (hotelError) {
      console.error('[signup] Error creating hotel:', hotelError)
      // Continue - not critical for signup
    } else {
      console.log('[signup] ✅ Default hotel created')
    }

    // ========================================================================
    // 6. Create Admin User
    // ========================================================================

    const password_hash = await bcrypt.hash(body.admin_password, 10)

    const { error: staffError } = await supabase
      .from('staff_users')
      .insert({
        tenant_id: tenant_id,
        username: body.admin_username,
        password_hash: password_hash,
        full_name: body.admin_full_name,
        email: body.email,
        role: 'admin',
        permissions: {
          admin_panel: true,
          sire_access: true,
          reports_access: true,
          modify_operations: true
        },
        is_active: true
      })

    if (staffError) {
      console.error('[signup] Error creating admin user:', staffError)
      // Continue - user can be created manually later
    } else {
      console.log('[signup] ✅ Admin user created')
    }

    // ========================================================================
    // 7. Create Integration Config (MotoPress placeholder)
    // ========================================================================

    const { error: integrationError } = await supabase
      .from('integration_configs')
      .insert({
        tenant_id: tenant_id,
        integration_type: 'motopress',
        is_active: false,
        config_data: {}
      })

    if (integrationError) {
      console.error('[signup] Error creating integration config:', integrationError)
      // Continue - not critical
    } else {
      console.log('[signup] ✅ Integration config created')
    }

    // ========================================================================
    // 8. Success Response
    // ========================================================================

    const dashboard_url = `https://${body.subdomain}.muva.chat/dashboard`

    console.log('[signup] 🎉 Signup completed successfully:', {
      tenant_id,
      subdomain: body.subdomain,
      dashboard_url
    })

    return NextResponse.json(
      {
        success: true,
        tenant_id,
        subdomain: body.subdomain,
        dashboard_url
      } as SignupResponse,
      { status: 201 }
    )

  } catch (error: any) {
    console.error('[signup] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details: [error.message]
      } as SignupResponse,
      { status: 500 }
    )
  }
}

// ============================================================================
// Check Subdomain Availability (GET)
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const subdomain = searchParams.get('subdomain')

    if (!subdomain) {
      return NextResponse.json(
        { available: false, error: 'Subdomain parameter required' },
        { status: 400 }
      )
    }

    // Validate format
    if (!validateSubdomainFormat(subdomain)) {
      return NextResponse.json({
        available: false,
        error: 'Formato inválido (solo lowercase, letras, números y guiones)'
      })
    }

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('tenant_registry')
      .select('tenant_id')
      .eq('subdomain', subdomain)
      .maybeSingle()

    if (error) {
      console.error('[signup] Error checking subdomain availability:', error)
      return NextResponse.json(
        { available: false, error: 'Error verificando disponibilidad' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      available: !data,
      subdomain,
      preview_url: `https://${subdomain}.muva.chat`
    })

  } catch (error: any) {
    console.error('[signup] Error in GET handler:', error)
    return NextResponse.json(
      { available: false, error: error.message },
      { status: 500 }
    )
  }
}
