import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 VALIDACIÓN 2: Database Schema\n');

  // Test 1: Check if tables exist
  console.log('1️⃣ Checking tables exist...');
  const { data: manualsData, error: manualsError } = await supabase
    .from('accommodation_manuals')
    .select('id')
    .limit(0);

  const { data: chunksData, error: chunksError } = await supabase
    .from('accommodation_units_manual_chunks')
    .select('id')
    .limit(0);

  if (manualsError) {
    console.log('❌ accommodation_manuals table:', manualsError.message);
  } else {
    console.log('✅ accommodation_manuals table exists');
  }

  if (chunksError) {
    console.log('❌ accommodation_units_manual_chunks table:', chunksError.message);
  } else {
    console.log('✅ accommodation_units_manual_chunks table exists');
  }

  // Test 2: Check if migration file has correct FK
  console.log('\n2️⃣ Checking migration file...');
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const migrationPath = path.join(__dirname, '../supabase/migrations/20251109000000_fix_manual_system_fk_and_rls.sql');

  if (fs.existsSync(migrationPath)) {
    const content = fs.readFileSync(migrationPath, 'utf-8');
    console.log('✅ Migration file exists');

    if (content.includes('REFERENCES accommodation_manuals(id)')) {
      console.log('✅ FK points to: accommodation_manuals(id)');
    } else {
      console.log('❌ FK does NOT point to accommodation_manuals(id)');
    }

    if (content.includes('ON DELETE CASCADE')) {
      console.log('✅ Has ON DELETE CASCADE');
    }

    if (content.includes("app.tenant_id")) {
      console.log('✅ RLS uses app.tenant_id (not app.current_tenant_id)');
    }
  } else {
    console.log('❌ Migration file not found');
  }

  // Test 3: Try to create a test manual to see if FK works
  console.log('\n3️⃣ Testing FK constraint (will fail if FK is wrong)...');

  // Get tenant ID for SimmerDown
  const { data: tenant } = await supabase
    .from('tenant_registry')
    .select('tenant_id')
    .eq('subdomain', 'simmerdown')
    .single();

  if (!tenant) {
    console.log('⚠️ SimmerDown tenant not found, skipping FK test');
    return;
  }

  // Get a test unit using RPC with tenant context
  const { data: units, error: unitsError } = await supabase.rpc('get_accommodation_units', {
    p_tenant_id: tenant.tenant_id
  });

  if (unitsError || !units || units.length === 0) {
    console.log('⚠️ No accommodation units found to test with');
    console.log('   Error:', unitsError);
    return;
  }

  const testUnit = units[0];
  console.log(`Using test unit: ${testUnit.name || testUnit.unit_name} (original_unit_id: ${testUnit.original_unit_id})`);

  // Try to insert a manual
  const { data: newManual, error: manualError} = await supabase
    .from('accommodation_manuals')
    .insert({
      accommodation_unit_id: testUnit.original_unit_id || testUnit.id,
      tenant_id: tenant.tenant_id,
      filename: '__test_validation.md',
      file_type: 'md',
      status: 'processing'
    })
    .select()
    .single();

  if (manualError) {
    console.log('❌ Failed to create test manual:', manualError.message);
    return;
  }

  console.log(`✅ Test manual created: ${newManual.id}`);

  // Try to insert a chunk referencing the manual
  const { data: newChunk, error: chunkError } = await supabase
    .from('accommodation_units_manual_chunks')
    .insert({
      manual_id: newManual.id,
      accommodation_unit_id: testUnit.original_unit_id || testUnit.id,
      tenant_id: tenant.tenant_id,
      chunk_index: 0,
      total_chunks: 1,
      chunk_content: 'Test content',
      section_title: 'Test Section',
      embedding: Array(3072).fill(0),
      embedding_balanced: Array(1536).fill(0),
      embedding_fast: Array(1024).fill(0)
    })
    .select()
    .single();

  if (chunkError) {
    console.log('❌ FK constraint test FAILED:', chunkError.message);
    console.log('   This means manual_id FK is pointing to wrong table!');

    // Clean up manual
    await supabase.from('accommodation_manuals').delete().eq('id', newManual.id);
  } else {
    console.log('✅ FK constraint test PASSED');
    console.log('   manual_id correctly references accommodation_manuals(id)');

    // Clean up
    await supabase.from('accommodation_manuals').delete().eq('id', newManual.id);
    console.log('✅ Test data cleaned up');
  }

  console.log('\n📊 SCHEMA VALIDATION COMPLETE');
}

main().catch(console.error);
