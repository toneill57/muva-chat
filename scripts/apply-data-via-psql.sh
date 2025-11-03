#!/bin/bash
set -e

# Staging branch connection details
PROJECT_ID="gkqfbrhtlipcvpqyyqmx"
PGHOST="${PROJECT_ID}.supabase.co"
PGDATABASE="postgres"
PGUSER="postgres.${PROJECT_ID}"
PGPASSWORD="mlmYAxOrTbRYLRr358MPbzXviXXG/OsydPCqS+ProQukQlj8bYx+Kaer/Ckvy54qHRVtwDsAWaveqQqXAoKV6A=="

export PGHOST PGDATABASE PGUSER PGPASSWORD

echo "🚀 Applying data files to staging branch"
echo "📍 Target: $PGHOST"
echo ""

FILES=(
  "11-data-catalog.sql"
  "12-data-operations.sql"
  "13-data-reservations.sql"
  "14c-data-embeddings-part3.sql"
  "14a-data-embeddings-part1.sql"
  "14b-data-embeddings-part2.sql"
)

SUCCESS=0
FAILED=0

for file in "${FILES[@]}"; do
  filepath="migrations/fresh-2025-11-01/$file"

  if [ ! -f "$filepath" ]; then
    echo "❌ File not found: $filepath"
    ((FAILED++))
    continue
  fi

  echo "📄 Applying $file..."
  start_time=$(date +%s)

  if psql -f "$filepath" 2>&1 | tee /tmp/psql-output.log; then
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    echo "✅ $file applied successfully (${duration}s)"
    ((SUCCESS++))
  else
    echo "❌ Error applying $file"
    echo "Last 20 lines of output:"
    tail -20 /tmp/psql-output.log
    ((FAILED++))
  fi

  echo ""
done

echo "============================================================"
echo "✅ Success: $SUCCESS/${#FILES[@]}"
echo "❌ Failed: $FAILED/${#FILES[@]}"
echo "============================================================"

exit $FAILED
