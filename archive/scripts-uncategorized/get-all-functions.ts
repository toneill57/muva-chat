import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAllFunctions() {
  console.error('Querying production database for all functions...');
  
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        p.proname AS function_name,
        pg_get_functiondef(p.oid) AS function_definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
      ORDER BY p.proname;
    `
  });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.error(`Found ${data.length} functions`);
  console.log(JSON.stringify(data, null, 2));
}

getAllFunctions();
