/**
 * MotoPress Credentials Testing Suite
 *
 * Tests both authentication methods against MotoPress API:
 * 1. Consumer Key/Secret (ck_xxx:cs_xxx) - WooCommerce REST API style
 * 2. Application Password (user:password) - WordPress Application Password
 *
 * Determines which method works and should be used in production.
 */

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
}

function log(message: string, color: string = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`)
}

function logSuccess(message: string) {
  log(`✅ ${message}`, COLORS.green)
}

function logError(message: string) {
  log(`❌ ${message}`, COLORS.red)
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, COLORS.blue)
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, COLORS.yellow)
}

function logTest(name: string) {
  log(`\n${COLORS.bold}━━━ TEST: ${name} ━━━${COLORS.reset}`, COLORS.blue)
}

// =============================================================================
// Test Credentials
// =============================================================================

interface Credentials {
  consumerKey: string
  consumerSecret: string
  appUser: string
  appPassword: string
  siteUrl: string
}

const credentials: Credentials = {
  consumerKey: process.env.MOTOPRESS_KEY || '',
  consumerSecret: process.env.MOTOPRESS_SECRET || '',
  appUser: process.env.MOTOPRESS_USER || '',
  appPassword: process.env.MOTOPRESS_APP_PASS || '',
  siteUrl: process.env.MOTOPRESS_URL || ''
}

// =============================================================================
// Test Functions
// =============================================================================

async function testEndpointWithAuth(
  endpoint: string,
  authMethod: 'consumer' | 'app_password',
  authString: string
): Promise<{ success: boolean; statusCode: number; data?: any; error?: string }> {
  try {
    const url = `${credentials.siteUrl.replace(/\/$/, '')}${endpoint}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'User-Agent': 'InnPilot-CredentialsTest/1.0'
      }
    })

    const contentType = response.headers.get('content-type')
    let data: any = null

    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    return {
      success: response.ok,
      statusCode: response.status,
      data,
      error: response.ok ? undefined : `HTTP ${response.status}: ${JSON.stringify(data).substring(0, 200)}`
    }

  } catch (error: any) {
    return {
      success: false,
      statusCode: 0,
      error: error.message
    }
  }
}

// =============================================================================
// Test Suite 1: Accommodation Types
// =============================================================================

async function testAccommodationTypes() {
  logTest('Accommodation Types Endpoint')

  const endpoint = '/wp-json/mphb/v1/accommodation_types?per_page=2'

  // Test 1: Consumer Key/Secret
  logInfo('Test 1.1: Consumer Key/Secret (ck_xxx:cs_xxx)')
  const consumerAuth = Buffer.from(`${credentials.consumerKey}:${credentials.consumerSecret}`).toString('base64')
  const result1 = await testEndpointWithAuth(endpoint, 'consumer', consumerAuth)

  if (result1.success && Array.isArray(result1.data)) {
    logSuccess(`✓ Consumer Key/Secret WORKS (${result1.statusCode}) - Found ${result1.data.length} accommodation(s)`)
    if (result1.data.length > 0) {
      logInfo(`  Sample: ${result1.data[0].title?.rendered || result1.data[0].name || 'N/A'}`)
    }
  } else {
    logError(`✗ Consumer Key/Secret FAILED (${result1.statusCode}): ${result1.error}`)
  }

  // Test 2: Application Password
  logInfo('\nTest 1.2: Application Password (user:password)')
  const appAuth = Buffer.from(`${credentials.appUser}:${credentials.appPassword}`).toString('base64')
  const result2 = await testEndpointWithAuth(endpoint, 'app_password', appAuth)

  if (result2.success && Array.isArray(result2.data)) {
    logSuccess(`✓ Application Password WORKS (${result2.statusCode}) - Found ${result2.data.length} accommodation(s)`)
    if (result2.data.length > 0) {
      logInfo(`  Sample: ${result2.data[0].title?.rendered || result2.data[0].name || 'N/A'}`)
    }
  } else {
    logError(`✗ Application Password FAILED (${result2.statusCode}): ${result2.error}`)
  }

  return {
    consumer: result1.success,
    appPassword: result2.success
  }
}

// =============================================================================
// Test Suite 2: Bookings
// =============================================================================

