import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Debugging original_unit_id Mapping Issue\n');

  // Get SimmerDown tenant
  const { data: tenant } = await supabase
    .from('tenant_registry')
    .select('tenant_id')
    .eq('slug', 'simmerdown')
    .single();

  if (!tenant) {
    console.log('❌ SimmerDown tenant not found');
    return;
  }

  console.log(`✅ Tenant ID: ${tenant.tenant_id}\n`);

  // 1. Check hotels.accommodation_units (source for original_unit_id)
  console.log('1️⃣ Checking hotels.accommodation_units...');

  const { data: hotelsUnits } = await supabase.rpc('get_accommodation_units', {
    p_hotel_id: null,
    p_tenant_id: tenant.tenant_id
  });

  console.log(`   Found: ${hotelsUnits?.length || 0} units`);

  if (hotelsUnits && hotelsUnits.length > 0) {
    console.log('   Sample units:');
    hotelsUnits.slice(0, 3).forEach((u: any) => {
      console.log(`   - ${u.name} (${u.id})`);
    });
  } else {
    console.log('   ❌ EMPTY TABLE - This is the root cause!');
  }

  console.log('');

  // 2. Check accommodation_units_public (source of truth)
  console.log('2️⃣ Checking accommodation_units_public...');

  const { data: publicUnits } = await supabase.rpc('get_accommodation_units_by_tenant', {
    p_tenant_id: tenant.tenant_id
  });

  console.log(`   Found: ${publicUnits?.length || 0} chunks`);

  if (publicUnits && publicUnits.length > 0) {
    // Extract unique unit names
    const uniqueNames = [...new Set(
      publicUnits.map((u: any) => u.metadata?.original_accommodation || u.name.split(' - ')[0])
    )];

    console.log(`   Unique units: ${uniqueNames.length}`);
    console.log('   Sample units:');
    uniqueNames.slice(0, 5).forEach((name: any) => {
      console.log(`   - ${name}`);
    });
  }

  console.log('');

  // 3. Compare mapping
  console.log('3️⃣ Analyzing mapping...');

  if (!hotelsUnits || hotelsUnits.length === 0) {
    console.log('   ❌ PROBLEM: hotels.accommodation_units is EMPTY');
    console.log('   ❌ This means original_unit_id will ALWAYS be null');
    console.log('   ❌ Frontend will use public table IDs → 404 on manuals API');
    console.log('');
    console.log('   ROOT CAUSE IDENTIFIED:');
    console.log('   - accommodation_units_public has data (from MotoPress sync)');
    console.log('   - hotels.accommodation_units is EMPTY (not synced)');
    console.log('   - Mapping logic tries to join by name but finds nothing');
    console.log('   - Falls back to public ID which is wrong for manuals FK');
  } else {
    // Create mapping
    const nameToHotelsId = new Map(
      hotelsUnits.map((u: any) => [u.name, u.id])
    );

    // Check coverage
    const uniqueNames = [...new Set(
      (publicUnits || []).map((u: any) => u.metadata?.original_accommodation || u.name.split(' - ')[0])
    )];

    const mapped = uniqueNames.filter(name => nameToHotelsId.has(name));
    const unmapped = uniqueNames.filter(name => !nameToHotelsId.has(name));

    console.log(`   ✅ Mapped: ${mapped.length}/${uniqueNames.length} units`);

    if (unmapped.length > 0) {
      console.log(`   ⚠️ Unmapped units (will get 404s):`);
      unmapped.forEach(name => {
        console.log(`      - ${name}`);
      });
    }
  }

  console.log('');

  // 4. Test API endpoint behavior
  console.log('4️⃣ Testing /api/accommodations/units endpoint...');

  const response = await fetch('http://localhost:3001/api/accommodations/units', {
    headers: {
      'x-tenant-subdomain': 'simmerdown'
    }
  });

  if (!response.ok) {
    console.log(`   ❌ API error: ${response.status}`);
    return;
  }

  const data = await response.json();

  if (data.success && data.data) {
    console.log(`   ✅ API returned ${data.data.length} units`);

    const withOriginalId = data.data.filter((u: any) => u.original_unit_id);
    const withoutOriginalId = data.data.filter((u: any) => !u.original_unit_id);

    console.log(`   - With original_unit_id: ${withOriginalId.length}`);
    console.log(`   - Without original_unit_id (will cause 404): ${withoutOriginalId.length}`);

    if (withoutOriginalId.length > 0) {
      console.log('');
      console.log('   ⚠️ Units WITHOUT original_unit_id (these will get 404s):');
      withoutOriginalId.slice(0, 5).forEach((u: any) => {
        console.log(`      - ${u.name}`);
        console.log(`        Public ID: ${u.id}`);
        console.log(`        original_unit_id: ${u.original_unit_id || 'null'}`);
      });
    }
  }

  console.log('');
  console.log('📊 DIAGNOSIS COMPLETE');
}

main().catch(console.error);
