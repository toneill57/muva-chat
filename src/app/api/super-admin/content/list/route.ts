import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * GET /api/super-admin/content/list
 *
 * List muva_content with pagination and filters
 *
 * Query params:
 * - category?: string (filter by category)
 * - search?: string (search in title/filename)
 * - page?: number (default: 1)
 * - limit?: number (default: 50)
 *
 * Returns:
 * - content: array of content items
 * - total: number (total count)
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

    // Build query
    let query = supabase
      .from('muva_content')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      // Buscar en title o metadata->filename
      // Usar OR para buscar en múltiples campos
      query = query.or(`title.ilike.%${search}%,metadata->>filename.ilike.%${search}%`);
    }

    // Sort por created_at descendente (más recientes primero)
    query = query.order('created_at', { ascending: false });

    // Pagination (offset-based)
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error(`[content-list] Query error:`, error);
      throw error;
    }

    console.log(`[content-list] Found ${count} total items, returning ${data?.length || 0} items`);

    return NextResponse.json({
      content: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (error: any) {
    console.error(`[content-list] Error:`, error);

    return NextResponse.json({
      error: 'Failed to list content',
      details: error.message
    }, { status: 500 });
  }
}
