#!/bin/bash

# Apply Data Migrations to Branch via Supabase CLI
# Branch: migration-test-fresh (ztfslsrkemlfqjpzksir)

echo "🚀 Applying data migrations to branch..."

# Get branch connection string
echo ""
echo "📋 Step 1: Get branch database password from dashboard"
echo "   Go to: https://supabase.com/dashboard/project/ztfslsrkemlfqjpzksir/settings/database"
echo "   Copy the 'Database password'"
echo ""
read -p "Enter database password: " DB_PASSWORD

# Connection string
DB_URL="postgresql://postgres:${DB_PASSWORD}@db.ztfslsrkemlfqjpzksir.supabase.co:5432/postgres"

echo ""
echo "📄 Applying migrations..."

# File 10: Foundation data
echo "  [1/4] 10-data-foundation.sql..."
psql "$DB_URL" -f migrations/backup-2025-10-31/10-data-foundation.sql
if [ $? -eq 0 ]; then
  echo "  ✅ Success"
else
  echo "  ❌ Failed"
  exit 1
fi

# File 11: Catalog data
echo "  [2/4] 11-data-catalog.sql..."
psql "$DB_URL" -f migrations/backup-2025-10-31/11-data-catalog.sql
if [ $? -eq 0 ]; then
  echo "  ✅ Success"
else
  echo "  ❌ Failed"
  exit 1
fi

# File 12: Operations data
echo "  [3/4] 12-data-operations.sql..."
psql "$DB_URL" -f migrations/backup-2025-10-31/12-data-operations.sql
if [ $? -eq 0 ]; then
  echo "  ✅ Success"
else
  echo "  ❌ Failed"
  exit 1
fi

# File 13: Reservations data (CRITICAL - corrected version)
echo "  [4/4] 13-data-reservations.sql (CRITICAL)..."
psql "$DB_URL" -f migrations/backup-2025-10-31/13-data-reservations.sql
if [ $? -eq 0 ]; then
  echo "  ✅ Success"
else
  echo "  ❌ Failed"
  exit 1
fi

echo ""
echo "✅ All migrations applied successfully!"
echo ""
echo "🔍 Now validating FK integrity..."

# Validate FK integrity
psql "$DB_URL" -c "SELECT COUNT(*) as orphaned_count FROM reservation_accommodations ra LEFT JOIN accommodation_units au ON ra.accommodation_unit_id = au.id WHERE au.id IS NULL;"

echo ""
echo "📊 Row counts:"
psql "$DB_URL" -c "SELECT tablename, n_live_tup as rows FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY tablename;"

echo ""
echo "✅ DONE! Tell Claude to generate final validation report."
