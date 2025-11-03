#!/bin/bash
set -e

echo "🚀 COPYING PRODUCTION DATA TO STAGING"
echo "======================================"

# Production (source)
PROD_HOST="ooaumjzaztmutltifhoq.supabase.co"
PROD_USER="postgres.ooaumjzaztmutltifhoq"
PROD_PASS="6vZs6Z3yZIJJF+CQhP74mAklZWPzJNPbAZ24UG4AuJmkVvCg70CPO1c4c+vWkd5+FiNDDVuaFv3K8c/MYrPV6w=="

# Staging (target)
STAGING_HOST="gkqfbrhtlipcvpqyyqmx.supabase.co"
STAGING_USER="postgres.gkqfbrhtlipcvpqyyqmx"
STAGING_PASS="mlmYAxOrTbRYLRr358MPbzXviXXG/OsydPCqS+ProQukQlj8bYx+Kaer/Ckvy54qHRVtwDsAWaveqQqXAoKV6A=="

DUMP_FILE="/tmp/prod-data-$(date +%Y%m%d-%H%M%S).sql"

echo "📥 Step 1: Dumping production data..."
PGPASSWORD="$PROD_PASS" pg_dump \
  -h "$PROD_HOST" \
  -U "$PROD_USER" \
  -d postgres \
  --data-only \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  -f "$DUMP_FILE"

if [ ! -f "$DUMP_FILE" ]; then
  echo "❌ Dump failed - file not created"
  exit 1
fi

echo "✅ Dump created: $DUMP_FILE ($(wc -l < "$DUMP_FILE") lines)"

echo "📤 Step 2: Restoring to staging..."
PGPASSWORD="$STAGING_PASS" psql \
  -h "$STAGING_HOST" \
  -U "$STAGING_USER" \
  -d postgres \
  -f "$DUMP_FILE" \
  --set ON_ERROR_STOP=on

echo "✅ Data restored successfully!"
echo "🧹 Cleaning up dump file..."
rm "$DUMP_FILE"

echo ""
echo "=========================================="
echo "✅ MIGRATION COMPLETE"
echo "=========================================="
