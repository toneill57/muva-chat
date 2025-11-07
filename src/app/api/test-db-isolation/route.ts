import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data: tenants, error } = await supabase
    .from('tenant_registry')
    .select('tenant_id, razon_social')
    .limit(10);

  const { data: units, error: unitsError } = await supabase
    .from('accommodation_units_public')
    .select('unit_id')
    .limit(10);

  return NextResponse.json({
    database_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    tenant_count: tenants?.length || 0,
    units_count: units?.length || 0,
    tenants: tenants || [],
    error: error?.message,
  });
}
