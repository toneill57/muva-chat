import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const runtime = 'edge'

export async function GET() {
  const supabase = createServerClient()

  try {
    console.log('[Health] Starting health check...')
    const startTime = Date.now()

    // Initialize health object
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        openai: {
          status: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured'
        },
        anthropic: {
          status: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured'
        },
        supabase: {
          status: 'testing' as 'testing' | 'healthy' | 'error',
          responseTime: '0ms',
          error: null as string | null,
          tables: {} as Record<string, any>
        }
      },
      environment: {
        runtime: 'edge',
        region: process.env.VERCEL_REGION || 'local',
        deployment: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local'
      }
    }

    // Test Supabase connection with simple tenant_registry query
    try {
      console.log('[Health] Testing Supabase connectivity...')

      // Simple test: Check if we can query tenant_registry (always in public schema)
      const { data, error } = await supabase
        .from('tenant_registry')
        .select('tenant_id')
        .limit(1)

      const responseTime = Date.now() - startTime

      if (error) {
        console.error('[Health] ❌ Supabase query failed:', error)
        health.services.supabase = {
          status: 'error',
          responseTime: `${responseTime}ms`,
          error: error.message,
          tables: {}
        }
        health.status = 'degraded'
      } else {
        console.log('[Health] ✅ Supabase query successful')
        health.services.supabase = {
          status: 'healthy',
          responseTime: `${responseTime}ms`,
          error: null,
          tables: {
            'public.tenant_registry': {
              status: 'healthy',
              responseTime: `${responseTime}ms`,
              error: null
            }
          }
        }
      }

      // Set overall status based on critical services
      const criticalError = error || !process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY
      if (criticalError) {
        health.status = 'degraded'
      }

    } catch (supabaseError) {
      console.error('[Health] Supabase connection failed:', supabaseError)
      health.services.supabase = {
        status: 'error',
        responseTime: `${Date.now() - startTime}ms`,
        error: supabaseError instanceof Error ? supabaseError.message : 'Connection failed',
        tables: {}
      }
      health.status = 'degraded'
    }

    const statusCode = health.status === 'healthy' ? 200 : 503
    console.log(`[Health] Health check completed with status: ${health.status}`)

    return NextResponse.json(health, { status: statusCode })

  } catch (error) {
    console.error('[Health] Fatal error in health check:', error)

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}