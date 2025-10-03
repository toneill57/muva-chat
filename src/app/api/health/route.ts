import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'edge'

export async function GET() {
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

    // Test Supabase connection across all active tables (metadata-driven)
    try {
      console.log('[Health] Testing Supabase multi-tenant connectivity...')

      const tables = [
        { name: 'sire_content', schema: 'public' },
        { name: 'muva_content', schema: 'public' },
        { name: 'content', schema: 'simmerdown' }
      ]

      const tableHealth: Record<string, any> = {}
      let overallError = null

      // Test each table independently using raw SQL to support custom schemas
      for (const table of tables) {
        const tableStartTime = Date.now()
        try {
          // Use raw SQL for custom schemas since .schema() method is limited
          const sqlQuery = `SELECT id FROM ${table.schema}.${table.name} LIMIT 1;`
          console.log(`[Health] Testing ${table.schema}.${table.name} with raw SQL`)

          const { data, error } = await supabase.rpc('exec_sql', { sql: sqlQuery })

          const tableResponseTime = Date.now() - tableStartTime
          tableHealth[`${table.schema}.${table.name}`] = {
            status: error ? 'error' : 'healthy',
            responseTime: `${tableResponseTime}ms`,
            error: error?.message || null
          }

          if (error) {
            overallError = `${table.schema}.${table.name}: ${error.message}`
            console.error(`[Health] ❌ Table test failed: ${table.schema}.${table.name}`, error)
          } else {
            console.log(`[Health] ✅ Table test successful: ${table.schema}.${table.name}`)
          }
        } catch (tableError) {
          const tableResponseTime = Date.now() - tableStartTime
          tableHealth[`${table.schema}.${table.name}`] = {
            status: 'error',
            responseTime: `${tableResponseTime}ms`,
            error: tableError instanceof Error ? tableError.message : 'Connection failed'
          }
          overallError = `${table.schema}.${table.name}: ${tableError instanceof Error ? tableError.message : 'Connection failed'}`
          console.error(`[Health] ❌ Table test exception: ${table.schema}.${table.name}`, tableError)
        }
      }

      const responseTime = Date.now() - startTime
      console.log(`[Health] Multi-tenant test completed in ${responseTime}ms`)

      health.services.supabase = {
        status: overallError ? 'error' : 'healthy',
        responseTime: `${responseTime}ms`,
        error: overallError,
        tables: tableHealth
      }

      // Set overall status based on critical services
      const criticalError = overallError || !process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY
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