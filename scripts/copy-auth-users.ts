#!/usr/bin/env tsx
/**
 * Copy auth.users from Production to Staging
 * This is required before copying user_tenant_permissions
 */

import { createClient } from '@supabase/supabase-js';

const PROD_PROJECT_ID = 'ooaumjzaztmutltifhoq';
const STAGING_PROJECT_ID = 'qlvkgniqcoisbnwwjfte';

const SUPABASE_URL_PROD = `https://${PROD_PROJECT_ID}.supabase.co`;
const SUPABASE_URL_STAGING = `https://${STAGING_PROJECT_ID}.supabase.co`;

const PROD_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STAGING_SERVICE_ROLE_KEY = process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY;

if (!PROD_SERVICE_ROLE_KEY || !STAGING_SERVICE_ROLE_KEY) {
  console.error('❌ Missing service role keys');
  process.exit(1);
}

const prodClient = createClient(SUPABASE_URL_PROD, PROD_SERVICE_ROLE_KEY);
const stagingClient = createClient(SUPABASE_URL_STAGING, STAGING_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function copyAuthUsers() {
  console.log('🔐 Copying auth.users from production to staging\n');

  try {
    // Get users from production
    const { data: prodUsers, error: readError } = await prodClient
      .from('users')
      .select('*')
      .schema('auth');

    if (readError) {
      console.error('❌ Error reading production users:', readError);
      process.exit(1);
    }

    if (!prodUsers || prodUsers.length === 0) {
      console.log('⚠️  No users found in production auth.users');
      return;
    }

    console.log(`📊 Found ${prodUsers.length} users in production`);
    
    // Check if users already exist in staging
    const { count: existingCount } = await stagingClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .schema('auth');

    if (existingCount && existingCount > 0) {
      console.log(`⏭️  Skipping - staging already has ${existingCount} users`);
      return;
    }

    // Use Admin API to create users (INSERT won't work for auth.users)
    console.log('🔧 Creating users via Supabase Admin API...\n');
    
    for (const user of prodUsers) {
      console.log(`  📝 Creating: ${user.email}`);
      
      // Use service role to create user directly
      const { data, error } = await stagingClient.auth.admin.createUser({
        email: user.email,
        email_confirm: true,
        user_metadata: user.raw_user_meta_data || {},
        app_metadata: user.raw_app_meta_data || {},
        // Note: We can't set the same UUID, Supabase will generate a new one
        // This means we'll need to map old UUIDs to new ones
      });

      if (error) {
        console.error(`  ❌ Error creating ${user.email}:`, error.message);
      } else {
        console.log(`  ✅ Created: ${data.user?.id}`);
        console.log(`     Old ID: ${user.id}`);
        console.log(`     New ID: ${data.user?.id}`);
        console.log(`     ⚠️  UUID CHANGED - you'll need to update references!`);
      }
    }

    console.log('\n✅ Auth users copy complete');
    console.log('\n⚠️  IMPORTANT: User UUIDs have changed!');
    console.log('    You must update user_id references in user_tenant_permissions');
    
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

copyAuthUsers();
