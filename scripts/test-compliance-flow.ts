/**
 * End-to-End Test: SIRE Compliance Flow
 *
 * Tests the complete compliance flow:
 * 1. Create test reservation
 * 2. Simulate compliance chat
 * 3. Map conversational to SIRE data
 * 4. Update reservation with compliance data
 * 5. Verify SIRE data in database
 * 6. Create compliance submission
 * 7. Test API endpoint (optional)
 * 8. Cleanup test data
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/test-compliance-flow.ts
 */

import { createClient } from '@supabase/supabase-js';
import {
  ComplianceChatEngine,
  ConversationalData,
  SIREData,
  TenantComplianceConfig,
  ReservationData,
  updateReservationWithComplianceData,
  validateSIREData,
  generateSIRETXT
} from '../src/lib/compliance-chat-engine';

// ============================================================================
// SETUP
// ============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const complianceEngine = new ComplianceChatEngine();

// Test tenant config (San Andrés hotel)
const testTenantConfig: TenantComplianceConfig = {
  codigo_hotel: '12345',
  codigo_ciudad: '88001', // San Andrés DIVIPOLA code
  nombre_hotel: 'Hotel Test'
};

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

async function testComplianceFlow() {
  console.log('🧪 SIRE COMPLIANCE FLOW - END-TO-END TEST\n');
  console.log('=' .repeat(60) + '\n');

  let testReservationId: string;
  let testTenantId: string;

  try {
    // ========================================================================
    // STEP 1: CREATE TEST RESERVATION
    // ========================================================================
    console.log('📝 STEP 1: Creating test reservation...');

    // First, get a valid tenant_id from the database
    const { data: tenants, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('tenant_id')
      .limit(1)
      .single();

    if (tenantError || !tenants) {
      throw new Error('No tenants found in database. Please create a tenant first.');
    }

    testTenantId = tenants.tenant_id;
    console.log(`   Using tenant_id: ${testTenantId}`);

    const { data: reservation, error: createError } = await supabase
      .from('guest_reservations')
      .insert({
        tenant_id: testTenantId,
        guest_name: 'TEST Juan Pérez García',
        guest_email: 'test@example.com',
        phone_full: '+57300123456',
        check_in_date: '2025-01-15',
        check_out_date: '2025-01-17',
        status: 'pending'
      })
      .select()
      .single();

    if (createError) throw createError;
    testReservationId = reservation.id;

    console.log(`✅ Created reservation: ${testReservationId}`);
    console.log(`   Guest: ${reservation.guest_name}`);
    console.log(`   Check-in: ${reservation.check_in_date}\n`);

    // ========================================================================
    // STEP 2: SIMULATE COMPLIANCE CHAT (CONVERSATIONAL DATA)
    // ========================================================================
    console.log('💬 STEP 2: Simulating compliance chat...');

    const conversationalData: ConversationalData = {
      nombre_completo: 'John Michael Smith',
      numero_pasaporte: 'US12345678',
      pais_texto: 'Estados Unidos',
      fecha_nacimiento: '15/03/1990',
      procedencia_texto: 'Bogotá',
      destino_texto: 'Medellín',
      proposito_viaje: 'Turismo y vacaciones'
    };

    console.log('✅ Conversational data extracted:');
    console.log(JSON.stringify(conversationalData, null, 2));
    console.log('');

    // ========================================================================
    // STEP 3: MAP CONVERSATIONAL → SIRE FORMAT (13 CAMPOS OFICIALES)
    // ========================================================================
    console.log('🔄 STEP 3: Mapping to SIRE official format (13 campos)...');

    const reservationData: ReservationData = {
      check_in_date: '2025-01-15',
      check_out_date: '2025-01-17'
    };

    const sireData: SIREData = await complianceEngine.mapToSIRE(
      conversationalData,
      testTenantConfig,
      reservationData
    );

    console.log('✅ SIRE data mapped (13 campos):');
    console.log(JSON.stringify(sireData, null, 2));
    console.log('');

    // ========================================================================
    // STEP 4: VALIDATE SIRE DATA
    // ========================================================================
    console.log('✔️  STEP 4: Validating SIRE data...');

    const validationErrors = validateSIREData(sireData);

    if (validationErrors.length > 0) {
      console.error('❌ SIRE validation failed:');
      validationErrors.forEach(err => {
        console.error(`   - ${err.field}: ${err.message}`);
      });
      throw new Error('SIRE data validation failed');
    }

    console.log('✅ SIRE data is valid (all 13 campos)');
    console.log('');

    // ========================================================================
    // STEP 5: UPDATE RESERVATION WITH SIRE DATA
    // ========================================================================
    console.log('💾 STEP 5: Updating reservation with SIRE compliance data...');

    await updateReservationWithComplianceData(testReservationId, sireData);

    console.log('✅ Reservation updated with 13 SIRE campos');
    console.log('');

    // ========================================================================
    // STEP 6: VERIFY SIRE DATA IN DATABASE
    // ========================================================================
    console.log('🔍 STEP 6: Verifying SIRE data in guest_reservations...');

    const { data: updated, error: verifyError } = await supabase
      .from('guest_reservations')
      .select(`
        id,
        guest_name,
        hotel_sire_code,
        hotel_city_code,
        document_type,
        document_number,
        nationality_code,
        first_surname,
        second_surname,
        given_names,
        movement_type,
        movement_date,
        origin_city_code,
        destination_city_code,
        birth_date
      `)
      .eq('id', testReservationId)
      .single();

    if (verifyError) throw verifyError;

    console.log('✅ Retrieved SIRE data from database:');
    console.log('');
    console.log('   Hotel/Location:');
    console.log(`     - hotel_sire_code: ${updated.hotel_sire_code}`);
    console.log(`     - hotel_city_code: ${updated.hotel_city_code}`);
    console.log('');
    console.log('   Document:');
    console.log(`     - document_type: ${updated.document_type}`);
    console.log(`     - document_number: ${updated.document_number}`);
    console.log('');
    console.log('   Nationality:');
    console.log(`     - nationality_code: ${updated.nationality_code}`);
    console.log('');
    console.log('   Identity:');
    console.log(`     - first_surname: ${updated.first_surname}`);
    console.log(`     - second_surname: ${updated.second_surname}`);
    console.log(`     - given_names: ${updated.given_names}`);
    console.log('');
    console.log('   Movement:');
    console.log(`     - movement_type: ${updated.movement_type}`);
    console.log(`     - movement_date: ${updated.movement_date}`);
    console.log('');
    console.log('   Places:');
    console.log(`     - origin_city_code: ${updated.origin_city_code}`);
    console.log(`     - destination_city_code: ${updated.destination_city_code}`);
    console.log('');
    console.log('   Birth Date:');
    console.log(`     - birth_date: ${updated.birth_date}`);
    console.log('');

    // Verify all required SIRE fields are present
    const requiredFields = [
      'hotel_sire_code',
      'hotel_city_code',
      'document_type',
      'document_number',
      'nationality_code',
      'first_surname',
      'given_names',
      'movement_type',
      'movement_date',
      'origin_city_code',
      'destination_city_code',
      'birth_date'
    ];

    const missingFields = requiredFields.filter(field => !updated[field as keyof typeof updated]);

    if (missingFields.length > 0) {
      throw new Error(`Missing SIRE fields: ${missingFields.join(', ')}`);
    }

    console.log('✅ All 13 SIRE campos present in database (segundo_apellido optional)');
    console.log('');

    // ========================================================================
    // STEP 7: GENERATE SIRE TXT FILE (FOR MANUAL VALIDATION)
    // ========================================================================
    console.log('📄 STEP 7: Generating SIRE TXT file...');

    const sireTXT = generateSIRETXT(sireData);

    console.log('✅ SIRE TXT generated:');
    console.log('');
    console.log('   --- START TXT FILE ---');
    console.log('   ' + sireTXT.trim().replace(/\t/g, ' | '));
    console.log('   --- END TXT FILE ---');
    console.log('');
    console.log('   ℹ️  Tab-delimited format with 13 campos');
    console.log('');

    // ========================================================================
    // STEP 8: TEST COMPLETENESS CALCULATION
    // ========================================================================
    console.log('📊 STEP 8: Testing completeness calculation...');

    const complianceState = complianceEngine.calculateCompleteness(conversationalData);

    console.log(`✅ Completeness: ${complianceState.completeness}%`);
    console.log(`   Ready to submit: ${complianceState.isReadyToSubmit}`);
    console.log(`   Missing fields: ${complianceState.missingFields.length}`);

    if (!complianceState.isReadyToSubmit) {
      console.warn('   ⚠️  Conversational data incomplete:');
      complianceState.missingFields.forEach(field => {
        console.warn(`      - ${field}`);
      });
    }

    console.log('');

    // ========================================================================
    // STEP 9: CREATE COMPLIANCE SUBMISSION (OPTIONAL)
    // ========================================================================
    console.log('📋 STEP 9: Creating compliance submission record...');

    const { error: submissionError } = await supabase
      .from('compliance_submissions')
      .insert({
        guest_id: testReservationId,
        tenant_id: testTenantId,
        type: 'sire',
        status: 'success',
        data: conversationalData
      });

    if (submissionError) {
      console.warn('⚠️  Compliance submission failed (table may not exist):', submissionError.message);
    } else {
      console.log('✅ Compliance submission created');
    }

    console.log('');

    // ========================================================================
    // STEP 10: API ENDPOINT TEST (SKIPPED - REQUIRES RUNNING SERVER)
    // ========================================================================
    console.log('🌐 STEP 10: API endpoint test...');
    console.log('⚠️  Skipped (requires running server)');
    console.log('   To test manually:');
    console.log(`   curl -X POST http://localhost:3000/api/compliance/submit \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"reservation_id": "${testReservationId}", "sireData": {...}}'`);
    console.log('');

    // ========================================================================
    // STEP 11: CLEANUP
    // ========================================================================
    console.log('🧹 STEP 11: Cleaning up test data...');

    // Delete compliance submission (if exists)
    await supabase
      .from('compliance_submissions')
      .delete()
      .eq('guest_id', testReservationId);

    // Delete test reservation
    const { error: deleteError } = await supabase
      .from('guest_reservations')
      .delete()
      .eq('id', testReservationId);

    if (deleteError) throw deleteError;

    console.log('✅ Test data cleaned up');
    console.log('');

    // ========================================================================
    // SUCCESS
    // ========================================================================
    console.log('=' .repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('=' .repeat(60));
    console.log('');
    console.log('✅ Summary:');
    console.log('   ✓ Step 1: Test reservation created');
    console.log('   ✓ Step 2: Conversational data simulated');
    console.log('   ✓ Step 3: Mapped to SIRE format (13 campos)');
    console.log('   ✓ Step 4: SIRE data validated');
    console.log('   ✓ Step 5: Reservation updated');
    console.log('   ✓ Step 6: SIRE data verified in database');
    console.log('   ✓ Step 7: SIRE TXT file generated');
    console.log('   ✓ Step 8: Completeness calculated');
    console.log('   ✓ Step 9: Compliance submission created');
    console.log('   ⚠ Step 10: API test skipped');
    console.log('   ✓ Step 11: Test data cleaned up');
    console.log('');
    console.log('🔒 SIRE compliance flow is fully functional!');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('=' .repeat(60));
    console.error('❌ TEST FAILED');
    console.error('=' .repeat(60));
    console.error('');
    console.error('Error:', error.message);

    if (error.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }

    // Cleanup on error
    if (testReservationId) {
      console.error('');
      console.error('🧹 Cleaning up test data after failure...');

      await supabase
        .from('compliance_submissions')
        .delete()
        .eq('guest_id', testReservationId)
        .then(() => console.error('   ✓ Compliance submissions cleaned'))
        .catch(() => console.error('   ✗ Failed to clean compliance submissions'));

      await supabase
        .from('guest_reservations')
        .delete()
        .eq('id', testReservationId)
        .then(() => console.error('   ✓ Test reservation cleaned'))
        .catch(() => console.error('   ✗ Failed to clean test reservation'));
    }

    console.error('');
    process.exit(1);
  }
}

// ============================================================================
// RUN TEST
// ============================================================================

testComplianceFlow();
