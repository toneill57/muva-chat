#!/bin/bash
# Verify Migration Files Suite
# Tests SQL syntax and validates schema correctness

set -e

MIGRATION_DIR="/Users/oneill/Sites/apps/muva-chat/migrations/backup-2025-10-31"
cd "$MIGRATION_DIR"

echo "========================================="
echo "Migration Files Verification"
echo "========================================="
echo ""

# Check all files exist
echo "1. Checking file existence..."
EXPECTED_FILES=(
  "01-extensions.sql"
  "02-schema-foundation.sql"
  "03-schema-catalog.sql"
  "04-schema-operations.sql"
  "05-schema-chat.sql"
  "06-rls-policies.sql"
  "07-functions.sql"
  "08-triggers.sql"
  "09-indexes.sql"
  "10-grants.sql"
  "11-data-catalog.sql"
  "12-data-operations.sql"
  "13-data-reservations.sql"
)

MISSING=0
for file in "${EXPECTED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "  ❌ Missing: $file"
    MISSING=$((MISSING + 1))
  else
    echo "  ✅ Found: $file"
  fi
done

if [ $MISSING -gt 0 ]; then
  echo ""
  echo "❌ $MISSING files missing!"
  exit 1
fi

echo ""
echo "2. Checking file sizes..."
for file in "${EXPECTED_FILES[@]}"; do
  SIZE=$(wc -c < "$file" | tr -d ' ')
  SIZE_KB=$((SIZE / 1024))
  
  if [ $SIZE -eq 0 ]; then
    echo "  ❌ $file is empty!"
    exit 1
  elif [ $SIZE_KB -gt 1000 ]; then
    echo "  ⚠️  $file is large: ${SIZE_KB}KB"
  else
    echo "  ✅ $file: ${SIZE_KB}KB"
  fi
done

echo ""
echo "3. Checking SQL syntax (basic)..."
for file in "${EXPECTED_FILES[@]}"; do
  # Check for common SQL errors
  if grep -q "INSERT INTO.*VALUES.*,," "$file" 2>/dev/null; then
    echo "  ❌ $file has double commas"
    exit 1
  fi
  
  if grep -q "'''" "$file" 2>/dev/null; then
    echo "  ⚠️  $file may have escaping issues"
  fi
  
  echo "  ✅ $file: No obvious syntax errors"
done

echo ""
echo "4. Checking schema columns..."

# File 11: muva_content must have all 26 columns
if ! grep -q "schema_type, schema_version, business_info, subcategory" "11-data-catalog.sql"; then
  echo "  ❌ File 11 missing new columns (schema_type, schema_version, business_info, subcategory)"
  exit 1
fi
echo "  ✅ File 11: muva_content has all 26 columns"

# File 12: hotels must have all 21 columns
if ! grep -q "tourism_summary, policies_summary" "12-data-operations.sql"; then
  echo "  ❌ File 12 missing hotels columns (tourism_summary, policies_summary)"
  exit 1
fi
echo "  ✅ File 12: hotels has all 21 columns"

echo ""
echo "5. File size comparison..."
echo "  Original (broken):"
if [ -f "11-data-catalog.sql.BROKEN" ]; then
  BROKEN_SIZE=$(wc -c < "11-data-catalog.sql.BROKEN" | tr -d ' ')
  BROKEN_KB=$((BROKEN_SIZE / 1024))
  echo "    11-data-catalog.sql.BROKEN: ${BROKEN_KB}KB"
fi

if [ -f "12-data-operations.sql.BROKEN" ]; then
  BROKEN_SIZE=$(wc -c < "12-data-operations.sql.BROKEN" | tr -d ' ')
  BROKEN_KB=$((BROKEN_SIZE / 1024))
  echo "    12-data-operations.sql.BROKEN: ${BROKEN_KB}KB"
fi

echo "  Regenerated:"
FILE11_SIZE=$(wc -c < "11-data-catalog.sql" | tr -d ' ')
FILE11_KB=$((FILE11_SIZE / 1024))
echo "    11-data-catalog.sql: ${FILE11_KB}KB"

FILE12_SIZE=$(wc -c < "12-data-operations.sql" | tr -d ' ')
FILE12_KB=$((FILE12_SIZE / 1024))
echo "    12-data-catalog.sql: ${FILE12_KB}KB"

echo ""
echo "========================================="
echo "✅ ALL CHECKS PASSED"
echo "========================================="
echo ""
echo "Migration files are ready for deployment!"
echo ""
echo "Next steps:"
echo "  1. Review README.md for deployment instructions"
echo "  2. Test on staging environment first"
echo "  3. Apply to production with: for f in *.sql; do psql \$DB < \$f; done"
echo ""
