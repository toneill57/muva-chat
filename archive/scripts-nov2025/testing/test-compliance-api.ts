/**
 * Test compliance API endpoints
 */

import { SignJWT } from 'jose'
import { createClient } from '@supabase/supabase-js'

async function main() {
  // Generate JWT token
  const secret = new TextEncoder().encode(process.env.SUPER_ADMIN_JWT_SECRET)

  const token = await new SignJWT({
    super_admin_id: 'cb8320eb-b935-4135-8463-058b91a9627f',
    username: 'oneill',
    role: 'super_admin'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)

  console.log('✅ JWT Token generated')
  console.log('\n=== Insert Sample Data First ===\n')

  // Insert sample submissions via raw SQL
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tenant } = await supabase
    .from('tenant_registry')
    .select('tenant_id, nombre_comercial')
    .limit(1)
    .single()

  console.log('Tenant:', tenant?.nombre_comercial)

  // Create sample data directly using INSERT
  const now = new Date()
  const dates = [
    new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
    new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
  ]

  console.log('\n⚠️  Run this SQL manually in Supabase SQL Editor:')
  console.log(`
INSERT INTO public.sire_submissions (tenant_id, submission_date, status, reservations_count)
VALUES
  ('${tenant?.tenant_id}', '${dates[0].toISOString()}', 'completed', 15),
  ('${tenant?.tenant_id}', '${dates[1].toISOString()}', 'completed', 23),
  ('${tenant?.tenant_id}', '${dates[2].toISOString()}', 'completed', 18);
  `)

  console.log('\n=== Test Endpoints ===\n')
  console.log('1. Test compliance summary:')
  console.log(`curl http://localhost:3000/api/super-admin/compliance -H "Authorization: Bearer ${token}"\n`)

  console.log('2. Test CSV export:')
  console.log(`curl http://localhost:3000/api/super-admin/compliance/report -H "Authorization: Bearer ${token}" -o compliance-report.csv\n`)

  console.log('\n📋 Token (valid for 1 hour):')
  console.log(token)
}

main()
