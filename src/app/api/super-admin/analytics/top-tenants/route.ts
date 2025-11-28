import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Validate days parameter
    if (days <= 0 || days > 365) {
      return NextResponse.json(
        { error: 'Invalid days parameter. Must be between 1 and 365' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Calculate start date
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Query conversations from last N days
    const { data: conversations, error: convError } = await supabase
      .from('chat_conversations')
      .select('tenant_id')
      .gte('created_at', startDate);

    if (convError) {
      console.error('[analytics/top-tenants] Conversations query error:', convError);
      throw convError;
    }

    // Count conversations by tenant_id
    const tenantCounts: Record<string, number> = {};
    conversations?.forEach(conv => {
      tenantCounts[conv.tenant_id] = (tenantCounts[conv.tenant_id] || 0) + 1;
    });

    // Get top 10 tenant IDs by conversation count
    const topTenantIds = Object.entries(tenantCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tenantId]) => tenantId);

    if (topTenantIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fetch tenant details for top tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenant_registry')
      .select('tenant_id, nombre_comercial, subdomain')
      .in('tenant_id', topTenantIds);

    if (tenantsError) {
      console.error('[analytics/top-tenants] Tenants query error:', tenantsError);
      throw tenantsError;
    }

    // Map tenant details to counts
    const topTenants = topTenantIds.map(tenantId => {
      const tenant = tenants?.find(t => t.tenant_id === tenantId);
      return {
        tenant_id: tenantId,
        nombre_comercial: tenant?.nombre_comercial || 'Unknown',
        subdomain: tenant?.subdomain || 'unknown',
        conversation_count: tenantCounts[tenantId]
      };
    });

    console.log(`[analytics/top-tenants] Returning top ${topTenants.length} tenants from last ${days} days`);

    return NextResponse.json({ data: topTenants });

  } catch (error) {
    console.error('[analytics/top-tenants] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top tenants data' },
      { status: 500 }
    );
  }
}
