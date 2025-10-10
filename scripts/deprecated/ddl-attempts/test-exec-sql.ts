/**
 * Test exec_sql RPC response structure
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function testExecSql() {
  const tenantId = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  const motoPresAccommodationTypeId = 314

  console.log('🔍 Testing exec_sql RPC response structure\n')

  const { data: unitResult, error: unitError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT id FROM hotels.accommodation_units
      WHERE tenant_id = '${tenantId}'
      AND motopress_unit_id = ${motoPresAccommodationTypeId}
      LIMIT 1
    `
  })

  console.log('Error:', unitError)
  console.log('Data:', JSON.stringify(unitResult, null, 2))

  if (unitResult?.data) {
    console.log('\nunitResult.data:', JSON.stringify(unitResult.data, null, 2))
    console.log('unitResult.data.length:', unitResult.data.length)

    if (unitResult.data.length > 0) {
      console.log('unitResult.data[0]:', JSON.stringify(unitResult.data[0], null, 2))
      console.log('unitResult.data[0].id:', unitResult.data[0].id)
    }
  }
}

testExecSql()
