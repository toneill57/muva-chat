/**
 * Sync Compliance Data to Reservations Script
 *
 * This script reads compliance_submissions table and updates the associated
 * guest_reservations with the 9 SIRE compliance fields.
 *
 * Usage:
 *   npx tsx scripts/sync-compliance-to-reservations.ts [--dry-run] [--tenant-id=<uuid>]
 *
 * Options:
 *   --dry-run       Show what would be updated without making changes
 *   --tenant-id     Only sync reservations for a specific tenant
 *
 * Examples:
 *   npx tsx scripts/sync-compliance-to-reservations.ts --dry-run
 *   npx tsx scripts/sync-compliance-to-reservations.ts
 *   npx tsx scripts/sync-compliance-to-reservations.ts --tenant-id=550e8400-e29b-41d4-a716-446655440000
 */

import { createClient } from '@supabase/supabase-js';
import { parseSIREDate } from '../src/lib/compliance-chat-engine';

// ============================================================================
// TYPES
// ============================================================================

interface SIREData {
  codigo_hotel: string;
  codigo_ciudad: string;
  tipo_documento: string;
  numero_identificacion: string;
  codigo_nacionalidad: string;
  primer_apellido: string;
  segundo_apellido: string;
  nombres: string;
  tipo_movimiento: string;
  fecha_movimiento: string;
  lugar_procedencia: string;
  lugar_destino: string;
  fecha_nacimiento: string;
}

interface ComplianceSubmission {
  id: string;
  guest_id: string;
  tenant_id: string;
  status: string;
  data: {
    sire_data?: SIREData;
  };
  submitted_at: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nMake sure these are set in your .env.local file');
  process.exit(1);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const tenantIdArg = args.find((arg) => arg.startsWith('--tenant-id='));
const tenantIdFilter = tenantIdArg ? tenantIdArg.split('=')[1] : null;

console.log('🔧 Sync Compliance to Reservations Script');
console.log('==========================================');
console.log(`Mode: ${isDryRun ? '🌵 DRY RUN (no changes will be made)' : '✍️  LIVE (will update database)'}`);
if (tenantIdFilter) {
  console.log(`Filter: Tenant ID = ${tenantIdFilter}`);
}
console.log('');

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  // Initialize Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('[1/4] 📋 Fetching compliance submissions...\n');

  // Build query for compliance submissions
  let query = supabase
    .from('compliance_submissions')
    .select('id, guest_id, tenant_id, status, data, submitted_at')
    .eq('status', 'pending')
    .not('guest_id', 'is', null)
    .order('submitted_at', { ascending: true });

  // Apply tenant filter if provided
  if (tenantIdFilter) {
    query = query.eq('tenant_id', tenantIdFilter);
  }

  const { data: submissions, error: submissionsError } = await query;

  if (submissionsError) {
    console.error('❌ Failed to fetch submissions:', submissionsError);
    process.exit(1);
  }

  if (!submissions || submissions.length === 0) {
    console.log('ℹ️  No compliance submissions found with status=pending');
    process.exit(0);
  }

  console.log(`✅ Found ${submissions.length} compliance submission(s)\n`);

  console.log('[2/4] 🔍 Processing submissions...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const submission of submissions as ComplianceSubmission[]) {
    const sireData = submission.data?.sire_data;

    if (!sireData) {
      console.log(`⚠️  Submission ${submission.id}: No SIRE data found (skipping)`);
      skipCount++;
      continue;
    }

    // Validate guest_id is a valid reservation
    const { data: reservation, error: reservationError } = await supabase
      .from('guest_reservations')
      .select('id, guest_name, tenant_id')
      .eq('id', submission.guest_id)
      .single();

    if (reservationError || !reservation) {
      console.log(
        `⚠️  Submission ${submission.id}: Reservation ${submission.guest_id} not found (skipping)`
      );
      skipCount++;
      continue;
    }

    console.log(`📝 Submission ${submission.id}:`);
    console.log(`   Guest: ${reservation.guest_name}`);
    console.log(`   Reservation ID: ${reservation.id}`);
    console.log(`   Tenant ID: ${reservation.tenant_id}`);
    console.log(`   SIRE Data:`);
    console.log(`     - Document: ${sireData.tipo_documento} / ${sireData.numero_identificacion}`);
    console.log(`     - Name: ${sireData.nombres} ${sireData.primer_apellido} ${sireData.segundo_apellido}`);
    console.log(`     - Nationality: ${sireData.codigo_nacionalidad}`);
    console.log(`     - Birth Date: ${sireData.fecha_nacimiento}`);

    if (isDryRun) {
      console.log('   🌵 DRY RUN - Would update reservation (no changes made)\n');
      successCount++;
      continue;
    }

    // Parse birth date
    let birthDate: string;
    try {
      const parsedDate = parseSIREDate(sireData.fecha_nacimiento);
      birthDate = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD
    } catch (dateError: any) {
      console.log(`   ❌ Failed to parse birth date: ${dateError.message}\n`);
      errorCount++;
      continue;
    }

    // Update guest_reservations with 9 SIRE fields
    const { error: updateError } = await supabase
      .from('guest_reservations')
      .update({
        document_type: sireData.tipo_documento,
        document_number: sireData.numero_identificacion,
        birth_date: birthDate,
        first_surname: sireData.primer_apellido,
        second_surname: sireData.segundo_apellido,
        given_names: sireData.nombres,
        nationality_code: sireData.codigo_nacionalidad,
        origin_city_code: sireData.lugar_procedencia,
        destination_city_code: sireData.lugar_destino,
      })
      .eq('id', reservation.id);

    if (updateError) {
      console.log(`   ❌ Failed to update reservation: ${updateError.message}\n`);
      errorCount++;
      continue;
    }

    console.log('   ✅ Reservation updated successfully\n');
    successCount++;
  }

  console.log('[3/4] 📊 Summary\n');
  console.log(`Total submissions processed: ${submissions.length}`);
  console.log(`✅ Successfully ${isDryRun ? 'would update' : 'updated'}: ${successCount}`);
  console.log(`⚠️  Skipped: ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('');

  if (isDryRun) {
    console.log('[4/4] 🌵 DRY RUN COMPLETE');
    console.log('No changes were made to the database.');
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log('[4/4] ✅ SYNC COMPLETE');
    console.log(`Updated ${successCount} reservation(s) with SIRE compliance data.`);
  }

  process.exit(0);
}

// ============================================================================
// EXECUTE
// ============================================================================

main().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
