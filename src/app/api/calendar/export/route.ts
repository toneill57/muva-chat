/**
 * Calendar Export API Endpoint
 *
 * Export calendar events as ICS format for external platforms.
 *
 * GET /api/calendar/export?property_id={id}&platform={platform}&token={token}
 *
 * Platforms: airbnb, booking_com, google, outlook
 *
 * @see docs/architecture/ics-sync-architecture.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { ICSExporter, ICSEvent, ICSCalendarMetadata } from '@/lib/integrations/ics/exporter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('property_id');
    const platform = searchParams.get('platform') || 'google';
    const token = searchParams.get('token');

    if (!propertyId) {
      return NextResponse.json(
        { error: 'property_id required' },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: 'token required' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Verify export token
    const { data: config, error: configError } = await supabase
      .from('ics_feed_configurations')
      .select('*, tenants(subdomain)')
      .eq('property_id', propertyId)
      .eq('export_token', token)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Invalid export token' },
        { status: 403 }
      );
    }

    // Get property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, type')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Get all confirmed events for this property
    const { data: events, error: eventsError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('property_id', propertyId)
      .in('status', ['confirmed', 'pending'])
      .gte('end_date', new Date().toISOString()) // Only future events
      .order('start_date', { ascending: true });

    if (eventsError) {
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }

    // Convert DB events to ICS events
    const icsEvents: ICSEvent[] = (events || []).map(event => ({
      uid: event.external_uid || `muva-${event.id}`,
      summary: event.summary,
      description: event.description,
      startDate: new Date(event.start_date),
      endDate: new Date(event.end_date),
      created: event.created_at ? new Date(event.created_at) : undefined,
      lastModified: event.updated_at ? new Date(event.updated_at) : undefined,
      status: event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
      eventType: event.is_blocking ? 'block' : 'reservation',
      location: event.property_id,
    }));

    // Build calendar metadata
    const tenantSubdomain = (config as any).tenants?.subdomain || 'muva';
    const metadata: ICSCalendarMetadata = {
      name: `${property.name} - MUVA Calendar`,
      description: `Calendar feed for ${property.name}`,
      timezone: 'America/Bogota', // Colombia timezone
      prodId: '-//MUVA Chat//Calendar Export//EN',
    };

    // Generate ICS file
    const exporter = new ICSExporter();
    const icsContent = exporter.generateCalendar(icsEvents, metadata);

    // Return ICS file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${property.name.replace(/[^a-z0-9]/gi, '_')}_calendar.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Calendar export error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
