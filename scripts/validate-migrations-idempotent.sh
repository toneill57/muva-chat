#!/bin/bash
# ================================================
# VALIDACIÓN DE MIGRACIONES IDEMPOTENTES
# ================================================
# Valida que TODAS las migraciones sean idempotentes antes de deployment
# Ejecutado automáticamente en GitHub Actions antes de aplicar a TST/PRD

set -e

MIGRATIONS_DIR="migrations"
ERRORS=0

echo "================================================"
echo "🔍 Validando migraciones idempotentes"
echo "================================================"

# Patrones NO PERMITIDOS (indicadores de NO idempotencia)
declare -a BAD_PATTERNS=(
  "CREATE POLICY \".*\" ON .* FOR .* USING"
  "CREATE POLICY '.*' ON .* FOR .* USING"
)

# Patrones REQUERIDOS para políticas (idempotencia)
GOOD_PATTERN="DROP POLICY IF EXISTS"

echo ""
echo "📂 Buscando migraciones con políticas..."

# Buscar archivos que crean políticas
FILES_WITH_POLICIES=$(grep -l "CREATE POLICY" "$MIGRATIONS_DIR"/*.sql 2>/dev/null || true)

if [ -z "$FILES_WITH_POLICIES" ]; then
  echo "✅ No se encontraron archivos con CREATE POLICY"
  exit 0
fi

echo "📋 Archivos con CREATE POLICY encontrados:"
echo "$FILES_WITH_POLICIES" | while read -r file; do
  echo "   - $file"
done

echo ""
echo "🔍 Validando CREATE POLICY con DROP POLICY IF EXISTS..."

# Validar cada archivo
for file in $FILES_WITH_POLICIES; do
  POLICY_COUNT=$(grep -c "CREATE POLICY" "$file" || true)
  DROP_COUNT=$(grep -c "DROP POLICY IF EXISTS" "$file" || true)

  echo ""
  echo "📄 $file"
  echo "   CREATE POLICY: $POLICY_COUNT"
  echo "   DROP POLICY IF EXISTS: $DROP_COUNT"

  if [ "$POLICY_COUNT" -ne "$DROP_COUNT" ]; then
    echo "   ❌ ERROR: Número de CREATE POLICY ($POLICY_COUNT) no coincide con DROP POLICY IF EXISTS ($DROP_COUNT)"
    echo "   ⚠️  Esta migración NO es idempotente y fallará en re-ejecución"
    ERRORS=$((ERRORS + 1))
  else
    echo "   ✅ OK: Migración idempotente"
  fi
done

echo ""
echo "🔍 Validando CREATE VIEW con DROP VIEW IF EXISTS..."

# Buscar archivos que crean vistas
FILES_WITH_VIEWS=$(grep -l "CREATE.*VIEW" "$MIGRATIONS_DIR"/*.sql 2>/dev/null || true)

if [ -n "$FILES_WITH_VIEWS" ]; then
  echo "📋 Archivos con CREATE VIEW encontrados:"
  echo "$FILES_WITH_VIEWS" | while read -r file; do
    echo "   - $file"
  done

  for file in $FILES_WITH_VIEWS; do
    # Detectar CREATE OR REPLACE VIEW (puede causar errores de rename)
    REPLACE_VIEW_COUNT=$(grep -c "CREATE OR REPLACE VIEW" "$file" || true)
    if [ "$REPLACE_VIEW_COUNT" -gt 0 ]; then
      echo ""
      echo "📄 $file"
      echo "   ⚠️  WARNING: Usa CREATE OR REPLACE VIEW ($REPLACE_VIEW_COUNT veces)"
      echo "   ⚠️  Esto puede fallar si cambia nombres de columnas en PRD"
      echo "   💡 RECOMENDACIÓN: Usar DROP VIEW IF EXISTS + CREATE VIEW"
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "✅ No se encontraron archivos con CREATE VIEW"
fi

echo ""
echo "================================================"

if [ $ERRORS -eq 0 ]; then
  echo "✅ TODAS las migraciones son idempotentes"
  echo "================================================"
  exit 0
else
  echo "❌ Se encontraron $ERRORS problema(s) de idempotencia"
  echo "================================================"
  echo ""
  echo "SOLUCIONES:"
  echo "1. Para CREATE POLICY:"
  echo "   DROP POLICY IF EXISTS \"nombre\" ON tabla;"
  echo ""
  echo "2. Para CREATE VIEW (si cambia columnas):"
  echo "   DROP VIEW IF EXISTS nombre CASCADE;"
  echo "   CREATE VIEW nombre AS ..."
  echo ""
  exit 1
fi
