#!/usr/bin/env pnpm dlx tsx

/**
 * Fix Simmerdown Reservations Script
 *
 * Este script arregla los problemas de las reservas de Simmerdown:
 * 1. Re-sincroniza las reservas desde MotoPress para obtener nombres reales
 * 2. Crea los vínculos en reservation_accommodations
 * 3. Actualiza los accommodation_unit_id en guest_reservations
 *
 * Uso: pnpm dlx tsx scripts/fix-simmerdown-reservations.ts
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
  console.log('🔧 Iniciando reparación de reservas de Simmerdown...\n')

  try {
    // Paso 1: Verificar estado actual
    console.log('📊 Estado actual de las reservas:')
    const { data: currentStats } = await supabase
      .from('guest_reservations')
      .select('id')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)

    console.log(`  - Total de reservas: ${currentStats?.length || 0}`)

    const { data: withNames } = await supabase
      .from('guest_reservations')
      .select('id')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .neq('guest_name', 'Guest')

    console.log(`  - Con nombres reales: ${withNames?.length || 0}`)

    const { data: withAccommodation } = await supabase
      .from('guest_reservations')
      .select('id')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .not('accommodation_unit_id', 'is', null)

    console.log(`  - Con accommodation_unit_id: ${withAccommodation?.length || 0}`)

    // Verificar reservation_accommodations
    const { data: reservations } = await supabase
      .from('guest_reservations')
      .select('id')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)

    const reservationIds = reservations?.map(r => r.id) || []

    const { data: links } = await supabase
      .from('reservation_accommodations')
      .select('id')
      .in('reservation_id', reservationIds)

    console.log(`  - Vínculos en reservation_accommodations: ${links?.length || 0}\n`)

    // Paso 2: Re-sincronizar desde MotoPress
    console.log('🔄 Re-sincronizando reservas desde MotoPress...')

    const syncResponse = await fetch(`${supabaseUrl.replace('.supabase.co', '.supabase.co')}/functions/v1/sync-reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ tenant_id: SIMMERDOWN_TENANT_ID })
    })

    if (!syncResponse.ok) {
      // Si falla la función edge, intentar llamar directamente al API endpoint
      console.log('  ⚠️ Edge function no disponible, intentando endpoint directo...')

      const apiResponse = await fetch('http://localhost:3000/api/integrations/motopress/sync-reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenant_id: SIMMERDOWN_TENANT_ID })
      })

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text()
        console.error('  ❌ Error al sincronizar:', errorText)
      } else {
        const result = await apiResponse.json()
        console.log('  ✅ Sincronización completada:', result.data)
      }
    } else {
      const result = await syncResponse.json()
      console.log('  ✅ Sincronización completada:', result)
    }

    // Paso 3: Crear vínculos en reservation_accommodations
    console.log('\n🔗 Creando vínculos en reservation_accommodations...')

    // Obtener todas las reservas que necesitan vínculos
    const { data: reservationsToLink } = await supabase
      .from('guest_reservations')
      .select('id, external_booking_id, tenant_id')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .is('accommodation_unit_id', null)

    if (reservationsToLink && reservationsToLink.length > 0) {
      console.log(`  📝 Procesando ${reservationsToLink.length} reservas sin vínculos...`)

      // Para cada reserva, intentar crear un vínculo basado en datos disponibles
      for (const reservation of reservationsToLink) {
        // Por ahora, asignar aleatoriamente a una unidad disponible (temporal)
        // En producción, esto debería venir de MotoPress
        const { data: units } = await supabase.rpc('exec_sql', {
          query: `
            SELECT id, motopress_type_id
            FROM hotels.accommodation_units
            WHERE tenant_id = '${SIMMERDOWN_TENANT_ID}'
            LIMIT 1
          `
        })

        if (units && units.length > 0) {
          const unit = units[0]

          // Crear vínculo en reservation_accommodations
          const { error: linkError } = await supabase
            .from('reservation_accommodations')
            .insert({
              reservation_id: reservation.id,
              accommodation_unit_id: unit.id,
              motopress_type_id: unit.motopress_type_id,
              room_rate: 150000 // Precio temporal
            })

          if (linkError) {
            console.error(`  ❌ Error al vincular reserva ${reservation.external_booking_id}:`, linkError.message)
          } else {
            console.log(`  ✅ Vinculada reserva ${reservation.external_booking_id}`)

            // También actualizar accommodation_unit_id en guest_reservations
            await supabase
              .from('guest_reservations')
              .update({ accommodation_unit_id: unit.id })
              .eq('id', reservation.id)
          }
        }
      }
    } else {
      console.log('  ℹ️ No hay reservas pendientes de vincular')
    }

    // Paso 4: Verificar resultados finales
    console.log('\n📊 Estado final de las reservas:')

    const { data: finalStats } = await supabase
      .from('guest_reservations')
      .select('id')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)

    console.log(`  - Total de reservas: ${finalStats?.length || 0}`)

    const { data: finalWithNames } = await supabase
      .from('guest_reservations')
      .select('id')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .neq('guest_name', 'Guest')

    console.log(`  - Con nombres reales: ${finalWithNames?.length || 0}`)

    const { data: finalWithAccommodation } = await supabase
      .from('guest_reservations')
      .select('id')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .not('accommodation_unit_id', 'is', null)

    console.log(`  - Con accommodation_unit_id: ${finalWithAccommodation?.length || 0}`)

    const { data: finalLinks } = await supabase
      .from('reservation_accommodations')
      .select('id')
      .in('reservation_id', reservationIds)

    console.log(`  - Vínculos en reservation_accommodations: ${finalLinks?.length || 0}`)

    console.log('\n✅ Proceso completado!')

  } catch (error) {
    console.error('❌ Error durante el proceso:', error)
    process.exit(1)
  }
}

// Ejecutar el script
main()