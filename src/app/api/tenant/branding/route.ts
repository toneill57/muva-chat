import { NextRequest, NextResponse } from 'next/server'
import { getTenantBySubdomain } from '@/lib/tenant-utils'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/tenant/branding
 *
 * Fetch tenant branding data by subdomain or tenant_id
 *
 * Query params:
 * - subdomain: string (e.g., "simmerdown")
 * - tenant_id: string (UUID)
 *
 * Returns: Full tenant branding data
 */
export async function GET(request: NextRequest) {
  console.log('[API /api/tenant/branding] === REQUEST START ===');

  try {
    const hostname = request.headers.get('host') || '';
    const headerSubdomain = request.headers.get('x-tenant-subdomain') || null;

    console.log('[API] hostname:', hostname);
    console.log('[API] x-tenant-subdomain header:', headerSubdomain);

    const { searchParams } = new URL(request.url)
    const subdomain = searchParams.get('subdomain')
    const tenantId = searchParams.get('tenant_id')

    console.log('[API] query param subdomain:', subdomain);
    console.log('[API] query param tenant_id:', tenantId);

    if (!subdomain && !tenantId) {
      console.log('[API] ❌ No subdomain or tenant_id provided');
      return NextResponse.json(
        { error: 'Either subdomain or tenant_id is required' },
        { status: 400 }
      )
    }

    let tenant

    // Fetch by subdomain
    if (subdomain) {
      console.log('[API] Fetching by subdomain:', subdomain);
      tenant = await getTenantBySubdomain(subdomain)
    }
    // Fetch by tenant_id
    else if (tenantId) {
      console.log('[API] Fetching by tenant_id:', tenantId);
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from('tenant_registry')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      if (error) {
        console.error('[API] Supabase error:', error);
        throw error
      }
      tenant = data
      console.log('[API] Tenant found by tenant_id:', data?.nombre_comercial);
    }

    if (!tenant) {
      console.log('[API] ❌ Tenant not found');
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    console.log('[API] ✅ Tenant found:', tenant.nombre_comercial);

    // Return branding data
    return NextResponse.json({
      tenant_id: tenant.tenant_id,
      subdomain: tenant.subdomain,
      slug: tenant.slug,
      business_name: tenant.nombre_comercial || tenant.business_name,
      logo_url: tenant.logo_url,
      primary_color: tenant.primary_color,
      address: tenant.address,
      phone: tenant.phone,
      email: tenant.email,
      social_media_links: tenant.social_media_links,
      seo_meta_description: tenant.seo_meta_description,
      seo_keywords: tenant.seo_keywords,
    })

  } catch (error) {
    console.error('[tenant-branding] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch tenant branding',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
