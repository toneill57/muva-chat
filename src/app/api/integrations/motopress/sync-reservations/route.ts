/**
 * MotoPress Reservations Sync API Endpoint
 *
 * POST /api/integrations/motopress/sync-reservations
 * Syncs reservations/bookings from MotoPress to guest_reservations table.
 *
 * Workflow:
 * 1. Retrieve MotoPress credentials from integration_configs
 * 2. Fetch all bookings from MotoPress API
 * 3. Map bookings to GuestReservation format
 * 4. Upsert into guest_reservations table
 * 5. Log sync history
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { MotoPresClient } from '@/lib/integrations/motopress/client'
import { MotoPresBookingsMapper, type MotoPresBooking, type SireConfig } from '@/lib/integrations/motopress/bookings-mapper'
import { getDecryptedMotoPresCredentials } from '@/lib/integrations/motopress/credentials-helper'

// Allow up to 60 seconds for sync operations (pagination + API delays)
export const maxDuration = 60

interface SyncReservationsRequest {
  tenant_id: string
}

interface SyncReservationsResponse {
  success: boolean
  data?: {
    total: number
    created: number
    updated: number
    skipped: number
    errors: number
  }
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<SyncReservationsResponse>> {
  const supabase = createServerClient()

  try {
    // 1. Parse request body
    const body: SyncReservationsRequest = await request.json()
    const { tenant_id } = body

    if (!tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Missing tenant_id' },
        { status: 400 }
      )
    }

    console.log('[sync-reservations] Starting sync for tenant:', tenant_id)

    // 2. Get SIRE codes from tenant registry
    const { data: tenantData } = await supabase
      .from('tenant_registry')
      .select('features')
      .eq('tenant_id', tenant_id)
      .single()

    const sireConfig: SireConfig = {
      hotel_code: typeof tenantData?.features?.sire_hotel_code === 'string'
        ? tenantData.features.sire_hotel_code
        : null,
      city_code: typeof tenantData?.features?.sire_city_code === 'string'
        ? tenantData.features.sire_city_code
        : null
    }

    console.log('[sync-reservations] SIRE config:', sireConfig)

    // 3. Retrieve MotoPress credentials from integration_configs
    const { data: config, error: configError } = await supabase
      .from('integration_configs')
      .select('config_data, is_active')
      .eq('tenant_id', tenant_id)
      .eq('integration_type', 'motopress')
      .single()

    if (configError || !config) {
      console.error('[sync-reservations] Integration config not found:', configError)
      return NextResponse.json(
        {
          success: false,
          error: 'MotoPress integration not configured for this tenant'
        },
        { status: 404 }
      )
    }

    if (!config.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: 'MotoPress integration is not active'
        },
        { status: 400 }
      )
    }

    // 3. Decrypt credentials and create MotoPresClient
    let credentials
    try {
      credentials = await getDecryptedMotoPresCredentials(config.config_data)
    } catch (error: any) {
      console.error('[sync-reservations] Failed to get credentials:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Error al obtener credenciales. Reconfigura en /accommodations/integrations'
        },
        { status: 500 }
      )
    }

    const client = new MotoPresClient({
      apiKey: credentials.apiKey,
      consumerSecret: credentials.consumerSecret,
      siteUrl: credentials.siteUrl
    })

    console.log('[sync-reservations] Fetching bookings from MotoPress...')

    // 4. Fetch recent bookings from MotoPress (most recent first, max 3 pages = ~300 bookings)
    const response = await client.getRecentBookings(3)

    if (response.error) {
      console.error('[sync-reservations] MotoPress API error:', response.error)
      return NextResponse.json(
        {
          success: false,
          error: `MotoPress API error: ${response.error}`
        },
        { status: 500 }
      )
    }

    const bookings = (response.data || []) as MotoPresBooking[]
    console.log(`[sync-reservations] Fetched ${bookings.length} bookings from MotoPress`)

    // 6. Map bookings to GuestReservation format (with SIRE codes)
    const mappedReservations = await MotoPresBookingsMapper.mapBulkBookings(
      bookings,
      tenant_id,
      supabase,
      sireConfig
    )

    console.log(`[sync-reservations] Mapped ${mappedReservations.length} reservations`)

    // Create lookup map: external_booking_id → original booking (for finding reserved_accommodations)
    const bookingsMap = new Map(
      bookings.map((booking: MotoPresBooking) => [booking.id.toString(), booking])
    )

    // 6. Upsert reservations into guest_reservations AND reservation_accommodations
    let created = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    for (const reservation of mappedReservations) {
      try {
        // Get original booking for accommodation data
        const originalBooking = bookingsMap.get(reservation.external_booking_id)

        // Check if reservation already exists by external_booking_id
        const { data: existing } = await supabase
          .from('guest_reservations')
          .select('id, updated_at')
          .eq('tenant_id', tenant_id)
          .eq('external_booking_id', reservation.external_booking_id)
          .single()

        if (existing) {
          // Update existing reservation - EXCLUDE SIRE guest data fields to preserve user-entered data
          // Only update MotoPress-sourced fields, not SIRE compliance fields filled by guest
          const {
            // Exclude SIRE guest-provided fields (preserve user data)
            guest_name, // Don't overwrite if user already filled passport
            document_type,
            document_number,
            birth_date,
            first_surname,
            second_surname,
            given_names,
            nationality_code,
            origin_city_code,
            destination_city_code,
            movement_type,
            movement_date,
            // Keep hotel codes from tenant config
            ...syncSafeFields
          } = reservation

          const { error: updateError } = await supabase
            .from('guest_reservations')
            .update({
              ...syncSafeFields,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)

          if (updateError) {
            console.error(`[sync-reservations] Update error for booking ${reservation.external_booking_id}:`, updateError)
            errors++
          } else {
            updated++

            // Delete old accommodations and insert new ones (handle room changes)
            await supabase
              .from('reservation_accommodations')
              .delete()
              .eq('reservation_id', existing.id)

            // Save updated accommodations
            if (originalBooking) {
              await MotoPresBookingsMapper.saveReservationAccommodations(
                existing.id,
                originalBooking,
                tenant_id,
                supabase
              )
            }
          }
        } else {
          // Insert new reservation and get the ID
          const { data: insertedReservation, error: insertError } = await supabase
            .from('guest_reservations')
            .insert(reservation)
            .select('id')
            .single()

          if (insertError || !insertedReservation) {
            console.error(`[sync-reservations] Insert error for booking ${reservation.external_booking_id}:`, insertError)
            errors++
          } else {
            created++

            // Save accommodations to junction table
            if (originalBooking) {
              await MotoPresBookingsMapper.saveReservationAccommodations(
                insertedReservation.id,
                originalBooking,
                tenant_id,
                supabase
              )
            }
          }
        }
      } catch (err) {
        console.error(`[sync-reservations] Error processing booking ${reservation.external_booking_id}:`, err)
        errors++
      }
    }

    // 7. Log sync history
    await supabase
      .from('sync_history')
      .insert({
        tenant_id,
        integration_type: 'motopress',
        sync_type: 'reservations',
        status: errors > 0 ? 'partial' : 'success',
        records_processed: mappedReservations.length,
        records_created: created,
        records_updated: updated,
        error_message: errors > 0 ? `${errors} errors occurred during sync` : null,
        metadata: {
          total_bookings: bookings.length,
          skipped,
          errors
        },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })

    console.log('[sync-reservations] ✅ Sync completed:', {
      total: mappedReservations.length,
      created,
      updated,
      skipped,
      errors
    })

    // 8. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          total: mappedReservations.length,
          created,
          updated,
          skipped,
          errors
        }
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[sync-reservations] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  )
}
