/**
 * MotoPress Authentication & Encryption Test Suite
 *
 * Tests:
 * 1. Credential encryption/decryption
 * 2. Admin JWT authentication
 * 3. MotoPress API connection with Consumer Key/Secret
 * 4. Protected endpoints (401 without auth, 200 with auth)
 * 5. Environment variables loading
 */

import { encryptCredentials, decryptCredentials, verifyAdminAuth } from '../src/lib/admin-auth'
import { authenticateStaff, generateStaffToken } from '../src/lib/staff-auth'

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

// ============================================================================
// Test 1: Environment Variables
// ============================================================================

async function testEnvVariables() {
  logTest('Environment Variables Loading')

  const required = [
    'MOTOPRESS_KEY',
    'MOTOPRESS_SECRET',
    'MOTOPRESS_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  let allPresent = true

  for (const key of required) {
    if (process.env[key]) {
      logSuccess(`${key}: ${process.env[key]!.substring(0, 20)}...`)
    } else {
      logError(`${key}: NOT SET`)
      allPresent = false
    }
  }

  if (process.env.ENCRYPTION_KEY) {
    logSuccess(`ENCRYPTION_KEY: Set (${process.env.ENCRYPTION_KEY.length} chars)`)
  } else {
    logWarning('ENCRYPTION_KEY: Not set (using default - NOT FOR PRODUCTION)')
  }

  return allPresent
}

// ============================================================================
// Test 2: Encryption/Decryption
// ============================================================================

async function testEncryption() {
  logTest('Credential Encryption/Decryption')

  const testCredentials = [
    'ck_29a384bbb0500c07159e90b59404293839a33282',
    'cs_8fc58d0a3af6663b3dca2776f54f18d55f2aaea4',
    'test-password-123',
    'https://simmerdown.house',
  ]

  for (const plaintext of testCredentials) {
    try {
      logInfo(`Testing: "${plaintext.substring(0, 30)}..."`)

      // Encrypt
      const encrypted = await encryptCredentials(plaintext)
      logInfo(`Encrypted (${encrypted.length} chars): ${encrypted.substring(0, 40)}...`)

      // Decrypt
      const decrypted = await decryptCredentials(encrypted)

      // Verify
      if (decrypted === plaintext) {
        logSuccess('✓ Encryption/Decryption match')
      } else {
        logError(`Mismatch! Decrypted: "${decrypted.substring(0, 30)}..."`)
        return false
      }
    } catch (error: any) {
      logError(`Encryption failed: ${error.message}`)
      return false
    }
  }

  return true
}

// ============================================================================
// Test 3: MotoPress API Connection
// ============================================================================

async function testMotoPresConnection() {
  logTest('MotoPress API Connection (Consumer Key/Secret)')

  const consumerKey = process.env.MOTOPRESS_KEY
  const consumerSecret = process.env.MOTOPRESS_SECRET
  const siteUrl = process.env.MOTOPRESS_URL

  if (!consumerKey || !consumerSecret || !siteUrl) {
    logError('Missing MotoPress credentials in environment')
    return false
  }

  const apiUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/mphb/v1/accommodation_types?per_page=1`
  logInfo(`Testing: ${apiUrl}`)

  try {
    // Use Basic Auth with Consumer Key:Secret
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'User-Agent': 'InnPilot-Test/1.0',
      },
    })

    logInfo(`Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      logError(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
      return false
    }

    const data = await response.json()

    if (Array.isArray(data)) {
      logSuccess(`✓ Connected! Found ${data.length} accommodation(s)`)
      if (data.length > 0) {
        logInfo(`First accommodation: ${data[0].title?.rendered || data[0].name || 'N/A'}`)
      }
      return true
    } else {
      logError(`Unexpected response format (not an array)`)
      return false
    }
  } catch (error: any) {
    logError(`Connection failed: ${error.message}`)
    return false
  }
}

// ============================================================================
// Test 4: Admin Authentication (Staff with CEO/Admin role)
// ============================================================================

async function testAdminAuth() {
  logTest('Admin Authentication (JWT with CEO/Admin role)')

  // Simulate admin authentication
  // NOTE: This requires a real staff user in the database
  logWarning('Skipping live admin auth test (requires DB setup)')
  logInfo('To test live:')
  logInfo('1. Create staff user: role="ceo" or role="admin"')
  logInfo('2. Login via /api/staff/login')
  logInfo('3. Use returned JWT token for MotoPress endpoints')

  // Test JWT structure instead
  const mockSession = {
    staff_id: 'test-staff-id',
    tenant_id: 'b5c45f51-0dbe-4374-a44a-aba6e9c0a582',
    username: 'test-admin',
    full_name: 'Test Administrator',
    role: 'ceo' as const,
    permissions: {
      sire_access: true,
      admin_panel: true,
      reports_access: true,
      modify_operations: true,
    },
  }

  try {
    const token = await generateStaffToken(mockSession)
    logSuccess(`✓ Generated JWT token (${token.length} chars)`)
    logInfo(`Token preview: ${token.substring(0, 50)}...`)
    return true
  } catch (error: any) {
    logError(`Token generation failed: ${error.message}`)
    return false
  }
}

