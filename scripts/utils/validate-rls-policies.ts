import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔒 VALIDACIÓN 3: RLS Policies\n');

  // We can't query pg_policies directly via Supabase client, so let's verify
  // the policies exist by checking the migration file

  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const migrationPath = path.join(__dirname, '../supabase/migrations/20251109000000_fix_manual_system_fk_and_rls.sql');

  if (!fs.existsSync(migrationPath)) {
    console.log('❌ Migration file not found');
    return;
  }

  const content = fs.readFileSync(migrationPath, 'utf-8');

  console.log('1️⃣ Checking accommodation_manuals policies...');

  const manualsPolices = [
    'accommodation_manuals_tenant_isolation',
    'accommodation_manuals_insert',
    'accommodation_manuals_update',
    'accommodation_manuals_delete'
  ];

  manualsPolices.forEach(policy => {
    if (content.includes(`CREATE POLICY ${policy}`)) {
      console.log(`✅ ${policy}`);
    } else {
      console.log(`❌ ${policy} - NOT FOUND`);
    }
  });

  console.log('\n2️⃣ Verifying RLS pattern usage...');

  // Check that all policies use app.tenant_id
  const policySections = content.split('CREATE POLICY');

  let usingAppTenantId = 0;
  let usingCurrentTenantId = 0;

  policySections.forEach(section => {
    if (section.includes("app.tenant_id")) {
      usingAppTenantId++;
    }
    if (section.includes("app.current_tenant_id")) {
      usingCurrentTenantId++;
    }
  });

  console.log(`✅ Policies using 'app.tenant_id': ${usingAppTenantId}`);

  if (usingCurrentTenantId > 0) {
    console.log(`❌ Policies using 'app.current_tenant_id': ${usingCurrentTenantId} (SHOULD BE 0!)`);
  } else {
    console.log(`✅ Policies using 'app.current_tenant_id': 0 (correct)`);
  }

  console.log('\n3️⃣ Checking service_role bypass...');

  const hasServiceRoleBypass = content.includes("auth.role() = 'service_role'");

  if (hasServiceRoleBypass) {
    console.log('✅ service_role bypass present (allows API operations)');
  } else {
    console.log('⚠️ No service_role bypass found');
  }

  console.log('\n4️⃣ Checking policy operations coverage...');

  const operations = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
  const coverageFor = ['accommodation_manuals'];

  coverageFor.forEach(table => {
    console.log(`\nTable: ${table}`);
    operations.forEach(op => {
      const pattern = new RegExp(`CREATE POLICY.*\\n.*ON ${table} FOR ${op}`, 'i');
      if (pattern.test(content)) {
        console.log(`  ✅ ${op}`);
      } else {
        console.log(`  ❌ ${op} - NOT COVERED`);
      }
    });
  });

  // Note: accommodation_units_manual_chunks policies were created in initial migration
  // We're checking that accommodation_manuals was standardized

  console.log('\n📊 RLS VALIDATION COMPLETE');
  console.log('\n⚠️ Note: This validates migration file content only.');
  console.log('   To verify policies are actually applied, run the migration first.');
}

main().catch(console.error);
