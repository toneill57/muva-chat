#!/usr/bin/env pnpm dlx tsx

/**
 * Fix Airbnb Guest Names Script
 *
 * Este script actualiza las 280 reservas que tienen "Guest" como nombre
 * extrayendo los nombres reales desde:
 * 1. ical_summary (para Airbnb)
 * 2. ical_description (para Airbnb)
 * 3. reserved_accommodations guest_name
 *
 * Uso: pnpm dlx tsx scripts/fix-airbnb-guest-names.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const SIMMERDOWN_TENANT_ID = '10c27802-545a-4ca3-b453-c9db80c4f504'

/**
 * Extrae el nombre del huésped desde el texto iCal
 */
function extractGuestNameFromIcal(ical: string | null): string | null {
  if (!ical) return null

  const patterns = [
    /Reserved for\s+(.+?)(?:\s*\(|$)/i,  // "Reserved for John Doe" or "Reserved for John Doe ("
    /Guest:\s*(.+?)(?:\s*\(|$)/i,        // "Guest: Jane Smith"
    /Name:\s*(.+?)(?:\s*\(|$)/i,         // "Name: Bob Johnson"
    /^([^(]+?)(?:\s*\()/                 // Just the name before parentheses
  ]

  for (const pattern of patterns) {
    const match = ical.match(pattern)
    if (match?.[1]) {
      const name = match[1].trim()
      // Filter out non-name values
      if (name && name !== 'Not available' && name !== 'Guest' && name.length > 2) {
        return name
      }
    }
  }

  return null
}

async function main() {
  console.log('🔧 Reparando nombres de huéspedes en reservas de Airbnb...\n')

  try {
    // Paso 1: Obtener todas las reservas con nombre "Guest"
    console.log('📊 Obteniendo reservas con nombre "Guest"...')

    // Primero necesitamos obtener los datos completos incluyendo booking_notes (ical_description)
    const { data: reservations, error: resError } = await supabase
      .from('guest_reservations')
      .select('id, guest_name, external_booking_id, booking_source, booking_notes')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .eq('guest_name', 'Guest')
      .order('check_in_date', { ascending: true })

    if (resError) {
      console.error('❌ Error al obtener reservas:', resError)
      process.exit(1)
    }

    console.log(`  ✅ Encontradas ${reservations?.length || 0} reservas con nombre "Guest"`)

    if (!reservations || reservations.length === 0) {
      console.log('\n✅ No hay reservas con nombre "Guest" para reparar')
      return
    }

    // Paso 2: Procesar cada reserva para extraer el nombre real
    console.log('\n🔍 Extrayendo nombres reales...')

    let fixed = 0
    let notFound = 0
    const updates: { id: string; guest_name: string }[] = []

    for (const reservation of reservations) {
      let extractedName: string | null = null

      // Para reservas de Airbnb, intentar extraer de booking_notes (ical_description)
      if (reservation.booking_source === 'mphb-airbnb' && reservation.booking_notes) {
        extractedName = extractGuestNameFromIcal(reservation.booking_notes)

        if (extractedName) {
          console.log(`  ✅ Reserva ${reservation.external_booking_id}: Extraído "${extractedName}" desde booking_notes`)
        }
      }

      // Si encontramos un nombre, agregarlo a la lista de actualizaciones
      if (extractedName) {
        updates.push({
          id: reservation.id,
          guest_name: extractedName
        })
        fixed++
      } else {
        notFound++
        console.log(`  ⚠️ Reserva ${reservation.external_booking_id}: No se pudo extraer nombre (${reservation.booking_source})`)
      }
    }

    // Paso 3: Actualizar en batch las reservas con nombres encontrados
    if (updates.length > 0) {
      console.log(`\n📝 Actualizando ${updates.length} reservas con nombres reales...`)

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('guest_reservations')
          .update({ guest_name: update.guest_name })
          .eq('id', update.id)

        if (updateError) {
          console.error(`  ❌ Error al actualizar reserva ${update.id}:`, updateError.message)
        }
      }
    }

    // Paso 4: Verificar resultados finales
    console.log('\n📊 Resultados finales:')
    console.log(`  - Reservas procesadas: ${reservations.length}`)
    console.log(`  - Nombres extraídos exitosamente: ${fixed}`)
    console.log(`  - Sin nombre disponible: ${notFound}`)

    // Verificar el estado actual
    const { data: finalStats } = await supabase
      .from('guest_reservations')
      .select('guest_name')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)

    const guestCount = finalStats?.filter(r => r.guest_name === 'Guest').length || 0
    const realNameCount = finalStats?.filter(r => r.guest_name !== 'Guest').length || 0

    console.log('\n📊 Estado actual de todas las reservas:')
    console.log(`  - Total de reservas: ${finalStats?.length || 0}`)
    console.log(`  - Con nombres reales: ${realNameCount}`)
    console.log(`  - Con nombre "Guest": ${guestCount}`)

    // Paso 5: Intentar re-sincronizar para las que no se pudieron arreglar
    if (notFound > 0) {
      console.log('\n🔄 Intentando re-sincronizar las reservas sin nombres...')
      console.log('  ℹ️ Ejecuta el endpoint de sincronización completa para obtener más datos:')
      console.log('  curl -X POST http://localhost:3000/api/integrations/motopress/sync-all \\')
      console.log(`    -H "Content-Type: application/json" \\`)
      console.log(`    -d '{"tenant_id": "${SIMMERDOWN_TENANT_ID}"}'`)
    }

    console.log('\n✅ Proceso completado!')

  } catch (error) {
    console.error('❌ Error durante el proceso:', error)
    process.exit(1)
  }
}

// Ejecutar el script
main()