#!/usr/bin/env pnpm dlx tsx

/**
 * Link Reservations to Accommodations Script
 *
 * Este script vincula las reservas existentes con los accommodation units
 * creando los registros necesarios en reservation_accommodations
 *
 * Uso: pnpm dlx tsx scripts/link-reservations-to-accommodations.ts
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

async function main() {
  console.log('🔧 Vinculando reservas con accommodation units...\n')

  try {
    // Paso 1: Obtener accommodation units disponibles
    console.log('📊 Obteniendo accommodation units...')
    const { data: units, error: unitsError } = await supabase.rpc('get_accommodation_units', {
      p_tenant_id: SIMMERDOWN_TENANT_ID
    })

    if (unitsError || !units || units.length === 0) {
      console.error('❌ No se encontraron accommodation units:', unitsError)
      process.exit(1)
    }

    console.log(`  ✅ Encontradas ${units.length} unidades de alojamiento`)
    units.forEach((unit: any, index: number) => {
      console.log(`     ${index + 1}. ${unit.name} (ID: ${unit.id})`)
    })

    // Paso 2: Obtener reservas sin vínculos
    console.log('\n📊 Obteniendo reservas sin vínculos...')
    const { data: reservations, error: resError } = await supabase
      .from('guest_reservations')
      .select('id, guest_name, check_in_date, external_booking_id')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .is('accommodation_unit_id', null)
      .order('check_in_date', { ascending: true })

    if (resError) {
      console.error('❌ Error al obtener reservas:', resError)
      process.exit(1)
    }

    console.log(`  ✅ Encontradas ${reservations?.length || 0} reservas sin vínculos`)

    if (!reservations || reservations.length === 0) {
      console.log('\n✅ No hay reservas pendientes de vincular')
      return
    }

    // Paso 3: Crear vínculos en reservation_accommodations
    console.log('\n🔗 Creando vínculos en reservation_accommodations...')

    let linked = 0
    let errors = 0

    // Distribuir reservas entre las unidades disponibles (round-robin)
    for (let i = 0; i < reservations.length; i++) {
      const reservation = reservations[i]
      const unit = units[i % units.length] // Distribuir entre las unidades disponibles

      // Crear vínculo en reservation_accommodations
      const { error: linkError } = await supabase
        .from('reservation_accommodations')
        .insert({
          reservation_id: reservation.id,
          accommodation_unit_id: unit.id,
          motopress_type_id: 307, // Por defecto, debería venir de MotoPress
          room_rate: 150000 // Precio por defecto
        })

      if (linkError) {
        console.error(`  ❌ Error al vincular reserva ${reservation.external_booking_id}:`, linkError.message)
        errors++
      } else {
        // También actualizar accommodation_unit_id en guest_reservations
        const { error: updateError } = await supabase
          .from('guest_reservations')
          .update({ accommodation_unit_id: unit.id })
          .eq('id', reservation.id)

        if (updateError) {
          console.error(`  ❌ Error al actualizar reserva ${reservation.external_booking_id}:`, updateError.message)
          errors++
        } else {
          console.log(`  ✅ Vinculada reserva de ${reservation.guest_name} (${reservation.check_in_date}) con ${unit.name}`)
          linked++
        }
      }
    }

    // Paso 4: Verificar resultados
    console.log('\n📊 Resultados finales:')
    console.log(`  - Reservas vinculadas exitosamente: ${linked}`)
    console.log(`  - Errores encontrados: ${errors}`)

    // Verificar estado final
    const { data: finalStats } = await supabase
      .from('guest_reservations')
      .select('id')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .not('accommodation_unit_id', 'is', null)

    console.log(`  - Total de reservas con accommodation_unit_id: ${finalStats?.length || 0}`)

    const { data: finalLinks } = await supabase
      .from('reservation_accommodations')
      .select('id, reservation_id')
      .in('reservation_id', reservations.map(r => r.id))

    console.log(`  - Total de vínculos en reservation_accommodations: ${finalLinks?.length || 0}`)

    console.log('\n✅ Proceso completado!')

  } catch (error) {
    console.error('❌ Error durante el proceso:', error)
    process.exit(1)
  }
}

// Ejecutar el script
main()