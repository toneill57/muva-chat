import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/admin/knowledge-base
 *
 * Lists all documents in tenant knowledge base from ALL sources:
 * - tenant_knowledge_embeddings (general knowledge)
 * - accommodation_units_public (accommodations with pricing)
 * - hotels.policies (hotel policies)
 *
 * @param request - Query params: tenant_id (required)
 * @returns JSON response with files array containing file_path, chunks count, created_at, source
 */
export async function GET(request: NextRequest) {
  try {
    // Extract tenant_id from query params
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenant_id')

    // Validation: Check if tenant_id is provided
    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing tenant_id',
          message: 'tenant_id query parameter is required'
        },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = createServerClient()

    // Query 1: tenant_knowledge_embeddings (general knowledge base)
    const { data: knowledgeData, error: knowledgeError } = await supabase
      .from('tenant_knowledge_embeddings')
      .select('file_path, chunk_index, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (knowledgeError) {
      console.error('[knowledge-base] Knowledge embeddings query error:', knowledgeError)
    }

    // Query 2: accommodation_units_public (accommodations)
    const { data: accommodationsData, error: accommodationsError } = await supabase
      .from('accommodation_units_public')
      .select('unit_id, name, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (accommodationsError) {
      console.error('[knowledge-base] Accommodations query error:', accommodationsError)
    }

    // Query 3: hotels.policies (hotel policies)
    const { data: policiesData, error: policiesError } = await supabase
      .from('policies')
      .select('policy_id, title, source_file, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (policiesError) {
      console.error('[knowledge-base] Policies query error:', policiesError)
    }

    // Group tenant_knowledge_embeddings by file_path
    const fileMap = new Map<string, { chunks: number; created_at: string; source: string }>()

    knowledgeData?.forEach((row) => {
      const existing = fileMap.get(row.file_path)
      if (!existing) {
        fileMap.set(row.file_path, {
          chunks: 1,
          created_at: row.created_at,
          source: 'tenant_knowledge_embeddings'
        })
      } else {
        existing.chunks += 1
        if (new Date(row.created_at) < new Date(existing.created_at)) {
          existing.created_at = row.created_at
        }
      }
    })

    // Add accommodations (each unit = 1 "file")
    accommodationsData?.forEach((unit) => {
      const filePath = `accommodations/${unit.name}`
      fileMap.set(filePath, {
        chunks: 1,
        created_at: unit.created_at,
        source: 'accommodation_units_public'
      })
    })

    // Add policies (each policy = 1 "file")
    policiesData?.forEach((policy) => {
      const filePath = policy.source_file || `policies/${policy.title}`
      fileMap.set(filePath, {
        chunks: 1,
        created_at: policy.created_at,
        source: 'hotels.policies'
      })
    })

    // Convert map to array for response
    const files = Array.from(fileMap.entries()).map(([file_path, meta]) => ({
      file_path,
      chunks: meta.chunks,
      created_at: meta.created_at,
      source: meta.source
    }))

    // Sort by created_at DESC (newest first)
    files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Calculate stats by source
    const statsBySource = {
      tenant_knowledge_embeddings: files.filter(f => f.source === 'tenant_knowledge_embeddings').length,
      accommodation_units_public: files.filter(f => f.source === 'accommodation_units_public').length,
      policies: files.filter(f => f.source === 'hotels.policies').length
    }

    // Success response
    return NextResponse.json({
      success: true,
      files,
      total_files: files.length,
      total_chunks: files.reduce((sum, f) => sum + f.chunks, 0),
      by_source: statsBySource
    })

  } catch (error) {
    console.error('[knowledge-base] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch knowledge base documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/knowledge-base
 *
 * Deletes all chunks for one or more documents (file_path) in tenant knowledge base
 *
 * @param request - Body: { tenant_id: string, file_path?: string, file_paths?: string[] }
 * @returns JSON response with success status
 */
export async function DELETE(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { tenant_id, file_path, file_paths } = body

    // Validation: Check required fields
    if (!tenant_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing tenant_id',
          message: 'tenant_id is required in request body'
        },
        { status: 400 }
      )
    }

    // Accept either single file_path or array of file_paths
    if (!file_path && (!file_paths || file_paths.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing file_path or file_paths',
          message: 'Either file_path or file_paths is required in request body'
        },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = createServerClient()

    // Normalize to array for unified processing
    const pathsToDelete = file_paths || [file_path]
    let totalDeleted = 0

    // Delete from ALL sources (tenant_knowledge_embeddings AND accommodation_units_public)
    for (const path of pathsToDelete) {
      // 1. Delete from tenant_knowledge_embeddings (general knowledge base)
      const { error: knowledgeError, count: knowledgeCount } = await supabase
        .from('tenant_knowledge_embeddings')
        .delete({ count: 'exact' })
        .eq('tenant_id', tenant_id)
        .eq('file_path', path)

      if (knowledgeError) {
        console.error(`[knowledge-base] Delete error from tenant_knowledge_embeddings for ${path}:`, knowledgeError)
      } else {
        totalDeleted += knowledgeCount || 0
        console.log(`[knowledge-base] Deleted ${knowledgeCount} chunks from tenant_knowledge_embeddings for: ${path}`)
      }

      // 2. Delete from accommodation_units_public (accommodation chunks)
      // Remove 'accommodations/' prefix if present (GET endpoint adds it but DB doesn't have it)
      const accommodationName = path.startsWith('accommodations/') ? path.replace('accommodations/', '') : path

      const { error: accommodationError, count: accommodationCount } = await supabase
        .from('accommodation_units_public')
        .delete({ count: 'exact' })
        .eq('tenant_id', tenant_id)
        .eq('name', accommodationName) // accommodation_units_public uses 'name' instead of 'file_path'

      if (accommodationError) {
        console.error(`[knowledge-base] Delete error from accommodation_units_public for ${path}:`, accommodationError)
      } else {
        totalDeleted += accommodationCount || 0
        console.log(`[knowledge-base] Deleted ${accommodationCount} chunks from accommodation_units_public for: ${path}`)
      }
    }

    console.log(`[knowledge-base] Total deleted: ${totalDeleted} chunks for ${pathsToDelete.length} file(s) (tenant: ${tenant_id})`)

    // Success response
    return NextResponse.json({
      success: true,
      message: pathsToDelete.length === 1
        ? 'Document deleted successfully'
        : `${pathsToDelete.length} documents deleted successfully`,
      deleted_chunks: totalDeleted,
      deleted_files: pathsToDelete.length,
      file_path: file_path, // For backward compatibility with single delete
      file_paths: pathsToDelete
    })

  } catch (error) {
    console.error('[knowledge-base] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to delete document(s)',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
