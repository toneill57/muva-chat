#!/bin/bash

# Script para aplicar todas las migraciones de Super Admin
# Generado: 2025-11-28

# Don't exit on error - continue with other migrations
set +e

echo "🔧 Aplicando migraciones Super Admin a DB dev..."
echo ""

# Get project root
PROJECT_ROOT="/Users/oneill/Sites/apps/muva-chat"
cd "$PROJECT_ROOT"

# Load environment
set -a
source .env.local
set +a

# Track successes and failures
SUCCESS_COUNT=0
SKIP_COUNT=0
FAIL_COUNT=0

# Function to apply migration
apply_migration() {
  local NAME=$1
  local FILE=$2

  echo "$NAME..."
  pnpm dlx tsx "$PROJECT_ROOT/scripts/database/execute-ddl-via-api.ts" "$FILE" 2>&1 | tee /tmp/migration-output.txt

  if grep -q "DDL executed successfully" /tmp/migration-output.txt; then
    echo "✅ Success"
    ((SUCCESS_COUNT++))
  elif grep -q "already exists" /tmp/migration-output.txt; then
    echo "⏭️  Already applied (skipping)"
    ((SKIP_COUNT++))
  else
    echo "❌ Failed"
    ((FAIL_COUNT++))
  fi
  echo ""
}

# Apply migrations in correct order
echo "1/7 Aplicando super_chat_rpc..."
apply_migration "super_chat_rpc" "$PROJECT_ROOT/migrations/20251126000000_super_chat_rpc.sql"

echo "2/7 Aplicando super_admin_setup..."
apply_migration "super_admin_setup" "$PROJECT_ROOT/migrations/20251126151112_super_admin_setup.sql"

echo "3/7 Aplicando create_sire_submissions..."
apply_migration "create_sire_submissions" "$PROJECT_ROOT/migrations/20251126180000_create_sire_submissions.sql"

echo "4/7 Aplicando super_admin_audit_log..."
apply_migration "super_admin_audit_log" "$PROJECT_ROOT/migrations/20251127000000_super_admin_audit_log.sql"

echo "5/7 Aplicando fix_audit_log_target_id..."
apply_migration "fix_audit_log_target_id" "$PROJECT_ROOT/migrations/20251127000001_fix_audit_log_target_id.sql"

echo "6/7 Aplicando add_conversation_types..."
apply_migration "add_conversation_types" "$PROJECT_ROOT/migrations/20251127000002_add_conversation_types.sql"

echo "7/7 Aplicando ai_usage_tracking..."
apply_migration "ai_usage_tracking" "$PROJECT_ROOT/migrations/20251127010000_ai_usage_tracking.sql"

echo ""
echo "================================"
echo "Resumen de migraciones:"
echo "  ✅ Exitosas: $SUCCESS_COUNT"
echo "  ⏭️  Ya aplicadas: $SKIP_COUNT"
echo "  ❌ Fallidas: $FAIL_COUNT"
echo "================================"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
  echo "⚠️  Algunas migraciones fallaron. Revisa los errores arriba."
  exit 1
else
  echo "✅ Proceso completado!"
  echo ""
  echo "Prueba: http://localhost:3000/super-admin/compliance"
  exit 0
fi
