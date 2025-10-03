/**
 * Tenant List API Endpoint
 *
 * GET /api/tenant/list
 * Returns a list of all active tenants for login selection.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServerClient();

  try {

    // Fetch all active tenants with staff_chat_enabled
    // NOTE: Database schema uses 'tenant_id' and 'nombre_comercial', not 'id' and 'name'
    const { data: tenants, error } = await supabase
      .from('tenant_registry')
      .select('tenant_id, nombre_comercial, slug, features')
      .eq('is_active', true)
      .order('nombre_comercial', { ascending: true });

    if (error) {
      console.error('[tenant-list-api] Database error:', error);
      throw new Error('Failed to fetch tenant list');
    }

    // Filter to only include tenants with staff_chat_enabled
    const staffEnabledTenants = tenants?.filter(
      (tenant) => tenant.features?.staff_chat_enabled === true
    ) || [];

    // Map to simplified format for frontend
    const tenantList = staffEnabledTenants.map((tenant) => ({
      id: tenant.tenant_id,
      name: tenant.nombre_comercial,
      slug: tenant.slug,
    }));

    console.log('[tenant-list-api] Retrieved tenants:', {
      total_active: tenants?.length || 0,
      staff_enabled: tenantList.length,
    });

    return NextResponse.json(
      {
        tenants: tenantList,
        count: tenantList.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[tenant-list-api] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch tenant list',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use GET to fetch tenant list' },
    { status: 405 }
  );
}
