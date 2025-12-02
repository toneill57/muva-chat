import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const query = `
    SELECT
      p.proname,
      array_to_string(p.proconfig, ',') AS search_path
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'match_unit_manual_chunks'
  `;

  const { data, error } = await supabase.rpc('execute_sql', {
    query: query,
  });

  return NextResponse.json({
    raw_data: data,
    raw_error: error,
    data_type: typeof data,
    is_array: Array.isArray(data),
    data_length: data?.length,
    first_item: data?.[0],
  });
}
