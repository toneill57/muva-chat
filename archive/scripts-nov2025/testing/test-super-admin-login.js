/**
 * Test Super Admin Login Endpoint
 *
 * Validates the authentication flow:
 * 1. Login with valid credentials
 * 2. Login with invalid credentials
 * 3. Verify token works for protected routes
 * 4. Verify invalid token is rejected
 *
 * Usage: node scripts/test-super-admin-login.js
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000'

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logTest(name) {
  console.log(`\n${colors.cyan}🧪 TEST: ${name}${colors.reset}`)
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

// ============================================================================
// Test Cases
// ============================================================================

async function testValidLogin() {
  logTest('Valid Login')

  try {
    const response = await fetch(`${API_BASE}/api/super-admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'oneill',
        password: 'rabbitHole0+',
      }),
    })

    const data = await response.json()

    if (response.status === 200 && data.token) {
      logSuccess('Login successful')
      logInfo(`Token: ${data.token.substring(0, 50)}...`)
      logInfo(`Expires in: ${data.expiresIn}`)
      return { success: true, token: data.token }
    } else {
      logError(`Expected 200, got ${response.status}`)
      logError(`Response: ${JSON.stringify(data)}`)
      return { success: false }
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`)
    return { success: false }
  }
}

async function testInvalidPassword() {
  logTest('Invalid Password')

  try {
    const response = await fetch(`${API_BASE}/api/super-admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'oneill',
        password: 'wrong_password',
      }),
    })

    const data = await response.json()

    if (response.status === 401 && data.error === 'Invalid credentials') {
      logSuccess('Correctly rejected invalid password')
      return { success: true }
    } else {
      logError(`Expected 401, got ${response.status}`)
      logError(`Response: ${JSON.stringify(data)}`)
      return { success: false }
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`)
    return { success: false }
  }
}

async function testInvalidUsername() {
  logTest('Invalid Username')

  try {
    const response = await fetch(`${API_BASE}/api/super-admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'nonexistent_user',
        password: 'rabbitHole0+',
      }),
    })

    const data = await response.json()

    if (response.status === 401 && data.error === 'Invalid credentials') {
      logSuccess('Correctly rejected invalid username')
      return { success: true }
    } else {
      logError(`Expected 401, got ${response.status}`)
      logError(`Response: ${JSON.stringify(data)}`)
      return { success: false }
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`)
    return { success: false }
  }
}

async function testMissingCredentials() {
  logTest('Missing Credentials')

  try {
    const response = await fetch(`${API_BASE}/api/super-admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'oneill',
        // password missing
      }),
    })

    const data = await response.json()

    if (response.status === 400 && data.error === 'Missing credentials') {
      logSuccess('Correctly rejected missing credentials')
      return { success: true }
    } else {
      logError(`Expected 400, got ${response.status}`)
      logError(`Response: ${JSON.stringify(data)}`)
      return { success: false }
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`)
    return { success: false }
  }
}

async function testProtectedRouteWithValidToken(token) {
  logTest('Protected Route with Valid Token')

  try {
    // Test a protected route (this assumes there's at least one protected route)
    // For now, we'll test the middleware by trying to access a non-existent protected route
    const response = await fetch(`${API_BASE}/api/super-admin/test`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    // The route might not exist (404), but it should NOT return 401
    if (response.status === 401) {
      logError('Token was rejected by middleware')
      return { success: false }
    } else {
      logSuccess(`Token accepted by middleware (status: ${response.status})`)
      logInfo('Note: 404 is expected if route doesn\'t exist yet')
      return { success: true }
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`)
    return { success: false }
  }
}

async function testProtectedRouteWithoutToken() {
  logTest('Protected Route without Token')

  try {
    const response = await fetch(`${API_BASE}/api/super-admin/test`, {
      method: 'GET',
      // No Authorization header
    })

    const data = await response.json()

    if (response.status === 401) {
      logSuccess('Correctly rejected request without token')
      return { success: true }
    } else {
      logError(`Expected 401, got ${response.status}`)
      logError(`Response: ${JSON.stringify(data)}`)
      return { success: false }
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`)
    return { success: false }
  }
}

async function testProtectedRouteWithInvalidToken() {
  logTest('Protected Route with Invalid Token')

  try {
    const response = await fetch(`${API_BASE}/api/super-admin/test`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid_token_here',
      },
    })

    const data = await response.json()

    if (response.status === 401) {
      logSuccess('Correctly rejected invalid token')
      return { success: true }
    } else {
      logError(`Expected 401, got ${response.status}`)
      logError(`Response: ${JSON.stringify(data)}`)
      return { success: false }
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`)
    return { success: false }
  }
}

async function testGetMethodNotAllowed() {
  logTest('GET Method Not Allowed on Login')

  try {
    const response = await fetch(`${API_BASE}/api/super-admin/login`, {
      method: 'GET',
    })

    const data = await response.json()

    if (response.status === 405 && data.error === 'Method not allowed') {
      logSuccess('Correctly rejected GET request')
      return { success: true }
    } else {
      logError(`Expected 405, got ${response.status}`)
      logError(`Response: ${JSON.stringify(data)}`)
      return { success: false }
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`)
    return { success: false }
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  log('\n🚀 Super Admin Login Endpoint Tests', 'yellow')
  log('=====================================\n', 'yellow')

  logInfo(`Testing against: ${API_BASE}`)

  const results = []

  // Test 1: Valid login
  const loginResult = await testValidLogin()
  results.push(loginResult)

  // Test 2: Invalid password
  results.push(await testInvalidPassword())

  // Test 3: Invalid username
  results.push(await testInvalidUsername())

  // Test 4: Missing credentials
  results.push(await testMissingCredentials())

  // Test 5: GET method not allowed
  results.push(await testGetMethodNotAllowed())

  // Test 6: Protected route with valid token (only if login succeeded)
  if (loginResult.success && loginResult.token) {
    results.push(await testProtectedRouteWithValidToken(loginResult.token))
  }

  // Test 7: Protected route without token
  results.push(await testProtectedRouteWithoutToken())

  // Test 8: Protected route with invalid token
  results.push(await testProtectedRouteWithInvalidToken())

  // Summary
  const passed = results.filter(r => r.success).length
  const total = results.length

  log('\n=====================================', 'yellow')
  log(`📊 Results: ${passed}/${total} tests passed`, passed === total ? 'green' : 'red')

  if (passed === total) {
    log('✅ All tests passed!', 'green')
    process.exit(0)
  } else {
    log('❌ Some tests failed', 'red')
    process.exit(1)
  }
}

// Run tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`)
  process.exit(1)
})
