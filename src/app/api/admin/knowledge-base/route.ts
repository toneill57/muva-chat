import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/admin/knowledge-base
 *
 * Lists all documents in tenant knowledge base grouped by file_path
 *
 * @param request - Query params: tenant_id (required)
 * @returns JSON response with files array containing file_path, chunks count, created_at
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

    // Query tenant_knowledge_embeddings grouped by file_path
    // We need: file_path, count of chunks, first created_at timestamp
    const { data, error } = await supabase
      .from('tenant_knowledge_embeddings')
      .select('file_path, chunk_index, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[knowledge-base] Database query error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Database query failed',
          message: error.message
        },
        { status: 500 }
      )
    }

    // Group results by file_path
    const fileMap = new Map<string, { chunks: number; created_at: string }>()

    data?.forEach((row) => {
      const existing = fileMap.get(row.file_path)
      if (!existing) {
        fileMap.set(row.file_path, {
          chunks: 1,
          created_at: row.created_at
        })
      } else {
        existing.chunks += 1
        // Keep the earliest created_at for the file
        if (new Date(row.created_at) < new Date(existing.created_at)) {
          existing.created_at = row.created_at
        }
      }
    })

    // Convert map to array for response
    const files = Array.from(fileMap.entries()).map(([file_path, meta]) => ({
      file_path,
      chunks: meta.chunks,
      created_at: meta.created_at
    }))

    // Sort by created_at DESC (newest first)
    files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Success response
    return NextResponse.json({
      success: true,
      files,
      total_files: files.length,
      total_chunks: files.reduce((sum, f) => sum + f.chunks, 0)
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
 * Deletes all chunks for a specific document (file_path) in tenant knowledge base
 *
 * @param request - Body: { tenant_id: string, file_path: string }
 * @returns JSON response with success status
 */
export async function DELETE(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { tenant_id, file_path } = body

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

    if (!file_path) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing file_path',
          message: 'file_path is required in request body'
        },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = createServerClient()

    // Delete all chunks for this file_path
    const { error, count } = await supabase
      .from('tenant_knowledge_embeddings')
      .delete({ count: 'exact' })
      .eq('tenant_id', tenant_id)
      .eq('file_path', file_path)

    if (error) {
      console.error('[knowledge-base] Delete error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Delete operation failed',
          message: error.message
        },
        { status: 500 }
      )
    }

    console.log(`[knowledge-base] Deleted ${count} chunks for file: ${file_path} (tenant: ${tenant_id})`)

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
      deleted_chunks: count || 0,
      file_path
    })

  } catch (error) {
    console.error('[knowledge-base] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
