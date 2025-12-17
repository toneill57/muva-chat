/**
 * TST Health Check Script
 *
 * Verifies that the test/staging deployment is healthy by:
 * - Checking the /api/health endpoint
 * - Validating critical services (Supabase, AI APIs)
 * - Ensuring acceptable response times
 *
 * Exit codes:
 * - 0: All checks passed
 * - 1: Health check failed
 */

const TST_URL = process.env.TST_URL || 'http://localhost:3001'
const MAX_RESPONSE_TIME_MS = 5000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'error'
  timestamp: string
  services: {
    openai: { status: string }
    anthropic: { status: string }
    supabase: {
      status: string
      responseTime: string
      error: string | null
    }
  }
  environment: {
    runtime: string
    region: string
    deployment: string
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function checkHealth(attempt: number = 1): Promise<HealthResponse> {
  const url = `${TST_URL}/api/health`
  console.log(`\n🔍 Attempt ${attempt}/${MAX_RETRIES}: Checking ${url}...`)

  const startTime = Date.now()

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'GitHub-Actions-Health-Check',
      },
      signal: AbortSignal.timeout(MAX_RESPONSE_TIME_MS),
    })

    const elapsed = Date.now() - startTime

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: HealthResponse = await response.json()

    console.log(`✅ Response received in ${elapsed}ms`)
    console.log(`📊 Status: ${data.status}`)
    console.log(`🕐 Timestamp: ${data.timestamp}`)
    console.log(`🌍 Environment: ${data.environment.region} (${data.environment.deployment})`)

    return data

  } catch (error) {
    const elapsed = Date.now() - startTime

    if (attempt < MAX_RETRIES) {
      console.log(`❌ Attempt ${attempt} failed after ${elapsed}ms:`, error instanceof Error ? error.message : error)
      console.log(`⏳ Retrying in ${RETRY_DELAY_MS}ms...`)
      await sleep(RETRY_DELAY_MS)
      return checkHealth(attempt + 1)
    }

    throw error
  }
}

async function validateHealth(health: HealthResponse): Promise<void> {
  console.log('\n🔬 Validating health status...')

  const errors: string[] = []

  // Check overall status
  if (health.status !== 'healthy') {
    errors.push(`Overall status is "${health.status}" (expected "healthy")`)
  }

  // Check OpenAI
  if (health.services.openai.status !== 'configured') {
    errors.push(`OpenAI is ${health.services.openai.status} (expected "configured")`)
  }

  // Check Anthropic
  if (health.services.anthropic.status !== 'configured') {
    errors.push(`Anthropic is ${health.services.anthropic.status} (expected "configured")`)
  }

  // Check Supabase
  if (health.services.supabase.status !== 'healthy') {
    errors.push(`Supabase is ${health.services.supabase.status} (expected "healthy")`)
    if (health.services.supabase.error) {
      errors.push(`Supabase error: ${health.services.supabase.error}`)
    }
  }

  // Check Supabase response time
  const supabaseTime = parseInt(health.services.supabase.responseTime)
  if (supabaseTime > 2000) {
    console.log(`⚠️  Warning: Supabase response time is high (${health.services.supabase.responseTime})`)
  }

  if (errors.length > 0) {
    console.log('\n❌ Health check failed:\n')
    errors.forEach(err => console.log(`  - ${err}`))
    throw new Error('Health validation failed')
  }

  console.log('✅ All health checks passed')
}

async function main() {
  console.log('================================================')
  console.log('🏥 TST Health Check')
  console.log('================================================')
  console.log(`🌐 URL: ${TST_URL}`)
  console.log(`⏱️  Max response time: ${MAX_RESPONSE_TIME_MS}ms`)
  console.log(`🔄 Max retries: ${MAX_RETRIES}`)

  try {
    const health = await checkHealth()
    await validateHealth(health)

    console.log('\n================================================')
    console.log('✅ TST HEALTH CHECK PASSED')
    console.log('================================================\n')

    process.exit(0)

  } catch (error) {
    console.log('\n================================================')
    console.log('❌ TST HEALTH CHECK FAILED')
    console.log('================================================')
    console.error('\nError:', error instanceof Error ? error.message : error)
    console.log('\n')

    process.exit(1)
  }
}

main()
