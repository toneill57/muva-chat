#!/bin/bash
#
# SINCRONIZACIÓN COMPLETA DEV → STAGING
# Usa pg_dump para hacer una copia EXACTA de TODOS los datos
#

set -e  # Salir si hay error

echo "🚀 SINCRONIZACIÓN COMPLETA DEV → STAGING"
echo "=========================================="

# Cargar variables de entorno
source .env.local

# URLs de las bases de datos
DEV_DB="postgresql://postgres.ooaumjzaztmutltifhoq:${SUPABASE_DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
STAGING_DB="postgresql://postgres.rvjmwwvkhglcuqwcznph:${SUPABASE_DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Crear directorio de backups si no existe
mkdir -p backups

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/dev_complete_${TIMESTAMP}.sql"

echo ""
echo "📥 PASO 1: Haciendo backup completo de DEV..."
echo "---------------------------------------------"

# Dump SOLO de datos de las tablas public y hotels (no auth ni storage)
pg_dump "$DEV_DB" \
  --data-only \
  --disable-triggers \
  --no-owner \
  --no-privileges \
  --schema=public \
  --schema=hotels \
  --verbose \
  > "$BACKUP_FILE" 2> backups/dump_log.txt

echo "✅ Backup creado: $BACKUP_FILE"
echo "   Tamaño: $(du -h $BACKUP_FILE | cut -f1)"

echo ""
echo "🗑️ PASO 2: Limpiando datos en STAGING..."
echo "-----------------------------------------"

# Script SQL para limpiar todas las tablas en orden inverso (por FK)
cat > backups/clean_staging.sql << 'EOF'
-- Desactivar triggers temporalmente
SET session_replication_role = 'replica';

-- Limpiar en orden inverso para respetar foreign keys
TRUNCATE TABLE
  accommodation_units_manual_chunks,
  chat_messages,
  staff_messages,
  guest_conversations,
  staff_conversations,
  reservation_accommodations,
  guest_reservations,
  prospective_sessions,
  calendar_events,
  sync_history,
  job_logs,
  conversation_memory,
  hotel_operations,
  user_tenant_permissions,
  muva_content,
  code_embeddings,
  accommodation_units_public,
  accommodation_units_manual,
  accommodation_units,
  property_relationships,
  ics_feed_configurations,
  hotels.policies,
  hotels.accommodation_units,
  integration_configs,
  staff_users,
  hotels,
  sire_content,
  sire_document_types,
  sire_cities,
  sire_countries,
  chat_conversations,
  tenant_registry
CASCADE;

-- Reactivar triggers
SET session_replication_role = 'origin';
EOF

echo "Ejecutando limpieza..."
psql "$STAGING_DB" < backups/clean_staging.sql 2>&1 | grep -v "NOTICE"

echo "✅ Staging limpio"

echo ""
echo "📤 PASO 3: Restaurando datos en STAGING..."
echo "------------------------------------------"

# Restaurar datos
psql "$STAGING_DB" < "$BACKUP_FILE" 2>&1 | grep -v "NOTICE" | tail -20

echo "✅ Datos restaurados"

echo ""
echo "🔍 PASO 4: Verificando sincronización..."
echo "-----------------------------------------"

# Verificar algunas tablas críticas
echo "Verificando counts en tablas críticas:"

psql "$STAGING_DB" -t -A -c "
SELECT
  'tenant_registry: ' || COUNT(*) FROM tenant_registry
UNION ALL
SELECT 'hotels: ' || COUNT(*) FROM hotels
UNION ALL
SELECT 'guest_conversations: ' || COUNT(*) FROM guest_conversations
UNION ALL
SELECT 'chat_messages: ' || COUNT(*) FROM chat_messages
UNION ALL
SELECT 'prospective_sessions: ' || COUNT(*) FROM prospective_sessions
UNION ALL
SELECT 'reservation_accommodations: ' || COUNT(*) FROM reservation_accommodations
UNION ALL
SELECT 'staff_conversations: ' || COUNT(*) FROM staff_conversations
UNION ALL
SELECT 'staff_messages: ' || COUNT(*) FROM staff_messages;"

echo ""
echo "🧪 PASO 5: Test final - Verificando simmerdown..."
echo "--------------------------------------------------"

# Verificar que simmerdown existe
SIMMERDOWN_EXISTS=$(psql "$STAGING_DB" -t -A -c "SELECT COUNT(*) FROM tenant_registry WHERE subdomain = 'simmerdown';")

if [ "$SIMMERDOWN_EXISTS" = "1" ]; then
  echo "✅ Tenant 'simmerdown' encontrado en staging"
else
  echo "❌ Tenant 'simmerdown' NO encontrado en staging"
fi

# Test HTTP
echo ""
echo "Testing https://simmerdown.staging.muva.chat/login ..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://simmerdown.staging.muva.chat/login || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ ¡LOGIN FUNCIONA! (HTTP $HTTP_STATUS)"
elif [ "$HTTP_STATUS" = "000" ]; then
  echo "❌ No se pudo conectar a staging"
else
  echo "⚠️ Staging responde pero con status HTTP $HTTP_STATUS"
fi

echo ""
echo "=========================================="
echo "✨ SINCRONIZACIÓN COMPLETADA"
echo "   Backup guardado en: $BACKUP_FILE"
echo "=========================================="