/**
 * Database Wipe API Endpoint (STAGING ONLY)
 *
 * DELETE /api/admin/wipe-database
 * Truncates all tables in staging database for testing purposes
 *
 * CRITICAL: This endpoint ONLY works in staging environment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface WipeResponse {
  success: boolean
  message: string
  environment?: string
  tables_wiped?: string[]
  error?: string
}

export async function DELETE(request: NextRequest): Promise<NextResponse<WipeResponse>> {
  try {
    // CRITICAL: Only allow in staging environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const isStaging = supabaseUrl.includes('hoaiwcueleiemeplrurv')
    const isProduction = supabaseUrl.includes('ooaumjzaztmutltifhoq')

    if (!isStaging) {
      console.error('[Wipe DB] BLOCKED: Not staging environment')
      return NextResponse.json(
        {
          success: false,
          message: isProduction
            ? '🔒 BLOCKED: Database wipe is disabled in production for safety'
            : '🔒 BLOCKED: Database wipe only allowed in staging environment',
          environment: isProduction ? 'production' : 'unknown'
        },
        { status: 403 }
      )
    }

    console.log('[Wipe DB] ⚠️  Starting database wipe in STAGING...')

    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceRole) {
      return NextResponse.json(
        {
          success: false,
          message: 'Service role key not configured',
          error: 'SUPABASE_SERVICE_ROLE_KEY not found'
        },
        { status: 500 }
      )
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // List of tables to wipe (in order to respect FK constraints)
    const tablesToWipe = [
      // Child tables first (FK constraints)
      'reservation_accommodations',
      'guest_reservations',
      'guest_conversations',
      'prospective_sessions',
      'airbnb_mphb_imported_reservations',
      'airbnb_motopress_comparison',
      'calendar_events',
      'calendar_event_conflicts',
      'calendar_sync_logs',
      'chat_conversations',
      'chat_messages',
      'staff_conversations',
      'staff_messages',
      'compliance_submissions',
      'sire_export_logs',
      'conversation_attachments',
      'conversation_memory',
      'ics_feed_configurations',
      'sync_history',
      'job_logs',

      // Accommodation-related tables
      'accommodation_units_manual_chunks',
      'accommodation_units_manual',
      'accommodation_units_public',
      'accommodation_units',
      'hotels.accommodation_units',
      'hotels.accommodation_types',
      'hotels.unit_amenities',
      'hotels.pricing_rules',
      'hotels.guest_information',
      'hotels.policies',
      'hotels.content',
      'hotels.properties',
      'hotels.client_info',

      // Content tables
      'tenant_knowledge_embeddings',
      'tenant_muva_content',
      'code_embeddings',
      'muva_content',
      'sire_content',
      'policies',
      'hotel_operations',
      'hotels',

      // Staff and integration tables
      'staff_users',
      'integration_configs',
      'tenant_compliance_credentials',
      'user_tenant_permissions',
      'property_relationships',

      // Parent tables last
      'tenant_registry'
    ]

    const wipedTables: string[] = []

    for (const table of tablesToWipe) {
      try {
        console.log(`[Wipe DB] 🗑️  Truncating ${table}...`)

        // Execute SQL directly via Management API
        const query = `TRUNCATE TABLE ${table} CASCADE`

        const response = await fetch(
          `https://api.supabase.com/v1/projects/${supabaseUrl.split('//')[1].split('.')[0]}/database/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          const errorData = JSON.parse(errorText)

          // Skip silently if table doesn't exist
          if (errorData?.message?.includes('does not exist')) {
            console.log(`[Wipe DB] ⏭️  ${table} (does not exist, skipping)`)
          } else {
            console.error(`[Wipe DB] ❌ Failed to truncate ${table}:`, errorData?.message || errorText)
          }
          // Continue with other tables even if one fails
        } else {
          wipedTables.push(table)
          console.log(`[Wipe DB] ✅ ${table} wiped`)
        }
      } catch (tableError) {
        console.error(`[Wipe DB] Error wiping ${table}:`, tableError)
        // Continue with other tables
      }
    }

    console.log(`[Wipe DB] ✅ Database wipe complete: ${wipedTables.length}/${tablesToWipe.length} tables`)

    return NextResponse.json(
      {
        success: true,
        message: `✅ Staging database wiped successfully: ${wipedTables.length} tables cleared`,
        environment: 'staging',
        tables_wiped: wipedTables
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('[Wipe DB] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to wipe database',
        error: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    }
  )
}
