/**
 * Accommodation Manual DELETE API
 *
 * DELETE /api/accommodation-manuals/[unitId]/[manualId]
 * Deletes a manual and all associated chunks
 *
 * Processing flow:
 * 1. Extract unitId and manualId from params
 * 2. Verify tenant ownership via subdomain
 * 3. Verify manual belongs to unit and tenant
 * 4. Delete chunks first (foreign key dependency)
 * 5. Delete manual metadata
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================

interface DeleteSuccessResponse {
  success: true
  message: string
}

interface DeleteErrorResponse {
  success: false
  error: string
  code?: string
}

type DeleteResponse = DeleteSuccessResponse | DeleteErrorResponse

// ============================================================================
// DELETE HANDLER - Delete manual and associated chunks
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string; manualId: string }> }
): Promise<NextResponse<DeleteResponse>> {
  try {
    // 1. Extract unitId and manualId from params (Next.js 15 requires await)
    const { unitId, manualId } = await params

    console.log('[Manual Delete] Deleting manual:', manualId, 'for unit:', unitId)

    // 2. Get tenant from subdomain header (set by middleware)
    const subdomain = request.headers.get('x-tenant-subdomain')

    if (!subdomain) {
      return NextResponse.json(
        {
          success: false,
          error: 'No subdomain detected',
          code: 'NO_SUBDOMAIN'
        },
        { status: 400 }
      )
    }

    // 3. Create Supabase client
    const supabase = createServerClient()

    // 4. Get tenant_id from subdomain
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('tenant_id')
      .eq('slug', subdomain)
      .single()

    if (tenantError || !tenantData) {
      console.error('[Manual Delete] Tenant not found:', tenantError)
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
          code: 'TENANT_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    const tenantId = tenantData.tenant_id

    // 5. Verify ownership: manual belongs to unit AND tenant
    const { data: manual, error: fetchError } = await supabase
      .from('accommodation_manuals')
      .select('id, filename')
      .eq('id', manualId)
      .eq('accommodation_unit_id', unitId)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !manual) {
      console.error('[Manual Delete] Manual not found or access denied:', fetchError)
      return NextResponse.json(
        {
          success: false,
          error: 'Manual not found or access denied',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      )
    }

    console.log('[Manual Delete] Verified ownership for manual:', manual.filename)

    // 6. Delete chunks first (foreign key dependency)
    const { error: chunksError } = await supabase
      .from('accommodation_units_manual_chunks')
      .delete()
      .eq('manual_id', manualId)

    if (chunksError) {
      console.error('[Manual Delete] Failed to delete chunks:', chunksError)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to delete chunks: ${chunksError.message}`,
          code: 'CHUNKS_DELETE_FAILED'
        },
        { status: 500 }
      )
    }

    console.log('[Manual Delete] Deleted chunks for manual:', manualId)

    // 7. Delete manual metadata
    const { error: manualError } = await supabase
      .from('accommodation_manuals')
      .delete()
      .eq('id', manualId)

    if (manualError) {
      console.error('[Manual Delete] Failed to delete manual:', manualError)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to delete manual: ${manualError.message}`,
          code: 'MANUAL_DELETE_FAILED'
        },
        { status: 500 }
      )
    }

    console.log('[Manual Delete] ✅ Manual deleted successfully:', manual.filename)

    // 8. Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Manual deleted successfully'
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('[Manual Delete] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// OPTIONS HANDLER (CORS)
// ============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  )
}
