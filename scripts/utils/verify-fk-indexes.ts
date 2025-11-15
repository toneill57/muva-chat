import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const sql = `
    SELECT 
      schemaname,
      tablename,
      indexname,
      pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
      idx_scan as times_used
    FROM pg_stat_user_indexes
    WHERE schemaname IN ('public', 'hotels')
      AND indexname LIKE 'idx_%_fk'
    ORDER BY schemaname, tablename, indexname;
  `;

  const { data, error } = await supabase.rpc('execute_sql', { query: sql });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('\n=== FK INDEXES CREATED (Phase 3) ===\n');
  if (data && data.length > 0) {
    console.table(data);
  } else {
    console.log('No FK indexes found with pattern idx_%_fk');
  }
  console.log('\nTotal FK indexes:', data?.length || 0);
}

main();
