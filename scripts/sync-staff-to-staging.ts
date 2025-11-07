#!/usr/bin/env node
/**
 * Sync Staff Users from Production to Staging
 *
 * Copies staff_users records from production database to staging database.
 * This is needed because staging uses a separate Supabase project.
 *
 * Usage:
 *   pnpm dlx tsx scripts/sync-staff-to-staging.ts
 *
 * Environment Variables Required:
 *   - SUPABASE_ACCESS_TOKEN (for Management API)
 */

const PROD_PROJECT_ID = 'ooaumjzaztmutltifhoq'
const STAGING_PROJECT_ID = 'rvjmwwvkhglcuqwcznph'
const SIMMERDOWN_TENANT_ID = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'

// Get access token from environment
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!ACCESS_TOKEN) {
  console.error('❌ ERROR: SUPABASE_ACCESS_TOKEN not set')
  console.error('   Get it from: https://supabase.com/dashboard/account/tokens')
  process.exit(1)
}

/**
 * Execute SQL query via Supabase Management API
 */
async function executeQuery(projectId: string, query: string): Promise<any> {
  const url = `https://api.supabase.com/v1/projects/${projectId}/database/query`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Query failed: ${response.status} ${error}`)
  }

  const data = await response.json()
  return data
}

/**
 * Main sync function
 */
async function syncStaffUsers() {
  console.log('🔄 Syncing Staff Users from Production to Staging\n')

  try {
    // Step 1: Fetch staff users from production
    console.log('1️⃣  Fetching staff users from production...')
    const prodQuery = `
      SELECT
        staff_id,
        tenant_id,
        username,
        password_hash,
        full_name,
        role,
        permissions,
        is_active,
        created_at,
        last_login_at
      FROM staff_users
      WHERE tenant_id = '${SIMMERDOWN_TENANT_ID}'
      ORDER BY created_at ASC
    `

    const prodResult = await executeQuery(PROD_PROJECT_ID, prodQuery)
    const staffUsers = Array.isArray(prodResult) ? prodResult : []

    if (staffUsers.length === 0) {
      console.log('   ⚠️  No staff users found in production')
      return
    }

    console.log(`   ✅ Found ${staffUsers.length} staff users in production`)
    staffUsers.forEach((user: any) => {
      console.log(`      - ${user.username} (${user.role})`)
    })

    // Step 2: Check existing users in staging
    console.log('\n2️⃣  Checking existing users in staging...')
    const stagingQuery = `
      SELECT staff_id, username
      FROM staff_users
      WHERE tenant_id = '${SIMMERDOWN_TENANT_ID}'
    `

    const stagingResult = await executeQuery(STAGING_PROJECT_ID, stagingQuery)
    const existingUsers = Array.isArray(stagingResult) ? stagingResult : []
    const existingUsernames = new Set(existingUsers.map((u: any) => u.username))

    console.log(`   📊 Existing users in staging: ${existingUsers.length}`)

    // Step 3: Insert missing users
    console.log('\n3️⃣  Inserting missing users into staging...')
    let insertedCount = 0

    for (const user of staffUsers) {
      if (existingUsernames.has(user.username)) {
        console.log(`   ⏭️  Skipping ${user.username} (already exists)`)
        continue
      }

      // Prepare permissions JSON
      const permissionsJson = JSON.stringify(user.permissions || {
        sire_access: true,
        admin_panel: false,
        reports_access: false,
        modify_operations: false,
      })

      const insertQuery = `
        INSERT INTO staff_users (
          staff_id,
          tenant_id,
          username,
          password_hash,
          full_name,
          role,
          permissions,
          is_active,
          created_at,
          last_login_at
        ) VALUES (
          '${user.staff_id}',
          '${user.tenant_id}',
          '${user.username}',
          '${user.password_hash}',
          '${user.full_name}',
          '${user.role}',
          '${permissionsJson}'::jsonb,
          ${user.is_active},
          '${user.created_at}',
          ${user.last_login_at ? `'${user.last_login_at}'` : 'NULL'}
        )
        ON CONFLICT (staff_id) DO NOTHING
      `

      try {
        await executeQuery(STAGING_PROJECT_ID, insertQuery)
        console.log(`   ✅ Inserted ${user.username} (${user.role})`)
        insertedCount++
      } catch (error: any) {
        console.error(`   ❌ Failed to insert ${user.username}:`, error.message)
      }
    }

    // Step 4: Verify sync
    console.log('\n4️⃣  Verifying sync...')
    const verifyResult = await executeQuery(STAGING_PROJECT_ID, stagingQuery)
    const finalUsers = Array.isArray(verifyResult) ? verifyResult : []

    console.log(`   ✅ Total users in staging: ${finalUsers.length}`)
    console.log(`   ✅ Newly inserted: ${insertedCount}`)

    // Summary
    console.log('\n✨ Sync Complete!\n')
    console.log('📋 Summary:')
    console.log(`   Production users: ${staffUsers.length}`)
    console.log(`   Staging users (before): ${existingUsers.length}`)
    console.log(`   Staging users (after): ${finalUsers.length}`)
    console.log(`   New users added: ${insertedCount}`)

    if (insertedCount > 0) {
      console.log('\n🎉 You can now login to staging with:')
      staffUsers.forEach((user: any) => {
        if (!existingUsernames.has(user.username)) {
          console.log(`   - Username: ${user.username}`)
        }
      })
      console.log('\n   ℹ️  Use the same passwords as production')
    }

  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message)
    process.exit(1)
  }
}

// Run the sync
syncStaffUsers()
