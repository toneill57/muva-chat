/**
 * Initialize Super Admin User
 *
 * Creates the first super admin user in the database.
 * Run: node scripts/init-super-admin.js
 *
 * SECURITY: This script should only be run once during initial setup.
 * Credentials are hardcoded for bootstrap purposes only.
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ============================================================================
// Configuration
// ============================================================================

const CREDENTIALS = {
  username: 'oneill',
  password: 'rabbitHole0+',
  full_name: 'O Neill',
  email: null,
}

// ============================================================================
// Main Function
// ============================================================================

async function initSuperAdmin() {
  console.log('🚀 Initializing Super Admin User...\n')

  // 1. Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
    process.exit(1)
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  // 2. Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  console.log('✅ Supabase client created')

  // 3. Check if table exists
  const { data: tables, error: tablesError } = await supabase
    .from('super_admin_users')
    .select('username')
    .limit(1)

  if (tablesError) {
    console.error('❌ Error: super_admin_users table not found or not accessible')
    console.error('   Message:', tablesError.message)
    console.error('\n⚠️  Please ensure:')
    console.error('   1. Migration has been applied')
    console.error('   2. Table super_admin_users exists')
    console.error('   3. Service role has access to the table')
    process.exit(1)
  }

  console.log('✅ Table super_admin_users exists and is accessible')

  // 4. Check if super admin already exists
  const { data: existing, error: existingError } = await supabase
    .from('super_admin_users')
    .select('username, super_admin_id, created_at')
    .eq('username', CREDENTIALS.username)
    .single()

  if (existing) {
    console.log('\n⚠️  Super admin already exists:')
    console.log('   Username:', existing.username)
    console.log('   Super Admin ID:', existing.super_admin_id)
    console.log('   Created At:', existing.created_at)
    console.log('\n✅ No action needed - super admin already initialized')
    process.exit(0)
  }

  // 5. Hash password
  console.log('\n🔐 Hashing password...')
  const passwordHash = await bcrypt.hash(CREDENTIALS.password, 10)
  console.log('✅ Password hashed successfully')

  // 6. Insert super admin
  console.log('\n📝 Creating super admin user...')
  const { data, error } = await supabase
    .from('super_admin_users')
    .insert({
      username: CREDENTIALS.username,
      password_hash: passwordHash,
      full_name: CREDENTIALS.full_name,
      email: CREDENTIALS.email,
      is_active: true,
      permissions: {
        platform_admin: true,
        tenant_management: true,
        content_management: true,
        analytics_access: true,
      },
    })
    .select()
    .single()

  if (error) {
    console.error('\n❌ Error creating super admin:', error.message)
    console.error('   Details:', error)
    process.exit(1)
  }

  // 7. Success
  console.log('\n✅ Super admin created successfully!')
  console.log('\n📋 Details:')
  console.log('   Username:', CREDENTIALS.username)
  console.log('   Password: [hidden for security]')
  console.log('   Full Name:', data.full_name)
  console.log('   Super Admin ID:', data.super_admin_id)
  console.log('   Created At:', data.created_at)
  console.log('   Status:', data.is_active ? 'Active' : 'Inactive')
  console.log('\n🎉 Super admin initialization complete!')
  console.log('\n⚠️  IMPORTANT:')
  console.log('   - Store credentials securely')
  console.log('   - Change default password after first login')
  console.log('   - This script should not be run again')
}

// ============================================================================
// Execute
// ============================================================================

initSuperAdmin().catch((error) => {
  console.error('\n💥 Unexpected error:', error)
  process.exit(1)
})
