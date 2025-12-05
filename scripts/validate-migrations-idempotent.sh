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
echo "🔍 Validando que tengan DROP POLICY IF EXISTS..."

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
echo "================================================"

if [ $ERRORS -eq 0 ]; then
  echo "✅ TODAS las migraciones son idempotentes"
  echo "================================================"
  exit 0
else
  echo "❌ Se encontraron $ERRORS migración(es) NO idempotente(s)"
  echo "================================================"
  echo ""
  echo "SOLUCIÓN:"
  echo "Para cada CREATE POLICY, agrega antes:"
  echo "DROP POLICY IF EXISTS \"nombre_de_la_policy\" ON tabla;"
  echo ""
  exit 1
fi
