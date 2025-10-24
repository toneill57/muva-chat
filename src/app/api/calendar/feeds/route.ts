/**
 * Feed Configuration Management API
 *
 * CRUD operations for ICS feed configurations.
 *
 * GET    /api/calendar/feeds - List all feeds for tenant
 * POST   /api/calendar/feeds - Create new feed configuration
 * PATCH  /api/calendar/feeds/{id} - Update feed configuration
 * DELETE /api/calendar/feeds/{id} - Delete feed configuration
 *
 * @see docs/architecture/ics-sync-architecture.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyStaffToken, extractTokenFromHeader } from '@/lib/staff-auth';

// ============================================================================
// GET /api/calendar/feeds - List all feeds for tenant
// ============================================================================

export async function GET(request: NextRequest) {
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

    // Get all feed configurations
    const { data: feeds, error: feedsError } = await supabase
      .from('ics_feed_configurations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (feedsError) {
      throw new Error(`Failed to fetch feeds: ${feedsError.message}`);
    }

    return NextResponse.json({
      success: true,
      feeds: feeds || [],
    });
  } catch (error) {
    console.error('List feeds error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/calendar/feeds - Create new feed configuration
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

    // Parse request body
    const body = await request.json();
    const { tenant_id, property_id, source, feed_url, sync_frequency, is_active } = body;

    // Validate tenant matches staff session
    if (tenant_id !== staffSession.tenant_id) {
      return NextResponse.json({ error: 'Tenant mismatch' }, { status: 403 });
    }

    // Validate required fields
    if (!tenant_id || !property_id || !source || !feed_url) {
      return NextResponse.json(
        { error: 'Missing required fields: tenant_id, property_id, source, feed_url' },
        { status: 400 }
      );
    }

    // Validate source (map to source_platform values)
    const validSources = ['airbnb', 'booking.com', 'vrbo', 'motopress', 'generic'];
    const sourcePlatform = source === 'booking_com' ? 'booking.com' : source;

    if (!validSources.includes(sourcePlatform)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      );
    }

    // Step 1: Get the original_accommodation name from accommodation_units_public
    const { data: publicUnit, error: publicError } = await supabase
      .from('accommodation_units_public')
      .select('name, unit_id, metadata')
      .eq('unit_id', property_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (publicError || !publicUnit) {
      console.error('[Calendar Feeds API] Unit not found in accommodation_units_public:', publicError);
      return NextResponse.json(
        { error: 'Property not found in accommodation_units_public' },
        { status: 404 }
      );
    }

    // Extract base name from metadata (without chunk suffixes like "- Overview", "- Capacity & Beds")
    const baseName = publicUnit.metadata?.original_accommodation || publicUnit.name;

    // Step 2: Find the corresponding unit in hotels.accommodation_units by base name
    const { data: propertyData, error: propertyError } = await supabase
      .rpc('get_real_accommodation_units_by_tenant', {
        p_tenant_id: tenant_id
      });

    if (propertyError) {
      console.error('[Calendar Feeds API] Failed to fetch properties from hotels:', propertyError);
      return NextResponse.json(
        { error: 'Failed to verify property in hotels schema' },
        { status: 500 }
      );
    }

    // Find by base name (hotels has consolidated units without chunk suffixes)
    const property = propertyData?.find((p: any) => p.name === baseName);

    if (!property) {
      console.error(`[Calendar Feeds API] Unit "${baseName}" not found in hotels.accommodation_units. Need to sync.`);
      return NextResponse.json(
        { error: `Property "${baseName}" not synced to hotels schema. Please sync accommodation units first.` },
        { status: 404 }
      );
    }

    // Create feed configuration (using hotels.accommodation_units.id)
    const { data: feedConfig, error: createError } = await supabase
      .from('ics_feed_configurations')
      .insert({
        tenant_id,
        accommodation_unit_id: property.id, // Use hotels.accommodation_units.id, not public unit_id
        feed_name: `${sourcePlatform} - ${property.name}`,
        feed_url,
        source_platform: sourcePlatform,
        feed_type: 'import', // Explicitly set feed_type
        sync_interval_minutes: sync_frequency ? Math.floor(sync_frequency / 60) : 60, // Convert seconds to minutes
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create feed configuration: ${createError.message}`);
    }

    return NextResponse.json({
      success: true,
      feed: feedConfig,
    });
  } catch (error) {
    console.error('Create feed error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/calendar/feeds - Update feed configuration
// ============================================================================

export async function PATCH(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { id, feed_url, sync_frequency, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Feed ID required' }, { status: 400 });
    }

    // Build update object
    const updates: any = {};
    if (feed_url !== undefined) updates.feed_url = feed_url;
    if (sync_frequency !== undefined) updates.sync_interval_minutes = Math.floor(sync_frequency / 60);
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update feed configuration (tenant_id ensures staff can only update their own feeds)
    const { data: feedConfig, error: updateError } = await supabase
      .from('ics_feed_configurations')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', staffSession.tenant_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update feed configuration: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      feed: feedConfig,
    });
  } catch (error) {
    console.error('Update feed error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/calendar/feeds - Delete feed configuration
// ============================================================================

export async function DELETE(request: NextRequest) {
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

    // Get feed ID from query
    const { searchParams } = new URL(request.url);
    const feedId = searchParams.get('id');

    if (!feedId) {
      return NextResponse.json({ error: 'Feed ID required' }, { status: 400 });
    }

    // Delete feed configuration (cascade will handle related records)
    // tenant_id ensures staff can only delete their own feeds
    const { error: deleteError } = await supabase
      .from('ics_feed_configurations')
      .delete()
      .eq('id', feedId)
      .eq('tenant_id', staffSession.tenant_id);

    if (deleteError) {
      throw new Error(`Failed to delete feed configuration: ${deleteError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Feed configuration deleted successfully',
    });
  } catch (error) {
    console.error('Delete feed error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
