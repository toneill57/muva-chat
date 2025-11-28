import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

async function main() {
  const tenantId = process.argv[2] || '34f4ebec-900c-4e17-9fb4-0ee18b372e27'

  const { data, error } = await supabase
    .from('accommodation_units_public')
    .select('name, pricing')
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  // Sort by low season price
  const sorted = (data || []).sort((a, b) =>
    (a.pricing?.base_price_low_season || 0) - (b.pricing?.base_price_low_season || 0)
  )

  console.log('\n=== Alojamientos ordenados por precio (menor a mayor) ===\n')
  sorted.forEach((u, i) => {
    console.log(`${i + 1}. ${u.name}`)
    console.log(`   Temp. Baja: $${u.pricing?.base_price_low_season?.toLocaleString()} COP`)
    console.log(`   Temp. Alta: $${u.pricing?.base_price_high_season?.toLocaleString()} COP`)
    console.log('')
  })
}

main()
