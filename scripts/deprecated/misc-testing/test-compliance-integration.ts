/**
 * Test Compliance Integration Script
 *
 * This script tests the end-to-end integration of SIRE compliance data
 * persistence into guest_reservations table.
 *
 * Steps:
 * 1. Verify database schema has SIRE fields
 * 2. Test parseSIREDate() function
 * 3. Test updateReservationWithComplianceData() function
 * 4. Verify data persists correctly
 *
 * Usage:
 *   npx tsx scripts/test-compliance-integration.ts
 */

import { createClient } from '@supabase/supabase-js';
import {
  parseSIREDate,
  updateReservationWithComplianceData,
  type SIREData,
} from '../src/lib/compliance-chat-engine';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

console.log('🧪 Test Compliance Integration');
console.log('================================\n');

// ============================================================================
// TEST 1: Verify Database Schema
// ============================================================================

async function testDatabaseSchema() {
  console.log('[Test 1/5] 📋 Verify database schema has SIRE fields...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Query a reservation to check if SIRE fields exist
    const { data, error } = await supabase
      .from('guest_reservations')
      .select(
        'id, document_type, document_number, birth_date, first_surname, second_surname, given_names, nationality_code, origin_city_code, destination_city_code'
      )
      .limit(1);

    if (error) {
      console.log('❌ FAIL: Database query error:', error.message);
      return false;
    }

    console.log('✅ PASS: Database schema includes all 9 SIRE fields');
    console.log('   Fields: document_type, document_number, birth_date, first_surname,');
    console.log('           second_surname, given_names, nationality_code, origin_city_code,');
    console.log('           destination_city_code\n');
    return true;
  } catch (error: any) {
    console.log('❌ FAIL: Unexpected error:', error.message);
    return false;
  }
}

// ============================================================================
// TEST 2: Test parseSIREDate() Function
// ============================================================================

