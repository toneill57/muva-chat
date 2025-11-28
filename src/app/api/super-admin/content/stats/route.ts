import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * GET /api/super-admin/content/stats
 *
 * Get aggregated stats for muva_content
 *
 * Returns:
 * - total: number (total content items)
 * - byCategory: object { category: count }
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    console.log(`[content-stats] Fetching content statistics`);

    // Query todos los items (solo category para agrupar)
    const { data, error } = await supabase
      .from('muva_content')
      .select('category')
      .order('category');

    if (error) {
      console.error(`[content-stats] Query error:`, error);
      throw error;
    }

    // Agrupar y contar por category
    const stats: Record<string, number> = {};

    data?.forEach(item => {
      const category = item.category || 'unknown';
      stats[category] = (stats[category] || 0) + 1;
    });

    // Calcular total
    const total = Object.values(stats).reduce((acc, count) => acc + count, 0);

    console.log(`[content-stats] Total: ${total}, Categories: ${Object.keys(stats).length}`);

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
