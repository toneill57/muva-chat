#!/usr/bin/env pnpm dlx tsx

/**
 * Fix Reservations with Correct Foreign Keys
 *
 * Vincula las reservas con las accommodation units usando los unit_id
 * correctos de la tabla accommodation_units_public
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
  console.log('🔧 Vinculando reservas con accommodation_units_public...\n')

  try {
    // Paso 1: Obtener unit_ids de accommodation_units_public (estos son los correctos para el FK)
    console.log('📊 Obteniendo accommodation units de la tabla public...')
    const { data: publicUnits, error: unitsError } = await supabase
      .from('accommodation_units_public')
      .select('unit_id, name')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .like('name', '% - Overview')
      .order('name')

    if (unitsError || !publicUnits || publicUnits.length === 0) {
      console.error('❌ No se encontraron units en accommodation_units_public:', unitsError)
      process.exit(1)
    }

    console.log(`  ✅ Encontradas ${publicUnits.length} unidades:`)
    publicUnits.forEach((unit: any, index: number) => {
      console.log(`     ${index + 1}. ${unit.name} (unit_id: ${unit.unit_id})`)
    })

    // Paso 2: Obtener las 5 reservas que faltan por vincular
    console.log('\n📊 Obteniendo reservas sin vínculos...')
    const { data: reservations, error: resError } = await supabase
      .from('guest_reservations')
      .select('id, guest_name, check_in_date, external_booking_id')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .is('accommodation_unit_id', null)
      .order('check_in_date', { ascending: true })
      .limit(5)

    if (resError) {
      console.error('❌ Error al obtener reservas:', resError)
      process.exit(1)
    }

    console.log(`  ✅ Encontradas ${reservations?.length || 0} reservas sin vínculos`)

    if (!reservations || reservations.length === 0) {
      console.log('\n✅ No hay reservas pendientes de vincular')
      return
    }

    // Paso 3: Crear vínculos usando los unit_id correctos
    console.log('\n🔗 Creando vínculos en reservation_accommodations...')

    let linked = 0
    let errors = 0

    for (let i = 0; i < reservations.length; i++) {
      const reservation = reservations[i]
      const unit = publicUnits[i % publicUnits.length] // Distribuir entre las unidades disponibles

      console.log(`\n  Procesando reserva ${i + 1}/${reservations.length}:`)
      console.log(`    - Reserva: ${reservation.external_booking_id} (${reservation.guest_name})`)
      console.log(`    - Unit: ${unit.name} (${unit.unit_id})`)

      // Crear vínculo en reservation_accommodations con el unit_id correcto
      const { error: linkError } = await supabase
        .from('reservation_accommodations')
        .insert({
          reservation_id: reservation.id,
          accommodation_unit_id: unit.unit_id, // Usar unit_id de accommodation_units_public
          motopress_type_id: 307, // Por defecto
          room_rate: 150000 // Precio por defecto
        })

      if (linkError) {
        console.error(`    ❌ Error al vincular:`, linkError.message)
        errors++
      } else {
        console.log(`    ✅ Vínculo creado exitosamente`)

        // NO actualizar accommodation_unit_id en guest_reservations porque apunta a hotels.accommodation_units
        // que tiene IDs diferentes
        linked++
      }
    }

    // Paso 4: Verificar resultados
    console.log('\n📊 Resultados finales:')
    console.log(`  - Reservas vinculadas exitosamente: ${linked}`)
    console.log(`  - Errores encontrados: ${errors}`)

    // Verificar vínculos creados
    const { data: finalLinks, error: linksError } = await supabase
      .from('reservation_accommodations')
      .select('id')
      .in('reservation_id', reservations.map(r => r.id))

    if (!linksError) {
      console.log(`  - Total de vínculos en reservation_accommodations: ${finalLinks?.length || 0}`)
    }

    console.log('\n✅ Proceso completado!')

  } catch (error) {
    console.error('❌ Error durante el proceso:', error)
    process.exit(1)
  }
}

// Ejecutar el script
main()