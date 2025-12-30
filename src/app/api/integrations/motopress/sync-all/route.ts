/**
 * MotoPress Complete Sync API Endpoint with Server-Sent Events (SSE)
 *
 * GET /api/integrations/motopress/sync-all?tenant_id=xxx
 *
 * Syncs ALL reservations from MotoPress using _embed parameter for complete data.
 * Uses Server-Sent Events (SSE) for real-time progress updates to avoid timeouts.
 *
 * Workflow:
 * 1. Retrieve MotoPress credentials from integration_configs
 * 2. Fetch ALL bookings from MotoPress API with _embed (SLOW but complete)
 * 3. Stream progress updates via SSE
 * 4. Map bookings to GuestReservation format (includes room names from _embed)
 * 5. Upsert into guest_reservations table
 * 6. Log sync history
 * 7. Stream final results
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { MotoPresClient } from '@/lib/integrations/motopress/client'
import { MotoPresSyncManager } from '@/lib/integrations/motopress/sync-manager'
import { MotoPresBookingsMapper, type SireConfig } from '@/lib/integrations/motopress/bookings-mapper'
import { getDecryptedMotoPresCredentials } from '@/lib/integrations/motopress/credentials-helper'
import { verifyStaffToken } from '@/lib/staff-auth'

// No maxDuration - SSE keeps connection alive
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface SSEMessage {
  type: 'progress' | 'complete' | 'error' | 'heartbeat'
  message?: string
  current?: number
  total?: number
  stats?: {
    total: number
    created: number
    updated: number
    errors: number
    blocksExcluded: number
    pastExcluded: number
  }
}

// Heartbeat interval to keep connection alive (30 seconds)
const HEARTBEAT_INTERVAL_MS = 30000

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenant_id = searchParams.get('tenant_id')
  const token = searchParams.get('token')

  // Validate required parameters
  if (!tenant_id) {
    return NextResponse.json(
      { success: false, error: 'Missing tenant_id' },
      { status: 400 }
    )
  }

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Missing authentication token' },
      { status: 401 }
    )
  }

  // Verify staff authentication (token from query param)
  const session = await verifyStaffToken(token)

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    )
  }

  // Verify tenant matches session
  if (session.tenant_id !== tenant_id) {
    return NextResponse.json(
      { success: false, error: 'Tenant ID mismatch' },
      { status: 403 }
    )
  }

  console.log(`[sync-all] Authenticated: ${session.staff_id} (${session.role}) for tenant ${tenant_id}`)

  // Setup SSE stream
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const sendEvent = async (data: SSEMessage) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
    } catch (error) {
      console.error('[sync-all] Failed to send SSE event:', error)
    }
  }

  // Start async sync process
  ;(async () => {
    const supabase = createServerClient()

    // Start heartbeat to keep connection alive during long operations
    // This prevents nginx/proxy timeouts (typically 60s)
    const heartbeatInterval = setInterval(async () => {
      try {
        await sendEvent({ type: 'heartbeat', message: 'keep-alive' })
        console.log('[sync-all] 💓 Heartbeat sent')
      } catch (error) {
        // Stream might be closed, ignore
      }
    }, HEARTBEAT_INTERVAL_MS)

    try {
      console.log('[sync-all] Starting complete sync for tenant:', tenant_id)
      await sendEvent({ type: 'progress', message: 'Starting sync...' })

      // 1. Get SIRE codes from tenant registry
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

      console.log('[sync-all] SIRE config:', sireConfig)

      // 2. Retrieve MotoPress credentials from integration_configs
      const { data: config, error: configError } = await supabase
        .from('integration_configs')
        .select('config_data, is_active')
        .eq('tenant_id', tenant_id)
        .eq('integration_type', 'motopress')
        .single()

      if (configError || !config) {
        console.error('[sync-all] Integration config not found:', configError)
        clearInterval(heartbeatInterval)
        await sendEvent({
          type: 'error',
          message: 'MotoPress no configurado. Ve a /accommodations/integrations para configurar.'
        })
        await writer.close()
        return
      }

      if (!config.is_active) {
        clearInterval(heartbeatInterval)
        await sendEvent({
          type: 'error',
          message: 'MotoPress integration is not active'
        })
        await writer.close()
        return
      }

      // 2. Decrypt credentials and create MotoPresClient
      let credentials
      try {
        credentials = await getDecryptedMotoPresCredentials(config.config_data)
      } catch (error: any) {
        console.error('[sync-all] Failed to get credentials:', error)
        clearInterval(heartbeatInterval)
        await sendEvent({
          type: 'error',
          message: error.message || 'Error al obtener credenciales. Reconfigura en /accommodations/integrations'
        })
        await writer.close()
        return
      }

      const client = new MotoPresClient({
        apiKey: credentials.apiKey,
        consumerSecret: credentials.consumerSecret,
        siteUrl: credentials.siteUrl
      })

      // 2.5. WARM-UP: Test connection to establish session (same as "Verificar Estado" button)
      // This fixes the issue where clicking "Verify Estado" makes sync work
      await sendEvent({ type: 'progress', message: 'Establishing connection...' })

      const testResult = await client.testConnection()

      if (!testResult.success) {
        console.error('[sync-all] Connection test failed:', testResult.message)
        clearInterval(heartbeatInterval)
        await sendEvent({
          type: 'error',
          message: `Connection failed: ${testResult.message}. Please verify credentials at /accommodations/integrations`
        })
        await writer.close()
        return
      }

      console.log(`[sync-all] ✅ Connection test successful: ${testResult.accommodationsCount} accommodations found`)
      await sendEvent({
        type: 'progress',
        message: `Connection established (${testResult.accommodationsCount} accommodations). Fetching bookings...`
      })

      // 2.5. SYNC ACCOMMODATIONS FIRST (Fix: Race condition)
      // This prevents reservations from being inserted with accommodation_unit_id = NULL
      // See: docs/troubleshooting/2025-11-19_MOTOPRESS_MULTI_TENANT_SYNC_FIX.md
      await sendEvent({
        type: 'progress',
        message: 'Step 1/2: Syncing accommodations first...'
      })

      const syncManager = new MotoPresSyncManager()
      const accommodationResult = await syncManager.syncAccommodations(tenant_id, false) // forceEmbeddings = false

      if (!accommodationResult.success) {
        console.error('[sync-all] ❌ Accommodations sync failed:', accommodationResult.message)
        clearInterval(heartbeatInterval)
        await sendEvent({
          type: 'error',
          message: `Failed to sync accommodations: ${accommodationResult.message}. Cannot proceed with reservations sync.`
        })
        await writer.close()
        return
      }

      const totalAccommodations = accommodationResult.created + accommodationResult.updated
      console.log(`[sync-all] ✅ Accommodations synced: ${accommodationResult.created} created, ${accommodationResult.updated} updated`)

      await sendEvent({
        type: 'progress',
        message: `Step 1/2 Complete: ${totalAccommodations} accommodations synced. Now fetching reservations...`
      })

      // 3. Fetch ALL bookings with _embed (SLOW but complete data)
      await sendEvent({ type: 'progress', message: 'Fetching bookings with complete data...' })

      const bookingsResponse = await client.getAllBookingsWithEmbed(
        (current, total, message) => {
          // Stream progress to client
          sendEvent({
            type: 'progress',
            current,
            total,
            message
          })
        }
      )

      if (bookingsResponse.error) {
        console.error('[sync-all] MotoPress API error:', bookingsResponse.error)
        clearInterval(heartbeatInterval)
        await sendEvent({
          type: 'error',
          message: `MotoPress API error: ${bookingsResponse.error}`
        })
        await writer.close()
        return
      }

      const bookings = bookingsResponse.data || []
      console.log(`[sync-all] Fetched ${bookings.length} bookings from MotoPress`)

      // DIAGNOSTIC: Check for duplicates in raw MotoPress data
      const airbnbBookings = bookings.filter((b: any) =>
        b.ical_description?.includes('airbnb.com')
      )
      console.log(`[sync-all] 🔍 DIAGNOSTIC: ${airbnbBookings.length} Airbnb bookings found`)

      // Extract and check for duplicate reservation codes
      const reservationCodes: Record<string, number> = {}
      airbnbBookings.forEach((b: any) => {
        const codeMatch = b.ical_description?.match(/\/([A-Z0-9]{10,})/)
        if (codeMatch) {
          const code = codeMatch[1]
          reservationCodes[code] = (reservationCodes[code] || 0) + 1
        }
      })

      const duplicateCodes = Object.entries(reservationCodes)
        .filter(([code, count]) => count > 1)
        .map(([code, count]) => `${code} (${count}x)`)

      if (duplicateCodes.length > 0) {
        console.log(`[sync-all] ⚠️ DUPLICATES IN RAW DATA: ${duplicateCodes.join(', ')}`)

        // Log details of duplicates
        duplicateCodes.forEach(dupCode => {
          const code = dupCode.split(' ')[0]
          const dups = airbnbBookings.filter((b: any) =>
            b.ical_description?.includes(code)
          )
          console.log(`[sync-all] 📋 Duplicate ${code} details:`)
          dups.forEach((b: any) => {
            console.log(`  - Booking ID: ${b.id}, Status: ${b.status}, Accommodation IDs: ${b.reserved_accommodations?.map((r: any) => r.accommodation_type).join(', ')}`)
          })
        })
      } else {
        console.log(`[sync-all] ✅ No duplicates found in raw MotoPress data`)
      }

      await sendEvent({
        type: 'progress',
        message: `Fetched ${bookings.length} bookings. Processing...`
      })

      // 4. Map bookings to GuestReservation format (with _embedded data and SIRE codes)
      const { reservations: mappedReservations, icsImports, pastExcluded, statusExcluded, icsExcluded } =
        await MotoPresBookingsMapper.mapBulkBookingsWithEmbed(
          bookings,
          tenant_id,
          supabase,
          sireConfig
        )

      console.log(`[sync-all] Mapped ${mappedReservations.length} reservations (includes Airbnb + MotoPress), excluded ${pastExcluded} past/future, ${statusExcluded} cancelled, ${icsExcluded} blocks`)
      await sendEvent({
        type: 'progress',
        message: `Procesadas ${mappedReservations.length} reservas (Airbnb + MotoPress directo). Excluidas: ${pastExcluded} pasadas, ${statusExcluded} canceladas, ${icsExcluded} bloques. Guardando...`
      })

      // Create lookup map: external_booking_id → original booking (for finding reserved_accommodations)
      const bookingsMap = new Map(
        bookings.map((booking: any) => [booking.id.toString(), booking])
      )

      // 5. Upsert reservations into guest_reservations AND reservation_accommodations
      let created = 0
      let updated = 0
      let errors = 0

      // DIAGNOSTIC: Track what we're about to save
      const reservationCodesSaving = new Set<string>()

      for (const reservation of mappedReservations) {
        const originalBooking = bookingsMap.get(reservation.external_booking_id)

        if (!originalBooking) {
          console.error(`[sync-all] Cannot find original booking for external_booking_id=${reservation.external_booking_id}`)
          errors++
          continue
        }

        // DIAGNOSTIC: Log Airbnb reservations being saved
        if (reservation.reservation_code) {
          if (reservationCodesSaving.has(reservation.reservation_code)) {
            console.log(`[sync-all] 🚨 DUPLICATE SAVE ATTEMPT: ${reservation.reservation_code} (external_id: ${reservation.external_booking_id})`)
          }
          reservationCodesSaving.add(reservation.reservation_code)
          console.log(`[sync-all] 💾 Saving Airbnb reservation: ${reservation.reservation_code} (external_id: ${reservation.external_booking_id})`)
        }

        try {
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
              console.error(`[sync-all] Update error for booking ${reservation.external_booking_id}:`, updateError)
              errors++
            } else {
              updated++

              // Delete old accommodations and insert new ones (handle room changes)
              await supabase
                .from('reservation_accommodations')
                .delete()
                .eq('reservation_id', existing.id)

              // Save updated accommodations
              await MotoPresBookingsMapper.saveReservationAccommodations(
                existing.id,
                originalBooking,
                tenant_id,
                supabase
              )
            }
          } else {
            // Insert new reservation and get the ID
            const { data: insertedReservation, error: insertError } = await supabase
              .from('guest_reservations')
              .insert(reservation)
              .select('id')
              .single()

            if (insertError || !insertedReservation) {
              console.error(`[sync-all] Insert error for booking ${reservation.external_booking_id}:`, insertError)
              errors++
            } else {
              created++

              // Save accommodations to junction table
              await MotoPresBookingsMapper.saveReservationAccommodations(
                insertedReservation.id,
                originalBooking,
                tenant_id,
                supabase
              )
            }
          }
        } catch (err) {
          console.error(`[sync-all] Error processing booking ${reservation.external_booking_id}:`, err)
          errors++
        }
      }

      // 5.5. Save ICS imports to comparison table (TEMPORARILY DISABLED - too slow for testing)
      // TODO: Re-enable after performance optimization or implement as background job
      let icsCreated = 0
      let icsErrors = 0

      // ICS imports (Airbnb) are now processed together with direct MotoPress bookings
      // No separate handling needed - they're already in mappedReservations

      /* COMMENTED OUT - Uncomment when ready to implement ICS sync
      if (icsImports.length > 0) {
        console.log(`[sync-all] 📥 Processing ${icsImports.length} ICS imports (Airbnb)...`)
        await sendEvent({
          type: 'progress',
          message: `Guardando ${icsImports.length} reservas ICS de Airbnb...`
        })

        for (const booking of icsImports) {
          try {
            const guestName = `${booking.customer?.first_name || ''} ${booking.customer?.last_name || ''}`.trim() || 'Guest'
            const phoneRaw = booking.customer?.phone || ''
            const phoneLast4 = phoneRaw.replace(/\D/g, '').slice(-4) || '0000'

            // Process each accommodation in the booking
            for (const reservedUnit of booking.reserved_accommodations || []) {
              // Calculate unit price
              let unitPrice = 0
              if (reservedUnit.accommodation_price_per_days && Array.isArray(reservedUnit.accommodation_price_per_days)) {
                unitPrice = reservedUnit.accommodation_price_per_days.reduce((sum: number, day: any) => sum + (day.price || 0), 0)
              }
              if (reservedUnit.discount) {
                unitPrice -= reservedUnit.discount
              }

              // Find accommodation unit by TYPE ID
              let accommodationUnitId: string | null = null
              const motoPresTypeId = reservedUnit.accommodation_type

              if (motoPresTypeId) {
                const { data: units } = await supabase.rpc('get_accommodation_unit_by_motopress_id', {
                  p_tenant_id: tenant_id,
                  p_motopress_type_id: motoPresTypeId
                })

                if (units && units.length > 0) {
                  accommodationUnitId = units[0].id
                }
              }

              // Upsert to airbnb_mphb_imported_reservations
              const { error: upsertError } = await supabase
                .from('airbnb_mphb_imported_reservations')
                .upsert({
                  tenant_id,
                  motopress_booking_id: booking.id,
                  motopress_accommodation_id: reservedUnit.accommodation,
                  motopress_type_id: reservedUnit.accommodation_type,

                  guest_name: guestName,
                  guest_email: booking.customer?.email || null,
                  phone_full: phoneRaw,
                  phone_last_4: phoneLast4,
                  guest_country: booking.customer?.country || null,

                  check_in_date: booking.check_in_date,
                  check_out_date: booking.check_out_date,
                  check_in_time: booking.check_in_time || '15:00',
                  check_out_time: booking.check_out_time || '12:00',

                  adults: reservedUnit.adults || 1,
                  children: reservedUnit.children || 0,
                  total_price: unitPrice || null,
                  currency: booking.currency || 'COP',

                  accommodation_unit_id: accommodationUnitId,

                  given_names: booking.customer?.first_name || null,
                  first_surname: booking.customer?.last_name || null,
                  second_surname: null,

                  booking_notes: booking.ical_description || null,
                  raw_motopress_data: booking,

                  comparison_status: 'pending',
                  updated_at: new Date().toISOString(),
                }, {
                  onConflict: 'tenant_id,motopress_booking_id,check_in_date,motopress_accommodation_id'
                })

              if (upsertError) {
                console.error(`[sync-all] Error saving ICS import MP-${booking.id}:`, upsertError)
                icsErrors++
              } else {
                icsCreated++
              }
            }
          } catch (err) {
            console.error(`[sync-all] Error processing ICS import ${booking.id}:`, err)
            icsErrors++
          }
        }

        console.log(`[sync-all] ✅ ICS imports saved: ${icsCreated} created, ${icsErrors} errors`)
      }
      */

      // 6. Log sync history
      await supabase
        .from('sync_history')
        .insert({
          tenant_id,
          integration_type: 'motopress',
          sync_type: 'reservations_complete',
          status: errors > 0 ? 'partial' : 'success',
          records_processed: mappedReservations.length,
          records_created: created,
          records_updated: updated,
          error_message: errors > 0 ? `${errors} errors occurred during sync` : null,
          metadata: {
            total_bookings: bookings.length,
            past_excluded: pastExcluded,
            status_excluded: statusExcluded,
            ics_excluded: icsExcluded,
            ics_created: icsCreated,
            ics_errors: icsErrors,
            errors,
            sync_method: '_embed'
          },
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })

      console.log('[sync-all] ✅ Complete sync finished:', {
        total: mappedReservations.length,
        created,
        updated,
        errors,
        icsCreated,
        icsErrors,
        pastExcluded,
        statusExcluded,
        icsExcluded
      })

      // 7. Send completion event
      await sendEvent({
        type: 'complete',
        stats: {
          total: mappedReservations.length,
          created,
          updated,
          errors,
          blocksExcluded: icsExcluded, // Calendar blocks excluded (Airbnb mirror listings)
          pastExcluded
        }
      })

      // Update last_sync_at timestamp
      await supabase
        .from('integration_configs')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('tenant_id', tenant_id)
        .eq('integration_type', 'motopress')

    } catch (error: any) {
      console.error('[sync-all] Unexpected error:', error)
      clearInterval(heartbeatInterval)
      await sendEvent({
        type: 'error',
        message: error.message || 'Internal server error'
      })
    } finally {
      // Always stop heartbeat and close writer
      clearInterval(heartbeatInterval)
      console.log('[sync-all] 💓 Heartbeat stopped')
      try {
        await writer.close()
      } catch (closeError) {
        // Stream already closed, ignore
        console.log('[sync-all] Stream already closed')
      }
    }
  })()

  // Return SSE response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    }
  })
}
