import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Disable Next.js caching for this route - data must always be fresh
export const dynamic = 'force-dynamic';

/**
 * GET /api/super-admin/content/list
 *
 * List muva_content GROUPED BY source_file (documents, not chunks)
 *
 * Query params:
 * - category?: string (filter by category)
 * - search?: string (search in title/filename)
 * - page?: number (default: 1)
 * - limit?: number (default: 50)
 *
 * Returns:
 * - content: array of UNIQUE documents (grouped by source_file)
 * - total: number (total unique documents)
 * - page: number
 * - limit: number
 * - totalPages: number
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validar pagination params
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters. Page must be >= 1, limit must be 1-100' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    console.log(`[content-list] Fetching content - page: ${page}, limit: ${limit}, category: ${category || 'all'}, search: ${search || 'none'}`);

    // Build query - get all chunks but we'll group them
    // Select only necessary fields to reduce data transfer
    let query = supabase
      .from('muva_content')
      .select('id, source_file, title, category, total_chunks, created_at, chunk_index');

    // Aplicar filtros
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      // Buscar en title o source_file
      query = query.or(`title.ilike.%${search}%,source_file.ilike.%${search}%`);
    }

    // Sort por created_at descendente (más recientes primero)
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error(`[content-list] Query error:`, error);
      throw error;
    }

    // Group by source_file to get unique documents
    const documentMap = new Map<string, {
      id: string;
      source_file: string;
      title: string;
      category: string;
      total_chunks: number;
      created_at: string;
      chunk_ids: string[];
    }>();

    for (const item of data || []) {
      const key = item.source_file;
      if (!documentMap.has(key)) {
        documentMap.set(key, {
          id: item.id, // Use first chunk's ID as document ID
          source_file: item.source_file,
          title: item.title,
          category: item.category,
          total_chunks: item.total_chunks || 1,
          created_at: item.created_at,
          chunk_ids: [item.id]
        });
      } else {
        // Add chunk ID to existing document
        const doc = documentMap.get(key)!;
        doc.chunk_ids.push(item.id);
        // Keep the most recent created_at
        if (new Date(item.created_at) > new Date(doc.created_at)) {
          doc.created_at = item.created_at;
        }
      }
    }

    // Convert to array and sort by created_at
    const documents = Array.from(documentMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = documents.length;

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedDocuments = documents.slice(offset, offset + limit);

    console.log(`[content-list] Found ${total} unique documents, returning ${paginatedDocuments.length} items`);

    return NextResponse.json({
      content: paginatedDocuments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error: any) {
    console.error(`[content-list] Error:`, error);

    return NextResponse.json({
      error: 'Failed to list content',
      details: error.message
    }, { status: 500 });
  }
}
