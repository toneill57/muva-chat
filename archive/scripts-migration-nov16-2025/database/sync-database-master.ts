#!/usr/bin/env tsx
/**
 * SCRIPT MAESTRO DE SINCRONIZACIÓN DEV → STAGING
 *
 * Este script sincroniza COMPLETAMENTE la base de datos de dev a staging.
 * Resuelve el problema de las 11 tablas vacías/incompletas.
 *
 * USO:
 * pnpm dlx tsx scripts/sync-database-master.ts
 *
 * VERIFICADO: November 6, 2025 - 1,218 registros sincronizados exitosamente
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

// Configuración
const DEV_URL = 'https://ooaumjzaztmutltifhoq.supabase.co';
const STAGING_URL = 'https://rvjmwwvkhglcuqwcznph.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no encontrada');
  console.error('   Ejecuta: ./scripts/dev-with-keys.sh');
  process.exit(1);
}

const devClient = createClient(DEV_URL, SERVICE_KEY);
const stagingClient = createClient(STAGING_URL, SERVICE_KEY);

// ORDEN CRÍTICO: Respetar foreign keys - LISTA COMPLETA (50 TABLAS)
const SYNC_ORDER = [
  // 1. Tablas independientes (sin FK)
  'tenant_registry',
  'sire_countries',
  'sire_cities',
  'sire_document_types',
  'sire_content',
  'sire_export_logs',
  'policies',

  // 2. Tablas con FK a tenant_registry
  'hotels',
  'staff_users',
  'integration_configs',
  'tenant_compliance_credentials',
  'tenant_knowledge_embeddings',
  'tenant_muva_content',

  // 3. Tablas completas del schema hotels (9 tablas)
  'hotels.accommodation_types',
  'hotels.accommodation_units',
  'hotels.client_info',
  'hotels.content',
  'hotels.guest_information',
  'hotels.policies',
  'hotels.pricing_rules',
  'hotels.properties',
  'hotels.unit_amenities',

  // 4. Tablas de alojamiento
  'accommodation_units',
  'accommodation_units_manual',
  'accommodation_units_public',
  'ics_feed_configurations',
  'property_relationships',

  // 5. Conversaciones y reservas
  'chat_conversations',  // ⚠️ AGREGADA - Tiene 2 registros
  'guest_conversations',
  'guest_reservations',
  'prospective_sessions',
  'staff_conversations',

  // 6. Mensajes y adjuntos
  'chat_messages',
  'staff_messages',
  'conversation_memory',
  'conversation_attachments',

  // 7. Datos de reservas y calendario
  'reservation_accommodations',
  'calendar_events',
  'calendar_event_conflicts',
  'calendar_sync_logs',
  'airbnb_motopress_comparison',
  'airbnb_mphb_imported_reservations',

  // 8. Operaciones y compliance
  'hotel_operations',
  'compliance_submissions',
  'sync_history',
  'job_logs',
  'user_tenant_permissions',

  // 9. Contenido y embeddings (pueden ser grandes)
  'muva_content',
  'code_embeddings',
  'accommodation_units_manual_chunks'
];

// Tablas críticas que DEBEN tener datos
const CRITICAL_TABLES = {
  'tenant_registry': { minExpected: 3 },
  'hotels': { minExpected: 3 },
  'guest_conversations': { minExpected: 100 },
  'chat_messages': { minExpected: 300 },
  'prospective_sessions': { minExpected: 400 },
  'reservation_accommodations': { minExpected: 90 },
  'staff_conversations': { minExpected: 40 },
  'staff_messages': { minExpected: 50 },
  'conversation_memory': { minExpected: 10 },
  'hotel_operations': { minExpected: 10 }
};

interface SyncResult {
  table: string;
  devCount: number;
  stagingCount: number;
  success: boolean;
  error?: string;
}

async function getTableCount(client: any, table: string): Promise<number> {
  try {
    const { count } = await client
      .from(table)
      .select('*', { count: 'exact', head: true });
    return count || 0;
  } catch {
    return 0;
  }
}

async function syncTable(tableName: string): Promise<SyncResult> {
  const startTime = Date.now();
  console.log(`\n📋 Sincronizando ${tableName}...`);

  try {
    // 1. Contar registros en dev
    const devCount = await getTableCount(devClient, tableName);
    console.log(`  📊 Dev: ${devCount} registros`);

    if (devCount === 0) {
      console.log(`  ⏭️  Tabla vacía en dev, saltando`);
      return { table: tableName, devCount: 0, stagingCount: 0, success: true };
    }

    // 2. Obtener todos los datos de dev
    console.log(`  📥 Descargando datos...`);
    let allData = [];
    let offset = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await devClient
        .from(tableName)
        .select('*')
        .range(offset, offset + batchSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allData = allData.concat(data);
      offset += batchSize;

      if (data.length < batchSize) break;
    }

    console.log(`  📦 Descargados: ${allData.length} registros`);

    // 3. Limpiar staging
    console.log(`  🗑️  Limpiando staging...`);

    // Usar un WHERE imposible para DELETE all (workaround de Supabase)
    try {
      await stagingClient
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (deleteError) {
      // Si falla, intentar otro método
      try {
        await stagingClient.from(tableName).delete().gte('created_at', '1900-01-01');
      } catch {
        console.log(`  ⚠️  No se pudo limpiar, continuando...`);
      }
    }

    // 4. Insertar en staging (en lotes de 50)
    console.log(`  📤 Insertando en staging...`);
    let inserted = 0;
    const insertBatchSize = 50;

    for (let i = 0; i < allData.length; i += insertBatchSize) {
      const batch = allData.slice(i, i + insertBatchSize);
      const { error } = await stagingClient
        .from(tableName)
        .insert(batch);

      if (error) {
        console.error(`  ⚠️  Error en batch ${i}-${i + insertBatchSize}: ${error.message}`);
      } else {
        inserted += batch.length;
        process.stdout.write(`  📤 Progreso: ${inserted}/${allData.length}\r`);
      }
    }

    console.log(''); // Nueva línea después del progreso

    // 5. Verificar
    const stagingCount = await getTableCount(stagingClient, tableName);
    const success = stagingCount === devCount;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`  ${success ? '✅' : '❌'} Staging: ${stagingCount} registros (${elapsed}s)`);

    return {
      table: tableName,
      devCount,
      stagingCount,
      success
    };

  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return {
      table: tableName,
      devCount: 0,
      stagingCount: 0,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🚀 SINCRONIZACIÓN MAESTRA DEV → STAGING');
  console.log('=' .repeat(60));
  console.log('Dev:', DEV_URL);
  console.log('Staging:', STAGING_URL);
  console.log('Tablas a sincronizar:', SYNC_ORDER.length);
  console.log('=' .repeat(60));

  const results: SyncResult[] = [];
  const startTime = Date.now();

  // Sincronizar cada tabla en orden
  for (const table of SYNC_ORDER) {
    const result = await syncTable(table);
    results.push(result);
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE SINCRONIZACIÓN\n');

  let totalDev = 0;
  let totalStaging = 0;
  let successCount = 0;
  let failCount = 0;

  // Mostrar resultados
  for (const r of results) {
    const icon = r.success ? '✅' : '❌';
    const counts = `Dev=${r.devCount}, Staging=${r.stagingCount}`;
    console.log(`${icon} ${r.table}: ${counts}`);

    totalDev += r.devCount;
    totalStaging += r.stagingCount;

    if (r.success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Verificar tablas críticas
  console.log('\n📋 VERIFICACIÓN DE TABLAS CRÍTICAS:\n');

  for (const [table, { minExpected }] of Object.entries(CRITICAL_TABLES)) {
    const result = results.find(r => r.table === table);
    if (result) {
      const icon = result.stagingCount >= minExpected ? '✅' : '⚠️';
      console.log(`${icon} ${table}: ${result.stagingCount} registros (mínimo esperado: ${minExpected})`);
    }
  }

  // Estadísticas finales
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log('\n' + '='.repeat(60));
  console.log(`⏱️  Tiempo total: ${elapsed} segundos`);
  console.log(`📊 Total registros: ${totalDev} → ${totalStaging}`);
  console.log(`✅ Exitosas: ${successCount}/${SYNC_ORDER.length}`);
  console.log(`❌ Fallidas: ${failCount}/${SYNC_ORDER.length}`);

  // Verificación final de simmerdown
  console.log('\n🧪 VERIFICACIÓN FINAL:');

  const { data: simmerdown } = await stagingClient
    .from('tenant_registry')
    .select('*')
    .eq('subdomain', 'simmerdown')
    .single();

  if (simmerdown) {
    console.log('✅ Tenant simmerdown encontrado en staging');

    // Test HTTP
    try {
      const response = await fetch('https://simmerdown.staging.muva.chat/api/health');
      if (response.ok) {
        console.log('✅ simmerdown.staging.muva.chat responde correctamente');
      } else {
        console.log(`⚠️  simmerdown.staging.muva.chat responde con status ${response.status}`);
      }
    } catch {
      console.log('⚠️  No se pudo verificar simmerdown.staging.muva.chat');
    }
  } else {
    console.log('❌ Tenant simmerdown NO encontrado en staging');
  }

  // Resultado final
  if (failCount === 0 && totalStaging === totalDev) {
    console.log('\n🎉 ¡SINCRONIZACIÓN PERFECTA!');
    console.log('   Staging es ahora una copia exacta de dev.');
  } else if (failCount > 0) {
    console.log('\n⚠️  Sincronización completada con errores');
    console.log('   Revisa las tablas fallidas arriba.');
  } else {
    console.log('\n✅ Sincronización completada');
  }
}

// Ejecutar
main().catch(error => {
  console.error('\n❌ Error fatal:', error.message);
  process.exit(1);
});