function testParseSIREDate() {
  console.log('[Test 2/5] 📅 Test parseSIREDate() function...\n');

  const testCases = [
    { input: '15/10/2025', expectedDate: new Date(2025, 9, 15), shouldPass: true },
    { input: '25/03/1985', expectedDate: new Date(1985, 2, 25), shouldPass: true },
    { input: '01/01/2000', expectedDate: new Date(2000, 0, 1), shouldPass: true },
    { input: '31/12/1999', expectedDate: new Date(1999, 11, 31), shouldPass: true },
    { input: 'invalid', expectedDate: null, shouldPass: false },
    { input: '32/13/2025', expectedDate: null, shouldPass: false },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      const result = parseSIREDate(testCase.input);

      if (testCase.shouldPass) {
        // Should succeed - check if date matches
        if (result.getTime() === testCase.expectedDate!.getTime()) {
          console.log(`  ✅ PASS: "${testCase.input}" → ${result.toISOString().split('T')[0]}`);
          passed++;
        } else {
          console.log(
            `  ❌ FAIL: "${testCase.input}" - Expected ${testCase.expectedDate!.toISOString().split('T')[0]}, got ${result.toISOString().split('T')[0]}`
          );
          failed++;
        }
      } else {
        console.log(`  ❌ FAIL: "${testCase.input}" - Should have thrown error but didn't`);
        failed++;
      }
    } catch (error: any) {
      if (!testCase.shouldPass) {
        console.log(`  ✅ PASS: "${testCase.input}" → Correctly rejected (${error.message})`);
        passed++;
      } else {
        console.log(`  ❌ FAIL: "${testCase.input}" → Unexpected error: ${error.message}`);
        failed++;
      }
    }
  }

  console.log(`\n  Summary: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

// ============================================================================
// TEST 3: Find Test Reservation
// ============================================================================

async function findTestReservation() {
  console.log('[Test 3/5] 🔍 Finding test reservation...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Find any active reservation
  const { data: reservations, error } = await supabase
    .from('guest_reservations')
    .select('id, guest_name, tenant_id, check_in_date')
    .eq('status', 'confirmed')
    .is('document_type', null) // Find one without SIRE data yet
    .limit(1);

  if (error || !reservations || reservations.length === 0) {
    console.log('⚠️  No test reservation found (need at least one confirmed reservation)');
    console.log('   You can create one manually or skip this test.\n');
    return null;
  }

  const reservation = reservations[0];
  console.log('✅ Found test reservation:');
  console.log(`   ID: ${reservation.id}`);
  console.log(`   Guest: ${reservation.guest_name}`);
  console.log(`   Tenant: ${reservation.tenant_id}`);
  console.log(`   Check-in: ${reservation.check_in_date}\n`);

  return reservation;
}

// ============================================================================
// TEST 4: Test updateReservationWithComplianceData()
// ============================================================================

async function testUpdateReservation(reservationId: string) {
  console.log('[Test 4/5] 💾 Test updateReservationWithComplianceData()...\n');

  // Mock SIRE data
  const testSireData: SIREData = {
    codigo_hotel: '999999',
    codigo_ciudad: '88001',
    tipo_documento: '3', // Pasaporte
    numero_identificacion: 'AB1234567',
    codigo_nacionalidad: '249', // USA (SIRE code)
    primer_apellido: 'GARCÍA',
    segundo_apellido: 'PÉREZ',
    nombres: 'JUAN PABLO',
    tipo_movimiento: 'E', // Entrada
    fecha_movimiento: '15/10/2025',
    lugar_procedencia: '249', // USA
    lugar_destino: '169', // Colombia
    fecha_nacimiento: '25/03/1985',
  };

  console.log('  Test SIRE data:');
  console.log(`    - Document: ${testSireData.tipo_documento} / ${testSireData.numero_identificacion}`);
  console.log(`    - Name: ${testSireData.nombres} ${testSireData.primer_apellido} ${testSireData.segundo_apellido}`);
  console.log(`    - Nationality: ${testSireData.codigo_nacionalidad}`);
  console.log(`    - Birth Date: ${testSireData.fecha_nacimiento}\n`);

  try {
    await updateReservationWithComplianceData(reservationId, testSireData);

    console.log('  ✅ PASS: Function executed without errors\n');
    return true;
  } catch (error: any) {
    console.log(`  ❌ FAIL: ${error.message}\n`);
    return false;
  }
}

// ============================================================================
// TEST 5: Verify Data Persisted
// ============================================================================

async function verifyDataPersisted(reservationId: string) {
  console.log('[Test 5/5] ✔️  Verify data persisted correctly...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: reservation, error } = await supabase
    .from('guest_reservations')
    .select(
      'id, document_type, document_number, birth_date, first_surname, second_surname, given_names, nationality_code, origin_city_code, destination_city_code'
    )
    .eq('id', reservationId)
    .single();

  if (error || !reservation) {
    console.log('  ❌ FAIL: Could not fetch reservation');
    return false;
  }

  console.log('  Persisted data:');
  console.log(`    - document_type: ${reservation.document_type}`);
  console.log(`    - document_number: ${reservation.document_number}`);
  console.log(`    - birth_date: ${reservation.birth_date}`);
  console.log(`    - first_surname: ${reservation.first_surname}`);
  console.log(`    - second_surname: ${reservation.second_surname}`);
  console.log(`    - given_names: ${reservation.given_names}`);
  console.log(`    - nationality_code: ${reservation.nationality_code}`);
  console.log(`    - origin_city_code: ${reservation.origin_city_code}`);
  console.log(`    - destination_city_code: ${reservation.destination_city_code}\n`);

  // Verify expected values
  const checks = [
    { field: 'document_type', expected: '3', actual: reservation.document_type },
    { field: 'document_number', expected: 'AB1234567', actual: reservation.document_number },
    { field: 'birth_date', expected: '1985-03-25', actual: reservation.birth_date },
    { field: 'first_surname', expected: 'GARCÍA', actual: reservation.first_surname },
    { field: 'second_surname', expected: 'PÉREZ', actual: reservation.second_surname },
    { field: 'given_names', expected: 'JUAN PABLO', actual: reservation.given_names },
    { field: 'nationality_code', expected: '249', actual: reservation.nationality_code },
    { field: 'origin_city_code', expected: '249', actual: reservation.origin_city_code },
    {
      field: 'destination_city_code',
      expected: '169',
      actual: reservation.destination_city_code,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    if (check.expected === check.actual) {
      console.log(`  ✅ ${check.field}: ${check.actual}`);
      passed++;
    } else {
      console.log(`  ❌ ${check.field}: Expected "${check.expected}", got "${check.actual}"`);
      failed++;
    }
  }

  console.log(`\n  Summary: ${passed}/9 fields correct\n`);
  return failed === 0;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Database Schema
  const test1 = await testDatabaseSchema();
  if (test1) testsPassed++;
  else testsFailed++;

  // Test 2: parseSIREDate()
  const test2 = testParseSIREDate();
  if (test2) testsPassed++;
  else testsFailed++;

  // Test 3-5: Integration test (only if we have a reservation)
  const testReservation = await findTestReservation();

  if (testReservation) {
    // Test 4: Update function
    const test4 = await testUpdateReservation(testReservation.id);
    if (test4) testsPassed++;
    else testsFailed++;

    // Test 5: Verify persistence
    const test5 = await verifyDataPersisted(testReservation.id);
    if (test5) testsPassed++;
    else testsFailed++;
  } else {
    console.log('⚠️  Skipping tests 4-5 (no test reservation available)\n');
  }

  // Final summary
  console.log('================================');
  console.log('📊 Final Summary');
  console.log('================================');
  console.log(`✅ Tests passed: ${testsPassed}`);
  console.log(`❌ Tests failed: ${testsFailed}`);
  console.log('');

  if (testsFailed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

main().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