async function testBookings() {
  logTest('Bookings Endpoint')

  const endpoint = '/wp-json/mphb/v1/bookings?per_page=2'

  // Test 1: Consumer Key/Secret
  logInfo('Test 2.1: Consumer Key/Secret (ck_xxx:cs_xxx)')
  const consumerAuth = Buffer.from(`${credentials.consumerKey}:${credentials.consumerSecret}`).toString('base64')
  const result1 = await testEndpointWithAuth(endpoint, 'consumer', consumerAuth)

  if (result1.success && Array.isArray(result1.data)) {
    logSuccess(`✓ Consumer Key/Secret WORKS (${result1.statusCode}) - Found ${result1.data.length} booking(s)`)
    if (result1.data.length > 0) {
      const booking = result1.data[0]
      logInfo(`  Sample: Booking #${booking.id}, Status: ${booking.status}, Check-in: ${booking.check_in_date}`)
    }
  } else {
    logError(`✗ Consumer Key/Secret FAILED (${result1.statusCode}): ${result1.error}`)
  }

  // Test 2: Application Password
  logInfo('\nTest 2.2: Application Password (user:password)')
  const appAuth = Buffer.from(`${credentials.appUser}:${credentials.appPassword}`).toString('base64')
  const result2 = await testEndpointWithAuth(endpoint, 'app_password', appAuth)

  if (result2.success && Array.isArray(result2.data)) {
    logSuccess(`✓ Application Password WORKS (${result2.statusCode}) - Found ${result2.data.length} booking(s)`)
    if (result2.data.length > 0) {
      const booking = result2.data[0]
      logInfo(`  Sample: Booking #${booking.id}, Status: ${booking.status}, Check-in: ${booking.check_in_date}`)
    }
  } else {
    logError(`✗ Application Password FAILED (${result2.statusCode}): ${result2.error}`)
  }

  return {
    consumer: result1.success,
    appPassword: result2.success
  }
}

// =============================================================================
// Test Suite 3: Availability
// =============================================================================

async function testAvailability() {
  logTest('Availability Endpoint')

  // Test dates: 30 days from now
  const checkIn = new Date()
  checkIn.setDate(checkIn.getDate() + 30)
  const checkOut = new Date(checkIn)
  checkOut.setDate(checkOut.getDate() + 3)

  const checkInStr = checkIn.toISOString().split('T')[0]
  const checkOutStr = checkOut.toISOString().split('T')[0]

  const endpoint = `/wp-json/mphb/v1/bookings/availability?check_in=${checkInStr}&check_out=${checkOutStr}&adults=2`

  // Test 1: Consumer Key/Secret
  logInfo('Test 3.1: Consumer Key/Secret (ck_xxx:cs_xxx)')
  const consumerAuth = Buffer.from(`${credentials.consumerKey}:${credentials.consumerSecret}`).toString('base64')
  const result1 = await testEndpointWithAuth(endpoint, 'consumer', consumerAuth)

  if (result1.success) {
    logSuccess(`✓ Consumer Key/Secret WORKS (${result1.statusCode})`)
    logInfo(`  Check-in: ${checkInStr}, Check-out: ${checkOutStr}, Adults: 2`)
  } else {
    logError(`✗ Consumer Key/Secret FAILED (${result1.statusCode}): ${result1.error}`)
  }

  // Test 2: Application Password
  logInfo('\nTest 3.2: Application Password (user:password)')
  const appAuth = Buffer.from(`${credentials.appUser}:${credentials.appPassword}`).toString('base64')
  const result2 = await testEndpointWithAuth(endpoint, 'app_password', appAuth)

  if (result2.success) {
    logSuccess(`✓ Application Password WORKS (${result2.statusCode})`)
    logInfo(`  Check-in: ${checkInStr}, Check-out: ${checkOutStr}, Adults: 2`)
  } else {
    logError(`✗ Application Password FAILED (${result2.statusCode}): ${result2.error}`)
  }

  return {
    consumer: result1.success,
    appPassword: result2.success
  }
}

// =============================================================================
// Test Suite 4: Categories (optional endpoint)
// =============================================================================

