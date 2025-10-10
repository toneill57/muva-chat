import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function PUT(req: NextRequest) {
  const { tenant_id, logo_url, business_name, primary_color } = await req.json();

  if (!tenant_id) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  const supabase = createServerClient();

  const updateData: any = {};
  if (logo_url !== undefined) updateData.logo_url = logo_url;
  if (business_name !== undefined) updateData.business_name = business_name;
  if (primary_color !== undefined) updateData.primary_color = primary_color;

  const { error } = await supabase
    .from('tenant_registry')
    .update(updateData)
    .eq('tenant_id', tenant_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
