#!/usr/bin/env node
/**
 * Seed Test Tenants Script
 *
 * Creates 3 test tenants for multi-tenant subdomain chat:
 * 1. simmerdown - Surf school (already exists, will skip)
 * 2. xyz - Hotel
 * 3. hotel-boutique - Boutique hotel
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/seed-test-tenants.ts
 */

import { createClient } from '@supabase/supabase-js';

interface TenantInput {
  subdomain: string;
  nombre_comercial: string;
  razon_social: string;
  nit: string;
  tenant_type: string;
  subscription_tier: string;
  logo_url?: string;
}

const TEST_TENANTS: TenantInput[] = [
  {
    subdomain: 'simmerdown',
    nombre_comercial: 'Simmer Down Guest House',
    razon_social: 'O`NEILL SAID S.A.S.',
    nit: '900123456-7',
    tenant_type: 'hotel',
    subscription_tier: 'premium',
    logo_url: 'https://simmerdownsurfschool.com/logo.png',
  },
  {
    subdomain: 'xyz',
    nombre_comercial: 'XYZ Hotel & Spa',
    razon_social: 'XYZ HOTELS S.A.S.',
    nit: '900111222-3',
    tenant_type: 'hotel',
    subscription_tier: 'premium',
    logo_url: 'https://xyzhotel.com/logo.png',
  },
  {
    subdomain: 'hotel-boutique',
    nombre_comercial: 'Hotel Boutique Casa Colonial',
    razon_social: 'CASA COLONIAL LTDA',
    nit: '900333444-5',
    tenant_type: 'hotel',
    subscription_tier: 'basic',
    logo_url: 'https://hotelboutique.com/logo.png',
  },
];

async function seedTestTenants() {
  console.log('🌱 Starting tenant seeding...\n');

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseKey);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const tenant of TEST_TENANTS) {
    try {
      // Check if tenant already exists
      const { data: existing, error: checkError } = await supabase
        .from('tenant_registry')
        .select('tenant_id, subdomain, nombre_comercial')
        .eq('subdomain', tenant.subdomain)
        .maybeSingle();

      if (checkError) {
        console.error(`❌ Error checking tenant "${tenant.subdomain}":`, checkError.message);
        errorCount++;
        continue;
      }

      if (existing) {
        console.log(`⏭️  Tenant "${tenant.subdomain}" already exists (ID: ${existing.tenant_id})`);
        skipCount++;
        continue;
      }

      // Generate schema_name from subdomain
      const schemaName = `tenant_${tenant.subdomain.replace(/-/g, '_')}`;

      // Insert new tenant
      const { data, error: insertError } = await supabase
        .from('tenant_registry')
        .insert({
          nit: tenant.nit,
          razon_social: tenant.razon_social,
          nombre_comercial: tenant.nombre_comercial,
          schema_name: schemaName,
          subdomain: tenant.subdomain,
          slug: tenant.subdomain,
          tenant_type: tenant.tenant_type,
          is_active: true,
          subscription_tier: tenant.subscription_tier,
          features: {
            muva_access: tenant.subscription_tier === 'premium',
            premium_chat: tenant.subscription_tier === 'premium',
            guest_chat_enabled: true,
            staff_chat_enabled: true,
          },
          logo_url: tenant.logo_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('tenant_id, subdomain, nombre_comercial')
        .single();

      if (insertError) {
        console.error(`❌ Error inserting tenant "${tenant.subdomain}":`, insertError.message);
        errorCount++;
        continue;
      }

      console.log(`✅ Created tenant "${data.subdomain}" (${data.nombre_comercial}) - ID: ${data.tenant_id}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Unexpected error with tenant "${tenant.subdomain}":`, error);
      errorCount++;
    }
  }

  // Summary
  console.log('\n📊 Seeding Summary:');
  console.log(`   ✅ Created: ${successCount}`);
  console.log(`   ⏭️  Skipped (already exist): ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${TEST_TENANTS.length}`);

  if (errorCount > 0) {
    console.error('\n⚠️  Some tenants failed to seed. Check errors above.');
    process.exit(1);
  }

  if (successCount === 0 && skipCount === TEST_TENANTS.length) {
    console.log('\n✨ All test tenants already exist. No changes made.');
  } else if (successCount > 0) {
    console.log('\n🎉 Test tenants seeded successfully!');
  }

  // Verify all tenants exist
  console.log('\n🔍 Verifying tenant data...');
  const { data: allTenants, error: verifyError } = await supabase
    .from('tenant_registry')
    .select('tenant_id, subdomain, nombre_comercial, is_active, subscription_tier')
    .in('subdomain', TEST_TENANTS.map(t => t.subdomain))
    .order('subdomain');

  if (verifyError) {
    console.error('❌ Error verifying tenants:', verifyError.message);
    process.exit(1);
  }

  console.log('\n📋 Current test tenants in database:');
  allTenants?.forEach((tenant) => {
    const statusIcon = tenant.is_active ? '✅' : '❌';
    console.log(`   ${statusIcon} ${tenant.subdomain}.innpilot.io → ${tenant.nombre_comercial} (${tenant.subscription_tier})`);
  });

  console.log('\n✅ Tenant seeding complete!');
  console.log('\n📍 Test URLs:');
  allTenants?.forEach((tenant) => {
    console.log(`   • https://${tenant.subdomain}.innpilot.io/chat`);
  });
}

// Run the seeder
seedTestTenants().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
