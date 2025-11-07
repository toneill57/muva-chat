#!/usr/bin/env tsx
/**
 * VERSIÓN ALTERNATIVA: SYNC CON UPSERT
 *
 * Esta versión usa UPSERT en lugar de DELETE + INSERT
 * Preserva datos que existen solo en staging
 *
 * ⚠️ ADVERTENCIA: No recomendado para staging real
 * Staging debería ser copia exacta de dev, no tener datos propios
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DEV_URL = 'https://ooaumjzaztmutltifhoq.supabase.co';
const STAGING_URL = 'https://rvjmwwvkhglcuqwcznph.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no encontrada');
  process.exit(1);
}

const devClient = createClient(DEV_URL, SERVICE_KEY);
const stagingClient = createClient(STAGING_URL, SERVICE_KEY);

async function syncTableWithUpsert(tableName: string) {
  console.log(`\n📋 Sincronizando ${tableName} con UPSERT...`);

  try {
    // 1. Obtener datos de dev
    const { data: devData, error } = await devClient
      .from(tableName)
      .select('*');

    if (error) throw error;
    if (!devData || devData.length === 0) {
      console.log(`  ⏭️  No hay datos en dev`);
      return;
    }

    console.log(`  📦 ${devData.length} registros de dev`);

    // 2. UPSERT en staging (actualiza si existe, inserta si no)
    const { error: upsertError } = await stagingClient
      .from(tableName)
      .upsert(devData, {
        onConflict: 'id',  // Usar la columna 'id' como clave primaria
        ignoreDuplicates: false  // Actualizar si ya existe
      });

    if (upsertError) {
      console.error(`  ❌ Error: ${upsertError.message}`);
    } else {
      console.log(`  ✅ ${devData.length} registros sincronizados (upsert)`);
    }

  } catch (error: any) {
    console.error(`  ❌ Error en ${tableName}: ${error.message}`);
  }
}

async function main() {
  console.log('🔄 SINCRONIZACIÓN CON UPSERT (PRESERVA DATOS EN STAGING)');
  console.log('⚠️  ADVERTENCIA: Esta versión NO reemplaza datos');
  console.log('⚠️  Datos en staging que no existen en dev se mantienen\n');

  // Solo tablas críticas como ejemplo
  const tables = ['tenant_registry', 'hotels', 'guest_conversations'];

  for (const table of tables) {
    await syncTableWithUpsert(table);
  }

  console.log('\n✅ Sincronización con UPSERT completada');
}

main().catch(console.error);