async function testCategories() {
  logTest('Categories Endpoint (Optional)')

  const endpoint = '/wp-json/mphb/v1/accommodation_types/categories'

  // Test 1: Consumer Key/Secret
  logInfo('Test 4.1: Consumer Key/Secret (ck_xxx:cs_xxx)')
  const consumerAuth = Buffer.from(`${credentials.consumerKey}:${credentials.consumerSecret}`).toString('base64')
  const result1 = await testEndpointWithAuth(endpoint, 'consumer', consumerAuth)

  if (result1.success && Array.isArray(result1.data)) {
    logSuccess(`✓ Consumer Key/Secret WORKS (${result1.statusCode}) - Found ${result1.data.length} categories`)
  } else {
    logWarning(`⚠️  Consumer Key/Secret FAILED (${result1.statusCode}): ${result1.error}`)
  }

  // Test 2: Application Password
  logInfo('\nTest 4.2: Application Password (user:password)')
  const appAuth = Buffer.from(`${credentials.appUser}:${credentials.appPassword}`).toString('base64')
  const result2 = await testEndpointWithAuth(endpoint, 'app_password', appAuth)

  if (result2.success && Array.isArray(result2.data)) {
    logSuccess(`✓ Application Password WORKS (${result2.statusCode}) - Found ${result2.data.length} categories`)
  } else {
    logWarning(`⚠️  Application Password FAILED (${result2.statusCode}): ${result2.error}`)
  }

  return {
    consumer: result1.success,
    appPassword: result2.success
  }
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function main() {
  log('\n' + '═'.repeat(70), COLORS.bold)
  log('  🔑 MOTOPRESS CREDENTIALS TESTING SUITE', COLORS.bold)
  log('═'.repeat(70) + '\n', COLORS.bold)

  // Verify credentials
  logTest('Credentials Verification')

  if (!credentials.consumerKey || !credentials.consumerSecret) {
    logError('Consumer Key/Secret not configured in environment')
    process.exit(1)
  } else {
    logSuccess(`Consumer Key: ${credentials.consumerKey.substring(0, 15)}...`)
    logSuccess(`Consumer Secret: ${credentials.consumerSecret.substring(0, 15)}...`)
  }

  if (!credentials.appUser || !credentials.appPassword) {
    logWarning('Application Password not configured in environment')
  } else {
    logSuccess(`App User: ${credentials.appUser}`)
    logSuccess(`App Password: ${credentials.appPassword.substring(0, 15)}...`)
  }

  logSuccess(`Site URL: ${credentials.siteUrl}`)

  // Run tests
  const results = {
    accommodationTypes: await testAccommodationTypes(),
    bookings: await testBookings(),
    availability: await testAvailability(),
    categories: await testCategories()
  }

  // Summary
  log('\n' + '═'.repeat(70), COLORS.bold)
  log('  📊 TEST SUMMARY', COLORS.bold)
  log('═'.repeat(70) + '\n', COLORS.bold)

  const summary = {
    consumer: {
      accommodationTypes: results.accommodationTypes.consumer,
      bookings: results.bookings.consumer,
      availability: results.availability.consumer,
      categories: results.categories.consumer
    },
    appPassword: {
      accommodationTypes: results.accommodationTypes.appPassword,
      bookings: results.bookings.appPassword,
      availability: results.availability.appPassword,
      categories: results.categories.appPassword
    }
  }

  // Consumer Key/Secret Results
  log(`${COLORS.bold}Consumer Key/Secret (ck_xxx:cs_xxx):${COLORS.reset}`)
  const consumerPassed = Object.values(summary.consumer).filter(Boolean).length
  const consumerTotal = Object.values(summary.consumer).length

  if (summary.consumer.accommodationTypes) logSuccess('  ✓ Accommodation Types')
  else logError('  ✗ Accommodation Types')

  if (summary.consumer.bookings) logSuccess('  ✓ Bookings')
  else logError('  ✗ Bookings')

  if (summary.consumer.availability) logSuccess('  ✓ Availability')
  else logError('  ✗ Availability')

  if (summary.consumer.categories) logSuccess('  ✓ Categories')
  else logWarning('  ⚠️  Categories (optional)')

  log(`  Total: ${consumerPassed}/${consumerTotal} tests passed\n`)

  // Application Password Results
  log(`${COLORS.bold}Application Password (user:password):${COLORS.reset}`)
  const appPassed = Object.values(summary.appPassword).filter(Boolean).length
  const appTotal = Object.values(summary.appPassword).length

  if (summary.appPassword.accommodationTypes) logSuccess('  ✓ Accommodation Types')
  else logError('  ✗ Accommodation Types')

  if (summary.appPassword.bookings) logSuccess('  ✓ Bookings')
  else logError('  ✗ Bookings')

  if (summary.appPassword.availability) logSuccess('  ✓ Availability')
  else logError('  ✗ Availability')

  if (summary.appPassword.categories) logSuccess('  ✓ Categories')
  else logWarning('  ⚠️  Categories (optional)')

  log(`  Total: ${appPassed}/${appTotal} tests passed\n`)

  // Recommendation
  log('═'.repeat(70), COLORS.bold)
  log('  💡 RECOMMENDATION', COLORS.bold)
  log('═'.repeat(70) + '\n', COLORS.bold)

  if (consumerPassed >= 3 && appPassed >= 3) {
    logSuccess('✓ Both authentication methods work!')
    logInfo('  Recommendation: Use Consumer Key/Secret (WooCommerce standard)')
  } else if (consumerPassed >= 3) {
    logSuccess('✓ Consumer Key/Secret works!')
    logWarning('⚠️  Application Password has limited support')
    logInfo('  Recommendation: Use Consumer Key/Secret exclusively')
  } else if (appPassed >= 3) {
    logWarning('⚠️  Consumer Key/Secret has limited support')
    logSuccess('✓ Application Password works!')
    logInfo('  Recommendation: Use Application Password exclusively')
  } else {
    logError('✗ Neither authentication method works reliably')
    logInfo('  Action Required: Check credentials and MotoPress API configuration')
  }

  // Exit with appropriate code
  if (consumerPassed >= 3 || appPassed >= 3) {
    logSuccess('\n🎉 Credentials testing completed successfully!')
    process.exit(0)
  } else {
    logError('\n❌ Credentials testing failed')
    process.exit(1)
  }
}

main().catch((error) => {
  logError(`Fatal error: ${error.message}`)
  console.error(error)
  process.exit(1)
})
