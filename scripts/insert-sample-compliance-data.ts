/**
 * Insert sample compliance data for testing
 */

import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const tenantId = '34f4ebec-900c-4e17-9fb4-0ee18b372e27'

  const insertSQL = `
INSERT INTO public.sire_submissions (tenant_id, submission_date, status, reservations_count)
VALUES
  ('${tenantId}', '2025-11-21T22:34:42.528Z', 'completed', 15),
  ('${tenantId}', '2025-11-01T22:34:42.528Z', 'completed', 23),
  ('${tenantId}', '2025-10-12T22:34:42.528Z', 'completed', 18)
RETURNING *
  `

  console.log('Inserting sample SIRE submissions...')

  const { data, error } = await supabase.rpc('execute_sql', { query: insertSQL })

  if (error) {
    console.error('❌ Error:', error)
  } else {
    console.log('✅ Sample data inserted:', data)
  }
}

main()
