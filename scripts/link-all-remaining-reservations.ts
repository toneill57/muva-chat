#!/usr/bin/env pnpm dlx tsx

/**
 * Link ALL Remaining Reservations
 *
 * Vincula las 221 reservaciones restantes con accommodation units
 * usando los IDs correctos de accommodation_units_public
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
  console.log('🔧 Vinculando TODAS las reservaciones restantes...\n')

  try {
    // Paso 1: Obtener los unit_ids CORRECTOS
    const { data: publicUnits, error: unitsError } = await supabase
      .from('accommodation_units_public')
      .select('unit_id, name')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .like('name', '% - Overview%')
      .order('name')

    if (unitsError || !publicUnits || publicUnits.length === 0) {
      console.error('❌ No se encontraron units:', unitsError)
      process.exit(1)
    }

    console.log(`✅ Usando ${publicUnits.length} accommodation units disponibles\n`)

    // Paso 2: Obtener TODAS las reservaciones sin links
    const { data: unlinkedReservations, error: resError } = await supabase
      .from('guest_reservations')
      .select('id, external_booking_id, guest_name, check_in_date')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .order('check_in_date')

    if (resError) {
      console.error('❌ Error al obtener reservaciones:', resError)
      process.exit(1)
    }

    // Paso 3: Filtrar las que NO tienen links
    const reservationIds = unlinkedReservations?.map(r => r.id) || []

    const { data: existingLinks } = await supabase
      .from('reservation_accommodations')
      .select('reservation_id')
      .in('reservation_id', reservationIds)

    const linkedIds = new Set(existingLinks?.map(l => l.reservation_id) || [])
    const toLink = unlinkedReservations?.filter(r => !linkedIds.has(r.id)) || []

    console.log(`📊 Estado actual:`)
    console.log(`  - Total reservaciones: ${unlinkedReservations?.length}`)
    console.log(`  - Ya vinculadas: ${linkedIds.size}`)
    console.log(`  - Por vincular: ${toLink.length}\n`)

    if (toLink.length === 0) {
      console.log('✅ Todas las reservaciones ya tienen vínculos')
      return
    }

    // Paso 4: Crear links en batches
    console.log('🔗 Creando vínculos...\n')

    const batchSize = 50
    let totalCreated = 0
    let totalErrors = 0

    for (let batch = 0; batch * batchSize < toLink.length; batch++) {
      const start = batch * batchSize
      const end = Math.min(start + batchSize, toLink.length)
      const batchReservations = toLink.slice(start, end)

      console.log(`📦 Procesando batch ${batch + 1} (reservaciones ${start + 1}-${end} de ${toLink.length})`)

      const inserts = batchReservations.map((reservation, idx) => ({
        reservation_id: reservation.id,
        accommodation_unit_id: publicUnits[(start + idx) % publicUnits.length].unit_id,
        room_rate: 150000
      }))

      const { error: batchError, data } = await supabase
        .from('reservation_accommodations')
        .insert(inserts)
        .select()

      if (batchError) {
        console.error(`  ❌ Error en batch:`, batchError.message)
        totalErrors += batchReservations.length
      } else {
        totalCreated += data?.length || 0
        console.log(`  ✅ ${data?.length || 0} vínculos creados`)
      }
    }

    // Paso 5: Verificación final
    console.log('\n📊 Resumen final:')
    console.log(`  - Vínculos creados: ${totalCreated}`)
    console.log(`  - Errores: ${totalErrors}`)

    // Verificar estado final
    const { count: finalCount } = await supabase
      .from('reservation_accommodations')
      .select('*', { count: 'exact', head: true })
      .in('reservation_id', reservationIds)

    console.log(`  - Total vínculos en DB: ${finalCount}`)
    console.log('\n✅ Proceso completado')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()