/**
 * Staff Tenant Resolver API Endpoint
 *
 * POST /api/staff/resolve-tenant
 * Resolves a username to its tenant slug (for pre-login subdomain redirect)
 *
 * Security Notes:
 * - Public endpoint (no authentication required - pre-login step)
 * - Only reveals tenant_slug, no sensitive user data
 * - Case-insensitive username matching
 * - Rate limiting recommended for production (future enhancement)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { username } = body

    // Validate required fields
    if (!username) {
      return NextResponse.json(
        {
          error: 'Missing required field',
          message: 'username is required',
        },
        { status: 400 }
      )
    }

    // Validate field type
    if (typeof username !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid field type',
          message: 'username must be a string',
        },
        { status: 400 }
      )
    }

    // Validate username is not empty after trimming
    const trimmedUsername = username.trim()
    if (trimmedUsername.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid username',
          message: 'username cannot be empty',
        },
        { status: 400 }
      )
    }

    console.log('[resolve-tenant-api] Resolving tenant for username:', {
      username: trimmedUsername,
      timestamp: new Date().toISOString(),
    })

    const supabase = createServerClient()

    // Step 1: Find staff user by username (case-insensitive)
    const { data: staffUser, error: staffError } = await supabase
      .from('staff_users')
      .select('tenant_id, username')
      .ilike('username', trimmedUsername) // Case-insensitive match
      .eq('is_active', true) // Only active users
      .single()

    if (staffError || !staffUser) {
      console.warn('[resolve-tenant-api] User not found:', {
        username: trimmedUsername,
        error: staffError?.message,
      })

      return NextResponse.json(
        {
          error: 'User not found',
          message: 'No staff user found with that username',
        },
        { status: 404 }
      )
    }

    // Step 2: Get tenant slug from tenant_registry
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('slug')
      .eq('tenant_id', staffUser.tenant_id)
      .single()

    if (tenantError || !tenantData) {
      console.error('[resolve-tenant-api] Tenant not found:', {
        tenant_id: staffUser.tenant_id,
        error: tenantError?.message,
      })

      return NextResponse.json(
        {
          error: 'Tenant not found',
          message: 'Could not resolve tenant for this user',
        },
        { status: 500 }
      )
    }

    console.log('[resolve-tenant-api] Tenant resolved successfully:', {
      username: staffUser.username,
      tenant_slug: tenantData.slug,
    })

    // Return only tenant_slug (no sensitive data)
    return NextResponse.json(
      {
        success: true,
        tenant_slug: tenantData.slug,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[resolve-tenant-api] Error:', error)

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Use POST to resolve tenant',
    },
    { status: 405 }
  )
}
