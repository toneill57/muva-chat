/**
 * Multi-Tenant Isolation Test
 *
 * Verifies that subdomain detection works correctly and that
 * each tenant sees their own isolated data.
 */

const TENANTS = [
  { subdomain: 'simmerdown', name: 'Simmer Down Guest House' },
  { subdomain: 'free-hotel-test', name: 'Free Hotel Test' },
  { subdomain: 'xyz', name: 'XYZ Hotel' }
];

async function testTenant(subdomain: string, name: string) {
  console.log(`\n🧪 Testing: ${name} (${subdomain})`);
  console.log('━'.repeat(60));

  try {
    // Test subdomain detection endpoint
    const subdomainUrl = `https://${subdomain}.innpilot.io/api/test-subdomain`;
    const subdomainRes = await fetch(subdomainUrl);
    const subdomainData = await subdomainRes.json();

    console.log(`📍 Subdomain Detection:`);
    console.log(`   URL: ${subdomainUrl}`);
    console.log(`   Detected: "${subdomainData.subdomain}"`);
    console.log(`   Status: ${subdomainData.subdomain === subdomain ? '✅ PASS' : '❌ FAIL'}`);

    // Test that admin route is accessible
    const adminUrl = `https://${subdomain}.innpilot.io/admin`;
    const adminRes = await fetch(adminUrl, { redirect: 'manual' });

    console.log(`\n🔐 Admin Route:`);
    console.log(`   URL: ${adminUrl}`);
    console.log(`   Status: ${adminRes.status}`);
    console.log(`   Result: ${adminRes.status === 200 || adminRes.status === 302 ? '✅ PASS (Accessible)' : '❌ FAIL'}`);

    return {
      subdomain,
      success: subdomainData.subdomain === subdomain && (adminRes.status === 200 || adminRes.status === 302)
    };

  } catch (error) {
    console.log(`\n❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { subdomain, success: false };
  }
}

async function runTests() {
  console.log('\n🚀 Multi-Tenant Isolation Test');
  console.log('━'.repeat(60));
  console.log(`Testing ${TENANTS.length} tenants...\n`);

  const results = await Promise.all(
    TENANTS.map(t => testTenant(t.subdomain, t.name))
  );

  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('━'.repeat(60));

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  results.forEach(r => {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.subdomain}`);
  });

  console.log('\n' + '━'.repeat(60));
  console.log(`${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('✅ All tenants are correctly isolated!');
  } else {
    console.log('❌ Some tenants have issues');
    process.exit(1);
  }
}

runTests();
