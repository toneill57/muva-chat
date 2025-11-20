#!/usr/bin/env pnpm dlx tsx

/**
 * EMERGENCY FIX - Revertir los nombres incorrectos
 *
 * Este script revierte el desastre de poner URLs como nombres
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
  console.log('🚨 REPARACIÓN DE EMERGENCIA - Revirtiendo nombres incorrectos...\n')

  try {
    // Paso 1: Revertir todas las que tienen URL como nombre
    console.log('🔧 Buscando reservas con URLs como nombres...')

    const { data: badReservations, error: fetchError } = await supabase
      .from('guest_reservations')
      .select('id, guest_name')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)
      .like('guest_name', '%Reservation URL%')

    if (fetchError) {
      console.error('❌ Error al buscar reservas:', fetchError)
      process.exit(1)
    }

    console.log(`  ⚠️ Encontradas ${badReservations?.length || 0} reservas con URLs como nombres`)

    if (badReservations && badReservations.length > 0) {
      console.log('  🔄 Revirtiendo a "Guest"...')

      // Actualizar todas de vuelta a "Guest"
      const { error: updateError } = await supabase
        .from('guest_reservations')
        .update({ guest_name: 'Guest' })
        .eq('tenant_id', SIMMERDOWN_TENANT_ID)
        .like('guest_name', '%Reservation URL%')

      if (updateError) {
        console.error('  ❌ Error al actualizar:', updateError)
      } else {
        console.log(`  ✅ Revertidas ${badReservations.length} reservas a "Guest"`)
      }
    }

    // Paso 2: Verificar el estado final
    console.log('\n📊 Estado final:')

    const { data: finalStats } = await supabase
      .from('guest_reservations')
      .select('guest_name')
      .eq('tenant_id', SIMMERDOWN_TENANT_ID)

    const guestCount = finalStats?.filter(r => r.guest_name === 'Guest').length || 0
    const realNameCount = finalStats?.filter(r => r.guest_name !== 'Guest').length || 0
    const urlCount = finalStats?.filter(r => r.guest_name.includes('Reservation URL')).length || 0

    console.log(`  - Total de reservas: ${finalStats?.length || 0}`)
    console.log(`  - Con nombres reales: ${realNameCount}`)
    console.log(`  - Con nombre "Guest": ${guestCount}`)
    console.log(`  - Con URLs como nombre: ${urlCount}`)

    console.log('\n✅ Daño revertido. Las reservas están de vuelta a "Guest".')
    console.log('\n⚠️ IMPORTANTE: Los nombres de Airbnb NO están disponibles en los datos de MotoPress.')
    console.log('   MotoPress no recibe nombres reales de Airbnb por políticas de privacidad.')
    console.log('   Solo las reservas directas de MotoPress tienen nombres reales.\n')

  } catch (error) {
    console.error('❌ Error durante el proceso:', error)
    process.exit(1)
  }
}

main()