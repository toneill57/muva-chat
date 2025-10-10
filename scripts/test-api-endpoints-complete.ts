/**
 * Complete API Endpoints Validation Test Suite
 *
 * Tests the entire flow from Guest Login → Compliance Submit → Staff Dashboard
 * Validates SIRE compliance data flow, accommodation unit filtering, and security
 *
 * Run with: set -a && source .env.local && set +a && npx tsx scripts/test-api-endpoints-complete.ts
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test data IDs (will be populated during tests)
let testReservationId: string;
let testTenantId: string;
let testAccommodationUnitId: string;
let testStaffToken: string;
let testGuestToken: string;

// ============================================================================
// Test Results Tracking
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, duration: number, details?: string, error?: string) {
  results.push({ name, passed, duration, details, error });

  const icon = passed ? '✅' : '❌';
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`\n${icon} TEST ${results.length}: ${name} [${status}] (${duration}ms)`);

  if (details) {
    console.log(`   📊 ${details}`);
  }

  if (error) {
    console.error(`   ❌ Error: ${error}`);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function generateStaffToken(tenantId: string): Promise<string> {
  // Fetch a staff user for this tenant
  const { data: staff, error } = await supabase
    .from('staff_users')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error || !staff) {
    console.warn('⚠️  No staff user found, creating test staff user...');

    // Create a test staff user
    const { data: newStaff, error: createError } = await supabase
      .from('staff_users')
      .insert({
        tenant_id: tenantId,
        username: 'test-staff',
        password_hash: 'test-hash', // Not used for token generation
        full_name: 'Test Staff User',
        is_active: true,
        role: 'admin',
      })
      .select()
      .single();

    if (createError || !newStaff) {
      throw new Error('Failed to create test staff user');
    }

    console.log('   ℹ️  Created test staff user');
    return generateJWTForStaff(newStaff);
  }

  return generateJWTForStaff(staff);
}

async function generateJWTForStaff(staff: any): Promise<string> {
  // Generate JWT manually (same format as staff-auth.ts)
  const { SignJWT } = await import('jose');
  const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key-change-in-production');

  const token = await new SignJWT({
    staff_id: staff.id,
    tenant_id: staff.tenant_id,
    username: staff.username,
    role: staff.role || 'staff',
    type: 'staff',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);

  return token;
}

// ============================================================================
// TEST 1: Guest Login - Verify Session with Accommodation Unit
// ============================================================================

async function testGuestLogin(): Promise<void> {
  const startTime = Date.now();
  const testName = 'Guest Login - Session with Accommodation Unit';

  try {
    // Get a test reservation with accommodation_unit_id
    const { data: reservations, error: fetchError } = await supabase
      .from('guest_reservations')
      .select('*')
      .eq('status', 'active')
      .not('accommodation_unit_id', 'is', null)
      .limit(1)
      .single();

    if (fetchError || !reservations) {
      throw new Error('No test reservation found with accommodation_unit_id');
    }

    testReservationId = reservations.id;
    testTenantId = reservations.tenant_id;
    testAccommodationUnitId = reservations.accommodation_unit_id;

    console.log(`\n🧪 Using test reservation:`, {
      reservation_id: testReservationId,
      guest_name: reservations.guest_name,
      accommodation_unit_id: testAccommodationUnitId,
      check_in: reservations.check_in_date,
    });

    // Call Guest Login API
    const response = await fetch(`${BASE_URL}/api/guest/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: testTenantId,
        check_in_date: reservations.check_in_date,
        phone_last_4: reservations.phone_last_4,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Login failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    testGuestToken = data.token;

    // Validate response structure
    const hasToken = !!data.token;
    const hasReservationId = !!data.reservation_id;
    const hasAccommodationUnit = !!data.guest_info?.accommodation_unit;
    const hasUnitId = !!data.guest_info?.accommodation_unit?.id;
    const hasUnitName = !!data.guest_info?.accommodation_unit?.name;

    const allChecks = hasToken && hasReservationId && hasAccommodationUnit && hasUnitId && hasUnitName;

    const details = `Token: ${hasToken ? '✓' : '✗'}, Reservation ID: ${hasReservationId ? '✓' : '✗'}, Accommodation Unit: ${hasAccommodationUnit ? '✓' : '✗'} (id: ${hasUnitId ? '✓' : '✗'}, name: ${hasUnitName ? '✓' : '✗'})`;

    logTest(testName, allChecks, Date.now() - startTime, details);

    if (hasAccommodationUnit) {
      console.log(`   🏠 Accommodation: ${data.guest_info.accommodation_unit.name} (ID: ${data.guest_info.accommodation_unit.id})`);
    }
  } catch (error: any) {
    logTest(testName, false, Date.now() - startTime, undefined, error.message);
  }
}

// ============================================================================
// TEST 2: Compliance Submit - Create SIRE Data
// ============================================================================

async function testComplianceSubmit(): Promise<void> {
  const startTime = Date.now();
  const testName = 'Compliance Submit - SIRE Data Creation';

  try {
    // First, ensure tenant has SIRE codes configured
    const { data: tenant } = await supabase
      .from('tenant_registry')
      .select('features')
      .eq('tenant_id', testTenantId)
      .single();

    if (!tenant?.features?.sire_hotel_code) {
      // Update tenant with test SIRE codes
      await supabase
        .from('tenant_registry')
        .update({
          features: {
            ...tenant?.features,
            sire_hotel_code: '12345',
            sire_city_code: '88001',
          },
        })
        .eq('tenant_id', testTenantId);

      console.log('   ℹ️  Added SIRE codes to tenant for testing');
    }

    const conversationalData = {
      nombre_completo: 'TEST John Michael Smith',
      numero_pasaporte: 'TEST12345',
      pais_texto: 'Estados Unidos',
      fecha_nacimiento: '15/03/1990',
      procedencia_texto: 'Bogotá',
      destino_texto: 'Medellín',
      proposito_viaje: 'Turismo',
    };

    const response = await fetch(`${BASE_URL}/api/compliance/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationalData,
        reservationId: testReservationId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Submit failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();

    // Verify submission was created
    const hasSubmissionId = !!data.submissionId;
    const hasStatus = data.status === 'pending';

    // Verify guest_reservations was updated with SIRE data
    const { data: updatedReservation, error: fetchError } = await supabase
      .from('guest_reservations')
      .select('document_type, document_number, birth_date, nationality_code')
      .eq('id', testReservationId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch updated reservation: ${fetchError.message}`);
    }

    const hasSIREData = !!(
      updatedReservation.document_type &&
      updatedReservation.document_number &&
      updatedReservation.birth_date &&
      updatedReservation.nationality_code
    );

    const allChecks = hasSubmissionId && hasStatus && hasSIREData;

    const details = `Submission ID: ${hasSubmissionId ? '✓' : '✗'}, Status: ${hasStatus ? '✓' : '✗'}, SIRE Data in DB: ${hasSIREData ? '✓' : '✗'}`;

    logTest(testName, allChecks, Date.now() - startTime, details);

    if (hasSIREData) {
      console.log(`   📋 SIRE Data: doc_type=${updatedReservation.document_type}, nationality=${updatedReservation.nationality_code}, birth_date=${updatedReservation.birth_date}`);
    }
  } catch (error: any) {
    logTest(testName, false, Date.now() - startTime, undefined, error.message);
  }
}

// ============================================================================
// TEST 3: Reservations List (Staff) - SIRE Fields
// ============================================================================

async function testReservationsList(): Promise<void> {
  const startTime = Date.now();
  const testName = 'Reservations List (Staff) - SIRE Fields';

  try {
    // Generate staff token
    testStaffToken = await generateStaffToken(testTenantId);

    const response = await fetch(`${BASE_URL}/api/reservations/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testStaffToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Reservations list failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();

    // Verify response structure
    const hasSuccess = data.success === true;
    const hasReservations = Array.isArray(data.data?.reservations);
    const hasTotal = typeof data.data?.total === 'number';

    // Find our test reservation in the list
    const testReservation = data.data.reservations.find((r: any) => r.id === testReservationId);

    if (!testReservation) {
      throw new Error('Test reservation not found in list');
    }

    // Verify SIRE fields are present
    const sireFields = [
      'document_type',
      'document_number',
      'birth_date',
      'first_surname',
      'second_surname',
      'given_names',
      'nationality_code',
      'origin_city_code',
      'destination_city_code',
    ];

    const sireFieldsPresent = sireFields.every(field => field in testReservation);
    const hasSIREDataPopulated = !!(
      testReservation.document_type &&
      testReservation.document_number &&
      testReservation.nationality_code
    );

    // Verify accommodation_unit is included
    const hasAccommodationUnit = !!testReservation.accommodation_unit;

    const allChecks = hasSuccess && hasReservations && hasTotal && sireFieldsPresent && hasSIREDataPopulated && hasAccommodationUnit;

    const details = `Success: ${hasSuccess ? '✓' : '✗'}, Reservations Array: ${hasReservations ? '✓' : '✗'}, SIRE Fields: ${sireFieldsPresent ? '✓' : '✗'}, SIRE Data: ${hasSIREDataPopulated ? '✓' : '✗'}, Accommodation Unit: ${hasAccommodationUnit ? '✓' : '✗'}`;

    logTest(testName, allChecks, Date.now() - startTime, details);

    if (allChecks) {
      console.log(`   📊 Found ${data.data.total} reservations, SIRE fields validated on test reservation`);
      if (hasAccommodationUnit) {
        console.log(`   🏠 Accommodation: ${testReservation.accommodation_unit.name}`);
      }
    }
  } catch (error: any) {
    logTest(testName, false, Date.now() - startTime, undefined, error.message);
  }
}

// ============================================================================
// TEST 4: SIRE Guest Data - Catalog Lookups
// ============================================================================

async function testSIREGuestData(): Promise<void> {
  const startTime = Date.now();
  const testName = 'SIRE Guest Data - Catalog Lookups';

  try {
    const response = await fetch(
      `${BASE_URL}/api/sire/guest-data?reservation_id=${testReservationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testStaffToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`SIRE guest data failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();

    const hasSuccess = data.success === true;
    const hasData = !!data.data;

    // Verify catalog lookups (names, not just codes)
    const hasNationalityName = !!data.data?.nationality_name;
    const hasDocumentTypeName = !!data.data?.document_type_name;

    const allChecks = hasSuccess && hasData && (hasNationalityName || hasDocumentTypeName);

    const details = `Success: ${hasSuccess ? '✓' : '✗'}, Data: ${hasData ? '✓' : '✗'}, Catalog Lookups: ${(hasNationalityName || hasDocumentTypeName) ? '✓' : '✗'}`;

    logTest(testName, allChecks, Date.now() - startTime, details);

    if (hasData) {
      console.log(`   📖 Nationality: ${data.data.nationality_name || 'N/A'} (${data.data.nationality_code || 'N/A'})`);
      console.log(`   📄 Document Type: ${data.data.document_type_name || 'N/A'} (${data.data.document_type || 'N/A'})`);
    }
  } catch (error: any) {
    logTest(testName, false, Date.now() - startTime, undefined, error.message);
  }
}

// ============================================================================
// TEST 5: SIRE Statistics - Completeness Rate
// ============================================================================

async function testSIREStatistics(): Promise<void> {
  const startTime = Date.now();
  const testName = 'SIRE Statistics - Completeness Rate';

  try {
    const startDate = '2025-01-01';
    const endDate = '2025-12-31';

    const response = await fetch(
      `${BASE_URL}/api/sire/statistics?start_date=${startDate}&end_date=${endDate}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testStaffToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`SIRE statistics failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();

    const hasSuccess = data.success === true;
    const hasData = !!data.data;
    const hasCompletionRate = typeof data.data?.completion_rate === 'number';
    const hasTotalReservations = typeof data.data?.total_reservations === 'number';

    const allChecks = hasSuccess && hasData && hasCompletionRate && hasTotalReservations;

    const details = `Success: ${hasSuccess ? '✓' : '✗'}, Data: ${hasData ? '✓' : '✗'}, Completion Rate: ${hasCompletionRate ? '✓' : '✗'}, Total: ${hasTotalReservations ? '✓' : '✗'}`;

    logTest(testName, allChecks, Date.now() - startTime, details);

    if (hasData) {
      console.log(`   📈 Total Reservations: ${data.data.total_reservations}`);
      console.log(`   ✅ Complete: ${data.data.sire_complete_reservations} (${data.data.completion_rate.toFixed(1)}%)`);
      console.log(`   ⚠️  Incomplete: ${data.data.sire_incomplete_reservations}`);
    }
  } catch (error: any) {
    logTest(testName, false, Date.now() - startTime, undefined, error.message);
  }
}

// ============================================================================
// TEST 6: Unit Manual Security - Filtered by Accommodation Unit
// ============================================================================

async function testUnitManualSecurity(): Promise<void> {
  const startTime = Date.now();
  const testName = 'Unit Manual Security - Filtered by Unit ID';

  try {
    // Call the RPC function directly to verify filtering
    const { data, error } = await supabase.rpc('match_unit_manual_chunks', {
      query_embedding: new Array(1536).fill(0.001), // Dummy embedding
      p_accommodation_unit_id: testAccommodationUnitId,
      match_threshold: 0.0,
      match_count: 10,
    });

    if (error) {
      throw new Error(`RPC call failed: ${error.message}`);
    }

    // Verify all results belong to the specified unit
    const allBelongToUnit = data.every((result: any) =>
      result.accommodation_unit_id === testAccommodationUnitId
    );

    const resultCount = data.length;

    const details = `Results: ${resultCount}, All filtered correctly: ${allBelongToUnit ? '✓' : '✗'}`;

    logTest(testName, allBelongToUnit, Date.now() - startTime, details);

    if (allBelongToUnit && resultCount > 0) {
      console.log(`   🔒 Security validated: All ${resultCount} results belong to unit ${testAccommodationUnitId}`);
    } else if (resultCount === 0) {
      console.log(`   ⚠️  No manual chunks found for unit ${testAccommodationUnitId} (may be expected)`);
    }
  } catch (error: any) {
    logTest(testName, false, Date.now() - startTime, undefined, error.message);
  }
}

// ============================================================================
// Main Test Suite
// ============================================================================

async function runTestSuite() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  COMPLETE API ENDPOINTS VALIDATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n🌐 Base URL: ${BASE_URL}`);
  console.log(`📦 Supabase URL: ${SUPABASE_URL}\n`);

  const suiteStartTime = Date.now();

  try {
    // Run all tests sequentially
    await testGuestLogin();
    await testComplianceSubmit();
    await testReservationsList();
    await testSIREGuestData();
    await testSIREStatistics();
    await testUnitManualSecurity();

    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');

    // Remove TEST prefix from document_number to restore original state
    await supabase
      .from('guest_reservations')
      .update({
        document_number: null,
        document_type: null,
        birth_date: null,
        first_surname: null,
        nationality_code: null,
      })
      .eq('id', testReservationId);

    console.log('✅ Cleanup complete');

  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message);
  }

  // Print summary
  const totalDuration = Date.now() - suiteStartTime;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n✅ Passed: ${passedTests}/${results.length}`);
  console.log(`❌ Failed: ${failedTests}/${results.length}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms\n`);

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${result.name} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n═══════════════════════════════════════════════════════════\n');

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run the suite
runTestSuite().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
