import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSubdomainFromRequest, getTenantBySubdomain } from '@/lib/tenant-utils';

/**
 * GET /api/admin/settings
 * Fetches current tenant settings for admin dashboard
 */
export async function GET(req: NextRequest) {
  const subdomain = getSubdomainFromRequest(req);

  if (!subdomain) {
    return NextResponse.json({ error: 'Subdomain required' }, { status: 400 });
  }

  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // TODO: Add auth check (user must be admin/owner for this tenant)
  // const session = await getSession(req);
  // if (!session || !hasRole(session.user.id, tenant.tenant_id, ['admin', 'owner'])) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  // }

  return NextResponse.json({ tenant });
}

/**
 * PUT /api/admin/settings
 * Updates tenant settings (business info, social media, SEO)
 */
export async function PUT(req: NextRequest) {
  const subdomain = getSubdomainFromRequest(req);

  if (!subdomain) {
    return NextResponse.json({ error: 'Subdomain required' }, { status: 400 });
  }

  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // TODO: Add auth check (user must be admin/owner for this tenant)
  // const session = await getSession(req);
  // if (!session || !hasRole(session.user.id, tenant.tenant_id, ['admin', 'owner'])) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  // }

  try {
    const {
      nombre_comercial,
      razon_social,
      address,
      phone,
      email,
      social_media_links,
      seo_meta_description,
      seo_keywords
    } = await req.json();

    const supabase = createServerClient();

    // Build update object dynamically (only update provided fields)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (nombre_comercial !== undefined) updateData.nombre_comercial = nombre_comercial;
    if (razon_social !== undefined) updateData.razon_social = razon_social;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (social_media_links !== undefined) updateData.social_media_links = social_media_links;
    if (seo_meta_description !== undefined) updateData.seo_meta_description = seo_meta_description;
    if (seo_keywords !== undefined) updateData.seo_keywords = seo_keywords;

    const { error } = await supabase
      .from('tenant_registry')
      .update(updateData)
      .eq('tenant_id', tenant.tenant_id);

    if (error) {
      console.error('[admin/settings] Error updating tenant:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/settings] Unexpected error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
