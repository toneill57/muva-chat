/**
 * Super Admin Tenant Detail Endpoint
 *
 * Provides detailed view of a single tenant with related data.
 * Protected by superAdminMiddleware (JWT authentication required).
 *
 * GET /api/super-admin/tenants/[id]
 * Returns full tenant details including:
 *   - Basic tenant information
 *   - Integration configurations
 *   - User permissions and roles
 *
 * PATCH /api/super-admin/tenants/[id]
 * Updates tenant properties:
 *   Body: {
 *     is_active?: boolean,
 *     subscription_tier?: "free" | "basic" | "premium" | "enterprise"
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { superAdminMiddleware, getSuperAdminContext } from '@/lib/middleware-super-admin'
import { logTenantUpdate } from '@/lib/audit-logger'

/**
 * GET handler - Fetch detailed tenant information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify super admin authentication
  const authResult = await superAdminMiddleware(request)

  // If middleware returns a response (error), return it
  if (authResult instanceof NextResponse && authResult.status !== 200) {
    return authResult
  }

  try {
    const supabase = createServerClient()
    const { id: tenantId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(tenantId)) {
      return NextResponse.json(
        { error: 'Invalid tenant ID format' },
        { status: 400 }
      )
    }

    // Fetch tenant basic information
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (tenantError) {
      if (tenantError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        )
      }
      console.error('[api/super-admin/tenants/[id]] Error fetching tenant:', tenantError)
      return NextResponse.json(
        { error: 'Failed to fetch tenant', details: tenantError.message },
        { status: 500 }
      )
    }

    // Fetch integration configurations
    const { data: integrations, error: integrationsError } = await supabase
      .from('integration_configs')
      .select('id, integration_type, is_active, last_sync_at, created_at, updated_at')
      .eq('tenant_id', tenantId)

    if (integrationsError) {
      console.error('[api/super-admin/tenants/[id]] Error fetching integrations:', integrationsError)
      // Don't fail the entire request - just return empty array
    }

    // Fetch user permissions
    const { data: userPermissions, error: permissionsError } = await supabase
      .from('user_tenant_permissions')
      .select('id, user_id, role, permissions, granted_at, is_active')
      .eq('tenant_id', tenantId)

    if (permissionsError) {
      console.error('[api/super-admin/tenants/[id]] Error fetching user permissions:', permissionsError)
      // Don't fail the entire request - just return empty array
    }

    // Compose detailed response
    const response = {
      tenant: {
        ...tenant,
        integrations: integrations || [],
        user_permissions: userPermissions || []
      }
    }

    console.log(`[api/super-admin/tenants/[id]] ✅ Fetched tenant details for ${tenantId}`)

    return NextResponse.json(response)
  } catch (error) {
    console.error('[api/super-admin/tenants/[id]] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH handler - Update tenant properties
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify super admin authentication
  const authResult = await superAdminMiddleware(request)

  // If middleware returns a response (error), return it
  if (authResult instanceof NextResponse && authResult.status !== 200) {
    return authResult
  }

  try {
    const supabase = createServerClient()
    const { id: tenantId } = await params

    // Extract super admin context for audit logging
    const adminContext = getSuperAdminContext(request)
    if (!adminContext) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing admin context' },
        { status: 401 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(tenantId)) {
      return NextResponse.json(
        { error: 'Invalid tenant ID format' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate allowed fields
    const allowedFields = ['is_active', 'subscription_tier']
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    // Validate subscription_tier if provided
    if (updateData.subscription_tier) {
      const validTiers = ['free', 'basic', 'premium', 'enterprise']
      if (!validTiers.includes(updateData.subscription_tier as string)) {
        return NextResponse.json(
          { error: 'Invalid subscription tier. Must be one of: free, basic, premium, enterprise' },
          { status: 400 }
        )
      }
    }

    // Validate is_active if provided
    if ('is_active' in updateData && typeof updateData.is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      )
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    // Fetch current tenant state for audit logging (before update)
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenant_registry')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        )
      }
      console.error('[api/super-admin/tenants/[id]] Error checking tenant:', checkError)
      return NextResponse.json(
        { error: 'Failed to verify tenant', details: checkError.message },
        { status: 500 }
      )
    }

    // Perform update
    const { data: updatedTenant, error: updateError } = await supabase
      .from('tenant_registry')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      console.error('[api/super-admin/tenants/[id]] Error updating tenant:', updateError)
      return NextResponse.json(
        { error: 'Failed to update tenant', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`[api/super-admin/tenants/[id]] ✅ Updated tenant ${tenantId}`, updateData)

    // Log tenant update to audit log (fire and forget - don't block response)
    logTenantUpdate(
      adminContext.super_admin_id,
      tenantId,
      existingTenant,
      updatedTenant,
      request
    ).catch((error) => {
      console.error('[api/super-admin/tenants/[id]] Failed to log audit entry:', error)
    })

    return NextResponse.json({
      tenant: updatedTenant,
      message: 'Tenant updated successfully'
    })
  } catch (error) {
    console.error('[api/super-admin/tenants/[id]] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Only allow GET and PATCH requests
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
