#!/bin/bash
set -e

# Load environment
set -a
source .env.local
set +a

PROD_URL="postgresql://postgres.ooaumjzaztmutltifhoq:${SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
STAGING_URL="postgresql://postgres.qlvkgniqcoisbnwwjfte:${SUPABASE_STAGING_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

echo "🚀 Copying hotels schema tables via pg_dump"

# Dump hotels schema data only (no schema DDL, data only)
echo "📦 Dumping hotels.accommodation_units..."
pg_dump "$PROD_URL" \
  --data-only \
  --table=hotels.accommodation_units \
  --no-owner \
  --no-privileges \
  > /tmp/hotels_accommodation_units.sql

echo "📥 Restoring to staging..."
psql "$STAGING_URL" < /tmp/hotels_accommodation_units.sql

echo "✅ Done! Verifying count..."
psql "$STAGING_URL" -c "SELECT COUNT(*) FROM hotels.accommodation_units;"

rm /tmp/hotels_accommodation_units.sql
