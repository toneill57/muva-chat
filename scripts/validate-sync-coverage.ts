#!/usr/bin/env tsx
/**
 * VALIDACIÓN: Verificar qué tablas NO están siendo sincronizadas
 */

// Todas las tablas encontradas en la base de datos
const ALL_TABLES_IN_DB = [
  // Schema hotels (9 tablas)
  'hotels.accommodation_types',
  'hotels.accommodation_units',
  'hotels.client_info',
  'hotels.content',
  'hotels.guest_information',
  'hotels.policies',
  'hotels.pricing_rules',
  'hotels.properties',
  'hotels.unit_amenities',

  // Schema public (41 tablas)
  'accommodation_units',
  'accommodation_units_manual',
  'accommodation_units_manual_chunks',
  'accommodation_units_public',
  'airbnb_motopress_comparison',
  'airbnb_mphb_imported_reservations',
  'calendar_event_conflicts',
  'calendar_events',
  'calendar_sync_logs',
  'chat_conversations',
  'chat_messages',
  'code_embeddings',
  'compliance_submissions',
  'conversation_attachments',
  'conversation_memory',
  'guest_conversations',
  'guest_reservations',
  'hotel_operations',
  'hotels',
  'ics_feed_configurations',
  'integration_configs',
  'job_logs',
  'muva_content',
  'policies',
  'property_relationships',
  'prospective_sessions',
  'reservation_accommodations',
  'sire_cities',
  'sire_content',
  'sire_countries',
  'sire_document_types',
  'sire_export_logs',
  'staff_conversations',
  'staff_messages',
  'staff_users',
  'sync_history',
  'tenant_compliance_credentials',
  'tenant_knowledge_embeddings',
  'tenant_muva_content',
  'tenant_registry',
  'user_tenant_permissions'
];

// Tablas que SÍ están en el script de sincronización
const TABLES_IN_SYNC_SCRIPT = [
  'tenant_registry',
  'sire_countries',
  'sire_cities',
  'sire_document_types',
  'sire_content',
  'hotels',
  'staff_users',
  'integration_configs',
  'hotels.accommodation_units',
  'hotels.policies',
  'accommodation_units',
  'accommodation_units_manual',
  'accommodation_units_public',
  'ics_feed_configurations',
  'property_relationships',
  'guest_conversations',
  'guest_reservations',
  'prospective_sessions',
  'staff_conversations',
  'chat_messages',
  'staff_messages',
  'conversation_memory',
  'reservation_accommodations',
  'hotel_operations',
  'calendar_events',
  'sync_history',
  'job_logs',
  'user_tenant_permissions',
  'muva_content',
  'code_embeddings',
  'accommodation_units_manual_chunks'
];

console.log('📊 ANÁLISIS DE COBERTURA DE SINCRONIZACIÓN\n');
console.log(`Total tablas en DB: ${ALL_TABLES_IN_DB.length}`);
console.log(`Tablas en script: ${TABLES_IN_SYNC_SCRIPT.length}`);

// Encontrar tablas faltantes
const missingTables = ALL_TABLES_IN_DB.filter(table => {
  const normalizedTable = table.replace('hotels.', 'hotels.');
  return !TABLES_IN_SYNC_SCRIPT.includes(table) &&
         !TABLES_IN_SYNC_SCRIPT.includes(normalizedTable);
});

console.log(`\n❌ TABLAS NO SINCRONIZADAS (${missingTables.length}):\n`);
missingTables.forEach(table => {
  console.log(`  - ${table}`);
});

console.log('\n⚠️  TABLAS CRÍTICAS QUE FALTAN:');
const criticalMissing = missingTables.filter(t =>
  t.includes('reservation') ||
  t.includes('calendar') ||
  t.includes('compliance') ||
  t.includes('tenant') ||
  t.includes('sire')
);

criticalMissing.forEach(table => {
  console.log(`  🔴 ${table}`);
});