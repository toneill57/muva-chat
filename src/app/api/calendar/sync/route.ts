/**
 * Calendar Sync API Endpoints
 *
 * Provides endpoints for manual and automated ICS calendar synchronization.
 *
 * Endpoints:
 * - POST /api/calendar/sync - Sync all feeds for tenant
 * - POST /api/calendar/sync/feed - Sync specific feed
 *
 * @see docs/architecture/ics-sync-architecture.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyStaffToken, extractTokenFromHeader } from '@/lib/staff-auth';
import { ICSyncManager } from '@/lib/integrations/ics/sync-manager';

// ============================================================================
// POST /api/calendar/sync - Sync all feeds for tenant
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Staff authentication
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - Missing token' }, { status: 401 });
    }

    const staffSession = await verifyStaffToken(token);

    if (!staffSession) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const tenantId = staffSession.tenant_id;

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('tenant_id, slug')
      .eq('tenant_id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Initialize sync manager
    const syncManager = new ICSyncManager();

    // Sync all feeds
    const results = await syncManager.syncAllFeeds(tenantId);

    // Aggregate statistics
    const totalStats = results.reduce(
      (acc, result) => ({
        totalEvents: acc.totalEvents + result.stats.totalEvents,
        newEvents: acc.newEvents + result.stats.newEvents,
        updatedEvents: acc.updatedEvents + result.stats.updatedEvents,
        deletedEvents: acc.deletedEvents + result.stats.deletedEvents,
        conflicts: acc.conflicts + result.stats.conflicts,
        errors: acc.errors + result.stats.errors,
      }),
      {
        totalEvents: 0,
        newEvents: 0,
        updatedEvents: 0,
        deletedEvents: 0,
        conflicts: 0,
        errors: 0,
      }
    );

    const allErrors = results.flatMap(r => r.errors);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      tenant: {
        id: tenant.tenant_id,
        subdomain: tenant.slug,
      },
      summary: {
        totalFeeds: results.length,
        successfulFeeds: successCount,
        failedFeeds: failureCount,
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      },
      stats: totalStats,
      feeds: results.map(r => ({
        feedConfigId: r.feedConfigId,
        source: r.source,
        success: r.success,
        stats: r.stats,
        duration: r.duration,
      })),
      errors: allErrors,
    });
  } catch (error) {
    console.error('Calendar sync error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
