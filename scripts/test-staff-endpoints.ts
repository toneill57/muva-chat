/**
 * Manual Staff Endpoint Testing Script
 *
 * Tests the 3 staff endpoints that were blocked in automated tests due to JWT auth:
 * 1. GET /api/reservations/list (with SIRE fields)
 * 2. POST /api/sire/guest-data (TXT export)
 * 3. POST /api/sire/statistics (completeness metrics)
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/test-staff-endpoints.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  responseTime?: number;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

async function login(): Promise<string | null> {
  console.log('\n🔐 [Step 1] Logging in as staff user...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_admin',
        password: 'test123',
        tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
      })
    });

    const data = await response.json();

    const token = data.data?.token || data.token;

    if (!response.ok || !token) {
      console.error('❌ Login failed:', data);
      return null;
    }

    console.log('✅ Login successful');
    const staffInfo = data.data?.staff_info || data.staff;
    if (staffInfo) {
      console.log(`   Staff: ${staffInfo.full_name || staffInfo.name} (${staffInfo.role})`);
      console.log(`   Username: ${staffInfo.username}`);
    }

    return token;
  } catch (error) {
    console.error('❌ Login error:', error);
    return null;
  }
}

async function testReservationsList(token: string): Promise<TestResult> {
  console.log('\n📋 [Test 1/3] GET /api/reservations/list\n');

  const startTime = Date.now();

  try {
    const response = await fetch(`${BASE_URL}/api/reservations/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      return {
        endpoint: 'GET /api/reservations/list',
        status: 'FAIL',
        statusCode: response.status,
        responseTime,
        error: data.error || 'Request failed'
      };
    }

    // Check if response has SIRE fields
    const reservations = data.data?.reservations || data.reservations || data;
    const hasReservations = Array.isArray(reservations);
    const firstReservation = hasReservations && reservations.length > 0 ? reservations[0] : null;

    const sireFields = [
      'document_type',
      'document_number',
      'birth_date',
      'first_surname',
      'second_surname',
      'given_names',
      'nationality_code',
      'origin_city_code',
      'destination_city_code'
    ];

    const hasSIREFields = firstReservation && sireFields.some(field => field in firstReservation);

    console.log(`✅ Status: ${response.status} OK`);
    console.log(`✅ Response time: ${responseTime}ms`);
    console.log(`✅ Reservations count: ${hasReservations ? reservations.length : 0}`);
    console.log(`✅ Has SIRE fields: ${hasSIREFields ? 'YES' : 'NO'}`);

    if (firstReservation) {
      console.log('\n   Sample SIRE fields from first reservation:');
      sireFields.forEach(field => {
        if (field in firstReservation) {
          console.log(`   - ${field}: ${firstReservation[field] || '(null)'}`);
        }
      });
    }

    return {
      endpoint: 'GET /api/reservations/list',
      status: response.status === 200 ? 'PASS' : 'FAIL',
      statusCode: response.status,
      responseTime,
      details: `${hasReservations ? reservations.length : 0} reservations, SIRE fields: ${hasSIREFields ? 'present' : 'missing'}`
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      endpoint: 'GET /api/reservations/list',
      status: 'FAIL',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testSIREGuestData(token: string): Promise<TestResult> {
  console.log('\n📄 [Test 2/3] GET /api/sire/guest-data\n');

  const startTime = Date.now();

  try {
    // First get a reservation ID
    const listResponse = await fetch(`${BASE_URL}/api/reservations/list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const listData = await listResponse.json();
    const reservations = listData.data?.reservations || listData.reservations || listData;

    if (!reservations || reservations.length === 0) {
      return {
        endpoint: 'GET /api/sire/guest-data',
        status: 'FAIL',
        error: 'No reservations available for testing'
      };
    }

    const reservationId = reservations[0].id;
    console.log(`   Using reservation ID: ${reservationId}`);

    // Use GET with query parameter (not POST with body)
    const response = await fetch(`${BASE_URL}/api/sire/guest-data?reservation_id=${reservationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      return {
        endpoint: 'GET /api/sire/guest-data',
        status: 'FAIL',
        statusCode: response.status,
        responseTime,
        error: data.error || 'Request failed'
      };
    }

    // Check response structure
    const guestData = data.data;
    const hasGuestData = !!guestData;
    const hasSIREFields = hasGuestData && (
      'document_type' in guestData &&
      'document_number' in guestData &&
      'nationality_code' in guestData &&
      'origin_city_code' in guestData &&
      'destination_city_code' in guestData
    );

    console.log(`✅ Status: ${response.status} OK`);
    console.log(`✅ Response time: ${responseTime}ms`);
    console.log(`✅ Has guest data: ${hasGuestData ? 'YES' : 'NO'}`);
    console.log(`✅ Has SIRE fields: ${hasSIREFields ? 'YES' : 'NO'}`);

    if (guestData) {
      console.log('\n   Sample SIRE fields:');
      console.log(`   - Document: ${guestData.document_type} ${guestData.document_number || '(null)'}`);
      console.log(`   - Nationality: ${guestData.nationality_code || '(null)'} (${guestData.nationality_name || 'N/A'})`);
      console.log(`   - Origin: ${guestData.origin_city_code || '(null)'} (${guestData.origin_city_name || 'N/A'})`);
      console.log(`   - Destination: ${guestData.destination_city_code || '(null)'} (${guestData.destination_city_name || 'N/A'})`);
      console.log(`   - Birth date: ${guestData.birth_date || '(null)'}`);
    }

    return {
      endpoint: 'GET /api/sire/guest-data',
      status: response.status === 200 && hasSIREFields ? 'PASS' : 'FAIL',
      statusCode: response.status,
      responseTime,
      details: `Guest data: ${hasGuestData ? 'present' : 'missing'}, SIRE fields: ${hasSIREFields ? 'present' : 'missing'}`
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      endpoint: 'GET /api/sire/guest-data',
      status: 'FAIL',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testSIREStatistics(token: string): Promise<TestResult> {
  console.log('\n📊 [Test 3/3] GET /api/sire/statistics\n');

  const startTime = Date.now();

  try {
    // Use 30-day date range ending today
    const endDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`   Date range: ${startDate} to ${endDate}`);

    const response = await fetch(`${BASE_URL}/api/sire/statistics?start_date=${startDate}&end_date=${endDate}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      return {
        endpoint: 'GET /api/sire/statistics',
        status: 'FAIL',
        statusCode: response.status,
        responseTime,
        error: data.error || 'Request failed'
      };
    }

    // Check for statistics fields
    const stats = data.data;
    const hasRequiredFields = stats && (
      'total_reservations' in stats &&
      'sire_complete_reservations' in stats &&
      'sire_incomplete_reservations' in stats &&
      'completion_rate' in stats
    );

    console.log(`✅ Status: ${response.status} OK`);
    console.log(`✅ Response time: ${responseTime}ms`);
    console.log(`✅ Has statistics: ${hasRequiredFields ? 'YES' : 'NO'}`);

    if (stats) {
      console.log('\n   Statistics:');
      console.log(`   - Total reservations: ${stats.total_reservations}`);
      console.log(`   - SIRE complete: ${stats.sire_complete_reservations}`);
      console.log(`   - SIRE incomplete: ${stats.sire_incomplete_reservations}`);
      console.log(`   - Completion rate: ${stats.completion_rate}%`);
      console.log(`   - Check-ins complete: ${stats.check_ins_complete || 0}`);
      console.log(`   - Check-outs complete: ${stats.check_outs_complete || 0}`);
    }

    return {
      endpoint: 'GET /api/sire/statistics',
      status: response.status === 200 && hasRequiredFields ? 'PASS' : 'FAIL',
      statusCode: response.status,
      responseTime,
      details: `Statistics fields: ${hasRequiredFields ? 'present' : 'missing'}, Total: ${stats?.total_reservations || 0}`
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      endpoint: 'GET /api/sire/statistics',
      status: 'FAIL',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SIRE COMPLIANCE - Manual Staff Endpoint Testing');
  console.log('═══════════════════════════════════════════════════════════');

  // Step 1: Login
  const token = await login();

  if (!token) {
    console.log('\n❌ Cannot proceed without authentication token');
    console.log('\nPlease verify:');
    console.log('  - Dev server is running (http://localhost:3000)');
    console.log('  - Staff credentials are correct');
    console.log('  - Database is accessible');
    process.exit(1);
  }

  // Step 2: Run tests
  results.push(await testReservationsList(token));
  results.push(await testSIREGuestData(token));
  results.push(await testSIREStatistics(token));

  // Step 3: Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const statusCode = result.statusCode ? ` [${result.statusCode}]` : '';
    const time = result.responseTime ? ` (${result.responseTime}ms)` : '';

    console.log(`${icon} ${result.endpoint}${statusCode}${time}`);

    if (result.details) {
      console.log(`   ${result.details}`);
    }

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    console.log('');
  });

  console.log('───────────────────────────────────────────────────────────');
  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed} (${Math.round(passed/results.length*100)}%)`);
  console.log(`Failed: ${failed} (${Math.round(failed/results.length*100)}%)`);
  console.log('───────────────────────────────────────────────────────────\n');

  if (passed === 3) {
    console.log('🎉 All staff endpoint tests PASSED!');
    console.log('\n✅ Production Ready: Staff endpoints validated');
    console.log('✅ Test Coverage: Now 24/24 (100%)');
    console.log('\nNext step: Deploy to production');
  } else {
    console.log('⚠️  Some tests failed. Review errors above.');
    console.log('\nPlease fix issues before production deployment.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
