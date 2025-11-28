/**
 * Test Super Admin Authentication
 *
 * Tests the super admin authentication flow after table creation.
 * Run: node scripts/test-super-admin-auth.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CREDENTIALS = {
  username: 'oneill',
  password: 'rabbitHole0+',
}

// ============================================================================
// Helper Functions (mimic lib functions for testing)
// ============================================================================

async function testLogin() {
  console.log('\n🔐 Test 1: Login Super Admin...')

  const bcrypt = require('bcryptjs')
  const { SignJWT } = require('jose')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Query super admin
  const { data: adminData, error } = await supabase
    .from('super_admin_users')
    .select('*')
    .eq('username', TEST_CREDENTIALS.username)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('❌ Error querying super admin:', error.message)
    return null
  }

  if (!adminData) {
    console.error('❌ Super admin not found')
    return null
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(
    TEST_CREDENTIALS.password,
    adminData.password_hash
  )

  if (!passwordMatch) {
    console.error('❌ Password mismatch')
    return null
  }

  console.log('✅ Credentials verified')

  // Generate JWT
  const SECRET_KEY = new TextEncoder().encode(
    process.env.SUPER_ADMIN_JWT_SECRET || 'super-admin-secret-key-change-in-production'
  )

  const token = await new SignJWT({
    super_admin_id: adminData.super_admin_id,
    username: adminData.username,
    role: 'super_admin',
    permissions: adminData.permissions,
    type: 'super_admin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY)

  console.log('✅ JWT token generated')
  console.log('   Token preview:', token.substring(0, 50) + '...')

  return token
}

async function testVerify(token) {
  console.log('\n🔍 Test 2: Verify Token...')

  const { jwtVerify } = require('jose')

  const SECRET_KEY = new TextEncoder().encode(
    process.env.SUPER_ADMIN_JWT_SECRET || 'super-admin-secret-key-change-in-production'
  )

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)

    if (!payload.super_admin_id || !payload.username || payload.type !== 'super_admin') {
      console.error('❌ Invalid token payload structure')
      return null
    }

    console.log('✅ Token verified successfully')
    console.log('   Super Admin ID:', payload.super_admin_id)
    console.log('   Username:', payload.username)
    console.log('   Role:', payload.role)
    console.log('   Permissions:', JSON.stringify(payload.permissions, null, 2))

    return payload
  } catch (error) {
    console.error('❌ Token verification failed:', error.message)
    return null
  }
}

async function testMetrics() {
  console.log('\n📊 Test 3: Get Platform Metrics...')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase
    .from('v_platform_metrics')
    .select('*')
    .single()

  if (error) {
    console.error('⚠️  Warning: Platform metrics view not found (expected if not created yet)')
    console.error('   Error:', error.message)
    return null
  }

  console.log('✅ Platform metrics retrieved')
  console.log('   Active Tenants:', data.active_tenants)
  console.log('   Total Tenants:', data.total_tenants)
  console.log('   Conversations (30d):', data.conversations_30d)

  return data
}

async function testTenantStats() {
  console.log('\n🏢 Test 4: Get Tenant Stats...')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase
    .from('v_tenant_stats')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('⚠️  Warning: Tenant stats view not found (expected if not created yet)')
    console.error('   Error:', error.message)
    return []
  }

  console.log(`✅ Tenant stats retrieved (${data.length} tenants)`)
  data.forEach((tenant, idx) => {
    console.log(`   ${idx + 1}. ${tenant.subdomain} - ${tenant.nombre_comercial}`)
  })

  return data
}

// ============================================================================
// Main Test Function
// ============================================================================

async function runTests() {
  console.log('🚀 Testing Super Admin Authentication\n')
  console.log('=' .repeat(60))

  try {
    // Test 1: Login
    const token = await testLogin()
    if (!token) {
      console.error('\n💥 Login test failed - aborting remaining tests')
      process.exit(1)
    }

    // Test 2: Verify
    const payload = await testVerify(token)
    if (!payload) {
      console.error('\n💥 Token verification failed')
      process.exit(1)
    }

    // Test 3: Metrics (optional - might not exist yet)
    await testMetrics()

    // Test 4: Tenant Stats (optional - might not exist yet)
    await testTenantStats()

    console.log('\n' + '='.repeat(60))
    console.log('🎉 All core tests passed!')
    console.log('\n✅ Super admin authentication is working correctly')

  } catch (error) {
    console.error('\n💥 Unexpected error during tests:', error)
    process.exit(1)
  }
}

// ============================================================================
// Execute
// ============================================================================

runTests().catch((error) => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
