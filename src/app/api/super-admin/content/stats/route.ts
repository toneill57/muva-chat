import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Disable Next.js caching for this route - data must always be fresh
export const dynamic = 'force-dynamic';

/**
 * GET /api/super-admin/content/stats
 *
 * Get aggregated stats for muva_content + active tenants
 * Groups by source_file to count unique DOCUMENTS (not chunks)
 *
 * SPECIAL HANDLING:
 * - "accommodations" category = active tenants + MUVA accommodation documents
 * - Other categories (activities, restaurants, spots, culture) = MUVA content only
 *
 * Returns:
 * - total: number (total unique documents)
 * - byCategory: object { category: count }
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    console.log(`[content-stats] Fetching content statistics (grouped by document)`);

    // Count active tenants (each tenant IS an accommodation)
    const { count: activeTenantCount, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (tenantError) {
      console.error(`[content-stats] Tenant count error:`, tenantError);
      throw tenantError;
    }

    const tenantCount = activeTenantCount || 0;
    console.log(`[content-stats] Active tenants: ${tenantCount}`);

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

    // Add active tenants to accommodations count
    // Each tenant (hotel/hostel) IS an accommodation in the MUVA platform
    stats['accommodations'] = (stats['accommodations'] || 0) + tenantCount;

    // Total is count of unique documents
    const total = uniqueDocuments.size;

    console.log(`[content-stats] Total MUVA documents: ${total}, Active tenants: ${tenantCount}, Categories: ${Object.keys(stats).length}`);

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
