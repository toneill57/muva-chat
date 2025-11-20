#!/usr/bin/env pnpm dlx tsx

/**
 * Fix Reservation Links with Correct IDs
 *
 * El problema: estamos usando IDs de hotels.accommodation_units
 * pero el FK apunta a accommodation_units_public.unit_id
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const SIMMERDOWN_TENANT_ID = '10c27802-545a-4ca3-b453-c9db80c4f504'

async function main() {
  console.log('🔧 Arreglando links de reservaciones con IDs correctos...\n')

  try {
    // Paso 1: Obtener los unit_ids CORRECTOS de accommodation_units_public
    console.log('📊 Obteniendo IDs correctos de accommodation_units_public...')

    const { data: publicUnits, error: unitsError } = await supabase
      .from('accommodation_units_public')
      .select('unit_id, name')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .like('name', '% - Overview%')
      .order('name')

    if (unitsError || !publicUnits || publicUnits.length === 0) {
      console.error('❌ No se encontraron units en accommodation_units_public:', unitsError)
      process.exit(1)
    }

    console.log(`  ✅ Encontrados ${publicUnits.length} unit IDs correctos:`)
    publicUnits.forEach((unit: any) => {
      console.log(`     - ${unit.name}: ${unit.unit_id}`)
    })

    // Paso 2: Obtener reservaciones que necesitan links
    console.log('\n📊 Obteniendo reservaciones sin links...')

    const { data: reservations, error: resError } = await supabase
      .from('guest_reservations')
      .select('id, external_booking_id, check_in_date, guest_name')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .order('check_in_date')
      .limit(10) // Procesar de a 10 para probar

    if (resError) {
      console.error('❌ Error al obtener reservaciones:', resError)
      process.exit(1)
    }

    console.log(`  ✅ Procesando ${reservations?.length || 0} reservaciones`)

    // Paso 3: Verificar qué reservaciones ya tienen links
    const reservationIds = reservations?.map(r => r.id) || []

    const { data: existingLinks, error: linksError } = await supabase
      .from('reservation_accommodations')
      .select('reservation_id')
      .in('reservation_id', reservationIds)

    const linkedReservations = new Set(existingLinks?.map(l => l.reservation_id) || [])
    const unlinkedReservations = reservations?.filter(r => !linkedReservations.has(r.id)) || []

    console.log(`  ℹ️ ${unlinkedReservations.length} reservaciones necesitan links`)

    if (unlinkedReservations.length === 0) {
      console.log('\n✅ Todas las reservaciones ya tienen links')
      return
    }

    // Paso 4: Crear links con IDs CORRECTOS
    console.log('\n🔗 Creando links con IDs correctos...')

    let created = 0
    let errors = 0

    for (let i = 0; i < unlinkedReservations.length; i++) {
      const reservation = unlinkedReservations[i]
      // Distribuir entre las unidades disponibles (round-robin)
      const unit = publicUnits[i % publicUnits.length]

      console.log(`\n  Procesando reservación ${i + 1}/${unlinkedReservations.length}:`)
      console.log(`    - ID: ${reservation.external_booking_id}`)
      console.log(`    - Huésped: ${reservation.guest_name}`)
      console.log(`    - Asignando a: ${unit.name}`)
      console.log(`    - Unit ID correcto: ${unit.unit_id}`)

      const { error: linkError } = await supabase
        .from('reservation_accommodations')
        .insert({
          reservation_id: reservation.id,
          accommodation_unit_id: unit.unit_id, // Usar el ID de accommodation_units_public
          room_rate: 150000 // Precio por defecto
        })

      if (linkError) {
        console.error(`    ❌ Error:`, linkError.message)
        errors++
      } else {
        console.log(`    ✅ Link creado exitosamente`)
        created++
      }
    }

    // Paso 5: Resumen final
    console.log('\n📊 Resumen:')
    console.log(`  - Links creados: ${created}`)
    console.log(`  - Errores: ${errors}`)
    console.log('\n✅ Proceso completado')

  } catch (error) {
    console.error('❌ Error durante el proceso:', error)
    process.exit(1)
  }
}

main()