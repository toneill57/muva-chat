import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function generateTestToken() {
  // Get staff user
  const { data: staff } = await supabase
    .from('staff_users')
    .select('*')
    .eq('username', 'admin_ceo')
    .single()

  if (!staff) {
    console.error('Staff not found')
    return
  }

  console.log('Staff data:', JSON.stringify(staff, null, 2))

  // Generate JWT token with correct structure
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  const token = await new SignJWT({
    staff_id: staff.staff_id, // Use staff_id field, not id
    username: staff.username,
    full_name: staff.full_name,
    role: staff.role,
    permissions: staff.permissions || {},
    tenant_id: staff.tenant_id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)

  console.log('\nTEST_TOKEN=' + token)
}

generateTestToken()
