import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'edge'

interface SystemMetrics {
  memory?: {
    used: number
    total: number
    percentage: number
  }
  timestamp: string
  uptime?: number
}

interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime?: string
  error?: string
  lastCheck: string
}

interface StatusResponse {
  status: 'healthy' | 'unhealthy' | 'degraded'
  version: string
  environment: string
  timestamp: string
  services: {
    supabase: ServiceStatus
    openai: ServiceStatus
    anthropic: ServiceStatus
    cache: ServiceStatus
  }
  metrics: SystemMetrics
  deployment: {
    region?: string
    commit?: string
    buildTime?: string
  }
}

async function checkSupabaseHealth(supabase: SupabaseClient): Promise<ServiceStatus> {
  const start = performance.now()
  const timestamp = new Date().toISOString()

  try {
    const { data, error } = await supabase
      .from('sire_content')
      .select('id')
      .limit(1)

    const responseTime = `${Math.round(performance.now() - start)}ms`

    if (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime,
        lastCheck: timestamp
      }
    }

    return {
      status: 'healthy',
      responseTime,
      lastCheck: timestamp
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${Math.round(performance.now() - start)}ms`,
      lastCheck: timestamp
    }
  }
}

function checkAPIKeysHealth(): { openai: ServiceStatus; anthropic: ServiceStatus } {
  const timestamp = new Date().toISOString()

  const openaiKey = process.env.OPENAI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  return {
    openai: {
      status: openaiKey && openaiKey.startsWith('sk-proj-') ? 'healthy' : 'unhealthy',
      error: !openaiKey ? 'API key not configured' : undefined,
      lastCheck: timestamp
    },
    anthropic: {
      status: anthropicKey && anthropicKey.startsWith('sk-ant-') ? 'healthy' : 'unhealthy',
      error: !anthropicKey ? 'API key not configured' : undefined,
      lastCheck: timestamp
    }
  }
}

function checkCacheHealth(): ServiceStatus {
  const timestamp = new Date().toISOString()

  try {
    // Simple cache test - this would be more sophisticated in production
    const testKey = 'health-check'
    const testValue = Date.now().toString()

    // Since we're using in-memory cache, we'll just return healthy
    // In production, this would test Redis or other cache systems
    return {
      status: 'healthy',
      lastCheck: timestamp
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Cache error',
      lastCheck: timestamp
    }
  }
}

function getSystemMetrics(): SystemMetrics {
  return {
    timestamp: new Date().toISOString()
    // Memory and uptime metrics are not available in Edge Runtime
    // In a Node.js environment, you could use process.memoryUsage() and process.uptime()
  }
}

function getDeploymentInfo() {
  return {
    region: process.env.VERCEL_REGION || 'local',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown',
    buildTime: process.env.VERCEL_BUILD_TIME || 'unknown'
  }
}

function determineOverallStatus(services: StatusResponse['services']): 'healthy' | 'unhealthy' | 'degraded' {
  const statuses = Object.values(services).map(service => service.status)

  if (statuses.every(status => status === 'healthy')) {
    return 'healthy'
  }

  if (statuses.some(status => status === 'unhealthy')) {
    return 'degraded'
  }

  return 'unhealthy'
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createServerClient()

  try {
    const [supabaseHealth, apiKeysHealth] = await Promise.all([
      checkSupabaseHealth(supabase),
      Promise.resolve(checkAPIKeysHealth())
    ])

    const cacheHealth = checkCacheHealth()

    const services = {
      supabase: supabaseHealth,
      openai: apiKeysHealth.openai,
      anthropic: apiKeysHealth.anthropic,
      cache: cacheHealth
    }

    const response: StatusResponse = {
      status: determineOverallStatus(services),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      services,
      metrics: getSystemMetrics(),
      deployment: getDeploymentInfo()
    }

    const status = response.status === 'healthy' ? 200 :
                  response.status === 'degraded' ? 206 : 503

    return NextResponse.json(response, {
      status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    const errorResponse: Partial<StatusResponse> = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        supabase: {
          status: 'unhealthy',
          error: 'Status check failed',
          lastCheck: new Date().toISOString()
        },
        openai: {
          status: 'unhealthy',
          error: 'Status check failed',
          lastCheck: new Date().toISOString()
        },
        anthropic: {
          status: 'unhealthy',
          error: 'Status check failed',
          lastCheck: new Date().toISOString()
        },
        cache: {
          status: 'unhealthy',
          error: 'Status check failed',
          lastCheck: new Date().toISOString()
        }
      }
    }

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}