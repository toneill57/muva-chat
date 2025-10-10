/**
 * SIRE Endpoints Testing Script
 *
 * Tests all 5 SIRE REST API endpoints:
 * 1. /api/sire/guest-data
 * 2. /api/sire/statistics
 * 3. /api/sire/data-completeness
 * 4. /api/sire/monthly-export
 * 5. /api/sire/access-permission
 *
 * Usage:
 * set -a && source .env.local && set +a && npx tsx scripts/test-sire-endpoints.ts
 */

import { createClient } from '@supabase/supabase-js'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ============================================================================
// Configuration
// ============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================================
// Helper Functions
// ============================================================================

async function getStaffToken(): Promise<string | null> {
  try {
    // Get first available staff user for testing
    const { data: staffUsers, error } = await supabase
      .from('staff_users')
      .select('username, tenant_id')
      .limit(1)
      .single()

    if (error || !staffUsers) {
      console.error('❌ No staff users found:', error)
      return null
    }

    console.log('📝 Found staff user:', {
      username: staffUsers.username,
      tenant_id: staffUsers.tenant_id,
    })

    // Login with staff credentials (password is typically 'staff123' in dev)
    const response = await fetch(`${BASE_URL}/api/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: staffUsers.username,
        password: 'staff123', // Dev password
        tenant_id: staffUsers.tenant_id,
      }),
    })

    if (!response.ok) {
      console.error('❌ Staff login failed:', response.status)
      return null
    }

    const data = await response.json()
    console.log('✅ Staff login successful\n')
    return data.data.token
  } catch (error) {
    console.error('❌ Error getting staff token:', error)
    return null
  }
}

async function getTestReservation(): Promise<{
  reservation_id: string
  tenant_id: string
  check_in_date: string
  check_out_date: string
} | null> {
  try {
    const { data, error } = await supabase
      .from('guest_reservations')
      .select('id, tenant_id, check_in_date, check_out_date, reservation_code')
      .eq('status', 'active')
      .limit(1)
      .single()

    if (error || !data) {
      console.error('❌ No reservations found:', error)
      return null
    }

    return {
      reservation_id: data.id,
      tenant_id: data.tenant_id,
      check_in_date: data.check_in_date,
      check_out_date: data.check_out_date,
    }
  } catch (error) {
    console.error('❌ Error getting test reservation:', error)
    return null
  }
}

// ============================================================================
// Test Functions
// ============================================================================

async function testAccessPermission(token: string) {
  console.log('🧪 Testing: GET /api/sire/access-permission')
  console.log('─'.repeat(60))

  try {
    const response = await fetch(`${BASE_URL}/api/sire/access-permission`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Status:', response.status)
      console.log('📊 Response:', JSON.stringify(data, null, 2))
    } else {
      console.log('❌ Status:', response.status)
      console.log('📊 Error:', JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error('❌ Request failed:', error)
  }

  console.log('\n')
}

async function testGuestData(token: string, reservationId: string) {
  console.log('🧪 Testing: GET /api/sire/guest-data')
  console.log('─'.repeat(60))

  try {
    const url = `${BASE_URL}/api/sire/guest-data?reservation_id=${reservationId}`
    console.log('📍 URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Status:', response.status)
      console.log('📊 Guest Name:', data.data?.guest_name)
      console.log('📊 Document Type:', data.data?.document_type)
      console.log('📊 Nationality:', data.data?.nationality_name || data.data?.nationality_code)
      console.log('📊 Has SIRE Data:', !!(
        data.data?.document_type &&
        data.data?.document_number &&
        data.data?.nationality_code
      ))
    } else {
      console.log('❌ Status:', response.status)
      console.log('📊 Error:', JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error('❌ Request failed:', error)
  }

  console.log('\n')
}

async function testDataCompleteness(token: string, reservationId: string) {
  console.log('🧪 Testing: GET /api/sire/data-completeness')
  console.log('─'.repeat(60))

  try {
    const url = `${BASE_URL}/api/sire/data-completeness?reservation_id=${reservationId}`
    console.log('📍 URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Status:', response.status)
      console.log('📊 Is Complete:', data.data?.is_complete)
      console.log('📊 Missing Fields:', data.data?.missing_fields?.length || 0)
      if (data.data?.missing_fields?.length > 0) {
        console.log('   -', data.data.missing_fields.join(', '))
      }
      console.log('📊 Validation Errors:', data.data?.validation_errors?.length || 0)
      if (data.data?.validation_errors?.length > 0) {
        console.log('   -', data.data.validation_errors.join(', '))
      }
    } else {
      console.log('❌ Status:', response.status)
      console.log('📊 Error:', JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error('❌ Request failed:', error)
  }

  console.log('\n')
}

async function testStatistics(token: string, startDate: string, endDate: string) {
  console.log('🧪 Testing: GET /api/sire/statistics')
  console.log('─'.repeat(60))

  try {
    const url = `${BASE_URL}/api/sire/statistics?start_date=${startDate}&end_date=${endDate}`
    console.log('📍 URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Status:', response.status)
      console.log('📊 Total Reservations:', data.data?.total_reservations)
      console.log('📊 Complete:', data.data?.sire_complete_reservations)
      console.log('📊 Incomplete:', data.data?.sire_incomplete_reservations)
      console.log('📊 Completion Rate:', `${data.data?.completion_rate}%`)
      console.log('📊 Check-ins Complete:', data.data?.check_ins_complete)
      console.log('📊 Check-outs Complete:', data.data?.check_outs_complete)
      console.log('📊 Top Nationalities:', data.data?.top_nationalities?.length || 0)
    } else {
      console.log('❌ Status:', response.status)
      console.log('📊 Error:', JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error('❌ Request failed:', error)
  }

  console.log('\n')
}

async function testMonthlyExport(token: string, year: number, month: number) {
  console.log('🧪 Testing: GET /api/sire/monthly-export')
  console.log('─'.repeat(60))

  try {
    const url = `${BASE_URL}/api/sire/monthly-export?year=${year}&month=${month}`
    console.log('📍 URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Status:', response.status)
      console.log('📊 Total Records:', data.data?.total_records)
      console.log('📊 Month Range:', `${data.data?.month_start} to ${data.data?.month_end}`)
      console.log('📊 Movement Type:', data.metadata?.movement_type || 'all')
      if (data.data?.records?.length > 0) {
        console.log('📊 Sample Record:')
        const sample = data.data.records[0]
        console.log('   - Guest:', sample.guest_name)
        console.log('   - Document:', sample.document_type, sample.document_number)
        console.log('   - Movement:', sample.movement_type, sample.movement_date)
      }
    } else {
      console.log('❌ Status:', response.status)
      console.log('📊 Error:', JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error('❌ Request failed:', error)
  }

  console.log('\n')
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log('🚀 SIRE Endpoints Testing')
  console.log('='.repeat(60))
  console.log('Base URL:', BASE_URL)
  console.log('='.repeat(60))
  console.log('\n')

  // Step 1: Get staff token
  console.log('🔑 Step 1: Authenticate staff user')
  console.log('─'.repeat(60))
  const token = await getStaffToken()

  if (!token) {
    console.error('❌ Failed to get staff token. Exiting.')
    process.exit(1)
  }

  // Step 2: Get test reservation
  console.log('📋 Step 2: Get test reservation')
  console.log('─'.repeat(60))
  const reservation = await getTestReservation()

  if (!reservation) {
    console.error('❌ Failed to get test reservation. Exiting.')
    process.exit(1)
  }

  console.log('✅ Found test reservation:', reservation.reservation_id)
  console.log('\n')

  // Calculate test dates (last month and current month)
  const today = new Date()
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    .toISOString()
    .split('T')[0]
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  // Run all endpoint tests
  console.log('🧪 Step 3: Run endpoint tests')
  console.log('='.repeat(60))
  console.log('\n')

  await testAccessPermission(token)
  await testGuestData(token, reservation.reservation_id)
  await testDataCompleteness(token, reservation.reservation_id)
  await testStatistics(token, startDate, endDate)
  await testMonthlyExport(token, today.getFullYear(), today.getMonth() + 1)

  console.log('='.repeat(60))
  console.log('✅ All tests completed!')
  console.log('='.repeat(60))
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test suite failed:', error)
  process.exit(1)
})
