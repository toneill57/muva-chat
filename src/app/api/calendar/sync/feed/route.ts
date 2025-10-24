/**
 * Single Feed Sync API Endpoint
 *
 * Synchronize a specific ICS feed by feed_config_id.
 *
 * POST /api/calendar/sync/feed?feed_config_id={id}
 *
 * @see docs/architecture/ics-sync-architecture.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { ICSyncManager, SyncConfig } from '@/lib/integrations/ics/sync-manager';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get feed_config_id from query
    const { searchParams } = new URL(request.url);
    const feedConfigId = searchParams.get('feed_config_id');
    const forceFullSync = searchParams.get('force') === 'true';

    if (!feedConfigId) {
      return NextResponse.json(
        { error: 'feed_config_id required' },
        { status: 400 }
      );
    }

    // Get feed configuration
    const { data: feedConfig, error: feedError } = await supabase
      .from('ics_feed_configurations')
      .select('*')
      .eq('id', feedConfigId)
      .single();

    if (feedError || !feedConfig) {
      return NextResponse.json(
        { error: 'Feed configuration not found' },
        { status: 404 }
      );
    }

    // Verify user has access to tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, subdomain')
      .eq('id', feedConfig.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Build sync config
    const syncConfig: SyncConfig = {
      tenantId: feedConfig.tenant_id,
      feedConfigId: feedConfig.id,
      feedUrl: feedConfig.feed_url,
      propertyId: feedConfig.property_id,
      source: feedConfig.source,
      lastEtag: feedConfig.last_etag,
      forceFullSync,
    };

    // Initialize sync manager and sync
    const syncManager = new ICSyncManager();
    const result = await syncManager.syncFeed(syncConfig);

    return NextResponse.json({
      success: result.success,
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
      },
      feed: {
        id: feedConfig.id,
        source: feedConfig.source,
        propertyId: feedConfig.property_id,
      },
      stats: result.stats,
      duration: result.duration,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Feed sync error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