// ============================================================================
// Test 5: Protected Endpoint Simulation
// ============================================================================

async function testProtectedEndpoints() {
  logTest('Protected Endpoints (Auth Required)')

  logInfo('Testing endpoint protection logic...')

  // Test 1: Missing Authorization header
  const request1 = new Request('http://localhost:3000/api/test', {
    method: 'GET',
    headers: new Headers(),
  })

  const { authorized: auth1, error: error1 } = await verifyAdminAuth(request1)

  if (!auth1 && error1?.includes('Missing Authorization')) {
    logSuccess('✓ Correctly rejects request without auth header')
  } else {
    logError('Should reject request without auth header')
    return false
  }

  // Test 2: Invalid token
  const request2 = new Request('http://localhost:3000/api/test', {
    method: 'GET',
    headers: new Headers({
      'Authorization': 'Bearer invalid-token-123',
    }),
  })

  const { authorized: auth2 } = await verifyAdminAuth(request2)

  if (!auth2) {
    logSuccess('✓ Correctly rejects invalid token')
  } else {
    logError('Should reject invalid token')
    return false
  }

  // Test 3: Valid token with admin role
  const mockAdminSession = {
    staff_id: 'admin-id',
    tenant_id: 'tenant-123',
    username: 'admin',
    full_name: 'Admin User',
    role: 'admin' as const,
    permissions: {
      sire_access: true,
      admin_panel: true,
      reports_access: true,
      modify_operations: true,
    },
  }

  const validToken = await generateStaffToken(mockAdminSession)

  const request3 = new Request('http://localhost:3000/api/test', {
    method: 'GET',
    headers: new Headers({
      'Authorization': `Bearer ${validToken}`,
    }),
  })

  const { authorized: auth3, session: session3 } = await verifyAdminAuth(request3)

  if (auth3 && session3?.role === 'admin') {
    logSuccess('✓ Correctly accepts valid admin token')
  } else {
    logError('Should accept valid admin token')
    return false
  }

  // Test 4: Valid token with housekeeper role (should reject)
  const mockHousekeeperSession = {
    staff_id: 'housekeeper-id',
    tenant_id: 'tenant-123',
    username: 'housekeeper',
    full_name: 'Housekeeper User',
    role: 'housekeeper' as const,
    permissions: {
      sire_access: false,
      admin_panel: false,
      reports_access: false,
      modify_operations: false,
    },
  }

  const housekeeperToken = await generateStaffToken(mockHousekeeperSession)

  const request4 = new Request('http://localhost:3000/api/test', {
    method: 'GET',
    headers: new Headers({
      'Authorization': `Bearer ${housekeeperToken}`,
    }),
  })

  const { authorized: auth4, error: error4 } = await verifyAdminAuth(request4)

  if (!auth4 && error4?.includes('not authorized')) {
    logSuccess('✓ Correctly rejects housekeeper role')
  } else {
    logError('Should reject housekeeper role')
    return false
  }

  return true
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  log('\n' + '═'.repeat(60), COLORS.bold)
  log('  🔐 MOTOPRESS AUTHENTICATION & ENCRYPTION TEST SUITE', COLORS.bold)
  log('═'.repeat(60) + '\n', COLORS.bold)

  const results: { [key: string]: boolean } = {}

  // Run tests
  results['env'] = await testEnvVariables()
  results['encryption'] = await testEncryption()
  results['motopress'] = await testMotoPresConnection()
  results['admin'] = await testAdminAuth()
  results['endpoints'] = await testProtectedEndpoints()

  // Summary
  log('\n' + '═'.repeat(60), COLORS.bold)
  log('  📊 TEST SUMMARY', COLORS.bold)
  log('═'.repeat(60) + '\n', COLORS.bold)

  let passed = 0
  let failed = 0

  for (const [name, result] of Object.entries(results)) {
    if (result) {
      logSuccess(`${name.toUpperCase()}: PASSED`)
      passed++
    } else {
      logError(`${name.toUpperCase()}: FAILED`)
      failed++
    }
  }

  log('')
  if (failed === 0) {
    logSuccess(`🎉 All ${passed} tests passed!`)
    process.exit(0)
  } else {
    logError(`❌ ${failed} test(s) failed, ${passed} passed`)
    process.exit(1)
  }
}

main().catch((error) => {
  logError(`Fatal error: ${error.message}`)
  console.error(error)
  process.exit(1)
})
