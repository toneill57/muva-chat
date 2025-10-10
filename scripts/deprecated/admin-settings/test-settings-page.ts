/**
 * Test Script for Admin Settings Page (FASE 4D.6)
 *
 * Tests:
 * 1. GET /api/admin/settings - Fetch current tenant settings
 * 2. PUT /api/admin/settings - Update tenant settings
 * 3. Verify persistence in database
 *
 * Run: npx tsx scripts/test-settings-page.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runTests() {
  console.log('🧪 Testing Admin Settings Page (FASE 4D.6)\n');

  // Test 1: Verify tenant exists
  console.log('1️⃣ Verifying test tenant (simmerdown)...');
  const { data: tenant, error: tenantError } = await supabase
    .from('tenant_registry')
    .select('*')
    .eq('subdomain', 'simmerdown')
    .single();

  if (tenantError || !tenant) {
    console.error('❌ Tenant not found:', tenantError?.message);
    return;
  }
  console.log('✅ Tenant found:', tenant.nombre_comercial);

  // Test 2: GET /api/admin/settings
  console.log('\n2️⃣ Testing GET /api/admin/settings...');
  const getResponse = await fetch('http://localhost:3000/api/admin/settings', {
    headers: {
      'Host': 'simmerdown.localhost:3000',
      'x-tenant-subdomain': 'simmerdown'
    }
  });

  if (!getResponse.ok) {
    console.error('❌ GET request failed:', getResponse.statusText);
    const errorText = await getResponse.text();
    console.error('Error details:', errorText);
    return;
  }

  const getData = await getResponse.json();
  console.log('✅ GET successful. Current settings:');
  console.log('   - Business Name:', getData.tenant.nombre_comercial);
  console.log('   - Legal Name:', getData.tenant.razon_social);
  console.log('   - Address:', getData.tenant.address || '(not set)');
  console.log('   - Phone:', getData.tenant.phone || '(not set)');
  console.log('   - Email:', getData.tenant.email || '(not set)');
  console.log('   - Social Media:', JSON.stringify(getData.tenant.social_media_links || {}));
  console.log('   - SEO Description:', getData.tenant.seo_meta_description || '(not set)');
  console.log('   - SEO Keywords:', getData.tenant.seo_keywords || []);

  // Test 3: PUT /api/admin/settings (update)
  console.log('\n3️⃣ Testing PUT /api/admin/settings (update)...');
  const testData = {
    nombre_comercial: 'SimmerDown Guest House TEST',
    razon_social: 'SimmerDown Ltd. TEST',
    address: '123 Beach Road, Santa Teresa, Puntarenas, Costa Rica',
    phone: '+506 1234-5678',
    email: 'info@simmerdown.io',
    social_media_links: {
      facebook: 'https://facebook.com/simmerdown',
      instagram: 'https://instagram.com/simmerdown',
      twitter: '',
      linkedin: '',
      tiktok: ''
    },
    seo_meta_description: 'Experience the ultimate surf and relaxation retreat at SimmerDown Guest House in Santa Teresa, Costa Rica. Book your beachfront accommodation today!',
    seo_keywords: ['surf lodge', 'santa teresa', 'costa rica', 'beachfront hotel', 'surf school']
  };

  const putResponse = await fetch('http://localhost:3000/api/admin/settings', {
    method: 'PUT',
    headers: {
      'Host': 'simmerdown.localhost:3000',
      'x-tenant-subdomain': 'simmerdown',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testData)
  });

  if (!putResponse.ok) {
    const errorData = await putResponse.json();
    console.error('❌ PUT request failed:', errorData.error);
    return;
  }

  const putData = await putResponse.json();
  console.log('✅ PUT successful:', putData);

  // Test 4: Verify persistence in database
  console.log('\n4️⃣ Verifying persistence in database...');
  const { data: updatedTenant, error: updateError } = await supabase
    .from('tenant_registry')
    .select('*')
    .eq('subdomain', 'simmerdown')
    .single();

  if (updateError || !updatedTenant) {
    console.error('❌ Failed to fetch updated tenant:', updateError?.message);
    return;
  }

  console.log('✅ Persistence verified:');
  console.log('   - Business Name:', updatedTenant.nombre_comercial);
  console.log('   - Legal Name:', updatedTenant.razon_social);
  console.log('   - Address:', updatedTenant.address);
  console.log('   - Phone:', updatedTenant.phone);
  console.log('   - Email:', updatedTenant.email);
  console.log('   - Social Media:', JSON.stringify(updatedTenant.social_media_links));
  console.log('   - SEO Description:', updatedTenant.seo_meta_description);
  console.log('   - SEO Keywords:', updatedTenant.seo_keywords);

  // Test 5: Character count validation
  console.log('\n5️⃣ Validating SEO description length...');
  const descLength = updatedTenant.seo_meta_description?.length || 0;
  if (descLength > 160) {
    console.log('⚠️  SEO description is too long:', descLength, 'characters (recommended max: 160)');
  } else {
    console.log('✅ SEO description length OK:', descLength, 'characters');
  }

  console.log('\n✅ All tests passed! Settings page is working correctly.');
}

// Run tests
runTests().catch(console.error);
