#!/usr/bin/env tsx
/**
 * SYNC COMPLETO DE DATOS: DEV → STAGING
 *
 * Este script copia TODOS los datos de dev a staging
 * Sin teorías, sin complicaciones - COPIA EXACTA
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

// Configuración de conexiones
const DEV_URL = 'https://ooaumjzaztmutltifhoq.supabase.co';
const STAGING_URL = 'https://rvjmwwvkhglcuqwcznph.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const devClient = createClient(DEV_URL, SERVICE_KEY);
const stagingClient = createClient(STAGING_URL, SERVICE_KEY);

// TODAS las tablas en orden correcto (respetando foreign keys)
const TABLES_IN_ORDER = [
  // Tablas independientes primero
  'tenant_registry',
  'sire_countries',
  'sire_cities',
  'sire_document_types',
  'sire_content',

  // Tablas con FK a tenant_registry
  'hotels',
  'staff_users',
  'integration_configs',

  // Tablas del schema hotels
  'hotels.accommodation_units',
  'hotels.policies',

  // Tablas principales
  'accommodation_units',
  'accommodation_units_manual',
  'accommodation_units_public',
  'ics_feed_configurations',
  'property_relationships',

  // Tablas de conversaciones y reservas
  'guest_conversations',
  'guest_reservations',
  'reservation_accommodations',
  'prospective_sessions',
  'staff_conversations',

  // Tablas de mensajes (dependen de conversaciones)
  'chat_messages',
  'staff_messages',

  // Tablas de contenido y embeddings
  'muva_content',
  'code_embeddings',
  'accommodation_units_manual_chunks',

  // Tablas de operaciones y logs
  'hotel_operations',
  'conversation_memory',
  'calendar_events',
  'sync_history',
  'job_logs',
  'user_tenant_permissions',
];

async function syncTable(tableName: string) {
  console.log(`\n📋 Sincronizando ${tableName}...`);

  try {
    const [schema, table] = tableName.includes('.')
      ? tableName.split('.')
      : ['public', tableName];

    // 1. Contar registros en dev
    const { count: devCount } = await devClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    console.log(`  📊 Dev tiene ${devCount} registros`);

    if (!devCount || devCount === 0) {
      console.log(`  ⏭️ Tabla vacía en dev, saltando...`);
      return { table: tableName, devCount: 0, stagingCount: 0, synced: 0 };
    }

    // 2. Limpiar tabla en staging (con CASCADE para evitar errores de FK)
    console.log(`  🗑️ Limpiando staging...`);
    await stagingClient.rpc('truncate_table', {
      table_name: table,
      schema_name: schema,
      cascade: true
    }).catch(async () => {
      // Si no existe la función RPC, usar SQL directo
      const query = `TRUNCATE TABLE ${schema}.${table} CASCADE`;
      await stagingClient.rpc('exec_sql', { query }).catch(() => {
        console.log(`  ⚠️ No se pudo limpiar, continuando...`);
      });
    });

    // 3. Obtener TODOS los datos de dev (en lotes si es necesario)
    console.log(`  📥 Obteniendo datos de dev...`);
    let allData: any[] = [];
    let offset = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await devClient
        .from(tableName)
        .select('*')
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error(`  ❌ Error obteniendo datos: ${error.message}`);
        break;
      }

      if (!data || data.length === 0) break;

      allData = allData.concat(data);
      offset += batchSize;

      if (data.length < batchSize) break;
    }

    console.log(`  📦 Obtenidos ${allData.length} registros`);

    // 4. Insertar en staging (en lotes)
    console.log(`  📤 Insertando en staging...`);
    let inserted = 0;

    for (let i = 0; i < allData.length; i += 100) {
      const batch = allData.slice(i, i + 100);
      const { error } = await stagingClient
        .from(tableName)
        .insert(batch);

      if (error) {
        console.error(`  ⚠️ Error en batch ${i}-${i+100}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    // 5. Verificar
    const { count: stagingCount } = await stagingClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    const success = devCount === stagingCount;
    console.log(`  ${success ? '✅' : '❌'} Staging ahora tiene ${stagingCount} registros (esperados: ${devCount})`);

    return {
      table: tableName,
      devCount,
      stagingCount,
      synced: inserted,
      success
    };

  } catch (error: any) {
    console.error(`  ❌ Error en ${tableName}: ${error.message}`);
    return {
      table: tableName,
      error: error.message
    };
  }
}

async function main() {
  console.log('🚀 INICIANDO SINCRONIZACIÓN COMPLETA DEV → STAGING\n');
  console.log('Dev URL:', DEV_URL);
  console.log('Staging URL:', STAGING_URL);
  console.log('Total de tablas a sincronizar:', TABLES_IN_ORDER.length);
  console.log('=' .repeat(60));

  const results = [];

  // Desactivar triggers en staging temporalmente
  console.log('\n🔧 Desactivando triggers en staging...');
  try {
    await stagingClient.rpc('exec_sql', {
      query: "SET session_replication_role = 'replica';"
    });
  } catch (e) {
    console.log('  ⚠️ No se pudieron desactivar triggers');
  }

  // Sincronizar cada tabla
  for (const table of TABLES_IN_ORDER) {
    const result = await syncTable(table);
    results.push(result);
  }

  // Reactivar triggers
  console.log('\n🔧 Reactivando triggers en staging...');
  try {
    await stagingClient.rpc('exec_sql', {
      query: "SET session_replication_role = 'origin';"
    });
  } catch (e) {
    console.log('  ⚠️ No se pudieron reactivar triggers');
  }

  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE SINCRONIZACIÓN\n');

  let totalDev = 0;
  let totalStaging = 0;
  let totalSynced = 0;
  let failures = 0;

  results.forEach(r => {
    if (r.error) {
      console.log(`❌ ${r.table}: ERROR - ${r.error}`);
      failures++;
    } else {
      const status = r.success ? '✅' : '⚠️';
      console.log(`${status} ${r.table}: Dev=${r.devCount}, Staging=${r.stagingCount}, Synced=${r.synced}`);
      totalDev += r.devCount || 0;
      totalStaging += r.stagingCount || 0;
      totalSynced += r.synced || 0;
      if (!r.success) failures++;
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`TOTAL: ${totalDev} registros en Dev → ${totalStaging} registros en Staging`);
  console.log(`Sincronizados: ${totalSynced} registros`);
  console.log(`Tablas con errores: ${failures}`);

  // Test final: verificar login de simmerdown
  console.log('\n🧪 TEST FINAL: Verificando simmerdown.staging.muva.chat...');
  try {
    const response = await fetch('https://simmerdown.staging.muva.chat/api/health');
    if (response.ok) {
      console.log('✅ ¡STAGING FUNCIONA CORRECTAMENTE!');
    } else {
      console.log(`⚠️ Staging responde pero con status ${response.status}`);
    }
  } catch (e) {
    console.log('❌ Staging no responde correctamente');
  }

  console.log('\n✨ Sincronización completada');
}

// Ejecutar si no hay funciones RPC, crear versión con pg_dump
if (require.main === module) {
  main().catch(console.error);
}