import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * GET /api/super-admin/content/stats
 *
 * Get aggregated stats for muva_content
 * Groups by source_file to count unique DOCUMENTS (not chunks)
 *
 * Returns:
 * - total: number (total unique documents)
 * - byCategory: object { category: count }
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    console.log(`[content-stats] Fetching content statistics (grouped by document)`);

    // Query todos los items con source_file y category
    const { data, error } = await supabase
      .from('muva_content')
      .select('source_file, category')
      .order('category');

    if (error) {
      console.error(`[content-stats] Query error:`, error);
      throw error;
    }

    // Group by source_file first to get unique documents
    const uniqueDocuments = new Map<string, string>();
    data?.forEach(item => {
      if (item.source_file && !uniqueDocuments.has(item.source_file)) {
        uniqueDocuments.set(item.source_file, item.category || 'unknown');
      }
    });

    // Count by category from unique documents
    const stats: Record<string, number> = {};
    uniqueDocuments.forEach((category) => {
      stats[category] = (stats[category] || 0) + 1;
    });

    // Total is count of unique documents
    const total = uniqueDocuments.size;

    console.log(`[content-stats] Total documents: ${total}, Categories: ${Object.keys(stats).length}`);

    return NextResponse.json({
      total,
      byCategory: stats
    });

  } catch (error: any) {
    console.error(`[content-stats] Error:`, error);

    return NextResponse.json({
      error: 'Failed to get content statistics',
      details: error.message
    }, { status: 500 });
  }
}
