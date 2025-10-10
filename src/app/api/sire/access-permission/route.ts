/**
 * SIRE Access Permission API Endpoint
 *
 * GET /api/sire/access-permission
 * Verifies if the authenticated staff user has access to SIRE features for their tenant.
 * Returns permission status and tenant SIRE configuration.
 * Requires staff authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyStaffToken, extractTokenFromHeader, StaffAuthErrors } from '@/lib/staff-auth'

// ============================================================================
// Types
// ============================================================================

interface SIREAccessPermission {
  has_access: boolean
  tenant_id: string
  tenant_name: string
  sire_configured: boolean
  hotel_sire_code: string | null
  hotel_city_code: string | null
  missing_configuration: string[]
}

interface SuccessResponse {
  success: true
  data: SIREAccessPermission
}

interface ErrorResponse {
  success: false
  error: string
  code?: string
}

type Response = SuccessResponse | ErrorResponse

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<Response>> {
  try {
    // Extract and verify authentication token
    const authHeader = request.headers.get('Authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: StaffAuthErrors.MISSING_HEADER,
          code: 'MISSING_AUTH_HEADER',
        },
        { status: 401 }
      )
    }

    // Verify staff token
    const staffSession = await verifyStaffToken(token)

    if (!staffSession) {
      return NextResponse.json(
        {
          success: false,
          error: StaffAuthErrors.INVALID_TOKEN,
          code: 'INVALID_TOKEN',
        },
        { status: 401 }
      )
    }

    console.log('[sire/access-permission] Checking SIRE access permission:', {
      tenant_id: staffSession.tenant_id,
      staff_username: staffSession.username,
    })

    const supabase = createServerClient()

    // Get tenant information and SIRE configuration
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('tenant_id, nombre_comercial, sire_hotel_code, sire_city_code')
      .eq('tenant_id', staffSession.tenant_id)
      .single()

    if (tenantError || !tenantData) {
      console.error('[sire/access-permission] Tenant not found:', tenantError)
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
          code: 'TENANT_NOT_FOUND',
        },
        { status: 404 }
      )
    }

    // Check if SIRE is configured for this tenant
    const missingConfiguration: string[] = []
    let sireConfigured = true

    if (!tenantData.sire_hotel_code) {
      missingConfiguration.push('sire_hotel_code')
      sireConfigured = false
    }

    if (!tenantData.sire_city_code) {
      missingConfiguration.push('sire_city_code')
      sireConfigured = false
    }

    // In production, you might also check:
    // - Staff user role/permissions
    // - Tenant subscription plan
    // - Feature flags
    // For now, we grant access to all authenticated staff

    const hasAccess = true // All authenticated staff have access

    console.log('[sire/access-permission] ✅ Access check complete:', {
      has_access: hasAccess,
      sire_configured: sireConfigured,
      missing_config_count: missingConfiguration.length,
    })

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          has_access: hasAccess,
          tenant_id: tenantData.tenant_id,
          tenant_name: tenantData.nombre_comercial,
          sire_configured: sireConfigured,
          hotel_sire_code: tenantData.sire_hotel_code || null,
          hotel_city_code: tenantData.sire_city_code || null,
          missing_configuration: missingConfiguration,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[sire/access-permission] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// OPTIONS Handler (CORS)
// ============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
