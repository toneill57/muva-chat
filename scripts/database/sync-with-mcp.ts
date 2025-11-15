#!/usr/bin/env tsx
/**
 * SYNC DIRECTO CON MCP TOOLS
 * Sin complicaciones - solo copiar datos faltantes
 */

const STAGING_PROJECT = 'rvjmwwvkhglcuqwcznph';
const DEV_PROJECT = 'ooaumjzaztmutltifhoq';

// Tablas que necesitan datos (ordenadas por dependencias)
const TABLES_TO_SYNC = [
  { table: 'prospective_sessions', expected: 412 },
  { table: 'chat_messages', expected: 349 },
  { table: 'guest_conversations', expected: 114 },
  { table: 'reservation_accommodations', expected: 93 },
  { table: 'sync_history', expected: 85 },
  { table: 'staff_messages', expected: 60 },
  { table: 'staff_conversations', expected: 45 },
  { table: 'job_logs', expected: 39 },
  { table: 'hotel_operations', expected: 10 },
  { table: 'conversation_memory', expected: 10 },
  { table: 'user_tenant_permissions', expected: 1 },
];

console.log('🚀 INICIANDO SYNC DE TABLAS FALTANTES\n');
console.log(`Total de registros a sincronizar: 1,218`);
console.log('=' .repeat(50));

// Este script debe ejecutarse con las herramientas MCP desde Claude
console.log('\n📋 INSTRUCCIONES PARA EJECUTAR:\n');
console.log('Para cada tabla listada arriba, ejecutar:');
console.log('1. Limpiar en staging: DELETE FROM [tabla]');
console.log('2. Copiar de dev: SELECT * FROM [tabla] en dev');
console.log('3. Insertar en staging: INSERT INTO [tabla] los datos');
console.log('\nUsando mcp__supabase__execute_sql para cada operación.');

console.log('\n🎯 TABLAS A SINCRONIZAR:');
TABLES_TO_SYNC.forEach(t => {
  console.log(`- ${t.table}: ${t.expected} registros esperados`);
});

console.log('\n✅ Script de referencia creado.');
console.log('Ahora ejecutaré las operaciones con MCP tools...');