/**
 * Test different ways to access hotels schema
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function testSchemaAccess() {
  const tenantId = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  const motoPresAccommodationTypeId = 314

  console.log('🔍 Testing different schema access methods\n')
  console.log('━'.repeat(60))

  // Method 1: Using table name with schema prefix
  console.log('\n1️⃣  Method: from("hotels.accommodation_units")')
  const { data: test1, error: error1 } = await supabase
    .from('hotels.accommodation_units')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('motopress_unit_id', motoPresAccommodationTypeId)
    .maybeSingle()

  console.log('   Error:', error1?.message || 'null')
  console.log('   Data:', test1)

  // Method 2: Get all and filter manually
  console.log('\n2️⃣  Method: Get all from hotels schema, filter manually')
  const { data: allUnits, error: error2 } = await supabase
    .from('hotels.accommodation_units')
    .select('id, name, motopress_unit_id, tenant_id')
    .eq('tenant_id', tenantId)

  console.log('   Error:', error2?.message || 'null')
  console.log('   All units count:', allUnits?.length || 0)

  if (allUnits && allUnits.length > 0) {
    const match = allUnits.find((u: any) => u.motopress_unit_id === motoPresAccommodationTypeId)
    console.log('   Matching unit:', match)
  }

  console.log('\n' + '━'.repeat(60))
}

testSchemaAccess()
