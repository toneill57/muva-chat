import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.dirname(__dirname)

// Load environment variables
config({ path: path.join(projectRoot, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
  const { data, error } = await supabase.rpc('get_accommodation_unit_by_name', {
    p_unit_name: 'Dreamland',
    p_tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  })

  console.log('Result:', { data, error })
  console.log('Type of data:', typeof data)
  console.log('Data truthiness:', !!data)
  console.log('Data === null:', data === null)
}

test().catch(console.error)