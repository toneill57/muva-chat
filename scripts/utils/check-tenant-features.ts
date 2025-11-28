import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const slugs = process.argv.slice(2)
  if (slugs.length === 0) {
    slugs.push('simmerdown', 'cocoplum')
  }

  const { data, error } = await supabase
    .from('tenant_registry')
    .select('tenant_id, slug, features')
    .in('slug', slugs)

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  for (const tenant of data || []) {
    console.log(`\n=== ${tenant.slug} ===`)
    console.log('tenant_id:', tenant.tenant_id)
    console.log('features:', JSON.stringify(tenant.features, null, 2))
    console.log('search_mode:', tenant.features?.search_mode || 'NOT SET (defaults to hotel)')
  }
}

main()
