/**
 * MotoPress Bookings Synchronization Script
 *
 * Syncs confirmed future bookings from MotoPress to InnPilot guest_reservations table.
 *
 * Usage:
 *   npm run sync:motopress:bookings
 *   or
 *   npx tsx scripts/sync-motopress-bookings.ts [tenant_id]
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ============================================================================
// Types
// ============================================================================

interface MotoPresBooking {
  id: number
  status: string  // confirmed, pending, cancelled, etc.
  check_in_date: string  // YYYY-MM-DD
  check_out_date: string
  check_in_time: string
  check_out_time: string
  customer: {
    first_name: string
    last_name: string
    email: string
    phone: string
    country: string
    address1: string
  }
  reserved_accommodations: Array<{
    accommodation: number
    accommodation_type: number
    adults: number
    children: number
    guest_name: string
    accommodation_price_per_days?: Array<{ price: number }>
    discount?: number
  }>
  currency: string
  total_price: number
}

interface IntegrationConfig {
  id: string
  tenant_id: string
  config_data: {
    // Support both old and new formats
    consumer_key?: string
    consumer_secret?: string
    site_url?: string
    // New format (Basic Auth - Application Password)
    username?: string
    password?: string
    api_url?: string
  }
  is_active: boolean
}

interface SyncResult {
  success: boolean
  tenant_id: string
  tenant_name: string
  bookings_fetched: number
  bookings_created: number
  bookings_updated: number
  bookings_skipped: number
  errors: string[]
  duration_ms: number
}

// ============================================================================
// MotoPress API Client
// ============================================================================

class MotoPresBookingClient {
  private apiKey: string
  private consumerSecret: string
  private baseUrl: string
  private timeout: number = 30000

  constructor(consumerKey: string, consumerSecret: string, siteUrl: string) {
    this.apiKey = consumerKey
    this.consumerSecret = consumerSecret
    this.baseUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/mphb/v1`
  }

  private async makeRequest<T>(endpoint: string): Promise<{ data?: T; error?: string }> {
    const url = `${this.baseUrl}${endpoint}`

    try {
      const credentials = Buffer.from(`${this.apiKey}:${this.consumerSecret}`).toString('base64')

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'User-Agent': 'InnPilot/1.0',
        },
        signal: AbortSignal.timeout(this.timeout),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { error: `HTTP ${response.status}: ${errorText}` }
      }

      const data = await response.json()
      return { data }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { error: 'Request timeout' }
      }
      return { error: error.message || 'Network error' }
    }
  }

  async getBookings(params?: { status?: string; per_page?: number; page?: number }): Promise<{ data?: MotoPresBooking[]; error?: string }> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
    if (params?.page) queryParams.append('page', params.page.toString())

    const endpoint = `/bookings${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    return this.makeRequest<MotoPresBooking[]>(endpoint)
  }

  async getAllBookings(): Promise<{ data?: MotoPresBooking[]; error?: string }> {
    const allBookings: MotoPresBooking[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      // No filter by status - get ALL bookings (confirmed, pending, cancelled, blocked, etc.)
      const response = await this.getBookings({ per_page: 100, page })

      if (response.error) {
        return response
      }

      const bookings = response.data || []
      allBookings.push(...bookings)

      // If we get less than 100, we've reached the end
      if (bookings.length < 100) {
        hasMore = false
      } else {
        page++
      }
    }

    return { data: allBookings }
  }
}

// ============================================================================
// Sync Functions
// ============================================================================

function mapMotoPresStatusToInnPilot(motoPresStatus: string): string {
  const statusMap: { [key: string]: string } = {
    'confirmed': 'active',
    'pending': 'pending',
    'cancelled': 'cancelled',
    'abandoned': 'cancelled',
  }

  return statusMap[motoPresStatus] || 'pending'
}

async function syncBookingsForTenant(tenantId: string): Promise<SyncResult> {
  const startTime = Date.now()
  const result: SyncResult = {
    success: false,
    tenant_id: tenantId,
    tenant_name: '',
    bookings_fetched: 0,
    bookings_created: 0,
    bookings_updated: 0,
    bookings_skipped: 0,
    errors: [],
    duration_ms: 0,
  }

  try {
    // Get tenant information
    const { data: tenant, error: tenantError} = await supabase
      .from('tenant_registry')
      .select('tenant_id, nombre_comercial, slug')
      .eq('tenant_id', tenantId)
      .single()

    if (tenantError || !tenant) {
      result.errors.push(`Tenant not found: ${tenantId}`)
      result.duration_ms = Date.now() - startTime
      return result
    }

    result.tenant_name = tenant.nombre_comercial

    console.log(`\n🏨 Syncing bookings for: ${tenant.nombre_comercial} (${tenant.slug})`)
    console.log('━'.repeat(60))

    // Get MotoPress integration configuration
    const { data: config, error: configError } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'motopress')
      .eq('is_active', true)
      .single()

    if (configError || !config) {
      result.errors.push('No active MotoPress integration found')
      result.duration_ms = Date.now() - startTime
      return result
    }

    // Initialize MotoPress client
    // Normalize credentials to support both formats (consumer_key/secret OR username/password)
    const credentials = config.config_data

    // Extract site URL (remove /wp-json/mphb/v1 if present in api_url)
    let siteUrl = credentials.site_url || credentials.api_url || ''
    if (siteUrl.includes('/wp-json')) {
      siteUrl = siteUrl.split('/wp-json')[0]
    }

    // Extract auth credentials
    const authUser = credentials.consumer_key || credentials.username || ''
    const authPass = credentials.consumer_secret || credentials.password || ''

    // Validate credentials
    if (!authUser || !authPass || !siteUrl) {
      result.errors.push(
        `Invalid MotoPress credentials. Missing: ${[
          !authUser ? 'username/consumer_key' : '',
          !authPass ? 'password/consumer_secret' : '',
          !siteUrl ? 'site_url/api_url' : ''
        ].filter(Boolean).join(', ')}`
      )
      result.duration_ms = Date.now() - startTime
      return result
    }

    const client = new MotoPresBookingClient(authUser, authPass, siteUrl)

    // Fetch ALL bookings from MotoPress (all statuses: confirmed, pending, cancelled, blocked, etc.)
    console.log('📥 Fetching all bookings from MotoPress (all statuses)...')
    const response = await client.getAllBookings()

    if (response.error || !response.data) {
      result.errors.push(`Failed to fetch bookings: ${response.error}`)
      result.duration_ms = Date.now() - startTime
      return result
    }

    const motoPresBookings = response.data
    result.bookings_fetched = motoPresBookings.length

    console.log(`   Found ${motoPresBookings.length} bookings (all statuses)`)

    // Filter for bookings from 1 month ago onwards (includes recent past + future)
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    const minDate = oneMonthAgo.toISOString().split('T')[0]

    const relevantBookings = motoPresBookings.filter(
      (booking) => booking.check_in_date >= minDate
    )

    console.log(`   ${relevantBookings.length} bookings from ${minDate} onwards (all statuses)`)

    if (relevantBookings.length === 0) {
      console.log('   ℹ️  No relevant bookings to sync')
      result.success = true
      result.duration_ms = Date.now() - startTime
      return result
    }

    // Process each booking
    for (const mpBooking of relevantBookings) {
      try {
        const guestName = `${mpBooking.customer.first_name} ${mpBooking.customer.last_name}`.trim() || 'Guest'
        const phoneRaw = mpBooking.customer.phone || ''
        const phoneLast4 = phoneRaw.replace(/\D/g, '').slice(-4) || '0000'

        // 🆕 MULTI-UNIT SUPPORT: Iterate over ALL reserved accommodations
        // One MotoPress booking can have multiple units (e.g., MP-28675 has 8 units)
        const totalUnits = mpBooking.reserved_accommodations.length

        for (let unitIndex = 0; unitIndex < totalUnits; unitIndex++) {
          const reservedUnit = mpBooking.reserved_accommodations[unitIndex]

          // Calculate individual unit price from accommodation_price_per_days
          let unitPrice = 0
          if (reservedUnit.accommodation_price_per_days && Array.isArray(reservedUnit.accommodation_price_per_days)) {
            unitPrice = reservedUnit.accommodation_price_per_days.reduce((sum: number, day: any) => {
              return sum + (day.price || 0)
            }, 0)
          }

          // Subtract unit discount if present
          if (reservedUnit.discount) {
            unitPrice -= reservedUnit.discount
          }

          // Find accommodation unit by MotoPress accommodation TYPE (not instance)
          // Uses hotels.accommodation_units as source of truth (multi-tenant)
          let accommodationUnitId: string | null = null
          const motoPresAccommodationTypeId = reservedUnit.accommodation_type

          // Query hotels schema using custom RPC function
          const { data: unitId, error: unitError } = await supabase.rpc(
            'get_accommodation_unit_by_motopress_id',
            {
              p_tenant_id: tenantId,
              p_motopress_unit_id: motoPresAccommodationTypeId
            }
          )

          if (!unitError && unitId) {
            accommodationUnitId = unitId
          }

          // Check if booking already exists (by external_booking_id + check-in + phone + accommodation_unit_id)
          // CRITICAL: Must include accommodation_unit_id to avoid updating the same reservation multiple times for multi-unit bookings
          const { data: existingReservation } = await supabase
            .from('guest_reservations')
            .select('id, status, updated_at')
            .eq('tenant_id', tenantId)
            .eq('external_booking_id', mpBooking.id.toString())
            .eq('check_in_date', mpBooking.check_in_date)
            .eq('phone_last_4', phoneLast4)
            .eq('accommodation_unit_id', accommodationUnitId)
            .maybeSingle()

          const reservationData = {
            tenant_id: tenantId,
            guest_name: guestName,
            phone_full: phoneRaw,
            phone_last_4: phoneLast4,
            check_in_date: mpBooking.check_in_date,
            check_out_date: mpBooking.check_out_date,
            reservation_code: `MP-${mpBooking.id}`,
            status: mapMotoPresStatusToInnPilot(mpBooking.status),
            accommodation_unit_id: accommodationUnitId,

            // 🆕 NEW: Complete booking details (PHASE 2)
            guest_email: mpBooking.customer.email || null,
            guest_country: mpBooking.customer.country || null,
            adults: reservedUnit.adults || 1,  // Use specific unit's capacity
            children: reservedUnit.children || 0,  // Use specific unit's capacity
            total_price: unitPrice || null,  // Individual unit price from accommodation_price_per_days
            currency: mpBooking.currency || 'COP',
            check_in_time: mpBooking.check_in_time || '15:00',
            check_out_time: mpBooking.check_out_time || '12:00',
            booking_source: 'motopress',
            external_booking_id: mpBooking.id.toString(),  // Same ID for all units
            booking_notes: mpBooking.customer.address1 || null,  // Store address as notes

            updated_at: new Date().toISOString(),
          }

          if (existingReservation) {
            // Update existing reservation
            const { error: updateError } = await supabase
              .from('guest_reservations')
              .update(reservationData)
              .eq('id', existingReservation.id)

            if (updateError) {
              result.errors.push(`Failed to update booking MP-${mpBooking.id} unit ${unitIndex + 1}: ${updateError.message}`)
            } else {
              result.bookings_updated++
              console.log(`   ✓ Updated: ${guestName} (${mpBooking.check_in_date}) - Unit ${unitIndex + 1}/${totalUnits}`)
            }
          } else {
            // Create new reservation
            const { error: insertError } = await supabase
              .from('guest_reservations')
              .insert([reservationData])

            if (insertError) {
              result.errors.push(`Failed to create booking MP-${mpBooking.id} unit ${unitIndex + 1}: ${insertError.message}`)
            } else {
              result.bookings_created++
              console.log(`   ✓ Created: ${guestName} (${mpBooking.check_in_date}) - Unit ${unitIndex + 1}/${totalUnits}`)
            }
          }
        }
      } catch (error: any) {
        result.errors.push(`Error processing booking ${mpBooking.id}: ${error.message}`)
      }
    }

    result.bookings_skipped = result.bookings_fetched - result.bookings_created - result.bookings_updated
    result.success = result.errors.length === 0
    result.duration_ms = Date.now() - startTime

    // Update last_sync timestamp in integration_configs
    await supabase
      .from('integration_configs')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', config.id)

    return result
  } catch (error: any) {
    result.errors.push(`Unexpected error: ${error.message}`)
    result.duration_ms = Date.now() - startTime
    return result
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('🚀 MotoPress Bookings Synchronization')
  console.log('━'.repeat(60))
  console.log(`Started at: ${new Date().toLocaleString()}`)

  try {
    // Get tenant_id from command line args or sync all active tenants
    const targetTenantId = process.argv[2]

    if (targetTenantId) {
      // Sync specific tenant
      console.log(`\nTarget tenant: ${targetTenantId}`)

      const result = await syncBookingsForTenant(targetTenantId)
      printSyncResult(result)
    } else {
      // Sync all tenants with active MotoPress integrations
      console.log('\nSyncing all tenants with active MotoPress integrations...\n')

      const { data: configs, error } = await supabase
        .from('integration_configs')
        .select('tenant_id')
        .eq('integration_type', 'motopress')
        .eq('is_active', true)

      if (error || !configs || configs.length === 0) {
        console.log('❌ No active MotoPress integrations found')
        process.exit(1)
      }

      console.log(`Found ${configs.length} tenant(s) with active MotoPress integration\n`)

      const results: SyncResult[] = []
      for (const config of configs) {
        const result = await syncBookingsForTenant(config.tenant_id)
        results.push(result)
      }

      // Print summary
      console.log('\n' + '━'.repeat(60))
      console.log('📊 SYNC SUMMARY')
      console.log('━'.repeat(60))

      for (const result of results) {
        printSyncResult(result)
      }

      const totalSuccess = results.filter((r) => r.success).length
      const totalFailed = results.filter((r) => !r.success).length
      const totalCreated = results.reduce((sum, r) => sum + r.bookings_created, 0)
      const totalUpdated = results.reduce((sum, r) => sum + r.bookings_updated, 0)

      console.log('\n' + '='.repeat(60))
      console.log(`✅ Successful: ${totalSuccess} | ❌ Failed: ${totalFailed}`)
      console.log(`📝 Total Created: ${totalCreated} | 🔄 Total Updated: ${totalUpdated}`)
      console.log('='.repeat(60))
    }

    console.log(`\n✨ Completed at: ${new Date().toLocaleString()}`)
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    process.exit(1)
  }
}

function printSyncResult(result: SyncResult) {
  const icon = result.success ? '✅' : '❌'
  console.log(`\n${icon} ${result.tenant_name} (${result.tenant_id})`)
  console.log(`   Fetched: ${result.bookings_fetched} | Created: ${result.bookings_created} | Updated: ${result.bookings_updated}`)
  console.log(`   Duration: ${result.duration_ms}ms`)

  if (result.errors.length > 0) {
    console.log(`   Errors:`)
    result.errors.forEach((error) => console.log(`     - ${error}`))
  }
}

// Run the script
main()
