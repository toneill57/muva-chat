#!/bin/bash
# Validate Migration Files on Fresh PostgreSQL
# Uses Docker to spin up fresh database and test all migrations

set -e

echo "=========================================="
echo "Migration Validation (Docker PostgreSQL)"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "ERROR: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Cleanup any existing test container
echo "Cleaning up any existing test container..."
docker stop migration-test 2>/dev/null || true
docker rm migration-test 2>/dev/null || true

echo "Starting fresh PostgreSQL 15 with pgvector..."
docker run -d \
  --name migration-test \
  -e POSTGRES_PASSWORD=testpass \
  -p 5433:5432 \
  ankane/pgvector:latest

echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Test connection
until PGPASSWORD=testpass psql -h localhost -p 5433 -U postgres -c '\q' 2>/dev/null; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "PostgreSQL is ready!"
echo ""

echo "=========================================="
echo "Applying Migrations"
echo "=========================================="

# Apply migrations in order
for file in migrations/backup-2025-10-31/*.sql; do
  filename=$(basename "$file")
  echo "Applying: $filename"
  
  if PGPASSWORD=testpass psql -h localhost -p 5433 -U postgres -d postgres -f "$file" 2>&1 | grep -i "error"; then
    echo "ERROR: Migration $filename failed"
    docker stop migration-test
    docker rm migration-test
    exit 1
  fi
done

echo ""
echo "=========================================="
echo "FK Integrity Validation"
echo "=========================================="

# Run FK integrity checks
PGPASSWORD=testpass psql -h localhost -p 5433 -U postgres -d postgres << 'SQL'
-- FK Check 1: reservation_accommodations
SELECT 
  'reservation_accommodations -> accommodation_units' as check_name,
  COUNT(*) as orphaned_count
FROM reservation_accommodations ra
LEFT JOIN accommodation_units au ON ra.accommodation_unit_id = au.id
WHERE au.id IS NULL;

-- FK Check 2: guest_reservations
SELECT 
  'guest_reservations -> accommodation_units' as check_name,
  COUNT(*) as orphaned_count
FROM guest_reservations gr
LEFT JOIN accommodation_units au ON gr.accommodation_unit_id = au.id
WHERE au.id IS NULL;
SQL

echo ""
echo "=========================================="
echo "Row Count Validation"
echo "=========================================="

PGPASSWORD=testpass psql -h localhost -p 5433 -U postgres -d postgres << 'SQL'
SELECT 
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'accommodation_units',
    'prospective_sessions',
    'guest_reservations',
    'reservation_accommodations',
    'chat_messages',
    'chat_conversations'
  )
ORDER BY tablename;
SQL

echo ""
echo "=========================================="
echo "Cleanup"
echo "=========================================="

docker stop migration-test
docker rm migration-test

echo ""
echo "Validation complete!"
echo ""
echo "Expected Results:"
echo "  - orphaned_count: 0 for both FK checks"
echo "  - accommodation_units: ~50 rows"
echo "  - guest_reservations: ~104 rows"
echo "  - reservation_accommodations: ~93 rows"
