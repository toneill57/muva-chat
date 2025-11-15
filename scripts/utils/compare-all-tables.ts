#!/usr/bin/env tsx
/**
 * COMPARACIÓN COMPLETA: Dev vs Staging
 * Genera reporte de las 50 tablas
 */

const ALL_TABLES = [
  'tenant_registry', 'sire_countries', 'sire_cities', 'sire_document_types',
  'sire_content', 'sire_export_logs', 'policies', 'hotels', 'staff_users',
  'integration_configs', 'tenant_compliance_credentials', 'tenant_knowledge_embeddings',
  'tenant_muva_content', 'accommodation_units', 'accommodation_units_manual',
  'accommodation_units_public', 'accommodation_units_manual_chunks',
  'ics_feed_configurations', 'property_relationships', 'chat_conversations',
  'guest_conversations', 'guest_reservations', 'prospective_sessions',
  'staff_conversations', 'chat_messages', 'staff_messages', 'conversation_memory',
  'conversation_attachments', 'reservation_accommodations', 'calendar_events',
  'calendar_event_conflicts', 'calendar_sync_logs', 'airbnb_motopress_comparison',
  'airbnb_mphb_imported_reservations', 'hotel_operations', 'compliance_submissions',
  'sync_history', 'job_logs', 'user_tenant_permissions', 'muva_content',
  'code_embeddings'
];

console.log('📊 COMPARACIÓN COMPLETA DE TABLAS\n');
console.log('Generando queries...\n');

// Generar query para dev
const devQueries = ALL_TABLES.map(t => `SELECT '${t}' as tabla, COUNT(*) as count FROM ${t}`);
console.log('Query para DEV:');
console.log(devQueries.join('\nUNION ALL\n'));

console.log('\n---\n');

// Generar query para staging
const stagingQueries = ALL_TABLES.map(t => `SELECT '${t}' as tabla, COUNT(*) as count FROM ${t}`);
console.log('Query para STAGING:');
console.log(stagingQueries.join('\nUNION ALL\n'));
