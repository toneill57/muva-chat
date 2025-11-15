import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const query = `
  SELECT schemaname || '.' || relname as table_name,
         n_dead_tup, n_live_tup,
         ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 1) as dead_pct
  FROM pg_stat_user_tables
  WHERE schemaname = 'public' 
    AND relname IN ('prospective_sessions', 'guest_reservations', 'reservation_accommodations', 'guest_conversations', 'muva_content', 'sire_cities')
  ORDER BY dead_pct DESC NULLS LAST;
  `;

  const { data, error } = await supabase.rpc('execute_sql', { query });
  if (error) throw error;

  console.log('BEFORE VACUUM - Dead Tuples Status:');
  console.log(JSON.stringify(data, null, 2));
}

main();
