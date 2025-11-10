/**
 * Accommodation Manual Chunks API
 *
 * GET /api/accommodation-manuals/[unitId]/[manualId]/chunks
 * Retrieves all chunks for a specific manual (for preview/debugging)
 *
 * PERFORMANCE NOTE:
 * - Excludes embedding vectors (large arrays) for faster response
 * - Only returns metadata + content for UI display
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================

interface ChunkRecord {
  id: string
  chunk_index: number
  section_title: string | null
  chunk_content: string
}

interface ChunksSuccessResponse {
  success: true
  data: ChunkRecord[]
}

interface ChunksErrorResponse {
  success: false
  error: string
  code?: string
}

type ChunksResponse = ChunksSuccessResponse | ChunksErrorResponse

// ============================================================================
// GET HANDLER - List chunks for a manual
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string; manualId: string }> }
): Promise<NextResponse<ChunksResponse>> {
  try {
    // 1. Extract params (Next.js 15 requires await)
    const { unitId, manualId } = await params

    console.log('[Manual Chunks] Fetching chunks for manual:', manualId)

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
      console.error('[Manual Chunks] Tenant not found:', tenantError)
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

    // 5. Verify manual exists and belongs to tenant
    const { data: manual, error: manualError } = await supabase
      .from('accommodation_manuals')
      .select('id, filename')
      .eq('id', manualId)
      .eq('tenant_id', tenantId)
      .single()

    if (manualError || !manual) {
      console.error('[Manual Chunks] Manual not found or access denied:', manualError)
      return NextResponse.json(
        {
          success: false,
          error: 'Manual not found or access denied',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // 6. Query chunks (EXCLUDE embeddings for performance)
    // Embedding vectors are large arrays (1024d-3072d) - not needed for UI display
    const { data: chunks, error } = await supabase
      .from('accommodation_units_manual_chunks')
      .select('id, chunk_index, section_title, chunk_content')
      .eq('manual_id', manualId)
      .eq('tenant_id', tenantId)
      .order('chunk_index', { ascending: true })

    if (error) {
      console.error('[Manual Chunks] Query failed:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'QUERY_FAILED'
        },
        { status: 500 }
      )
    }

    console.log('[Manual Chunks] Found', chunks.length, 'chunks for manual:', manual.filename)

    // 7. Return chunks
    return NextResponse.json(
      {
        success: true,
        data: chunks
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('[Manual Chunks] Error:', error)
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  )
}
