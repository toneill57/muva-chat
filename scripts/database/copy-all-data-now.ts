#!/usr/bin/env tsx
/**
 * COPIA DIRECTA DE TODOS LOS DATOS
 * Sin verificaciones, sin teorías - SOLO COPIAR
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DEV_URL = 'https://ooaumjzaztmutltifhoq.supabase.co';
const STAGING_URL = 'https://rvjmwwvkhglcuqwcznph.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no encontrada en .env.local');
  process.exit(1);
}

const devClient = createClient(DEV_URL, SERVICE_KEY);
const stagingClient = createClient(STAGING_URL, SERVICE_KEY);

// TODAS las tablas public que necesitan sync
const TABLES = [
  // Primero las vacías (más urgentes)
  'conversation_memory',
  'reservation_accommodations',
  'staff_conversations',
  'staff_messages',
  'sync_history',
  'hotel_operations',
  'job_logs',

  // Luego las incompletas
  'prospective_sessions',
  'chat_messages',
  'guest_conversations'
];

async function copyTable(tableName: string) {
  console.log(`\n📋 Copiando ${tableName}...`);

  try {
    // 1. Obtener TODOS los datos de dev
    const { data: devData, error: devError } = await devClient
      .from(tableName)
      .select('*');

    if (devError) {
      console.error(`❌ Error obteniendo de dev: ${devError.message}`);
      return false;
    }

    if (!devData || devData.length === 0) {
      console.log(`⏭️ No hay datos en dev`);
      return true;
    }

    console.log(`  📊 ${devData.length} registros en dev`);

    // 2. Limpiar staging
    const { error: deleteError } = await stagingClient
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Truco para borrar todo

    // 3. Insertar en staging (en lotes de 50)
    let inserted = 0;
    for (let i = 0; i < devData.length; i += 50) {
      const batch = devData.slice(i, i + 50);
      const { error: insertError } = await stagingClient
        .from(tableName)
        .insert(batch);

      if (insertError) {
        console.error(`❌ Error insertando: ${insertError.message}`);
      } else {
        inserted += batch.length;
        process.stdout.write(`  📤 ${inserted}/${devData.length}\r`);
      }
    }

    console.log(`  ✅ ${inserted} registros copiados`);
    return inserted === devData.length;

  } catch (error: any) {
    console.error(`❌ Error en ${tableName}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 COPIANDO DATOS DE DEV → STAGING');
  console.log('=' .repeat(50));

  let success = 0;
  let failed = 0;

  for (const table of TABLES) {
    const result = await copyTable(table);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Exitosas: ${success}`);
  console.log(`❌ Fallidas: ${failed}`);

  // Verificar counts finales en staging
  console.log('\n📊 VERIFICACIÓN FINAL EN STAGING:');

  for (const table of TABLES) {
    const { count } = await stagingClient
      .from(table)
      .select('*', { count: 'exact', head: true });
    console.log(`  ${table}: ${count} registros`);
  }
}

main().catch(console.error);